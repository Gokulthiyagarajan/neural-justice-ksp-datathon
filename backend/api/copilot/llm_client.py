"""LLM client for Drishti Copilot general chat.

Uses NVIDIA NIM API for free-form conversation while maintaining
context from conversation history. Falls back to rule-based responses
if API is unavailable.

Usage::

    from backend.api.copilot.llm_client import generate_chat_response
    
    response = await generate_chat_response(
        user_message="Hello, how are you?",
        history=[{"role": "user", "content": "Hi"}],
    )
"""

from __future__ import annotations

import asyncio
import logging
import os
from typing import Any

import httpx

logger = logging.getLogger("nj.copilot.llm")

# ── Constants ──────────────────────────────────────────────────────────────

NIM_BASE_URL = "https://integrate.api.nvidia.com/v1/chat/completions"
DEFAULT_TIMEOUT = 45.0  # seconds
MAX_RETRIES = 2
INITIAL_BACKOFF = 1.0  # seconds
BACKOFF_MULTIPLIER = 2.0
RETRYABLE_STATUS_CODES = {429, 503}

# Drishti Copilot system prompt - grounded in crime data platform
SYSTEM_PROMPT = """You are Drishti, the AI assistant for Bengaluru's police intelligence platform. You help officers analyze crime data, understand patterns, and make informed decisions.

**Core Guidelines:**
- Be helpful, conversational, and professional
- When asked about crime data, suggest specific queries like "show crime trends" or "find suspect [name]"
- You can discuss general topics but always relate back to law enforcement when relevant
- You speak English or Kannada based on the user's language
- Keep responses concise but informative
- You have access to FIR records, accused persons, victims, police stations, and crime statistics

**Platform Capabilities:**
- Crime trend analysis
- Suspect/victim lookup
- Station performance metrics
- Risk assessment
- Crime hotspot identification
- Officer assignment tracking

**When users ask about crime data:**
- Guide them to use specific queries
- Explain what data is available
- Help them understand the platform's features

**When users chat generally:**
- Be friendly and conversational
- Gently remind them of your capabilities
- Offer to help with crime analysis tasks"""


# ── Exceptions ─────────────────────────────────────────────────────────────


class LLMError(Exception):
    """Raised when LLM API call fails after all retries."""
    pass


# ── Client ─────────────────────────────────────────────────────────────────


async def generate_chat_response(
    user_message: str,
    history: list[dict[str, str]] | None = None,
    api_key: str | None = None,
    model: str = "meta/llama-3.1-8b-instruct",
) -> str:
    """Generate a conversational response using NIM API.
    
    Args:
        user_message: Current user message
        history: Previous conversation messages [{"role": "user"|"assistant", "content": "..."}]
        api_key: NVIDIA API key (falls back to env)
        model: Model to use for generation
    
    Returns:
        Generated response text
    
    Raises:
        LLMError: If API call fails after retries
    """
    api_key = api_key or os.getenv("NVIDIA_API_KEY", "")
    if not api_key:
        logger.warning("No NVIDIA API key available, using fallback response")
        return _fallback_response(user_message)
    
    # Build messages with system prompt and history
    messages = [{"role": "system", "content": SYSTEM_PROMPT}]
    
    # Add conversation history (last 10 messages)
    if history:
        messages.extend(history[-10:])
    
    # Add current user message
    messages.append({"role": "user", "content": user_message})
    
    # Call NIM API with retry
    last_error = None
    backoff = INITIAL_BACKOFF
    
    for attempt in range(MAX_RETRIES + 1):
        try:
            async with httpx.AsyncClient(timeout=DEFAULT_TIMEOUT) as client:
                response = await client.post(
                    NIM_BASE_URL,
                    headers={
                        "Authorization": f"Bearer {api_key}",
                        "Content-Type": "application/json",
                    },
                    json={
                        "model": model,
                        "messages": messages,
                        "temperature": 0.7,
                        "max_tokens": 500,
                    },
                )
                
                if response.status_code in RETRYABLE_STATUS_CODES:
                    if attempt < MAX_RETRIES:
                        logger.warning(
                            "NIM API rate limited (attempt %d/%d), retrying in %.1fs",
                            attempt + 1, MAX_RETRIES + 1, backoff
                        )
                        await asyncio.sleep(backoff)
                        backoff *= BACKOFF_MULTIPLIER
                        continue
                    else:
                        raise LLMError(f"NIM API rate limited after {MAX_RETRIES + 1} attempts")
                
                if response.status_code != 200:
                    error_text = response.text[:200]
                    raise LLMError(f"NIM API error {response.status_code}: {error_text}")
                
                data = response.json()
                content = data["choices"][0]["message"]["content"]
                
                # Log usage
                usage = data.get("usage", {})
                logger.info(
                    "LLM response generated: %d tokens (prompt: %d, completion: %d)",
                    usage.get("total_tokens", 0),
                    usage.get("prompt_tokens", 0),
                    usage.get("completion_tokens", 0),
                )
                
                return content.strip()
                
        except httpx.TimeoutException as e:
            last_error = e
            if attempt < MAX_RETRIES:
                logger.warning("NIM API timeout (attempt %d/%d), retrying", attempt + 1, MAX_RETRIES + 1)
                await asyncio.sleep(backoff)
                backoff *= BACKOFF_MULTIPLIER
                continue
        except httpx.HTTPError as e:
            last_error = e
            if attempt < MAX_RETRIES:
                logger.warning("NIM API HTTP error (attempt %d/%d): %s", attempt + 1, MAX_RETRIES + 1, str(e)[:100])
                await asyncio.sleep(backoff)
                backoff *= BACKOFF_MULTIPLIER
                continue
    
    # All retries failed - use fallback
    logger.error("NIM API failed after %d attempts: %s", MAX_RETRIES + 1, str(last_error))
    return _fallback_response(user_message)


