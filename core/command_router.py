"""JARVIS V1 — Unified command router: fast path → orchestrator → LLM fallback."""

from __future__ import annotations

import asyncio
import logging
import time
from typing import Any, Dict

from core.fast_commands import try_fast_command
from core.logger import log_audit
from core.orchestrator import JarvisOrchestrator
from core.security import Principal, evaluate_action

logger = logging.getLogger("JarvisCommandRouter")

_orchestrator: JarvisOrchestrator | None = None


def get_orchestrator() -> JarvisOrchestrator:
    global _orchestrator
    if _orchestrator is None:
        _orchestrator = JarvisOrchestrator()
    return _orchestrator


async def route_command(
    user_text: str,
    principal: Principal | None = None,
    *,
    confirmed: bool = False,
    pending_id: str | None = None,
) -> Dict[str, Any]:
    """
    Process a voice/text command and ALWAYS return a structured response.
    Never returns empty — guarantees a reply for the voice pipeline.
    """
    started = time.perf_counter()
    text = (user_text or "").strip()

    if not text:
        return _pack("EMPTY", "I did not catch that, sir. Please repeat.", False, started)

    if principal is None:
        from core.security import ANONYMOUS

        principal = ANONYMOUS

    decision = evaluate_action(principal, text, confirmed=confirmed, pending_id=pending_id)
    if decision.get("status") == "CONFIRM":
        log_audit(principal.username, principal.clearance, text, "CONFIRM", decision.get("reason", ""))
        return _pack(
            "SECURITY_CONFIRM",
            decision.get("reply", "Confirmation required."),
            True,
            started,
            extra={
                "requires_confirmation": True,
                "pending_id": decision.get("pending_id"),
                "required_level": decision.get("required_level"),
            },
        )
    if not decision.get("allowed"):
        log_audit(principal.username, principal.clearance, text, decision.get("status", "DENIED"))
        return _pack(
            "ACCESS_DENIED",
            decision.get("reply", "Access denied."),
            True,
            started,
            extra={"required_level": decision.get("required_level")},
        )

    text = decision.get("command") or text

    # 1. Fast command path (<20ms target)
    handled, response, intent = try_fast_command(text)
    if handled:
        return _pack(intent, response, True, started)

    # 2. Orchestrator (pattern + Gemini)
    try:
        orch = get_orchestrator()
        result = await orch.process_command(text)
        reply = result.get("response") or "Command executed, sir."
        return _pack(
            result.get("intent", "ORCHESTRATOR"),
            reply,
            bool(result.get("fast_command")),
            started,
            extra=result,
        )
    except Exception as exc:
        logger.exception("Orchestrator error: %s", exc)

    # 3. Guaranteed fallback — never silent
    return _pack(
        "FALLBACK",
        f"Command received, sir: '{text[:80]}'. Local systems remain online.",
        False,
        started,
    )


def _pack(intent: str, response: str, fast: bool, started: float, extra: dict | None = None) -> Dict[str, Any]:
    elapsed_ms = round((time.perf_counter() - started) * 1000, 1)
    out = {
        "status": "denied" if intent == "ACCESS_DENIED" else "success",
        "intent": intent,
        "response": response,
        "reply": response,
        "fast_command": fast,
        "latency_ms": elapsed_ms,
        "requires_confirmation": bool(extra and extra.get("requires_confirmation")),
        "requires_followup": bool(extra and extra.get("requires_followup")),
        "pending_id": (extra or {}).get("pending_id"),
        "required_level": (extra or {}).get("required_level"),
    }
    if extra:
        out["result"] = extra
    return out


def route_command_sync(user_text: str) -> Dict[str, Any]:
    """Sync wrapper for non-async callers."""
    return asyncio.run(route_command(user_text))
