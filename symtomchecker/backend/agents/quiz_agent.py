from ..llm import call_llm_with_prompt
from .prompts import QUIZ_PROMPT

def run(topic: str) -> dict:
    messages = [{"role": "user", "content": f"Generate 5 NEET-style MCQ questions on: {topic}"}]
    return call_llm_with_prompt(QUIZ_PROMPT, messages)
