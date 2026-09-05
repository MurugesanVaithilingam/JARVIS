"""JARVIS configuration — loaded from environment variables."""

import os
from dotenv import load_dotenv

load_dotenv()

OPENAI_API_KEY = os.getenv("OPENAI_API_KEY", "")
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "")

TELEGRAM_BOT_TOKEN = os.getenv("TELEGRAM_BOT_TOKEN", "")
TELEGRAM_USER_CHAT_ID = os.getenv("TELEGRAM_USER_CHAT_ID", "")

HOME_ASSISTANT_URL = os.getenv("HOME_ASSISTANT_URL", "")
HOME_ASSISTANT_TOKEN = os.getenv("HOME_ASSISTANT_TOKEN", "")

WORKSPACE_DIR = os.getenv("WORKSPACE_DIR", os.path.join(os.getcwd(), "jarvis_workspace"))

def _int_env(name: str, default: int) -> int:
    try:
        return int(os.getenv(name, str(default)) or default)
    except ValueError:
        return default


JARVIS_ACCESS_TOKEN = os.getenv("JARVIS_ACCESS_TOKEN", "")
JARVIS_ENCRYPTION_KEY = os.getenv("JARVIS_ENCRYPTION_KEY", "")
JARVIS_ADMIN_USER = os.getenv("JARVIS_ADMIN_USER", "tonystark")
JARVIS_ADMIN_PIN = os.getenv("JARVIS_ADMIN_PIN", "")
JARVIS_DEFAULT_CLEARANCE = _int_env("JARVIS_DEFAULT_CLEARANCE", 2)
JARVIS_MAX_CLEARANCE = _int_env("JARVIS_MAX_CLEARANCE", 6)
JARVIS_RETENTION_DAYS = _int_env("JARVIS_RETENTION_DAYS", 30)
JARVIS_VOICE_ACCENT = os.getenv("JARVIS_VOICE_ACCENT", "en-GB-RyanNeural")
JARVIS_PERSONALITY_LEVEL = os.getenv("JARVIS_PERSONALITY_LEVEL", "elite")
JARVIS_MAX_SENTENCES = os.getenv("JARVIS_MAX_SENTENCES", "3")

LLM_MODEL = os.getenv("JARVIS_LLM_MODEL", "gpt-4o")
JARVIS_HOST = os.getenv("JARVIS_HOST", "0.0.0.0")
JARVIS_PORT = int(os.getenv("JARVIS_PORT", "8000"))
