# 🌌 Your Own API — Production-Grade Autonomous AI Platform

[![FastAPI](https://img.shields.io/badge/FastAPI-009688?style=for-the-badge&logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com/)
[![React](https://img.shields.io/badge/React-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)](https://react.dev/)
[![TailwindCSS](https://img.shields.io/badge/Tailwind_CSS-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white)](https://tailwindcss.com/)
[![SQLite](https://img.shields.io/badge/SQLite-07405E?style=for-the-badge&logo=sqlite&logoColor=white)](https://sqlite.org/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg?style=for-the-badge)](https://opensource.org/licenses/MIT)

**Your Own API** is a complete, production-grade AI platform built with FastAPI, PostgreSQL/SQLite, React, and Tailwind CSS. It empowers developers and enterprises to host their own secure, rate-limited, and multi-model AI gateway supporting advanced visual, semantic, voice, and agentic workflows.

---

## 🔮 Beautiful Dashboard Showcase

*A premium, high-fidelity dark glassmorphic workbench designed to provide zero-latency controls.*

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ 🌌 YOUR OWN API                                           [sk-cfeb06... 🔑] │
├───────────────────┬─────────────────────────────────────────────────────────┤
│ 📊 Dashboard Home │  API USAGE (Free Tier Plan)                             │
│ 👁️ Vision AI       │  [▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓░░░░░░]  96 / 100 Req Left │
│ 📚 Document RAG   │                                                         │
│ 🎨 Creative Image │  ACTIVE PLAYGROUNDS                                     │
│ 🔊 Voice & Speech │  ┌───────────────────────┐   ┌───────────────────────┐  │
│ 🤖 AI Agents      │  │ 🤖 ReAct Autonomous   │   │ 📚 Vector RAG Ingest  │  │
│ ⚙️ Key Settings   │  │ ├ Thoughts (Orange)   │   │ ├ Overlap Chunker     │  │
│                   │  │ ├ Actions  (Sky-blue) │   │ ├ Cosine Matcher      │  │
│                   │  │ └ Answers  (White)    │   │ └ Citation Synthesis  │  │
│                   │  └───────────────────────┘   └───────────────────────┘  │
└───────────────────┴─────────────────────────────────────────────────────────┘
```

> [!TIP]
> **Dashboard Screen Preview Placement**: Take a screenshot of the beautiful dark-mode interface at `http://localhost:5173/dashboard` and drop it here as `assets/dashboard_home.png` for a breathtaking visual landing page!

---

## 🛠️ The 5 Advanced AI Suites

### 1. 👁️ Vision AI Suite (`/v1/vision`)
A computer-vision sandbox providing object analysis, structural OCR, form parsing, and side-by-side visual difference metrics.
* **OCR Coordinate Extractor**: Decodes printed/handwritten text and calculates precise bounding box coordinates.
* **Document Scanner**: Automatically parses financial assets, receipts, and invoices into clean structured JSON grids.
* **Visual Comparator**: Computes similarity metrics and details visual divergence between two images side-by-side.

### 2. 📚 Retrieval-Augmented Generation (RAG) (`/v1/rag`)
A self-contained, zero-dependency document ingestion and semantic query framework.
* **Pure-Python PDF Stream Decoder**: Decodes `FlateDecode` streams with standard `zlib`, bypassing heavy C++ compilation requirements.
* **Sentence-Aware Chunker**: Segments text into `1000-character` sections with a `200-character` overlap to preserve contexts.
* **Pure-Python Cosine VSM**: Runs term frequency (TF) and inverse document frequency (IDF) with Laplacian smoothing.
* **Citation Chat Shell**: Renders answers with interactive, expandable citation cards listing source chunks and confidence scores.

### 3. 🎨 Creative Image Suite (`/v1/images`)
A text-to-image generator, canvas mask editor, and variation pipeline built on SDXL & DALL-E 3.
* **HTML5 Canvas Inpainter**: Paint mask overlays directly on uploaded images to modify elements securely.
* **Media Gallery**: Features instant downloads, glassmorphic filters, and animated loading states.

### 4. 🔊 Voice & Speech AI (`/v1/audio`)
A transcription and synthesis pipeline supporting real-time text-synchronization.
* **Whisper STT Timeline**: Segmented tables displaying text alongside millisecond timestamps.
* **Dynamic Wave Bubbles**: Micro-animated canvas elements pulsing dynamically based on voice playback.

### 5. 🤖 Autonomous ReAct Agents (`/v1/agents`)
A complete Reasoning and Action orchestrator that plans, uses tools, and solves inquiries.
* **Integrated Toolsets**: Equipped with `web_search` (crawling), `calculator` (math), and `rag_search` (document lookups).
* **Developer Terminal**: Renders thought loops using custom orange (Thoughts), sky-blue (Actions), green (Observations), and white (Final Answers) border layouts.

---

## 📐 Unified Decoupled Architecture

```
                  ┌──────────────────────────────────────────┐
                  │      React Dashboard Client (Port 5173)  │
                  └────────────────────┬─────────────────────┘
                                       │
                                       │ HTTP / EventStream (SSE)
                                       ▼
                  ┌──────────────────────────────────────────┐
                  │       FastAPI API Gateway (Port 8000)    │
                  ├──────────────────────────────────────────┤
                  │  - Custom Rolling Window Rate Limiter    │
                  │  - Cryptographic API Key Hasher (SHA256)  │
                  └────────────────────┬─────────────────────┘
                                       │
            ┌──────────────────────────┼──────────────────────────┐
            ▼                          ▼                          ▼
 ┌────────────────────┐     ┌────────────────────┐     ┌────────────────────┐
 │  Mock LLM Engine   │     │ Ollama Local LLaMA │     │ Cloud Services     │
 │  (Instant Sandbox) │     │ (Private Gateway)  │     │ (Claude / Gemini)  │
 └────────────────────┘     └────────────────────┘     └────────────────────┘
```

---

## 📁 Project Structure

```text
your_own_api/
├── app/
│   ├── config.py         # Config loader & system environments
│   ├── database.py       # DB Session & engine lifecycle
│   ├── middleware.py     # API Key extractor & quota checks
│   ├── models.py         # Relational DB Models (Users, Keys, RAG, Usage)
│   ├── schemas.py        # Pydantic Request/Response models
│   ├── security.py       # Password bcrypt & SHA-256 Key generators
│   ├── main.py           # FastAPI server initialization
│   └── routers/
│       ├── agents.py     # Autonomous agents engine
│       ├── audio.py      # Voice TTS/STT router
│       ├── chat.py       # Unified completion dispatcher
│       ├── images.py     # Creative suite & inpainting
│       ├── rag.py        # Semantic vector database ingest
│       └── vision.py     # Visual sandbox router
├── frontend/
│   ├── src/
│   │   ├── pages/
│   │   │   ├── DashboardHome.tsx     # Quota summary & API lists
│   │   │   ├── VisionPlayground.tsx  # Interactive OCR & scans
│   │   │   ├── RAGPlayground.tsx     # PDF library & Citation Chat
│   │   │   ├── ImagePlayground.tsx   # Canvas mask painter
│   │   │   ├── AudioPlayground.tsx   # Speech Wave & timestamps
│   │   │   └── AgentPlayground.tsx   # ReAct loop developer terminal
│   │   └── components/
│   │       └── dashboard/            # Layouts & Glassmorphic Sidebars
└── run_verification.py   # Full automated integration test suite
```

---

## 🚀 Quick Start

### 1. Build and Start Dev Environment
Configure the sandbox settings inside the `.env` file (SQLite and Mock AI engines are default for quick setup):
```bash
# Clone the repository
git clone https://github.com/zshank902-ai/your-own-api.git
cd your-own-api

# Install backend dependencies
python -m venv .venv
source .venv/bin/activate  # Windows: .venv\Scripts\activate
pip install -r requirements.txt

# Run full integration test suite (Asserts 12/12 test cases)
python run_verification.py

# Start Backend Server
uvicorn app.main:app --host 127.0.0.1 --port 8000
```

### 2. Start Frontend Playground
Ensure you have Node.js installed on your workspace:
```bash
cd frontend
npm install
npm run dev
```
Open **[http://localhost:5173](http://localhost:5173)** to access your visual control panel!

---

## 🛡️ License
Distributed under the MIT License. See `LICENSE` for more information.
