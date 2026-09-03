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
