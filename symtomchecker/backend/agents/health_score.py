from ..llm import call_llm_with_prompt
from .prompts import HEALTH_SCORE_PROMPT

def run(messages: list, symptom_data: dict) -> dict:
    enriched = messages + [{"role": "user", "content": f"Symptoms: {symptom_data}"}]
    return call_llm_with_prompt(HEALTH_SCORE_PROMPT, enriched)
