"""AI Copilot — role-aware, context-rich intelligence assistant for KSP.

The copilot layer sits between the FastAPI route (``copilot.py``) and the
underlying AI orchestrator.  It enriches every request with:

- **Role-based system prompts** tailored to the user's rank/scope
- **Crime-data context** (dashboard metrics, recent FIRs, hotspot summaries)
- **Conversation memory** (sessions, message history)
- **Mode routing** (FIR search, stats, pattern analysis, etc.)

Usage::

    from backend.ai.copilot import CopilotService

    svc = CopilotService()
    response = svc.chat(
        messages=[{"role": "user", "content": "What are today's crime trends?"}],
        user_role="SP",
        mode="statistical",
    )
"""

from .service import CopilotService
from .strategies import RoleStrategy, ROLE_STRATEGIES, SYSTEM_PROMPTS, build_system_prompt, get_strategy
from .context import ContextBuilder

__all__ = [
    "CopilotService",
    "RoleStrategy",
    "ROLE_STRATEGIES",
    "SYSTEM_PROMPTS",
    "ContextBuilder",
    "build_system_prompt",
    "get_strategy",
]
