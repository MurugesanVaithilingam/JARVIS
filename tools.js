/* ================================================================
   J.A.R.V.I.S. & KAREN — High-Tech AI Tools & Computer Science Matrix
   Includes ML Analyzer, DSA Complexity Solver, Network Packet Inspector & Audio Synth
   ================================================================ */

// Web Audio API Sound Synthesizer
window.JarvisAudio = {
  ctx: null,
  _getCtx() {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (AudioCtx) this.ctx = new AudioCtx();
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
    return this.ctx;
  },

  playBeep(freq = 880, type = 'sine', duration = 0.1, vol = 0.15) {
    const ctx = this._getCtx();
    if (!ctx) return;
    try {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(freq, ctx.currentTime);
      gain.gain.setValueAtTime(vol, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + duration);
    } catch(e){}
  },

  playThwip() {
    const ctx = this._getCtx();
    if (!ctx) return;
    try {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(2200, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(150, ctx.currentTime + 0.15);
      gain.gain.setValueAtTime(0.2, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.15);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.15);
    } catch(e){}
  },

  playAlarm() {
    const ctx = this._getCtx();
    if (!ctx) return;
    try {
      for (let i = 0; i < 3; i++) {
        setTimeout(() => this.playBeep(1200, 'sawtooth', 0.12, 0.25), i * 140);
      }
    } catch(e){}
  }
};

