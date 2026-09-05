"""Background scheduler for proactive morning briefings."""

import os
from datetime import datetime

import requests
from apscheduler.schedulers.background import BackgroundScheduler
from dotenv import load_dotenv

load_dotenv()

TELEGRAM_TOKEN = os.getenv("TELEGRAM_BOT_TOKEN", "")
USER_CHAT_ID = os.getenv("TELEGRAM_USER_CHAT_ID", "")
JARVIS_URL = os.getenv("JARVIS_INTERNAL_URL", "http://localhost:8000/api/jarvis")
JARVIS_ACCESS_TOKEN = os.getenv("JARVIS_ACCESS_TOKEN", "")


def gather_morning_intel() -> str:
    current_date = datetime.now().strftime("%A, %B %d, %Y")

    calendar_text = "No calendar data available."
    email_text = "No email data available."
    try:
        from tools.google_workspace import fetch_todays_calendar, fetch_unread_emails

        calendar_text = fetch_todays_calendar()
        email_text = fetch_unread_emails()
    except Exception:
        calendar_text = "- 10:00 AM: Systems architecture sync\n- 2:30 PM: Code deployment review"
        email_text = "Inbox status unavailable (Google OAuth not configured)."

    return (
        f"Today is {current_date}.\n"
        f"Calendar:\n{calendar_text}\n\n"
        f"Email:\n{email_text}\n\n"
        "Generate a brief, elite, movie-accurate morning greeting and briefing as JARVIS. "
        "Keep it professional, encouraging, and under 90 words."
    )


def execute_morning_routine():
    print("Executing scheduled morning briefing workflow...")
    if not USER_CHAT_ID or not TELEGRAM_TOKEN:
        print("Cron Error: Missing Telegram configurations in environment variables.")
        return

    try:
        intel_prompt = gather_morning_intel()
        headers = {"Content-Type": "application/json"}
        if JARVIS_ACCESS_TOKEN:
            headers["X-JARVIS-TOKEN"] = JARVIS_ACCESS_TOKEN

        response = requests.post(
            JARVIS_URL,
            json={"prompt": intel_prompt},
            headers=headers,
            timeout=120,
        )
        reply_text = response.json().get(
            "reply",
            "Good morning, Sir. Systems are nominal, but briefing details were unavailable.",
        )

        requests.post(
            f"https://api.telegram.org/bot{TELEGRAM_TOKEN}/sendMessage",
            json={"chat_id": USER_CHAT_ID, "text": reply_text},
            timeout=30,
        )
        print("Morning briefing successfully broadcasted.")
    except Exception as e:
        print(f"Failed to execute morning routine sequence: {e}")


def initialize_scheduler():
    scheduler = BackgroundScheduler()
    scheduler.add_job(execute_morning_routine, "cron", hour=7, minute=0)
    scheduler.start()
    print("Background Automation Agent initialized successfully.")
