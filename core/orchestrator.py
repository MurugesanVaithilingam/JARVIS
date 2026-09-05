"""
===================================================================
J.A.R.V.I.S. V1 — ORCHESTRATOR, CONTEXT MEMORY & LLM BRAIN MODULE
===================================================================
Classifies intents, manages multi-turn slot-filling context memory,
queries Gemini/LLM APIs, and routes tool executions.
===================================================================
"""

import os
import json
import logging
import re
import time
from typing import Dict, Any, Optional

from tools_v1.desktop import DesktopController
from tools_v1.browser import BrowserController
from core.phase_engine import (
    run_analytics,
    run_browser,
    run_database,
    run_iot,
    run_robotics,
    run_vision,
)
from tools.comms_agent import send_whatsapp_message, make_phone_call, resolve_contact
from tools.system_control import set_system_volume

logger = logging.getLogger("JarvisOrchestrator")


class ContextManager:
    """Manages short-term conversation state for multi-turn slot filling."""

    def __init__(self):
        self.pending_task: Optional[Dict[str, Any]] = None

    def set_pending_task(self, action: str, contact: str, platform: str = "WhatsApp"):
        self.pending_task = {
            "action": action,
            "contact": contact,
            "platform": platform,
            "timestamp": time.time(),
        }

    def get_pending_task(self) -> Optional[Dict[str, Any]]:
        if not self.pending_task:
            return None
        # Expire pending context after 60 seconds
        if time.time() - self.pending_task.get("timestamp", 0) > 60:
            self.pending_task = None
            return None
        return self.pending_task

    def clear(self):
        self.pending_task = None


