import os
import json
from typing import List, Dict, Any
from dotenv import load_dotenv


def _call(system_prompt: str, messages: List[Dict[str, str]]) -> Dict[str, Any]:
    load_dotenv(override=True)
    provider = os.getenv("LLM_PROVIDER", "mistral").lower()
    model = os.getenv("MODEL_NAME", "mistral-small-latest")
    full_messages = [{"role": "system", "content": system_prompt}, *messages]

    if provider == "mistral":
        import httpx
        headers = {"Authorization": f"Bearer {os.getenv('MISTRAL_API_KEY')}", "Content-Type": "application/json"}
        payload = {"model": model, "messages": full_messages, "temperature": 0.3, "max_tokens": 1024, "response_format": {"type": "json_object"}}
        r = httpx.post("https://api.mistral.ai/v1/chat/completions", json=payload, headers=headers, timeout=30)
        r.raise_for_status()
        raw = r.json()["choices"][0]["message"]["content"]

    elif provider == "gemini":
        from google import genai
        from google.genai import types
        client = genai.Client(api_key=os.getenv("GEMINI_API_KEY"))
        contents = [
            types.Content(role="user" if m["role"] == "user" else "model", parts=[types.Part(text=m["content"])])
            for m in messages
        ]
        response = client.models.generate_content(
            model=model,
            contents=contents,
            config=types.GenerateContentConfig(
                system_instruction=system_prompt,
                response_mime_type="application/json",
                max_output_tokens=1024,
            ),
        )
        raw = response.text

    else:
        from openai import OpenAI
        if provider in ("xai", "grok"):
            client = OpenAI(api_key=os.getenv("XAI_API_KEY"), base_url="https://api.x.ai/v1")
        else:
            client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))
        response = client.chat.completions.create(
            model=model,
            messages=full_messages,
            temperature=0.3,
            response_format={"type": "json_object"},
            max_tokens=1024,
            timeout=30,
        )
        raw = response.choices[0].message.content

    try:
        return json.loads(raw)
    except json.JSONDecodeError:
        return {}


def call_llm(messages: List[Dict[str, str]]) -> Dict[str, Any]:
    from .system_prompt import SYSTEM_PROMPT
    return _call(SYSTEM_PROMPT, messages)


def call_llm_with_prompt(system_prompt: str, messages: List[Dict[str, str]]) -> Dict[str, Any]:
    return _call(system_prompt, messages)