def _fallback_response(user_message: str) -> str:
    """Generate a rule-based fallback response when LLM is unavailable."""
    lower_msg = user_message.lower()
    
    # Greetings
    if any(word in lower_msg for word in ["hello", "hi", "hey", "namaskara", "ನಮಸ್ಕಾರ"]):
        return (
            "Hello! I'm Drishti, your AI assistant for the police intelligence platform. "
            "I can help you analyze crime data, find suspects, check station performance, "
            "and more. What would you like to do?"
        )
    
    # Help
    if any(word in lower_msg for word in ["help", "what can you do", "capabilities"]):
        return (
            "I can help you with:\n\n"
            "- **Crime Trends**: Show patterns and statistics\n"
            "- **Suspect Lookup**: Find accused persons\n"
            "- **Hotspots**: Identify high-crime areas\n"
            "- **Station Performance**: Check police station metrics\n"
            "- **Risk Assessment**: Evaluate suspect risk levels\n\n"
            "Try asking something like 'Show crime trends in Bengaluru' or 'Find suspect John Doe'."
        )
    
    # Default
    return (
        "I'm Drishti, your AI assistant for the Bengaluru police intelligence platform. "
        "I can help you analyze crime data, find suspects, and understand crime patterns. "
        "What would you like to know about?"
    )


async def generate_grounding_suggestion(
    user_message: str,
    api_key: str | None = None,
) -> str | None:
    """Generate a suggestion to ground the user's query in platform data.
    
    Used when the user sends a general message to guide them toward
    specific crime data queries.
    """
    api_key = api_key or os.getenv("NVIDIA_API_KEY", "")
    if not api_key:
        return "Try asking about crime trends, suspects, or station performance!"
    
    messages = [
        {"role": "system", "content": SYSTEM_PROMPT},
        {"role": "user", "content": user_message},
        {"role": "assistant", "content": "I understand you're asking about something general. Let me suggest some specific queries I can help with based on the crime data available:"},
    ]
    
    try:
        async with httpx.AsyncClient(timeout=15.0) as client:
            response = await client.post(
                NIM_BASE_URL,
                headers={
                    "Authorization": f"Bearer {api_key}",
                    "Content-Type": "application/json",
                },
                    json={
                        "model": "meta/llama-3.1-8b-instruct",
                        "messages": messages,
                        "temperature": 0.5,
                        "max_tokens": 150,
                    },
            )
            
            if response.status_code == 200:
                data = response.json()
                return data["choices"][0]["message"]["content"].strip()
    except Exception as e:
        logger.warning("Failed to generate grounding suggestion: %s", str(e)[:100])
    
    return "Try asking about crime trends, suspects, or station performance!"
