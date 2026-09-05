"""Text-to-speech via Microsoft Edge neural voices (free, no API key)."""

import asyncio
import os

import edge_tts


async def generate_speech_async(text: str, output_path: str = "response.mp3") -> str:
    voice = os.getenv("JARVIS_VOICE_ACCENT", "en-GB-RyanNeural")
    communicate = edge_tts.Communicate(text, voice)
    await communicate.save(output_path)
    return output_path


def text_to_speech(text: str, output_path: str = "response.mp3") -> str:
    asyncio.run(generate_speech_async(text, output_path))
    return os.path.abspath(output_path)
