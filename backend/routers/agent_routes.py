from fastapi import APIRouter
from pydantic import BaseModel
from typing import List, Dict, Any
from ..agents import (
    triage, symptom_analyzer, diagnosis, treatment,
    referral, heatmap, health_score, symptom_web,
    vitals, radar, comparison, report
)
from ..agents import learn_agent, quiz_agent

router = APIRouter(prefix="/api/agent", tags=["agents"])


class MessagesRequest(BaseModel):
    messages: List[Dict[str, str]]


class DiagnosisRequest(BaseModel):
    messages: List[Dict[str, str]]
    symptom_data: Dict[str, Any] = {}


class TreatmentRequest(BaseModel):
    messages: List[Dict[str, str]]
    symptom_data: Dict[str, Any] = {}
    diagnosis_data: Dict[str, Any] = {}


class ReportRequest(BaseModel):
    agent_outputs: Dict[str, Any]


class TopicRequest(BaseModel):
    topic: str


@router.get("/triage")
def info_triage():
    return {"agent": "Triage", "description": "Checks if symptoms are a medical emergency", "endpoint": "/api/agent/triage", "method": "POST"}

@router.post("/triage")
def run_triage(req: MessagesRequest):
    return triage.run(req.messages)


@router.get("/symptom-analyzer")
def info_symptom_analyzer():
    return {"agent": "Symptom Analyzer", "description": "Extracts symptoms and maps them to body parts", "endpoint": "/api/agent/symptom-analyzer", "method": "POST"}

@router.post("/symptom-analyzer")
def run_symptom_analyzer(req: MessagesRequest):
    return symptom_analyzer.run(req.messages)


@router.get("/diagnosis")
def info_diagnosis():
    return {"agent": "Diagnosis", "description": "Suggests possible conditions with likelihood", "endpoint": "/api/agent/diagnosis", "method": "POST"}

@router.post("/diagnosis")
def run_diagnosis(req: DiagnosisRequest):
    return diagnosis.run(req.messages, req.symptom_data)


@router.get("/treatment")
def info_treatment():
    return {"agent": "Treatment", "description": "Recommends home care steps and warning signs", "endpoint": "/api/agent/treatment", "method": "POST"}

@router.post("/treatment")
def run_treatment(req: TreatmentRequest):
    return treatment.run(req.messages, req.symptom_data, req.diagnosis_data)


@router.get("/referral")
def info_referral():
    return {"agent": "Referral", "description": "Decides which specialist to visit and urgency", "endpoint": "/api/agent/referral", "method": "POST"}

@router.post("/referral")
def run_referral(req: TreatmentRequest):
    return referral.run(req.messages, req.symptom_data, req.diagnosis_data)


@router.get("/heatmap")
def info_heatmap():
    return {"agent": "Heatmap", "description": "Assigns pain intensity 1-10 to each body part", "endpoint": "/api/agent/heatmap", "method": "POST"}

@router.post("/heatmap")
def run_heatmap(req: DiagnosisRequest):
    return heatmap.run(req.messages, req.symptom_data)


@router.get("/health-score")
def info_health_score():
    return {"agent": "Health Score", "description": "Calculates a 0-100 wellness score", "endpoint": "/api/agent/health-score", "method": "POST"}

@router.post("/health-score")
def run_health_score(req: DiagnosisRequest):
    return health_score.run(req.messages, req.symptom_data)


@router.get("/symptom-web")
def info_symptom_web():
    return {"agent": "Symptom Web", "description": "Maps connections between symptoms and conditions", "endpoint": "/api/agent/symptom-web", "method": "POST"}

@router.post("/symptom-web")
def run_symptom_web(req: TreatmentRequest):
    return symptom_web.run(req.messages, req.symptom_data, req.diagnosis_data)


@router.get("/vitals")
def info_vitals():
    return {"agent": "Vitals", "description": "Extracts temperature, heart rate, BP, O2 saturation", "endpoint": "/api/agent/vitals", "method": "POST"}

@router.post("/vitals")
def run_vitals(req: MessagesRequest):
    return vitals.run(req.messages)


@router.get("/radar")
def info_radar():
    return {"agent": "Radar", "description": "Scores 5 risk dimensions: Severity, Duration, Symptoms, Emergency, Age", "endpoint": "/api/agent/radar", "method": "POST"}

@router.post("/radar")
def run_radar(req: DiagnosisRequest):
    return radar.run(req.messages, req.symptom_data)


@router.get("/comparison")
def info_comparison():
    return {"agent": "Comparison", "description": "Side-by-side comparison of top conditions", "endpoint": "/api/agent/comparison", "method": "POST"}

@router.post("/comparison")
def run_comparison(req: TreatmentRequest):
    return comparison.run(req.messages, req.symptom_data, req.diagnosis_data)


@router.get("/report")
def info_report():
    return {"agent": "Report", "description": "Assembles all agent outputs into final structured response", "endpoint": "/api/agent/report", "method": "POST"}

@router.post("/report")
def run_report(req: ReportRequest):
    return report.run(req.agent_outputs)


@router.get("/learn")
def info_learn():
    return {"agent": "Learn", "description": "Generates structured medical topic explanation", "endpoint": "/api/agent/learn", "method": "POST"}

@router.post("/learn")
def run_learn(req: TopicRequest):
    return learn_agent.run(req.topic)


@router.get("/quiz")
def info_quiz():
    return {"agent": "Quiz", "description": "Generates MCQ quiz for a medical topic", "endpoint": "/api/agent/quiz", "method": "POST"}

@router.post("/quiz")
def run_quiz(req: TopicRequest):
    return quiz_agent.run(req.topic)
