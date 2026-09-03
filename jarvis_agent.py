#!/usr/bin/env python3
"""
===================================================================
J.A.R.V.I.S. & CHITTI 4.0 — AUTONOMOUS NATIVE VOICE AGENT (Session 1 Desktop Integration)
Runs continuously in the background on Windows / Mac / Linux.
Controls Native Desktop Apps: File Explorer, Bluetooth, Task Manager, Control Panel
Always listening for wake words: "Jarvis", "Karen", "Chitti", "Friday"
===================================================================
"""

import os
import sys
import time
import json
import urllib.request
import urllib.parse
import subprocess
import threading

try:
    import speech_recognition as sr
    HAS_SR = True
except ImportError:
    HAS_SR = False

try:
    import pyttsx3
    HAS_TTS = True
except ImportError:
    HAS_TTS = False

class JarvisAutonomousAgent:
    def __init__(self):
        self.persona = "J.A.R.V.I.S."
        self.wake_words = ["jarvis", "karen", "chitti", "friday", "edith", "stark"]
        self.running = True
        
        self.tts = None
        if HAS_TTS:
            try:
                self.tts = pyttsx3.init()
                voices = self.tts.getProperty('voices')
                if len(voices) > 1:
                    self.tts.setProperty('voice', voices[1].id)
                self.tts.setProperty('rate', 185)
            except Exception as e:
                print(f"[TTS Warning] {e}")

        print("\n" + "="*65)
        print("🤖 STARK INDUSTRIES & CHITTI 4.0 — AUTONOMOUS NATIVE VOICE AGENT")
        print("STATUS: ONLINE & CONTINUOUSLY LISTENING IN BACKGROUND")
        print("SYSTEM COMMANDS SUPPORTED: File Explorer, Bluetooth, Task Manager, Notepad")
        print("="*65 + "\n")
        self.speak("Systems initialized. J.A.R.V.I.S. native desktop agent is online and listening, Sir.")

    def speak(self, text):
        """Speaks response aloud using native engine."""
        print(f"\n🤖 [{self.persona}]: {text}")
        if self.tts:
            try:
                self.tts.say(text)
                self.tts.runAndWait()
            except Exception:
                pass
        else:
            if sys.platform == "win32":
                clean_text = text.replace('"', '').replace("'", "")
                cmd = f'powershell -Command "Add-Type –AssemblyName System.Speech; (New-Object System.Speech.Synthesis.SpeechSynthesizer).Speak(\'{clean_text}\');"'
                subprocess.Popen(cmd, shell=True)

    def query_free_ai(self, prompt, system_prompt="You are J.A.R.V.I.S., Tony Stark's AI assistant. Keep responses short and helpful."):
        """Queries Pollinations AI Free Unlimited Engine."""
        url = "https://text.pollinations.ai/"
        payload = json.dumps({
            "messages": [
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": prompt}
            ],
            "model": "openai",
            "seed": int(time.time())
        }).encode('utf-8')

        req = urllib.request.Request(url, data=payload, headers={'Content-Type': 'application/json'})
        try:
            with urllib.request.urlopen(req, timeout=12) as response:
                return response.read().decode('utf-8').strip()
        except Exception as e:
            return f"All local Stark systems active, Sir. Communication telemetry: {e}"

    def execute_local_system_command(self, command):
        """Executes PC automation, apps launch, and system control."""
        cmd = command.lower()

        # 1. Open File Explorer / My Computer / C Drive
        if any(w in cmd for w in ["file explorer", "explorer", "my computer", "open files", "c drive"]):
            self.speak("Opening Windows File Explorer on your system, Sir.")
            if sys.platform == "win32":
                subprocess.Popen("explorer.exe")
            return True

        # 2. Bluetooth Settings
        if "bluetooth" in cmd or "blue tooth" in cmd:
            self.speak("Opening Bluetooth Device Panel, Sir.")
            if sys.platform == "win32":
                subprocess.Popen("start ms-settings:bluetooth", shell=True)
            return True

        # 3. Task Manager
        if "task manager" in cmd or "taskmgr" in cmd:
            self.speak("Opening Task Manager.")
            if sys.platform == "win32":
                subprocess.Popen("taskmgr.exe")
            return True

        # 4. Control Panel
        if "control panel" in cmd:
            self.speak("Opening Control Panel.")
            if sys.platform == "win32":
                subprocess.Popen("control.exe")
            return True

        # 5. Lock Workstation
        if any(w in cmd for w in ["lock pc", "lock computer", "lock screen", "stand down"]):
            self.speak("Locking workstation and standing down, Sir.")
            if sys.platform == "win32":
                os.system("rundll32.exe user32.dll,LockWorkStation")
            return True
            
        # 6. Open Web Dashboard
        if any(w in cmd for w in ["open dashboard", "open jarvis", "open app"]):
            self.speak("Opening Stark AI Command Center dashboard.")
            import webbrowser
            webbrowser.open("http://localhost/jarvis")
            return True

        # 7. Open Calculator / Notepad
        if "calculator" in cmd or "calc" in cmd:
            self.speak("Opening calculator.")
            subprocess.Popen("calc.exe" if sys.platform == "win32" else "bc")
            return True

        if "notepad" in cmd:
            self.speak("Opening notepad.")
            subprocess.Popen("notepad.exe" if sys.platform == "win32" else "nano")
            return True

        return False

    def process_voice_input(self, text):
        """Processes recognized voice command."""
        print(f"\n🎙️ [USER]: {text}")
        if self.execute_local_system_command(text):
            return

        reply = self.query_free_ai(text)
        self.speak(reply)

    def listen_loop(self):
        """Continuous background listening loop."""
        if not HAS_SR:
            print("[ERROR] SpeechRecognition library not found. Install via: pip install SpeechRecognition pyaudio pyttsx3")
            return

        r = sr.Recognizer()
        r.energy_threshold = 300
        r.dynamic_energy_threshold = True

        while self.running:
            try:
                with sr.Microphone() as source:
                    print("⚡ [JARVIS Listening...]")
                    audio_data = r.listen(source, timeout=5, phrase_time_limit=10)
                    try:
                        text = r.recognize_google(audio_data).lower()
                        print(f"Recognized: {text}")
                        
                        # Check wake word or direct command
                        if any(w in text for w in self.wake_words) or len(text) > 2:
                            self.process_voice_input(text)
                    except sr.UnknownValueError:
                        pass
                    except sr.RequestError as e:
                        print(f"[Speech Error] {e}")
            except Exception as e:
                time.sleep(1)

if __name__ == "__main__":
    agent = JarvisAutonomousAgent()
    agent.listen_loop()
