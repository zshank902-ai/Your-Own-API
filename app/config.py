"""
app/config.py — Application Configuration
==========================================
Uses Pydantic Settings to load all environment variables from .env file.
Supports development (SQLite) and production (PostgreSQL + Redis) modes.
"""

import os
from pydantic_settings import BaseSettings, SettingsConfigDict
from typing import Optional, List


class Settings(BaseSettings):
    # ─── Application ──────────────────────────────────────────────────────
    ENVIRONMENT: str = "development"           # "development" | "production"
    APP_VERSION: str = "1.0.0"

    # ─── Database ─────────────────────────────────────────────────────────
    # Local default: SQLite. Docker override: PostgreSQL (set in docker-compose.yml)
    DATABASE_URL: str = "sqlite:///./api.db"

    # ─── Redis ─────────────────────────────────────────────────────────────
    REDIS_URL: Optional[str] = None            # None = skip Redis, use DB-based counting
    REDIS_PASSWORD: Optional[str] = None

    # ─── JWT Authentication ────────────────────────────────────────────────
    JWT_SECRET: str = "super_secret_jwt_key_change_me_in_production_1234567890"
    JWT_ALGORITHM: str = "HS256"
    JWT_EXPIRY_MINUTES: int = 60

    # ─── Rate Limiting ─────────────────────────────────────────────────────
    DEFAULT_RATE_LIMIT_DAILY: int = 100        # Free tier daily request cap

    # ─── AI Providers ──────────────────────────────────────────────────────
    AI_PROVIDER: str = "mock"                  # "mock" | "ollama" | "gemini" | "claude"
    OLLAMA_BASE_URL: str = "http://localhost:11434"
    OLLAMA_MODEL: str = "llama3"
    GEMINI_API_KEY: Optional[str] = None
    CLAUDE_API_KEY: Optional[str] = None
    OPENAI_API_KEY: Optional[str] = None
    REPLICATE_API_TOKEN: Optional[str] = None

    # ─── Stripe Billing (Phase 4) ──────────────────────────────────────────
    STRIPE_SECRET_KEY: Optional[str] = None
    STRIPE_WEBHOOK_SECRET: Optional[str] = None
    STRIPE_PRO_PRICE_ID: Optional[str] = None
    STRIPE_ENTERPRISE_PRICE_ID: Optional[str] = None

    # ─── Email / SMTP (Phase 4) ────────────────────────────────────────────
    SMTP_HOST: str = "smtp.gmail.com"
    SMTP_PORT: int = 587
    SMTP_USERNAME: Optional[str] = None
    SMTP_PASSWORD: Optional[str] = None
    SMTP_FROM_EMAIL: str = "noreply@yourdomain.com"

    # ─── Logging ───────────────────────────────────────────────────────────
    LOG_LEVEL: str = "INFO"
    LOG_DIR: str = "./logs"

    # ─── CORS ──────────────────────────────────────────────────────────────
    ALLOWED_ORIGINS: str = "http://localhost:5173,http://localhost:3000"

    @property
    def allowed_origins_list(self) -> List[str]:
        """Parse the comma-separated ALLOWED_ORIGINS into a Python list."""
        return [o.strip() for o in self.ALLOWED_ORIGINS.split(",") if o.strip()]

    @property
    def is_production(self) -> bool:
        return self.ENVIRONMENT.lower() == "production"

    @property
    def is_development(self) -> bool:
        return self.ENVIRONMENT.lower() == "development"

    # Load from .env file in project root
    model_config = SettingsConfigDict(
        env_file=os.path.join(
            os.path.dirname(os.path.dirname(os.path.abspath(__file__))), ".env"
        ),
        env_file_encoding="utf-8",
        extra="ignore"
    )


# Single global settings instance imported throughout the app
settings = Settings()
