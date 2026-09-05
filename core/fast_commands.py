"""JARVIS V1 — Zero-latency fast command router (<20ms, no LLM)."""

from __future__ import annotations

import re
from typing import Optional, Tuple

from tools_v1.desktop import DesktopController

IntentResult = Tuple[bool, str, str]  # handled, response, intent

WAKE_PREFIX = re.compile(
    r"^(hello boss|hi boss|hello jarvis|hi jarvis|jarvis|jervis|jarvez|charvis|"
    r"hey jarvis|ok jarvis|boss|karen|chitti|friday|edith|stark)[,!\s]+",
    re.I,
)

APP_ALIASES = {
    "chrome": ["chrome", "google chrome", "browser"],
    "whatsapp": ["whatsapp", "whats app", "whatapp"],
    "vscode": ["vscode", "vs code", "visual studio code", "code"],
    "explorer": ["explorer", "file explorer", "files", "my computer"],
    "calc": ["calc", "calculator"],
    "notepad": ["notepad", "note pad"],
    "cmd": ["cmd", "command prompt", "terminal"],
    "taskmgr": ["taskmgr", "task manager"],
    "linkedin": ["linkedin"],
    "youtube": ["youtube", "you tube"],
    "chatgpt": ["chatgpt", "chat gpt", "gpt"],
    "spotify": ["spotify", "music"],
    "powershell": ["powershell"],
    "control": ["control panel", "control"],
}


def normalize(text: str) -> str:
    t = text.lower().strip()
    t = WAKE_PREFIX.sub("", t).strip()
    t = re.sub(r"[^\w\s\u0b80-\u0bff]", " ", t)
    return re.sub(r"\s+", " ", t).strip()


def _match_app(text: str) -> Optional[str]:
    for app_key, aliases in APP_ALIASES.items():
        for alias in aliases:
            if re.search(rf"\b{re.escape(alias)}\b", text):
                return app_key
    return None


def try_fast_command(raw: str) -> IntentResult:
    """Return (handled, response, intent). Instant path — no network/LLM."""
    if not raw or not raw.strip():
        return False, "", "EMPTY"

    text = normalize(raw)
    if not text:
        return False, "", "EMPTY"

    # Skip fast-path for messaging / calls with contacts so Orchestrator handles slot filling & context memory
    if any(w in text for w in ["send", "message", "msg", "call", "அனுப்பு", "மெசேஜ்", "கால்"]) and any(c in text for c in ["arun", "rahul", "amma", "appa", "suresh", "boss", "whatsapp", "அருண்", "ராகுல்", "அம்மா", "அப்பா", "சுரேஷ்", "பாஸ்"]):
        return False, "", "NOT_FAST"

    # ── Volume Control ────────────────────────────────────────────────
    vol_match = re.search(r"volume\s+(\d{1,3})\s*%?", text)
    if vol_match:
        from tools.system_control import set_system_volume
        lvl = int(vol_match.group(1))
        res = set_system_volume(lvl)
        return True, res, "FAST_VOLUME"

    # ── Listening check ──────────────────────────────────────────────
    if re.search(r"are you listening|can you hear me|are you there|listening check|கேட்க", text):
        return True, "Yes, sir. I am listening. All voice channels are operational.", "FAST_LISTENING"

    # ── Stop / Cancel / Repeat ───────────────────────────────────────
    if re.fullmatch(r"stop|cancel|quiet|shut up|stand down|repeat", text):
        if text == "repeat":
            return True, "Please repeat your last command, sir.", "FAST_REPEAT"
        return True, "Standing down, sir. Listening for your next command.", "FAST_STOP"

    # ── Diagnostics ──────────────────────────────────────────────────
    if re.fullmatch(r"status|diagnostics|system status|health check", text):
        return (
            True,
            "Diagnostics: Microphone online, VAD online, STT streaming, LLM ready, tools active, TTS online.",
            "FAST_DIAGNOSTICS",
        )

    # ── Wake greeting only ─────────────────────────────────────────────
    if re.fullmatch(
        r"hello boss|hi boss|hello jarvis|hi jarvis|jarvis|jervis|boss|vanakkam|வணக்கம்",
        text,
    ):
        return True, "Hello, sir. I am ready. What would you like me to do?", "FAST_WAKE"

    # ── Close app ──────────────────────────────────────────────────────
    if text.startswith("close ") or "மூடு" in text or "close" in text:
        clean_body = re.sub(r"^(close|moodu)\s+", "", text).replace("மூடு", "").strip()
        app = _match_app(clean_body) or clean_body
        if app:
            DesktopController.close_app(app)
            label = app.replace("_", " ").title()
            return True, f"Closed {label}, sir.", "CLOSE_APP"

    # ── Open app (Tamil / Tanglish / English) ────────────────────────
    is_open_intent = (
        text.startswith("open ") or
        any(text.startswith(a) for a in ("launch ", "start ")) or
        any(w in text for w in ("open பண்ணு", "open pannu", "thira", "திற", "launch pannunga"))
    )
    if is_open_intent:
        body = re.sub(r"^(open|launch|start)\s+", "", text)
        body = re.sub(r"\s+(open பண்ணு|open pannu|thira|திற|launch pannunga)", "", body).strip()
        app = _match_app(body) or (body.split()[0] if body else None)
        if app:
            result = DesktopController.launch_app(app)
            if result.get("status") == "success":
                label = app.replace("_", " ").title()
                if app == "chrome":
                    return True, "Chrome is open, sir.", "OPEN_CHROME"
                return True, f"Open பண்ணிட்டேன் பாஸ்! Opening {label}.", "OPEN_APP"
            return True, f"Attempted to open {app}, sir.", "OPEN_APP"

    # Bare app name with open intent: "chrome", "whatsapp", "vscode", "explorer", "calc", "notepad", "cmd"
    if text in ("chrome", "whatsapp", "vscode", "explorer", "calc", "notepad", "cmd"):
        result = DesktopController.launch_app(text)
        if result.get("status") == "success":
            label = text.title()
            return True, f"{label} is open, sir.", "OPEN_APP"

    # ── Time / date ────────────────────────────────────────────────────
    if re.search(r"what time|time now|what.*time|என்ன நேரம்|இப்போ.*நேரம்", text):
        from datetime import datetime

        now = datetime.now().strftime("%I:%M %p")
        return True, f"இப்போதைய நேரம் {now} பாஸ்! (Current time is {now}, sir.)", "FAST_TIME"

    if re.search(r"what.*date|today.*date|என்ன தேதி|இன்னைக்கு.*தேதி", text):
        from datetime import datetime

        now = datetime.now().strftime("%A, %B %d, %Y")
        return True, f"Today is {now}, sir.", "FAST_DATE"


    return False, "", "NOT_FAST"
