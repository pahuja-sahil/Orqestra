# 🤖 ORQESTRA

**Autonomous API Integration Platform** — AI-powered integration generator with self-healing capabilities, voice interface, and real-time monitoring.

## ✨ What is ORQESTRA?

ORQESTRA is an **AI-native platform** that autonomously generates, deploys, monitors, and repairs API integration code. Just describe the API you want to integrate — in text or voice — and ORQESTRA's multi-agent pipeline researches the API documentation, generates production-ready code, creates a GitHub PR, and continuously monitors the integration for health. If something breaks, it fixes itself.

### Key Features

- **🗣️ Voice-First Interface** — Speak your integration request through WebSocket streaming; ORQESTRA transcribes (Groq Whisper), processes, and responds verbally (Deepgram TTS)
- **🤖 Multi-Agent AI Pipeline** — 5-node LangGraph agent (Planner → Repo Context → Researcher → Codegen → Evaluator) with quality scoring and automatic retry
- **🔄 Self-Healing Infrastructure** — Background worker runs health checks every 5 minutes; detects HTTP failures, API docs drift (SHA-256), code syntax/runtime errors, and PR merge status; repairs with exponential backoff (60s→480s)
- **🔗 GitHub Deep Integration** — OAuth connection, repo analysis, file discovery, and automatic PR creation with rich descriptions
- **📧 Intelligent Email Notifications** — Branded HTML emails via Resend: welcome, integration broken (repair started), integration fixed, and escalation (manual intervention needed after 3 failed repair attempts)
- **🔐 Enterprise-Grade Security** — Google OAuth, JWT tokens (access 60min + refresh 7d), TOTP 2FA with QR codes, Fernet encryption for GitHub tokens, Redis-backed rate limiting
- **📊 Real-Time Dashboard** — Live integration status with adaptive polling, health meters, repair progress indicators, and status pipeline visualization
- **🧠 Vector RAG Engine** — ChromaDB + Jina embeddings for API documentation retrieval; auto-discovers OpenAPI specs and ingests them
- **🌙 Dark/Light Theme** — Persistent theme preference with smooth CSS transitions
- **📱 Mobile Responsive** — Sidebar collapses to drawer navigation on mobile devices

## 🚀 Quick Start with Docker

The easiest way to get ORQESTRA running is with Docker Compose:

### Prerequisites
- Docker and Docker Compose installed
- A Google OAuth Client ID (for authentication)
- A Resend API key (for email notifications)

### 1. Clone and Setup

```bash
git clone <your-repo-url>
cd orqestra

# Create environment file
cp .env.example .env
# Edit .env with your configuration (see below)
```

### 2. Configure Environment

Edit the `.env` file with your settings:

```bash
# Database Configuration
POSTGRES_DB=orqestra_db
POSTGRES_USER=orqestra_admin_user
POSTGRES_PASSWORD=your_secure_password

# Application URLs
DATABASE_URL=postgresql://orqestra_admin_user:your_secure_password@postgres:5432/orqestra_db

# Security
SECRET_KEY=your-very-secure-secret-key-at-least-32-chars
ENVIRONMENT=development

# Google OAuth
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret

# Email (for alerts)
RESEND_API_KEY=your-resend-api-key
RESEND_FROM_EMAIL=noreply@orqestra.me

# LLM Providers (at least one required)
GEMINI_API_KEY=your-gemini-api-key
GROQ_API_KEY=your-groq-api-key

# GitHub OAuth (optional, for PR creation)
GITHUB_CLIENT_ID=your-github-client-id
GITHUB_CLIENT_SECRET=your-github-client-secret
```

### 3. Start the Application

```bash
# Start all services
docker-compose up -d

# View logs
docker-compose logs -f
```

### 4. Access Your Application

- **Web Interface**: http://localhost
- **API Documentation**: http://localhost:8000/docs

That's it! 🎉 ORQESTRA is now running and ready to autonomously integrate APIs.

## 🖥️ Development Setup

If you prefer to run components separately for development:

### Backend Setup

```bash
cd apps/api

# Create virtual environment
python -m venv venv
venv\Scripts\activate  # Windows

# Install Python dependencies
pip install -r requirements.txt

# Start the API server with hot reload
uvicorn main:app --reload --port 8000
```

### Frontend Setup

