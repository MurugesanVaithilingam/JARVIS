# 🤖 J.A.R.V.I.S. & CHITTI 9.0 — Quantum Autonomous AI Command Center

[![License: MIT](https://img.shields.io/badge/License-MIT-cyan.svg)](LICENSE)
[![AI Engine](https://img.shields.io/badge/AI%20Engine-100%25%20Free%20Matrix-brightgreen.svg)]()
[![Voice Mode](https://img.shields.io/badge/Voice%20Mode-Always--On%20Handsfree-ff007f.svg)]()
[![Platform](https://img.shields.io/badge/Platform-Windows%20%7C%20Web-blue.svg)]()

> **"Good evening, Boss. All Stark neural cores and AI models are 100% online."**

An advanced Iron Man HUD-inspired autonomous personal AI assistant web application featuring **100% free multi-model routing** (ChatGPT, Gemini, Claude, DeepSeek, Grok, Perplexity, Groq, Mistral), **always-on hands-free Tamil & English voice recognition**, **instant speech output**, **Gemini-style app launchers**, and **local desktop automation**.

---

## ✨ Highlights & Key Features

- 🎙️ **Always-On Hands-Free Voice Control**:
  - Wake words: *"Jarvis"*, *"ஜார்விஸ்"*, *"Hey Jarvis"*, *"Karen"*, *"Chitti"*, *"Friday"*.
  - Respectful Boss persona in Tamil (*"சொல்லுங்க பாஸ், உங்களுக்கு என்ன வேணும்?"*).
  - Instant User Interruption (Barge-in): Interrupt JARVIS anytime while speaking.

- 🤖 **100% Free 14 Multi-Model AI Routing Matrix**:
  - **Zero API Keys Required!**
  - Instant free access to **GPT-4o**, **Gemini**, **Claude**, **DeepSeek-R1/V3**, **Grok**, **Perplexity**, **Mistral**, **Llama 3.3 70B**.

- 💻 **Native Windows Desktop Automation (`jarvis_desktop_daemon.py`)**:
  - Windows File Explorer (`cmd=explorer`)
  - Native Bluetooth Radio ON & Control Panel (`cmd=bluetooth`)
  - Task Manager, Control Panel, Notepad, Calculator.

- 📱 **Google Gemini-Style App Launchers**:
  - Calls & Contacts (*"Call Suresh"*)
  - WhatsApp Web (*"Open WhatsApp"*)
  - Instagram (*"Open Instagram"*)
  - Facebook (*"Open Facebook"*)
  - Gmail (*"Open Gmail"*)
  - Google Maps Navigation (*"Open Maps"*)

- 📷 **AI Vision Photo Analysis**:
  - Click `📷` button in Chat HUD to upload any photo.
  - Multimodal Vision AI analyzes who or what is in the photo and answers your questions.

- 🌌 **3D Hologram Laboratory & Tactical Modules**:
  - Interactive 3D WebGL Particle HUD (`3d_lab.html`)
  - Tactical Satellite Location Tracker (`tracker.html`)
  - Multi-Model Code Studio (`code_studio.html`)
  - Cyber Defense SOC Engine (`cyber_soc.html`)
  - Stark Terminal Console (`cmd_hacker.html`)

---

## 🚀 Quick Setup & Deployment

### 1. Local WAMP / Apache Web Server
1. Clone or place repository into your local web root (`C:\wamp64\www\jarvis`).
2. Open browser: **`http://localhost/jarvis`**.

### 2. Desktop Automation Daemon Setup
To enable native Windows File Explorer & Bluetooth execution:
```bash
python jarvis_desktop_daemon.py
```
*(Runs on `http://localhost:8765` in background)*

### 3. Free Cloud Deployment (GitHub Pages / Netlify / Vercel)
1. Push to GitHub repository:
```bash
git init
git add .
git commit -m "Deploy J.A.R.V.I.S. Quantum Autonomous AI Center v9.0"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/jarvis.git
git push -u origin main
```
2. Enable **GitHub Pages** under Repository Settings ➔ Pages ➔ Source: `main` branch.

---

## 🛠️ Technology Stack

- **Frontend**: HTML5, Vanilla CSS3 (Custom Glassmorphic Cyberpunk HUD System), JavaScript (ES6+), WebGL (Three.js 3D Particles)
- **Backend / Proxy**: PHP 8.0 (WAMP), Python 3.13 (Native Desktop Daemon & PyTTSx3)
- **Voice Engine**: SpeechRecognition API, Web SpeechSynthesis API, Web Audio API
- **AI Routing**: Pollinations AI Free Neural Engine, Multi-Model Fallback Helper

---

## 📜 License

Distributed under the MIT License. See `LICENSE` for details.

Developed with ❤️ for Tony Stark AI Enthusiasts.
