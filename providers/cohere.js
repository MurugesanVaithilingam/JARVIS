/* Cohere Provider — with auto-fallback */
window.JarvisProviders = window.JarvisProviders || [];
window.JarvisProviders.push({
  id: 'cohere',
  name: 'Cohere',
  icon: '🔷',
  color: '#39594D',
  keyPlaceholder: 'co-... (dashboard.cohere.com)',
  free: true,
  freeNote: 'Trial key available free',
  models: [
    { id: 'command-r-plus-08-2024', label: 'Command R+ (Aug 2024)' },
    { id: 'command-r-08-2024',      label: 'Command R (Aug 2024)'  },
    { id: 'command-r7b-12-2024',    label: 'Command R7B'           },
    { id: 'command-light',          label: 'Command Light'         },
  ],
  capabilities: ['💬 Chat', '🔍 RAG Search', '📄 Summarization', '🆓 Trial Key'],

  async sendMessage(apiKey, model, messages, onChunk, useProxy, proxyUrl) {
    if (!apiKey) {
      window.JarvisToast?.show('Cohere: No API key — using free fallback', 'info', 3000);
      return window._jarvisFallback(messages, onChunk, proxyUrl);
    }
    const sysMsg      = messages.find(m => m.role === 'system');
    const chatMsgs    = messages.filter(m => m.role !== 'system');
    const preamble    = sysMsg?.content || '';
    const chatHistory = chatMsgs.slice(0, -1).map(m => ({
      role: m.role === 'user' ? 'USER' : 'CHATBOT',
      message: m.content,
    }));
    const lastMsg = chatMsgs[chatMsgs.length - 1]?.content || '';

    try {
      const endpoint = 'https://api.cohere.com/v1/chat';
      const res = await fetch(useProxy ? (proxyUrl || 'http://localhost/jarvis/proxy.php') : endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
        body: JSON.stringify({ model, preamble, chat_history: chatHistory, message: lastMsg }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      const text = data.text || data.message?.content?.[0]?.text || '';
      if (text) onChunk(text);
    } catch(e) {
      console.warn('[Cohere] Error, using fallback:', e.message);
      return window._jarvisFallback(messages, onChunk, proxyUrl);
    }
  }
});
