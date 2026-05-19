import os
import re
import zlib
import json
import math
import logging
import datetime
import collections
from typing import List, Optional, Dict, Any

from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File
from sqlalchemy.orm import Session
import httpx

from app.database import get_db
from app.models import APIKey, UsageLog, Document
from app.schemas import DocumentOut, RAGQueryRequest, Citation, RAGQueryResponse
from app.middleware import verify_api_key
from app.config import settings

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/v1", tags=["RAG System"])

# Constants
DATA_DIR = os.path.join(os.getcwd(), "data")
DOCUMENTS_DIR = os.path.join(DATA_DIR, "documents")
RAG_INDEX_DIR = os.path.join(DATA_DIR, "rag_index")

# Create directories
os.makedirs(DOCUMENTS_DIR, exist_ok=True)
os.makedirs(RAG_INDEX_DIR, exist_ok=True)

# -----------------------------------------------------------------------------
# Document Text Extraction Utilities
# -----------------------------------------------------------------------------

def extract_text_from_pdf(pdf_bytes: bytes) -> str:
    """
    Extracts plain text from a raw PDF file's bytes.
    Parses decompressed text streams using FlateDecode via zlib.
    """
    # Regex to find stream objects in raw bytes
    stream_pattern = re.compile(b"stream\r?\n(.*?)\r?\nendstream", re.DOTALL)
    text_pieces = []
    
    # Try parsing stream blocks
    for match in stream_pattern.finditer(pdf_bytes):
        stream_data = match.group(1)
        # Try normal decompress or raw deflate (-15 wbits)
        decompressed = None
        try:
            decompressed = zlib.decompress(stream_data)
        except Exception:
            try:
                decompressed = zlib.decompress(stream_data, -15)
            except Exception:
                continue
        
        if not decompressed:
            continue
            
        try:
            decompressed_str = decompressed.decode("utf-8", errors="ignore")
        except Exception:
            continue
        
        # In PDF content streams, text is positioned within BT ... ET blocks and 
        # written within parentheses (text) Tj or [(t1) 10 (t2)] TJ.
        # Let's extract tokens inside parentheses.
        matches = re.findall(r'\((.*?)\)', decompressed_str)
        for m in matches:
            # Replace common PDF escaped parentheses
            cleaned = m.replace('\\(', '(').replace('\\)', ')').replace('\\n', '\n').replace('\\r', '\r')
            if len(cleaned.strip()) > 0:
                text_pieces.append(cleaned)
                
    if not text_pieces:
        # Fallback: extract printable ASCII characters inside brackets from raw bytes
        try:
            raw_str = pdf_bytes.decode("ascii", errors="ignore")
            matches = re.findall(r'\((.*?)\)', raw_str)
            for m in matches:
                if len(m.strip()) > 1 and all(32 <= ord(c) < 127 or c in '\n\r\t' for c in m):
                    text_pieces.append(m)
        except Exception:
            pass
            
    return "\n".join(text_pieces)


def chunk_text(text: str, chunk_size: int = 1000, overlap: int = 200) -> List[str]:
    """
    Splits document text into overlapping chunks, attempting to keep sentences intact.
    """
    chunks = []
    if not text:
        return chunks
    
    # Normalize whitespaces
    text = re.sub(r'\s+', ' ', text).strip()
    
    start = 0
    text_len = len(text)
    
    while start < text_len:
        end = start + chunk_size
        if end >= text_len:
            chunks.append(text[start:])
            break
        
        # Try to find a nice sentence or word boundary in the overlap window
        break_pos = end
        for i in range(end, max(start, end - 150), -1):
            if text[i] in ['.', '!', '?']:
                break_pos = i + 1
                break
            elif text[i] == ' ' and break_pos == end:
                break_pos = i
                
        chunks.append(text[start:break_pos].strip())
        start = break_pos - overlap
        if start >= text_len or break_pos <= start + 50:
            start = break_pos
            
    return chunks

# -----------------------------------------------------------------------------
# Vector Space Engine (Pure Python Cosine TF-IDF Matcher)
# -----------------------------------------------------------------------------

def tokenize(text: str) -> List[str]:
    """Basic lowercased alphanumeric tokenizer."""
    return re.findall(r'\b[a-z0-9_]+\b', text.lower())


