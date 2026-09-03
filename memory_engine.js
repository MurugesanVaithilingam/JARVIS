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
      return data ? JSON.parse(data) : [
        { id: 1, fact: "User prefers British JARVIS wit & Chitti 3.0 speed", category: "Preference", timestamp: Date.now() },
        { id: 2, fact: "Workstation OS: Windows 11 with WAMP & Python 3.x", category: "System", timestamp: Date.now() },
        { id: 3, fact: "Active Project: Stark Multi-Agent JARVIS OS", category: "Project", timestamp: Date.now() }
      ];
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
      timestamp: Date.now()
    };
    memories.unshift(newMem);
    localStorage.setItem(this.key, JSON.stringify(memories.slice(0, 50))); // Keep last 50
    this.renderUI();
    window.JarvisToast?.show(`🧠 Memory Stored: "${fact.slice(0, 30)}..."`, 'success');
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

  getSystemPromptContext() {
    const memories = this.getMemories();
    if (!memories.length) return '';
    return "\n\n[PERSISTENT MEMORY CONTEXT]:\n" + memories.map(m => `- [${m.category}]: ${m.fact}`).join("\n");
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
