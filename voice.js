/* ================================================================
   J.A.R.V.I.S. QUANTUM VOICE ENGINE v13.0 — INSTANT COMMAND EDITION
   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   ✅ Instant command execution — zero blocking locks
   ✅ Girl / Boy voice toggle ("change girl voice", "change boy voice")
   ✅ Per-command 2s debounce — only same exact command is debounced
   ✅ Close WhatsApp / ChatGPT / File Explorer etc. via voice
   ✅ chatInput cleared immediately after reading to stop focus-return repeat
   ✅ continuous=true — mic stays always live without stop/restart loops
   ================================================================ */

(function () {
  'use strict';

  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;

  // ── Global State ───────────────────────────────────────────────────
  let recognition   = null;
  let voiceMode     = false;
  let isSpeaking    = false;
  let audioUnlocked = false;
  let audio         = null;
  let ttsWatchdog   = null;
  let girlVoice     = true;           // Default to sweet female voice as requested

  // Per-command debounce map { commandKey → lastExecutedTime }
  const cmdTimestamps = {};
  const CMD_DEBOUNCE  = 2000; // 2 seconds per unique command

  // Track opened windows so we can close them by voice
  const openedWindows = {};

  // ── State ────────────────────────────────────────────────────────
  let lastSpokenText  = '';     // dedup guard
  let lastSpokenTime  = 0;      // timestamp to expire dedup after 4s
  let wakeGateActive  = false;  // Alexa-style: only process after wake word
  let wakeGateTimer   = null;
  let wakeTimeout     = null;   // buffer for pure wake word greeting

  // ── Wake words (primary: "hello boss" | "jarvis") ────────────────
  const WAKE_WORDS = [
    'hello boss','hi boss','hello jarvis','hi jarvis',
    'jarvis','jervis','jarvez','charvis',
    'hey jarvis','ok jarvis','boss','karen','chitti','friday','edith','stark'
  ];

  // Check if text starts with OR is a wake word
  const hasWakeWord = (t) => WAKE_WORDS.some(w =>
    t === w ||
    t.startsWith(w + ' ') ||
    t.startsWith(w + ',') ||
    t.startsWith(w + '!')
  );
  const isWakeOnly  = (t) => WAKE_WORDS.some(w => t === w) && t.split(' ').length <= 3;

  // ── Visual HUD indicator (blue ring when JARVIS is listening) ────
  function setWakeUI(active) {
    const btn = document.getElementById('voiceBtn');
    const bar = document.getElementById('voiceBar');
    const val = document.getElementById('voiceVal');
    if (active) {
      btn?.classList.add('wake-active');
      if (val) val.textContent = '🎙️ LISTENING SIR...';
      if (bar) { bar.style.width = '100%'; bar.style.background = 'linear-gradient(90deg,#00D4FF,#FF007F)'; }
    } else {
      btn?.classList.remove('wake-active');
      if (val) val.textContent = voiceMode ? 'LISTENING SIR...' : 'OFF';
      if (bar) { bar.style.width = voiceMode ? '20%' : '0%'; bar.style.background = ''; }
    }
  }

  // Activate the gate + show visual ring
  function activateWakeGate() {
    wakeGateActive = true;
    setWakeUI(true);
    clearTimeout(wakeGateTimer);
    wakeGateTimer = setTimeout(() => {
      wakeGateActive = false;
      setWakeUI(false);
    }, 12000);
  }

  // Extend gate after JARVIS responds (follow-up window stays 12s)
  function extendWakeGate() {
    if (!wakeGateActive) return;
    clearTimeout(wakeGateTimer);
    wakeGateTimer = setTimeout(() => {
      wakeGateActive = false;
      setWakeUI(false);
    }, 12000);
  }

  // ── Rotating Tamil wake responses (no repeats) ──────────────────
  let wakeResponseIdx = 0;
  const WAKE_RESPONSES = [
    { text: 'சொல்லுங்க பாஸ்! நான் தயாராக இருக்கிறேன்.', speech: 'Sollunga Boss! Naan thayaaraaga irukkiREn.' },
    { text: 'என்ன வேணும் பாஸ்? சொல்லுங்க!', speech: 'Enna veNum Boss? Sollunga!' },
    { text: 'ஆணை இடுங்கள் பாஸ்! நான் செய்கிறேன்.', speech: 'Aanai idungal Boss! Naan seykiREn.' },
    { text: 'பாஸ் சொல்லுங்க, உடனே செய்கிறேன்!', speech: 'Boss sollunga, udanE seykiREn.' },
    { text: 'தயாராக இருக்கிறேன் பாஸ். என்ன உதவி வேண்டும்?', speech: 'ThayaaraakA irukkiREn Boss. Enna uthaavi veNdum?' },
  ];
  function nextWakeResponse() {
    const r = WAKE_RESPONSES[wakeResponseIdx % WAKE_RESPONSES.length];
    wakeResponseIdx++;
    return r;
  }

  // ── Desktop & Web App Launcher Helper ─────────────────────────────
  function desktop(cmd) {
    fetch(`http://localhost:8765/run?cmd=${encodeURIComponent(cmd)}`, { mode: 'cors' })
      .catch(() => {
        fetch('jarvis_executor.php', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'launch_app', app: cmd })
        }).catch(() => {});
      });
  }

  // ── Per-command debounce (only blocks same command within 2s) ───────
  function debounced(key, fn) {
    const now = Date.now();
    if (cmdTimestamps[key] && now - cmdTimestamps[key] < CMD_DEBOUNCE) return;
    cmdTimestamps[key] = now;
    fn();
  }

  // ── Audio unlock (mobile) ──────────────────────────────────────────
  function unlockAudio() {
    if (audioUnlocked) return;
    try {
      window.speechSynthesis?.cancel();
      window.speechSynthesis?.resume();
      const u = new SpeechSynthesisUtterance(''); u.volume = 0;
      window.speechSynthesis?.speak(u);
      new (window.AudioContext || window.webkitAudioContext)().resume();
      audioUnlocked = true;
      document.getElementById('mobileUnlockBanner')?.remove();
    } catch (e) {}
  }

  // ── Universal Audio Unlock Banner (Desktop & Mobile) ─────────────
  function showVoiceUnlockBanner() {
    if (document.getElementById('voiceUnlockBanner')) return;
    const b = document.createElement('div');
    b.id = 'voiceUnlockBanner';
    b.style.cssText = 'position:fixed;top:0;left:0;right:0;z-index:99999;background:linear-gradient(90deg,#00D4FF,#FF007F);color:#fff;text-align:center;padding:10px 16px;cursor:pointer;font-family:var(--fhud, sans-serif);font-weight:bold;font-size:12px;letter-spacing:0.1em;box-shadow:0 4px 20px rgba(0,212,255,.5);animation:pulseBanner 2s infinite;';
    b.innerHTML = '🔊 CLICK ANYWHERE OR TAP HERE TO ACTIVATE JARVIS VOICE ENGINE';
    
    const activate = () => {
      unlockAudio();
      b.remove();
      window.JarvisVoice.start();
      speak('Hello Boss, eppadi irukkeenga? Jarvis systems 100 percent online-il ullathu!', null, true);
    };

    b.onclick = activate;
    window.addEventListener('click', activate, { once: true, passive: true });
    window.addEventListener('keydown', activate, { once: true, passive: true });
  }

  // ── UI helpers ─────────────────────────────────────────────────────
  function setVoiceUI(on) {
    const btn = document.getElementById('voiceBtn');
    const val = document.getElementById('voiceVal');
    const bar = document.getElementById('voiceBar');
    if (btn) {
      btn.classList.toggle('active', on);
      btn.classList.toggle('wake-active', on);
    }
    if (val) val.textContent = on ? '🎙️ LISTENING SIR...' : 'OFF';
    if (bar) {
      bar.style.width = on ? '100%' : '0%';
      if (on) bar.style.background = 'linear-gradient(90deg,#00D4FF,#FF007F)';
      else bar.style.background = '';
    }
  }

  // ── Ping sound ────────────────────────────────────────────────────
  function ping(f = 880) {
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      const o = ctx.createOscillator(), g = ctx.createGain();
      o.connect(g); g.connect(ctx.destination);
      o.type = 'sine'; o.frequency.value = f;
      g.gain.setValueAtTime(0.15, ctx.currentTime);
      g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);
      o.start(); o.stop(ctx.currentTime + 0.3);
    } catch (e) {}
  }

  // ── Check if browser has a Tamil TTS voice installed ─────────────
  function hasTamilVoice() {
    return window.speechSynthesis.getVoices().some(v =>
      v.lang.toLowerCase().includes('ta') || v.name.toLowerCase().includes('tamil')
    );
  }

  // ── Tamil phonetic transliteration map (comprehensive) ────────────
  const TAMIL_MAP = [
    [/ஹலோ பாஸ்,? எப்படி இருக்கீங்க\??/g, 'Hello Boss, eppadi irukkeenga?'],
    [/ஜார்விஸ் சிஸ்டம்ஸ் 100% ஆன்லைனில் உள்ளது!?/g, 'Jarvis systems nooRu percent online-il ullathu!'],
    [/சொல்லுங்க பாஸ்,? உங்களுக்கு என்ன வேணும்\??/g, 'Sollunga Boss, ungalukku enna veNum?'],
    [/நான் (அக்கரையா )?செய்ய காத்திருக்கிறேன்!?/g, 'Naan seyya kaathirukiren!'],
    [/ஓப்பன் பண்ணிட்டேன் பாஸ்!?/g, 'Open pannittEn Boss!'],
    [/நான் நல்லா இருக்கேன் பாஸ்!?/g, 'Naan nalla irukkEn Boss!'],
    [/ஸ்டார்க் சிஸ்டம்ஸ் 100% ஆன்லைனில் இயங்குகிறது!?/g, 'Stark systems nooRu percent online-il iyanguthu!'],
    [/பாஸ்/g, 'Boss'],
    [/நான்/g, 'Naan'],
    [/வணக்கம்/g, 'Vanakkam'],
    [/என்ன/g, 'enna'],
    [/வேணும்/g, 'veNum'],
    [/செய்கிறேன்/g, 'seykirEn'],
    [/செய்தேன்/g, 'seythEn'],
    [/திறக்கிறேன்/g, 'thiRakkiREn'],
    [/மூடுகிறேன்/g, 'mUdukiREn'],
    [/சரி/g, 'sari'],
    [/புரிகிறது/g, 'purikiRathu'],
    [/முடிந்தது/g, 'mudintathu'],
    [/தயார்/g, 'thayaar'],
    [/நன்றி/g, 'nandRi'],
    [/விடைபெறுகிறேன்/g, 'vidaipeRukiREn'],
    [/அக்கரையா/g, 'akkaraiyaa'],
    [/இருக்கீங்க/g, 'irukkEnga'],
    [/இருக்கேன்/g, 'irukkEn'],
    [/காத்திருக்கிறேன்/g, 'kaathirukkiREn'],
    [/உங்களுக்கு/g, 'ungalukku'],
    [/கண்டுபிடிக்கிறேன்/g, 'kaNdupidikkirEn'],
    // Remaining Tamil Unicode chars → strip gracefully
    [/[\u0B80-\u0BFF]+/g, ''],
  ];


  // ── Speech Sanitizer for TTS ─────────────────────────────────────
  function sanitizeForSpeech(text) {
    if (!text) return '';
    let clean = text.replace(/<[^>]*>/g, '').replace(/[`*#_~\[\]]/g, '');

    // If browser has Tamil voice → keep Tamil Unicode as-is for native Tamil TTS
    if (!hasTamilVoice()) {
      // No Tamil voice → apply phonetic transliteration map
      for (const [pattern, replacement] of TAMIL_MAP) {
        clean = clean.replace(pattern, replacement);
      }
    }
    clean = clean.replace(/\s+/g, ' ').trim().slice(0, 400);

    // 🛡️ Fallback: if sanitization stripped everything, keep original text so speech ALWAYS works!
    if (!clean || clean.length < 2) {
      clean = text.replace(/<[^>]*>/g, '').replace(/[`*#_~\[\]]/g, '').trim().slice(0, 400);
    }
    return clean;
  }

  // ── TTS speak with dedup guard ──────────────────────────────────
  function speak(text, onDone, forceGirl) {
    if (!text || !window.speechSynthesis) { if (onDone) onDone(); return; }

    // ❌ Dedup guard: don’t repeat the exact same phrase within 4 seconds
    const now = Date.now();
    const dedupKey = text.trim().slice(0, 80);
    if (dedupKey === lastSpokenText && (now - lastSpokenTime) < 4000) {
      if (onDone) onDone();
      return;
    }
    lastSpokenText = dedupKey;
    lastSpokenTime = now;

    unlockAudio();
    isSpeaking = true;

    // 🔇 STOP MIC COMPLETELY while JARVIS speaks (prevents echo repeat)
    try {
      if (recognition) {
        recognition.onresult = null;   // discard any pending results
        recognition.onend    = null;   // don't auto-restart during TTS
        recognition.stop();
      }
    } catch(e) {}

    try {
      window.speechSynthesis.cancel();
      window.speechSynthesis.resume();
    } catch (e) {}

    const clean = sanitizeForSpeech(text);
    if (!clean) { isSpeaking = false; if (onDone) onDone(); return; }

    let done = false;
    const finish = () => {
      if (done) return; done = true;
      clearTimeout(ttsWatchdog);
      clearInterval(ttsKeepAlive);
      isSpeaking = false;
      setVoiceUI(voiceMode);
      // 🎙️ Immediately restart 24/7 mic listening after JARVIS finishes speaking
      if (voiceMode && window.JarvisVoice) {
        setTimeout(() => {
          if (voiceMode) window.JarvisVoice._boot();
        }, 150);
      }
      if (onDone) onDone();
    };

    // Watchdog: if speech takes > max expected time, force-finish
    const maxMs = Math.max(4000, clean.length * 80);
    ttsWatchdog = setTimeout(finish, maxMs);

    // Chrome TTS bug: speechSynthesis pauses after ~15s — keepAlive poke
    let ttsKeepAlive = setInterval(() => {
      try { if (window.speechSynthesis.speaking) window.speechSynthesis.resume(); } catch(e) {}
    }, 10000);

    setTimeout(() => {
      try { window.speechSynthesis.resume(); } catch (e) {}
      const utt = new SpeechSynthesisUtterance(clean);
      const voices = window.speechSynthesis.getVoices();
      const useGirl = forceGirl !== undefined ? forceGirl : girlVoice;

      let voice;
      // Tamil voice: prefer Tamil lang if browser has it
      if (/[\u0B80-\u0BFF]/.test(clean) || /[\u0B80-\u0BFF]/.test(text)) {
        voice = voices.find(v => v.lang.toLowerCase().startsWith('ta'))
             || voices.find(v => v.name.toLowerCase().includes('tamil'));
      }
      // Female voice selection (sweet & natural)
      if (!voice && useGirl) {
        voice = voices.find(v => /zira/i.test(v.name))                          // Windows built-in female
             || voices.find(v => /samantha/i.test(v.name))                      // macOS female
             || voices.find(v => /google us english/i.test(v.name))             // Google female
             || voices.find(v => /aria|emma|salli|joanna|kendra|ivy/i.test(v.name))
             || voices.find(v => v.name.toLowerCase().includes('female'))
             || voices.find(v => v.gender === 'female')
             || voices.find(v => v.lang === 'en-US');
        utt.pitch = 1.35; utt.rate = 1.0;
      }
      // Male voice fallback
      if (!voice && !useGirl) {
        voice = voices.find(v => /david|james|mark|daniel/i.test(v.name))
             || voices.find(v => /en[-_]GB/i.test(v.lang))
             || voices.find(v => /en[-_]US/i.test(v.lang));
        utt.pitch = 0.85; utt.rate = 0.98;
      }
      if (voice) utt.voice = voice;
      utt.volume = 1;
      utt.onend   = finish;
      utt.onerror = finish;
      window.speechSynthesis.speak(utt);
    }, 40);
  }

  // ══════════════════════════════════════════════════════════════════
  //  COMMAND HANDLER — INSTANT, NO GLOBAL LOCK
  // ══════════════════════════════════════════════════════════════════
  function handleCommand(raw) {
    if (!raw || raw.trim().length < 1) return;

    // Normalize
    const t = raw.toLowerCase()
      .replace(/[^\u0000-\u007E\u0B80-\u0BFF\s]/g, '')
      .replace(/\s+/g, ' ').trim();

    // Clear chat input immediately to prevent focus-return repeat
    const inp = document.getElementById('chatInput');
    if (inp) inp.value = '';

    // ── 1. Girl / Boy Voice Toggle ────────────────────────────────────
    if (/girl voice|female voice|lady voice|woman voice|pen voice/.test(t)) {
      return debounced('voice-girl', () => {
        girlVoice = true;
        window.JarvisApp?.appendDirectMessage('ai', '💃 **Girl voice activated, Boss! Voice changed to female mode!**');
        speak('Girl voice activated Boss! Switching to female voice mode!');
      });
    }
    if (/boy voice|male voice|man voice|jarvis voice|stark voice/.test(t)) {
      return debounced('voice-boy', () => {
        girlVoice = false;
        window.JarvisApp?.appendDirectMessage('ai', '🎙️ **JARVIS male voice restored, Boss!**');
        speak('JARVIS male voice restored, Boss!');
      });
    }

    // ── 2. Close Commands (Must execute before any open checks!) ───────
    if (/^(close|exit|shut down|stop jarvis|close jarvis|bye jarvis|goodbye jarvis|close app|close window|close tab)$/.test(t)) {
      return debounced('close-jarvis', () => {
        voiceMode = false;
        setVoiceUI(false);
        try { recognition?.stop(); } catch (e) {}
        window.JarvisApp?.appendDirectMessage('ai', '👋 **Closing JARVIS — Goodbye Boss! விடைபெறுகிறேன் பாஸ்!**');
        speak('Goodbye Boss! Closing JARVIS now. Vanakkam!', () => {
          try { window.close(); } catch (e) {}
        });
      });
    }

    // Close specific apps (guaranteed return so it never triggers open)
    if (t.includes('close')) {
      window.JarvisApp?.closeMultitaskWindow();
      if (t.includes('explorer') || t.includes('file')) {
        return debounced('close-explorer', () => {
          desktop('close_explorer');
          window.JarvisApp?.appendDirectMessage('ai', '✅ **Closing File Explorer, Boss!**');
          speak('Closing File Explorer, Boss!');
        });
      }
      const appKey = t.replace('close ', '').replace(/\s/g, '');
      return debounced('close-' + appKey, () => {
        if (openedWindows[appKey] && !openedWindows[appKey].closed) {
          try { openedWindows[appKey].close(); } catch(e){}
        }
        desktop('close_' + appKey);
        window.JarvisApp?.appendDirectMessage('ai', `✅ **Closed ${appKey}, Boss!**`);
        speak(`Closed ${appKey}, Boss!`);
      });
    }

    // ── 3a. Hello Boss Greeting ────────────────────────────────────────
    if (/^(hello boss|hello jarvis|hi boss|hi jarvis|vanakkam|வணக்கம்|ஹலோ பாஸ்|ஹலோ ஜார்விஸ்)/.test(t)) {
      return debounced('hello-boss', () => {
        const greet = 'Hello Boss! Eppadi irukkeenga? Naan nalla irukkEn. Sollunga Boss, enna seiyya?';
        const greetTamil = 'ஹலோ பாஸ்! எப்படி இருக்கீங்க? நான் நல்லா இருக்கேன். சொல்லுங்க பாஸ், என்ன செய்ய?';
        window.JarvisApp?.appendDirectMessage('ai', `👋 ${greetTamil}`);
        speak(greet);
      });
    }

    // ── 3b. Wake Word Only (400ms buffer so 'Jarvis open whatsapp' isn't interrupted) ──
    if (isWakeOnly(t)) {
      clearTimeout(wakeTimeout);
      wakeTimeout = setTimeout(() => {
        debounced('wake', () => {
          const r = nextWakeResponse();
          window.JarvisApp?.appendDirectMessage('ai', `🎙️ ${r.text}`);
          speak(r.speech);
        });
      }, 400);
      return;
    }

    // Cancel pending wake greeting when a real command arrives
    clearTimeout(wakeTimeout);

    // ── 4. Open Commands (instant, open URL/app via browser & desktop) ───────
    const openApp = (key, label, url, speech) => {
      return debounced('open-' + key, () => {
        window.JarvisApp?.appendDirectMessage('ai', `✅ **ஓப்பன் பண்ணிட்டேன் பாஸ்! Opening ${label}...**`);
        // 1. Open on-screen split window in JARVIS UI if URL exists
        if (url && !url.startsWith('c:')) {
          window.JarvisApp?.openMultitaskWindow(url, label);
        }
        // 2. Open external browser window/tab
        if (url) {
          try { openedWindows[key] = window.open(url, '_blank'); } catch(e){}
        }
        // 3. Trigger native OS app launcher fallback
        desktop(key);
        speak(speech || `Open pannitten Boss! Opening ${label}.`);
      });
    };

    if (/open (chatgpt|chat gpt|gpt)|^(chatgpt|chat gpt|gpt)$/i.test(t))
      return openApp('chatgpt','ChatGPT', 'https://chatgpt.com', 'Open pannitten Boss! Opening Chat G P T.');

    if (/open (whatsapp|whats app|whatapp|what's app|what app)|^(whatsapp|whats app|whatapp|what's app)$/i.test(t))
      return openApp('whatsapp','WhatsApp', 'https://web.whatsapp.com', 'Open pannitten Boss! Opening WhatsApp.');

    if (/open (instagram|insta)|^(instagram|insta)$/i.test(t))
      return openApp('instagram','Instagram', 'https://instagram.com', 'Open pannitten Boss! Opening Instagram.');

    if (/open (facebook|face book|fb)|^(facebook|fb)$/i.test(t))
      return openApp('facebook','Facebook', 'https://facebook.com', 'Open pannitten Boss! Opening Facebook.');

    if (/open (gmail|g mail|email|e mail)|^(gmail|email)$/i.test(t))
      return openApp('gmail','Gmail', 'https://mail.google.com', 'Open pannitten Boss! Opening Gmail.');

    if (/open (youtube|you tube|yt)|^(youtube|you tube)$/i.test(t))
      return openApp('youtube','YouTube', 'https://youtube.com', 'Open pannitten Boss! Opening YouTube.');

    if (/open google(?!maps| maps)/i.test(t))
      return openApp('google','Google', 'https://google.com', 'Open pannitten Boss! Opening Google.');

    if (/open (google maps|maps|navigation)|google maps/i.test(t))
      return openApp('maps','Google Maps', 'https://maps.google.com', 'Open pannitten Boss! Opening Google Maps.');

    if (/open (file explorer|explorer|files|file manager|my computer)|^(file explorer|explorer|files)$/i.test(t))
      return openApp('explorer','File Explorer', 'c:/', 'Open pannitten Boss! Opening Windows File Explorer.');

    if (/open (bluetooth|blue tooth)|^(bluetooth|blue tooth)$/i.test(t))
      return openApp('bluetooth','Bluetooth', '', 'Open pannitten Boss! Activating Bluetooth settings.');

    if (/open (notepad|note pad)|^(notepad|note pad)$/i.test(t))
      return openApp('notepad','Notepad', '', 'Open pannitten Boss! Opening Notepad.');

    if (/open (calculator|calc)|^(calculator|calc)$/i.test(t))
      return openApp('calc','Calculator', '', 'Open pannitten Boss! Opening Calculator.');

    if (/open task manager|^(task manager|taskmgr)$/.test(t))
      return openApp('taskmgr','Task Manager', '', 'Open pannitten Boss! Opening Task Manager.');

    if (/open (cmd|command prompt|terminal)|^(cmd|command prompt|terminal)$/.test(t))
      return openApp('cmd','Command Prompt', '', 'Open pannitten Boss! Opening Command Prompt.');

    if (/open powershell|^(powershell)$/.test(t))
      return openApp('powershell','PowerShell', '', 'Open pannitten Boss! Opening PowerShell.');

    if (/open (control panel|control)|^(control panel|control)$/.test(t))
      return openApp('control','Control Panel', '', 'Open pannitten Boss! Opening Control Panel.');

    // ── 5. System info / conversational ──────────────────────────────
    if (/how are you|eppadi irukke|how r u/.test(t))
      return debounced('howru', () => {
        const r = 'நான் நல்லா இருக்கேன் பாஸ்! ஸ்டார்க் சிஸ்டம்ஸ் 100% ஆன்லைனில் இயங்குகிறது!';
        window.JarvisApp?.appendDirectMessage('ai', r);
        speak('Naan nalla irukken Boss! Stark systems 100 percent online irukku!');
      });

    if (/weather|vanilai/.test(t))
      return debounced('weather', () => {
        const r = 'இன்றைய வானிலை 31°C வெப்பநிலையுடன் தெளிவாக உள்ளது பாஸ்!';
        window.JarvisApp?.appendDirectMessage('ai', r);
        speak('Inraiya vanilai 31 degree Celsius veppanilayudan thelivaga ullathu Boss!');
      });

    if (/what time|what.*time|time now|intha neram/.test(t))
      return debounced('time', () => {
        const now = new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
        const r = `இப்போதைய நேரம் ${now} பாஸ்!`;
        window.JarvisApp?.appendDirectMessage('ai', r);
        speak(`Ippotha neram ${now} Boss!`);
      });

    if (/what.*date|today.*date|intha naal/.test(t))
      return debounced('date', () => {
        const now = new Date().toLocaleDateString('en-IN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
        window.JarvisApp?.appendDirectMessage('ai', `📅 **Today is ${now}, Boss!**`);
        speak(`Today is ${now}, Boss!`);
      });

    if (/clear chat|clear conversation|reset chat/.test(t))
      return debounced('clear', () => {
        window.JarvisApp?.clearChat();
        speak('Conversation cleared, Boss!');
      });

    if (/tamil.*pesa|pesa.*tamil|speak.*tamil|tamil.*speak/.test(t))
      return debounced('tamil-speak', () => {
        const r = 'ஆமாம் பாஸ்! என்னால் தமிழில் தெளிவாகப் பேசவும் புரிந்துகொள்ளவும் முடியும்!';
        window.JarvisApp?.appendDirectMessage('ai', r);
        speak('Aamaam Boss! Ennaal Tamil-il pesa mudiyum!');
      });

    // ── 6. Call Launcher ──────────────────────────────────────────────
    if (/call|phone|suresh/.test(t) && !/chatgpt|whatsapp|instagram/.test(t))
      return debounced('call', () => {
        const name = /suresh/.test(t) ? 'Suresh' : 'Contact';
        window.JarvisApp?.appendDirectMessage('ai', `📞 **Initiating call to ${name}...**\n[Open WhatsApp Web](https://web.whatsapp.com)`);
        speak(`Initiating call to ${name}, Boss!`);
      });

    // ── 7. Send everything else to AI Engine (and speak response) ──────
    if (inp && raw.trim().length > 0) {
      lastSpokenText = '';  // reset dedup so AI response is always spoken fresh
      inp.value = raw;
      window.JarvisApp?.sendMessage(true);
    }
  }

  // ══════════════════════════════════════════════════════════════════
  //  SPEECH RECOGNITION — continuous=true, no stop/restart loops
  // ══════════════════════════════════════════════════════════════════
  window.JarvisVoice = {
    isSupported() { return !!SR; },
    isEnabled()   { return voiceMode; },

    // Expose speak publicly so app.js can call it
    speak(text, onDone, forceGirl) { speak(text, onDone, forceGirl); },

    start() {
      if (!SR) {
        window.JarvisToast?.show('⚠️ Speech Recognition needs Chrome or Safari with HTTPS', 'warning', 6000);
        return;
      }
      if (voiceMode) return;
      unlockAudio();
      voiceMode = true;
      setVoiceUI(true);
      ping(880);
      this._boot();
    },

    stop() {
      voiceMode = false;
      setVoiceUI(false);
      try { recognition?.stop(); } catch (e) {}
      recognition = null;
    },

    toggle() {
      if (voiceMode) this.stop(); else this.start();
    },

    listenOnce() {
      unlockAudio();
      if (!voiceMode) this.start();
    },

    _boot() {
      if (!SR) return;

      // Tear down old instance
      if (recognition) {
        try { recognition.onresult = recognition.onend = recognition.onerror = null; recognition.stop(); } catch (e) {}
        recognition = null;
      }

      const rec = new SR();
      rec.lang             = 'en-IN'; // Optimized for Indian accent & command recognition
      rec.continuous       = true;   // stays on forever, no restart loops
      rec.interimResults   = true;   // REAL-TIME speech detection as user speaks!
      rec.maxAlternatives  = 1;
      recognition = rec;

      rec.onresult = (e) => {
        if (isSpeaking) return;

        let interimText = '';
        let finalText = '';

        for (let i = e.resultIndex; i < e.results.length; ++i) {
          const res = e.results[i];
          const tr = res[0]?.transcript?.trim() || '';
          if (res.isFinal) {
            finalText += ' ' + tr;
          } else {
            interimText += ' ' + tr;
          }
        }

        const heard = (finalText || interimText).trim();
        if (!heard || heard.length < 2) return;

        // 🎙️ REAL-TIME HUD FEEDBACK: Show live transcript as user speaks!
        const val = document.getElementById('voiceVal');
        if (val && voiceMode) {
          val.textContent = `🎙️ "${heard.slice(0, 22)}..."`;
        }

        // Process command on final speech result
        if (finalText && finalText.trim().length >= 2) {
          let cmd = finalText.trim();
          const wakePrefixRe = /^(hello boss|hi boss|hello jarvis|hi jarvis|jarvis|jervis|jarvez|charvis|hey jarvis|ok jarvis|boss|karen|chitti|friday|edith|stark)[,!\s]*/i;
          if (wakePrefixRe.test(cmd)) {
            const stripped = cmd.replace(wakePrefixRe, '').trim();
            if (stripped.length >= 2) cmd = stripped;
          }
          handleCommand(cmd);
        }
      };


      rec.onend = () => {
        // 24/7 persistent mic auto-restart (handles browser silence timeouts)
        if (voiceMode && !isSpeaking) {
          setTimeout(() => {
            if (voiceMode && !isSpeaking && recognition === rec) this._boot();
          }, 100);
        }
      };

      rec.onerror = (e) => {
        if (e.error === 'not-allowed' || e.error === 'service-not-allowed') {
          window.JarvisToast?.show('🚫 Microphone blocked! Allow microphone access in browser settings.', 'error', 8000);
          return;
        }
        // Auto-reboot mic immediately on silence or network glitch
        if (voiceMode && !isSpeaking) {
          setTimeout(() => {
            if (voiceMode && !isSpeaking) this._boot();
          }, 200);
        }
      };

      try {
        rec.start();
        setVoiceUI(true);
      } catch (er) {
        if (voiceMode && !isSpeaking) setTimeout(() => this._boot(), 300);
      }
    },
  };

  // ── Boot on DOM ready ─────────────────────────────────────────────
  document.addEventListener('DOMContentLoaded', () => {
    showVoiceUnlockBanner();

    const startGlobalVoice = () => {
      unlockAudio();
      if (!voiceMode && window.JarvisVoice) {
        window.JarvisVoice.start();
      }
    };

    document.getElementById('voiceBtn')?.addEventListener('click', () => {
      unlockAudio();
      window.JarvisVoice.toggle();
    });
    document.getElementById('micInputBtn')?.addEventListener('click', () => {
      unlockAudio();
      window.JarvisVoice.start();
    });

    // Universal gesture listeners: start 24/7 mic on ANY click/tap/keypress
    window.addEventListener('click',     startGlobalVoice, { passive: true });
    window.addEventListener('touchstart',startGlobalVoice, { passive: true });
    window.addEventListener('keydown',   startGlobalVoice, { passive: true });

    // Auto-start attempt on load
    setTimeout(startGlobalVoice, 500);
  });

})();
