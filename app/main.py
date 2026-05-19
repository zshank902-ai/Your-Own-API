"""
app/main.py — FastAPI Application Entry Point
=============================================
Configures:
  - Structured rotating file logging (INFO + ERROR)
  - CORS middleware (configurable via ALLOWED_ORIGINS env var)
  - Global exception handler with error logging
  - /health endpoint (checks DB + Redis connectivity)
  - Swagger / ReDoc documentation
"""

import logging
import logging.handlers
import os
import time
from contextlib import asynccontextmanager

import httpx
from fastapi import FastAPI, Request, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, RedirectResponse
from fastapi.staticfiles import StaticFiles
from sqlalchemy import text

from app.config import settings
from app.database import engine, get_db, Base
import app.models
from app.routers import auth, api_keys, chat, vision, rag, images, audio, agents


# =============================================================================
# Logging Setup — rotating file logs + console
# =============================================================================

def configure_logging() -> None:
    """Set up rotating file handlers for INFO and ERROR logs, plus console."""
    log_dir = settings.LOG_DIR
    os.makedirs(log_dir, exist_ok=True)

    log_level = getattr(logging, settings.LOG_LEVEL.upper(), logging.INFO)

    # Shared formatter for all handlers
    formatter = logging.Formatter(
        fmt="%(asctime)s | %(levelname)-8s | %(name)s | %(message)s",
        datefmt="%Y-%m-%dT%H:%M:%S"
    )

    # ── Root logger ──────────────────────────────────────────────────────────
    root_logger = logging.getLogger()
    root_logger.setLevel(log_level)

    # ── Console handler ──────────────────────────────────────────────────────
    console_handler = logging.StreamHandler()
    console_handler.setLevel(log_level)
    console_handler.setFormatter(formatter)
    root_logger.addHandler(console_handler)

    # ── Rotating INFO log (10 MB × 5 backups) ────────────────────────────────
    info_handler = logging.handlers.RotatingFileHandler(
        filename=os.path.join(log_dir, "app.log"),
        maxBytes=10 * 1024 * 1024,  # 10 MB
        backupCount=5,
        encoding="utf-8"
    )
    info_handler.setLevel(logging.INFO)
    info_handler.setFormatter(formatter)
    root_logger.addHandler(info_handler)

    # ── Rotating ERROR log (5 MB × 3 backups) ────────────────────────────────
    error_handler = logging.handlers.RotatingFileHandler(
        filename=os.path.join(log_dir, "error.log"),
        maxBytes=5 * 1024 * 1024,  # 5 MB
        backupCount=3,
        encoding="utf-8"
    )
    error_handler.setLevel(logging.ERROR)
    error_handler.setFormatter(formatter)
    root_logger.addHandler(error_handler)


# Configure logging before app starts
configure_logging()
logger = logging.getLogger(__name__)


# =============================================================================
# Application Lifespan (startup / shutdown events)
# =============================================================================

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Runs startup logic before yielding, then shutdown logic after."""
    logger.info("=" * 60)
    logger.info(f"Your Own API v{settings.APP_VERSION} starting up")
    logger.info(f"Environment : {settings.ENVIRONMENT}")
    logger.info(f"AI Provider : {settings.AI_PROVIDER}")
    logger.info(f"Database    : {settings.DATABASE_URL[:40]}...")
    logger.info(f"Redis       : {settings.REDIS_URL or 'NOT CONFIGURED (using DB fallback)'}")
    logger.info("=" * 60)
    
    # Create all database tables dynamically on startup
    try:
        Base.metadata.create_all(bind=engine)
        logger.info("Database tables initialized/synced successfully.")
    except Exception as e:
        logger.error(f"Failed to initialize database tables: {e}")
        
    yield
    logger.info("Your Own API shutting down. Goodbye!")


# =============================================================================
# FastAPI Application
# =============================================================================

app = FastAPI(
    title="Your Own API",
    description=(
        "A production-grade, self-hosted AI API gateway. "
        "Register, generate API keys (sk-xxxx), and perform "
        "rate-limited chat completions with multi-model support "
        "(Claude, Gemini, LLaMA, Mistral). "
        "Includes streaming, conversation memory, tiered plans, and webhooks."
    ),
    version=settings.APP_VERSION,
    docs_url="/docs",
    redoc_url="/redoc",
    lifespan=lifespan,
)


# =============================================================================
# Middleware
# =============================================================================

# CORS — allow configured frontend origins
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.allowed_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# =============================================================================
# Global Exception Handler — logs all unhandled errors
# =============================================================================

@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception) -> JSONResponse:
    """Catch-all handler: logs the full traceback and returns a clean 500."""
    logger.exception(
        f"Unhandled exception on {request.method} {request.url}: {exc}"
    )
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={
            "detail": "An internal server error occurred. Our team has been notified.",
            "path": str(request.url),
        },
    )


# =============================================================================
# Request Timing Middleware — logs response time for every request
# =============================================================================

@app.middleware("http")
async def log_request_timing(request: Request, call_next):
    start = time.perf_counter()
    response = await call_next(request)
    duration_ms = (time.perf_counter() - start) * 1000
    logger.info(
        f"{request.method} {request.url.path} → {response.status_code} "
        f"({duration_ms:.1f}ms)"
    )
    return response


# =============================================================================
# Routers
# =============================================================================

app.include_router(auth.router)
app.include_router(api_keys.router)
app.include_router(chat.router)
app.include_router(vision.router)
app.include_router(rag.router)
app.include_router(images.router)
app.include_router(audio.router)
app.include_router(agents.router)

# Mount static files
os.makedirs("static", exist_ok=True)
app.mount("/static", StaticFiles(directory="static"), name="static")


# =============================================================================
# Health Check Endpoint
# =============================================================================

@app.get("/health", tags=["System"], summary="Health check")
async def health_check():
    """
    Returns the operational status of the API, database, and Redis.
    Used by Docker HEALTHCHECK, load balancers, and uptime monitors.
    """
    health: dict = {
        "status": "ok",
        "version": settings.APP_VERSION,
        "environment": settings.ENVIRONMENT,
        "components": {}
    }

    # ── Database check ───────────────────────────────────────────────────────
    try:
        with engine.connect() as conn:
            conn.execute(text("SELECT 1"))
        health["components"]["database"] = {"status": "ok"}
    except Exception as e:
        logger.error(f"Health check DB error: {e}")
        health["components"]["database"] = {"status": "error", "detail": str(e)}
        health["status"] = "degraded"

    # ── Redis check ──────────────────────────────────────────────────────────
    if settings.REDIS_URL:
        try:
            import redis as redis_lib
            r = redis_lib.from_url(settings.REDIS_URL, socket_timeout=2)
            r.ping()
            health["components"]["redis"] = {"status": "ok"}
        except Exception as e:
            logger.error(f"Health check Redis error: {e}")
            health["components"]["redis"] = {"status": "error", "detail": str(e)}
            health["status"] = "degraded"
    else:
        health["components"]["redis"] = {"status": "not_configured"}

    http_status = (
        status.HTTP_200_OK
        if health["status"] == "ok"
        else status.HTTP_503_SERVICE_UNAVAILABLE
    )
    return JSONResponse(content=health, status_code=http_status)


# =============================================================================
# Root Redirect
# =============================================================================

@app.get("/", include_in_schema=False)
def root_redirect():
    """Redirect root visitors to interactive Swagger documentation."""
    return RedirectResponse(url="/docs")
