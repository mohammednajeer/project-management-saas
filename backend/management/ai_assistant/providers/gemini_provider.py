import json
import logging
import os
import re
from urllib.parse import quote

import requests


DEFAULT_MODEL = "gemini-2.0-flash"
API_BASE_URL = "https://generativelanguage.googleapis.com/v1beta"
logger = logging.getLogger(__name__)


class GeminiProviderError(Exception):
    """Raised when Gemini is unavailable or returns an unusable response."""


def is_gemini_configured():
    return bool(os.getenv("GEMINI_API_KEY"))


def compact_json(payload, max_chars=12000):
    text = json.dumps(payload, default=str, sort_keys=True)
    if len(text) <= max_chars:
        return text
    return f"{text[:max_chars]}\n...[truncated]"


def _model_name(model=None):
    return model or os.getenv("GEMINI_MODEL") or DEFAULT_MODEL


def _endpoint(model_name):
    model_name = quote(model_name, safe="")
    return f"{API_BASE_URL}/models/{model_name}:generateContent"


def _response_error_message(response):
    try:
        response_data = response.json()
    except ValueError:
        return response.text[:1000] if response.text else response.reason

    if not isinstance(response_data, dict):
        return compact_json(response_data, max_chars=1000)

    error = response_data.get("error")
    if isinstance(error, dict):
        return error.get("message") or compact_json(error, max_chars=1000)
    return compact_json(response_data, max_chars=1000)


def _extract_text(response_data):
    candidates = response_data.get("candidates") or []
    if not candidates:
        raise GeminiProviderError("Gemini returned no candidates.")

    content = candidates[0].get("content") or {}
    parts = content.get("parts") or []
    text = "".join(part.get("text", "") for part in parts).strip()
    if not text:
        raise GeminiProviderError("Gemini returned an empty text response.")
    return text


def generate_text(
    prompt,
    *,
    system_instruction=None,
    temperature=0.2,
    max_output_tokens=900,
    model=None,
    timeout=12,
    response_mime_type=None,
):
    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key:
        message = "GEMINI_API_KEY is not configured."
        logger.error("Gemini request failed: %s", message)
        raise GeminiProviderError(message)

    model_name = _model_name(model)

    payload = {
        "contents": [
            {
                "role": "user",
                "parts": [{"text": prompt}],
            }
        ],
        "generationConfig": {
            "temperature": temperature,
            "maxOutputTokens": max_output_tokens,
        },
    }

    if response_mime_type:
        payload["generationConfig"]["responseMimeType"] = response_mime_type

    if system_instruction:
        payload["systemInstruction"] = {
            "parts": [{"text": system_instruction}],
        }

    logger.warning("Gemini model: %s", model_name)
    logger.warning("Gemini request sent: %s", compact_json(payload, max_chars=4000))

    try:
        response = requests.post(
            _endpoint(model_name),
            params={"key": api_key},
            headers={"Content-Type": "application/json"},
            json=payload,
            timeout=timeout,
        )
        logger.warning(
            "Gemini response status code: %s",
            response.status_code,
        )
        response.raise_for_status()
    except requests.RequestException as exc:
        if getattr(exc, "response", None) is not None:
            message = _response_error_message(exc.response)
        elif "response" in locals():
            message = _response_error_message(response)
        else:
            message = str(exc)
        logger.error("Gemini error message: %s", message)
        raise GeminiProviderError(message) from exc

    try:
        response_data = response.json()
    except (ValueError, TypeError, KeyError) as exc:
        message = "Gemini returned invalid JSON."
        logger.error("Gemini error message: %s", message)
        raise GeminiProviderError(message) from exc

    try:
        return _extract_text(response_data)
    except GeminiProviderError as exc:
        logger.error("Gemini error message: %s", exc)
        raise


def generate_json(
    prompt,
    *,
    system_instruction=None,
    temperature=0.2,
    max_output_tokens=1200,
    model=None,
    timeout=12,
):
    text = generate_text(
        prompt,
        system_instruction=system_instruction,
        temperature=temperature,
        max_output_tokens=max_output_tokens,
        model=model,
        timeout=timeout,
        response_mime_type="application/json",
    )

    try:
        return json.loads(text)
    except json.JSONDecodeError:
        match = re.search(r"\{.*\}", text, re.DOTALL)
        if not match:
            message = "Gemini JSON response could not be parsed."
            logger.error("Gemini error message: %s", message)
            raise GeminiProviderError(message)
        try:
            return json.loads(match.group(0))
        except json.JSONDecodeError as exc:
            message = "Gemini JSON response could not be parsed."
            logger.error("Gemini error message: %s", message)
            raise GeminiProviderError(message) from exc
