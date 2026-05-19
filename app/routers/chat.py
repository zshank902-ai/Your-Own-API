import json
import time
import uuid
import httpx
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import APIKey, UsageLog, ChatSession, ChatMessageHistory
from app.schemas import ChatRequest, ChatResponse, ChatResponseChoice, ChatMessage, ChatResponseUsage, CompleteRequest
from app.middleware import verify_api_key
from app.config import settings

router = APIRouter(prefix="/v1", tags=["AI Generation"])

def save_conversation_memory(db: Session, request: ChatRequest, api_key_id: int, user_message: str, assistant_message: str):
    if not request.session_id:
        return
    
    # Check if session exists
    session = db.query(ChatSession).filter(ChatSession.id == request.session_id).first()
    if not session:
        session = ChatSession(id=request.session_id, api_key_id=api_key_id)
        db.add(session)
        db.commit()
        db.refresh(session)
    
    # Add user message
    user_msg_record = ChatMessageHistory(session_id=session.id, role="user", content=user_message)
    # Add assistant message
    asst_msg_record = ChatMessageHistory(session_id=session.id, role="assistant", content=assistant_message)
    
    db.add(user_msg_record)
    db.add(asst_msg_record)
    db.commit()

def load_conversation_memory(db: Session, session_id: str) -> list[ChatMessage]:
    if not session_id:
        return []
    history = db.query(ChatMessageHistory).filter(ChatMessageHistory.session_id == session_id).order_by(ChatMessageHistory.created_at).all()
    return [ChatMessage(role=msg.role, content=msg.content) for msg in history]


def determine_provider(model: str) -> str:
    model = model.lower()
    if model.startswith("claude"):
        return "claude"
    elif model.startswith("gemini"):
        return "gemini"
    elif model.startswith("llama") or model.startswith("mistral"):
        return "ollama"
    else:
        return "mock" # Fallback


