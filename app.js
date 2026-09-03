/* ================================================================
   J.A.R.V.I.S. v2 — Core Application Engine
   ================================================================ */

/* ── Global SSE Streaming Helper ──────────────────────────── */
async function streamSSE(url, body, headers, onChunk, useProxy, realEndpoint, variant='openai') {
  let fu = url, fh = headers, fb = body;
  if (useProxy) {
    fu = window.JarvisSettings?.getProxyUrl() || 'http://localhost/jarvis/proxy.php';
    fh = {'Content-Type':'application/json'};
    fb = JSON.stringify({ endpoint: realEndpoint || url, headers, body: JSON.parse(body), variant });
  }
  const res = await fetch(fu, { method:'POST', headers:fh, body:fb });
  if (!res.ok) {
    const t = await res.text().catch(() => res.statusText);
    throw new Error(`HTTP ${res.status}: ${t}`);
  }
  const reader  = res.body.getReader();
  const decoder = new TextDecoder();
  let buf = '';
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buf += decoder.decode(value, {stream:true});
    const lines = buf.split('\n');
    buf = lines.pop() ?? '';
    for (const line of lines) {
      const t = line.trim();
      if (!t || t === 'data: [DONE]') continue;
      if (!t.startsWith('data: ')) continue;
      try {
        const j = JSON.parse(t.slice(6));
        let chunk = '';
        if      (variant === 'anthropic') chunk = j.type==='content_block_delta' ? (j.delta?.text||'') : '';
        else if (variant === 'gemini')    chunk = j.candidates?.[0]?.content?.parts?.[0]?.text || '';
        else                               chunk = j.choices?.[0]?.delta?.content || '';
        if (chunk) onChunk(chunk);
      } catch(e) {}
    }
  }
}

/* ── Toast ─────────────────────────────────────────────────── */
window.JarvisToast = {
  show(msg, type='info', ms=3500) {
    const c = document.getElementById('toastBox');
    if (!c) return;
    const t = document.createElement('div');
    t.className = `toast ${type}`;
    t.textContent = msg;
    c.appendChild(t);
    setTimeout(() => {
      t.style.cssText = 'opacity:0;transform:translateX(16px);transition:all .3s;';
      setTimeout(() => t.remove(), 300);
    }, ms);
  }
};

