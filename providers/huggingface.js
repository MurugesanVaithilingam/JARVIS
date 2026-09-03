/* HuggingFace Free Inference — with auto-fallback */
window.JarvisProviders = window.JarvisProviders || [];
window.JarvisProviders.push({
  id: 'huggingface',
  name: 'HuggingFace',
  icon: '🤗',
  color: '#FFD21E',
  keyPlaceholder: 'hf_... (free at huggingface.co/settings/tokens)',
  free: true,
  freeNote: 'Free inference — no key needed for many models',
  models: [
    { id: 'Qwen/Qwen2.5-72B-Instruct',               label: 'Qwen 2.5 72B'      },
    { id: 'meta-llama/Llama-3.3-70B-Instruct',       label: 'Llama 3.3 70B'     },
    { id: 'deepseek-ai/DeepSeek-R1-Distill-Qwen-32B',label: 'DeepSeek R1 32B'   },
    { id: 'microsoft/Phi-3-mini-4k-instruct',         label: 'Phi-3 Mini 4K'     },
    { id: 'google/gemma-2-27b-it',                    label: 'Gemma 2 27B'       },
    { id: 'mistralai/Mistral-7B-Instruct-v0.3',       label: 'Mistral 7B Instruct'},
  ],
  capabilities: ['🤗 HuggingFace', '💬 Chat', '💻 Code', '🆓 Free Tier', '🔓 Open Source'],

  async sendMessage(apiKey, model, messages, onChunk, useProxy, proxyUrl) {
    const endpoint = `https://api-inference.huggingface.co/models/${model}/v1/chat/completions`;
    const body = JSON.stringify({ model, messages, stream: true, max_tokens: 2048 });
    const headers = { 'Content-Type': 'application/json' };
    if (apiKey) headers['Authorization'] = `Bearer ${apiKey}`;
    try {
      return await streamSSE(useProxy ? proxyUrl : endpoint, body, headers, onChunk, useProxy, endpoint);
    } catch(e) {
      console.warn('[HuggingFace] Error, using fallback:', e.message);
      return window._jarvisFallback(messages, onChunk, proxyUrl);
    }
  }
});
