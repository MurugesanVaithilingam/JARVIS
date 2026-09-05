"""SQLite command history logger with encryption and retention."""

import sqlite3
from datetime import datetime, timedelta

from core.security import decrypt_text, encrypt_text, retention_days

DB_FILE = "jarvis_history.db"


def init_db():
    conn = sqlite3.connect(DB_FILE)
    cursor = conn.cursor()
    cursor.execute(
        """
        CREATE TABLE IF NOT EXISTS command_logs (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            timestamp TEXT,
            sender TEXT,
            message TEXT
        )
        """
    )
    cursor.execute(
        """
        CREATE TABLE IF NOT EXISTS audit_logs (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            timestamp TEXT,
            username TEXT,
            clearance INTEGER,
            action TEXT,
            result TEXT,
            detail TEXT
        )
        """
    )
    conn.commit()
    conn.close()
    purge_expired_logs()


def log_interaction(sender: str, message: str):
    try:
        conn = sqlite3.connect(DB_FILE)
        cursor = conn.cursor()
        timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        cursor.execute(
            "INSERT INTO command_logs (timestamp, sender, message) VALUES (?, ?, ?)",
            (timestamp, sender, encrypt_text(message or "")),
        )
        conn.commit()
        conn.close()
    except Exception as e:
        print(f"Database logging failure: {e}")


def log_audit(username: str, clearance: int, action: str, result: str, detail: str = ""):
    try:
        conn = sqlite3.connect(DB_FILE)
        cursor = conn.cursor()
        timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        cursor.execute(
            """
            INSERT INTO audit_logs (timestamp, username, clearance, action, result, detail)
            VALUES (?, ?, ?, ?, ?, ?)
            """,
            (timestamp, username, clearance, action, result, encrypt_text(detail or "")),
        )
        conn.commit()
        conn.close()
    except Exception as e:
        print(f"Audit logging failure: {e}")


def fetch_recent_logs(limit: int = 50) -> list:
    try:
        conn = sqlite3.connect(DB_FILE)
        cursor = conn.cursor()
        cursor.execute(
            "SELECT timestamp, sender, message FROM command_logs ORDER BY id DESC LIMIT ?",
            (limit,),
        )
        rows = cursor.fetchall()
        conn.close()
        return [
            {"timestamp": r[0], "sender": r[1], "message": decrypt_text(r[2] or "")}
            for r in reversed(rows)
        ]
    except Exception as e:
        print(f"Failed to fetch logs: {e}")
        return []


def purge_expired_logs() -> int:
    cutoff = (datetime.now() - timedelta(days=retention_days())).strftime("%Y-%m-%d %H:%M:%S")
    deleted = 0
    try:
        conn = sqlite3.connect(DB_FILE)
        cursor = conn.cursor()
        cursor.execute("DELETE FROM command_logs WHERE timestamp < ?", (cutoff,))
        deleted += cursor.rowcount or 0
        cursor.execute("DELETE FROM audit_logs WHERE timestamp < ?", (cutoff,))
        deleted += cursor.rowcount or 0
        conn.commit()
        conn.close()
    except Exception as e:
        print(f"Retention purge failure: {e}")
    return deleted


def purge_all_logs() -> None:
    conn = sqlite3.connect(DB_FILE)
    cursor = conn.cursor()
    cursor.execute("DELETE FROM command_logs")
    cursor.execute("DELETE FROM audit_logs")
    conn.commit()
    conn.close()
