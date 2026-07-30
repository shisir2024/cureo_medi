from fastapi import APIRouter
from fastapi.responses import HTMLResponse
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


def agent_page(name: str, emoji: str, description: str, endpoint: str, input_label: str = "Describe symptoms", is_topic: bool = False) -> str:
    placeholder = "e.g. I have a headache, fever and sore throat for 2 days" if not is_topic else "e.g. RAAS pathway, Cardiac cycle, DNA replication"
    input_field = f'<input id="inp" placeholder="{placeholder}" style="width:100%;padding:1rem;border-radius:10px;border:1px solid #2d3748;background:#0f172a;color:#e2e8f0;font-size:1rem;outline:none;" />' if is_topic else f'<textarea id="inp" rows="4" placeholder="{placeholder}" style="width:100%;padding:1rem;border-radius:10px;border:1px solid #2d3748;background:#0f172a;color:#e2e8f0;font-size:1rem;outline:none;resize:vertical;"></textarea>'
    body_key = "topic" if is_topic else "messages"
    body_val = 'inp.value' if is_topic else '[{"role":"user","content":inp.value}]'

    return f"""<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1.0"/>
<title>{name} — Cureo Agent</title>
<style>
  *{{box-sizing:border-box;margin:0;padding:0}}
  body{{background:#0a0f1e;color:#e2e8f0;font-family:'Segoe UI',sans-serif;min-height:100vh;display:flex;align-items:center;justify-content:center;padding:2rem}}
  .card{{background:#1e2433;border:1px solid #2d3748;border-radius:20px;padding:2.5rem;max-width:700px;width:100%}}
  .badge{{display:inline-block;background:#1e3a5f;color:#60a5fa;padding:0.3rem 0.9rem;border-radius:2rem;font-size:0.78rem;font-weight:600;margin-bottom:1.2rem}}
  h1{{font-size:1.8rem;font-weight:700;margin-bottom:0.5rem}}
  .desc{{color:#64748b;margin-bottom:1.8rem;font-size:0.95rem}}
  label{{display:block;font-size:0.85rem;color:#94a3b8;margin-bottom:0.5rem;font-weight:500}}
  .btn{{margin-top:1rem;width:100%;padding:0.9rem;background:#3b82f6;color:#fff;border:none;border-radius:10px;font-size:1rem;font-weight:600;cursor:pointer;transition:background 0.2s}}
  .btn:hover{{background:#2563eb}}
  .btn:disabled{{background:#374151;cursor:not-allowed}}
  .result{{margin-top:1.5rem;background:#0f172a;border:1px solid #2d3748;border-radius:12px;padding:1.2rem;display:none}}
  .result-title{{font-size:0.8rem;color:#64748b;margin-bottom:0.8rem;font-weight:600;text-transform:uppercase;letter-spacing:0.05em}}
  pre{{white-space:pre-wrap;word-break:break-word;font-size:0.85rem;color:#a5f3fc;line-height:1.6}}
  .back{{display:inline-block;margin-bottom:1.5rem;color:#64748b;font-size:0.85rem;text-decoration:none}}
  .back:hover{{color:#94a3b8}}
  .spinner{{display:none;text-align:center;padding:1rem;color:#64748b}}
</style>
</head>
<body>
<div class="card">
  <a href="/" class="back">← Back to Cureo</a>
  <div class="badge">Cureo Agent</div>
  <h1>{emoji} {name}</h1>
  <p class="desc">{description}</p>
  <label>{input_label}</label>
  {input_field}
  <button class="btn" id="btn" onclick="run()">▶ Run Agent</button>
  <div class="spinner" id="spinner">⏳ Running agent...</div>
  <div class="result" id="result">
    <div class="result-title">Agent Output</div>
    <pre id="output"></pre>
  </div>
</div>
<script>
async function run() {{
  const inp = document.getElementById('inp');
  const btn = document.getElementById('btn');
  const spinner = document.getElementById('spinner');
  const resultBox = document.getElementById('result');
  const output = document.getElementById('output');
  if (!inp.value.trim()) {{ alert('Please enter something first'); return; }}
  btn.disabled = true;
  spinner.style.display = 'block';
  resultBox.style.display = 'none';
  try {{
    const res = await fetch('{endpoint}', {{
      method: 'POST',
      headers: {{'Content-Type': 'application/json'}},
      body: JSON.stringify({{ {body_key}: {body_val} }})
    }});
    const data = await res.json();
    output.textContent = JSON.stringify(data, null, 2);
    resultBox.style.display = 'block';
  }} catch(e) {{
    output.textContent = 'Error: ' + e.message;
    resultBox.style.display = 'block';
  }} finally {{
    btn.disabled = false;
    spinner.style.display = 'none';
  }}
}}
document.getElementById('inp').addEventListener('keydown', e => {{
  if (e.key === 'Enter' && !e.shiftKey) {{ e.preventDefault(); run(); }}
}});
</script>
</body>
</html>"""


# ── GET pages ──────────────────────────────────────────────────────────────

