"""
JARVIS Core Engine — FastAPI server with ReAct agent, HUD dashboard,
telemetry, security, and persistent command logging.
"""

import os
import sys

import psutil
from dotenv import load_dotenv
from fastapi import Depends, FastAPI, Header, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import HTMLResponse
from pydantic import BaseModel

from core.brain import run_jarvis_brain
from core.cron_agent import initialize_scheduler
from core.logger import fetch_recent_logs, init_db, log_audit, log_interaction, purge_expired_logs
from core.security import authenticate, login_with_pin

load_dotenv()

app = FastAPI(title="JARVIS Core Engine")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

DASHBOARD_PATH = os.path.join(os.path.dirname(__file__), "templates", "dashboard.html")


async def verify_jarvis_principal(
    x_jarvis_token: str = Header(None),
    authorization: str = Header(None),
    x_jarvis_clearance: str = Header(None),
):
    bearer = None
    if authorization and authorization.lower().startswith("bearer "):
        bearer = authorization[7:].strip()
    requested = None
    if x_jarvis_clearance:
        try:
            requested = int(x_jarvis_clearance)
        except ValueError:
            requested = None
    principal = authenticate(
        header_token=x_jarvis_token,
        bearer=bearer,
        requested_clearance=requested,
    )
    if not principal.authenticated:
        raise HTTPException(
            status_code=401,
            detail="ACCESS DENIED: authenticate with a session or JARVIS access token.",
        )
    return principal


class QueryModel(BaseModel):
    prompt: str


class LoginModel(BaseModel):
    username: str
    pin: str


@app.get("/", response_class=HTMLResponse)
async def serve_dashboard():
    with open(DASHBOARD_PATH, "r", encoding="utf-8") as f:
        return f.read()


@app.get("/api/telemetry")
async def get_hardware_telemetry():
    try:
        cpu_usage = psutil.cpu_percent(interval=None)
        memory = psutil.virtual_memory()
        disk_path = "C:\\" if sys.platform == "win32" else "/"
        disk = psutil.disk_usage(disk_path)

        cpu_temp = 42.0
        if hasattr(psutil, "sensors_temperatures"):
            temps = psutil.sensors_temperatures()
            if "coretemp" in temps and temps["coretemp"]:
                cpu_temp = temps["coretemp"][0].current
            elif "cpu_thermal" in temps and temps["cpu_thermal"]:
                cpu_temp = temps["cpu_thermal"][0].current

        return {
            "status": "nominal",
            "cpu": cpu_usage,
            "ram": memory.percent,
            "disk": disk.percent,
            "temp": round(cpu_temp, 1),
        }
    except Exception as e:
        return {"status": "error", "message": str(e)}


@app.post("/api/auth/login")
async def auth_login(data: LoginModel):
    ok, payload = login_with_pin(data.username, data.pin)
    if not ok:
        raise HTTPException(status_code=401, detail=payload.get("message", "Login failed"))
    return {"status": "success", "authenticated": True, "user": payload}


@app.post("/api/jarvis")
async def process_voice_or_text(data: QueryModel, principal=Depends(verify_jarvis_principal)):
    try:
        log_interaction("USER", data.prompt)
        reply = run_jarvis_brain(data.prompt, principal=principal)
        log_interaction("JARVIS", reply)
        log_audit(principal.username, principal.clearance, data.prompt, "BRAIN")
        return {"status": "success", "reply": reply}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e)) from e


@app.get("/api/history")
async def get_system_history(principal=Depends(verify_jarvis_principal)):
    return {"status": "nominal", "history": fetch_recent_logs()}


@app.get("/api/status")
async def health_check():
    return {"status": "ONLINE", "system": "JARVIS Core Operating System"}


if __name__ == "__main__":
    import uvicorn

    init_db()
    purge_expired_logs()
    initialize_scheduler()
    host = os.getenv("JARVIS_HOST", "0.0.0.0")
    port = int(os.getenv("JARVIS_PORT", "8000"))
    uvicorn.run(app, host=host, port=port)