```bash
cd apps/web

# Install Node.js dependencies
npm install

# Start development server with hot reload
npm run dev
```

### Worker Setup

ORQESTRA requires a background worker for health monitoring. In a separate terminal:

```bash
cd apps/api
PYTHONPATH=/app python workers/entrypoint.py
```

### Infrastructure

You'll also need PostgreSQL and Redis running. The `docker-compose.yml` includes both, or you can run them locally:

```bash
# Start only infrastructure services
docker-compose up -d postgres redis
```

## 📖 How to Use

### 1. Sign In with Google
- Visit http://localhost
- Click "Continue with Google"
- Grant the requested permissions

### 2. Connect Your GitHub (Optional)
- Navigate to **Settings** in the dashboard
- Click "Connect GitHub"
- Authorize ORQESTRA to access your repositories
- This enables automatic PR creation for generated integration code

### 3. Create Your First Integration

**Via Text:**
- Go to **Converse** in the dashboard
- Type: *"Create a Stripe payment integration for my repo https://github.com/myuser/myrepo"*
- ORQESTRA will:
  1. Classify your intent via the Planner agent
  2. Analyze your GitHub repo structure
  3. Research Stripe's API documentation (from ChromaDB or web discovery)
  4. Generate production-ready Python code
  5. Validate it with quality scoring (threshold: 7/10)
  6. Present it for your approval with a "Create PR" button

**Via Voice:**
- Click the microphone button in Converse
- Speak your request (e.g., *"Integrate the Twilio SMS API into my project"*)
- ORQESTRA transcribes, processes, and responds audibly
- Review and confirm the generated code

### 4. Watch Your Integration Dashboard
- **Overview** — See all your integrations at a glance with status indicators
- **Integrations** — View detailed health metrics, failure counts, and repair history
- **Logs** — Filterable log stream (all/healthy/broken/healing) with 30-second auto-refresh
- **Agents** — Visualize the 5-node AI pipeline with LLM provider information

### 5. Observe Self-Healing in Action
- The background worker checks every integration every 5 minutes
- Checks performed:
  - **HTTP Health** — Pings known API endpoints or custom health check URLs
  - **Docs Drift** — Compares SHA-256 hash of API documentation; uses ETag/304 caching to save bandwidth
  - **Code Health** — Fetches code from GitHub, compiles Python syntax, runs in sandbox (dev only), detects deprecation warnings
  - **PR Merge Status** — Checks GitHub API to see if a pending PR was merged
- If 2+ checks fail, ORQESTRA:
  1. Marks status as `healing`
  2. Sends you a "needs attention" email
  3. Dispatches the repair agent
  4. Retries with exponential backoff: 60s → 120s → 240s → 480s
  5. On success → creates a fix PR, sends "fixed" email
  6. After 3 failures → marks as `broken`, sends escalation email

### 6. Review Reports & History
- Click any integration to see its full health report
- View failure count, repair attempts, last checked/repaired timestamps
- Track status changes through the pipeline: healthy → healing → pr_pending → healthy/broken
- Access generated code and PR URLs directly

## 🏗️ Architecture

### System Architecture

```
┌─────────────┐    ┌─────────────┐    ┌─────────────┐
│   React App  │◄──►│   Nginx     │◄──►│   FastAPI    │
│  (Frontend)  │    │  (Proxy)    │    │  (Backend)   │
└─────────────┘    └─────────────┘    └──────┬──────┘
                                             │
                    ┌────────────────────────┼────────────────────────┐
                    │                        │                        │
                    ▼                        ▼                        ▼
           ┌──────────────┐       ┌──────────────┐        ┌─────────────────┐
           │  PostgreSQL   │       │    Redis      │        │    ChromaDB      │
           │  (Database)   │       │  (Cache/Q)    │        │  (Vector Store)  │
           └──────────────┘       └──────────────┘        └─────────────────┘
                    │
                    ▼
           ┌─────────────────────────────────────────────┐
           │           Background Worker                  │
           │  ┌─────────┐  ┌─────────┐  ┌───────────┐   │
           │  │ Monitor │  │  Repair  │  │ Notification│  │
           │  │(5min loop)│ │ (backoff)│  │  (Resend)  │   │
           │  └─────────┘  └─────────┘  └───────────┘   │
           └─────────────────────────────────────────────┘
```

### AI Agent Pipeline