def search_vector_space(query: str, chunks: List[Dict[str, Any]], top_n: int = 3) -> List[Dict[str, Any]]:
    """
    Finds the most semantically relevant chunks for a search query using raw TF-IDF.
    """
    if not chunks:
        return []
        
    query_tokens = tokenize(query)
    if not query_tokens:
        return []
        
    query_tf = collections.Counter(query_tokens)
    
    # Tokenize each chunk and build global vocabulary
    chunk_tokens_list = []
    vocab = set()
    for c in chunks:
        tokens = tokenize(c["content"])
        chunk_tokens_list.append(tokens)
        vocab.update(tokens)
        
    # Calculate Document Frequency (DF) across chunks
    df = collections.defaultdict(int)
    for tokens in chunk_tokens_list:
        for t in set(tokens):
            df[t] += 1
            
    # Calculate Inverse Document Frequency (IDF) with smoothing
    num_chunks = len(chunks)
    idf = {}
    for term, count in df.items():
        idf[term] = math.log((1 + num_chunks) / (1 + count)) + 1
        
    # Calculate Query Vector & Norm
    query_vector = {}
    query_norm_sq = 0.0
    for term, tf in query_tf.items():
        if term in idf:
            val = tf * idf[term]
            query_vector[term] = val
            query_norm_sq += val * val
    query_norm = math.sqrt(query_norm_sq)
    
    if query_norm == 0.0:
        # Default fallback to first chunks if no keyword overlap at all
        return [{**chunks[i], "score": 0.0} for i in range(min(top_n, len(chunks)))]
        
    # Calculate Cosine Similarity with each chunk vector
    results = []
    for idx, c in enumerate(chunks):
        tokens = chunk_tokens_list[idx]
        if not tokens:
            continue
            
        chunk_tf = collections.Counter(tokens)
        chunk_vector = {}
        chunk_norm_sq = 0.0
        
        for term, tf in chunk_tf.items():
            val = tf * idf.get(term, 1.0)
            chunk_vector[term] = val
            chunk_norm_sq += val * val
            
        chunk_norm = math.sqrt(chunk_norm_sq)
        if chunk_norm == 0.0:
            continue
            
        # Dot product
        dot_product = sum(query_vector[t] * chunk_vector[t] for t in query_vector if t in chunk_vector)
        similarity = dot_product / (query_norm * chunk_norm)
        
        results.append({
            "document_id": c["document_id"],
            "filename": c["filename"],
            "chunk_index": c["chunk_index"],
            "content": c["content"],
            "score": similarity
        })
        
    # Sort and return top results
    results.sort(key=lambda x: x["score"], reverse=True)
    return results[:top_n]

# -----------------------------------------------------------------------------
# LLM Providers Execution Adapters
# -----------------------------------------------------------------------------

async def get_llm_response(prompt: str, model: Optional[str] = None) -> str:
    """
    Routes the query to Ollama, Gemini, Claude, or falls back to a realistic mock.
    """
    model_name = (model or settings.AI_PROVIDER).lower()
    
    if model_name.startswith("claude"):
        if not settings.CLAUDE_API_KEY:
            return f"[MOCK CLAUDE RAG ANSWER] (No API key found)\n\nBased on your documents, the answer is that the API key was not configured. Make sure to define CLAUDE_API_KEY in your environment to query Claude live."
            
        url = "https://api.anthropic.com/v1/messages"
        headers = {
            "x-api-key": settings.CLAUDE_API_KEY,
            "anthropic-version": "2023-06-01",
            "content-type": "application/json"
        }
        payload = {
            "model": model or "claude-3-haiku-20240307",
            "max_tokens": 1024,
            "messages": [{"role": "user", "content": prompt}],
            "temperature": 0.3
        }
        try:
            async with httpx.AsyncClient() as client:
                response = await client.post(url, json=payload, headers=headers, timeout=30.0)
                if response.status_code == 200:
                    return response.json()["content"][0]["text"]
                else:
                    return f"[Error from Claude API: {response.text}]"
        except Exception as e:
            return f"[Claude request failed: {e}]"
            
    elif model_name.startswith("gemini"):
        if not settings.GEMINI_API_KEY:
            return f"[MOCK GEMINI RAG ANSWER] (No API key found)\n\nTo see live answers from Gemini, configure GEMINI_API_KEY in your server config."
            
        model_id = model or "gemini-1.5-flash"
        url = f"https://generativelanguage.googleapis.com/v1beta/models/{model_id}:generateContent?key={settings.GEMINI_API_KEY}"
        payload = {
            "contents": [{"role": "user", "parts": [{"text": prompt}]}],
            "generationConfig": {"temperature": 0.3}
        }
        try:
            async with httpx.AsyncClient() as client:
                response = await client.post(url, json=payload, timeout=30.0)
                if response.status_code == 200:
                    return response.json()["candidates"][0]["content"]["parts"][0]["text"]
                else:
                    return f"[Error from Gemini API: {response.text}]"
        except Exception as e:
            return f"[Gemini request failed: {e}]"
            
    elif model_name.startswith("llama") or model_name.startswith("mistral"):
        url = f"{settings.OLLAMA_BASE_URL}/api/chat"
        payload = {
            "model": model or settings.OLLAMA_MODEL,
            "messages": [{"role": "user", "content": prompt}],
            "stream": False,
            "options": {"temperature": 0.3}
        }
        try:
            async with httpx.AsyncClient() as client:
                response = await client.post(url, json=payload, timeout=30.0)
                if response.status_code == 200:
                    return response.json()["message"]["content"]
                else:
                    return f"[Error from Ollama: {response.text}]"
        except Exception as e:
            return f"[Ollama request failed: {e}]"
            
    # Mock Provider / Fallback
    # Generate a very high-quality mock response summarizing the provided text
    summary_match = re.search(r"--- CONTEXT ---\n(.*)", prompt, re.DOTALL)
    context_content = summary_match.group(1) if summary_match else ""
    
    # Extract some key phrases from context to make the mock response extremely realistic
    sentences = [s.strip() for s in re.split(r'[.!?]', context_content) if len(s.strip()) > 10]
    extracted_examples = ""
    if len(sentences) >= 2:
        extracted_examples = f"Specifically, the document mentions: \"{sentences[0]}\" and details that \"{sentences[1]}\"."
    elif sentences:
        extracted_examples = f"According to the source, \"{sentences[0]}\"."
        
    mock_response = (
        f"Based on the documents provided, I found that you are asking about terms matching your query.\n\n"
        f"{extracted_examples or 'The document matches your semantic query but has short contents.'}\n\n"
        "Let me know if you would like me to extract other details or perform cross-analyses!"
    )
    return mock_response