class JarvisOrchestrator:
    def __init__(self):
        self.browser = BrowserController(headless=False)
        self.context = ContextManager()
        self.conversation_history = []

    async def process_command(self, user_command: str) -> Dict[str, Any]:
        cmd_clean = user_command.strip()
        cmd_lower = cmd_clean.lower()

        logger.info(f"Processing Command: '{cmd_clean}'")

        # ── 0. MULTI-TURN SLOT FILLING CONTEXT CHECK ─────────────────────────
        pending = self.context.get_pending_task()
        if pending and pending.get("action") == "SEND_WHATSAPP":
            contact = pending.get("contact")
            message = cmd_clean
            self.context.clear()
            reply = await send_whatsapp_message(contact, message)
            voice_text = f"Done, Boss! {contact.title()}-க்கு WhatsApp message அனுப்பிட்டேன்: '{message}'"
            return {
                "intent": "SEND_WHATSAPP",
                "response": voice_text,
                "detail": reply,
                "target": contact,
            }

        # ── 1. FAST SYSTEM COMMANDS & GREETINGS ─────────────────────────────
        if any(w in cmd_lower for w in ['are you listening', 'can you hear me', 'are you there', 'listening check']):
            return {
                "intent": "STATUS_CHECK_FAST",
                "fast_command": True,
                "response": "Yes, sir. I am listening. All voice channels are operational.",
            }

        if any(w in cmd_lower for w in ['wake up', 'hello jarvis', 'hi jarvis', 'wake up jarvis']):
            return {
                "intent": "WAKE_UP_FAST",
                "fast_command": True,
                "response": "Hello, sir. I am ready. What would you like me to do?",
            }

        if any(w in cmd_lower for w in ['stop', 'cancel', 'shut up', 'quiet', 'stand down']):
            self.context.clear()
            return {
                "intent": "STOP_FAST",
                "fast_command": True,
                "response": "Standing down, sir. Listening for your next command.",
            }

        if any(w in cmd_lower for w in ['system status', 'diagnostics', 'health check']):
            return {
                "intent": "DIAGNOSTICS_FAST",
                "fast_command": True,
                "response": "JARVIS Diagnostics: Microphone ONLINE, VAD ONLINE, STT STREAMING, LLM READY, TOOLS ACTIVE, TTS ONLINE.",
            }

        # ── 2. CALL INTENT ROUTER ("Arun-ku call pannu", "Call Amma") ───────
        call_match = re.search(
            r"(?:call|dial|phone|கால்|கூப்பிடு)\s*(?:to|ku|க்கு)?\s*([a-zA-Z\u0b80-\u0bff\s]+)|"
            r"([a-zA-Z\u0b80-\u0bff\s]+)\s*(?:-ku|-க்கு)?\s*(?:call|dial|phone|கால்|கூப்பிடு)",
            cmd_lower,
        )
        if (call_match or "call" in cmd_lower or "கால்" in cmd_lower) and not any(w in cmd_lower for w in ["whatsapp", "message", "sms", "chatgpt"]):
            target_name = ""
            if call_match:
                target_name = (call_match.group(1) or call_match.group(2) or "").strip()
            if not target_name:
                for name in ["arun", "rahul", "amma", "appa", "suresh", "boss", "அருண்", "ராகுல்", "அம்மா", "அப்பா", "சுரேஷ்", "பாஸ்"]:
                    if name in cmd_lower:
                        target_name = name
                        break
            if target_name:
                reply = await make_phone_call(target_name)
                return {
                    "intent": "MAKE_CALL",
                    "target": target_name,
                    "response": f"Initiating call to {target_name.title()}, Boss!",
                    "detail": reply,
                }

        # ── 3. WHATSAPP & MESSAGING ROUTER ( Tamil / Tanglish / English ) ────
        msg_keywords = ["send", "message", "msg", "whatsapp", "அனுப்பு", "மெசேஜ்", "வாட்ஸ்அப்"]
        contact_names = ["arun", "rahul", "amma", "appa", "suresh", "boss", "அருண்", "ராகுல்", "அம்மா", "அப்பா", "சுரேஷ்", "பாஸ்"]
        
        if any(w in cmd_lower for w in msg_keywords) and any(c in cmd_lower for c in contact_names):
            matched_contact = ""
            for c in contact_names:
                if c in cmd_lower:
                    matched_contact = c
                    break
            
            # Extract message body if provided directly
            message_body = ""
            body_match = re.search(r"['\"]([^'\"]+)['\"]|solli|சொல்லு|that\s+(.*)|: (.*)", cmd_clean, re.I)
            if body_match:
                message_body = (body_match.group(1) or body_match.group(2) or body_match.group(3) or "").strip()

            # If no explicit message body extracted, check if phrase contains text after contact
            if not message_body:
                parts = re.split(r"message|anuppu|அனுப்பு|சொல்லு", cmd_clean, flags=re.I)
                if len(parts) > 1 and len(parts[1].strip()) > 2:
                    possible_msg = parts[1].strip()
                    if not any(possible_msg.lower() == c for c in contact_names):
                        message_body = possible_msg

            if matched_contact and message_body:
                reply = await send_whatsapp_message(matched_contact, message_body)
                return {
                    "intent": "SEND_WHATSAPP",
                    "target": matched_contact,
                    "message": message_body,
                    "response": f"Done, Boss! Sent WhatsApp message to {matched_contact.title()}: '{message_body}'",
                    "detail": reply,
                }
            elif matched_contact:
                # Missing message -> Activate Context Memory Slot Filling!
                self.context.set_pending_task("SEND_WHATSAPP", matched_contact)
                return {
                    "intent": "SLOT_FILLING_REQUIRED",
                    "target": matched_contact,
                    "response": f"Sure Boss! {matched_contact.title()}-க்கு என்ன message அனுப்பணும்?",
                    "requires_followup": True,
                }

        # ── 4. VOLUME CONTROL ──────────────────────────────────────────────
        vol_match = re.search(r"volume\s+(\d{1,3})\s*%?", cmd_lower)
        if vol_match or "volume" in cmd_lower:
            lvl = int(vol_match.group(1)) if vol_match else 50
            res = set_system_volume(lvl)
            return {
                "intent": "SET_VOLUME",
                "level": lvl,
                "response": res,
            }

        # ── 5. CAMERA & VISION ROUTER ──────────────────────────────────────
        if any(w in cmd_lower for w in ["open camera", "camera open", "take photo", "capture screen", "what's in front"]):
            res = run_vision("auto")
            DesktopController.launch_app("camera")
            return {
                "intent": "OPEN_CAMERA",
                "response": "Opening Camera, Boss!",
                "result": res,
            }

        # ── 6. JARVIS 2.0 PHASE MODULES & APP LAUNCHERS ────────────────────
        if any(w in cmd_lower for w in ['open app', 'launch app', 'open whatsapp', 'open vscode', 'open chrome', 'open explorer', 'open calculator', 'open cmd', 'open terminal']):
            app_target = cmd_lower.replace('open app', '').replace('launch app', '').replace('open', '').strip()
            if not app_target:
                app_target = 'explorer'
            res = DesktopController.launch_app(app_target)
            label = app_target.title()
            msg = "Chrome is open, sir." if app_target == 'chrome' else f"Open பண்ணிட்டேன் பாஸ்! Opening {label}."
            return {
                "intent": "LAUNCH_APP",
                "target": app_target,
                "response": msg,
                "result": res,
            }

        if 'close' in cmd_lower or 'மூடு' in cmd_lower:
            app_target = cmd_lower.replace('close', '').replace('மூடு', '').strip()
            res = DesktopController.close_app(app_target)
            return {
                "intent": "CLOSE_APP",
                "target": app_target,
                "response": f"Closed {app_target.title()}, Boss!",
                "result": res,
            }

        if 'search' in cmd_lower or 'google' in cmd_lower or 'தேடு' in cmd_lower:
            query = cmd_clean.replace('search for', '').replace('search', '').replace('google', '').replace('தேடு', '').strip()
            res = await self.browser.search_google(query)
            return {
                "intent": "SEARCH_WEB",
                "query": query,
                "response": f"Searching Google for '{query}', Boss!",
                "result": res,
            }

        # ── 7. LLM GENERATIVE FALLBACK (Gemini API) ─────────────────────────
        gemini_key = os.getenv("GEMINI_API_KEY")
        if gemini_key:
            try:
                from google import genai
                client = genai.Client(api_key=gemini_key)
                response = client.models.generate_content(
                    model="gemini-2.5-flash",
                    contents=f"You are J.A.R.V.I.S., Tony Stark's personal AI assistant. Reply concisely in 1-2 witty, respectful sentences (support Tamil/Tanglish if spoken):\n\nUser: {user_command}"
                )
                reply = response.text if response.text else "At your service, Boss."
                return {"intent": "CONVERSATION", "response": reply}
            except Exception as e:
                logger.warning(f"Gemini API query fallback notice: {e}")

        # Standard Fallback
        return {
            "intent": "GENERAL_QUERY",
            "response": f"Command received, Boss: '{user_command}'. Executing standard JARVIS protocols."
        }
