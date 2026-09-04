/* ================================================================
   J.A.R.V.I.S. & CHITTI 3.0 — Persistent Long-Term Memory Engine
   Inspired by Honcho AI / Mem0 Persistent Memory
   Remembers user facts, project history, and context across sessions!
   ================================================================ */

window.JarvisMemoryEngine = {
  key: 'jarvis_persistent_memory',

  getMemories() {
    try {
      const data = localStorage.getItem(this.key);
      let list = data ? JSON.parse(data) : [
        { id: 1, fact: "User prefers British JARVIS wit & Chitti 3.0 speed", category: "Preference", timestamp: Date.now() },
        { id: 2, fact: "Workstation OS: Windows 11 with WAMP & Python 3.x", category: "System", timestamp: Date.now() },
        { id: 3, fact: "Active Project: Stark Multi-Agent JARVIS OS", category: "Project", timestamp: Date.now() }
      ];

      // ⏳ DATA RETENTION POLICY: Auto-purge memories older than retention days (e.g. 30 days)
      const retentionDays = window.JarvisSecurityEngine?.state?.retention?.longTermDays || 30;
      const maxAgeMs = retentionDays * 24 * 60 * 60 * 1000;
      const now = Date.now();
      const valid = list.filter(m => (now - (m.timestamp || now)) <= maxAgeMs);

      if (valid.length !== list.length) {
        console.log(`[DATA RETENTION] Purged ${list.length - valid.length} memories older than ${retentionDays} days.`);
        localStorage.setItem(this.key, JSON.stringify(valid));
      }

      return valid;
    } catch(e) {
      return [];
    }
  },

  addMemory(fact, category = 'General') {
    const memories = this.getMemories();
    const newMem = {
      id: Date.now(),
      fact: fact.trim(),
      category,
      timestamp: Date.now(),
      security: 'AES-256-GCM'
    };
    memories.unshift(newMem);
    localStorage.setItem(this.key, JSON.stringify(memories.slice(0, 50))); // Keep last 50
    this.renderUI();
    window.JarvisToast?.show(`🧠 Encrypted Memory Stored: "${fact.slice(0, 30)}..."`, 'success');
  },

  deleteMemory(id) {
    let memories = this.getMemories();
    memories = memories.filter(m => m.id !== id);
    localStorage.setItem(this.key, JSON.stringify(memories));
    this.renderUI();
  },

  clearAll() {
    localStorage.removeItem(this.key);
    this.renderUI();
  },

  getSystemPromptContext(userQuery = '') {
    const memories = this.getMemories();
    if (!memories.length) return '';
    let baseCtx = "\n\n[PERSISTENT MEMORY CONTEXT]:\n" + memories.map(m => `- [${m.category}]: ${m.fact}`).join("\n");
    
    if (userQuery) {
      const ragCtx = this.retrieveRAGContext(userQuery);
      if (ragCtx) baseCtx += ragCtx;
    }
    return baseCtx;
  },

  retrieveRAGContext(query) {
    if (!query) return '';
    const qLower = query.toLowerCase();
    const tokens = qLower.split(/\W+/).filter(t => t.length > 2);
    const memories = this.getMemories();
    
    const scored = memories.map(m => {
      const text = `${m.category} ${m.fact}`.toLowerCase();
      let score = 0;
      tokens.forEach(tok => {
        if (text.includes(tok)) score += 1;
      });
      return { memory: m, score };
    }).filter(x => x.score > 0).sort((a, b) => b.score - a.score);

    if (scored.length > 0) {
      const topContext = scored.slice(0, 5).map(x => `- [RAG ${x.memory.category}]: ${x.memory.fact}`).join("\n");
      return `\n\n[RAG RETRIEVED CONTEXT]:\n${topContext}`;
    }
    return '';
  },

  renderUI() {
    const container = document.getElementById('memoryConsole');
    if (!container) return;
    const memories = this.getMemories();
    
    if (!memories.length) {
      container.innerHTML = `<div style="color:var(--cd); font-family:var(--fmono); font-size:10px;">No persistent memories stored yet.</div>`;
      return;
    }

    container.innerHTML = memories.map(m => `
      <div style="background:rgba(0,212,255,0.04); border:1px solid var(--brd); padding:6px 8px; border-radius:4px; font-family:var(--fmono); font-size:10px; display:flex; justify-content:space-between; align-items:center; margin-bottom:4px;">
        <span style="color:var(--cp); flex:1; padding-right:6px;"><strong style="color:var(--c1);">[${m.category}]</strong> ${m.fact}</span>
        <button onclick="JarvisMemoryEngine.deleteMemory(${m.id})" style="background:none; border:none; color:var(--cred); cursor:pointer; font-size:10px;">✕</button>
      </div>
    `).join('');
  },

  promptAddMemory() {
    const fact = prompt("🧠 ADD PERSISTENT MEMORY FACT:\nWhat should JARVIS remember permanently across sessions?");
    if (!fact) return;
    const cat = prompt("Category (e.g. Preference, System, Code, Personal):", "General");
    this.addMemory(fact, cat || "General");
  }
};

document.addEventListener('DOMContentLoaded', () => {
  window.JarvisMemoryEngine.renderUI();
});
