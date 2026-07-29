from ..llm import call_llm_with_prompt
from .prompts import SYMPTOM_WEB_PROMPT

def run(messages: list, symptom_data: dict, diagnosis_data: dict) -> dict:
    enriched = messages + [{"role": "user", "content": f"Symptoms: {symptom_data}\nConditions: {diagnosis_data}"}]
    return call_llm_with_prompt(SYMPTOM_WEB_PROMPT, enriched)
