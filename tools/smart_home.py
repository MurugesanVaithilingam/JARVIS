"""Home Assistant REST API client."""

import os

import requests
from dotenv import load_dotenv

load_dotenv()

HA_URL = os.getenv("HOME_ASSISTANT_URL", "").rstrip("/")
HA_TOKEN = os.getenv("HOME_ASSISTANT_TOKEN", "")

headers = {
    "Authorization": f"Bearer {HA_TOKEN}",
    "content-type": "application/json",
}


def control_smart_device(entity_id: str, action: str, brightness: int = None) -> str:
    """Control lights, switches, and other Home Assistant entities."""
    if not HA_URL or not HA_TOKEN:
        return "Error: Home Assistant credentials are not configured in the system environment."

    domain = entity_id.split(".")[0]
    url = f"{HA_URL}/api/services/{domain}/{action}"
    payload = {"entity_id": entity_id}

    if brightness is not None and domain == "light":
        payload["brightness"] = brightness

    try:
        response = requests.post(url, json=payload, headers=headers, timeout=5)
        if response.status_code in (200, 201):
            return f"Success: Smart entity '{entity_id}' command '{action}' processed."
        return f"Error from Home Assistant API: {response.text}"
    except Exception as e:
        return f"Failed to connect to smart home network: {str(e)}"


def get_device_status(entity_id: str) -> str:
    """Query the current state of a Home Assistant entity."""
    if not HA_URL or not HA_TOKEN:
        return "Error: Home Assistant credentials are not configured."

    url = f"{HA_URL}/api/states/{entity_id}"
    try:
        response = requests.get(url, headers=headers, timeout=5)
        if response.status_code == 200:
            data = response.json()
            state = data.get("state", "unknown")
            friendly_name = data.get("attributes", {}).get("friendly_name", entity_id)
            return f"The current status of '{friendly_name}' is '{state}'."
        return f"Could not find device state data for {entity_id}."
    except Exception as e:
        return f"Failed to retrieve environmental data: {str(e)}"
