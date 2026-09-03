/* xAI Grok Provider — with auto-fallback */
window.JarvisProviders = window.JarvisProviders || [];
window.JarvisProviders.push({
  id: 'grok',
  name: 'Grok',
  icon: '🔮',
  color: '#1DA1F2',
  keyPlaceholder: 'xai-... (console.x.ai)',
  free: false,
  models: [
    { id: 'grok-3',      label: 'Grok 3'      },
    { id: 'grok-3-mini', label: 'Grok 3 Mini' },
    { id: 'grok-2-1212', label: 'Grok 2'      },
    { id: 'grok-beta',   label: 'Grok Beta'   },
  ],
  capabilities: ['💬 Chat', '🌐 Real-time Web', '🧠 Reasoning', '😄 Humor'],

  async sendMessage(apiKey, model, messages, onChunk, useProxy, proxyUrl) {
    if (!apiKey) {
      window.JarvisToast?.show('Grok: No API key — using free fallback', 'info', 3000);
      return window._jarvisFallback(messages, onChunk, proxyUrl);
    }
    const endpoint = 'https://api.x.ai/v1/chat/completions';
    const body = JSON.stringify({ model, messages, stream: true, max_tokens: 4096 });
    const headers = { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` };
    try {
      return await streamSSE(useProxy ? proxyUrl : endpoint, body, headers, onChunk, useProxy, endpoint);
    } catch(e) {
      console.warn('[Grok] Error, using fallback:', e.message);
      return window._jarvisFallback(messages, onChunk, proxyUrl);
    }
  }
});
