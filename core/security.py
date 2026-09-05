"""
JARVIS security core — authentication, encryption, access control,
data retention, and user permissions.

Voice, tools, and every phase must pass through this layer before
an action is executed.
"""

from __future__ import annotations

import base64
import hashlib
import hmac
import json
import logging
import os
import re
import secrets
import time
from dataclasses import dataclass
from typing import Any, Dict, Optional, Tuple

from cryptography.fernet import Fernet, InvalidToken
from cryptography.hazmat.primitives import hashes
from cryptography.hazmat.primitives.kdf.pbkdf2 import PBKDF2HMAC

logger = logging.getLogger("JarvisSecurity")

LEVEL_READ = 1
LEVEL_APPS = 2
LEVEL_FILES = 3
LEVEL_COMMS = 4
LEVEL_IOT = 5
LEVEL_ROBOTICS = 6

LEVEL_NAMES = {
    1: "READ",
    2: "APP_CONTROL",
    3: "FILES_CODE",
    4: "MESSAGING_CALLS",
    5: "IOT_SMART_HOME",
    6: "ROBOTICS_DRONE",
}

TOOL_LEVELS: Dict[str, int] = {
    "search_memory": LEVEL_READ,
    "get_device_status": LEVEL_READ,
    "fetch_todays_calendar": LEVEL_READ,
    "fetch_unread_emails": LEVEL_READ,
    "list_workspace_files": LEVEL_READ,
    "read_workspace_file": LEVEL_READ,
    "analyze_current_screen": LEVEL_READ,
    "database_query_assistant": LEVEL_READ,
    "pandas_data_analysis": LEVEL_READ,
    "computer_vision_scan": LEVEL_READ,
    "write_workspace_file": LEVEL_FILES,
    "execute_system_command": LEVEL_FILES,
    "control_smart_device": LEVEL_IOT,
    "iot_smart_home_control": LEVEL_IOT,
    "send_whatsapp_message": LEVEL_COMMS,
    "robot_command": LEVEL_ROBOTICS,
    "drone_command": LEVEL_ROBOTICS,
    "robot_telemetry_check": LEVEL_READ,
    "drone_battery_check": LEVEL_READ,
}

SESSION_TTL_SEC = 60 * 60 * 24
CONFIRM_TTL_SEC = 60
_pending: Dict[str, Dict[str, Any]] = {}
_last_pending_by_principal: Dict[str, str] = {}


def _env(name: str, default: str = "") -> str:
    return (os.getenv(name, default) or "").strip()


def access_token() -> str:
    return _env("JARVIS_ACCESS_TOKEN")


def admin_user() -> str:
    return _env("JARVIS_ADMIN_USER", "tonystark")


def admin_pin() -> str:
    return _env("JARVIS_ADMIN_PIN")


def default_clearance() -> int:
    try:
        return max(1, min(6, int(_env("JARVIS_DEFAULT_CLEARANCE", "2"))))
    except ValueError:
        return 2


def max_clearance() -> int:
    try:
        return max(1, min(6, int(_env("JARVIS_MAX_CLEARANCE", "6"))))
    except ValueError:
        return 6


def retention_days() -> int:
    try:
        return max(1, int(_env("JARVIS_RETENTION_DAYS", "30")))
    except ValueError:
        return 30


def _secret_bytes() -> bytes:
    token = access_token()
    if not token:
        token = "jarvis-unconfigured-secret"
    return token.encode("utf-8")


def _fernet() -> Fernet:
    key_material = _env("JARVIS_ENCRYPTION_KEY") or access_token()
    kdf = PBKDF2HMAC(
        algorithm=hashes.SHA256(),
        length=32,
        salt=b"jarvis-retention-v1",
        iterations=120_000,
    )
    raw = kdf.derive(key_material.encode("utf-8") if key_material else _secret_bytes())
    return Fernet(base64.urlsafe_b64encode(raw))


def encrypt_text(plain: str) -> str:
    if plain is None:
        return ""
    try:
        return "JENC:" + _fernet().encrypt(plain.encode("utf-8")).decode("ascii")
    except Exception as exc:
        logger.warning("Encrypt failed: %s", exc)
        return plain


def decrypt_text(value: str) -> str:
    if not value:
        return ""
    if not value.startswith("JENC:"):
        return value
    try:
        return _fernet().decrypt(value[5:].encode("ascii")).decode("utf-8")
    except (InvalidToken, Exception):
        return "[encrypted]"


def hash_pin(pin: str) -> str:
    return hashlib.sha256((pin or "").encode("utf-8")).hexdigest()


