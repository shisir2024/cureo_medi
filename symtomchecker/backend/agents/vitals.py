from ..llm import call_llm_with_prompt
from .prompts import VITALS_PROMPT

def run(messages: list) -> dict:
    return call_llm_with_prompt(VITALS_PROMPT, messages)
