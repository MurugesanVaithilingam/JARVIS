# 🤖 J.A.R.V.I.S. & CHITTI 9.0 — Master Capabilities & Software Requirements Manual

This manual provides the full breakdown of required local software, AI models, algorithms, server infrastructure, and integrated tools available in J.A.R.V.I.S.

---

## 🛠️ 1. Required Local Software & Prerequisites

To run 100% of J.A.R.V.I.S. features, desktop automations, and server components on your PC:

| Software Component | Purpose | How to Launch / Verify |
| :--- | :--- | :--- |
| **WAMP / XAMPP Apache Server** | Hosts the local PHP backend, CORS proxy, and web frontend | Open browser to **`http://localhost/jarvis`** |
| **Python 3.10+** | Runs the native Windows desktop automation daemon & voice agent | Execute `python jarvis_desktop_daemon.py` |
| **Google Chrome / MS Edge** | Provides Web Speech Recognition (ASR) & Web Speech Synthesis (TTS) | Enable Microphone Permission on localhost |
| **Windows 10 / 11** | Native OS target for File Explorer, Bluetooth, Task Manager, Notepad | Pre-installed |

---

## 🤖 2. 14 Multi-Model AI Routing Matrix

J.A.R.V.I.S. includes **100% Free Unlimited Access** to all major AI provider models (no API keys strictly required due to built-in free fallback engine):

```
┌────────────────────────────────────────────────────────────────────────┐
│                        J.A.R.V.I.S. AI MATRIX                          │
├───────────────────┬───────────────────┬────────────────────────────────┤
│ 📊 Google Gemini  │ 🧠 OpenAI ChatGPT │ 🛡️ Anthropic Claude            │
│ 🐙 GitHub Models  │ ⚡ Groq Llama 3.3  │ 🐉 DeepSeek-R1 / V3            │
│ 🔍 Perplexity AI  │ 🌌 Grok (xAI)     │ 🏠 Ollama (100% Offline Local) │
└───────────────────┴───────────────────┴────────────────────────────────┘
```

---

## 🏗️ 3. Algorithms & Computer Science Suite

Accessible directly from the **Intelligence & Protocols Panel** and **Tools HUD**:

1. **Machine Learning Pipeline Builder (`mlModelBuilder`)**: Feature engineering, train/test split, hyperparameter tuning, and metric evaluation (Accuracy, F1, Confusion Matrix).
2. **Exploratory Data Analysis Engine (`dataAnalysisEngine`)**: Statistical distributions, skewness, anomaly detection, Pandas/Seaborn code, and SQL aggregation.
3. **DSA Algorithm & Complexity Solver (`dsaSolver`)**: Solves LeetCode/DSA problems with Time Complexity \(O(N)\) and Space Complexity \(O(1)\) dry-run traces.
4. **Network Protocol & OSI Inspector (`networkInspector`)**: 7-layer OSI breakdown, TCP/UDP 3-way handshake, and Wireshark packet capture analysis.
5. **Cyber Security OWASP Auditor (`cyberSecurityAudit`)**: Scans code for SQL Injection, XSS, broken access control, and insecure deserialization.
6. **RAG Context Retrieval Pipeline (`rag_knowledge_retrieval`)**: Tokenizes user queries, performs semantic keyword retrieval over persistent memory (`memory_engine.js`) and workspace files, and augments LLM prompts.

---

## ⚡ 4. Local Desktop & System Automation Tools

- 📂 **Windows File Explorer**: Voice command *"Open File Explorer"* or *"Close File Explorer"*.
- 📶 **Saved Wi-Fi Key Tracker**: Scans saved Wi-Fi profiles and reveals WPA2 security keys (`netsh wlan show profile`).
- 🔵 **Bluetooth Radio Control**: Launches Windows Bluetooth settings and executes PowerShell radio toggles (`turn_on_bluetooth.ps1`).
- 🚀 **App Launcher**: Launches Notepad, Calculator, Task Manager, Control Panel, Chrome, WhatsApp, Instagram, Facebook, Gmail, YouTube, Google Maps.
- 💻 **Stark CMD Terminal**: Interactive Windows command prompt sandbox with live execution output.
- 📷 **AI Vision Photo Analysis**: Upload any image to analyze people, objects, and text in real time.
- 🎨 **Pollinations AI Image Generator**: `/image <prompt>` renders 8K futuristic AI artwork directly in the chat HUD.
- 🌌 **3D Holographic Laboratory (`3d_lab.html`)**: WebGL Three.js particle suit simulator with sphere, torus, cube, and DNA particle configurations.
- 🛰️ **Tactical Satellite Radar Tracker (`tracker.html`)**: Live GPS geolocation lock, device telemetry scanner, and radar target sweeper.

---

## 🚀 Quick Startup Script (`start_jarvis.bat`)

Double-clicking `start_jarvis.bat` in your project folder will:
1. Launch `jarvis_desktop_daemon.py` on `http://localhost:8765`.
2. Open your default web browser to `http://localhost/jarvis`.
