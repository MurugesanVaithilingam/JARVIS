"""
===================================================================
J.A.R.V.I.S. V1 — LIVE VOICE ENGINE (VAD + STT + TTS)
===================================================================
Handles microphone audio capture, Voice Activity Detection (VAD),
Speech-to-Text (STT), and Text-to-Speech (TTS) voice feedback.
"""

import sys
import time
import logging
import threading
from typing import Callable, Optional

logger = logging.getLogger("JarvisVoiceEngine")

class VoiceEngine:
    def __init__(self):
        self.is_listening = False
        self.is_speaking = False
        self.on_speech_recognized: Optional[Callable[[str], None]] = None

    def start_listening(self, callback: Callable[[str], None]):
        """Starts live microphone listening loop in background thread."""
        self.on_speech_recognized = callback
        self.is_listening = True
        thread = threading.Thread(target=self._mic_loop, daemon=True)
        thread.start()
        logger.info("Live Voice Engine microphone loop started.")

    def stop_listening(self):
        self.is_listening = False

    def _mic_loop(self):
        try:
            import speech_recognition as sr
            recognizer = sr.Recognizer()
            recognizer.energy_threshold = 300
            recognizer.dynamic_energy_threshold = True

            with sr.Microphone() as source:
                recognizer.adjust_for_ambient_noise(source, duration=0.8)
                logger.info("Microphone calibrated for ambient noise.")

                while self.is_listening:
                    if self.is_speaking:
                        time.sleep(0.1)
                        continue
                    try:
                        logger.debug("Listening for audio input...")
                        audio = recognizer.listen(source, timeout=4, phrase_time_limit=10)
                        
                        # Speech to Text Recognition
                        text = recognizer.recognize_google(audio, language="en-US")
                        if text and len(text.strip()) > 0:
                            logger.info(f"Recognized Speech: '{text}'")
                            if self.on_speech_recognized:
                                self.on_speech_recognized(text)
                    except sr.WaitTimeoutError:
                        continue
                    except sr.UnknownValueError:
                        continue
                    except Exception as e:
                        logger.error(f"STT Error: {e}")
                        time.sleep(0.5)
        except Exception as e:
            logger.warning(f"PyAudio / SpeechRecognition mic loop fallback notice: {e}")

    def speak(self, text: str):
        """Text-to-Speech synthesis output."""
        if not text:
            return
        logger.info(f"JARVIS Speaking: '{text}'")
        self.is_speaking = True

        def _tts_thread():
            try:
                import pyttsx3
                engine = pyttsx3.init()
                engine.setProperty('rate', 175)
                voices = engine.getProperty('voices')
                # Prefer female or UK voice if available
                for voice in voices:
                    if "zira" in voice.name.lower() or "uk" in voice.name.lower() or "female" in voice.name.lower():
                        engine.setProperty('voice', voice.id)
                        break
                engine.say(text)
                engine.runAndWait()
            except Exception as e:
                logger.warning(f"pyttsx3 TTS fallback: {e}")
            finally:
                self.is_speaking = False

        threading.Thread(target=_tts_thread, daemon=True).start()
