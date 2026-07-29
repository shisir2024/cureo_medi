from ..llm import call_llm_with_prompt
from .prompts import TRIAGE_PROMPT


def run(messages: list) -> dict:
    result = call_llm_with_prompt(TRIAGE_PROMPT, messages)
    return result
