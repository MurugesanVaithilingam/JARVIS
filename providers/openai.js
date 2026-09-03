/* OpenAI ChatGPT — with auto-fallback */
window.JarvisProviders = window.JarvisProviders || [];
window.JarvisProviders.push({
  id: 'openai',
  name: 'ChatGPT',
  icon: '🤖',
  color: '#10A37F',
  keyPlaceholder: 'sk-... (platform.openai.com)',
  free: false,
  models: [
    { id: 'gpt-4o',        label: 'GPT-4o'        },
    { id: 'gpt-4o-mini',   label: 'GPT-4o Mini'   },
    { id: 'gpt-4-turbo',   label: 'GPT-4 Turbo'   },
    { id: 'gpt-3.5-turbo', label: 'GPT-3.5 Turbo' },
    { id: 'o1-mini',       label: 'o1 Mini'        },
    { id: 'o3-mini',       label: 'o3 Mini'        },
  ],
  capabilities: ['💬 Chat', '🧠 Reasoning', '💻 Code', '📸 Vision', '🌐 Browsing'],

  async sendMessage(apiKey, model, messages, onChunk, useProxy, proxyUrl) {
    if (!apiKey) {
      window.JarvisToast?.show('ChatGPT: No API key — using Pollinations free fallback', 'info', 3000);
      return window._jarvisFallback(messages, onChunk, proxyUrl);
    }
    const endpoint = 'https://api.openai.com/v1/chat/completions';
    const body = JSON.stringify({ model, messages, stream: true, max_tokens: 4096 });
    const headers = { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` };
    try {
      return await streamSSE(useProxy ? proxyUrl : endpoint, body, headers, onChunk, useProxy, endpoint);
    } catch(e) {
      console.warn('[OpenAI] Error, using fallback:', e.message);
      return window._jarvisFallback(messages, onChunk, proxyUrl);
    }
  }
});
