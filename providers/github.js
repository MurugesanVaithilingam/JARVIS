/* GitHub Copilot / Azure OpenAI — with auto-fallback */
window.JarvisProviders = window.JarvisProviders || [];
window.JarvisProviders.push({
  id: 'github',
  name: 'Copilot',
  icon: '🐙',
  color: '#6E40C9',
  keyPlaceholder: 'GitHub token (github.com/settings/tokens)',
  free: true,
  freeNote: 'Free with GitHub account',
  models: [
    { id: 'gpt-4o',                      label: 'GPT-4o (via GitHub)'  },
    { id: 'gpt-4o-mini',                 label: 'GPT-4o Mini'          },
    { id: 'o1-mini',                     label: 'o1 Mini'              },
    { id: 'o3-mini',                     label: 'o3 Mini'              },
    { id: 'Meta-Llama-3.1-70B-Instruct', label: 'Llama 3.1 70B'       },
    { id: 'Mistral-large-2407',          label: 'Mistral Large'        },
    { id: 'AI21-Jamba-1.5-Large',        label: 'AI21 Jamba 1.5'      },
  ],
  capabilities: ['💻 Code', '💬 Chat', '🔧 Debugging', '📖 Docs', '🆓 Free with GitHub'],

  async sendMessage(apiKey, model, messages, onChunk, useProxy, proxyUrl) {
    if (!apiKey) {
      window.JarvisToast?.show('GitHub Copilot: No token — using free fallback', 'info', 3000);
      return window._jarvisFallback(messages, onChunk, proxyUrl);
    }
    const endpoint = 'https://models.inference.ai.azure.com/chat/completions';
    const body = JSON.stringify({ model, messages, stream: true, max_tokens: 4096 });
    const headers = { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` };
    try {
      return await streamSSE(useProxy ? proxyUrl : endpoint, body, headers, onChunk, useProxy, endpoint);
    } catch(e) {
      return window._jarvisFallback(messages, onChunk, proxyUrl);
    }
  }
});
