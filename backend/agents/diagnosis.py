from ..llm import call_llm_with_prompt
from .prompts import DIAGNOSIS_PROMPT


def run(messages: list, symptom_data: dict) -> dict:
    enriched = messages + [{"role": "user", "content": f"Symptom analysis: {symptom_data}"}]
    return call_llm_with_prompt(DIAGNOSIS_PROMPT, enriched)
