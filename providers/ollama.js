/* Ollama — 100% Local AI Provider */
window.JarvisProviders = window.JarvisProviders || [];
window.JarvisProviders.push({
  id: 'ollama',
  name: 'Ollama',
  icon: '🏠',
  color: '#FFFFFF',
  keyPlaceholder: '(no key needed — local)',
  free: true,
  freeNote: '100% local, no key needed',
  models: [
    { id: 'llama3.2',       label: 'Llama 3.2 (3B)'     },
    { id: 'llama3.1',       label: 'Llama 3.1 (8B)'     },
    { id: 'llama3.1:70b',   label: 'Llama 3.1 (70B)'    },
    { id: 'mistral',        label: 'Mistral 7B'          },
    { id: 'mixtral',        label: 'Mixtral 8x7B'        },
    { id: 'gemma2',         label: 'Gemma 2 (9B)'        },
    { id: 'deepseek-r1',    label: 'DeepSeek R1'         },
    { id: 'qwen2.5',        label: 'Qwen 2.5'            },
    { id: 'phi3.5',         label: 'Phi 3.5 Mini'        },
    { id: 'codellama',      label: 'Code Llama'          },
  ],
  capabilities: ['🏠 100% Local', '🔒 Private', '🆓 Free Forever', '💻 Code', '🔓 No Internet'],

  async sendMessage(apiKey, model, messages, onChunk, useProxy, proxyUrl) {
    // Ollama runs locally — use its own endpoint
    const endpoint = 'http://localhost:11434/api/chat';
    const body = JSON.stringify({ model, messages, stream: true });
    const headers = { 'Content-Type': 'application/json' };

    // Ollama uses NDJSON streaming (newline-delimited JSON), not SSE
    const res = await fetch(endpoint, { method: 'POST', headers, body });
    if (!res.ok) throw new Error(`Ollama error: HTTP ${res.status}. Is Ollama running? Run: ollama serve`);

    const reader  = res.body.getReader();
    const decoder = new TextDecoder();
    let buf = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buf += decoder.decode(value, { stream: true });
      const lines = buf.split('\n');
      buf = lines.pop() ?? '';
      for (const line of lines) {
        if (!line.trim()) continue;
        try {
          const parsed = JSON.parse(line);
          const chunk  = parsed.message?.content || '';
          if (chunk) onChunk(chunk);
        } catch(e) {}
      }
    }
  }
});
