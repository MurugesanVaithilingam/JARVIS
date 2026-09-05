"""High-level robot/drone telemetry. No raw motor or arm commands."""

from __future__ import annotations

import os
from typing import Any, Dict


def robot_telemetry_check() -> str:
    ros_domain = os.getenv("ROS_DOMAIN_ID", "")
    status = {
        "stack": "ROS 2 interface",
        "lidar": "awaiting /scan topic",
        "imu": "awaiting /imu",
        "encoders": "awaiting /joint_states",
        "battery": "unknown",
        "connected": False,
    }
    if ros_domain:
        status["connected"] = True
        status["note"] = f"ROS_DOMAIN_ID={ros_domain}. Live topics are not subscribed in this process."
    else:
        status["note"] = "No ROS 2 domain configured. Telemetry is a safe status snapshot, not motor control."
    return (
        "Robot telemetry: LiDAR/IMU/encoders are not directly actuated by the LLM. "
        f"{status}"
    )


def drone_battery_check() -> str:
    endpoint = os.getenv("MAVLINK_URL", "udp:127.0.0.1:14550")
    try:
        from pymavlink import mavutil

        master = mavutil.mavlink_connection(endpoint)
        master.wait_heartbeat(timeout=2)
        msg = master.recv_match(type="SYS_STATUS", blocking=True, timeout=2)
        if not msg:
            return f"MAVLink heartbeat ok on {endpoint}, but no SYS_STATUS yet."
        volts = getattr(msg, "voltage_battery", 0) / 1000.0
        remaining = getattr(msg, "battery_remaining", -1)
        return f"PX4/MAVLink battery {volts:.2f} V, remaining {remaining}%."
    except Exception as exc:
        return (
            f"Drone telemetry unavailable ({exc}). "
            "JARVIS reports high-level status only; the flight controller keeps safety authority. "
            f"Expected link: {endpoint}"
        )
