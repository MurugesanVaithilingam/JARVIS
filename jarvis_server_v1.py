"""
===================================================================
J.A.R.V.I.S. V1 — FASTAPI BACKEND SERVER WITH WEBSOCKET
===================================================================
Runs on http://localhost:8000
Endpoints:
  - GET  /api/status : Health check and OS system status
  - POST /api/command: Execute JSON command via REST
  - WS   /ws/voice   : Real-time 24/7 bidirectional WebSocket stream
===================================================================
"""

import sys
import os
import logging
import asyncio
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from core.orchestrator import JarvisOrchestrator
from core.voice_engine import VoiceEngine

# Logging configuration
logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(name)s: %(message)s")
logger = logging.getLogger("JarvisServerV1")

app = FastAPI(title="JARVIS 2.0 V1 Backend Server", version="1.0.0")

# Enable CORS for frontend connection
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

orchestrator = JarvisOrchestrator()
voice_engine = VoiceEngine()

class CommandPayload(BaseModel):
    command: str
    user: str = "Tony Stark"

@app.on_event("startup")
async def startup_event():
    logger.info("⚡ J.A.R.V.I.S. V1 FastAPI Backend Initialized on http://localhost:8000")

@app.get("/api/status")
async def get_status():
    import psutil
    return {
        "status": "ONLINE",
        "system": "J.A.R.V.I.S. V1 AI Operating System",
        "platform": sys.platform,
        "cpu_usage": f"{psutil.cpu_percent()}%",
        "memory_usage": f"{psutil.virtual_memory().percent}%",
        "websocket": "ws://localhost:8000/ws/voice"
    }

@app.post("/api/command")
async def execute_command(payload: CommandPayload):
    result = await orchestrator.process_command(payload.command)
    voice_engine.speak(result.get("response", ""))
    return {"status": "success", "data": result}

@app.websocket("/ws/voice")
async def websocket_voice_endpoint(websocket: WebSocket):
    await websocket.accept()
    logger.info("Client connected to JARVIS WebSocket Live Voice Channel")

    try:
        await websocket.send_json({
            "event": "connected",
            "message": "J.A.R.V.I.S. V1 Voice Stream Connected — Naan Thayaar, Boss!"
        })

        while True:
            data = await websocket.receive_text()
            logger.info(f"WebSocket Received: {data}")
            
            result = await orchestrator.process_command(data)
            response_text = result.get("response", "Command executed.")

            # Trigger TTS Audio Feedback
            voice_engine.speak(response_text)

            await websocket.send_json({
                "event": "response",
                "command": data,
                "intent": result.get("intent", "GENERAL"),
                "reply": response_text,
                "result": result
            })

    except WebSocketDisconnect:
        logger.info("Client disconnected from WebSocket channel.")
    except Exception as e:
        logger.error(f"WebSocket error: {e}")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("jarvis_server_v1:app", host="0.0.0.0", port=8000, reload=True)