# -----------------------------------------------------------------------------
# Endpoints
# -----------------------------------------------------------------------------

@router.post("/rag/upload", response_model=DocumentOut, status_code=status.HTTP_201_CREATED)
async def upload_document(
    file: UploadFile = File(...),
    current_key: APIKey = Depends(verify_api_key),
    db: Session = Depends(get_db)
):
    """
    Upload and index a new text, markdown, or PDF document.
    Enforces subscription tier storage limits.
    """
    # 1. Tier Limitations Check
    tier = current_key.owner.plan_tier.lower() if current_key.owner.plan_tier else "free"
    if tier == "free":
        limit = 2
    elif tier == "pro":
        limit = 50
    else:
        limit = float('inf')
        
    current_count = db.query(Document).filter(Document.api_key_id == current_key.id).count()
    if current_count >= limit:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Subscription tier limit reached. {tier.upper()} users can upload up to {limit} documents. Please upgrade your tier."
        )
        
    # Check mime type / extension
    filename = file.filename
    ext = os.path.splitext(filename)[1].lower()
    if ext not in [".txt", ".md", ".pdf"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Unsupported file format. Only .txt, .md, and .pdf are supported."
        )
        
    # Read file content
    contents = await file.read()
    file_size = len(contents)
    
    # Prevent empty uploads
    if file_size == 0:
        raise HTTPException(status_code=400, detail="File is empty.")
        
    # Max size 10MB
    if file_size > 10 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="File exceeds maximum size of 10MB.")
        
    # Create the database entry first to get the document ID
    db_doc = Document(
        api_key_id=current_key.id,
        filename=filename,
        file_path="",  # Filled later
        file_size=file_size,
        mime_type=file.content_type or "application/octet-stream",
        status="processing",
        chunk_count=0
    )
    db.add(db_doc)
    db.commit()
    db.refresh(db_doc)
    
    # Save the raw file
    saved_filename = f"{db_doc.id}_{filename}"
    saved_path = os.path.join(DOCUMENTS_DIR, saved_filename)
    with open(saved_path, "wb") as f:
        f.write(contents)
        
    # Update filepath in database
    db_doc.file_path = saved_path
    db.commit()
    
    # Extract text based on file type
    text_content = ""
    try:
        if ext == ".pdf":
            text_content = extract_text_from_pdf(contents)
        else:
            text_content = contents.decode("utf-8", errors="ignore")
            
        if not text_content.strip():
            raise ValueError("No text could be extracted from the file.")
            
        # Create overlapping chunks
        chunks = chunk_text(text_content)
        chunk_count = len(chunks)
        
        if chunk_count == 0:
            raise ValueError("Text too short to chunk.")
            
        # Formulate chunk schema payload
        indexed_chunks = []
        for i, chunk in enumerate(chunks):
            indexed_chunks.append({
                "document_id": db_doc.id,
                "filename": filename,
                "chunk_index": i,
                "content": chunk
            })
            
        # Save index JSON
        index_path = os.path.join(RAG_INDEX_DIR, f"{db_doc.id}.json")
        with open(index_path, "w", encoding="utf-8") as f:
            json.dump(indexed_chunks, f, ensure_ascii=False, indent=2)
            
        # Update database document status
        db_doc.status = "indexed"
        db_doc.chunk_count = chunk_count
        db.commit()
        
    except Exception as e:
        logger.error(f"Error parsing and indexing document {db_doc.id}: {e}")
        db_doc.status = "failed"
        db.commit()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Parsing/indexing failed: {str(e)}"
        )
        
    return db_doc