/* ── Markdown Renderer ──────────────────────────────────────── */
function md(text) {
  return text
    .replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
    .replace(/```(\w*)\n?([\s\S]*?)```/g,(_,l,c)=>`<pre><code class="lang-${l}">${c.trim()}</code></pre>`)
    .replace(/`([^`]+)`/g,'<code>$1</code>')
    .replace(/\*\*([^*]+)\*\*/g,'<strong>$1</strong>')
    .replace(/\*([^*]+)\*/g,'<em>$1</em>')
    .replace(/^### (.+)$/gm,'<h3>$1</h3>')
    .replace(/^## (.+)$/gm,'<h2>$1</h2>')
    .replace(/^# (.+)$/gm,'<h1>$1</h1>')
    .replace(/^> (.+)$/gm,'<blockquote>$1</blockquote>')
    .replace(/^[\*\-] (.+)$/gm,'<li>$1</li>')
    .replace(/(<li>.*<\/li>\n?)+/g,s=>`<ul>${s}</ul>`)
    .replace(/^\d+\. (.+)$/gm,'<li>$1</li>')
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g,'<a href="$2" target="_blank" rel="noopener">$1</a>')
    .replace(/^---$/gm,'<hr>')
    .replace(/\n\n/g,'</p><p>')
    .replace(/\n/g,'<br>');
}

function esc(t) {
  return t.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}

/* ── Main App ───────────────────────────────────────────────── */
window.JarvisApp = (function() {
  let provider = null;
  let convos   = {};
  let stats    = { msgs: 0, tokens: 0 };
  let busy     = false;

  // ── Boot ────────────────────────────────────────────────────
  function boot() {
    const LINES = [
      'STARK INDUSTRIES SYSTEMS ONLINE',
      'NEURAL CORE INITIALIZED...',
      'LOADING AI PROVIDER MATRIX...',
      'VOICE RECOGNITION ACTIVATED',
      'PERSONA PROTOCOLS ENGAGED',
      'ALL SYSTEMS NOMINAL — WELCOME.',
    ];
    const bar = document.getElementById('bootBar');
    const pct = document.getElementById('bootPct');
    const box = document.getElementById('bootLines');
    let i = 0;

    function step() {
      if (i < LINES.length) {
        const div = document.createElement('div');
        div.className = 'boot-line';
        div.textContent = LINES[i];
        box.appendChild(div);
        requestAnimationFrame(() => div.classList.add('show'));
        const p = Math.round(((i+1)/LINES.length)*100);
        if (bar) bar.style.setProperty('--w', p+'%');
        if (pct) pct.textContent = p+'%';
        i++;
        setTimeout(step, 420 + Math.random()*280);
      } else {
        setTimeout(() => {
          const o = document.getElementById('bootOverlay');
          o?.classList.add('fade');
          setTimeout(() => {
            o?.remove();
            document.getElementById('mainHUD')?.classList.remove('hidden');
            afterBoot();
          }, 800);
        }, 500);
      }
    }
    step();
  }

  function afterBoot() {
    // Apply saved persona
    const persona = window.JarvisPersonaManager?.getActive();
    if (persona?.bodyClass) document.body.classList.add(persona.bodyClass);

    tickClock();
    setInterval(tickClock, 1000);
    buildPowerCells();
    buildTabs();
    updateSidebar();
    loadHistory();

    // Auto-select first provider if available
    if (window.JarvisProviders && window.JarvisProviders.length > 0) {
      selectProvider(window.JarvisProviders[0].id);
    }

    // Greet on Startup
    setTimeout(() => {
      const p = window.JarvisActivePersona;
      const greetText = p?.greeting || 'ஹலோ பாஸ், எப்படி இருக்கீங்க? ஜார்விஸ் சிஸ்டம்ஸ் 100% ஆன்லைனில் உள்ளது!';
      window.JarvisApp?.appendDirectMessage('ai', `👋 **${greetText}**`);
      window.JarvisVoice?.speak('Hello Boss, eppadi irukkeenga? Jarvis systems 100 percent online-il ullathu!', () => {
        if (window.JarvisVoice && window.JarvisVoice.isEnabled()) {
          window.JarvisVoice.start();
        }
      }, true);
      updatePersonaUI(p);
    }, 400);
  }

  function tickClock() {
    const now  = new Date();
    const time = now.toLocaleTimeString('en-US', {hour12:false});
    const date = now.toLocaleDateString('en-US', {weekday:'short',year:'numeric',month:'short',day:'2-digit'});
    const cl   = document.getElementById('clock');
    const cd   = document.getElementById('clockDate');
    if (cl) cl.textContent = time;
    if (cd) cd.textContent = `STARDATE ${date.toUpperCase()}`;
  }

  function buildPowerCells() {
    const c = document.getElementById('powerCells');
    if (!c) return;
    c.innerHTML = '';
    const configured = window.JarvisProviders?.filter(p => window.JarvisSettings?.getKey(p.id) || p.id==='ollama').length || 0;
    const total = Math.min(configured, 8);
    for (let i=0;i<8;i++) {
      const cell = document.createElement('div');
      cell.className = `pcell ${i<total?'on':''}`;
      c.appendChild(cell);
    }
  }

  // ── Persona UI update ────────────────────────────────────────
  function updatePersonaUI(p) {
    if (!p) return;
    const els = {
      badge:    document.getElementById('personaBadge'),
      pcAvatar: document.getElementById('pcAvatar'),
      pcName:   document.getElementById('pcName'),
      pcSub:    document.getElementById('pcSub'),
      rLbl:     document.getElementById('reactorLbl'),
      wTitle:   document.getElementById('welcomeTitle'),
      wSub:     document.getElementById('welcomeSub'),
      foot:     document.getElementById('footerProv'),
    };
    if (els.badge)    els.badge.textContent    = p.shortName;
    if (els.pcAvatar) els.pcAvatar.textContent = p.avatar;
    if (els.pcName)   els.pcName.textContent   = p.name;
    if (els.pcSub)    els.pcSub.textContent    = p.sub;
    if (els.rLbl)     els.rLbl.textContent     = p.markLabel;
    if (els.wTitle)   els.wTitle.textContent   = `GOOD ${getTimeOfDay()}.`;
    if (els.wSub)     els.wSub.innerHTML       = `${p.name} online. All systems nominal.<br>Select a provider to begin.`;
    // Refresh chat header if provider active
    if (provider) {
      const cn = document.getElementById('chatPName');
      if (cn) cn.textContent = `${provider.icon} ${provider.name.toUpperCase()} — ${p.shortName}`;
    }
  }

  function getTimeOfDay() {
    const h = new Date().getHours();
    if (h < 12) return 'MORNING';
    if (h < 17) return 'AFTERNOON';
    return 'EVENING';
  }

  // ── Tabs & Sidebar ────────────────────────────────────────────
  function buildTabs() {
    const c = document.getElementById('providerTabs');
    if (!c) return;
    c.innerHTML = '';
    window.JarvisProviders?.forEach(p => {
      const userKey = window.JarvisSettings?.getKey(p.id);
      const tab = document.createElement('div');
      tab.className = 'ptab';
      tab.dataset.id = p.id;
      tab.innerHTML = `<span class="ti">${p.icon}</span><span>${p.name}</span><span class="td ${userKey ? 'ok' : 'free'}"></span>`;
      tab.addEventListener('click', () => selectProvider(p.id));
      c.appendChild(tab);
    });
  }

  function updateSidebar() {
    // Provider list
    const list = document.getElementById('providerList');
    if (list) {
      list.innerHTML = '';
      let configured = 0;
      window.JarvisProviders?.forEach(p => {
        const userKey = window.JarvisSettings?.getKey(p.id);
        const isReady = !!(userKey || p.free || p.id==='ollama' || true); // All providers ready via free backup
        configured++;
        const div = document.createElement('div');
        div.className = `pli cfg`;
        div.innerHTML = `
          <span class="pd ${p.free ? 'free' : 'ok'}"></span>
          <span class="pn">${p.icon} ${p.name}</span>
          <span class="pb ${p.free ? 'free' : ''}">${p.free ? 'FREE' : (userKey ? 'KEY ACTIVE' : 'FREE READY')}</span>
        `;
        div.addEventListener('click', () => {
          selectProvider(p.id);
        });
        list.appendChild(div);
      });
      const sp = document.getElementById('sProv');
      if (sp) sp.textContent = window.JarvisProviders?.length || 14;
      const ab = document.getElementById('apiBar');
      const av = document.getElementById('apiVal');
      const total = window.JarvisProviders?.length || 14;
      if (ab) ab.style.width = '100%';
      if (av) av.textContent = `${total}/${total} ACTIVE`;
    }
    buildPowerCells();
    updateStats();
  }

  // ── Provider Selection ─────────────────────────────────────────
  function selectProvider(id) {
    provider = window.JarvisProviders?.find(p => p.id === id);
    if (!provider) return;

    // Tab highlight
    document.querySelectorAll('.ptab').forEach(t => t.classList.remove('active'));
    document.querySelector(`.ptab[data-id="${id}"]`)?.classList.add('active');

    // Header
    const persona = window.JarvisActivePersona;
    document.getElementById('chatPName').textContent = `${provider.icon} ${provider.name.toUpperCase()} — ${persona?.shortName||'JARVIS'}`;
    document.getElementById('footerProv').textContent = `ACTIVE: ${provider.name.toUpperCase()}`;

    // Model select
    const sel = document.getElementById('modelSel');
    sel.innerHTML = '';
    provider.models.forEach(m => {
      const opt = document.createElement('option');
      opt.value = m.id; opt.textContent = m.label;
      sel.appendChild(opt);
    });

    // Capabilities
    updateCaps();

    // Check key
    const userKey = window.JarvisSettings?.getKey(id);
    if (!userKey && !provider.free) {
      window.JarvisToast?.show(`${provider.name} connected via 100% Free AI Engine!`, 'info', 2500);
    }

    // Restore convo
    if (!convos[id]) convos[id] = [];
    renderMsgs(id);
  }

  function updateCaps() {
    const c = document.getElementById('capList');
    if (!c || !provider) return;
    c.innerHTML = (provider.capabilities || []).map(cap =>
      `<div class="cap-item on"><span style="margin-right:5px">${cap.split(' ')[0]}</span>${cap.split(' ').slice(1).join(' ')}</div>`
    ).join('');
  }

  // ── Chat ──────────────────────────────────────────────────────
  function renderMsgs(id) {
    const c = document.getElementById('chatMsgs');
    if (!c) return;
    const msgs = convos[id] || [];
    const persona = window.JarvisActivePersona;
    if (!msgs.length) {
      c.innerHTML = `<div class="welcome" id="welcomeMsg">
        <div class="wt" id="welcomeTitle">GOOD ${getTimeOfDay()}.</div>
        <div class="ws" id="welcomeSub">${provider ? `${provider.icon} <strong>${provider.name}</strong> connected via ${persona?.name||'JARVIS'}.<br>How may I be of service?` : 'Select a provider above.'}</div>
      </div>`;
      return;
    }
    c.innerHTML = '';
    msgs.filter(m=>m.role!=='system').forEach(m => appendMsg(m.role, m.content, false));
    scrollDown();
  }

  function appendMsg(role, content, anim=true) {
    const c = document.getElementById('chatMsgs');
    if (!c) return null;
    c.querySelector('.welcome')?.remove();

    const isUser = role === 'user';
    const persona = window.JarvisActivePersona;
    const div = document.createElement('div');
    div.className = `msg ${isUser?'user':'ai'}`;
    const avatar = isUser ? 'YOU' : (persona?.avatar || 'J');
    const label  = isUser ? 'MR. STARK' : `${persona?.shortName||'J.A.R.V.I.S.'} — ${provider?.name||'AI'}`;
    div.innerHTML = `
      <div class="mavatar">${avatar}</div>
      <div class="mcontent">
        <div class="mlabel">${label}</div>
        <div class="msg-bubble mbubble">${isUser ? esc(content) : md(content)}</div>
      </div>
    `;
    c.appendChild(div);
    if (anim) scrollDown();
    return div;
  }

  function scrollDown() {
    const c = document.getElementById('chatMsgs');
    if (c) c.scrollTop = c.scrollHeight;
  }

  async function sendMessage(isVoice = false) {
    if (busy) return;
    if (!provider && window.JarvisProviders?.length > 0) {
      selectProvider(window.JarvisProviders[0].id);
    }
    if (!provider) { window.JarvisToast?.show('Select a provider first.', 'warning'); return; }

    const inp = document.getElementById('chatInput');
    const txt = inp?.value.trim();
    if (!txt) return;

    inp.value = ''; inp.style.height = 'auto';

    const pid = provider.id;
    if (!convos[pid]) convos[pid] = [];
    convos[pid].push({ role:'user', content:txt });
    appendMsg('user', txt);
    saveHistory(pid, txt);
    stats.msgs++; stats.tokens += Math.ceil(txt.length/4);
    updateStats();

    // Check for AI Image Generation command
    const isImageCmd = txt.startsWith('/image') || txt.toLowerCase().startsWith('generate image') || txt.toLowerCase().startsWith('draw image') || txt.toLowerCase().startsWith('create image');

    if (isImageCmd) {
      const imgPrompt = txt.replace(/^\/image/i, '').replace(/^(generate|draw|create)\s+image\s+(of\s+)?/i, '').trim() || 'futuristic iron man suit nanotech HUD glowing cyan 8k';
      const persona = window.JarvisActivePersona;
      
      busy = true;
      document.getElementById('sendBtn').disabled = true;

      const chatC = document.getElementById('chatMsgs');
      chatC.querySelector('.welcome')?.remove();

      const aiDiv = document.createElement('div');
      aiDiv.className = 'msg ai';
      const av = persona?.avatar || 'J';
      aiDiv.innerHTML = `
        <div class="mavatar">${av}</div>
        <div class="mcontent">
          <div class="mlabel">${persona?.shortName||'JARVIS'} — AI Image Generator</div>
          <div class="mbubble">
            <p>🎨 Generating AI Image for: <em>"${esc(imgPrompt)}"</em>...</p>
            <div style="text-align:center; margin-top:10px;">
              <img src="https://image.pollinations.ai/prompt/${encodeURIComponent(imgPrompt)}?width=600&height=400&nologo=true&seed=${Math.floor(Math.random()*100000)}" 
                   alt="${esc(imgPrompt)}" 
                   style="max-width:100%; border-radius:6px; border:1px solid var(--c1); box-shadow:var(--glow1);" 
                   onload="window.JarvisApp.scrollDown();" />
            </div>
          </div>
        </div>
      `;
      chatC.appendChild(aiDiv);
      scrollDown();

      window.JarvisVoice?.speak(`Generating image for ${imgPrompt}`, null, true);

      busy = false;
      document.getElementById('sendBtn').disabled = false;
      return;
    }

    let targetProvider = provider;
    let apiKey = window.JarvisSettings?.getKey(provider.id);

    // Automatic Free Fallback if no API key is set for target provider
    if (!apiKey && !provider.free) {
      const freeFallback = window.JarvisProviders?.find(p => p.id === 'pollinations') || window.JarvisProviders?.find(p => p.id === 'groq');
      if (freeFallback) {
        targetProvider = freeFallback;
        apiKey = window.JarvisSettings?.getKey(targetProvider.id);
        window.JarvisToast?.show(`No API key for ${provider.name} — automatically using Free AI Engine!`, 'info', 3000);
      }
    }

    const persona = window.JarvisActivePersona;

    // Use selected model from dropdown
    const selEl = document.getElementById('modelSel');
    const model = selEl?.value || targetProvider.models[0]?.id || 'openai';

    const memoryContext = window.JarvisMemoryEngine?.getSystemPromptContext(txt) || '';
    const messages = [
      { role:'system', content: (persona?.systemPrompt || 'You are J.A.R.V.I.S., Tony Stark\'s AI assistant. Be helpful, precise, and slightly witty.') + memoryContext },
      ...convos[pid],
    ];

    busy = true;
    document.getElementById('sendBtn').disabled = true;

    const chatC = document.getElementById('chatMsgs');
    chatC.querySelector('.welcome')?.remove();

    const aiDiv = document.createElement('div');
    aiDiv.className = 'msg ai';
    const av = persona?.avatar || 'J';
    aiDiv.innerHTML = `
      <div class="mavatar">${av}</div>
      <div class="mcontent">
        <div class="mlabel">${persona?.shortName||'JARVIS'} — ${targetProvider.name} ${targetProvider !== provider ? '(Free Fallback)' : ''}</div>
        <div class="mbubble" id="streamBubble"><span class="scursor"></span></div>
      </div>
    `;
    chatC.appendChild(aiDiv);
    scrollDown();

    const bubble = document.getElementById('streamBubble');
    let full = '';

    try {
      await targetProvider.sendMessage(
        apiKey, model, messages,
        chunk => {
          full += chunk;
          if (bubble) { bubble.innerHTML = md(full) + '<span class="scursor"></span>'; scrollDown(); }
        },
        window.JarvisSettings?.useProxy(),
        window.JarvisSettings?.getProxyUrl(),
      );
      if (bubble) bubble.innerHTML = md(full);
      convos[pid].push({ role:'assistant', content:full });
      stats.tokens += Math.ceil(full.length/4);
      updateStats();

      // Clean text for TTS
      const plain = full.replace(/[#*`\[\]>_~]/g, '').replace(/\n+/g, ' ').trim();
      const speakText = plain.length > 350 ? plain.slice(0, 350) + "..." : plain;

      // Always speak AI response out loud and resume continuous listening
      window.JarvisVoice?.speak(speakText, () => {
        if (window.JarvisVoice && window.JarvisVoice.isEnabled()) window.JarvisVoice.start();
      }, true);

    } catch(err) {
      console.error('AI Error:', err);

      // Secondary fallback to Pollinations AI if target provider API call fails
      try {
        const fallbackProv = window.JarvisProviders?.find(p => p.id === 'pollinations');
        if (fallbackProv && targetProvider !== fallbackProv) {
          window.JarvisToast?.show(`API limit/error reached — automatically using 100% Free Backup AI!`, 'warning');
          full = '';
          await fallbackProv.sendMessage(
            '', 'openai', messages,
            chunk => {
              full += chunk;
              if (bubble) { bubble.innerHTML = md(full) + '<span class="scursor"></span>'; scrollDown(); }
            }
          );
          if (bubble) bubble.innerHTML = md(full);
          convos[pid].push({ role:'assistant', content:full });
          const plain = full.replace(/[#*`\[\]>_~]/g, '').replace(/\n+/g, ' ').trim();
          const speakText = plain.length > 350 ? plain.slice(0, 350) + "..." : plain;
          window.JarvisVoice?.speak(speakText, () => {
            if (window.JarvisVoice && window.JarvisVoice.isEnabled()) window.JarvisVoice.start();
          }, true);
        } else {
          throw err;
        }
      } catch(fErr) {
        const offlineReply = "I am operating in local system mode, Sir. All local Stark utilities, system terminals, and trackers remain 100% active.";
        if (bubble) {
          bubble.className = 'mbubble';
          bubble.innerHTML = md(offlineReply);
        }
        convos[pid].push({ role:'assistant', content: offlineReply });
        window.JarvisVoice?.speak(offlineReply, () => {
          if (window.JarvisVoice && window.JarvisVoice.isEnabled()) window.JarvisVoice.start();
        }, true);
      }
    }

    busy = false;
    document.getElementById('sendBtn').disabled = false;
    scrollDown();
  }


  function clearChat() {
    if (!provider) return;
    convos[provider.id] = [];
    renderMsgs(provider.id);
  }

  // ── History ─────────────────────────────────────────────────
  function saveHistory(pid, msg) {
    try {
      const key  = 'jarvis_history';
      const hist = JSON.parse(localStorage.getItem(key)||'[]');
      hist.unshift({ pid, msg:msg.slice(0,60), ts:Date.now() });
      localStorage.setItem(key, JSON.stringify(hist.slice(0,20)));
      loadHistory();
    } catch(e) {}
  }

  function loadHistory() {
    const c = document.getElementById('historyList');
    if (!c) return;
    try {
      const hist = JSON.parse(localStorage.getItem('jarvis_history')||'[]');
      c.innerHTML = hist.slice(0,8).map(h => {
        const p = window.JarvisProviders?.find(x=>x.id===h.pid);
        return `<div class="hist-item">${p?.icon||'💬'} ${esc(h.msg)}</div>`;
      }).join('') || '<div class="hist-item">No sessions yet</div>';
    } catch(e) {}
  }

  function updateStats() {
    const sm = document.getElementById('sMsgs');
    const st = document.getElementById('sTok');
    if (sm) sm.textContent = stats.msgs;
    if (st) st.textContent = stats.tokens > 999 ? `${(stats.tokens/1000).toFixed(1)}K` : stats.tokens;
  }

  // ── Events ────────────────────────────────────────────────────
  function initEvents() {
    document.getElementById('sendBtn')?.addEventListener('click', sendMessage);
    document.getElementById('chatInput')?.addEventListener('keydown', e => {
      if (e.key==='Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); }
    });
    document.getElementById('chatInput')?.addEventListener('input', function() {
      this.style.height='auto';
      this.style.height = Math.min(this.scrollHeight,120)+'px';
    });
    document.getElementById('clearBtn')?.addEventListener('click', clearChat);
    document.getElementById('modelSel')?.addEventListener('change', () => {});

    // Image Upload & AI Vision Handler
    const imgBtn = document.getElementById('imgUploadBtn');
    const imgInp = document.getElementById('imgUploadInp');
    imgBtn?.addEventListener('click', () => imgInp?.click());
    imgInp?.addEventListener('change', (e) => {
      const file = e.target.files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (evt) => {
        const dataUrl = evt.target?.result;
        appendMsg('user', `📷 Attached Image for Analysis: [${file.name}]\n<img src="${dataUrl}" style="max-width:250px; border-radius:6px; margin-top:5px; border:1px solid var(--c1);" />`);
        window.JarvisApp?.sendMessageDirect(`I have uploaded this image [${file.name}]. Analyze who or what is in this photo and explain it in detail.`);
      };
      reader.readAsDataURL(file);
      imgInp.value = '';
    });
  }

  async function sendMessageDirect(customText) {
    if (busy) return;
    if (!provider && window.JarvisProviders?.length > 0) {
      selectProvider(window.JarvisProviders[0].id);
    }
    const txt = customText || '';
    if (!txt) return;

    const pid = provider?.id || 'openai';
    if (!convos[pid]) convos[pid] = [];
    convos[pid].push({ role:'user', content:txt });
    
    let targetProvider = provider || window.JarvisProviders?.[0];
    let apiKey = window.JarvisSettings?.getKey(targetProvider.id);

    busy = true;
    const aiDiv = appendMsg('ai', '');
    const b = aiDiv.querySelector('.mbubble');
    b.innerHTML = '<span class="cursor"></span>';

    let fullText = '';
    const onChunk = (chunk) => {
      fullText += chunk;
      b.innerHTML = md(fullText) + '<span class="cursor"></span>';
      scrollDown();
    };

    if (window._jarvisFallback) {
      await window._jarvisFallback(convos[pid], onChunk, null, targetProvider.id);
    }
    b.querySelector('.cursor')?.remove();
    convos[pid].push({ role:'assistant', content:fullText });
    saveHistory(pid, fullText);

    window.JarvisVoice?.speak(fullText, null, true);
    busy = false;
  }

  return {
    init() {
      window.JarvisSettings.providers = window.JarvisProviders || [];
      initEvents();
      boot();
    },
    selectProvider,
    sendMessage,
    sendMessageDirect,
    clearChat,
    scrollDown,
    appendDirectMessage(role, content) {
      appendMsg(role, content, true);
    },
    onSettingsChanged() {
      buildTabs();
      updateSidebar();
    },
    onPersonaChanged(p) {
      updatePersonaUI(p);
      if (provider) renderMsgs(provider.id);
      window.JarvisVoice?.speak(p.greeting);
    },
    toggleFullscreen() {
      if (!document.fullscreenElement) {
        document.documentElement.requestFullscreen().catch(err => {
          window.JarvisToast?.show('Fullscreen request denied or not supported', 'warning');
        });
        window.JarvisToast?.show('🖥️ STARK HUD: FULLSCREEN MULTITASKING MODE ACTIVATED', 'success');
      } else {
        if (document.exitFullscreen) document.exitFullscreen();
        window.JarvisToast?.show('🖥️ Exited Fullscreen Mode', 'info');
      }
    },
    openMultitaskWindow(url, title, fullScreen = true) {
      const hud = document.getElementById('multitaskHUD');
      const iframe = document.getElementById('multitaskIframe');
      const t = document.getElementById('mhudTitle');
      if (hud && iframe) {
        iframe.src = url;
        if (t) t.textContent = `🖥️ FULL SCREEN MULTITASKING — ${title || 'APP WINDOW'}`;
        hud.classList.remove('hidden');
        if (fullScreen) hud.classList.add('maximized');
        window.JarvisToast?.show(`🖥️ Full Screen Multitasking Window: ${title}`, 'success');
      }
    },
    closeMultitaskWindow() {
      const hud = document.getElementById('multitaskHUD');
      const iframe = document.getElementById('multitaskIframe');
      if (hud) hud.classList.add('hidden');
      if (iframe) iframe.src = 'about:blank';
    },
    toggleMultitaskMaximize() {
      const hud = document.getElementById('multitaskHUD');
      if (hud) {
        hud.classList.toggle('maximized');
      }
    },
    popoutMultitaskWindow() {
      const iframe = document.getElementById('multitaskIframe');
      if (iframe && iframe.src && iframe.src !== 'about:blank') {
        window.open(iframe.src, '_blank');
        this.closeMultitaskWindow();
      }
    }
  };
})();

document.addEventListener('DOMContentLoaded', () => window.JarvisApp.init());
