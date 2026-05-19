import datetime
from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session
from sqlalchemy import func

from app.database import get_db
from app.models import APIKey, UsageLog, User
from app.schemas import APIKeyRegenerateResponse, UsageSummary, SystemPromptUpdate, WebhookUpdate, UsageDetailedItem, UsageDetailedResponse
from app.middleware import verify_api_key
from app.security import generate_api_key

# Simple token cost estimation matrix (Cost per 1,000 tokens in USD)
COST_MATRIX = {
    "claude-3-haiku-20240307": {"prompt": 0.00025, "completion": 0.00125},
    "gemini-1.5-flash": {"prompt": 0.00035, "completion": 0.00105},
    "llama3": {"prompt": 0.0, "completion": 0.0}, # Local is free
    "mock": {"prompt": 0.0, "completion": 0.0}
}

router = APIRouter(prefix="/v1", tags=["API Key Management"])

@router.post("/regenerate-key", response_model=APIKeyRegenerateResponse)
def regenerate_user_api_key(
    current_key: APIKey = Depends(verify_api_key),
    db: Session = Depends(get_db)
):
    """
    Deactivates (revokes) all existing API keys for the user associated with the 
    provided API key, and issues a new secure API key.
    
    Warning: The old key will immediately stop working. The new key is only shown ONCE.
    """
    user_id = current_key.user_id

    # 1. Deactivate all active keys for this user
    db.query(APIKey).filter(
        APIKey.user_id == user_id, 
        APIKey.is_active == True
    ).update({"is_active": False})
    db.commit()

    # 2. Generate a new secure key
    raw_key, prefix, hashed_key = generate_api_key()
    
    # 3. Create the new database record
    new_api_key_rec = APIKey(
        user_id=user_id,
        hashed_key=hashed_key,
        prefix=prefix,
        rate_limit_limit=current_key.rate_limit_limit  # Preserve the rate limit
    )
    db.add(new_api_key_rec)
    db.commit()
    db.refresh(new_api_key_rec)

    return {
        "new_api_key": raw_key,
        "prefix": prefix,
        "created_at": new_api_key_rec.created_at
    }


@router.get("/usage", response_model=UsageSummary)
def get_api_key_usage(
    current_key: APIKey = Depends(verify_api_key),
    db: Session = Depends(get_db)
):
    """
    Retrieves the daily request count, remaining quota, and time window reset status
    for the provided API key.
    """
    # 24-hour window start time
    time_window_start = datetime.datetime.utcnow() - datetime.timedelta(days=1)
    
    # Count requests for this API key in the last 24 hours
    total_requests = db.query(UsageLog).filter(
        UsageLog.api_key_id == current_key.id,
        UsageLog.timestamp >= time_window_start
    ).count()

    remaining = max(0, current_key.rate_limit_limit - total_requests)
    
    # The rate-limiting window rolls; let's estimate the reset time as 24 hours from the oldest log in the window.
    # If no logs exist, it resets immediately (now).
    oldest_log = db.query(UsageLog).filter(
        UsageLog.api_key_id == current_key.id,
        UsageLog.timestamp >= time_window_start
    ).order_by(UsageLog.timestamp.asc()).first()
    
    if oldest_log:
        reset_time = oldest_log.timestamp + datetime.timedelta(days=1)
    else:
        reset_time = datetime.datetime.utcnow()

    return {
        "total_requests": total_requests,
        "limit": current_key.rate_limit_limit,
        "remaining_requests": remaining,
        "reset_time_utc": reset_time
    }

@router.post("/system-prompt")
def update_system_prompt(
    update_data: SystemPromptUpdate,
    current_key: APIKey = Depends(verify_api_key),
    db: Session = Depends(get_db)
):
    """Updates the custom system persona for the active API Key."""
    current_key.system_prompt = update_data.system_prompt
    db.commit()
    return {"message": "System prompt updated successfully", "system_prompt": current_key.system_prompt}


@router.post("/webhooks/register")
def register_webhook(
    update_data: WebhookUpdate,
    current_key: APIKey = Depends(verify_api_key),
    db: Session = Depends(get_db)
):
    """Registers a webhook URL to receive rate limit notifications."""
    user = db.query(User).filter(User.id == current_key.user_id).first()
    user.webhook_url = update_data.webhook_url
    db.commit()
    return {"message": "Webhook registered successfully", "webhook_url": user.webhook_url}


@router.get("/usage/detailed", response_model=UsageDetailedResponse)
def get_detailed_usage(
    current_key: APIKey = Depends(verify_api_key),
    db: Session = Depends(get_db)
):
    """Retrieves detailed token usage and cost estimation for the current month."""
    now = datetime.datetime.utcnow()
    month_start = datetime.datetime(now.year, now.month, 1)

    usage_stats = db.query(
        UsageLog.model_used,
        func.sum(UsageLog.prompt_tokens).label("prompt_tokens"),
        func.sum(UsageLog.completion_tokens).label("completion_tokens")
    ).filter(
        UsageLog.api_key_id == current_key.id,
        UsageLog.timestamp >= month_start
    ).group_by(UsageLog.model_used).all()

    items = []
    total_cost = 0.0

    for stat in usage_stats:
        model_name = stat.model_used or "unknown"
        p_tokens = stat.prompt_tokens or 0
        c_tokens = stat.completion_tokens or 0
        
        rates = COST_MATRIX.get(model_name, {"prompt": 0.001, "completion": 0.002}) # Fallback rate
        cost = (p_tokens / 1000.0) * rates["prompt"] + (c_tokens / 1000.0) * rates["completion"]
        total_cost += cost

        items.append(UsageDetailedItem(
            model_used=model_name,
            prompt_tokens=p_tokens,
            completion_tokens=c_tokens,
            total_tokens=p_tokens + c_tokens,
            estimated_cost_usd=round(cost, 4)
        ))

    return UsageDetailedResponse(
        month=now.strftime("%Y-%m"),
        usage_by_model=items,
        total_estimated_cost_usd=round(total_cost, 4)
    )
