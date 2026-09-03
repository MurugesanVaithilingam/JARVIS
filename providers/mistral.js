/* Mistral AI Provider — with auto-fallback */
window.JarvisProviders = window.JarvisProviders || [];
window.JarvisProviders.push({
  id: 'mistral',
  name: 'Mistral',
  icon: '🌪️',
  color: '#FF7000',
  keyPlaceholder: 'Mistral API key (console.mistral.ai)',
  free: false,
  models: [
    { id: 'mistral-large-latest', label: 'Mistral Large (latest)' },
    { id: 'mistral-small-latest', label: 'Mistral Small (latest)' },
    { id: 'codestral-latest',     label: 'Codestral (Code)'       },
    { id: 'open-mistral-nemo',    label: 'Mistral NeMo (free)'    },
    { id: 'open-mixtral-8x22b',   label: 'Mixtral 8x22B'          },
    { id: 'pixtral-large-latest', label: 'Pixtral Large (Vision)' },
  ],
  capabilities: ['💬 Chat', '💻 Code (Codestral)', '🔓 Open Source', '📸 Vision'],

  async sendMessage(apiKey, model, messages, onChunk, useProxy, proxyUrl) {
    if (!apiKey) {
      window.JarvisToast?.show('Mistral: No API key — using free fallback', 'info', 3000);
      return window._jarvisFallback(messages, onChunk, proxyUrl);
    }
    const endpoint = 'https://api.mistral.ai/v1/chat/completions';
    const body = JSON.stringify({ model, messages, stream: true, max_tokens: 4096 });
    const headers = { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` };
    try {
      return await streamSSE(useProxy ? proxyUrl : endpoint, body, headers, onChunk, useProxy, endpoint);
    } catch(e) {
      console.warn('[Mistral] Error, using fallback:', e.message);
      return window._jarvisFallback(messages, onChunk, proxyUrl);
    }
  }
});
