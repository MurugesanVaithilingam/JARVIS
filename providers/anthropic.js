/* Anthropic Claude — with auto-fallback */
window.JarvisProviders = window.JarvisProviders || [];
window.JarvisProviders.push({
  id: 'anthropic',
  name: 'Claude',
  icon: '🧡',
  color: '#D4A27F',
  keyPlaceholder: 'sk-ant-... (console.anthropic.com)',
  free: false,
  models: [
    { id: 'claude-opus-4-5',          label: 'Claude Opus 4.5'   },
    { id: 'claude-sonnet-4-5',        label: 'Claude Sonnet 4.5' },
    { id: 'claude-haiku-3-5',         label: 'Claude Haiku 3.5'  },
    { id: 'claude-3-opus-20240229',   label: 'Claude 3 Opus'     },
    { id: 'claude-3-sonnet-20240229', label: 'Claude 3 Sonnet'   },
    { id: 'claude-3-haiku-20240307',  label: 'Claude 3 Haiku'    },
  ],
  capabilities: ['💬 Chat', '🧠 Reasoning', '💻 Code', '📄 Long Context', '🎨 Creative'],

  async sendMessage(apiKey, model, messages, onChunk, useProxy, proxyUrl) {
    if (!apiKey) {
      window.JarvisToast?.show('Claude: No API key — using free fallback', 'info', 3000);
      return window._jarvisFallback(messages, onChunk, proxyUrl);
    }
    const endpoint = 'https://api.anthropic.com/v1/messages';
    const systemMsg = messages.find(m => m.role === 'system');
    const chatMsgs  = messages.filter(m => m.role !== 'system');
    const body = JSON.stringify({
      model, max_tokens: 4096, stream: true,
      system: systemMsg?.content || 'You are JARVIS, Tony Stark\'s AI assistant.',
      messages: chatMsgs,
    });
    const headers = {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    };
    try {
      return await streamSSE(useProxy ? proxyUrl : endpoint, body, headers, onChunk, useProxy, endpoint, 'anthropic');
    } catch(e) {
      console.warn('[Claude] Error, using fallback:', e.message);
      return window._jarvisFallback(messages, onChunk, proxyUrl);
    }
  }
});
