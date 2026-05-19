import datetime
from fastapi import HTTPException, status, Depends
from fastapi.security import APIKeyHeader
from sqlalchemy.orm import Session
import httpx
import logging
from app.database import get_db
from app.models import APIKey, UsageLog
from app.security import hash_api_key

logger = logging.getLogger(__name__)

# We use the Authorization header for API Key transmission
API_KEY_HEADER = APIKeyHeader(name="Authorization", auto_error=False)

def verify_api_key(
    api_key_header_val: str = Depends(API_KEY_HEADER),
    db: Session = Depends(get_db)
) -> APIKey:
    """
    FastAPI dependency to extract and validate the API key from the Authorization header.
    It automatically supports both 'Bearer sk-xxx' and raw 'sk-xxx' formats.
    """
    if not api_key_header_val:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing API Key. Provide it in the 'Authorization' header (e.g. 'Authorization: Bearer sk-yourkey')."
        )
    
    # Strip Bearer prefix if present
    token = api_key_header_val
    if token.lower().startswith("bearer "):
        token = token[7:].strip()
        
    # Hash the token to match against the stored SHA-256 hash in database
    hashed_token = hash_api_key(token)
    
    # Retrieve active key from the database
    api_key = db.query(APIKey).filter(
        APIKey.hashed_key == hashed_token, 
        APIKey.is_active == True
    ).first()
    
    if not api_key:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid, inactive, or revoked API Key."
        )
    
    # We don't inject BackgroundTasks into verify_api_key directly because it's a Depends, 
    # and doing so might complicate the callers. Instead we can fire and forget if needed, 
    # but FastAPI BackgroundTasks is better. Since this is middleware, let's just use asyncio.create_task for webhooks.
    import asyncio
    
    # Enforce rolling 24-hour window rate limits
    check_rate_limit(api_key, db)
    
    return api_key

async def send_webhook(url: str, payload: dict):
    try:
        async with httpx.AsyncClient() as client:
            await client.post(url, json=payload, timeout=5.0)
    except Exception as e:
        logger.error(f"Failed to send webhook to {url}: {e}")

def check_rate_limit(api_key: APIKey, db: Session):
    """
    Calculates the number of requests made in the last 24 hours for this API Key.
    If the request count meets or exceeds the tier limit, raises a 429 error.
    """
    user = api_key.owner
    tier = user.plan_tier.lower() if user.plan_tier else "free"
    
    if tier == "enterprise":
        return # Unlimited
        
    limit = 1000 if tier == "pro" else 100
    
    # 24-hour rolling window start time
    time_window_start = datetime.datetime.utcnow() - datetime.timedelta(days=1)
    
    # Query database to count logs in this window
    request_count = db.query(UsageLog).filter(
        UsageLog.api_key_id == api_key.id,
        UsageLog.timestamp >= time_window_start
    ).count()
    
    if request_count >= limit:
        # Trigger webhook if configured
        if user.webhook_url:
            import asyncio
            payload = {
                "event": "rate_limit_exceeded",
                "api_key_prefix": api_key.prefix,
                "tier": tier,
                "limit": limit
            }
            asyncio.create_task(send_webhook(user.webhook_url, payload))
            
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail=(
                f"Rate limit exceeded. You have made {request_count} requests in the last 24 hours. "
                f"Your {tier.upper()} plan limit is {limit} requests/day."
            )
        )
