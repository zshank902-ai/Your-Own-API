import bcrypt
import hashlib
import uuid
import datetime
from typing import Tuple, Optional
import jwt
from app.config import settings

def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verifies a plain password against its hashed value using bcrypt."""
    try:
        return bcrypt.checkpw(
            plain_password.encode("utf-8"), 
            hashed_password.encode("utf-8")
        )
    except Exception:
        return False

def get_password_hash(password: str) -> str:
    """Hashes a plain password using bcrypt."""
    # Generate salt and hash the password
    salt = bcrypt.gensalt()
    hashed = bcrypt.hashpw(password.encode("utf-8"), salt)
    return hashed.decode("utf-8")

def create_access_token(data: dict, expires_delta: Optional[datetime.timedelta] = None) -> str:
    """Generates a JWT access token for web user sessions."""
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.datetime.utcnow() + expires_delta
    else:
        expire = datetime.datetime.utcnow() + datetime.timedelta(minutes=settings.JWT_EXPIRY_MINUTES)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, settings.JWT_SECRET, algorithm=settings.JWT_ALGORITHM)
    return encoded_jwt

def decode_access_token(token: str) -> Optional[dict]:
    """Decodes and validates a JWT token. Returns payload dict or None if invalid."""
    try:
        payload = jwt.decode(token, settings.JWT_SECRET, algorithms=[settings.JWT_ALGORITHM])
        return payload
    except jwt.PyJWTError:
        return None

def generate_api_key() -> Tuple[str, str, str]:
    """
    Generates a secure API key.
    
    Returns:
        Tuple[str, str, str]: (raw_key, prefix, hashed_key)
        - raw_key: The cleartext key to return to the user (e.g. sk-7abf2cd8...)
        - prefix: A visual identifier (e.g. sk-7abf2c) for display
        - hashed_key: SHA-256 hash of the raw_key to store in database
    """
    # Create 32-char hexadecimal UUID string
    uuid_hex = uuid.uuid4().hex
    raw_key = f"sk-{uuid_hex}"
    
    # Prefix includes "sk-" and the first 6 hex characters of the key
    prefix = raw_key[:9]
    
    # Hash the key using SHA-256 for secure database search/verification
    hashed_key = hash_api_key(raw_key)
    
    return raw_key, prefix, hashed_key

def hash_api_key(api_key: str) -> str:
    """Hashes an API key string using SHA-256."""
    return hashlib.sha256(api_key.encode("utf-8")).hexdigest()
