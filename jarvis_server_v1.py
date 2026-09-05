"""
===================================================================
J.A.R.V.I.S. V1 — FASTAPI VOICE SERVER (Stable Pipeline)
===================================================================
Endpoints:
  GET  /api/status          Health + voice state
  POST /api/auth/login      PIN session
  POST /api/voice/command   REST voice command (always returns reply)
  WS   /ws/voice            Real-time bidirectional voice stream
===================================================================
"""

import json
import logging
import sys
from typing import Optional

from fastapi import FastAPI, Header, HTTPException, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from core.command_router import route_command
from core.logger import init_db, log_audit, log_interaction, purge_expired_logs
from core.phase_engine import (
    run_analytics,
    run_browser,
    run_comms,
    run_database,
    run_iot,
    run_robotics,
    run_vision,
)
from core.security import Principal, authenticate, evaluate_action, login_with_pin, retention_days
from tools.comms_agent import list_contacts
from core.voice_state import VoiceState, VoiceStateMachine

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)
logger = logging.getLogger("JarvisServerV1")

app = FastAPI(title="JARVIS V1 Voice Server", version="1.2.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

voice_fsm = VoiceStateMachine()


class CommandPayload(BaseModel):
    command: str
    user: str = "Sir"
    confirmed: bool = False
    pending_id: Optional[str] = None


class LoginPayload(BaseModel):
    username: str
    pin: str


class PhasePayload(BaseModel):
    module: str
    action: str = ""
    target: str = ""
    engine: str = "sqlite"
    confirmed: bool = False
    pending_id: Optional[str] = None


class VoiceReply(BaseModel):
    status: str
    reply: str
    intent: str
    fast_command: bool = False
    latency_ms: float = 0
    voice_state: str = "IDLE"
    requires_confirmation: bool = False
    pending_id: Optional[str] = None
    required_level: Optional[int] = None


def _bearer(authorization: Optional[str]) -> Optional[str]:
    if not authorization:
        return None
    if authorization.lower().startswith("bearer "):
        return authorization[7:].strip()
    return authorization.strip()


def principal_from_http(
    x_jarvis_token: Optional[str],
    authorization: Optional[str],
    x_jarvis_clearance: Optional[str],
) -> Principal:
    requested = None
    if x_jarvis_clearance:
        try:
            requested = int(x_jarvis_clearance)
        except ValueError:
            requested = None
    return authenticate(
        header_token=x_jarvis_token,
        bearer=_bearer(authorization),
        requested_clearance=requested,
    )


def require_principal(principal: Principal) -> Principal:
    if not principal.authenticated:
        raise HTTPException(status_code=401, detail="Authentication required.")
    return principal


@app.on_event("startup")
async def startup_event():
    init_db()
    purge_expired_logs()
    voice_fsm.set(VoiceState.LISTENING)
    logger.info("JARVIS V1 Voice Server online — http://localhost:8000")


@app.get("/api/status")
async def get_status():
    import psutil

    return {
        "status": "ONLINE",
        "system": "J.A.R.V.I.S. V1 Voice Operating Layer",
        "platform": sys.platform,
        "cpu_usage": psutil.cpu_percent(interval=None),
        "memory_usage": psutil.virtual_memory().percent,
        "voice": voice_fsm.snapshot(),
        "websocket": "ws://localhost:8000/ws/voice",
        "desktop_daemon": "http://localhost:8765",
        "retention_days": retention_days(),
        "auth_required": True,
    }


@app.post("/api/auth/login")
async def auth_login(payload: LoginPayload):
    ok, data = login_with_pin(payload.username, payload.pin)
    if not ok:
        raise HTTPException(status_code=401, detail=data.get("message", "Login failed"))
    return {"status": "success", "authenticated": True, "user": data}


@app.get("/api/contacts")
async def contacts_directory(
    x_jarvis_token: Optional[str] = Header(None),
    authorization: Optional[str] = Header(None),
    x_jarvis_clearance: Optional[str] = Header(None),
):
    require_principal(principal_from_http(x_jarvis_token, authorization, x_jarvis_clearance))
    return {"status": "success", "contacts": list_contacts()}


@app.post("/api/security/purge")
async def purge_memory(
    x_jarvis_token: Optional[str] = Header(None),
    authorization: Optional[str] = Header(None),
    x_jarvis_clearance: Optional[str] = Header(None),
):
    principal = require_principal(
        principal_from_http(x_jarvis_token, authorization, x_jarvis_clearance)
    )
    if principal.clearance < 3:
        raise HTTPException(status_code=403, detail="Clearance 3 required to purge retention stores.")
    from core.logger import purge_all_logs

    purge_all_logs()
    log_audit(principal.username, principal.clearance, "PURGE", "OK")
    return {"status": "purged", "retention_days": retention_days()}


@app.post("/api/phase")
async def run_phase_module(
    payload: PhasePayload,
    x_jarvis_token: Optional[str] = Header(None),
    authorization: Optional[str] = Header(None),
    x_jarvis_clearance: Optional[str] = Header(None),
):
    principal = require_principal(
        principal_from_http(x_jarvis_token, authorization, x_jarvis_clearance)
    )
    spoken = f"{payload.module} {payload.action} {payload.target}".strip()
    decision = evaluate_action(
        principal, spoken, confirmed=payload.confirmed, pending_id=payload.pending_id
    )
    if decision.get("status") == "CONFIRM":
        return {
            "status": "confirm",
            "reply": decision.get("reply"),
            "requires_confirmation": True,
            "pending_id": decision.get("pending_id"),
            "required_level": decision.get("required_level"),
        }
    if not decision.get("allowed"):
        raise HTTPException(status_code=403, detail=decision.get("reply", "Denied"))

    module = payload.module.lower()
    if module == "browser":
        result = await run_browser(payload.action or "open", payload.target)
    elif module == "database":
        result = run_database(payload.target or payload.action, payload.engine)
    elif module == "analytics":
        result = run_analytics(payload.target, payload.action or "pandas")
    elif module == "vision":
        result = run_vision(payload.action or "auto")
    elif module == "iot":
        result = run_iot(payload.target or payload.action)
    elif module in {"comms", "whatsapp"}:
        result = await run_comms(payload.target or "Rahul", payload.action or "Hi")
    elif module in {"robot", "robotics", "drone"}:
        result = run_robotics("drone" if module == "drone" or payload.action == "drone" else "robot")
    else:
        raise HTTPException(status_code=400, detail="Unknown phase module.")

    reply = result.get("response", "Done.")
    log_audit(principal.username, principal.clearance, spoken, result.get("intent", "PHASE"), reply)
    return {"status": "success", "reply": reply, "intent": result.get("intent"), "result": result.get("result")}


@app.post("/api/voice/command", response_model=VoiceReply)
async def voice_command(
    payload: CommandPayload,
    x_jarvis_token: Optional[str] = Header(None),
    authorization: Optional[str] = Header(None),
    x_jarvis_clearance: Optional[str] = Header(None),
):
    principal = require_principal(
        principal_from_http(x_jarvis_token, authorization, x_jarvis_clearance)
    )
    return await _process_and_log(
        payload.command,
        principal,
        confirmed=payload.confirmed,
        pending_id=payload.pending_id,
    )


@app.post("/api/command")
async def execute_command(
    payload: CommandPayload,
    x_jarvis_token: Optional[str] = Header(None),
    authorization: Optional[str] = Header(None),
    x_jarvis_clearance: Optional[str] = Header(None),
):
    principal = require_principal(
        principal_from_http(x_jarvis_token, authorization, x_jarvis_clearance)
    )
    result = await _process_and_log(
        payload.command,
        principal,
        confirmed=payload.confirmed,
        pending_id=payload.pending_id,
    )
    return {"status": result.get("status", "success"), "data": result}


async def _process_and_log(
    text: str,
    principal: Principal,
    *,
    confirmed: bool = False,
    pending_id: Optional[str] = None,
) -> dict:
    voice_fsm.set(VoiceState.PROCESSING)
    log_interaction("USER", text)

    try:
        result = await route_command(
            text, principal, confirmed=confirmed, pending_id=pending_id
        )
        reply = result.get("reply") or result.get("response") or "At your service, sir."
        log_interaction("JARVIS", reply)
        log_audit(principal.username, principal.clearance, text, result.get("intent", ""))
        voice_fsm.set(VoiceState.LISTENING)
        return {
            "status": result.get("status", "success"),
            "reply": reply,
            "response": reply,
            "intent": result.get("intent", "UNKNOWN"),
            "fast_command": result.get("fast_command", False),
            "latency_ms": result.get("latency_ms", 0),
            "voice_state": voice_fsm.current.value,
            "requires_confirmation": bool(result.get("requires_confirmation")),
            "requires_followup": bool(result.get("requires_followup")),
            "pending_id": result.get("pending_id"),
            "required_level": result.get("required_level"),
        }
    except Exception as exc:
        logger.exception("Command processing failed: %s", exc)
        fallback = "I encountered a system error, sir, but I am still listening."
        log_interaction("JARVIS", fallback)
        voice_fsm.set(VoiceState.ERROR)
        voice_fsm.set(VoiceState.LISTENING)
        return {
            "status": "error",
            "reply": fallback,
            "response": fallback,
            "intent": "ERROR",
            "fast_command": False,
            "latency_ms": 0,
            "voice_state": voice_fsm.current.value,
            "requires_confirmation": False,
            "pending_id": None,
            "required_level": None,
        }


@app.websocket("/ws/voice")
async def websocket_voice_endpoint(websocket: WebSocket):
    await websocket.accept()
    query_token = websocket.query_params.get("token")
    principal = authenticate(query_token=query_token, bearer=query_token)
    if not principal.authenticated:
        await websocket.send_json(
            {
                "event": "error",
                "reply": "Voice channel denied. Authenticate first.",
                "intent": "ACCESS_DENIED",
            }
        )
        await websocket.close(code=4401)
        return

    client_state = VoiceStateMachine()
    client_state.set(VoiceState.LISTENING)
    logger.info("Voice WebSocket client connected as %s L%s", principal.username, principal.clearance)

    try:
        await websocket.send_json(
            {
                "event": "connected",
                "message": "JARVIS voice channel online. I am listening, sir.",
                "voice_state": client_state.current.value,
                "clearance": principal.clearance,
            }
        )

        while True:
            raw = await websocket.receive_text()
            confirmed = False
            pending_id = None
            text = raw
            try:
                parsed = json.loads(raw)
                if isinstance(parsed, dict) and "command" in parsed:
                    text = parsed.get("command") or ""
                    confirmed = bool(parsed.get("confirmed"))
                    pending_id = parsed.get("pending_id")
            except json.JSONDecodeError:
                text = raw

            if not str(text).strip():
                await websocket.send_json(
                    {"event": "response", "reply": "I did not catch that, sir.", "intent": "EMPTY"}
                )
                continue

            logger.info("WS command: %s", str(text)[:120])
            client_state.set(VoiceState.PROCESSING)

            result = await _process_and_log(
                str(text), principal, confirmed=confirmed, pending_id=pending_id
            )
            reply = result.get("reply", "At your service, sir.")

            client_state.set(VoiceState.SPEAKING)
            await websocket.send_json(
                {
                    "event": "response",
                    "command": text,
                    "reply": reply,
                    "response": reply,
                    "intent": result.get("intent"),
                    "fast_command": result.get("fast_command"),
                    "latency_ms": result.get("latency_ms"),
                    "voice_state": client_state.current.value,
                    "requires_confirmation": result.get("requires_confirmation"),
                    "pending_id": result.get("pending_id"),
                    "required_level": result.get("required_level"),
                }
            )
            client_state.set(VoiceState.LISTENING)

    except WebSocketDisconnect:
        logger.info("Voice WebSocket client disconnected")
    except Exception as exc:
        logger.error("WebSocket error: %s", exc)
        try:
            await websocket.send_json(
                {"event": "error", "reply": "Voice link interrupted, sir. Reconnecting recommended."}
            )
        except Exception:
            pass


if __name__ == "__main__":
    import uvicorn

    uvicorn.run("jarvis_server_v1:app", host="0.0.0.0", port=8000, reload=False)
