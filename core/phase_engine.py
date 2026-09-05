"""Dispatch JARVIS 2.0 phase tools from voice or HTTP."""

from __future__ import annotations

from typing import Any, Dict

from tools.comms_agent import send_whatsapp_message
from tools.analytics_engine import ml_model_builder, pandas_data_analysis
from tools.database_agent import database_query_assistant
from tools.iot_gateway import iot_device_status, iot_smart_home_control
from tools.robotics_agent import drone_battery_check, robot_telemetry_check
from tools.vision_engine import computer_vision_scan
from tools_v1.browser import BrowserController

_browser = BrowserController(headless=False)


async def run_browser(action: str, target: str = "") -> Dict[str, Any]:
    act = (action or "open").lower()
    if act in {"read", "read_page", "extract"}:
        result = await _browser.read_page()
        reply = result.get("summary") or result.get("message") or "No page text."
        return {"intent": "BROWSER_READ", "response": str(reply)[:500], "result": result}
    if act in {"search"}:
        result = await _browser.search_google(target or "AI engineer jobs")
        return {
            "intent": "BROWSER_SEARCH",
            "response": f"Opened search for {target}.",
            "result": result,
        }
    if act in {"tab", "new_tab"}:
        result = await _browser.new_tab(target or "https://google.com")
        return {"intent": "BROWSER_TAB", "response": f"Opened tab {target}.", "result": result}
    result = await _browser.open_url(target or "https://google.com")
    return {
        "intent": "BROWSER_OPEN",
        "response": f"Opened {result.get('url', target)}.",
        "result": result,
    }


def run_database(query: str, engine: str = "sqlite") -> Dict[str, Any]:
    reply = database_query_assistant(query, engine)
    return {"intent": "DATABASE", "response": reply}


def run_analytics(source: str = "", mode: str = "pandas") -> Dict[str, Any]:
    if (mode or "").lower() in {"ml", "model"}:
        reply = ml_model_builder(source or "classification")
        return {"intent": "ML_BUILDER", "response": reply}
    reply = pandas_data_analysis(source)
    return {"intent": "ANALYTICS", "response": reply}


def run_vision(mode: str = "auto") -> Dict[str, Any]:
    reply = computer_vision_scan(mode)
    return {"intent": "VISION", "response": reply}


def run_iot(command: str) -> Dict[str, Any]:
    if "status" in (command or "").lower() or "temperature" in (command or "").lower():
        reply = iot_device_status(command)
    else:
        reply = iot_smart_home_control(command)
    return {"intent": "IOT", "response": reply}


async def run_comms(contact: str, message: str = "Hi") -> Dict[str, Any]:
    reply = await send_whatsapp_message(contact, message)
    return {"intent": "WHATSAPP", "response": reply}


def run_robotics(kind: str = "robot") -> Dict[str, Any]:
    if (kind or "").lower() == "drone":
        return {"intent": "DRONE", "response": drone_battery_check()}
    return {"intent": "ROBOT", "response": robot_telemetry_check()}
