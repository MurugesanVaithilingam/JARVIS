"""ReAct agent brain — LLM orchestration, tool routing, and persona injection."""

import json
import os
from typing import Any, Callable, Dict, List

from dotenv import load_dotenv
from openai import OpenAI

from core.memory import search_memory
from core.security import Principal, ANONYMOUS, authorize_tool, shell_command_allowed
from tools.database_agent import database_query_assistant
from tools.google_workspace import fetch_todays_calendar, fetch_unread_emails
from tools.smart_home import control_smart_device, get_device_status
from tools.system_control import execute_system_command
from tools.analytics_engine import pandas_data_analysis
from tools.iot_gateway import iot_smart_home_control
from tools.robotics_agent import drone_battery_check, robot_telemetry_check
from tools.vision_engine import capture_and_encode_screen, computer_vision_scan
from tools.workspace_agent import list_workspace_files, read_workspace_file, write_workspace_file

load_dotenv()

client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))
LLM_MODEL = os.getenv("JARVIS_LLM_MODEL", "gpt-4o")


def build_system_instruction() -> str:
    personality = os.getenv("JARVIS_PERSONALITY_LEVEL", "elite")
    max_sentences = os.getenv("JARVIS_MAX_SENTENCES", "3")

    base_prompt = (
        "You are JARVIS, an advanced, highly sophisticated AI operating system inspired by Iron Man. "
        "You have direct execution access to local system terminals, screen vision, memory networks, "
        "home automation nodes, Google Workspace, and a developer workspace. "
    )

    if personality == "elite":
        behavior = (
            "Maintain an extremely refined, calm, and professional demeanor. Use crisp, articulate vocabulary. "
            "Address the user respectfully as 'Sir' or 'Ma'am' when appropriate. "
        )
    elif personality == "formal":
        behavior = "Be highly analytical, completely objective, and avoid casual filler words. "
    else:
        behavior = "Be helpful, conversational, and direct. "

    length_constraint = (
        f"Crucial: Keep your final spoken response highly concise and limited to a maximum of "
        f"{max_sentences} sentences to minimize voice rendering latency. "
    )

    return base_prompt + behavior + length_constraint


def analyze_current_screen(reason: str) -> str:
    try:
        base64_image = capture_and_encode_screen()
        vision_response = client.chat.completions.create(
            model=LLM_MODEL,
            messages=[
                {
                    "role": "user",
                    "content": [
                        {"type": "text", "text": f"Analyze this screenshot. Context/Reason: {reason}"},
                        {
                            "type": "image_url",
                            "image_url": {"url": f"data:image/jpeg;base64,{base64_image}"},
                        },
                    ],
                }
            ],
            max_tokens=300,
        )
        return vision_response.choices[0].message.content or "No visual analysis returned."
    except Exception as e:
        return f"Failed to capture or analyze screen: {str(e)}"


