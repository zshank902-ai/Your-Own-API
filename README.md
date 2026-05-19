# 🛡️ Your Own AI API System

A production-grade, highly secure, and rate-limited AI API Gateway built from scratch using Python, FastAPI, and SQLAlchemy. This system allows you to issue, track, and rate-limit your own custom API keys (format: `sk-xxxxxxxxxxxx`) while routing requests to either a local LLaMA instance (via Ollama) or cloud providers (Gemini, Claude).

---

## 📐 System Architecture

The gateway is built on a clean, decoupled layer system:

```
                  ┌──────────────────────────────────────────┐
                  │          Client Application              │
                  └────────────────────┬─────────────────────┘
                                       │
                                       │ Authorization: Bearer sk-xxxxxx...
                                       ▼
                  ┌──────────────────────────────────────────┐
                  │        FastAPI API Key Middleware        │
                  │   - Extracts key & hashes using SHA-256   │
                  └────────────────────┬─────────────────────┘
                                       │
                                       ├────────────────────────────┐
                                       ▼                            ▼
                  ┌──────────────────────────┐         ┌──────────────────────────┐
                  │    Rate Limit Checker    │         │    Database Validator    │
                  │   - Counts logs in past  │         │   - Matches hashed key   │
                  │     24h window (SQL)     │         │     against active keys  │
                  └────────────┬─────────────┘         └────────────┬─────────────┘
                               │                                    │
                               └─────────────────┬──────────────────┘
                                                 │ (If Valid & Under Limit)
                                                 ▼
                  ┌──────────────────────────────────────────┐
                  │            Router Dispatcher             │
                  │   - Routes to Mock, Ollama, or Cloud APIs│
                  └────────────────────┬─────────────────────┘
                                       │
            ┌──────────────────────────┼──────────────────────────┐
            ▼                          ▼                          ▼
 ┌────────────────────┐     ┌────────────────────┐     ┌────────────────────┐
 │  Mock LLM (Local)  │     │ Ollama Local LLaMA │     │ Gemini / Claude    │
 └────────────────────┘     └────────────────────┘     └────────────────────┘
```

### Key Highlights
*   **API Key Hashing**: Plaintext API keys are never stored in the database. Instead, they are hashed using **SHA-256**. This ensures complete security in case of database leaks.
*   **Rolling 24-Hour Rate Limiting**: A custom window rate limiter counts requests associated with the active API key in the database over the previous 24 hours.
*   **OpenAI Compatibility**: The `/v1/chat` endpoint is compatible with the standard OpenAI schema, meaning it is a drop-in replacement for OpenAI SDK clients.

---

## 📁 Project Structure

```
your_own_api/
├── .env                  # Secrets and configurations
├── requirements.txt      # Project dependencies
├── run_verification.py   # Automated integration test suite
├── README.md             # Documentation
└── app/
    ├── __init__.py
    ├── config.py         # Pydantic Settings config loader
    ├── database.py       # DB Engine & SQLAlchemy Session setup
    ├── models.py         # SQLAlchemy ORM Tables (User, APIKey, UsageLog)
    ├── schemas.py        # Pydantic validation schemas
    ├── security.py       # Password hashing (bcrypt), JWT, and Key generation
    ├── middleware.py     # API Key extraction & rate limiter checks
    ├── main.py           # FastAPI entrypoint & router aggregator
    └── routers/
        ├── __init__.py
        ├── auth.py       # /register and /login endpoints
        ├── api_keys.py   # /v1/usage and /v1/regenerate-key endpoints
        └── chat.py       # /v1/chat completion router
```

---

## 🚀 Quick Start

### 1. Configure the Environment
Copy the configuration variables in `.env`. By default, the system will use a local SQLite database (`api.db`) and a mock AI generator so that you can run it immediately with zero setup:
```env
DATABASE_URL=sqlite:///./api.db
AI_PROVIDER=mock
```

To run a live model, download [Ollama](https://ollama.com/), pull a model (`ollama run llama3`), and configure:
```env
AI_PROVIDER=ollama
OLLAMA_BASE_URL=http://localhost:11434
OLLAMA_MODEL=llama3
```

### 2. Set Up Virtual Environment & Install Dependencies
```bash
# Create virtual environment
python -m venv .venv

# Activate virtual environment
# Windows:
.venv\Scripts\activate
# macOS/Linux:
source .venv/bin/activate

# Install requirements
pip install -r requirements.txt
```

### 3. Run the Automated Integration Tests
This script will spin up the server in the background, run registration, chat completions, usage queries, key revocation, and clean up the database:
```bash
python run_verification.py
```

### 4. Start the Application Server
Run the FastAPI production server using Uvicorn:
```bash
uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```
Open [http://127.0.0.1:8000/docs](http://127.0.0.1:8000/docs) in your browser to view the interactive Swagger documentation.

---

## 🛠️ API Documentation & Usage

### 1. Register and Get your API Key
*   **Endpoint**: `POST /register`
*   **Payload**:
```json
{
  "email": "developer@example.com",
  "password": "securepassword123"
}
```
*   **Response**:
```json
{
  "user": {
    "id": 1,
    "email": "developer@example.com",
    "is_active": true,
    "created_at": "2026-05-19T23:45:00Z"
  },
  "api_key": "sk-b7e210ba59ec4b63b4001b10d80efacc"
}
```
> [!WARNING]
> Keep your `api_key` safe! It is only returned in plaintext during registration.

### 2. Make an AI Chat Request
*   **Endpoint**: `POST /v1/chat`
*   **Headers**: `Authorization: Bearer sk-b7e210ba59ec4b63b4001b10d80efacc`
*   **Payload**:
```json
{
  "model": "llama3",
  "messages": [
    {"role": "user", "content": "Explain neural networks in one sentence."}
  ],
  "temperature": 0.7
}
```
*   **Response**:
```json
{
  "id": "chatcmpl-a9b8c7d6e5f4",
  "object": "chat.completion",
  "created": 1716162300,
  "model": "llama3",
  "choices": [
    {
      "index": 0,
      "message": {
        "role": "assistant",
        "content": "A neural network is a computational model inspired by the human brain that learns patterns from data to perform complex tasks like classification or prediction."
      },
      "finish_reason": "stop"
    }
  ],
  "usage": {
    "prompt_tokens": 7,
    "completion_tokens": 30,
    "total_tokens": 37
  }
}
```

### 3. Check Key Usage and Rate Limit
*   **Endpoint**: `GET /v1/usage`
*   **Headers**: `Authorization: Bearer sk-b7e210ba59ec4b63b4001b10d80efacc`
*   **Response**:
```json
{
  "total_requests": 1,
  "limit": 100,
  "remaining_requests": 99,
  "reset_time_utc": "2026-05-20T23:45:00Z"
}
```

### 4. Revoke and Regenerate API Key
*   **Endpoint**: `POST /v1/regenerate-key`
*   **Headers**: `Authorization: Bearer sk-b7e210ba59ec4b63b4001b10d80efacc`
*   **Response**:
```json
{
  "new_api_key": "sk-9546ae68af754c428bb6212a5d1f0aaf",
  "prefix": "sk-9546ae",
  "created_at": "2026-05-19T23:46:12Z"
}
```
*(The old key will be revoked immediately and returns 401 Unauthorized for future requests).*

---

## 🔒 Security Practices
1.  **SHA-256 Key Hashing**: Validates keys against cryptographic hashes rather than plaintext database columns.
2.  **Strict Token Prefixing**: Pre-validated prefixes (`sk-`) help block malformed keys early.
3.  **Password Encrypted via BCrypt**: Secure password storage utilizing industry-standard password derivation functions.