@router.get("/triage", response_class=HTMLResponse)
def page_triage():
    return agent_page("Triage Agent", "🔍", "Instantly checks if your symptoms indicate a life-threatening emergency.", "/api/agent/triage")

@router.get("/symptom-analyzer", response_class=HTMLResponse)
def page_symptom_analyzer():
    return agent_page("Symptom Analyzer", "🩺", "Extracts all symptoms from your description and maps them to body parts.", "/api/agent/symptom-analyzer")

@router.get("/diagnosis", response_class=HTMLResponse)
def page_diagnosis():
    return agent_page("Diagnosis Agent", "🧬", "Suggests possible medical conditions with High / Medium / Low likelihood.", "/api/agent/diagnosis")

@router.get("/treatment", response_class=HTMLResponse)
def page_treatment():
    return agent_page("Treatment Agent", "💊", "Recommends safe home care steps and warning signs to watch for.", "/api/agent/treatment")

@router.get("/referral", response_class=HTMLResponse)
def page_referral():
    return agent_page("Referral Agent", "🏥", "Decides which specialist you should visit and how urgently.", "/api/agent/referral")

@router.get("/heatmap", response_class=HTMLResponse)
def page_heatmap():
    return agent_page("Heatmap Agent", "🗺️", "Assigns pain intensity score (1–10) to each affected body part.", "/api/agent/heatmap")

@router.get("/health-score", response_class=HTMLResponse)
def page_health_score():
    return agent_page("Health Score Agent", "❤️", "Calculates an overall wellness score from 0 to 100 based on your symptoms.", "/api/agent/health-score")

@router.get("/symptom-web", response_class=HTMLResponse)
def page_symptom_web():
    return agent_page("Symptom Web Agent", "🕸️", "Maps the connections and relationships between your symptoms and conditions.", "/api/agent/symptom-web")

@router.get("/vitals", response_class=HTMLResponse)
def page_vitals():
    return agent_page("Vitals Agent", "🌡️", "Extracts vital signs (temperature, heart rate, BP, O₂) from your description.", "/api/agent/vitals")

@router.get("/radar", response_class=HTMLResponse)
def page_radar():
    return agent_page("Radar Agent", "📡", "Scores 5 risk dimensions: Severity, Duration, Symptom Count, Emergency Risk, Age Risk.", "/api/agent/radar")

@router.get("/comparison", response_class=HTMLResponse)
def page_comparison():
    return agent_page("Comparison Agent", "🔬", "Side-by-side comparison of top conditions with matching and non-matching symptoms.", "/api/agent/comparison")

@router.get("/report", response_class=HTMLResponse)
def page_report():
    return agent_page("Report Agent", "📋", "Assembles all agent outputs into a final structured health report.", "/api/agent/report")

@router.get("/learn", response_class=HTMLResponse)
def page_learn():
    return agent_page("Learn Agent", "🎓", "Generates a structured explanation of any medical topic for MBBS/NEET students.", "/api/agent/learn", input_label="Enter a medical topic", is_topic=True)

@router.get("/quiz", response_class=HTMLResponse)
def page_quiz():
    return agent_page("Quiz Agent", "📝", "Generates an MCQ quiz for any medical topic to test your knowledge.", "/api/agent/quiz", input_label="Enter a medical topic", is_topic=True)


# ── POST endpoints ─────────────────────────────────────────────────────────

@router.post("/triage")
def run_triage(req: MessagesRequest):
    return triage.run(req.messages)

@router.post("/symptom-analyzer")
def run_symptom_analyzer(req: MessagesRequest):
    return symptom_analyzer.run(req.messages)

@router.post("/diagnosis")
def run_diagnosis(req: DiagnosisRequest):
    return diagnosis.run(req.messages, req.symptom_data)

@router.post("/treatment")
def run_treatment(req: TreatmentRequest):
    return treatment.run(req.messages, req.symptom_data, req.diagnosis_data)

@router.post("/referral")
def run_referral(req: TreatmentRequest):
    return referral.run(req.messages, req.symptom_data, req.diagnosis_data)

@router.post("/heatmap")
def run_heatmap(req: DiagnosisRequest):
    return heatmap.run(req.messages, req.symptom_data)

@router.post("/health-score")
def run_health_score(req: DiagnosisRequest):
    return health_score.run(req.messages, req.symptom_data)

@router.post("/symptom-web")
def run_symptom_web(req: TreatmentRequest):
    return symptom_web.run(req.messages, req.symptom_data, req.diagnosis_data)

@router.post("/vitals")
def run_vitals(req: MessagesRequest):
    return vitals.run(req.messages)

@router.post("/radar")
def run_radar(req: DiagnosisRequest):
    return radar.run(req.messages, req.symptom_data)

@router.post("/comparison")
def run_comparison(req: TreatmentRequest):
    return comparison.run(req.messages, req.symptom_data, req.diagnosis_data)

@router.post("/report")
def run_report(req: ReportRequest):
    return report.run(req.agent_outputs)

@router.post("/learn")
def run_learn(req: TopicRequest):
    return learn_agent.run(req.topic)

@router.post("/quiz")
def run_quiz(req: TopicRequest):
    return quiz_agent.run(req.topic)