@router.get("/rag/documents", response_model=List[DocumentOut])
async def list_documents(
    current_key: APIKey = Depends(verify_api_key),
    db: Session = Depends(get_db)
):
    """
    Returns lists of all uploaded and indexed documents for this API key.
    """
    documents = db.query(Document).filter(Document.api_key_id == current_key.id).all()
    return documents


@router.delete("/rag/documents/{document_id}", status_code=status.HTTP_200_OK)
async def delete_document(
    document_id: int,
    current_key: APIKey = Depends(verify_api_key),
    db: Session = Depends(get_db)
):
    """
    Deletes the document registry from database and removes all index vectors and files.
    """
    doc = db.query(Document).filter(
        Document.id == document_id,
        Document.api_key_id == current_key.id
    ).first()
    
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found or access denied.")
        
    # Delete raw file
    if doc.file_path and os.path.exists(doc.file_path):
        try:
            os.remove(doc.file_path)
        except Exception as e:
            logger.error(f"Could not delete raw document file: {e}")
            
    # Delete index file
    index_path = os.path.join(RAG_INDEX_DIR, f"{doc.id}.json")
    if os.path.exists(index_path):
        try:
            os.remove(index_path)
        except Exception as e:
            logger.error(f"Could not delete index file: {e}")
            
    # Remove from database
    db.delete(doc)
    db.commit()
    
    return {"message": "Document and all associated indices deleted successfully."}


@router.post("/rag/query", response_model=RAGQueryResponse)
async def query_documents(
    request: RAGQueryRequest,
    current_key: APIKey = Depends(verify_api_key),
    db: Session = Depends(get_db)
):
    """
    Search indexed document text chunks via TF-IDF cosine similarity,
    inject results as prompt context, and return LLM synthesis.
    """
    # 1. Fetch matching documents for this API key
    query_builder = db.query(Document).filter(
        Document.api_key_id == current_key.id,
        Document.status == "indexed"
    )
    
    # Filter by specific document list if provided
    if request.document_ids:
        query_builder = query_builder.filter(Document.id.in_(request.document_ids))
        
    docs = query_builder.all()
    if not docs:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No indexed documents found for querying. Upload some files first."
        )
        
    # 2. Gather all chunks from JSON indices
    all_chunks = []
    for d in docs:
        index_path = os.path.join(RAG_INDEX_DIR, f"{d.id}.json")
        if os.path.exists(index_path):
            try:
                with open(index_path, "r", encoding="utf-8") as f:
                    chunks_payload = json.load(f)
                    all_chunks.extend(chunks_payload)
            except Exception as e:
                logger.error(f"Error loading index file {index_path}: {e}")
                
    if not all_chunks:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Indexed files seem empty or corrupted. Please delete and re-upload."
        )
        
    # 3. Vector Match Search
    matched_chunks = search_vector_space(request.query, all_chunks, top_n=3)
    
    # If no overlaps or empty results, make sure we construct basic citations safely
    citations = []
    context_pieces = []
    for i, match in enumerate(matched_chunks):
        citations.append(
            Citation(
                document_id=match["document_id"],
                filename=match["filename"],
                chunk_index=match["chunk_index"],
                content=match["content"][:200] + "..." if len(match["content"]) > 200 else match["content"],
                score=float(match.get("score", 0.0))
            )
        )
        context_pieces.append(f"Source: {match['filename']} (chunk {match['chunk_index']})\nContent: {match['content']}")
        
    # 4. Formulate Prompt Template
    context_text = "\n\n".join(context_pieces)
    prompt = (
        "You are an expert AI Assistant at 'Your Own API'. Answer the query based ONLY on the provided document context. "
        "Make sure to synthesize a concise, high-quality response. If the context doesn't contain the answer, "
        "clearly state that you cannot find it in the documents, but do not make things up. "
        "Reference sources by their filenames where applicable.\n\n"
        f"--- CONTEXT ---\n{context_text}\n\n"
        f"--- QUERY ---\n{request.query}\n\n"
        "--- ANSWER ---"
    )
    
    # 5. Run LLM Provider Integration
    answer = await get_llm_response(prompt, request.model)
    
    # 6. Log Usage to the DB
    usage_log = UsageLog(
        api_key_id=current_key.id,
        endpoint="/v1/rag/query",
        model_used=request.model or settings.AI_PROVIDER,
        prompt_tokens=len(prompt) // 4,
        completion_tokens=len(answer) // 4,
        status_code=200
    )
    db.add(usage_log)
    db.commit()
    
    return RAGQueryResponse(
        answer=answer,
        citations=citations
    )
