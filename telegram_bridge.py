"""Telegram mobile bridge — voice notes and text to JARVIS core engine."""

import os
import time

import requests
from dotenv import load_dotenv
from openai import OpenAI

from tools.voice_engine import text_to_speech

load_dotenv()

TELEGRAM_TOKEN = os.getenv("TELEGRAM_BOT_TOKEN", "")
JARVIS_URL = os.getenv("JARVIS_INTERNAL_URL", "http://localhost:8000/api/jarvis")
JARVIS_ACCESS_TOKEN = os.getenv("JARVIS_ACCESS_TOKEN", "")

openai_client = OpenAI(api_key=os.getenv("OPENAI_API_KEY")) if os.getenv("OPENAI_API_KEY") else None


def telegram_api(method: str, **kwargs):
    url = f"https://api.telegram.org/bot{TELEGRAM_TOKEN}/{method}"
    return requests.post(url, **kwargs, timeout=60)


def process_voice_note(file_id: str) -> str:
    if not openai_client:
        return "OpenAI API key not configured for Whisper transcription."

    file_info = requests.get(
        f"https://api.telegram.org/bot{TELEGRAM_TOKEN}/getFile",
        params={"file_id": file_id},
        timeout=30,
    ).json()
    file_path = file_info["result"]["file_path"]

    audio_url = f"https://api.telegram.org/file/bot{TELEGRAM_TOKEN}/{file_path}"
    audio_data = requests.get(audio_url, timeout=30).content

    local_filename = "user_voice.ogg"
    with open(local_filename, "wb") as f:
        f.write(audio_data)

    with open(local_filename, "rb") as audio_file:
        transcription = openai_client.audio.transcriptions.create(
            model="whisper-1",
            file=audio_file,
        )

    os.remove(local_filename)
    return transcription.text


def send_voice_response(chat_id: int, text_reply: str):
    audio_path = text_to_speech(text_reply, "jarvis_reply.mp3")
    with open(audio_path, "rb") as audio:
        telegram_api("sendVoice", data={"chat_id": chat_id}, files={"voice": audio})
    if os.path.exists(audio_path):
        os.remove(audio_path)


def send_text_response(chat_id: int, text_reply: str):
    telegram_api("sendMessage", json={"chat_id": chat_id, "text": text_reply})


def query_jarvis(prompt: str) -> str:
    headers = {"Content-Type": "application/json"}
    if JARVIS_ACCESS_TOKEN:
        headers["X-JARVIS-TOKEN"] = JARVIS_ACCESS_TOKEN

    response = requests.post(JARVIS_URL, json={"prompt": prompt}, headers=headers, timeout=120)
    if response.status_code == 403:
        return "Access denied. Check JARVIS_ACCESS_TOKEN configuration."
    return response.json().get("reply", "System processing error.")


def poll_messages(voice_replies: bool = True):
    if not TELEGRAM_TOKEN:
        print("Error: TELEGRAM_BOT_TOKEN not set in .env")
        return

    offset = 0
    print("JARVIS Voice Server is active. Send a voice note or text from your phone...")
    while True:
        try:
            updates = requests.get(
                f"https://api.telegram.org/bot{TELEGRAM_TOKEN}/getUpdates",
                params={"offset": offset, "timeout": 20},
                timeout=30,
            ).json()

            for update in updates.get("result", []):
                offset = update["update_id"] + 1
                message = update.get("message", {})
                chat_id = message.get("chat", {}).get("id")
                user_text = ""

                if "voice" in message:
                    print("Processing incoming voice message...")
                    file_id = message["voice"]["file_id"]
                    user_text = process_voice_note(file_id)
                    print(f"User said: '{user_text}'")
                elif "text" in message:
                    user_text = message.get("text", "")

                if user_text and chat_id:
                    reply = query_jarvis(user_text)
                    if voice_replies:
                        send_voice_response(chat_id, reply)
                    else:
                        send_text_response(chat_id, reply)

        except Exception as e:
            print(f"Error in main loop: {e}")
        time.sleep(1)


if __name__ == "__main__":
    poll_messages()
