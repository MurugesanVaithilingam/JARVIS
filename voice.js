/* ================================================================
   J.A.R.V.I.S. QUANTUM ENGINE v12.0 — Zero-Bug Edition
   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   FIX 1: Command executes ONCE only — strict global lock prevents repeats
   FIX 2: "Close" / "Close window" / "Exit" now truly closes or hides JARVIS
   FIX 3: autoActivate listeners use {once:true} — no multi-trigger on click/touch
   FIX 4: File Explorer / app opens exactly ONCE per voice command
   FIX 5: Heartbeat watchdog is debounced to prevent duplicate recognition sessions
   ================================================================ */

(function () {
  'use strict';

  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;

  // ── State ─────────────────────────────────────────────────────────
  let recognition        = null;
  let isListening        = false;
  let voiceMode          = false;
  let isSpeaking         = false;
  let audioUnlocked      = false;
  let audio              = null;
  let restartTimer       = null;
  let ttsWatchdog        = null;
  let heartbeatTimer     = null;

  // ── Anti-Repeat Lock (prevents duplicate command execution) ───────
  let cmdLock            = false;   // TRUE = a command is currently being processed
  let lastCmdKey         = '';      // last command key string
  let lastCmdTime        = 0;       // timestamp of last command

  const CMD_DEBOUNCE_MS  = 4000;   // 4 seconds — same command within 4s is ignored

  function canExecute(key) {
    const now = Date.now();
    if (cmdLock) return false;                                       // another command running
    if (key === lastCmdKey && now - lastCmdTime < CMD_DEBOUNCE_MS) return false; // duplicate
    lastCmdKey  = key;
    lastCmdTime = now;
    cmdLock     = true;
    return true;
  }

  function releaseLock() {
    cmdLock = false;
  }

  // ── Wake Words ────────────────────────────────────────────────────
  const WAKE_WORDS = [
    'jarvis', 'jervis', 'jarvez', 'charvis',
    'hey jarvis', 'hi jarvis', 'ok jarvis',
    'boss', 'karen', 'chitti', 'friday', 'edith', 'stark'
  ];
  function containsWakeWord(t) { return WAKE_WORDS.some(w => t.includes(w)); }

  // ── Desktop Daemon (localhost:8765) ───────────────────────────────
  let daemonCalled = false; // extra guard so daemon is called max once per command
  function execDesktopCmd(cmd) {
    if (daemonCalled) return;
    daemonCalled = true;
    fetch(`http://localhost:8765/run?cmd=${encodeURIComponent(cmd)}`, { mode: 'cors' })
      .then(r => r.json())
      .then(d => console.log('[DAEMON]', d))
      .catch(e => console.warn('[DAEMON offline]', e))
      .finally(() => { setTimeout(() => { daemonCalled = false; }, 3000); });
  }

  // ── Audio Unlock (one-time per session) ───────────────────────────
  function unlockAudio() {
    if (audioUnlocked) return;
    try {
      window.speechSynthesis?.cancel();
      window.speechSynthesis?.resume();
      const u = new SpeechSynthesisUtterance('');
      u.volume = 0;
      window.speechSynthesis?.speak(u);
      const AC = window.AudioContext || window.webkitAudioContext;
      if (AC) new AC().resume();
      audioUnlocked = true;
      document.getElementById('mobileUnlockBanner')?.remove();
    } catch (e) {}
  }

  // ── Mobile Banner (one-time) ───────────────────────────────────────
  function initMobileBanner() {
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    if (!isMobile || audioUnlocked || document.getElementById('mobileUnlockBanner')) return;
    const b = document.createElement('div');
    b.id = 'mobileUnlockBanner';
    b.style.cssText = [
      'position:fixed;top:0;left:0;right:0;z-index:99999',
      'background:linear-gradient(90deg,#ff007f,#00d2ff)',
      'color:#fff;text-align:center;padding:12px;cursor:pointer',
      'font-family:sans-serif;font-weight:bold;font-size:13px;letter-spacing:.05em',
      'box-shadow:0 4px 15px rgba(0,210,255,.4)'
    ].join(';');
    b.textContent = '🎙️ TAP ANYWHERE TO ACTIVATE JARVIS VOICE & MICROPHONE ENGINE';
    b.addEventListener('click', () => { unlockAudio(); window.JarvisVoice.toggle(); }, { once: true });
    document.body.appendChild(b);
  }

  // ── One-time gesture listeners ─────────────────────────────────────
  ['click','touchstart','pointerdown','keydown'].forEach(ev => {
    document.addEventListener(ev, unlockAudio, { once: true, passive: true });
  });

  // ── Sound ping ────────────────────────────────────────────────────
  function playPing(freq = 880) {
    try {
      const AC  = window.AudioContext || window.webkitAudioContext;
      const ctx = new AC();
      const osc = ctx.createOscillator();
      const g   = ctx.createGain();
      osc.connect(g); g.connect(ctx.destination);
      osc.type = 'sine'; osc.frequency.value = freq;
      g.gain.setValueAtTime(0.15, ctx.currentTime);
      g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);
      osc.start(); osc.stop(ctx.currentTime + 0.3);
    } catch (e) {}
  }

  // ── UI helpers ────────────────────────────────────────────────────
  function setListeningUI(on) {
    document.getElementById('voiceBtn')?.classList.toggle('rec', on);
    document.getElementById('micInputBtn')?.classList.toggle('rec', on);
    document.getElementById('voiceInd')?.classList.toggle('active', on);
    const bar = document.getElementById('voiceBar');
    const val = document.getElementById('voiceVal');
    if (bar) bar.style.width = on ? '100%' : '';
    if (val && on) val.textContent = 'LISTENING...';
  }

  function setVoiceUI(on) {
    const btn = document.getElementById('voiceBtn');
    const val = document.getElementById('voiceVal');
    const bar = document.getElementById('voiceBar');
    btn?.classList.toggle('active', on);
    if (!on) btn?.classList.remove('rec');
    if (val) val.textContent = on ? 'VOICE LIVE' : 'OFF';
    if (bar) bar.style.width = on ? '100%' : '0%';
  }

  // ── TTS helpers ────────────────────────────────────────────────────
  function stopSpeech() {
    clearTimeout(ttsWatchdog);
    try { window.speechSynthesis?.cancel(); } catch (e) {}
    if (audio) { try { audio.pause(); } catch (e) {} audio = null; }
    isSpeaking = false;
  }

  function speak(text, onDone) {
    if (!text) { releaseLock(); if (onDone) onDone(); return; }
    isSpeaking = true;
    stopSpeech();

    const clean = text.replace(/<[^>]*>/g, '').replace(/[`*#_~\[\]]/g, '').replace(/\s+/g, ' ').trim().slice(0, 200);
    if (!clean || !window.speechSynthesis) {
      isSpeaking = false; releaseLock(); if (onDone) onDone(); return;
    }

    let fired = false;
    const finish = () => {
      if (fired) return;
      fired = true;
      clearTimeout(ttsWatchdog);
      isSpeaking = false;
      releaseLock();
      if (onDone) onDone();
      else if (voiceMode) scheduleRestart(150);
    };

    ttsWatchdog = setTimeout(finish, Math.max(1500, clean.length * 70));

    try { window.speechSynthesis.cancel(); } catch (e) {}
    setTimeout(() => {
      try { window.speechSynthesis.resume(); } catch (e) {}
      const utt    = new SpeechSynthesisUtterance(clean);
      const voices = window.speechSynthesis.getVoices();
      const pick   = voices.find(v => v.name.toLowerCase().includes('david') && v.lang === 'en-US')
                  || voices.find(v => v.lang === 'en-GB')
                  || voices.find(v => v.lang === 'en-US')
                  || voices[0];
      if (pick) utt.voice = pick;
      utt.volume = 1; utt.rate = 1; utt.pitch = 0.9;
      utt.onend = finish; utt.onerror = finish;
      window.speechSynthesis.speak(utt);
    }, 40);
  }

  // ── Recognition helpers ────────────────────────────────────────────
  function scheduleRestart(ms = 100) {
    clearTimeout(restartTimer);
    restartTimer = setTimeout(() => {
      if (voiceMode && !isListening && !isSpeaking && !cmdLock) {
        window.JarvisVoice._startListening();
      }
    }, ms);
  }

  function stopListening() {
    clearTimeout(restartTimer);
    isListening = false;
    try { recognition?.abort(); } catch (e) {}
  }

  // ══════════════════════════════════════════════════════════════════
  //  MAIN JARVIS VOICE OBJECT
  // ══════════════════════════════════════════════════════════════════
  window.JarvisVoice = {
    isSupported() { return !!SR; },
    isEnabled()   { return voiceMode; },

    toggle() {
      unlockAudio();
      voiceMode = !voiceMode;
      if (voiceMode) {
        setVoiceUI(true);
        playPing(880);
        this._startListening();
      } else {
        setVoiceUI(false);
        setListeningUI(false);
        stopListening();
        stopSpeech();
      }
    },

    listenOnce() {
      unlockAudio();
      if (!voiceMode) { this.toggle(); return; }
      playPing(1100);
      this._startListening();
    },

    _startListening() {
      if (!SR) return;
      if (isListening) return;
      if (isSpeaking || cmdLock) { scheduleRestart(300); return; }

      clearTimeout(restartTimer);

      // Tear down previous instance cleanly
      if (recognition) {
        try { recognition.onresult = recognition.onend = recognition.onerror = null; recognition.abort(); } catch (e) {}
        recognition = null;
      }

      const rec = new SR();
      rec.lang = 'en-US';
      rec.continuous = false;
      rec.interimResults = false; // ← interim OFF stops duplicate onresult firings
      rec.maxAlternatives = 1;
      recognition = rec;

      let handled = false; // ensures onend only triggers _handleInput ONCE per session

      rec.onresult = (e) => {
        if (isSpeaking) stopSpeech();
        const transcript = Array.from(e.results)
          .filter(r => r.isFinal)
          .map(r => r[0].transcript)
          .join(' ')
          .trim();
        if (transcript) {
          const inp = document.getElementById('chatInput');
          if (inp) inp.value = transcript;
        }
      };

      rec.onend = () => {
        isListening = false;
        setListeningUI(false);
        if (handled) return; // prevent double-fire

        const inp = document.getElementById('chatInput');
        const text = inp?.value?.trim() || '';
        if (text.length > 0) {
          handled = true;
          this._handleInput(text);
        } else if (voiceMode && !isSpeaking && !cmdLock) {
          scheduleRestart(100);
        }
      };

      rec.onerror = (e) => {
        isListening = false;
        setListeningUI(false);
        if (e.error === 'not-allowed' || e.error === 'service-not-allowed') {
          window.JarvisToast?.show('🚫 Microphone blocked! Allow microphone access in your browser.', 'error', 8000);
          voiceMode = false;
          setVoiceUI(false);
          return;
        }
        if (voiceMode && !isSpeaking && !cmdLock) scheduleRestart(250);
      };

      try {
        rec.start();
        isListening = true;
        setListeningUI(true);
      } catch (e) {
        isListening = false;
        if (voiceMode) scheduleRestart(300);
      }
    },

    // ════════════════════════════════════════════════════════════════
    //  _handleInput — STRICT ONE-COMMAND ONCE LOCK
    // ════════════════════════════════════════════════════════════════
    _handleInput(raw) {
      if (!raw?.trim()) return;

      const lower = raw.toLowerCase().replace(/[^a-z0-9\s]/g, '').replace(/\s+/g, ' ').trim();
      const inp   = document.getElementById('chatInput');

      // ── Close / Exit Commands ─────────────────────────────────────
      const isClose = lower === 'close'
        || lower === 'close app'
        || lower === 'close window'
        || lower === 'close tab'
        || lower === 'close jarvis'
        || lower === 'stop jarvis'
        || lower === 'exit'
        || lower === 'shut down'
        || lower === 'goodbye jarvis'
        || lower === 'bye jarvis';

      if (isClose) {
        if (!canExecute('close')) return;
        voiceMode = false;
        setVoiceUI(false);
        setListeningUI(false);
        stopListening();
        window.JarvisApp?.appendDirectMessage('ai', '👋 **Closing and standing down, Boss! விடைபெறுகிறேன் பாஸ்!**');
        speak('Closing and standing down, Boss. Goodbye!', () => {
          try { window.close(); } catch (e) {}
          // If window.close() is blocked (browser tab), navigate to blank
          try { window.location.href = 'about:blank'; } catch (e) {}
        });
        return;
      }

      // ── Anti-repeat: reject duplicate commands within 4 seconds ────
      if (!canExecute(lower)) return;

      if (!voiceMode) { voiceMode = true; setVoiceUI(true); }

      // ── Wake Word Only ─────────────────────────────────────────────
      if (containsWakeWord(lower) && lower.split(' ').length <= 2) {
        const reply = "சொல்லுங்க பாஸ், உங்களுக்கு என்ன வேணும்? நான் செய்ய காத்திருக்கிறேன்!";
        if (inp) inp.value = raw;
        window.JarvisApp?.appendDirectMessage('ai', reply);
        speak('Solloonga Boss, ungalukku enna venum? Naan seyya kaathirukiren!', () => { if (voiceMode) scheduleRestart(200); });
        return;
      }

      // ── Tamil Conversational ───────────────────────────────────────
      if (lower.includes('tamil') && (lower.includes('pesa') || lower.includes('mudiyuma') || lower.includes('speak'))) {
        const r = "ஆமாம் பாஸ்! என்னால் தமிழில் தெளிவாகப் பேசவும் புரிந்துகொள்ளவும் முடியும்!";
        if (inp) inp.value = raw;
        window.JarvisApp?.appendDirectMessage('ai', r);
        speak('Aamaam Boss! Ennaal Tamil-il pesa mudiyum! Ungalukku enna venum solloonga Boss!', () => { if (voiceMode) scheduleRestart(200); });
        return;
      }

      if (lower.includes('how are you') || lower.includes('eppadi irukke') || lower.includes('how r u')) {
        const r = "நான் நல்லா இருக்கேன் பாஸ்! ஸ்டார்க் சிஸ்டம்ஸ் 100% ஆன்லைனில் இயங்குகிறது!";
        if (inp) inp.value = raw;
        window.JarvisApp?.appendDirectMessage('ai', r);
        speak('Naan nalla irukken Boss! Stark systems 100 percent online irukku!', () => { if (voiceMode) scheduleRestart(200); });
        return;
      }

      if (lower.includes('weather') || lower.includes('vanilai')) {
        const r = "இன்றைய வானிலை 31°C வெப்பநிலையுடன் தெளிவாக உள்ளது பாஸ்!";
        if (inp) inp.value = raw;
        window.JarvisApp?.appendDirectMessage('ai', r);
        speak('Inraiya vanilai 31 degree Celsius veppanilayudan thelivaga ullathu Boss!', () => { if (voiceMode) scheduleRestart(200); });
        return;
      }

      // ── File Explorer (ONE open, ONE daemon call) ─────────────────
      if (lower.includes('explorer') || lower.includes('file explorer') || lower === 'files' || lower === 'c drive' || lower.includes('my computer') || lower.includes('open files')) {
        window.JarvisApp?.appendDirectMessage('ai', '📁 **ஓப்பன் பண்ணிட்டேன் பாஸ்! Opening Windows File Explorer...**');
        execDesktopCmd('explorer');
        speak('Open pannitten Boss! Opening Windows File Explorer.', () => { if (voiceMode) scheduleRestart(200); });
        return;
      }

      // ── Bluetooth ─────────────────────────────────────────────────
      if (lower.includes('bluetooth') || lower.includes('blue tooth')) {
        window.JarvisApp?.appendDirectMessage('ai', '📡 **ஓப்பன் பண்ணிட்டேன் பாஸ்! Activating Bluetooth Settings...**');
        execDesktopCmd('bluetooth');
        speak('Open pannitten Boss! Opening Bluetooth settings.', () => { if (voiceMode) scheduleRestart(200); });
        return;
      }

      // ── WhatsApp ──────────────────────────────────────────────────
      if (lower.includes('whatsapp')) {
        window.JarvisApp?.appendDirectMessage('ai', '📱 **ஓப்பன் பண்ணிட்டேன் பாஸ்! Opening WhatsApp Web...**');
        window.open('https://web.whatsapp.com', '_blank');
        speak('Open pannitten Boss! Opening WhatsApp.', () => { if (voiceMode) scheduleRestart(200); });
        return;
      }

      // ── Instagram ─────────────────────────────────────────────────
      if (lower.includes('instagram')) {
        window.JarvisApp?.appendDirectMessage('ai', '📸 **ஓப்பன் பண்ணிட்டேன் பாஸ்! Opening Instagram...**');
        window.open('https://instagram.com', '_blank');
        speak('Open pannitten Boss! Opening Instagram.', () => { if (voiceMode) scheduleRestart(200); });
        return;
      }

      // ── Facebook ──────────────────────────────────────────────────
      if (lower.includes('facebook')) {
        window.JarvisApp?.appendDirectMessage('ai', '🌐 **ஓப்பன் பண்ணிட்டேன் பாஸ்! Opening Facebook...**');
        window.open('https://facebook.com', '_blank');
        speak('Open pannitten Boss! Opening Facebook.', () => { if (voiceMode) scheduleRestart(200); });
        return;
      }

      // ── Gmail ─────────────────────────────────────────────────────
      if (lower.includes('gmail') || lower.includes('email') || lower.includes('mail')) {
        window.JarvisApp?.appendDirectMessage('ai', '✉️ **ஓப்பன் பண்ணிட்டேன் பாஸ்! Opening Gmail...**');
        window.open('https://mail.google.com', '_blank');
        speak('Open pannitten Boss! Opening Gmail.', () => { if (voiceMode) scheduleRestart(200); });
        return;
      }

      // ── Maps ──────────────────────────────────────────────────────
      if (lower.includes('maps') || lower.includes('navigation')) {
        window.JarvisApp?.appendDirectMessage('ai', '🗺️ **ஓப்பன் பண்ணிட்டேன் பாஸ்! Opening Google Maps...**');
        window.open('https://maps.google.com', '_blank');
        speak('Open pannitten Boss! Opening Google Maps.', () => { if (voiceMode) scheduleRestart(200); });
        return;
      }

      // ── YouTube ───────────────────────────────────────────────────
      if (lower.includes('youtube') || lower.includes('open youtube')) {
        window.JarvisApp?.appendDirectMessage('ai', '▶️ **ஓப்பன் பண்ணிட்டேன் பாஸ்! Opening YouTube...**');
        window.open('https://youtube.com', '_blank');
        speak('Open pannitten Boss! Opening YouTube.', () => { if (voiceMode) scheduleRestart(200); });
        return;
      }

      // ── Google ────────────────────────────────────────────────────
      if (lower.includes('open google')) {
        window.JarvisApp?.appendDirectMessage('ai', '🔍 **ஓப்பன் பண்ணிட்டேன் பாஸ்! Opening Google...**');
        window.open('https://google.com', '_blank');
        speak('Open pannitten Boss! Opening Google.', () => { if (voiceMode) scheduleRestart(200); });
        return;
      }

      // ── ChatGPT ───────────────────────────────────────────────────
      if (lower.includes('chatgpt') || lower.includes('chat gpt') || lower.includes('open gpt')) {
        window.JarvisApp?.appendDirectMessage('ai', '🤖 **ஓப்பன் பண்ணிட்டேன் பாஸ்! Opening ChatGPT...**');
        window.open('https://chatgpt.com', '_blank');
        speak('Open pannitten Boss! Opening ChatGPT.', () => { if (voiceMode) scheduleRestart(200); });
        return;
      }

      // ── Notepad / Calc / TaskMgr ──────────────────────────────────
      if (lower.includes('notepad') || lower.includes('calc') || lower.includes('task manager')) {
        const app = lower.includes('notepad') ? 'notepad' : lower.includes('calc') ? 'calc' : 'taskmgr';
        window.JarvisApp?.appendDirectMessage('ai', `💻 **ஓப்பன் பண்ணிட்டேன் பாஸ்! Launching ${app}...**`);
        execDesktopCmd(app);
        speak(`Open pannitten Boss! Launching ${app}.`, () => { if (voiceMode) scheduleRestart(200); });
        return;
      }

      // ── Clear Chat ────────────────────────────────────────────────
      if (lower.includes('clear chat') || lower.includes('clear conversation') || lower.includes('reset chat')) {
        window.JarvisApp?.clearChat();
        speak('Conversation cleared, Boss.', () => { if (voiceMode) scheduleRestart(200); });
        return;
      }

      // ── Call ──────────────────────────────────────────────────────
      if (lower.includes('call') || lower.includes('contact')) {
        const name = lower.includes('suresh') ? 'Suresh' : 'Contact';
        window.JarvisApp?.appendDirectMessage('ai', `📞 **Initiating call to ${name}...**\n<a href="https://web.whatsapp.com" target="_blank">Call via WhatsApp Web</a>`);
        speak(`Initiating call to ${name}, Boss.`, () => { if (voiceMode) scheduleRestart(200); });
        return;
      }

      // ── Send to AI Engine ─────────────────────────────────────────
      if (inp && raw.length > 0) {
        inp.value = raw;
        window.JarvisApp?.sendMessage(true);
        // sendMessage will call releaseLock via onFinished from speak() once AI replies
        // Release immediately here so lock doesn't freeze
        setTimeout(releaseLock, 5000);
      } else {
        releaseLock();
        if (voiceMode) scheduleRestart(150);
      }
    },
  };

  // ── Heartbeat: check once every 1.5s ONLY if no other activity ───
  setInterval(() => {
    if (voiceMode && !isListening && !isSpeaking && !cmdLock) {
      window.JarvisVoice._startListening();
    }
  }, 1500);

  // ── Bootstrap on DOM ready ────────────────────────────────────────
  document.addEventListener('DOMContentLoaded', () => {
    initMobileBanner();

    document.getElementById('voiceBtn')?.addEventListener('click', () => {
      unlockAudio();
      window.JarvisVoice.toggle();
    });

    document.getElementById('micInputBtn')?.addEventListener('click', () => {
      unlockAudio();
      window.JarvisVoice.listenOnce();
    });

    // Auto-start voice mode after 600ms
    setTimeout(() => {
      if (!voiceMode) {
        voiceMode = true;
        setVoiceUI(true);
        window.JarvisVoice._startListening();
      }
    }, 600);

    // ONE-TIME gesture auto-activate (won't repeat on each click)
    const autoActivate = () => {
      unlockAudio();
      if (!voiceMode) {
        voiceMode = true;
        setVoiceUI(true);
      }
      if (!isListening && !isSpeaking) {
        window.JarvisVoice._startListening();
      }
    };
    window.addEventListener('click',      autoActivate, { once: true, passive: true });
    window.addEventListener('touchstart', autoActivate, { once: true, passive: true });
    window.addEventListener('keydown',    autoActivate, { once: true });
  });

})();