```
User Input (Text/Voice)
        │
        ▼
┌─────────────────────────────────────────────────────┐
│               ORQESTRA Agent (LangGraph)             │
│                                                      │
│  Planner ──► Repo Context ──► Researcher ──► Codegen │
│    │              │                │            │    │
│    │              │                │            ▼    │
│    │              │                │       Evaluator │
│    │              │                │         │  │    │
│    ▼              ▼                │    ┌────┘  │    │
│  End (greeting)  End (ask user)    │    │       ▼    │
│                                    │    │  score ≥ 7?│
│                                    │    │  /      \  │
│                                    │  retry     end  │
│                                    │    │         │  │
│                                    └────┘         ▼  │
│                                                Format │
│                                                   │  │
│                                                   ▼  │
│                                          Final Response│
└─────────────────────────────────────────────────────┘
```

### LLM Provider Fallback Chain

```
Code Generation:  Gemini ──► OpenRouter ──► Groq
                  (with 120s Redis cooldown on rate limit)

Planning/Evaluation:  OpenRouter ──► Groq

RAG Retrieval:  Gemini ──► OpenRouter ──► Groq
```

## 🛠️ Technology Stack

### Backend

| Category | Technologies |
|----------|-------------|
| **API Framework** | FastAPI 0.111+, Uvicorn 0.29+, Gunicorn 22+ |
| **Database** | PostgreSQL 15, SQLAlchemy 2.0 (async), Alembic 1.13+ |
| **Cache & Queue** | Redis 7, ARQ 0.25+ |
| **Auth** | Google OAuth (Authlib), JWT (python-jose), TOTP 2FA (pyotp), QR codes |
| **AI/LLM** | LangChain 0.2+, LangGraph 0.1+, ChromaDB 0.5+, Langfuse |
| **LLM Providers** | Google Gemini, Groq (Whisper + LLM), OpenRouter |
| **Voice** | Groq Whisper (STT), Deepgram (TTS), WebSockets |
| **Email** | Resend SDK (branded HTML templates) |
| **Security** | Fernet encryption, bcrypt (passlib), CSRF tokens |
| **Monitoring** | Circuit breaker pattern, rate limiting (Redis sliding window), structlog, OpenTelemetry |
| **Tools** | FastMCP, BeautifulSoup4, PyGithub 2.1+ |
| **Validation** | Pydantic 2.7+, email-validator |

### Frontend

| Category | Technologies |
|----------|-------------|
| **Framework** | React 19.2, React Router DOM 7.13, TanStack React Query 5.96 |
| **Build** | Vite 8+, TypeScript 5.9+, ESLint 9+ |
| **Styling** | Tailwind CSS 4.2, Framer Motion 12, Motion 12 |
| **UI** | shadcn/ui (Radix Nova), lucide-react, @tabler/icons-react |
| **State** | Zustand 5 (with persist middleware for theme + auth) |
| **HTTP** | Axios 1.14 (with 401 interceptor for auto-refresh) |
| **3D** | Three.js, @react-three/fiber 9, @react-three/drei 10 |
| **Utils** | Zod 4 (validation), Sonner (toasts), react-markdown 10 |

### Infrastructure

| Component | Technology |
|-----------|-----------|
| **Containers** | Docker, Docker Compose (6 services) |
| **Reverse Proxy** | Nginx (rate limiting 30r/s, security headers) |
| **API Build** | Multi-stage Docker (base → deps → dev → prod) |
| **Web Build** | Multi-stage Docker (base → deps → dev → prod) |

## 📧 Email Notification System

ORQESTRA sends 4 types of branded HTML emails via **Resend**:

| Email Type | Trigger | Subject Line |
|-----------|---------|-------------|
| **Welcome** 🎉 | New user registration | "Welcome to ORQESTRA — Your AI Integration Platform" |
| **Integration Broken** ⚠️ | Health check failure (2+ failures) | "ORQESTRA: Your {api} integration needs attention" |
| **Integration Fixed** ✅ | Successful repair | "ORQESTRA: Your {api} integration has been fixed" |
| **Escalation** 🚨 | All 3 repair attempts exhausted | "ORQESTRA: Manual attention required for {api}" |

All emails feature a dark gradient ORQESTRA header, contextual color-coded borders (red for issues, green for fixes), and clear calls-to-action linking back to the dashboard.