def issue_session(username: str, clearance: int) -> str:
    body = {
        "u": username,
        "c": max(1, min(max_clearance(), int(clearance))),
        "exp": int(time.time()) + SESSION_TTL_SEC,
        "n": secrets.token_hex(8),
    }
    raw = base64.urlsafe_b64encode(json.dumps(body, separators=(",", ":")).encode()).decode()
    sig = hmac.new(_secret_bytes(), raw.encode(), hashlib.sha256).hexdigest()
    return f"{raw}.{sig}"


def verify_session(token: str) -> Optional[Dict[str, Any]]:
    if not token or "." not in token:
        return None
    raw, sig = token.rsplit(".", 1)
    expected = hmac.new(_secret_bytes(), raw.encode(), hashlib.sha256).hexdigest()
    if not hmac.compare_digest(sig, expected):
        return None
    try:
        body = json.loads(base64.urlsafe_b64decode(raw.encode()))
    except Exception:
        return None
    if int(body.get("exp", 0)) < int(time.time()):
        return None
    body["c"] = max(1, min(max_clearance(), int(body.get("c", 1))))
    return body


@dataclass
class Principal:
    authenticated: bool
    username: str
    clearance: int
    source: str

    @property
    def id(self) -> str:
        return f"{self.source}:{self.username}"


ANONYMOUS = Principal(False, "anonymous", 0, "none")


def authenticate(
    header_token: Optional[str] = None,
    bearer: Optional[str] = None,
    query_token: Optional[str] = None,
    requested_clearance: Optional[int] = None,
) -> Principal:
    """
    Accept either a signed session token or the master access token.
    Client-requested clearance cannot exceed the principal's max.
    """
    master = access_token()
    candidates = [bearer, header_token, query_token]
    for cand in candidates:
        if not cand:
            continue
        session = verify_session(cand)
        if session:
            cap = min(int(session["c"]), max_clearance())
            if requested_clearance is not None:
                cap = min(cap, max(1, int(requested_clearance)))
            return Principal(True, str(session.get("u", "user")), cap, "session")
        if master and hmac.compare_digest(cand, master):
            cap = min(default_clearance(), max_clearance())
            if requested_clearance is not None:
                cap = min(cap, max(1, int(requested_clearance)))
            return Principal(True, admin_user(), cap, "master")
    return ANONYMOUS


def login_with_pin(username: str, pin: str) -> Tuple[bool, Dict[str, Any]]:
    expected_user = admin_user().lower()
    expected_pin = admin_pin()
    if not expected_pin:
        return False, {"message": "Server PIN is not configured (JARVIS_ADMIN_PIN)."}
    user_ok = hmac.compare_digest((username or "").strip().lower(), expected_user)
    pin_ok = hmac.compare_digest(pin or "", expected_pin)
    if not (user_ok and pin_ok):
        return False, {"message": "Invalid username or PIN."}
    clearance = min(default_clearance(), max_clearance())
    session = issue_session(admin_user(), clearance)
    return True, {
        "username": admin_user(),
        "clearance": clearance,
        "role": "Administrator",
        "session": session,
        "retention_days": retention_days(),
    }


def classify_command(text: str) -> Tuple[int, bool, str]:
    """Return (required_level, needs_confirmation, reason)."""
    t = (text or "").lower()

    if re.search(r"\b(yes|confirm|authorize|proceed|சரி)\b", t) and len(t.split()) <= 4:
        return LEVEL_READ, False, "confirmation"

    if re.search(r"drone battery|drone status|robot status|robot telemetry|lidar", t):
        return LEVEL_READ, False, "telemetry"
    if re.search(r"arm weapons|takeoff|return to home|\brth\b|motor", t) or re.search(
        r"\b(drone|robot)\b.*(move|fly|arm|land)", t
    ):
        return LEVEL_ROBOTICS, True, "robotics_drone"
    if re.search(r"unlock door|lock door|living room light|thermostat|mqtt|esp32", t) or re.search(
        r"(turn on|turn off).*(light|fan|ac|plug)", t
    ):
        return LEVEL_IOT, True, "iot"
    if re.search(r"\b(open|launch|close|maximize|minimize|fullscreen)\b", t):
        return LEVEL_APPS, False, "desktop"
    if re.search(r"send |message |call |email |sms ", t) or re.search(r"whatsapp.*hi|hi.*whatsapp", t):
        return LEVEL_COMMS, True, "comms"
    if re.search(r"delete|drop database|format |shutdown|restart pc|rm -|write file|create file|terminal command", t):
        return LEVEL_FILES, True, "destructive_or_files"
    if re.search(r"\b(open|launch|close|maximize|minimize|fullscreen|chrome|vscode|explorer)\b", t):
        return LEVEL_APPS, False, "desktop"
    if re.search(r"search |google |linkedin|youtube|browser|website", t):
        return LEVEL_APPS, False, "browser"
    return LEVEL_READ, False, "read"


