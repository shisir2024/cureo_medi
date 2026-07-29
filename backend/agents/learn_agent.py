from ..llm import call_llm_with_prompt
from .prompts import LEARN_PROMPT

def run(topic: str) -> dict:
    messages = [{"role": "user", "content": f"Explain this medical topic for NEET/MBBS students: {topic}"}]
    return call_llm_with_prompt(LEARN_PROMPT, messages)
