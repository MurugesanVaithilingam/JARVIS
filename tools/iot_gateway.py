"""Smart-home gateway: Home Assistant first, MQTT/ESP32 second."""

from __future__ import annotations

import json
import os
from typing import Dict

from tools.smart_home import control_smart_device, get_device_status

DEVICE_MAP: Dict[str, str] = {
    "living room light": os.getenv("HA_LIVING_LIGHT", "light.living_room"),
    "bedroom ac": os.getenv("HA_BEDROOM_AC", "climate.bedroom"),
    "door lock": os.getenv("HA_DOOR_LOCK", "lock.front_door"),
    "thermostat": os.getenv("HA_THERMOSTAT", "climate.home"),
    "smart plug": os.getenv("HA_SMART_PLUG", "switch.smart_plug"),
}


def _mqtt_publish(topic: str, payload: dict) -> str:
    broker = os.getenv("MQTT_BROKER", "").strip()
    if not broker:
        return ""
    try:
        import paho.mqtt.publish as publish

        publish.single(
            topic,
            json.dumps(payload),
            hostname=broker,
            port=int(os.getenv("MQTT_PORT", "1883")),
            auth=None,
        )
        return f"MQTT payload sent to {broker} topic {topic}."
    except Exception as exc:
        return f"MQTT publish failed: {exc}"


def iot_smart_home_control(device_action: str) -> str:
    text = (device_action or "").strip().lower()
    action = "turn_on"
    if "off" in text or "lock" in text and "unlock" not in text:
        action = "turn_off"
    if "unlock" in text:
        action = "turn_on"
    if "toggle" in text:
        action = "toggle"

    entity = None
    for name, eid in DEVICE_MAP.items():
        if name in text:
            entity = eid
            break
    mqtt_msg = _mqtt_publish("jarvis/iot/command", {"command": device_action, "action": action})
    if entity:
        ha = control_smart_device(entity, action)
        return f"{ha} {mqtt_msg}".strip()
    if mqtt_msg:
        return mqtt_msg
    return (
        f"IoT command queued as '{device_action}'. "
        "Configure HOME_ASSISTANT_* or MQTT_BROKER to reach ESP32 hardware."
    )


def iot_device_status(device: str = "living room light") -> str:
    name = (device or "living room light").lower()
    entity = DEVICE_MAP.get(name, DEVICE_MAP["living room light"])
    return get_device_status(entity)
