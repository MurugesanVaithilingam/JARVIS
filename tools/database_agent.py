"""Restricted SQL + vector RAG assistant. The LLM never receives DB passwords."""

from __future__ import annotations

import os
import re
import sqlite3
from typing import Any, Dict

from core.memory import search_memory

WORKSPACE = os.path.join(os.path.dirname(os.path.dirname(__file__)), "jarvis_workspace")
SANDBOX_DB = os.path.join(WORKSPACE, "sandbox.db")

_WRITE = re.compile(
    r"\b(drop|delete|truncate|alter|insert|update|grant|revoke|attach|pragma|replace)\b",
    re.I,
)


def _ensure_sandbox() -> None:
    os.makedirs(WORKSPACE, exist_ok=True)
    conn = sqlite3.connect(SANDBOX_DB)
    cur = conn.cursor()
    cur.execute(
        """
        CREATE TABLE IF NOT EXISTS customers (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT,
            joined TEXT,
            status TEXT
        )
        """
    )
    cur.execute("SELECT COUNT(*) FROM customers")
    if cur.fetchone()[0] == 0:
        cur.executemany(
            "INSERT INTO customers (name, joined, status) VALUES (?, ?, ?)",
            [
                ("Rahul Kumar", "2026-09-01", "active"),
                ("Kugan S", "2026-09-02", "active"),
                ("Priya R", "2026-08-20", "pending"),
            ],
        )
    conn.commit()
    conn.close()


def _validate_select(sql: str) -> str:
    query = (sql or "").strip().rstrip(";")
    if not query:
        raise ValueError("Empty query.")
    if _WRITE.search(query):
        raise ValueError("Only read-only SELECT/SHOW queries are allowed.")
    if not re.match(r"^(select|show|explain|with)\b", query, re.I):
        raise ValueError("Query must start with SELECT, SHOW, EXPLAIN, or WITH.")
    if ";" in query:
        raise ValueError("Multiple statements are not allowed.")
    return query


def _run_sqlite(sql: str) -> Dict[str, Any]:
    _ensure_sandbox()
    conn = sqlite3.connect(SANDBOX_DB)
    conn.row_factory = sqlite3.Row
    cur = conn.cursor()
    cur.execute(sql)
    rows = [dict(r) for r in cur.fetchall()]
    conn.close()
    return {"engine": "sqlite", "rows": rows[:50], "count": len(rows)}


def _run_external(sql: str) -> Dict[str, Any]:
    dsn = os.getenv("JARVIS_SQL_DSN", "").strip()
    if not dsn:
        return _run_sqlite(sql)
    if dsn.startswith("postgres"):
        import psycopg2
        import psycopg2.extras

        conn = psycopg2.connect(dsn)
        cur = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
        cur.execute(sql)
        rows = list(cur.fetchall())
        conn.close()
        return {"engine": "postgresql", "rows": rows[:50], "count": len(rows)}
    if dsn.startswith("mysql"):
        import pymysql

        # mysql://user:pass@host:3306/db
        from urllib.parse import urlparse

        u = urlparse(dsn)
        conn = pymysql.connect(
            host=u.hostname or "127.0.0.1",
            user=u.username or "root",
            password=u.password or "",
            database=(u.path or "/").lstrip("/"),
            port=u.port or 3306,
            cursorclass=pymysql.cursors.DictCursor,
        )
        with conn:
            with conn.cursor() as cur:
                cur.execute(sql)
                rows = list(cur.fetchall())
        return {"engine": "mysql", "rows": rows[:50], "count": len(rows)}
    return _run_sqlite(sql)


def database_query_assistant(query: str, engine: str = "sqlite") -> str:
    """Run a restricted read query or a vector RAG lookup."""
    q = (query or "").strip()
    engine = (engine or "sqlite").lower()
    try:
        if engine in {"qdrant", "chroma", "faiss", "vector", "rag"}:
            hits = search_memory(q, num_results=4)
            return f"Vector RAG results:\n{hits}"
        if engine == "redis":
            return "Redis is configured as cache only. Use vector/SQL engines for records."
        lowered = q.lower()
        if re.match(r"^(select|show|explain|with)\b", lowered):
            sql = _validate_select(q)
        elif "how many" in lowered or "count" in lowered:
            sql = "SELECT COUNT(*) AS customer_count FROM customers"
        else:
            sql = "SELECT id, name, joined, status FROM customers LIMIT 10"
        result = _run_external(sql) if engine in {"mysql", "postgresql", "postgres"} else _run_sqlite(sql)
        return (
            f"{result['engine']} returned {result['count']} row(s). "
            f"Preview: {result['rows'][:8]}"
        )
    except Exception as exc:
        return f"Database assistant blocked or failed: {exc}"
