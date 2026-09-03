/* ================================================================
   J.A.R.V.I.S. Layer 5 — Procedural Skills Engine (skills_engine.js)
   Saves and executes step-by-step procedural skills (PHP, MySQL, PDF, Excel)
   ================================================================ */

window.JarvisSkillsEngine = {
  skills: [
    {
      id: 'php_mysql_crud',
      name: 'PHP & MySQL Architecture',
      icon: '🐘',
      desc: 'Builds complete WAMP PHP/MySQL REST APIs with PDO prepared statements, CORS, and JSON response handles.',
      steps: ['Connect PDO MySQL', 'Sanitize Input', 'Prepare Query', 'Return JSON Output']
    },
    {
      id: 'pdf_invoice_gen',
      name: 'PDF Receipt Generator',
      icon: '📄',
      desc: 'Generates company loan receipts, invoices, and vouchers with automated PDF rendering.',
      steps: ['Fetch Loan Details', 'Calculate Interest & Remaining', 'Render Template', 'Output PDF Stream']
    },
    {
      id: 'excel_report_exporter',
      name: 'Excel Data Exporter',
      icon: '📊',
      desc: 'Transforms raw database tables into styled Excel CSV/XLSX spreadsheets with pivot summaries.',
      steps: ['Extract MySQL Records', 'Format Currency & Dates', 'Build CSV Buffer', 'Trigger File Download']
    },
    {
      id: 'owasp_security_audit',
      name: 'OWASP Security Audit',
      icon: '🛡️',
      desc: 'Audits code for SQL Injection, Reflected XSS, Broken Access Control, and Insecure Deserialization.',
      steps: ['Scan Input Sources', 'Audit Query Strings', 'Verify Auth Tokens', 'Generate Security Vulnerability Report']
    },
    {
      id: 'alexa_skill_pipeline',
      name: 'Alexa Voice Pipeline',
      icon: '🎙️',
      desc: 'Simulates end-to-end Alexa voice flow: Wake Word -> ASR -> NLU Intent/Slots -> AWS Lambda -> TTS Playback.',
      steps: ['Local Wake-Word Acoustic Match', 'Stream Audio to ASR Cloud', 'Extract Intent & Slot Entities', 'Dispatch to Skill Lambda', 'Synthesize & Playback TTS Audio']
    },
    {
      id: 'smarthome_matter_router',
      name: 'Smart Home Matter Hub',
      icon: '🏡',
      desc: 'Coordinates IoT smart lights, TV & devices using Cloud-to-Cloud OAuth and local Matter/Wi-Fi packet routing.',
      steps: ['Parse Voice/App Command', 'Check Protocol (Cloud API vs Matter Mesh)', 'Dispatch Local LAN Wake-on-LAN / Packet', 'Update Device State & Sync HUD']
    },
    {
      id: 'multi_llm_model_matrix',
      name: 'Multi-LLM Dispatch Engine',
      icon: '⚡',
      desc: 'Routes prompts dynamically to Gemini (Multimodal/Search), ChatGPT (Logic/Code), or Claude (Prose/Analysis).',
      steps: ['Evaluate Query Type', 'Select Optimal AI Core', 'Build Context Window Payload', 'Execute Neural Query & Format HUD Output']
    },
    {
      id: 'siri_neural_engine',
      name: 'Siri Neural Engine Local Core',
      icon: '🍎',
      desc: 'Executes offline on-device actions (local app launchers, file explorer, diagnostics) with privacy tokenization.',
      steps: ['Capture Voice via Neural Engine', 'Check Offline Capability', 'Execute Direct Subprocess Command', 'Tokenize Cloud Fallback Data']
    },
    {
      id: 'google_assistant_graph',
      name: 'Google Knowledge Graph Search',
      icon: '🔍',
      desc: 'Queries live web search index, maps real-time data, and maintains multi-turn conversational context.',
      steps: ['Fetch Live Web Index Query', 'Parse Knowledge Graph Entities', 'Synchronize Realtime Weather/Time', 'Render Multimodal Visual Response']
    },
    {
      id: 'jarvis_hybrid_core',
      name: 'JARVIS Tri-Hybrid Orchestrator',
      icon: '🌐',
      desc: 'Unified Orchestrator combining Siri Local Speed, Alexa IoT Skill Routing, and Google Assistant Multimodal Intelligence.',
      steps: ['Classify Incoming Intent', 'Route to Siri/Alexa/Google Paradigm', 'Execute Subprocess / API Payload', 'Synthesize Voice Output & Update HUD']
    },
    {
      id: 'rag_knowledge_retrieval',
      name: 'RAG Context Retrieval Pipeline',
      icon: '📚',
      desc: 'Retrieval-Augmented Generation: Scans memories & workspace docs, scores keyword relevance, and augments LLM prompt.',
      steps: ['Tokenize User Query', 'Scan Persistent Memory & Workspace Docs', 'Inject Relevant Context Chunks', 'Generate Grounded LLM Output']
    },
    {
      id: 'python_nlp_ml_pipeline',
      name: 'Python NLP & ML Execution Core',
      icon: '🐍',
      desc: 'Executes Python sub-routines, runs NLP entity extraction, and evaluates Machine Learning pipelines live on PC.',
      steps: ['Extract Spoken/Written Intent', 'Dispatch Subprocess to Python Daemon', 'Execute Scikit-Learn/NLP Python Code', 'Stream Console Output to HUD']
    }
  ],

  getSkills() {
    return this.skills;
  },

  executeSkill(id) {
    const skill = this.skills.find(s => s.id === id);
    if (!skill) return;
    window.JarvisAudio?.playBeep(1100, 'sine', 0.1);
    
    const stepsFormatted = skill.steps.map((st, i) => `  [Step ${i+1}]: ${st}`).join('\n');
    window.JarvisApp?.sendMessageDirect(`Execute Skill [${skill.name}]:\n\nWorkflow Procedure:\n${stepsFormatted}`);
    window.JarvisToast?.show(`🎓 Skill Executing: ${skill.name}`, 'info');
  },

  renderUI() {
    const container = document.getElementById('skillsList');
    if (!container) return;
    container.innerHTML = this.skills.map(s => `
      <div onclick="JarvisSkillsEngine.executeSkill('${s.id}')" style="background:rgba(0,212,255,0.04); border:1px solid var(--brd); padding:6px 8px; border-radius:4px; margin-bottom:4px; cursor:pointer; transition:0.2s;" class="pli">
        <div style="font-family:var(--fhud); font-size:10px; color:var(--c1);">${s.icon} ${s.name}</div>
        <div style="font-family:var(--fbody); font-size:10px; color:var(--cd); margin-top:2px;">${s.desc}</div>
      </div>
    `).join('');
  }
};

document.addEventListener('DOMContentLoaded', () => {
  window.JarvisSkillsEngine.renderUI();
});
