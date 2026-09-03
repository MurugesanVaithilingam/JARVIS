/* Google Gemini Provider — with auto-fallback */
window.JarvisProviders = window.JarvisProviders || [];
window.JarvisProviders.push({
  id: 'gemini',
  name: 'Gemini',
  icon: '✨',
  color: '#4285F4',
  keyPlaceholder: 'AIza... (free at aistudio.google.com)',
  free: true,
  freeNote: 'Free at aistudio.google.com',
  models: [
    { id: 'gemini-2.0-flash',               label: 'Gemini 2.0 Flash'          },
    { id: 'gemini-2.0-flash-thinking-exp',  label: 'Gemini 2.0 Flash Thinking' },
    { id: 'gemini-1.5-pro',                 label: 'Gemini 1.5 Pro'            },
    { id: 'gemini-1.5-flash',               label: 'Gemini 1.5 Flash'          },
    { id: 'gemini-2.5-flash-preview-05-20', label: 'Gemini 2.5 Flash Preview'  },
  ],
  capabilities: ['💬 Chat', '📸 Vision', '📄 Long Context', '🎵 Audio', '💻 Code'],

  async sendMessage(apiKey, model, messages, onChunk, useProxy, proxyUrl) {
    if (!apiKey) {
      window.JarvisToast?.show('Gemini: No API key — using free fallback (get free key at aistudio.google.com)', 'info', 4000);
      return window._jarvisFallback(messages, onChunk, proxyUrl);
    }
    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${model}:streamGenerateContent?alt=sse&key=${apiKey}`;
    const systemMsg = messages.find(m => m.role === 'system');
    const chatMsgs  = messages.filter(m => m.role !== 'system').map(m => ({
      role: m.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: m.content }],
    }));
    const bodyObj = { contents: chatMsgs };
    if (systemMsg) bodyObj.systemInstruction = { parts: [{ text: systemMsg.content }] };
    const body = JSON.stringify(bodyObj);
    const headers = { 'Content-Type': 'application/json' };
    try {
      return await streamSSE(useProxy ? proxyUrl : endpoint, body, headers, onChunk, useProxy, endpoint, 'gemini');
    } catch(e) {
      console.warn('[Gemini] Error, using fallback:', e.message);
      return window._jarvisFallback(messages, onChunk, proxyUrl);
    }
  }
});