## 🔧 Configuration Reference

| Environment Variable | Required | Default | Description |
|--------------------|----------|---------|-------------|
| `SECRET_KEY` | ✅ | — | JWT signing key (min 32 chars) |
| `DATABASE_URL` | ✅ | — | PostgreSQL connection string |
| `POSTGRES_USER` | ✅ | — | PostgreSQL user |
| `POSTGRES_PASSWORD` | ✅ | — | PostgreSQL password |
| `POSTGRES_DB` | ✅ | — | PostgreSQL database name |
| `GOOGLE_CLIENT_ID` | ✅ | — | Google OAuth client ID |
| `GOOGLE_CLIENT_SECRET` | ✅ | — | Google OAuth client secret |
| `REDIS_URL` | ⬜ | `redis://localhost:6379` | Redis connection string |
| `GEMINI_API_KEY` | ⬜* | — | Google Gemini API key |
| `GROQ_API_KEY` | ⬜* | — | Groq API key (Whisper + LLM) |
| `OPENROUTER_API_KEY` | ⬜ | — | OpenRouter API key |
| `RESEND_API_KEY` | ⬜ | — | Resend API key (email alerts) |
| `RESEND_FROM_EMAIL` | ⬜ | `orqestra@resend.dev` | Sender email address |
| `GITHUB_CLIENT_ID` | ⬜ | — | GitHub OAuth client ID |
| `GITHUB_CLIENT_SECRET` | ⬜ | — | GitHub OAuth client secret |
| `DEEPGRAM_API_KEY` | ⬜ | — | Deepgram TTS API key |
| `JINA_API_KEY` | ⬜ | — | Jina embeddings API key |
| `ENVIRONMENT` | ⬜ | `development` | `development` or `production` |
| `LLM_PROVIDER` | ⬜ | `gemini` | Active LLM provider (`gemini`/`groq`) |
| `LANGFUSE_PUBLIC_KEY` | ⬜ | — | Langfuse tracing public key |
| `LANGFUSE_SECRET_KEY` | ⬜ | — | Langfuse tracing secret key |
| `ENCRYPTION_KEY` | ⬜ | derived from `SECRET_KEY` | Fernet key for sensitive fields |
| `CHROMA_MODE` | ⬜ | `persistent` | ChromaDB mode (`persistent`/`http`) |

*\*At least one LLM provider (Gemini or Groq) is required.*

## 📊 What You Get

### Dashboard Pages

| Page | Features |
|------|----------|
| **Overview** | Welcome stats (total/healthy/broken/healing/pending), onboarding guide, integration list |
| **Settings** | Profile editor, GitHub connect/disconnect, 2FA setup with QR code |
| **Converse** | Chat interface with voice recording, text input, markdown rendering, PR confirmation |
| **Integrations** | Live list with adaptive polling (15s/60s), detail modal with health meter, repair progress |
| **Agents** | Static pipeline visualization showing all 5 agents with LLM provider info |
| **Logs** | Filterable table (all/healthy/broken/healing) with 30-second auto-refresh |

### Monitoring Capabilities

- **HTTP Health Checks** — Pre-configured endpoints for Stripe, GitHub, Twilio, SendGrid, Slack, OpenAI, Razorpay + custom URLs
- **API Docs Drift Detection** — SHA-256 hash comparison of OpenAPI specs with ETag/304 caching
- **Code Health Validation** — Python syntax compilation, AST analysis, runtime execution (dev), deprecation detection
- **PR Merge Tracking** — GitHub API polling for pending pull requests
- **Circuit Breaker** — Redis-backed, auto-opens after 3 failures in 5 minutes, recovers after 10 minutes

### Security Features

- Google OAuth with forced account selection
- JWT access tokens (60 minute expiry)
- httpOnly refresh token cookies (7 day expiry)
- TOTP 2FA with QR code setup and confirmation flow
- Fernet-encrypted GitHub tokens at rest
- Redis-backed CSRF protection for OAuth flows
- Rate limiting: Nginx (30r/s burst 50) + backend (60 req/min, auth: 5/min)
- Trusted host middleware in production
- Security headers: X-Frame-Options, X-Content-Type-Options, X-XSS-Protection, Referrer-Policy

---

**Ready to experience autonomous API integration?** Run `docker-compose up -d` and visit http://localhost to get started! 🚀
