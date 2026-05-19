from pydantic import BaseModel, EmailStr, Field
from typing import List, Optional, Dict, Any
from datetime import datetime

# --- USER SCHEMAS ---
class UserCreate(BaseModel):
    email: EmailStr
    password: str = Field(..., min_length=6, description="Password must be at least 6 characters long")

class UserOut(BaseModel):
    id: int
    email: EmailStr
    is_active: bool
    created_at: datetime

    class Config:
        from_attributes = True

class UserRegisterResponse(BaseModel):
    user: UserOut
    api_key: str = Field(..., description="This API key will only be shown ONCE. Store it securely.")

class WebhookUpdate(BaseModel):
    webhook_url: str = Field(..., description="The URL to receive webhook payloads")

# --- API KEY SCHEMAS ---
class APIKeyOut(BaseModel):
    prefix: str
    is_active: bool
    created_at: datetime
    rate_limit_limit: int

    class Config:
        from_attributes = True

class APIKeyRegenerateResponse(BaseModel):
    new_api_key: str = Field(..., description="This new API key will only be shown ONCE. Store it securely.")
    prefix: str
    created_at: datetime

class SystemPromptUpdate(BaseModel):
    system_prompt: str = Field(..., description="Custom persona or instruction to prepend to all chats")

# --- CHAT COMPLETIONS SCHEMAS (OpenAI-compatible) ---
class ChatMessage(BaseModel):
    role: str = Field(..., description="Role of the message sender: 'system', 'user', or 'assistant'")
    content: str = Field(..., description="Content of the message")

class ChatRequest(BaseModel):
    model: Optional[str] = Field(None, description="AI model to query")
    messages: List[ChatMessage] = Field(..., description="The full list of messages in the conversation")
    temperature: Optional[float] = Field(0.7, ge=0.0, le=2.0, description="Sampling temperature")
    session_id: Optional[str] = Field(None, description="Optional session ID for conversation memory")
    stream: Optional[bool] = Field(False, description="Whether to stream the response back using SSE")

class ChatResponseChoice(BaseModel):
    index: int
    message: ChatMessage
    finish_reason: str

class ChatResponseUsage(BaseModel):
    prompt_tokens: int
    completion_tokens: int
    total_tokens: int

class ChatResponse(BaseModel):
    id: str
    object: str = "chat.completion"
    created: int
    model: str
    choices: List[ChatResponseChoice]
    usage: ChatResponseUsage

# --- USAGE SCHEMAS ---
class UsageSummary(BaseModel):
    total_requests: int
    limit: int
    remaining_requests: int
    reset_time_utc: datetime

class UsageDetailedItem(BaseModel):
    model_used: str
    prompt_tokens: int
    completion_tokens: int
    total_tokens: int
    estimated_cost_usd: float

class UsageDetailedResponse(BaseModel):
    month: str
    usage_by_model: List[UsageDetailedItem]
    total_estimated_cost_usd: float

# --- JWT AUTH SCHEMAS ---
class Token(BaseModel):
    access_token: str
    token_type: str

class TokenData(BaseModel):
    email: Optional[str] = None


# --- VISION AI SCHEMAS ---
class VisionBaseRequest(BaseModel):
    image_base64: Optional[str] = Field(None, description="Base64 encoded image string")
    image_url: Optional[str] = Field(None, description="Direct URL to the image")
    model: Optional[str] = Field(None, description="Optional model choice")

class VisionAnalyzeResponse(BaseModel):
    description: str
    objects: List[str]
    mood: str
    text_detected: Optional[str] = None
    confidence: float

class VisionOCRResponse(BaseModel):
    text: str
    confidence: float
    detected_words: List[Dict[str, Any]] = []

class VisionChatMessage(BaseModel):
    role: str = Field(..., description="Role of message sender: 'user' or 'assistant'")
    content: str = Field(..., description="Content of message")

class VisionChatRequest(BaseModel):
    image_base64: Optional[str] = None
    image_url: Optional[str] = None
    messages: List[VisionChatMessage]
    model: Optional[str] = None

class VisionChatResponse(BaseModel):
    response: str
    session_id: str

class VisionCompareRequest(BaseModel):
    image1_base64: Optional[str] = None
    image1_url: Optional[str] = None
    image2_base64: Optional[str] = None
    image2_url: Optional[str] = None

class VisionCompareResponse(BaseModel):
    similarity_score: float
    differences: List[str]

class VisionScanResponse(BaseModel):
    structured_data: Dict[str, Any]
    confidence: float


# --- RAG SYSTEM SCHEMAS ---
class DocumentOut(BaseModel):
    id: int
    filename: str
    file_size: int
    mime_type: str
    status: str
    chunk_count: int
    created_at: datetime

    class Config:
        from_attributes = True

