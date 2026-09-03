/* Perplexity AI — with auto-fallback */
window.JarvisProviders = window.JarvisProviders || [];
window.JarvisProviders.push({
  id: 'perplexity',
  name: 'Perplexity',
  icon: '🔍',
  color: '#20808D',
  keyPlaceholder: 'pplx-... (www.perplexity.ai/settings/api)',
  free: false,
  models: [
    { id: 'sonar-pro',                         label: 'Sonar Pro (Web Search)'  },
    { id: 'sonar',                             label: 'Sonar (Web Search)'      },
    { id: 'sonar-reasoning-pro',               label: 'Sonar Reasoning Pro'     },
    { id: 'sonar-deep-research',               label: 'Sonar Deep Research'     },
    { id: 'llama-3.1-sonar-large-128k-online', label: 'Llama Sonar Large'       },
  ],
  capabilities: ['🌐 Real-time Web', '🔍 Search', '📚 Citations', '🧠 Reasoning'],

  async sendMessage(apiKey, model, messages, onChunk, useProxy, proxyUrl) {
    if (!apiKey) {
      window.JarvisToast?.show('Perplexity: No API key — using free fallback', 'info', 3000);
      return window._jarvisFallback(messages, onChunk, proxyUrl);
    }
    const endpoint = 'https://api.perplexity.ai/chat/completions';
    const body = JSON.stringify({ model, messages, stream: true, max_tokens: 4096 });
    const headers = { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` };
    try {
      return await streamSSE(useProxy ? proxyUrl : endpoint, body, headers, onChunk, useProxy, endpoint);
    } catch(e) {
      return window._jarvisFallback(messages, onChunk, proxyUrl);
    }
  }
});
