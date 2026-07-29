from ..llm import call_llm_with_prompt
from .prompts import SYMPTOM_ANALYZER_PROMPT


def run(messages: list) -> dict:
    return call_llm_with_prompt(SYMPTOM_ANALYZER_PROMPT, messages)
