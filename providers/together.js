/* Together AI — with auto-fallback */
window.JarvisProviders = window.JarvisProviders || [];
window.JarvisProviders.push({
  id: 'together',
  name: 'Together',
  icon: '🔥',
  color: '#FF4500',
  keyPlaceholder: 'together-... (api.together.ai)',
  free: true,
  freeNote: 'Free $1 credit + paid plans',
  models: [
    { id: 'meta-llama/Llama-3-70b-chat-hf',             label: 'Llama 3 70B'      },
    { id: 'meta-llama/Meta-Llama-3.1-8B-Instruct-Turbo',label: 'Llama 3.1 8B Turbo'},
    { id: 'mistralai/Mixtral-8x7B-Instruct-v0.1',       label: 'Mixtral 8x7B'     },
    { id: 'Qwen/Qwen2-72B-Instruct',                    label: 'Qwen2 72B'        },
    { id: 'NovaSky-AI/Sky-T1-32B-Preview',              label: 'Sky-T1 32B'       },
  ],
  capabilities: ['💬 Chat', '💻 Code', '🆓 Free Tier', '🔓 Open Source'],

  async sendMessage(apiKey, model, messages, onChunk, useProxy, proxyUrl) {
    if (!apiKey) {
      window.JarvisToast?.show('Together AI: No API key — using free fallback', 'info', 3000);
      return window._jarvisFallback(messages, onChunk, proxyUrl);
    }
    const endpoint = 'https://api.together.xyz/v1/chat/completions';
    const body = JSON.stringify({ model, messages, stream: true, max_tokens: 4096 });
    const headers = { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` };
    try {
      return await streamSSE(useProxy ? proxyUrl : endpoint, body, headers, onChunk, useProxy, endpoint);
    } catch(e) {
      return window._jarvisFallback(messages, onChunk, proxyUrl);
    }
  }
});
