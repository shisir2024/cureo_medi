from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
import uvicorn
import os
from .orchestrator import run_pipeline
from .agents import learn_agent, quiz_agent
from .database import init_db
from .routers import auth_routes, doctor_routes, consult_routes

app = FastAPI(title="Cureo", version="2.0.0")
init_db()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class Message(BaseModel):
    role: str
    content: str


class ChatRequest(BaseModel):
    messages: List[Message] = Field(..., description="Conversation history")


class ChatResponse(BaseModel):
    summary: str
    detectedSymptoms: List[str]
    possibleConditions: List[Dict[str, str]]
    severity: str
    followUpQuestions: List[str]
    homeCare: List[str]
    seeDoctor: str
    emergency: bool
    warningSigns: List[str]
    disclaimer: str
    visualizations: Optional[Dict[str, Any]] = None
    affectedBodyParts: Optional[List[str]] = None


@app.post("/api/chat", response_model=ChatResponse)
async def chat(request: ChatRequest):
    if not request.messages:
        raise HTTPException(status_code=400, detail="messages list cannot be empty")

    # Convert to OpenAI format
    openai_messages = [{"role": m.role, "content": m.content} for m in request.messages]

    try:
        result = run_pipeline(openai_messages)
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/health")
async def health():
    return {"status": "ok", "service": "Cureo"}

app.include_router(auth_routes.router)
app.include_router(doctor_routes.router)
app.include_router(consult_routes.router)


class LearnRequest(BaseModel):
    topic: str


@app.post("/api/learn")
async def learn(request: LearnRequest):
    if not request.topic.strip():
        raise HTTPException(status_code=400, detail="topic cannot be empty")
    try:
        return learn_agent.run(request.topic)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/quiz")
async def quiz(request: LearnRequest):
    if not request.topic.strip():
        raise HTTPException(status_code=400, detail="topic cannot be empty")
    try:
        return quiz_agent.run(request.topic)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# Serve frontend — must be mounted AFTER all API routes
app.mount("/", StaticFiles(directory="frontend", html=True), name="frontend")

if __name__ == "__main__":
    port = int(os.getenv("PORT", 8000))
    uvicorn.run("backend.main:app", host="0.0.0.0", port=port, reload=True)