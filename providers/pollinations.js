/* Pollinations AI — 100% Free Unlimited AI Provider
   Auto-routes through PHP proxy on CORS/Failed to fetch errors */
window.JarvisProviders = window.JarvisProviders || [];
window.JarvisProviders.push({
  id: 'pollinations',
  name: 'Pollinations AI',
  icon: '🌸',
  color: '#FF69B4',
  keyPlaceholder: '(no key needed — 100% free)',
  free: true,
  freeNote: '100% free, unlimited, no key',
  models: [
    { id: 'openai',    label: 'GPT-4o via Pollinations (Free)' },
    { id: 'qwen',      label: 'Qwen 2.5 72B (Free)'            },
    { id: 'mistral',   label: 'Mistral Small (Free)'            },
    { id: 'llama',     label: 'Llama 3.3 70B (Free)'            },
  ],
  capabilities: ['🆓 100% Free', '💬 Chat', '💻 Code', '⚡ Unlimited', '🔓 No Key'],

  async sendMessage(apiKey, model, messages, onChunk, useProxy, proxyUrl) {
    const lastMsg = messages.filter(m => m.role === 'user').pop()?.content || 'Hello';
    const sysMsg  = messages.find(m => m.role === 'system')?.content || 'You are JARVIS, Tony Stark\'s AI assistant. Be concise and helpful.';
    const selectedModel = (model && model !== 'pollinations') ? model : 'openai';
    const proxy = proxyUrl || 'http://localhost/jarvis/proxy.php';

    // ── Method 1: Direct GET (fastest, no CORS issue usually) ──
    try {
      const url = `https://text.pollinations.ai/${encodeURIComponent(lastMsg)}?system=${encodeURIComponent(sysMsg)}&model=${selectedModel}&seed=${Math.floor(Math.random()*99999)}`;
      const res = await fetch(url, { signal: AbortSignal.timeout(20000) });
      if (res.ok) {
        const text = await res.text();
        if (text && text.trim().length > 2) { onChunk(text.trim()); return; }
      }
    } catch(e) {
      console.warn('[Pollinations] Direct GET failed:', e.message);
    }

    // ── Method 2: Direct POST ──
    try {
      const res = await fetch('https://text.pollinations.ai/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [{ role:'system', content:sysMsg }, { role:'user', content:lastMsg }],
          model: selectedModel,
          seed: Math.floor(Math.random() * 99999),
        }),
        signal: AbortSignal.timeout(20000),
      });
      if (res.ok) {
        const text = await res.text();
        if (text && text.trim().length > 2) { onChunk(text.trim()); return; }
      }
    } catch(e) {
      console.warn('[Pollinations] Direct POST failed:', e.message);
    }

    // ── Method 3: Route through PHP Proxy (bypasses CORS completely) ──
    try {
      const res = await fetch(proxy, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: lastMsg, system: sysMsg, model: selectedModel }),
      });
      if (res.ok) {
        const data = await res.json();
        const reply = data.reply || data.choices?.[0]?.message?.content;
        if (reply && reply.trim().length > 2) { onChunk(reply.trim()); return; }
      }
    } catch(e) {
      console.warn('[Pollinations] PHP Proxy failed:', e.message);
    }

    // ── Method 4: HuggingFace Free Inference fallback ──
    try {
      const hfRes = await fetch('https://api-inference.huggingface.co/models/microsoft/Phi-3-mini-4k-instruct/v1/chat/completions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'microsoft/Phi-3-mini-4k-instruct',
          messages: [{ role:'system', content:sysMsg }, { role:'user', content:lastMsg }],
          max_tokens: 800,
          stream: false,
        }),
        signal: AbortSignal.timeout(25000),
      });
      if (hfRes.ok) {
        const data = await hfRes.json();
        const answer = data.choices?.[0]?.message?.content;
        if (answer) { onChunk(answer.trim()); return; }
      }
    } catch(e) {
      console.warn('[Pollinations] HuggingFace fallback failed:', e.message);
    }

    // ── Final Offline Fallback ──
    onChunk("I'm operating in offline mode, Sir. Network connectivity to AI endpoints is currently unavailable. Please check your internet connection or enable the PHP proxy in Settings.");
  }
});