class RAGQueryRequest(BaseModel):
    query: str = Field(..., description="The question to ask regarding your documents")
    document_ids: Optional[List[int]] = Field(None, description="Optional list of specific document IDs to scope the search")
    model: Optional[str] = Field(None, description="Model to use for generating the answer")

class Citation(BaseModel):
    document_id: int
    filename: str
    chunk_index: int
    content: str
    score: float

class RAGQueryResponse(BaseModel):
    answer: str
    citations: List[Citation]


# --- IMAGE GENERATION SCHEMAS ---
class ImageGenerateRequest(BaseModel):
    prompt: str = Field(..., description="The textual prompt describing the image to generate")
    size: Optional[str] = Field("1024x1024", description="Image resolution (e.g. 1024x1024, 512x512, 256x256)")
    quality: Optional[str] = Field("standard", description="Image generation quality: standard or hd")
    style: Optional[str] = Field("vivid", description="Style modifier: vivid or natural")
    n: Optional[int] = Field(1, ge=1, le=4, description="Number of images to generate (1-4)")
    model: Optional[str] = Field(None, description="Optional model: 'stable-diffusion', 'dall-e-3', or 'midjourney'")

class ImageResponseDataItem(BaseModel):
    url: Optional[str] = Field(None, description="Direct URL path to the generated image file")
    b64_json: Optional[str] = Field(None, description="Base64 encoded image content if requested")

class ImageResponse(BaseModel):
    created: int
    data: List[ImageResponseDataItem]

class ImageEditRequest(BaseModel):
    image_base64: str = Field(..., description="Base64 encoded source image")
    prompt: str = Field(..., description="Text prompt describing the desired edits/inpainting")
    mask_base64: Optional[str] = Field(None, description="Base64 encoded transparency mask for inpainting area")

class ImageVariationsRequest(BaseModel):
    image_base64: str = Field(..., description="Base64 encoded source image to generate variations of")

class GeneratedImageOut(BaseModel):
    id: int
    prompt: str
    model: str
    url: str
    size: Optional[str]
    quality: Optional[str]
    style: Optional[str]
    created_at: datetime

    class Config:
        from_attributes = True


# --- VOICE & SPEECH SCHEMAS ---
class TTSRequest(BaseModel):
    text: str = Field(..., description="The plain text content to convert to audio")
    voice: Optional[str] = Field("alloy", description="Voice profile (alloy, echo, fable, onyx, nova, shimmer, eleven_rachel, eleven_dom)")
    speed: Optional[float] = Field(1.0, ge=0.25, le=4.0, description="Speech rate speed modifier")
    pitch: Optional[float] = Field(1.0, ge=0.5, le=2.0, description="Pitch modifier (ElevenLabs support)")
    format: Optional[str] = Field("mp3", description="Audio output format (mp3, wav, opus)")
    model: Optional[str] = Field("openai", description="TTS engine provider: 'openai' or 'elevenlabs'")

class STTResponse(BaseModel):
    text: str
    language: str
    duration: float
    segments: Optional[List[Dict[str, Any]]] = None


# --- AUTONOMOUS AGENTS SCHEMAS ---
class AgentCreate(BaseModel):
    name: str = Field(..., description="Human-friendly name of the agent")
    description: Optional[str] = Field(None, description="Brief description of the agent's role")
    system_prompt: str = Field(..., description="Persona instructions prepended to the agent run loop")
    tools: Optional[List[str]] = Field(default=[], description="List of tool names allowed (e.g. 'web_search', 'calculator', 'rag_documents')")

class AgentOut(BaseModel):
    id: int
    name: str
    description: Optional[str]
    system_prompt: str
    tools: Optional[str]  # JSON-encoded string
    created_at: datetime

    class Config:
        from_attributes = True

class AgentRunRequest(BaseModel):
    agent_id: Optional[int] = Field(None, description="Optional saved agent ID to execute")
    prompt: str = Field(..., description="The specific task instruction for the agent to run")
    model: Optional[str] = Field(None, description="Model to power the agent (e.g. 'mock', 'gpt-4o', 'claude-3-5-sonnet')")
    tools: Optional[List[str]] = Field(None, description="Optional runtime tool configuration to override agent default tools")

class AgentRunOut(BaseModel):
    id: str
    status: str
    logs: str  # JSON list of action steps
    result: Optional[str]
    created_at: datetime

    class Config:
        from_attributes = True


class CompleteRequest(BaseModel):
    prompt: str = Field(..., description="The query prompt to auto-route across AI features")
    model: Optional[str] = Field(None, description="Optional model target override")
    session_id: Optional[str] = Field(None, description="Optional session ID for memory state")
    voice: Optional[str] = Field("alloy", description="Voice profile if TTS is activated")
    size: Optional[str] = Field("1024x1024", description="Image resolution if Image Gen is activated")



