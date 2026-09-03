/* ================================================================
   J.A.R.V.I.S. & CHITTI 3.0 — Realtime Autonomous Agent Engine
   Allows the AI to inspect directory files, create new files, edit existing code,
   and execute actions directly from the HUD interface in real-time!
   ================================================================ */

window.JarvisAgentEngine = {
  async listWorkspaceFiles() {
    try {
      const res = await fetch('jarvis_executor.php', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'list_files' })
      });
      const data = await res.json();
      return data.files || [];
    } catch(e) {
      console.error('Failed to list workspace files:', e);
      return [];
    }
  },

  async readFile(filename) {
    try {
      const res = await fetch('jarvis_executor.php', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'read_file', filename })
      });
      const data = await res.json();
      return data.content || '';
    } catch(e) {
      console.error('Failed to read file:', e);
      return '';
    }
  },

  async createFile(filename, content) {
    try {
      const res = await fetch('jarvis_executor.php', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'create_file', filename, content })
      });
      const data = await res.json();
      if (data.status === 'success') {
        window.JarvisToast?.show(`📄 File created: ${filename}`, 'success');
      } else {
        window.JarvisToast?.show(`Error creating file: ${data.message}`, 'error');
      }
      return data;
    } catch(e) {
      console.error('Failed to create file:', e);
      return { status: 'error', message: e.message };
    }
  },

  async editFile(filename, content) {
    return this.createFile(filename, content);
  },

  // Interactive File Creator Prompt Tool
  promptCreateFile() {
    window.JarvisAudio?.playBeep(900, 'sine', 0.1);
    const fname = prompt("📄 STARK AGENT FILE CREATOR\nEnter filename (e.g. test.py, index.js, script.php):");
    if (!fname) return;
    const content = prompt(`Enter code or text content for '${fname}':`);
    if (content === null) return;
    this.createFile(fname, content);
  },

  async launchApp(app) {
    try {
      const res = await fetch('jarvis_executor.php', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'launch_app', app })
      });
      const data = await res.json();
      if (data.status === 'success') {
        window.JarvisToast?.show(`⚡ ${data.message}`, 'success');
      } else {
        window.JarvisToast?.show(`Error: ${data.message}`, 'error');
      }
      return data;
    } catch(e) {
      console.error('Failed to launch app:', e);
      return { status: 'error', message: e.message };
    }
  },

  // Interactive App Launcher Prompt Tool
  promptLaunchApp() {
    window.JarvisAudio?.playAlarm();
    const app = prompt("⚡ STARK APP LAUNCHER\nEnter application name (e.g. notepad, calculator, google, youtube):");
    if (!app) return;
    this.launchApp(app);
  },

  async runTerminalCmd(cmd) {
    try {
      const res = await fetch('jarvis_executor.php', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'run_terminal_cmd', cmd })
      });
      const data = await res.json();
      return data;
    } catch(e) {
      console.error('Failed to run terminal command:', e);
      return { status: 'error', message: e.message };
    }
  },

  // 💻 Interactive Stark CMD Terminal Prompt
  async promptTerminalCmd() {
    window.JarvisAudio?.playBeep(900, 'square', 0.1);
    const cmd = prompt("💻 STARK INTERACTIVE CMD TERMINAL\nEnter command to execute (e.g. dir, ipconfig, systeminfo, netsh wlan show profiles):", "netsh wlan show profiles");
    if (!cmd) return;
    
    window.JarvisToast?.show(`Executing command: ${cmd}...`, 'info');
    const res = await this.runTerminalCmd(cmd);
    if (res.status === 'success') {
      alert(`💻 CMD TERMINAL OUTPUT [${res.command}]:\n\n${res.output}`);
    } else {
      alert(`❌ CMD TERMINAL ERROR:\n\n${res.message}`);
    }
  },

  // 📶 Wi-Fi Diagnostics & Saved Profiles Inspector
  async wifiTracker() {
    window.JarvisAudio?.playAlarm();
    window.JarvisToast?.show('Scanning Saved Wi-Fi Profiles & Network Credentials...', 'warning');
    
    // First list all Wi-Fi profiles
    const listRes = await this.runTerminalCmd('netsh wlan show profiles');
    if (listRes.status !== 'success') {
      alert('Failed to retrieve Wi-Fi profiles.');
      return;
    }
    
    const output = listRes.output;
    // Extract profile names
    const lines = output.split('\n');
    const profiles = [];
    lines.forEach(line => {
      if (line.includes(':')) {
        const parts = line.split(':');
        const name = parts[1].trim();
        if (line.toLowerCase().includes('all user profile') || line.toLowerCase().includes('user profile')) {
          if (name) profiles.push(name);
        }
      }
    });

    if (profiles.length === 0) {
      alert(`📶 WI-FI NETWORK DIAGNOSTICS:\n\n${output}`);
      return;
    }

    // Ask user which profile details to reveal or inspect all
    const select = prompt(`📶 SAVED WI-FI PROFILES DETECTED:\n\nFound: ${profiles.join(', ')}\n\nEnter profile name to view security key (or leave blank to view '${profiles[0]}'):`, profiles[0]);
    if (select === null) return;
    
    const targetWifi = select.trim() || profiles[0];
    const keyRes = await this.runTerminalCmd(`netsh wlan show profile name="${targetWifi}" key=clear`);
    
    alert(`📶 WI-FI NETWORK CREDENTIALS & SECURITY DETAILED REPORT [${targetWifi}]:\n\n${keyRes.output}`);
  },

  // Interactive Directory Scanner Tool
  async promptListFiles() {
    window.JarvisAudio?.playBeep(800, 'triangle', 0.1);
    window.JarvisToast?.show('Scanning workspace directory...', 'info');
    const files = await this.listWorkspaceFiles();
    const formatted = files.map(f => `📄 ${f.name} (${f.size} bytes)`).join('\n');
    alert(`📂 STARK WORKSPACE FILES:\n\n${formatted}`);
  }
};
