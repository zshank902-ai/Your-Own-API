from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from datetime import timedelta

from app.database import get_db
from app.models import User, APIKey
from app.schemas import UserCreate, UserRegisterResponse, Token, UserOut
from app.security import (
    get_password_hash, 
    verify_password, 
    create_access_token, 
    generate_api_key
)
from app.config import settings

router = APIRouter(tags=["Authentication"])

@router.post("/register", response_model=UserRegisterResponse, status_code=status.HTTP_201_CREATED)
def register_user(user_in: UserCreate, db: Session = Depends(get_db)):
    """
    Registers a new account.
    Upon successful registration, it automatically generates and returns the initial API key.
    Note: The API key is returned in plaintext ONLY during this call. Write it down.
    """
    # Check if user already exists
    existing_user = db.query(User).filter(User.email == user_in.email).first()
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="A user with this email address already exists."
        )

    # Hash the password and create the user
    hashed_pwd = get_password_hash(user_in.password)
    new_user = User(email=user_in.email, hashed_password=hashed_pwd)
    db.add(new_user)
    db.commit()
    db.refresh(new_user)

    # Generate the user's first API key
    raw_key, prefix, hashed_key = generate_api_key()
    api_key_record = APIKey(
        user_id=new_user.id,
        hashed_key=hashed_key,
        prefix=prefix,
        rate_limit_limit=settings.DEFAULT_RATE_LIMIT_DAILY
    )
    db.add(api_key_record)
    db.commit()

    return {
        "user": new_user,
        "api_key": raw_key
    }


@router.post("/login", response_model=Token)
def login_for_access_token(
    form_data: OAuth2PasswordRequestForm = Depends(), 
    db: Session = Depends(get_db)
):
    """
    Standard OAuth2 password flow login (returns a JWT access token).
    Use this token for dashboard operations.
    """
    user = db.query(User).filter(User.email == form_data.username).first()
    if not user or not verify_password(form_data.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password.",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="User account is deactivated."
        )

    # Create the token
    access_token_expires = timedelta(minutes=settings.JWT_EXPIRY_MINUTES)
    access_token = create_access_token(
        data={"sub": user.email}, 
        expires_delta=access_token_expires
    )
    
    return {"access_token": access_token, "token_type": "bearer"}
