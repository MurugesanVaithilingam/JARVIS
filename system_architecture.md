# 🧠 J.A.R.V.I.S. Quantum Autonomous AI System Architecture

## 1. 🎙️ Voice Assistant Processing Pipeline (Alexa Pattern)

The J.A.R.V.I.S. voice pipeline transforms acoustic analog speech into structured actions and synthesized voice responses in real time.

```
[ Ambient Speech ] ──► [ Local Wake-Word Engine ] ──► [ Ingestion Stream ]
                                                             │
[ Voice Output (TTS) ] ◄── [ Skill Execution ] ◄── [ NLU Intent & Slots ]
```

### 1.1 Local Wake-Word & Passive Listening
- **Beamforming & Noise Cancellation**: Array microphones filter ambient room sound, acoustic echoes, and Gain Control equalizes audio volume.
- **Low-Power Acoustic Classifier**: Continuous local evaluation matching wake words (*"Jarvis"*, *"Chitti"*, *"Friday"*). No audio stream leaves the local machine prior to wake-word verification.

### 1.2 Ingestion & Automatic Speech Recognition (ASR)
- **Audio Streaming**: Blue HUD activation rings signal streaming to speech recognition service (`voice.js` / Web Speech API).
- **Phoneme Parsing**: Audio waves split into distinct acoustic phonemes and parsed into raw text strings.

### 1.3 Natural Language Understanding (NLU)
- **Intent Extraction**: Identifies primary target directive (e.g., `Intent: TurnOnSmartTV`, `Intent: RunCodeAudit`).
- **Slot Filling**: Extracts variable parameters (e.g., `Slot[Device]: Living Room Light`, `Slot[Level]: 50%`, `Slot[Model]: Gemini 3.6`).

### 1.4 Skill Routing & Execution
- **Native Routing**: Direct execution via local Python desktop daemon (`jarvis_desktop_daemon.py`) for Windows system actions.
- **Cloud/Web APIs**: Secure dispatch via PHP proxy endpoints (`proxy.php`, `jarvis_executor.php`) or external cloud webhooks (AWS IoT Core / Lambda).

### 1.5 Text-to-Speech (TTS) & Barge-In Playback
- **NLG Sentence Synthesis**: Response text generated with grammatical inflections.
- **Voice Engine**: Web Speech Synthesis API / PyTTSx3 synthetic audio generation.
- **Barge-In Support**: Immediate interruption hook allows user to cancel or override JARVIS mid-sentence.

---

## 2. 🏠 Smart Home Automation & IoT Ecosystem Topology

JARVIS functions as the central command node coordinating diverse smart device clouds and local network peripherals.

```
                  ┌─────────────────────────────────────────┐
                  │      J.A.R.V.I.S. Command Engine         │
                  └────────────────────┬────────────────────┘
                                       │
                ┌──────────────────────┴──────────────────────┐
                ▼                                             ▼
     [ Cloud-to-Cloud APIs ]                       [ Matter / Local Mesh ]
(OAuth linked Hue, SmartThings)                 (Direct Wi-Fi / LAN Packets)
                │                                             │
                ▼                                             ▼
       [ Manufacturer Cloud ]                      [ Local Smart Hardware ]
```

### 2.1 Ecosystem Account Linking & Authentication
- **OAuth Protocol**: Secure token exchange connecting JARVIS with external device clouds (Philips Hue, Samsung SmartThings, Tuya/Smart Life).

### 2.2 Dual Routing Strategy: Cloud vs. Local Control
- **Cloud-to-Cloud API Routing**: Used when devices operate on proprietary cloud protocols. Webhooks dispatch digital payloads to manufacturer endpoints.
- **Matter / Thread Universal Standard**: Allows JARVIS to bypass external clouds for basic home automation. Commands execute locally over Wi-Fi/LAN via Wake-on-LAN and IP sockets with sub-50ms latency.

---

## 3. 🤖 Multi-Model LLM Triad Strategy: Gemini vs. ChatGPT vs. Claude

J.A.R.V.I.S. employs a multi-model router selecting the optimal LLM based on task classification.

| Capability | 📊 Google Gemini | 🧠 OpenAI ChatGPT | 🛡️ Anthropic Claude |
| :--- | :--- | :--- | :--- |
| **Core Specialty** | Native Multimodality & Live Web Search | Logic, Coding & Chain-of-Thought | Analytical Writing & Complex Document Comprehension |
| **Context Window** | Ultra-Large (2M+ Tokens) | Standard / High Reasoning | High Capacity (200k+ Tokens) |
| **Best For** | Live web research, video/photo analysis, Google ecosystem integration | Complex algorithm synthesis, debug loops, multi-step agent planning | Long-form technical documentation, security auditing, clear human prose |
| **Training Philosophy** | Multimodal end-to-end alignment | Reinforcement Learning from Human Feedback (RLHF) | Constitutional AI (Self-correction rules) |

### 3.1 Dynamic Dispatch Rule Engine
1. **Vision / Web Search Queries**: Dispatched to **Gemini**.
2. **Coding / Math / Technical Debugging**: Dispatched to **ChatGPT** / **DeepSeek-R1**.
3. **Document Auditing / Prose Synthesis / Security**: Dispatched to **Claude**.
