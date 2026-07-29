import json
from ..llm import call_llm_with_prompt
from .prompts import REPORT_PROMPT


def run(all_agent_outputs: dict) -> dict:
    messages = [{"role": "user", "content": f"Agent outputs: {json.dumps(all_agent_outputs)}"}]
    return call_llm_with_prompt(REPORT_PROMPT, messages)