window.JarvisTools = {
  _inject(prefix, autoSend = false) {
    const inp = document.getElementById('chatInput');
    if (!inp) return;
    inp.value = prefix;
    inp.focus();
    inp.style.height = 'auto';
    inp.style.height = Math.min(inp.scrollHeight, 120) + 'px';
    if (autoSend) {
      setTimeout(() => window.JarvisApp?.sendMessage(), 100);
    }
  },

  webSearch() {
    window.JarvisAudio.playBeep(600, 'sine', 0.08);
    this._inject('Search the web for: ');
    window.JarvisToast?.show('Tip: Select Perplexity or Grok for live web search.', 'info');
  },

  summarize() {
    window.JarvisAudio.playBeep(700, 'sine', 0.08);
    this._inject('Please summarize the following text in clear bullet points:\n\n');
  },

  codeMode() {
    window.JarvisAudio.playBeep(800, 'sine', 0.08);
    this._inject('Write clean, fully-commented code for: ');
    window.JarvisToast?.show('Tip: Groq & Codestral excel at code generation.', 'info');
  },

  translate() {
    window.JarvisAudio.playBeep(650, 'sine', 0.08);
    this._inject('Translate the following into English (or target language):\n\n');
  },

  analyze() {
    window.JarvisAudio.playBeep(750, 'sine', 0.08);
    this._inject('Perform a deep, comprehensive analysis of: ');
  },

  compare() {
    window.JarvisAudio.playBeep(900, 'sine', 0.08);
    const providers = window.JarvisProviders?.map(p => p.name).join(', ') || 'AI models';
    this._inject(`Compare the following AI models (${providers}) and generate a clear comparison table.`, true);
  },

  // 🧠 1. Machine Learning Model Builder & Hyperparameter Optimizer
  mlModelBuilder() {
    window.JarvisAudio.playBeep(1100, 'triangle', 0.12);
    this._inject('Build a complete Python Machine Learning pipeline (using Scikit-Learn / PyTorch): perform feature engineering, train/test split, hyperparameter tuning, and evaluate using Accuracy, F1-Score, and Confusion Matrix for the following problem:\n\n', false);
    window.JarvisToast?.show('Machine Learning Studio Active', 'info');
  },

  // 📊 2. Exploratory Data Analysis & Statistics Engine
  dataAnalysisEngine() {
    window.JarvisAudio.playBeep(1000, 'sine', 0.12);
    this._inject('Perform Exploratory Data Analysis (EDA) in Pandas & Seaborn: calculate statistical distribution (mean, std, skew), detect anomalies/missing values, and write SQL aggregation queries for this dataset:\n\n', false);
    window.JarvisToast?.show('Data Analysis & EDA Engine Active', 'info');
  },

  // 🏗️ 3. DSA Solver & Big-O Complexity Optimizer
  dsaSolver() {
    window.JarvisAudio.playBeep(1200, 'sawtooth', 0.12);
    this._inject('Solve this Data Structures & Algorithms (DSA) problem: provide optimal code solution (Python/JS/C++), break down Time Complexity O(N) and Space Complexity O(1), and trace dry-run step-by-step:\n\n', false);
    window.JarvisToast?.show('DSA Algorithm Solver Active', 'info');
  },

  // 🌐 4. Computer Networking & OSI Packet Inspector
  networkInspector() {
    window.JarvisAudio.playBeep(900, 'square', 0.12);
    this._inject('Perform a Computer Networking analysis: inspect OSI 7-Layer breakdown, TCP vs UDP socket handshake, IP routing table, and Wireshark packet capture analysis for:\n\n', false);
    window.JarvisToast?.show('Network Protocol Inspector Active', 'info');
  },

  // 📄 Autonomous File Creator & Directory Explorer
  createFile() {
    window.JarvisAgentEngine?.promptCreateFile();
  },

  listFiles() {
    window.JarvisAgentEngine?.promptListFiles();
  },

  launchApp() {
    window.JarvisAgentEngine?.promptLaunchApp();
  },

  addMemory() {
    window.JarvisMemoryEngine?.promptAddMemory();
  },

  promptTerminalCmd() {
    window.JarvisAgentEngine?.promptTerminalCmd();
  },

  wifiTracker() {
    window.JarvisAgentEngine?.wifiTracker();
  },

  // 💻 Stark Pentest & Security Audit Tool
  cyberSecurityAudit() {
    window.JarvisAudio.playAlarm();
    this._inject('Initiate Stark Security Audit & Pentest Analysis: perform vulnerability scan, code auditing, and security risk assessment on the following architecture:\n\n', false);
    window.JarvisToast?.show('Cyber Security Auditor Engaged', 'warning');
  },

  // ⚡ Live JS Code Execution Sandbox
  async runCodeSandbox() {
    const ok = await window.JarvisSecurityEngine?.authorizeAction('Execute Code Sandbox', 'Local Browser Engine');
    if (!ok) return;
    window.JarvisAudio.playBeep(950, 'square', 0.1);
    const code = prompt("⚡ STARK CODE SANDBOX\nEnter JavaScript code to execute locally:");
    if (!code) return;
    try {
      const logs = [];
      const customConsole = {
        log: (...args) => logs.push(args.map(a => typeof a === 'object' ? JSON.stringify(a) : a).join(' ')),
        error: (...args) => logs.push('[ERR] ' + args.join(' ')),
      };
      const runFn = new Function('console', code);
      runFn(customConsole);
      const result = logs.join('\n') || 'Code executed successfully with zero output.';
      alert(`⚡ CODE EXECUTION RESULT:\n\n${result}`);
      window.JarvisToast?.show('Code executed successfully in sandbox.', 'success');
    } catch(err) {
      alert(`❌ CODE EXECUTION ERROR:\n\n${err.message}`);
      window.JarvisToast?.show(`Execution Error: ${err.message}`, 'error');
    }
  },

  // 🎨 AI Image Generator Tool
  generateImage() {
    window.JarvisAudio.playBeep(900, 'sine', 0.1);
    const p = prompt("🎨 STARK AI IMAGE GENERATOR\nEnter detailed description of the image to generate:");
    if (!p) return;
    this._inject(`/image ${p}`, true);
    window.JarvisToast?.show('Generating AI Image...', 'info');
  },

  // ⚡ Chitti 3.0 Swarm Microbot Formation Tool
  async chittiSwarmFormation() {
    const ok = await window.JarvisSecurityEngine?.authorizeAction('Swarm Microbot Formation', 'Chitti 3.0 Swarm');
    if (!ok) return;
    window.JarvisAudio.playBeep(1400, 'sawtooth', 0.15);
    const formations = ['Giant Sphere', 'Snake Formation', 'Humanoid Giant', 'Microbot Defensive Shield', 'Machine Gun Array'];
    const choice = formations[Math.floor(Math.random() * formations.length)];
    this._inject(`Chitti 3.0 Swarm Microbot Formation Activated: Initiating ${choice} configuration. Transferring 1 Terahertz swarm telemetry...`, true);
    window.JarvisToast?.show(`⚡ Chitti 3.0 Swarm: ${choice} Activated!`, 'success');
  },

  // 🕸️ Spider-Man Suit Protocols & Diagnostics
  suitDiagnostic() {
    window.JarvisAudio.playThwip();
    const persona = window.JarvisActivePersona;
    const name = persona?.name || 'KAREN';
    this._inject(`Run a full suit diagnostic report: check nano-mesh integrity, web-fluid reserves, thruster/lens calibration, and environmental sensors. Format as a Stark Industries suit status report.`, true);
    window.JarvisToast?.show(`Running ${name} Suit Diagnostic...`, 'info');
  },

  toggleBabyMonitor() {
    window.JarvisAudio.playBeep(1000, 'triangle', 0.15);
    const statusEl = document.getElementById('babyMonitorStatus');
    const isUnlocked = statusEl?.textContent.includes('OFF') || statusEl?.textContent.includes('DISARMED');
    if (statusEl) {
      statusEl.textContent = isUnlocked ? 'ACTIVE / UNLOCKED' : 'DISARMED';
      statusEl.className = isUnlocked ? 'status-val ok' : 'status-val';
    }
    const txt = isUnlocked
      ? "Baby Monitor Protocol disarmed. All advanced suit training protocols, web combination modes, and ocular enhancements are now fully unlocked."
      : "Baby Monitor Protocol engaged. Advanced combat protocols restricted.";
    this._inject(txt, true);
    window.JarvisToast?.show(isUnlocked ? 'Baby Monitor Protocol UNLOCKED!' : 'Baby Monitor Protocol ENGAGED', isUnlocked ? 'success' : 'warning');
  },

  reconScan() {
    window.JarvisAudio.playThwip();
    this._inject('Initiate Enhanced Reconnaissance Mode: scan local environment, identify key points of interest, structural vulnerabilities, and threat vectors.', true);
    window.JarvisToast?.show('Tactical Recon Scanner Active', 'info');
  },

  async instantKill() {
    const ok = await window.JarvisSecurityEngine?.authorizeAction('Instant Kill Protocol', 'Tactical Targeting Matrix');
    if (!ok) return;
    window.JarvisAudio.playAlarm();
    document.body.classList.add('instant-kill-mode');
    this._inject('INSTANT KILL PROTOCOL ACTIVATED. Target acquisition locked. Awaiting engagement parameters.', true);
    window.JarvisToast?.show('⚡ INSTANT KILL PROTOCOL ENGAGED!', 'error', 5000);
    setTimeout(() => {
      document.body.classList.remove('instant-kill-mode');
    }, 8000);
  },

  // 🌐 BROWSER CONTROLLER & PLAYWRIGHT AUTOMATION
  async browserOpenUrl() {
    const url = prompt("🌐 PLAYWRIGHT BROWSER CONTROLLER\nEnter website URL to open & automate:", "https://linkedin.com");
    if (!url) return;
    const ok = await window.JarvisSecurityEngine?.authorizeAction('Open Browser Web URL', url);
    if (!ok) return;
    window.JarvisAudio.playBeep(900, 'sine', 0.1);
    this._inject(`Open website ${url} in Playwright automated browser and read DOM structure.`, true);
    window.JarvisToast?.show(`🌐 Browser Agent Opening: ${url}`, 'info');
  },

  async browserReadPage() {
    window.JarvisAudio.playBeep(950, 'triangle', 0.1);
    this._inject('Read and extract text content from the current active browser page tab using Playwright DOM Parser.', true);
    window.JarvisToast?.show('🌐 Extracting Web Page Content...', 'info');
  },

  // 🗄️ DATABASE & VECTOR RAG ASSISTANT
  async databaseQueryAssistant() {
    const dbName = prompt("🗄️ DATABASE QUERY ASSISTANT\nSelect Database (MySQL / PostgreSQL / Redis / Qdrant):", "MySQL");
    if (!dbName) return;
    const ok = await window.JarvisSecurityEngine?.authorizeAction('Query Database Matrix', dbName);
    if (!ok) return;
    window.JarvisAudio.playBeep(1100, 'sawtooth', 0.12);
    this._inject(`Execute restricted SQL/Vector query on ${dbName} database: SELECT COUNT(*) FROM active_records;`, false);
    window.JarvisToast?.show(`🗄️ ${dbName} Database Connected`, 'success');
  },

  // 📊 DATA ANALYSIS & PANDAS ENGINE
  async pandasDataAnalysis() {
    window.JarvisAudio.playBeep(1000, 'sine', 0.12);
    this._inject('Analyze sales & customer dataset using Pandas, calculate standard deviation, clean missing values, and generate Plotly charts.', false);
    window.JarvisToast?.show('📊 Data Analytics & Pandas Engine Engaged', 'info');
  },

  // 👁️ COMPUTER VISION & YOLO OBJECT DETECTION
  async computerVisionScan() {
    window.JarvisAudio.playBeep(1200, 'square', 0.12);
    this._inject('Initiate Camera Feed Computer Vision Scan: run YOLOv8 object detection, face recognition, and OCR text extraction on visual frame stream.', true);
    window.JarvisToast?.show('👁️ Computer Vision YOLOv8 Active', 'info');
  },

  // 🏠 IoT & SMART HOME CONTROLLER (MQTT / ESP32)
  async iotSmartHomeControl() {
    const dev = prompt("🏠 IoT SMART HOME CONTROLLER\nEnter device & action (e.g. Living Room Light ON, Bedroom AC 22C, Lock Door):", "Living Room Light ON");
    if (!dev) return;
    const ok = await window.JarvisSecurityEngine?.authorizeAction('Control IoT Device', dev);
    if (!ok) return;
    window.JarvisAudio.playBeep(900, 'triangle', 0.1);
    this._inject(`Send MQTT payload to ESP32 Smart Gateway: ACTION="${dev}".`, true);
    window.JarvisToast?.show(`🏠 IoT Gateway Triggered: ${dev}`, 'success');
  },

  // 🤖 ROBOTICS & DRONE TELEMETRY
  async robotTelemetryCheck() {
    const ok = await window.JarvisSecurityEngine?.authorizeAction('Robot Telemetry Check', 'ROS 2 Micro-Rover');
    if (!ok) return;
    window.JarvisAudio.playBeep(1300, 'sawtooth', 0.15);
    this._inject('Query ROS 2 Robot Telemetry: check LiDAR obstacle map, IMU orientation, motor encoder RPM, and battery level.', true);
    window.JarvisToast?.show('🤖 ROS 2 Robot Telemetry Received', 'success');
  },

  async droneBatteryCheck() {
    const ok = await window.JarvisSecurityEngine?.authorizeAction('Drone Telemetry Check', 'PX4 Mark LXXXV Drone');
    if (!ok) return;
    window.JarvisAudio.playBeep(1350, 'sine', 0.15);
    this._inject('Query PX4 MAVLink Drone Telemetry: Altitude, GPS Lock 3D, Airspeed, and Battery Voltage Level.', true);
    window.JarvisToast?.show('🚁 PX4 Drone Telemetry Active', 'info');
  }
};
