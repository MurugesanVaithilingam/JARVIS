/* ================================================================
   J.A.R.V.I.S. BOSS TAMIL NEURAL MATRIX v9.0 (Always-On Heartbeat Engine)
   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   ✅ Natural Tamil Conversational Replies:
      - "தமிழ்ல பேச முடியுமா?" ➔ "ஆமாம் பாஸ்! என்னால் தமிழில் பேச முடியும்!"
      - "எப்படி இருக்கே?" ➔ "நான் நல்லா இருக்கேன் பாஸ்!"
      - "என்ன பண்ற?" ➔ "உங்களுக்கான AI சிஸ்டம்களைக் கண்காணிக்கிறேன் பாஸ்!"
      - "வானிலை என்ன?" ➔ "இன்றைய வானிலை 31°C வெப்பநிலையுடன் தெளிவாக உள்ளது பாஸ்!"
   ✅ App Open Confirmation: "ஓப்பன் பண்ணிட்டேன் பாஸ்!"
   ✅ Persistent Heartbeat Watchdog — Microphone NEVER stops or goes offline!
   ✅ Zero "Backup mode" announcements
   ================================================================ */

(function () {
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;

  // ── State ─────────────────────────────────────────────────────
  let recognition   = null;
  let isListening   = false;
  let voiceMode     = false;
  let isSpeaking    = false;
  let audioUnlocked = false;
  let audio         = null;
  let restartTimer  = null;
  let ttsWatchdog   = null;

  // ── Multi-Language Wake Words ──────────────────────────────────
  const WAKE_WORDS = [
    'jarvis', 'jervis', 'jarvez', 'charvis', 'ஜார்விஸ்', 'ஜாவிஸ்',
    'hey jarvis', 'hi jarvis', 'ok jarvis', 'boss', 'பாஸ்',
    'karen', 'chitti', 'friday', 'edith', 'stark'
  ];

  function containsWakeWord(lower) {
    return WAKE_WORDS.some(w => lower.includes(w));
  }

  // ── Desktop Daemon Execution Helper (port 8765) ────────────────
  function execDesktopCmd(cmdName) {
    fetch(`http://localhost:8765/run?cmd=${encodeURIComponent(cmdName)}`, { mode: 'cors' })
      .then(r => r.json())
      .then(d => console.log('[JARVIS DAEMON]', d))
      .catch(e => console.warn('[JARVIS DAEMON Offline fallback]', e));
  }

  // ── Unlock Audio Context on first interaction ──────────────────
  function unlockAudio() {
    if (audioUnlocked) return;
    try {
      if (window.speechSynthesis) {
        window.speechSynthesis.cancel();
        const u = new SpeechSynthesisUtterance('');
        u.volume = 0;
        window.speechSynthesis.speak(u);
      }
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (AudioCtx) {
        const ctx = new AudioCtx();
        ctx.resume();
      }
      audioUnlocked = true;
    } catch(e) {}
  }
  document.addEventListener('click', unlockAudio, { once: true });
  document.addEventListener('keydown', unlockAudio, { once: true });

  // ── Audio Feedback ─────────────────────────────────────────────
  function playPing(freq = 880) {
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain); gain.connect(ctx.destination);
      osc.type = 'sine'; osc.frequency.value = freq;
      gain.gain.setValueAtTime(0.18, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.35);
      osc.start(ctx.currentTime); osc.stop(ctx.currentTime + 0.35);
    } catch(e) {}
  }

  // ── UI Helpers ─────────────────────────────────────────────────
  function setUI(listening) {
    const btn    = document.getElementById('voiceBtn');
    const micBtn = document.getElementById('micInputBtn');
    const ind    = document.getElementById('voiceInd');
    const bar    = document.getElementById('voiceBar');
    const val    = document.getElementById('voiceVal');

    if (listening) {
      btn?.classList.add('active', 'rec');
      micBtn?.classList.add('rec');
      ind?.classList.add('active');
      if (bar) bar.style.width = '100%';
      if (val) val.textContent = 'LISTENING...';
    } else {
      btn?.classList.remove('rec');
      micBtn?.classList.remove('rec');
      ind?.classList.remove('active');
    }
  }

  function setWakeUI(on) {
    const btn = document.getElementById('voiceBtn');
    const val = document.getElementById('voiceVal');
    const bar = document.getElementById('voiceBar');
    if (on) {
      btn?.classList.add('active');
      if (val) val.textContent = 'VOICE LIVE';
      if (bar) bar.style.width = '100%';
    } else {
      btn?.classList.remove('active', 'rec');
      if (val) val.textContent = 'OFF';
      if (bar) bar.style.width = '0%';
    }
  }

  // ── Main Voice Engine ──────────────────────────────────────────
  window.JarvisVoice = {
    isSupported() { return !!SR; },
    isEnabled()   { return voiceMode; },
    isSpeaking()  { return isSpeaking; },

    toggle() {
      unlockAudio();
      voiceMode = !voiceMode;

      if (voiceMode) {
        window.JarvisToast?.show('🎙️ J.A.R.V.I.S. Voice Engine Live — Listening continuous...', 'success', 4000);
        setWakeUI(true);
        playPing(880);
        this._startListening();
      } else {
        window.JarvisToast?.show('Voice Mode Off.', 'info');
        setWakeUI(false);
        setUI(false);
        this._stop();
        this._stopSpeech();
      }
    },

    listenOnce() {
      unlockAudio();
      if (!voiceMode) {
        this.toggle();
      } else {
        playPing(1100);
        this._startListening();
      }
    },

    _startListening() {
      if (!SR) return;
      if (isListening) return;
      if (isSpeaking) {
        setTimeout(() => this._startListening(), 200);
        return;
      }

      clearTimeout(restartTimer);

      try {
        if (recognition) {
          recognition.onresult = null;
          recognition.onend = null;
          recognition.onerror = null;
          try { recognition.abort(); } catch(e) {}
        }
      } catch(e) {}

      recognition = new SR();
      recognition.lang = 'en-US';
      recognition.continuous = false;
      recognition.interimResults = true;
      recognition.maxAlternatives = 1;

      let finalTranscript = '';

      recognition.onresult = (e) => {
        // User interruption (Barge-in): Stop JARVIS speaking as soon as user talks
        if (isSpeaking) {
          this._stopSpeech();
        }

        let interim = '';
        for (let i = e.resultIndex; i < e.results.length; ++i) {
          const t = e.results[i][0].transcript;
          if (e.results[i].isFinal) {
            finalTranscript += t;
          } else {
            interim += t;
          }
        }

        const interimDisplay = finalTranscript || interim;
        const inp = document.getElementById('chatInput');
        if (inp && interimDisplay) {
          inp.value = interimDisplay;
          inp.style.height = 'auto';
          inp.style.height = Math.min(inp.scrollHeight, 120) + 'px';
        }
      };

      recognition.onend = () => {
        isListening = false;
        setUI(false);

        const text = finalTranscript.trim();
        finalTranscript = '';

        if (text.length > 0) {
          this._handleInput(text);
        } else if (voiceMode && !isSpeaking) {
          restartTimer = setTimeout(() => this._startListening(), 100);
        }
      };

      recognition.onerror = (e) => {
        isListening = false;
        if (e.error === 'not-allowed' || e.error === 'service-not-allowed') {
          window.JarvisToast?.show('🚫 Microphone blocked! Allow microphone access in your browser address bar.', 'error', 8000);
          voiceMode = false;
          setWakeUI(false);
          return;
        }
        if (voiceMode && !isSpeaking) {
          restartTimer = setTimeout(() => this._startListening(), 200);
        }
      };

      try {
        recognition.start();
        isListening = true;
        setUI(true);
      } catch(e) {
        isListening = false;
        if (voiceMode && !isSpeaking) {
          restartTimer = setTimeout(() => this._startListening(), 250);
        }
      }
    },

    // ── Handle recognized speech ───────────────────────────────────
    _handleInput(raw) {
      if (!raw || raw.trim().length === 0) return;

      const lower = raw.toLowerCase()
                       .replace(/[^a-z0-9\s]/g, '')
                       .replace(/\s+/g, ' ')
                       .trim();
      const inp = document.getElementById('chatInput');

      if (!voiceMode) {
        voiceMode = true;
        setWakeUI(true);
      }

      // ── 1. Respectful Boss Persona Greeting ("Jarvis" / "ஜார்விஸ்") ─
      const isPureWakeWord = containsWakeWord(lower) && lower.split(' ').length <= 2;
      if (isPureWakeWord) {
        const replyText = "சொல்லுங்க பாஸ், உங்களுக்கு என்ன வேணும்? நான் செய்ய காத்திருக்கிறேன்!";
        if (inp) inp.value = raw;
        window.JarvisApp?.appendDirectMessage('ai', replyText);
        this.speak('Solloonga Boss, ungalukku enna venum? Naan seyya kaathirukiren!', () => { if (voiceMode) this._startListening(); }, true);
        return;
      }

      // ── 2. Natural Tamil Conversational Answers ──────────────────
      if (lower.includes('tamil') && (lower.includes('pesa') || lower.includes('mudiyuma') || lower.includes('speak'))) {
        const replyText = "ஆமாம் பாஸ்! என்னால் தமிழில் தெளிவாகப் பேசவும் புரிந்துகொள்ளவும் முடியும்! தமிழ், ஆங்கிலம், இந்தி என பல மொழிகள் எனக்குத் தெரியும். உங்களுக்கு என்ன செய்ய வேண்டும் சொல்லுங்க பாஸ்!";
        if (inp) inp.value = raw;
        window.JarvisApp?.appendDirectMessage('ai', replyText);
        this.speak('Aamaam Boss! Ennaal Tamil-il thelivaga pesa mudiyum! Ungalukku enna venum solloonga Boss!', () => { if (voiceMode) this._startListening(); }, true);
        return;
      }

      if (lower.includes('eppadi irukke') || lower.includes('how are you') || lower.includes('how r u')) {
        const replyText = "நான் நல்லா இருக்கேன் பாஸ்! ஸ்டார்க் சிஸ்டம்ஸ் எல்லாமே 100% ஆன்லைனில் இயங்குகிறது. நீங்க எப்படி இருக்கீங்க பாஸ்?";
        if (inp) inp.value = raw;
        window.JarvisApp?.appendDirectMessage('ai', replyText);
        this.speak('Naan nalla irukken Boss! Stark systems 100% online-il irukku! Neenga eppadi irukkeenga Boss?', () => { if (voiceMode) this._startListening(); }, true);
        return;
      }

      if (lower.includes('enna panre') || lower.includes('what are you doing') || lower.includes('enna panro')) {
        const replyText = "உங்களுக்கான AI சிஸ்டம்களைக் கண்காணித்துக் கொண்டிருக்கிறேன் பாஸ்! அடுத்து என்ன கட்டளை செயல்படுத்தணும் சொல்லுங்க பாஸ்!";
        if (inp) inp.value = raw;
        window.JarvisApp?.appendDirectMessage('ai', replyText);
        this.speak('Ungalukana AI systems-a kaanhaanithuk kondu irukken Boss! Aduthu enna command seyyanum solloonga Boss!', () => { if (voiceMode) this._startListening(); }, true);
        return;
      }

      if (lower.includes('weather') || lower.includes('vanilai')) {
        const replyText = "இன்றைய வானிலை 31°C வெப்பநிலையுடன் தெளிவாக உள்ளது பாஸ்!";
        if (inp) inp.value = raw;
        window.JarvisApp?.appendDirectMessage('ai', replyText);
        this.speak('Inraiya vanilai 31 degree Celsius veppanilayudan thelivaga ullathu Boss!', () => { if (voiceMode) this._startListening(); }, true);
        return;
      }

      if (lower.includes('language') || lower.includes('languages') || lower.includes('mozhi')) {
        const replyText = "எனக்கு தமிழ், ஆங்கிலம், இந்தி, பிரெஞ்சு, ஜெர்மன் உட்பட பல உலக மொழிகள் மற்றும் Python, Java, JavaScript, PHP போன்ற அனைத்து நிரலாக்க மொழிகளும் தெரியும் பாஸ்!";
        if (inp) inp.value = raw;
        window.JarvisApp?.appendDirectMessage('ai', replyText);
        this.speak('Enakku Tamil, English, Hindi matrum Python, Java, JavaScript, PHP ellam theriyum Boss!', () => { if (voiceMode) this._startListening(); }, true);
        return;
      }

      // ── 3. Native Windows File Explorer Launcher ──────────────────
      if (lower.includes('explorer') || lower.includes('file explorer') || lower.includes('my computer') || lower.includes('open files') || lower === 'files' || lower === 'c drive') {
        const reply = `📁 **ஓப்பன் பண்ணிட்டேன் பாஸ்! Opening Windows File Explorer (C:\\)**...\n<a href="file:///C:/" target="_blank" style="color:var(--c1);font-weight:bold;text-decoration:underline;">Click Here to Open C:\\ Drive in Browser</a>`;
        window.JarvisApp?.appendDirectMessage('ai', reply);
        this.speak('Open pannitten Boss! Opening Windows File Explorer on your computer screen.', () => { if (voiceMode) this._startListening(); }, true);
        execDesktopCmd('explorer');
        window.JarvisAgentEngine?.launchApp('explorer');
        try { window.open('file:///C:/', '_blank'); } catch(e){}
        return;
      }

      // ── 4. Native Windows Bluetooth ON & Control Panel ────────────
      if (lower.includes('bluetooth') || lower.includes('blue tooth')) {
        const reply = `📡 **ஓப்பன் பண்ணிட்டேன் பாஸ்! Activating Bluetooth Radio & Device Panel**...\n<a href="ms-settings:bluetooth" target="_blank" style="color:var(--c1);font-weight:bold;text-decoration:underline;">Click Here to Open Settings Panel Directly</a>`;
        window.JarvisApp?.appendDirectMessage('ai', reply);
        this.speak('Open pannitten Boss! Activating Bluetooth radio and opening Bluetooth device settings on your computer.', () => { if (voiceMode) this._startListening(); }, true);
        execDesktopCmd('bluetooth');
        window.JarvisAgentEngine?.launchApp('bluetooth');
        try { window.location.href = 'ms-settings:bluetooth'; } catch(e){}
        return;
      }

      // ── 5. Call / Contact Suresh Launcher (Gemini Style) ──────────
      if (lower.includes('call') || lower.includes('suresh') || lower.includes('contact') || lower.includes('phone')) {
        const name = lower.includes('suresh') ? 'Suresh' : 'Contact';
        const reply = `📞 **Initiating Call / Contact Telemetry for ${name}**...\n<a href="https://web.whatsapp.com" target="_blank" style="color:var(--c1);font-weight:bold;text-decoration:underline;">Click to Call via WhatsApp Web</a> | <a href="tel:+919876543210" style="color:var(--c1);font-weight:bold;text-decoration:underline;">Direct Mobile Call</a>`;
        window.JarvisApp?.appendDirectMessage('ai', reply);
        this.speak(`Initiating contact call telemetry for ${name}, Boss.`, () => { if (voiceMode) this._startListening(); }, true);
        return;
      }

      // ── 6. Open WhatsApp (Gemini Style) ───────────────────────────
      if (lower.includes('whatsapp')) {
        const reply = `📱 **ஓப்பன் பண்ணிட்டேன் பாஸ்! Opening WhatsApp Web**...\n<a href="https://web.whatsapp.com" target="_blank" style="color:var(--c1);font-weight:bold;text-decoration:underline;">Click Here if Blocked</a>`;
        window.JarvisApp?.appendDirectMessage('ai', reply);
        this.speak('Open pannitten Boss! Opening WhatsApp Web.', () => { if (voiceMode) this._startListening(); }, true);
        window.open('https://web.whatsapp.com', '_blank');
        return;
      }

      // ── 7. Open Instagram (Gemini Style) ──────────────────────────
      if (lower.includes('instagram')) {
        const reply = `📸 **ஓப்பன் பண்ணிட்டேன் பாஸ்! Opening Instagram**...\n<a href="https://instagram.com" target="_blank" style="color:var(--c1);font-weight:bold;text-decoration:underline;">Click Here if Blocked</a>`;
        window.JarvisApp?.appendDirectMessage('ai', reply);
        this.speak('Open pannitten Boss! Opening Instagram.', () => { if (voiceMode) this._startListening(); }, true);
        window.open('https://instagram.com', '_blank');
        return;
      }

      // ── 8. Open Facebook (Gemini Style) ───────────────────────────
      if (lower.includes('facebook')) {
        const reply = `🌐 **ஓப்பன் பண்ணிட்டேன் பாஸ்! Opening Facebook**...\n<a href="https://facebook.com" target="_blank" style="color:var(--c1);font-weight:bold;text-decoration:underline;">Click Here if Blocked</a>`;
        window.JarvisApp?.appendDirectMessage('ai', reply);
        this.speak('Open pannitten Boss! Opening Facebook.', () => { if (voiceMode) this._startListening(); }, true);
        window.open('https://facebook.com', '_blank');
        return;
      }

      // ── 9. Open Gmail / Email (Gemini Style) ──────────────────────
      if (lower.includes('gmail') || lower.includes('email') || lower.includes('mail')) {
        const reply = `✉️ **ஓப்பன் பண்ணிட்டேன் பாஸ்! Opening Gmail Inbox**...\n<a href="https://mail.google.com" target="_blank" style="color:var(--c1);font-weight:bold;text-decoration:underline;">Click Here to Open Gmail</a>`;
        window.JarvisApp?.appendDirectMessage('ai', reply);
        this.speak('Open pannitten Boss! Opening Gmail Inbox.', () => { if (voiceMode) this._startListening(); }, true);
        window.open('https://mail.google.com', '_blank');
        return;
      }

      // ── 10. Open Google Maps / Navigation (Gemini Style) ──────────
      if (lower.includes('maps') || lower.includes('google maps') || lower.includes('navigation')) {
        const reply = `🗺️ **ஓப்பன் பண்ணிட்டேன் பாஸ்! Opening Google Maps Navigation**...\n<a href="https://maps.google.com" target="_blank" style="color:var(--c1);font-weight:bold;text-decoration:underline;">Click Here to Open Maps</a>`;
        window.JarvisApp?.appendDirectMessage('ai', reply);
        this.speak('Open pannitten Boss! Opening Google Maps Navigation.', () => { if (voiceMode) this._startListening(); }, true);
        window.open('https://maps.google.com', '_blank');
        return;
      }

      // ── 11. Yesterday & Recent Saved Files Inspector ──────────────
      if (lower.includes('nethu') || lower.includes('yesterday') || lower.includes('recent files') || lower.includes('recently saved') || lower.includes('save panna')) {
        const replyText = "Scanning workspace files saved or modified yesterday, Boss...";
        window.JarvisApp?.appendDirectMessage('ai', replyText);
        this.speak('Fetching files saved or modified yesterday, Boss.', () => { if (voiceMode) this._startListening(); }, true);

        fetch('jarvis_executor.php', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'get_recent_files' })
        }).then(r => r.json()).then(data => {
          if (data.status === 'success') {
            if (!data.files || data.files.length === 0) {
              window.JarvisApp?.appendDirectMessage('ai', '📁 No files were modified in the last 24-48 hours.');
              return;
            }
            let fileListMd = `📅 **FILES SAVED / MODIFIED RECENTLY (${data.count} Files)**:\n\n`;
            data.files.forEach(f => {
              fileListMd += `- **${f.name}** (${f.size}) — *${f.modified}* ${f.is_yesterday ? '🗓️ **[YESTERDAY]**' : ''}\n`;
            });
            window.JarvisApp?.appendDirectMessage('ai', fileListMd);
          }
        }).catch(err => console.error('Recent files error:', err));
        return;
      }

      // ── 12. Open Web & Module Commands ────────────────────────────
      const isChatGPT = lower.includes('chatgpt') || lower.includes('chat gpt') || lower.replace(/\s+/g,'').includes('openchatgpt') || lower.includes('open gpt');
      if (isChatGPT) {
        const reply = `🌐 **ஓப்பன் பண்ணிட்டேன் பாஸ்! Opening ChatGPT**... <a href="https://chatgpt.com" target="_blank" style="color:var(--c1);font-weight:bold;text-decoration:underline;">Click Here if Blocked</a>`;
        window.JarvisApp?.appendDirectMessage('ai', reply);
        this.speak('Open pannitten Boss! Opening ChatGPT.', () => { if (voiceMode) this._startListening(); }, true);
        window.open('https://chatgpt.com', '_blank');
        return;
      }

      if (lower.includes('open google')) {
        const reply = `🌐 **ஓப்பன் பண்ணிட்டேன் பாஸ்! Opening Google**... <a href="https://google.com" target="_blank" style="color:var(--c1);font-weight:bold;text-decoration:underline;">Click Here if Blocked</a>`;
        window.JarvisApp?.appendDirectMessage('ai', reply);
        this.speak('Open pannitten Boss! Opening Google.', () => { if (voiceMode) this._startListening(); }, true);
        window.open('https://google.com', '_blank');
        return;
      }

      if (lower.includes('open youtube')) {
        const reply = `🌐 **ஓப்பன் பண்ணிட்டேன் பாஸ்! Opening YouTube**... <a href="https://youtube.com" target="_blank" style="color:var(--c1);font-weight:bold;text-decoration:underline;">Click Here if Blocked</a>`;
        window.JarvisApp?.appendDirectMessage('ai', reply);
        this.speak('Open pannitten Boss! Opening YouTube.', () => { if (voiceMode) this._startListening(); }, true);
        window.open('https://youtube.com', '_blank');
        return;
      }

      if (lower.includes('notepad') || lower.includes('calc') || lower.includes('calculator') || lower.includes('chrome')) {
        const appName = lower.includes('notepad') ? 'notepad' : (lower.includes('calc') ? 'calc' : 'chrome');
        this.speak(`Open pannitten Boss! Launching ${appName} on system.`, () => { if (voiceMode) this._startListening(); }, true);
        execDesktopCmd(appName);
        window.JarvisAgentEngine?.launchApp(appName);
        return;
      }

      // ── 13. System Commands ───────────────────────────────────────
      if (lower.includes('clear chat') || lower.includes('clear conversation') || lower.includes('reset chat')) {
        window.JarvisApp?.clearChat();
        this.speak('Conversation cleared, Boss.', () => { if (voiceMode) this._startListening(); }, true);
        return;
      }

      // ── 14. Send to AI Engine and Auto-Submit! ────────────────────
      if (inp && raw.length > 0) {
        inp.value = raw;
        window.JarvisApp?.sendMessage(true);
      } else if (voiceMode) {
        this._startListening();
      }
    },

    _stop() {
      clearTimeout(restartTimer);
      clearTimeout(ttsWatchdog);
      isListening = false;
      try { recognition?.abort(); } catch(e) {}
    },

    _stopSpeech() {
      clearTimeout(ttsWatchdog);
      if (audio) { try { audio.pause(); } catch(e) {} audio = null; }
      try { window.speechSynthesis?.cancel(); } catch(e) {}
      isSpeaking = false;
    },

    // ── TTS: Instant Speak text aloud (< 0.1s delay) ───────────────
    async speak(text, onFinished, force = false) {
      if (!text) {
        isSpeaking = false;
        if (onFinished) onFinished();
        else if (voiceMode) this._startListening();
        return;
      }

      isSpeaking = true;
      this._stop();
      this._stopSpeech();

      const elKey   = window.JarvisSettings?.getELKey?.();
      const elVoice = window.JarvisSettings?.getELVoice?.();

      let finishedFired = false;
      const done = () => {
        if (finishedFired) return;
        finishedFired = true;
        clearTimeout(ttsWatchdog);
        isSpeaking = false;
        if (onFinished) onFinished();
        else if (voiceMode) setTimeout(() => this._startListening(), 100);
      };

      const estimatedDuration = Math.max(1200, Math.min(12000, text.length * 60));
      ttsWatchdog = setTimeout(done, estimatedDuration);

      if (elKey && elVoice) {
        await this._speakEL(text, elKey, elVoice, done);
      } else {
        this._speakBrowser(text, done);
      }
    },

    // ElevenLabs TTS
    async _speakEL(text, key, voiceId, onFinished) {
      try {
        const res = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'xi-api-key': key },
          body: JSON.stringify({ text, model_id: 'eleven_monolingual_v1', voice_settings: { stability: 0.75, similarity_boost: 0.85 } }),
        });
        if (!res.ok) throw new Error('EL error');
        const blob = await res.blob();
        const url  = URL.createObjectURL(blob);
        audio = new Audio(url);
        audio.play();
        audio.onended = () => { URL.revokeObjectURL(url); audio = null; onFinished(); };
        audio.onerror = () => { audio = null; this._speakBrowser(text, onFinished); };
      } catch(e) {
        this._speakBrowser(text, onFinished);
      }
    },

    // Instant Browser TTS — Truncates to short crisp voice & cancels stale audio queue
    _speakBrowser(text, onFinished) {
      if (!window.speechSynthesis) { onFinished(); return; }

      let clean = text.replace(/<[^>]*>/g, '')
                      .replace(/[`*#_~\[\]]/g, '')
                      .replace(/\s+/g, ' ')
                      .trim();

      if (clean.length > 180) {
        const parts = clean.split(/(?<=[.!?])\s+/);
        clean = (parts[0] + (parts[1] ? ' ' + parts[1] : '')).slice(0, 180);
      }

      if (!clean) { onFinished(); return; }

      try { window.speechSynthesis.cancel(); } catch(e) {}

      setTimeout(() => {
        try { window.speechSynthesis.resume(); } catch(e) {}

        const utt    = new SpeechSynthesisUtterance(clean);
        const voices = window.speechSynthesis.getVoices();

        const savedVoiceName = localStorage.getItem('jarvis_browser_voice') || '';
        let preferred = savedVoiceName ? voices.find(v => v.name === savedVoiceName) : null;

        if (!preferred) {
          const persona = window.JarvisActivePersona;
          if (persona?.id === 'karen' || persona?.id === 'friday' || persona?.id === 'aria') {
            preferred = voices.find(v => v.name.toLowerCase().includes('samantha'))
                     || voices.find(v => v.name.toLowerCase().includes('zira'))
                     || voices.find(v => v.name.toLowerCase().includes('female'))
                     || voices.find(v => v.lang === 'en-US');
            utt.pitch = 1.15; utt.rate = 1.0;
          } else if (persona?.id === 'chitti') {
            preferred = voices.find(v => v.lang === 'ta-IN')
                     || voices.find(v => v.lang === 'en-IN')
                     || voices.find(v => v.lang === 'hi-IN');
            utt.pitch = 1.2; utt.rate = 1.05;
          } else {
            preferred = voices.find(v => v.name.toLowerCase().includes('daniel') && v.lang === 'en-GB')
                     || voices.find(v => v.name.toLowerCase().includes('british'))
                     || voices.find(v => v.lang === 'en-GB')
                     || voices.find(v => v.name.toLowerCase().includes('microsoft david'))
                     || voices.find(v => v.lang === 'en-US');
            utt.pitch = 0.85; utt.rate = 1.0;
          }
        }

        if (preferred) utt.voice = preferred;
        utt.volume = 1.0;
        utt.onend  = onFinished;
        utt.onerror = onFinished;

        if (voices.length === 0) {
          window.speechSynthesis.onvoiceschanged = () => {
            window.speechSynthesis.onvoiceschanged = null;
            window.speechSynthesis.speak(utt);
          };
        } else {
          window.speechSynthesis.speak(utt);
        }
      }, 40);
    },
  };

  // ── Persistent Heartbeat Watchdog — Microphone Never Dies ──────
  setInterval(() => {
    if (voiceMode && !isListening && !isSpeaking) {
      window.JarvisVoice._startListening();
    }
  }, 1200);

  // ── Auto-Start Voice Listening Engine on DOM Ready & Gesture ────
  document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('voiceBtn')?.addEventListener('click', () => {
      window.JarvisVoice.toggle();
    });
    document.getElementById('micInputBtn')?.addEventListener('click', () => {
      window.JarvisVoice.listenOnce();
    });

    setTimeout(() => {
      if (!voiceMode) {
        voiceMode = true;
        setWakeUI(true);
        window.JarvisVoice._startListening();
      }
    }, 600);

    const autoActivate = () => {
      unlockAudio();
      if (!voiceMode) {
        voiceMode = true;
        setWakeUI(true);
      }
      window.JarvisVoice._startListening();
    };

    window.addEventListener('click', autoActivate, { once: true });
    window.addEventListener('keydown', autoActivate, { once: true });
    window.addEventListener('touchstart', autoActivate, { once: true });
  });

})();
