"""Gmail and Google Calendar integration via OAuth2."""

import datetime
import os

from google.auth.transport.requests import Request
from google.oauth2.credentials import Credentials
from google_auth_oauthlib.flow import InstalledAppFlow
from googleapiclient.discovery import build

SCOPES = [
    "https://www.googleapis.com/auth/calendar.readonly",
    "https://www.googleapis.com/auth/gmail.readonly",
]


def get_google_services():
    creds = None
    if os.path.exists("token.json"):
        creds = Credentials.from_authorized_user_file("token.json", SCOPES)

    if not creds or not creds.valid:
        if creds and creds.expired and creds.refresh_token:
            creds.refresh(Request())
        else:
            if not os.path.exists("credentials.json"):
                raise FileNotFoundError(
                    "Missing 'credentials.json'. Download OAuth credentials from Google Cloud Console."
                )
            flow = InstalledAppFlow.from_client_secrets_file("credentials.json", SCOPES)
            creds = flow.run_local_server(port=0)
        with open("token.json", "w", encoding="utf-8") as token:
            token.write(creds.to_json())

    calendar_service = build("calendar", "v3", credentials=creds)
    gmail_service = build("gmail", "v1", credentials=creds)
    return calendar_service, gmail_service


def fetch_todays_calendar() -> str:
    try:
        calendar_service, _ = get_google_services()
        now = datetime.datetime.utcnow().isoformat() + "Z"
        end_of_day = (
            datetime.datetime.utcnow().replace(hour=23, minute=59, second=59).isoformat() + "Z"
        )

        events_result = (
            calendar_service.events()
            .list(
                calendarId="primary",
                timeMin=now,
                timeMax=end_of_day,
                maxResults=10,
                singleEvents=True,
                orderBy="startTime",
            )
            .execute()
        )
        events = events_result.get("items", [])

        if not events:
            return "No scheduled events found on your calendar for the rest of today."

        agenda = ["Today's Schedule:"]
        for event in events:
            start = event["start"].get("dateTime", event["start"].get("date"))
            if "T" in start:
                time_str = datetime.datetime.fromisoformat(start.replace("Z", "+00:00")).strftime(
                    "%I:%M %p"
                )
            else:
                time_str = "All Day"
            agenda.append(f"- {time_str}: {event['summary']}")
        return "\n".join(agenda)
    except Exception as e:
        return f"Failed to retrieve calendar data: {str(e)}"


def fetch_unread_emails() -> str:
    try:
        _, gmail_service = get_google_services()
        results = (
            gmail_service.users().messages().list(userId="me", q="is:unread", maxResults=5).execute()
        )
        messages = results.get("messages", [])

        if not messages:
            return "Your inbox is clean. No unread emails found."

        email_summary = ["Recent Unread Emails:"]
        for msg in messages:
            msg_data = (
                gmail_service.users()
                .messages()
                .get(userId="me", id=msg["id"], format="minimal")
                .execute()
            )
            snippet = msg_data.get("snippet", "")
            email_summary.append(f"- {snippet[:80]}...")
        return "\n".join(email_summary)
    except Exception as e:
        return f"Failed to retrieve email data: {str(e)}"