def tool_required_level(tool_name: str) -> int:
    return TOOL_LEVELS.get(tool_name, LEVEL_FILES)


def needs_tool_confirmation(tool_name: str) -> bool:
    return tool_required_level(tool_name) >= LEVEL_COMMS or tool_name in {
        "execute_system_command",
        "write_workspace_file",
        "control_smart_device",
    }


SHELL_DENY = [
    re.compile(p, re.I)
    for p in (
        r"rm\s+-rf\s+[\\/]",
        r"format\s+[a-z]:",
        r"del\s+/[fs]",
        r"mkfs",
        r"diskpart",
        r":\(\)\s*\{",
        r"reg\s+delete",
        r"rd\s+/s",
        r"cipher\s+/w",
    )
]


def shell_command_allowed(command: str) -> Tuple[bool, str]:
    cmd = command or ""
    for pat in SHELL_DENY:
        if pat.search(cmd):
            return False, "This shell command is blocked by the security policy."
    return True, ""


def evaluate_action(
    principal: Principal,
    text: str,
    *,
    confirmed: bool = False,
    pending_id: Optional[str] = None,
) -> Dict[str, Any]:
    if not principal.authenticated or principal.clearance < 1:
        return {
            "allowed": False,
            "status": "UNAUTHENTICATED",
            "reply": "Access denied, sir. Authenticate before issuing voice or tool commands.",
            "required_level": 1,
        }

    if pending_id:
        item = _pending.get(pending_id)
        if not item or item["exp"] < time.time():
            _pending.pop(pending_id, None)
            return {
                "allowed": False,
                "status": "EXPIRED",
                "reply": "The confirmation window expired. Please repeat the command.",
                "required_level": 1,
            }
        if item["principal"] != principal.id:
            return {
                "allowed": False,
                "status": "DENIED",
                "reply": "That pending action belongs to another session.",
                "required_level": item["level"],
            }
        if confirmed:
            _pending.pop(pending_id, None)
            return {
                "allowed": True,
                "status": "OK",
                "command": item["command"],
                "required_level": item["level"],
                "pending_id": None,
            }
        _pending.pop(pending_id, None)
        return {
            "allowed": False,
            "status": "CANCELLED",
            "reply": "Cancelled, sir.",
            "required_level": item["level"],
        }

    # Voice "yes" against last pending for this principal
    compact = (text or "").strip().lower()
    last_id = _last_pending_by_principal.get(principal.id)
    if last_id and compact in {"yes", "confirm", "authorize", "proceed", "ok", "சரி"}:
        return evaluate_action(principal, text, confirmed=True, pending_id=last_id)
    if last_id and compact in {"no", "deny", "cancel", "abort", "stop", "வேண்டாம்"}:
        return evaluate_action(principal, text, confirmed=False, pending_id=last_id)

    level, needs_confirm, reason = classify_command(text)
    if principal.clearance < level:
        return {
            "allowed": False,
            "status": "DENIED",
            "reply": (
                f"Access denied. That action requires clearance level {level} "
                f"({LEVEL_NAMES[level]}). Your clearance is level {principal.clearance}."
            ),
            "required_level": level,
            "reason": reason,
        }

    if needs_confirm and not confirmed:
        pid = secrets.token_hex(8)
        _pending[pid] = {
            "command": text,
            "level": level,
            "principal": principal.id,
            "exp": time.time() + CONFIRM_TTL_SEC,
        }
        _last_pending_by_principal[principal.id] = pid
        return {
            "allowed": False,
            "status": "CONFIRM",
            "reply": (
                f"This is a level {level} action ({LEVEL_NAMES[level]}). "
                "Say yes to authorize, or no to abort."
            ),
            "required_level": level,
            "pending_id": pid,
            "requires_confirmation": True,
            "command": text,
            "reason": reason,
        }

    return {
        "allowed": True,
        "status": "OK",
        "required_level": level,
        "reason": reason,
        "pending_id": None,
    }


def authorize_tool(principal: Principal, tool_name: str) -> Tuple[bool, str]:
    if not principal.authenticated:
        return False, "Unauthenticated."
    need = tool_required_level(tool_name)
    if principal.clearance < need:
        return (
            False,
            f"Tool '{tool_name}' requires level {need}; your clearance is {principal.clearance}.",
        )
    return True, ""


def audit_event(principal: Principal, action: str, result: str, extra: str = "") -> Dict[str, Any]:
    return {
        "timestamp": int(time.time()),
        "user": principal.username,
        "clearance": principal.clearance,
        "action": action,
        "result": result,
        "detail": extra[:500],
    }
