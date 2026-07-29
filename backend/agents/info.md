# MediAssist AI — Complete Project Info

## 🏗️ How You Built It

### Step 1 — Project Structure
Created the project folder structure with `backend/`, `frontend/`, and configuration files.

### Step 2 — Backend (FastAPI)
Built a REST API using **FastAPI** with an `/api/chat` endpoint that receives conversation history and returns structured JSON responses.

### Step 3 — Single Agent → Multi-Agent
Started with a single LLM call and later upgraded the system into a **6-agent architecture** managed by a central orchestrator.

### Step 4 — Frontend
Built a responsive chat interface with:

- Interactive Body Map
- Symptom Timeline
- Confidence Bars
- Agent Status Indicator
- Emergency SOS
- PDF Export
- Multi-language Support

---

# 🧰 Tech Stack

| Layer | Technology |
|--------|------------|
| Backend | Python 3.11 |
| API Framework | FastAPI |
| ASGI Server | Uvicorn |
| AI Provider | Mistral AI (`mistral-small-latest`) |
| Frontend | HTML + CSS + Vanilla JavaScript |
| PDF Generation | jsPDF (CDN) |
| Geolocation | Browser Geolocation API |

---

# 📦 Python Packages

```txt
fastapi==0.115.0        # Web framework
uvicorn==0.30.6         # ASGI server
python-dotenv==1.2.2    # Load environment variables
openai==1.51.0          # OpenAI/xAI SDK (fallback)
pydantic==2.9.2         # Data validation
httpx==0.27.2           # HTTP client
google-generativeai     # Google Gemini SDK
google-genai            # New Gemini SDK
mistralai               # Mistral AI SDK
```

---

# 🤖 Multi-Agent Architecture

The system consists of **6 AI agents** coordinated by a single orchestrator.

| Agent | File | Responsibility |
|--------|------|----------------|
| Triage Agent | `agents/triage.py` | Detect emergency situations |
| Symptom Analyzer | `agents/symptom_analyzer.py` | Extract symptoms and medical entities |
| Diagnosis Agent | `agents/diagnosis.py` | Suggest possible conditions |
| Treatment Agent | `agents/treatment.py` | Recommend home care and OTC medication |
| Doctor Referral Agent | `agents/referral.py` | Determine urgency and specialist |
| Report Agent | `agents/report.py` | Generate final structured JSON report |
| Orchestrator | `orchestrator.py` | Controls the entire workflow |

---

# 🔄 Multi-Agent Workflow

```
User Input
     │
     ▼
┌─────────────────────┐
│ 1. Triage Agent     │
└──────────┬──────────┘
           │
           ├── Emergency?
           │
     Yes ──┴────────────► Report Agent
           │
          No
           │
           ▼
┌─────────────────────┐
│ 2. Symptom Analyzer │
└──────────┬──────────┘
           ▼
┌─────────────────────┐
│ 3. Diagnosis Agent  │
└──────────┬──────────┘
           ▼
┌─────────────────────┐
│ 4. Treatment Agent  │
└──────────┬──────────┘
           ▼
┌─────────────────────┐
│5. Referral Agent    │
└──────────┬──────────┘
           ▼
┌─────────────────────┐
│ 6. Report Agent     │
└──────────┬──────────┘
           ▼
 Final Structured JSON
```

---

# 🌟 Features

| Feature | Implementation |
|----------|----------------|
| Multi-Agent Pipeline | Python + Custom Orchestrator |
| Structured JSON Output | Mistral JSON Mode |
| Interactive Body Map | SVG + JavaScript |
| Symptom Timeline | JavaScript DOM Tracking |
| Confidence Bars | CSS Animated Progress Bars |
| Agent Status Indicator | JavaScript Animation |
| Emergency SOS | Browser Geolocation + Google Maps |
| Multi-language Support | Native Mistral Multilingual |
| PDF Export | jsPDF Library |
| Static File Serving | FastAPI StaticFiles |

---

# 📁 Project Structure

```text
symtomchecker/
├── .env                    # API keys (never commit)
├── .env.example            # Environment template
├── requirements.txt
├── run.sh
├── README.md
│
├── backend/
│   ├── __init__.py
│   ├── main.py
│   ├── llm.py
│   ├── system_prompt.py
│   ├── orchestrator.py
│   │
│   └── agents/
│       ├── __init__.py
│       ├── prompts.py
│       ├── triage.py
│       ├── symptom_analyzer.py
│       ├── diagnosis.py
│       ├── treatment.py
│       ├── referral.py
│       └── report.py
│
└── frontend/
    ├── index.html
    ├── style.css
    └── script.js
```

---

# 🔑 Environment Variables

```env
LLM_PROVIDER=mistral

MISTRAL_API_KEY=...

OPENAI_API_KEY=...

XAI_API_KEY=...

GEMINI_API_KEY=...

MODEL_NAME=mistral-small-latest

PORT=8000
```

---

# 🚀 Installation

## 1. Clone the Repository

```bash
git clone https://github.com/yourusername/mediassist-ai.git
cd mediassist-ai
```

## 2. Install Dependencies

```bash
pip install -r requirements.txt
```

## 3. Set Python Path

### Windows

```bash
set PYTHONPATH=.
```

### Linux / macOS

```bash
export PYTHONPATH=.
```

## 4. Configure Environment

Create a `.env` file:

```env
LLM_PROVIDER=mistral
MISTRAL_API_KEY=YOUR_API_KEY
MODEL_NAME=mistral-small-latest
PORT=8000
```

## 5. Run the Application

```bash
uvicorn backend.main:app --host 0.0.0.0 --port 8000 --reload
```

## 6. Open in Browser

```
http://localhost:8000
```

---

# 🎯 Project Summary

**MediAssist AI** is a multi-agent AI-powered medical symptom checker built using **FastAPI**, **Mistral AI**, and **Vanilla JavaScript**. The system employs six specialised AI agents coordinated by an orchestrator to analyse symptoms, assess emergencies, suggest possible conditions, recommend treatments, determine referral urgency, and generate structured medical reports. The application also features an interactive body map, symptom timeline, confidence indicators, multilingual support, emergency SOS functionality, and PDF report generation, providing an intuitive and informative healthcare assistance experience.