/* DeepSeek Provider — with auto-fallback */
window.JarvisProviders = window.JarvisProviders || [];
window.JarvisProviders.push({
  id: 'deepseek',
  name: 'DeepSeek',
  icon: '🌊',
  color: '#4D6BFE',
  keyPlaceholder: 'sk-... (platform.deepseek.com)',
  free: false,
  models: [
    { id: 'deepseek-chat',     label: 'DeepSeek Chat (V3)'   },
    { id: 'deepseek-reasoner', label: 'DeepSeek R1 Reasoner' },
  ],
  capabilities: ['💬 Chat', '🧠 Reasoning', '💻 Code', '🔬 Research'],

  async sendMessage(apiKey, model, messages, onChunk, useProxy, proxyUrl) {
    if (!apiKey) {
      window.JarvisToast?.show('DeepSeek: No API key — using free fallback', 'info', 3000);
      return window._jarvisFallback(messages, onChunk, proxyUrl);
    }
    const endpoint = 'https://api.deepseek.com/chat/completions';
    const body = JSON.stringify({ model, messages, stream: true, max_tokens: 4096 });
    const headers = { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` };
    try {
      return await streamSSE(useProxy ? proxyUrl : endpoint, body, headers, onChunk, useProxy, endpoint);
    } catch(e) {
      console.warn('[DeepSeek] Error, using fallback:', e.message);
      return window._jarvisFallback(messages, onChunk, proxyUrl);
    }
  }
});
