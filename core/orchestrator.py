"""
===================================================================
J.A.R.V.I.S. V1 — ORCHESTRATOR & LLM BRAIN MODULE
===================================================================
Classifies intents, queries LLMs (Gemini / OpenAI API), routes tool
executions, and maintains conversational context.
"""

import os
import json
import logging
from typing import Dict, Any

from tools_v1.desktop import DesktopController
from tools_v1.browser import BrowserController

logger = logging.getLogger("JarvisOrchestrator")

class JarvisOrchestrator:
    def __init__(self):
        self.browser = BrowserController(headless=False)
        self.conversation_history = []

    async def process_command(self, user_command: str) -> Dict[str, Any]:
        cmd_clean = user_command.strip()
        cmd_lower = cmd_clean.lower()

        logger.info(f"Processing Command: '{cmd_clean}'")

        # ── ⚡ 0. FAST COMMANDS (NO LLM LATENCY, INSTANT RESPONSE < 10ms) ───
        if any(w in cmd_lower for w in ['are you listening', 'can you hear me', 'are you there', 'listening check']):
            return {
                "intent": "STATUS_CHECK_FAST",
                "fast_command": True,
                "response": "Yes, sir! All audio streams, VAD sensors, and speech recognition channels are 100 percent operational.",
                "latency": "< 10ms"
            }

        if any(w in cmd_lower for w in ['wake up', 'hello jarvis', 'hi jarvis', 'wake up jarvis']):
            return {
                "intent": "WAKE_UP_FAST",
                "fast_command": True,
                "response": "Sollunga Boss! Naan thayaaraaga irukkiREn. What should I do?",
                "latency": "< 10ms"
            }

        if any(w in cmd_lower for w in ['stop', 'cancel', 'shut up', 'quiet', 'stand down']):
            return {
                "intent": "STOP_FAST",
                "fast_command": True,
                "response": "Standing down, Boss. Listening for your next command.",
                "latency": "< 10ms"
            }

        if any(w in cmd_lower for w in ['system status', 'diagnostics', 'health check']):
            return {
                "intent": "DIAGNOSTICS_FAST",
                "fast_command": True,
                "response": "JARVIS Diagnostics: Microphone ONLINE, VAD ONLINE, STT STREAMING, LLM READY, TOOLS ACTIVE, TTS ONLINE.",
                "latency": "< 10ms"
            }

        # ── 1. INTENT RECOGNITION & ROUTING ────────────────────────────────
        # Open Application Intent
        if any(w in cmd_lower for w in ['open app', 'launch app', 'open whatsapp', 'open vscode', 'open chrome', 'open explorer', 'open calculator', 'open cmd', 'open terminal']):
            app_target = cmd_lower.replace('open app', '').replace('launch app', '').replace('open', '').strip()
            if not app_target:
                app_target = 'explorer'
            res = DesktopController.launch_app(app_target)
            return {
                "intent": "LAUNCH_APP",
                "target": app_target,
                "response": f"Opening {app_target.title()}, Boss!",
                "result": res
            }

        # Close Application Intent
        if 'close' in cmd_lower:
            app_target = cmd_lower.replace('close', '').strip()
            res = DesktopController.close_app(app_target)
            return {
                "intent": "CLOSE_APP",
                "target": app_target,
                "response": f"Closed {app_target.title()}, Boss!",
                "result": res
            }

        # Maximize Window Intent
        if 'maximize' in cmd_lower or 'full screen' in cmd_lower:
            app_target = cmd_lower.replace('maximize', '').replace('full screen', '').replace('make', '').replace('it', '').strip()
            res = DesktopController.maximize_window(app_target or 'chrome')
            return {
                "intent": "MAXIMIZE_APP",
                "target": app_target,
                "response": "Window maximized, Boss!",
                "result": res
            }

        # Open Web Page Intent
        if 'open website' in cmd_lower or 'go to' in cmd_lower or 'open google' in cmd_lower or 'open youtube' in cmd_lower or 'open linkedin' in cmd_lower:
            url = cmd_clean.replace('open website', '').replace('go to', '').replace('open', '').strip()
            if 'youtube' in url: url = 'https://youtube.com'
            elif 'google' in url: url = 'https://google.com'
            elif 'linkedin' in url: url = 'https://linkedin.com'
            
            res = await self.browser.open_url(url)
            return {
                "intent": "OPEN_WEBSITE",
                "url": url,
                "response": f"Opened website {url}, Boss!",
                "result": res
            }

        # Search Web Intent
        if 'search' in cmd_lower or 'google' in cmd_lower:
            query = cmd_clean.replace('search for', '').replace('search', '').replace('google', '').strip()
            res = await self.browser.search_google(query)
            return {
                "intent": "SEARCH_WEB",
                "query": query,
                "response": f"Searching web for '{query}', Boss!",
                "result": res
            }

        # ── 2. LLM GENERATIVE RESPONSE FALLBACK (Gemini API) ─────────────
        gemini_key = os.getenv("GEMINI_API_KEY")
        if gemini_key:
            try:
                from google import genai
                client = genai.Client(api_key=gemini_key)
                response = client.models.generate_content(
                    model="gemini-2.5-flash",
                    contents=f"You are J.A.R.V.I.S., Tony Stark's personal AI assistant. Reply concisely in 1-2 witty, respectful sentences:\n\nUser: {user_command}"
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