async def query_ollama(request: ChatRequest, merged_messages: list[ChatMessage]) -> tuple[str, int, int]:
    """Calls a local Ollama instance's chat endpoint."""
    url = f"{settings.OLLAMA_BASE_URL}/api/chat"
    ollama_messages = [{"role": m.role, "content": m.content} for m in merged_messages]
    
    payload = {
        "model": request.model or settings.OLLAMA_MODEL,
        "messages": ollama_messages,
        "stream": False,
        "options": {"temperature": request.temperature}
    }
    
    async with httpx.AsyncClient() as client:
        try:
            response = await client.post(url, json=payload, timeout=60.0)
            if response.status_code != 200:
                raise HTTPException(status_code=502, detail=f"Ollama error: {response.text}")
            
            data = response.json()
            content = data["message"]["content"]
            
            prompt_tokens = data.get("prompt_eval_count", sum(len(m.content) for m in merged_messages) // 4)
            completion_tokens = data.get("eval_count", len(content) // 4)
            return content, max(1, prompt_tokens), max(1, completion_tokens)
        except httpx.RequestError as e:
            raise HTTPException(status_code=503, detail=f"Failed to connect to Ollama: {str(e)}")

async def stream_ollama(request: ChatRequest, merged_messages: list[ChatMessage]):
    url = f"{settings.OLLAMA_BASE_URL}/api/chat"
    ollama_messages = [{"role": m.role, "content": m.content} for m in merged_messages]
    
    payload = {
        "model": request.model or settings.OLLAMA_MODEL,
        "messages": ollama_messages,
        "stream": True,
        "options": {"temperature": request.temperature}
    }
    
    async with httpx.AsyncClient() as client:
        async with client.stream("POST", url, json=payload, timeout=60.0) as response:
            if response.status_code != 200:
                yield f"data: {json.dumps({'error': 'Ollama streaming failed'})}\n\n"
                return
            
            async for chunk in response.aiter_lines():
                if not chunk: continue
                try:
                    data = json.loads(chunk)
                    content = data.get("message", {}).get("content", "")
                    if content:
                        yield f"data: {json.dumps({'choices': [{'delta': {'content': content}}]})}\n\n"
                except json.JSONDecodeError:
                    pass
            yield "data: [DONE]\n\n"


async def query_gemini(request: ChatRequest, merged_messages: list[ChatMessage]) -> tuple[str, int, int]:
    if not settings.GEMINI_API_KEY:
        raise HTTPException(status_code=500, detail="Gemini API Key missing.")
        
    contents = []
    for msg in merged_messages:
        role = "user" if msg.role in ["user", "system"] else "model"
        contents.append({"role": role, "parts": [{"text": msg.content}]})
        
    # Use the model requested, or fallback to flash
    model_id = request.model if request.model else "gemini-1.5-flash"
    url = f"https://generativelanguage.googleapis.com/v1beta/models/{model_id}:generateContent?key={settings.GEMINI_API_KEY}"
    
    payload = {
        "contents": contents,
        "generationConfig": {"temperature": request.temperature}
    }
    
    async with httpx.AsyncClient() as client:
        try:
            response = await client.post(url, json=payload, timeout=30.0)
            if response.status_code != 200:
                raise HTTPException(status_code=502, detail=f"Gemini API error: {response.text}")
            
            data = response.json()
            content = data["candidates"][0]["content"]["parts"][0]["text"]
            
            prompt_tokens = max(1, sum(len(m.content) for m in merged_messages) // 4)
            completion_tokens = max(1, len(content) // 4)
            return content, prompt_tokens, completion_tokens
        except Exception as e:
            raise HTTPException(status_code=502, detail=f"Gemini connection error: {str(e)}")

async def stream_gemini(request: ChatRequest, merged_messages: list[ChatMessage]):
    if not settings.GEMINI_API_KEY:
        yield f"data: {json.dumps({'error': 'Gemini API Key missing'})}\n\n"
        return

    contents = []
    for msg in merged_messages:
        role = "user" if msg.role in ["user", "system"] else "model"
        contents.append({"role": role, "parts": [{"text": msg.content}]})
        
    model_id = request.model if request.model else "gemini-1.5-flash"
    # Note: Stream endpoint is streamGenerateContent
    url = f"https://generativelanguage.googleapis.com/v1beta/models/{model_id}:streamGenerateContent?key={settings.GEMINI_API_KEY}"
    
    payload = {
        "contents": contents,
        "generationConfig": {"temperature": request.temperature}
    }
    
    async with httpx.AsyncClient() as client:
        async with client.stream("POST", url, json=payload, timeout=30.0) as response:
            if response.status_code != 200:
                error_text = await response.aread()
                yield f"data: {json.dumps({'error': f'Gemini streaming failed: {error_text.decode()}'})}\n\n"
                return
            
            # Gemini stream returns an array of chunks, we need to parse them carefully
            async for chunk in response.aiter_text():
                # Extremely naive parser for SSE-like streaming from Gemini JSON array
                if '"text":' in chunk:
                    try:
                        # Find the text snippet
                        parts = chunk.split('"text": "')
                        for p in parts[1:]:
                            text_content = p.split('"')[0]
                            # Unescape simple things
                            text_content = text_content.replace('\\n', '\n').replace('\\"', '"')
                            yield f"data: {json.dumps({'choices': [{'delta': {'content': text_content}}]})}\n\n"
                    except:
                        pass
            yield "data: [DONE]\n\n"


async def query_claude(request: ChatRequest, merged_messages: list[ChatMessage]) -> tuple[str, int, int]:
    if not settings.CLAUDE_API_KEY:
        raise HTTPException(status_code=500, detail="Claude API Key missing.")
        
    url = "https://api.anthropic.com/v1/messages"
    system_prompt = next((m.content for m in merged_messages if m.role == "system"), None)
    claude_messages = [{"role": m.role, "content": m.content} for m in merged_messages if m.role in ["user", "assistant"]]
    
    headers = {
        "x-api-key": settings.CLAUDE_API_KEY,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json"
    }
    
    payload = {
        "model": request.model or "claude-3-haiku-20240307",
        "max_tokens": 1024,
        "messages": claude_messages,
        "temperature": request.temperature
    }
    if system_prompt:
        payload["system"] = system_prompt
        
    async with httpx.AsyncClient() as client:
        try:
            response = await client.post(url, json=payload, headers=headers, timeout=30.0)
            if response.status_code != 200:
                raise HTTPException(status_code=502, detail=f"Claude error: {response.text}")
            
            data = response.json()
            content = data["content"][0]["text"]
            
            usage = data.get("usage", {})
            prompt_tokens = usage.get("input_tokens", max(1, sum(len(m.content) for m in merged_messages) // 4))
            completion_tokens = usage.get("output_tokens", max(1, len(content) // 4))
            
            return content, prompt_tokens, completion_tokens
        except Exception as e:
            raise HTTPException(status_code=502, detail=f"Claude connection error: {str(e)}")

async def stream_claude(request: ChatRequest, merged_messages: list[ChatMessage]):
    if not settings.CLAUDE_API_KEY:
        yield f"data: {json.dumps({'error': 'Claude API Key missing'})}\n\n"
        return

    url = "https://api.anthropic.com/v1/messages"
    system_prompt = next((m.content for m in merged_messages if m.role == "system"), None)
    claude_messages = [{"role": m.role, "content": m.content} for m in merged_messages if m.role in ["user", "assistant"]]
    
    headers = {
        "x-api-key": settings.CLAUDE_API_KEY,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json"
    }
    
    payload = {
        "model": request.model or "claude-3-haiku-20240307",
        "max_tokens": 1024,
        "messages": claude_messages,
        "temperature": request.temperature,
        "stream": True
    }
    if system_prompt:
        payload["system"] = system_prompt

    async with httpx.AsyncClient() as client:
        async with client.stream("POST", url, json=payload, headers=headers, timeout=30.0) as response:
            if response.status_code != 200:
                error_text = await response.aread()
                yield f"data: {json.dumps({'error': f'Claude streaming failed: {error_text.decode()}'})}\n\n"
                return
            
            async for line in response.aiter_lines():
                if line.startswith("data: "):
                    data_str = line[6:]
                    if data_str == "[DONE]":
                        break
                    try:
                        data = json.loads(data_str)
                        if data.get("type") == "content_block_delta":
                            text = data["delta"]["text"]
                            yield f"data: {json.dumps({'choices': [{'delta': {'content': text}}]})}\n\n"
                    except:
                        pass
            yield "data: [DONE]\n\n"


def query_mock_llm(request: ChatRequest, merged_messages: list[ChatMessage]) -> tuple[str, int, int]:
    user_msgs = [m.content for m in merged_messages if m.role == "user"]
    system_msgs = [m.content for m in merged_messages if m.role == "system"]
    
    last_msg = user_msgs[-1] if user_msgs else "Hello"
    history_str = " | ".join(user_msgs)
    system_str = " | ".join(system_msgs) if system_msgs else "None"
    
    response_content = (f"[MOCK for {request.model}]\n"
                        f"System: {system_str}\n"
                        f"History context: {history_str}\n"
                        f"You sent: '{last_msg}'")
    
    prompt_tokens = max(1, sum(len(m.content) for m in merged_messages) // 4)
    completion_tokens = max(1, len(response_content) // 4)
    return response_content, prompt_tokens, completion_tokens

async def stream_mock_llm(request: ChatRequest, merged_messages: list[ChatMessage]):
    user_msgs = [m.content for m in merged_messages if m.role == "user"]
    last_msg = user_msgs[-1] if user_msgs else "Hello"
    
    response_content = f"[MOCK STREAM for {request.model}] You sent: '{last_msg}'"
    words = response_content.split()
    
    for word in words:
        yield f"data: {json.dumps({'choices': [{'delta': {'content': word + ' '}}]})}\n\n"
        import asyncio
        await asyncio.sleep(0.1)
    yield "data: [DONE]\n\n"


@router.post("/chat", response_model=ChatResponse)
async def generate_chat_completion(
    request: ChatRequest,
    current_key: APIKey = Depends(verify_api_key),
    db: Session = Depends(get_db)
):
    if request.stream:
        # If user specifies stream=True on the regular endpoint, fallback to the streaming endpoint logic
        # For simplicity, we can just throw an error telling them to use /v1/chat/stream or redirect logic.
        raise HTTPException(status_code=400, detail="For streaming, use POST /v1/chat/stream")

    # 1. Conversation Memory
    history = load_conversation_memory(db, request.session_id) if request.session_id else []
    merged_messages = history + request.messages
    
    # Extract just the latest user message to save later
    latest_user_msg = request.messages[-1].content if request.messages else ""

    # 2. Multi-Model Routing & Tier Check
    provider = determine_provider(request.model) if request.model else settings.AI_PROVIDER.lower()
    model_name = request.model or provider
    
    tier = current_key.owner.plan_tier.lower() if current_key.owner.plan_tier else "free"
    # Basic models allowed in Free tier
    basic_models = ["mock", "llama3", "gemini-1.5-flash"]
    is_premium = not any(model_name.startswith(b) for b in basic_models)
    
    if tier == "free" and is_premium:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN, 
            detail=f"The model '{model_name}' is a premium model. Please upgrade to Pro or Enterprise to use it."
        )

    # 3. Custom System Prompt Injection
    if current_key.system_prompt:
        has_system = any(m.role == "system" for m in merged_messages)
        if not has_system:
            merged_messages.insert(0, ChatMessage(role="system", content=current_key.system_prompt))

    if provider == "mock":
        content, prompt_tokens, completion_tokens = query_mock_llm(request, merged_messages)
    elif provider == "ollama":
        content, prompt_tokens, completion_tokens = await query_ollama(request, merged_messages)
    elif provider == "gemini":
        content, prompt_tokens, completion_tokens = await query_gemini(request, merged_messages)
    elif provider == "claude":
        content, prompt_tokens, completion_tokens = await query_claude(request, merged_messages)
    else:
        raise HTTPException(status_code=500, detail=f"Unknown AI provider: {provider}")
        
    # 4. Save memory
    if request.session_id:
        save_conversation_memory(db, request, current_key.id, latest_user_msg, content)

    # 5. Write usage log
    log = UsageLog(
        api_key_id=current_key.id,
        endpoint="/v1/chat",
        model_used=model_name,
        prompt_tokens=prompt_tokens,
        completion_tokens=completion_tokens,
        status_code=200
    )
    db.add(log)
    db.commit()
    
    res_id = f"chatcmpl-{uuid.uuid4().hex[:12]}"
    created_time = int(time.time())
    
    choice = ChatResponseChoice(
        index=0,
        message=ChatMessage(role="assistant", content=content),
        finish_reason="stop"
    )
    
    usage = ChatResponseUsage(
        prompt_tokens=prompt_tokens,
        completion_tokens=completion_tokens,
        total_tokens=prompt_tokens + completion_tokens
    )
    
    return ChatResponse(
        id=res_id,
        created=created_time,
        model=request.model or provider,
        choices=[choice],
        usage=usage
    )


@router.post("/chat/stream")
async def generate_chat_completion_stream(
    request: ChatRequest,
    current_key: APIKey = Depends(verify_api_key),
    db: Session = Depends(get_db)
):
    # Streaming does not currently calculate exact token usage dynamically,
    # as tokens stream directly to client. In a real app, you would sum tokens 
    # after the generator finishes, but for SSE we just log a dummy count or estimate.
    
    history = load_conversation_memory(db, request.session_id) if request.session_id else []
    merged_messages = history + request.messages
    
    provider = determine_provider(request.model) if request.model else settings.AI_PROVIDER.lower()
    model_name = request.model or provider
    
    tier = current_key.owner.plan_tier.lower() if current_key.owner.plan_tier else "free"
    basic_models = ["mock", "llama3", "gemini-1.5-flash"]
    is_premium = not any(model_name.startswith(b) for b in basic_models)
    
    if tier == "free" and is_premium:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN, 
            detail=f"The model '{model_name}' is a premium model. Please upgrade to Pro or Enterprise to use it."
        )

    # Custom System Prompt Injection
    if current_key.system_prompt:
        has_system = any(m.role == "system" for m in merged_messages)
        if not has_system:
            merged_messages.insert(0, ChatMessage(role="system", content=current_key.system_prompt))
    
    # We will log usage immediately with 0 tokens for stream starting, 
    # as tracking streaming tokens properly requires wrapping the generator.
    log = UsageLog(
        api_key_id=current_key.id,
        endpoint="/v1/chat/stream",
        model_used=model_name,
        prompt_tokens=sum(len(m.content) for m in merged_messages) // 4,
        completion_tokens=0,
        status_code=200
    )
    db.add(log)
    db.commit()

    if provider == "mock":
        generator = stream_mock_llm(request, merged_messages)
    elif provider == "ollama":
        generator = stream_ollama(request, merged_messages)
    elif provider == "gemini":
        generator = stream_gemini(request, merged_messages)
    elif provider == "claude":
        generator = stream_claude(request, merged_messages)
    else:
        raise HTTPException(status_code=500, detail=f"Unknown AI provider: {provider}")

    return StreamingResponse(generator, media_type="text/event-stream")


@router.post("/complete")
async def unified_complete(
    request: CompleteRequest,
    current_key: APIKey = Depends(verify_api_key),
    db: Session = Depends(get_db)
):
    """
    Unified Endpoint: POST /v1/complete
    Auto-detects the request type from the prompt text, then routes to:
      - Image Generation (draw/paint/generate image/sketch...)
      - Voice & Speech TTS (speak/voice/tts...)
      - RAG Document Query (search doc/rag/citation/files...)
      - Autonomous Agent execution (run agent/autonomous/calculator/web search...)
      - Standard Chat completions (default)
    Single API key operates everything.
    """
    import os
    prompt_lower = request.prompt.lower()

    # Heuristics for intent matching
    is_image = any(kw in prompt_lower for kw in ["generate image", "create image", "draw ", "draw a", "paint ", "sketch ", "picture of", "dall-e", "stable diffusion", "midjourney"])
    is_audio = any(kw in prompt_lower for kw in ["speak ", "voice ", "text-to-speech", "tts ", "synthesize voice", "pronounce", "read aloud"])
    is_rag = any(kw in prompt_lower for kw in ["search document", "rag", "pdf search", "citation", "uploaded document", "query files", "search files"])
    is_agent = any(kw in prompt_lower for kw in ["run agent", "autonomous", "agent loop", "react agent", "execute math", "calculator tool", "web search tool"])

    if is_image:
        from app.routers.images import generate_image
        from app.schemas import ImageGenerateRequest
        
        img_req = ImageGenerateRequest(
            prompt=request.prompt,
            model=request.model or "stable-diffusion",
            size=request.size or "1024x1024"
        )
        res = await generate_image(request=img_req, current_key=current_key, db=db)
        return {"type": "image", "response": res}

    elif is_audio:
        from app.routers.audio import generate_dynamic_synth_audio
        
        # Synthesize audio and save to a local static voice file so frontend can play it via a direct link
        voice_profile = request.voice or "alloy"
        audio_bytes = generate_dynamic_synth_audio(
            text=request.prompt,
            voice=voice_profile,
            speed=1.0,
            pitch=1.0
        )
        
        # Save to static/generated_audio
        static_dir = os.path.join(os.getcwd(), "static")
        audio_dir = os.path.join(static_dir, "generated_audio")
        os.makedirs(audio_dir, exist_ok=True)
        
        audio_uuid = str(uuid.uuid4())
        audio_filename = f"{audio_uuid}.wav"
        audio_save_path = os.path.join(audio_dir, audio_filename)
        
        with open(audio_save_path, "wb") as f:
            f.write(audio_bytes)
            
        local_url = f"/static/generated_audio/{audio_filename}"
        
        # Log to usage
        usage_log = UsageLog(
            api_key_id=current_key.id,
            endpoint="/v1/complete [TTS]",
            model_used="local-tts-synth",
            prompt_tokens=len(request.prompt) // 4,
            completion_tokens=len(audio_bytes) // 1000,
            status_code=200
        )
        db.add(usage_log)
        db.commit()
        
        return {
            "type": "audio",
            "text": request.prompt,
            "audio_url": local_url
        }

    elif is_rag:
        from app.routers.rag import query_documents
        from app.schemas import RAGQueryRequest
        
        rag_req = RAGQueryRequest(
            query=request.prompt,
            model=request.model
        )
        try:
            res = await query_documents(request=rag_req, current_key=current_key, db=db)
            return {"type": "rag", "response": res}
        except HTTPException as e:
            # Fallback to chat if RAG files are missing or query fails
            chat_req = ChatRequest(
                messages=[ChatMessage(role="user", content=request.prompt)],
                model=request.model,
                session_id=request.session_id
            )
            res = await generate_chat_completion(request=chat_req, current_key=current_key, db=db)
            return {"type": "chat", "response": res}

    elif is_agent:
        from app.routers.agents import run_agent
        from app.schemas import AgentRunRequest
        
        agent_req = AgentRunRequest(
            prompt=request.prompt,
            model=request.model
        )
        res = await run_agent(request=agent_req, current_key=current_key, db=db)
        return {"type": "agent", "response": res}

    else:
        # Default: Route to chat completion
        chat_req = ChatRequest(
            messages=[ChatMessage(role="user", content=request.prompt)],
            model=request.model,
            session_id=request.session_id
        )
        res = await generate_chat_completion(request=chat_req, current_key=current_key, db=db)
        return {"type": "chat", "response": res}