TOOLS_SCHEMA: List[Dict[str, Any]] = [
    {
        "type": "function",
        "function": {
            "name": "execute_system_command",
            "description": "Run a shell/terminal command on the host computer.",
            "parameters": {
                "type": "object",
                "properties": {
                    "command": {"type": "string", "description": "The exact shell command to execute."}
                },
                "required": ["command"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "search_memory",
            "description": "Query local memory for personal notes, logs, and indexed files.",
            "parameters": {
                "type": "object",
                "properties": {
                    "query": {"type": "string", "description": "Concept or question to look up."}
                },
                "required": ["query"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "analyze_current_screen",
            "description": "Capture a live screenshot to read errors or analyze visual data.",
            "parameters": {
                "type": "object",
                "properties": {
                    "reason": {"type": "string", "description": "Why the screen needs inspection."}
                },
                "required": ["reason"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "control_smart_device",
            "description": "Control physical hardware like lights or switches via Home Assistant.",
            "parameters": {
                "type": "object",
                "properties": {
                    "entity_id": {"type": "string"},
                    "action": {"type": "string", "enum": ["turn_on", "turn_off", "toggle"]},
                    "brightness": {"type": "integer", "description": "0-255 for lights"},
                },
                "required": ["entity_id", "action"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "get_device_status",
            "description": "Query Home Assistant entity state.",
            "parameters": {
                "type": "object",
                "properties": {"entity_id": {"type": "string"}},
                "required": ["entity_id"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "list_workspace_files",
            "description": "List all files in the developer workspace.",
            "parameters": {"type": "object", "properties": {}},
        },
    },
    {
        "type": "function",
        "function": {
            "name": "read_workspace_file",
            "description": "Read a file from the developer workspace.",
            "parameters": {
                "type": "object",
                "properties": {"file_path": {"type": "string"}},
                "required": ["file_path"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "write_workspace_file",
            "description": "Create or overwrite a file in the developer workspace.",
            "parameters": {
                "type": "object",
                "properties": {
                    "file_path": {"type": "string"},
                    "code_content": {"type": "string"},
                },
                "required": ["file_path", "code_content"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "fetch_todays_calendar",
            "description": "Read Google Calendar events scheduled for today.",
            "parameters": {"type": "object", "properties": {}},
        },
    },
    {
        "type": "function",
        "function": {
            "name": "database_query_assistant",
            "description": "Read-only SQL or vector RAG lookup. Never use this for DELETE/DROP.",
            "parameters": {
                "type": "object",
                "properties": {
                    "query": {"type": "string"},
                    "engine": {"type": "string", "description": "sqlite, mysql, postgresql, or rag"},
                },
                "required": ["query"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "pandas_data_analysis",
            "description": "Analyze a CSV/Excel path with pandas statistics.",
            "parameters": {
                "type": "object",
                "properties": {"source": {"type": "string"}},
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "computer_vision_scan",
            "description": "Scan camera/screen with optional YOLO and OCR.",
            "parameters": {
                "type": "object",
                "properties": {"mode": {"type": "string"}},
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "iot_smart_home_control",
            "description": "Control mapped smart-home devices via Home Assistant or MQTT.",
            "parameters": {
                "type": "object",
                "properties": {"device_action": {"type": "string"}},
                "required": ["device_action"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "robot_telemetry_check",
            "description": "Read ROS 2 robot telemetry. Does not move motors.",
            "parameters": {"type": "object", "properties": {}},
        },
    },
    {
        "type": "function",
        "function": {
            "name": "drone_battery_check",
            "description": "Read PX4/MAVLink battery telemetry. Does not arm or take off.",
            "parameters": {"type": "object", "properties": {}},
        },
    },
]

def _guarded_shell(command: str) -> str:
    ok, reason = shell_command_allowed(command)
    if not ok:
        return f"Security policy blocked this command: {reason}"
    return execute_system_command(command)


AVAILABLE_FUNCTIONS: Dict[str, Callable[..., str]] = {
    "execute_system_command": _guarded_shell,
    "search_memory": search_memory,
    "analyze_current_screen": analyze_current_screen,
    "control_smart_device": control_smart_device,
    "get_device_status": get_device_status,
    "list_workspace_files": list_workspace_files,
    "read_workspace_file": read_workspace_file,
    "write_workspace_file": write_workspace_file,
    "fetch_todays_calendar": fetch_todays_calendar,
    "fetch_unread_emails": fetch_unread_emails,
    "database_query_assistant": database_query_assistant,
    "pandas_data_analysis": pandas_data_analysis,
    "computer_vision_scan": computer_vision_scan,
    "iot_smart_home_control": iot_smart_home_control,
    "robot_telemetry_check": robot_telemetry_check,
    "drone_battery_check": drone_battery_check,
}


def run_jarvis_brain(
    user_prompt: str,
    max_iterations: int = 5,
    principal: Principal | None = None,
) -> str:
    """ReAct loop: Thought → Action → Observation until a final answer is produced."""
    actor = principal or ANONYMOUS
    system_instruction = build_system_instruction()
    messages: List[Dict[str, Any]] = [
        {"role": "system", "content": system_instruction},
        {"role": "user", "content": user_prompt},
    ]

    for _ in range(max_iterations):
        response = client.chat.completions.create(
            model=LLM_MODEL,
            messages=messages,
            tools=TOOLS_SCHEMA,
            tool_choice="auto",
        )

        response_message = response.choices[0].message
        tool_calls = response_message.tool_calls

        if not tool_calls:
            return response_message.content or "At your service, Sir."

        messages.append(response_message)

        for tool_call in tool_calls:
            function_name = tool_call.function.name
            function_to_call = AVAILABLE_FUNCTIONS.get(function_name)
            allowed, deny_reason = authorize_tool(actor, function_name)
            if not allowed:
                tool_output = deny_reason
            elif not function_to_call:
                tool_output = f"Unknown tool: {function_name}"
            else:
                try:
                    function_args = json.loads(tool_call.function.arguments or "{}")
                    tool_output = function_to_call(**function_args)
                except Exception as e:
                    tool_output = f"Tool execution error: {str(e)}"

            messages.append(
                {
                    "role": "tool",
                    "tool_call_id": tool_call.id,
                    "name": function_name,
                    "content": tool_output,
                }
            )

    final = client.chat.completions.create(model=LLM_MODEL, messages=messages)
    return final.choices[0].message.content or "Task completed, Sir."
