/* ── Groq Provider (Ultra-Fast Free) ─────────────────────────── */
window.JarvisProviders = window.JarvisProviders || [];
window.JarvisProviders.push({
  id: 'groq',
  name: 'Groq',
  icon: '⚡',
  color: '#F55036',
  keyPlaceholder: 'gsk_... (free at console.groq.com)',
  free: true,
  freeNote: 'Free tier — get key at console.groq.com',
  models: [
    { id: 'llama-3.3-70b-versatile',        label: 'Llama 3.3 70B Versatile'  },
    { id: 'llama-3.1-8b-instant',           label: 'Llama 3.1 8B Instant'     },
    { id: 'mixtral-8x7b-32768',             label: 'Mixtral 8x7B'             },
    { id: 'gemma2-9b-it',                   label: 'Gemma 2 9B'               },
    { id: 'deepseek-r1-distill-llama-70b',  label: 'DeepSeek R1 Distill 70B'  },
    { id: 'llama-3.3-70b-specdec',          label: 'Llama 3.3 70B SpecDec'    },
  ],
  capabilities: ['⚡ Ultra Fast', '💬 Chat', '💻 Code', '🆓 Free Tier', '🔓 Open Source'],

  async sendMessage(apiKey, model, messages, onChunk, useProxy, proxyUrl) {
    if (!apiKey) {
      window.JarvisToast?.show('Groq: No API key — using Pollinations free fallback', 'info', 3000);
      return window._jarvisFallback(messages, onChunk, proxyUrl);
    }
    const endpoint = 'https://api.groq.com/openai/v1/chat/completions';
    const body = JSON.stringify({ model, messages, stream: true, max_tokens: 4096 });
    const headers = { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` };
    try {
      return await streamSSE(useProxy ? proxyUrl : endpoint, body, headers, onChunk, useProxy, endpoint);
    } catch(e) {
      console.warn('[Groq] Error, using fallback:', e.message);
      return window._jarvisFallback(messages, onChunk, proxyUrl);
    }
  }
});
