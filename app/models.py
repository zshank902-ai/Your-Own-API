import datetime
from sqlalchemy import Column, Integer, String, Boolean, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from app.database import Base

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True, nullable=False)
    hashed_password = Column(String, nullable=False)
    is_active = Column(Boolean, default=True)
    plan_tier = Column(String, default="free") # "free", "pro", "enterprise"
    webhook_url = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    # Relationships
    api_keys = relationship("APIKey", back_populates="owner", cascade="all, delete-orphan")


class APIKey(Base):
    __tablename__ = "api_keys"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    
    # Store key securely as SHA-256 hash
    hashed_key = Column(String, unique=True, index=True, nullable=False)
    
    # Prefix to show to the user (e.g. "sk-a1b2c3") so they can identify the key
    prefix = Column(String, nullable=False)
    
    # Custom persona prompt for this API key
    system_prompt = Column(String, nullable=True)
    
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    
    # Default daily rate limit (requests per day)
    rate_limit_limit = Column(Integer, default=100)

    # Relationships
    owner = relationship("User", back_populates="api_keys")
    usage_logs = relationship("UsageLog", back_populates="api_key", cascade="all, delete-orphan")


class UsageLog(Base):
    __tablename__ = "usage_logs"

    id = Column(Integer, primary_key=True, index=True)
    api_key_id = Column(Integer, ForeignKey("api_keys.id", ondelete="CASCADE"), nullable=False)
    endpoint = Column(String, nullable=False)
    model_used = Column(String, nullable=True)
    
    # Track simple character counts / simulated token counts
    prompt_tokens = Column(Integer, default=0)
    completion_tokens = Column(Integer, default=0)
    
    status_code = Column(Integer, nullable=False)
    timestamp = Column(DateTime, default=datetime.datetime.utcnow)

    # Relationships
    api_key = relationship("APIKey", back_populates="usage_logs")

class ChatSession(Base):
    __tablename__ = "chat_sessions"

    id = Column(String, primary_key=True, index=True) # E.g., UUID string
    api_key_id = Column(Integer, ForeignKey("api_keys.id", ondelete="CASCADE"), nullable=False)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    # Relationships
    api_key = relationship("APIKey")
    messages = relationship("ChatMessageHistory", back_populates="session", cascade="all, delete-orphan", order_by="ChatMessageHistory.created_at")

class ChatMessageHistory(Base):
    __tablename__ = "chat_message_history"

    id = Column(Integer, primary_key=True, index=True)
    session_id = Column(String, ForeignKey("chat_sessions.id", ondelete="CASCADE"), nullable=False)
    role = Column(String, nullable=False) # 'user', 'assistant', 'system'
    content = Column(String, nullable=False)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    # Relationships
    session = relationship("ChatSession", back_populates="messages")


class Document(Base):
    __tablename__ = "documents"

    id = Column(Integer, primary_key=True, index=True)
    api_key_id = Column(Integer, ForeignKey("api_keys.id", ondelete="CASCADE"), nullable=False)
    filename = Column(String, nullable=False)
    file_path = Column(String, nullable=False)
    file_size = Column(Integer, nullable=False)
    mime_type = Column(String, nullable=False)
    status = Column(String, default="processing")  # "processing", "indexed", "failed"
    chunk_count = Column(Integer, default=0)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    # Relationships
    api_key = relationship("APIKey")


class GeneratedImage(Base):
    __tablename__ = "generated_images"

    id = Column(Integer, primary_key=True, index=True)
    api_key_id = Column(Integer, ForeignKey("api_keys.id", ondelete="CASCADE"), nullable=False)
    prompt = Column(String, nullable=False)
    model = Column(String, nullable=False)
    url = Column(String, nullable=False)
    size = Column(String, nullable=True)
    quality = Column(String, nullable=True)
    style = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    # Relationships
    api_key = relationship("APIKey")


class Agent(Base):
    __tablename__ = "agents"

    id = Column(Integer, primary_key=True, index=True)
    api_key_id = Column(Integer, ForeignKey("api_keys.id", ondelete="CASCADE"), nullable=False)
    name = Column(String, nullable=False)
    description = Column(String, nullable=True)
    system_prompt = Column(String, nullable=False)
    tools = Column(String, nullable=True)  # JSON-encoded list of tool names (e.g. '["web_search"]')
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    # Relationships
    api_key = relationship("APIKey")


class AgentRun(Base):
    __tablename__ = "agent_runs"

    id = Column(String, primary_key=True, index=True)  # UUID string
    api_key_id = Column(Integer, ForeignKey("api_keys.id", ondelete="CASCADE"), nullable=False)
    agent_id = Column(Integer, ForeignKey("agents.id", ondelete="SET NULL"), nullable=True)
    status = Column(String, default="running")  # "running", "completed", "failed"
    logs = Column(String, default="[]")  # JSON list of execution steps
    result = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    # Relationships
    api_key = relationship("APIKey")
    agent = relationship("Agent", backref="runs")


