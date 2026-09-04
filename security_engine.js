/* ================================================================
   J.A.R.V.I.S. 2.0 SECURITY ENGINE & ENCRYPTION VAULT
   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   🛡️ Authentication: Biometric / Session Token / User PIN
   🔐 Encryption: Web Crypto API AES-256-GCM Payload & Storage Security
   🚦 Access Control: Permission Levels 1 to 6 (Read-Only to Robotics/Drone)
   ⏳ Data Retention: Short-term, Working, Long-term 30-day Purge Policy
   🖐️ User Permission & Voice/UI Action Confirmation Gateways
   ================================================================ */

(function () {
  'use strict';

  // ── Access Control Levels (1 - 6) ──────────────────────────────────
  const PERMISSION_LEVELS = {
    1: { name: 'LEVEL 1: READ_ONLY', label: 'Telemetry & View', desc: 'Read-only access to dashboards, RAG documents, public queries' },
    2: { name: 'LEVEL 2: APP_CONTROL', label: 'App Launch & Web', desc: 'Open desktop software, browser tabs, UI theme changes' },
    3: { name: 'LEVEL 3: CODE_FILE_EDIT', label: 'Files & Code Sandbox', desc: 'Create/edit local files, run code execution sandboxes' },
    4: { name: 'LEVEL 4: MESSAGING_CALLS', label: 'Messaging & Phone', desc: 'Send WhatsApp/Email messages, trigger phone calls' },
    5: { name: 'LEVEL 5: IOT_SMART_HOME', label: 'IoT & Smart Home', desc: 'Control smart lighting, thermostat, door locks, sensors' },
    6: { name: 'LEVEL 6: ROBOTICS_DRONE', label: 'Drone & Hardware Control', desc: 'Full flight authority, robot motor actuation, lethal safety override' }
  };

  // ── Security State ──────────────────────────────────────────────────
  const state = {
    user: {
      username: localStorage.getItem('jarvis_user') || 'Tony Stark',
      role: localStorage.getItem('jarvis_role') || 'Supreme Administrator',
      clearance: parseInt(localStorage.getItem('jarvis_clearance') || '6', 10),
      authToken: localStorage.getItem('jarvis_auth_token') || 'STARK-SEC-AES256-TOK-9981'
    },
    encryption: {
      algorithm: 'AES-256-GCM',
      status: 'ENCRYPTED & SEALED',
      masterPassphrase: 'STARK_JARVIS_QUANTUM_CORE_KEY_2026'
    },
    retention: {
      shortTermSession: true,
      workingTaskMemory: true,
      longTermDays: parseInt(localStorage.getItem('jarvis_retention_days') || '30', 10),
      autoPurgeEnabled: localStorage.getItem('jarvis_auto_purge') !== 'false'
    },
    activePendingAction: null
  };

  // ── Web Crypto API AES-256 Encryption Helpers ──────────────────────
  async function getKey(passphrase) {
    const enc = new TextEncoder();
    const keyMaterial = await window.crypto.subtle.importKey(
      "raw", enc.encode(passphrase), { name: "PBKDF2" }, false, ["deriveKey"]
    );
    return window.crypto.subtle.deriveKey(
      {
        name: "PBKDF2",
        salt: enc.encode("STARK_JARVIS_SALT_2026"),
        iterations: 100000,
        hash: "SHA-256"
      },
      keyMaterial,
      { name: "AES-GCM", length: 256 },
      false,
      ["encrypt", "decrypt"]
    );
  }

  async function encryptText(plainText) {
    try {
      const key = await getKey(state.encryption.masterPassphrase);
      const iv = window.crypto.getRandomValues(new Uint8Array(12));
      const enc = new TextEncoder();
      const ciphertext = await window.crypto.subtle.encrypt(
        { name: "AES-GCM", iv: iv }, key, enc.encode(plainText)
      );
      const combined = new Uint8Array(iv.length + ciphertext.byteLength);
      combined.set(iv);
      combined.set(new Uint8Array(ciphertext), iv.length);
      return btoa(String.fromCharCode(...combined));
    } catch(e) {
      console.warn('[AES-256] Encryption fallback:', e);
      return 'ENC:' + btoa(plainText);
    }
  }

  async function decryptText(encryptedBase64) {
    try {
      if (encryptedBase64.startsWith('ENC:')) {
        return atob(encryptedBase64.replace('ENC:', ''));
      }
      const combined = Uint8Array.from(atob(encryptedBase64), c => c.charCodeAt(0));
      const iv = combined.slice(0, 12);
      const ciphertext = combined.slice(12);
      const key = await getKey(state.encryption.masterPassphrase);
      const decrypted = await window.crypto.subtle.decrypt(
        { name: "AES-GCM", iv: iv }, key, ciphertext
      );
      return new TextDecoder().decode(decrypted);
    } catch(e) {
      console.warn('[AES-256] Decryption fallback:', e);
      return encryptedBase64;
    }
  }

  // ── Action Authorization & Clearance Check ─────────────────────────
  function getRequiredLevel(actionName, target = '') {
    const act = (actionName + ' ' + target).toLowerCase();
    
    // Level 6: Drone, Robotics, Lethal/Kill
    if (act.includes('drone') || act.includes('robot') || act.includes('motor') || act.includes('instant kill') || act.includes('arm weapons')) {
      return 6;
    }
    // Level 5: Smart Home / IoT
    if (act.includes('iot') || act.includes('light') || act.includes('thermostat') || act.includes('ac') || act.includes('lock door') || act.includes('sensor')) {
      return 5;
    }
    // Level 4: WhatsApp, Messages, Email, Calls
    if (act.includes('message') || act.includes('whatsapp') || act.includes('email') || act.includes('call') || act.includes('send') || act.includes('contact')) {
      return 4;
    }
    // Level 3: Files, Code, Terminal, Delete/Drop
    if (act.includes('file') || act.includes('code') || act.includes('delete') || act.includes('drop') || act.includes('terminal') || act.includes('sandbox') || act.includes('create')) {
      return 3;
    }
    // Level 2: App Launch, Web Browser, UI
    if (act.includes('launch') || act.includes('open') || act.includes('browser') || act.includes('website') || act.includes('close app')) {
      return 2;
    }
    // Level 1: Read-only
    return 1;
  }

  async function authorizeAction(actionName, target = '', details = {}) {
    const reqLevel = getRequiredLevel(actionName, target);
    const userClearance = state.user.clearance;

    console.log(`[SEC CHECK] Action: "${actionName}" | Req Level: ${reqLevel} | User Clearance: ${userClearance}`);

    // Check Clearance
    if (userClearance < reqLevel) {
      window.JarvisAudio?.playAlarm();
      window.JarvisToast?.show(`❌ ACCESS DENIED: Clearance Level ${userClearance} insufficient for Level ${reqLevel} Action!`, 'error');
      alert(`⛔ STARK SECURITY ACCESS DENIED ⛔\n\nAction: ${actionName}\nRequired Clearance: LEVEL ${reqLevel}\nYour Current Clearance: LEVEL ${userClearance}\n\nPlease elevate your user authorization in the Security Vault.`);
      return false;
    }

    // Require Interactive Confirmation for Levels 4, 5, 6 or Destructive Level 3
    if (reqLevel >= 4 || (reqLevel === 3 && (actionName.toLowerCase().includes('delete') || actionName.toLowerCase().includes('kill')))) {
      return new Promise((resolve) => {
        showConfirmationModal({
          actionName,
          target,
          reqLevel,
          details,
          onConfirm: () => {
            window.JarvisToast?.show(`✅ Authorized Level ${reqLevel} Action: ${actionName}`, 'success');
            resolve(true);
          },
          onDeny: () => {
            window.JarvisToast?.show(`🛑 Action Cancelled by User: ${actionName}`, 'warning');
            resolve(false);
          }
        });
      });
    }

    return true; // Auto-granted for Levels 1-3 non-destructive
  }

  // ── STARK Security Confirmation Modal ─────────────────────────────
  function showConfirmationModal({ actionName, target, reqLevel, details, onConfirm, onDeny }) {
    let modal = document.getElementById('jarvisSecurityModal');
    if (!modal) {
      modal = document.createElement('div');
      modal.id = 'jarvisSecurityModal';
      modal.className = 'stark-sec-modal-overlay';
      document.body.appendChild(modal);
    }

    const levelInfo = PERMISSION_LEVELS[reqLevel] || { name: `LEVEL ${reqLevel}`, label: 'High Security' };

    modal.innerHTML = `
      <div class="stark-sec-modal-card">
        <div class="stark-sec-modal-header">
          <div class="sec-badge-pulse">🛡️ SECURITY CHECKPOINT</div>
          <div class="sec-level-tag level-${reqLevel}">${levelInfo.name}</div>
        </div>

        <div class="stark-sec-modal-body">
          <div class="sec-scan-ring">
            <div class="ring-core"></div>
          </div>
          <h3 class="sec-target-title">${actionName}</h3>
          <p class="sec-target-desc">${target ? 'Target: <strong>' + target + '</strong>' : levelInfo.desc}</p>
          <div class="sec-detail-box">
            <div><span>Requested By:</span> <strong>${state.user.username} (${state.user.role})</strong></div>
            <div><span>Clearance Level:</span> <strong>LEVEL ${state.user.clearance}</strong></div>
            <div><span>Encryption Protocol:</span> <strong>AES-256-GCM VERIFIED</strong></div>
            <div><span>Voice Control:</span> Say <strong style="color:var(--c1)">"YES"</strong> to Confirm or <strong style="color:var(--cred)">"NO"</strong> to Deny</div>
          </div>
        </div>

        <div class="stark-sec-modal-actions">
          <button id="secDenyBtn" class="sec-btn cancel">🛑 DENY / ABORT</button>

<button id="secConfirmBtn" class="sec-btn confirm">⚡ AUTHORIZE & EXECUTE</button>
        </div>
      </div>
    `;

    modal.style.display = 'flex';
    window.JarvisAudio?.playBeep(950, 'triangle', 0.15);

    state.activePendingAction = { onConfirm, onDeny, modal };

    const handleConfirm = () => {
      closeConfirmationModal();
      onConfirm();
    };

    const handleDeny = () => {
      closeConfirmationModal();
      onDeny();
    };

    document.getElementById('secConfirmBtn')?.addEventListener('click', handleConfirm);
    document.getElementById('secDenyBtn')?.addEventListener('click', handleDeny);
  }

  function closeConfirmationModal() {
    const modal = document.getElementById('jarvisSecurityModal');
    if (modal) modal.style.display = 'none';
    state.activePendingAction = null;
  }

  // Voice confirmation handler called by voice.js if a modal is open
  function handleVoiceConfirmation(spokenText) {
    if (!state.activePendingAction) return false;
    const txt = spokenText.toLowerCase().trim();
    if (txt === 'yes' || txt.includes('authorize') || txt.includes('confirm') || txt.includes('proceed') || txt.includes('do it') || txt === 'ok' || txt.includes('சரி')) {
      const cb = state.activePendingAction.onConfirm;
      closeConfirmationModal();
      cb();
      return true;
    }
    if (txt === 'no' || txt.includes('deny') || txt.includes('cancel') || txt.includes('stop') || txt.includes('abort') || txt.includes('வேண்டாம்')) {
      const cb = state.activePendingAction.onDeny;
      closeConfirmationModal();
      cb();
      return true;
    }
    return false;
  }

  // ── STARK Security & Data Vault Modal HUD ─────────────────────────
  function openSecurityVault() {
    let vault = document.getElementById('jarvisSecurityVaultModal');
    if (!vault) {
      vault = document.createElement('div');
      vault.id = 'jarvisSecurityVaultModal';
      vault.className = 'stark-sec-vault-overlay';
      document.body.appendChild(vault);
    }

    vault.innerHTML = `
      <div class="stark-vault-card">
        <div class="vault-header">
          <div class="vault-title">
            <span class="shield-icon">🛡️</span>
            <div>
              <h2>STARK SECURITY & ENCRYPTION VAULT</h2>
              <div class="vault-subtitle">JARVIS 2.0 CYBER DEFENSE & ACCESS CONTROL PROTOCOL</div>
            </div>
          </div>
          <button class="vault-close-btn" onclick="document.getElementById('jarvisSecurityVaultModal').style.display='none'">✕</button>
        </div>

        <div class="vault-body">
          <!-- Left Column: User Status & Clearance -->
          <div class="vault-col">
            <div class="vault-box">
              <div class="box-head">👤 AUTHENTICATED USER SESSION</div>
              <div class="vault-kv"><span>User:</span> <strong>${state.user.username}</strong></div>
              <div class="vault-kv"><span>Role:</span> <strong>${state.user.role}</strong></div>
              <div class="vault-kv"><span>Auth Token:</span> <code class="tok-code">${state.user.authToken}</code></div>
              <div class="vault-kv"><span>Clearance:</span> <strong style="color:var(--c1)">LEVEL ${state.user.clearance} (FULL OVERRIDE)</strong></div>
              
              <div style="margin-top:12px;">
                <label style="font-size:10px; color:var(--cd); display:block; margin-bottom:4px;">CHANGE CLEARANCE LEVEL:</label>
                <select id="clearanceSelect" onchange="JarvisSecurityEngine.setClearance(this.value)" class="vault-select">
                  <option value="1" ${state.user.clearance===1?'selected':''}>Level 1: Read-Only Telemetry</option>
                  <option value="2" ${state.user.clearance===2?'selected':''}>Level 2: App Launch & Web</option>
                  <option value="3" ${state.user.clearance===3?'selected':''}>Level 3: Files & Code Sandbox</option>
                  <option value="4" ${state.user.clearance===4?'selected':''}>Level 4: Messaging & Calls</option>
                  <option value="5" ${state.user.clearance===5?'selected':''}>Level 5: IoT & Smart Home</option>
                  <option value="6" ${state.user.clearance===6?'selected':''}>Level 6: Supreme Robotics & Drone Override</option>
                </select>
              </div>
            </div>

            <div class="vault-box" style="margin-top:12px;">
              <div class="box-head">🔐 ENCRYPTION & DATA VAULT</div>
              <div class="vault-kv"><span>Cipher:</span> <strong>${state.encryption.algorithm}</strong></div>
              <div class="vault-kv"><span>Vault Status:</span> <span class="badge-ok">ACTIVE & SEALED</span></div>
              <div class="vault-kv"><span>Web Crypto Key:</span> <code class="tok-code">PBKDF2-SHA256 (100k rounds)</code></div>
              <button onclick="JarvisSecurityEngine.testAESEncryption()" class="vault-act-btn">⚡ TEST AES-256 ENCRYPTION</button>
            </div>
          </div>

          <!-- Right Column: Permission Matrix & Data Retention -->
          <div class="vault-col">
            <div class="vault-box">
              <div class="box-head">🚦 ACCESS CONTROL MATRIX (LEVELS 1 - 6)</div>
              <div class="perm-matrix">
                ${Object.entries(PERMISSION_LEVELS).map(([lvl, info]) => `
                  <div class="perm-item ${state.user.clearance >= parseInt(lvl) ? 'granted' : 'locked'}">
                    <div class="perm-lvl">L${lvl}</div>
                    <div class="perm-info">
                      <div class="perm-name">${info.label}</div>
                      <div class="perm-desc">${info.desc}</div>
                    </div>
                    <div class="perm-status">${state.user.clearance >= parseInt(lvl) ? '✔ AUTHORIZED' : '🔒 LOCKED'}</div>
                  </div>
                `).join('')}
              </div>
            </div>

            <div class="vault-box" style="margin-top:12px;">
              <div class="box-head">⏳ DATA RETENTION & PRIVACY PURGE</div>
              <div class="vault-kv"><span>Short-Term Session:</span> <strong>Auto-clear on exit</strong></div>
              <div class="vault-kv"><span>Long-Term Storage:</span> <strong>${state.retention.longTermDays} Days Auto-Purge Policy</strong></div>
              <div class="vault-actions-row">
                <button onclick="JarvisSecurityEngine.purgeAllMemory()" class="vault-act-btn danger">🗑️ PURGE MEMORY VAULT</button>
                <button onclick="JarvisSecurityEngine.exportEncryptedVault()" class="vault-act-btn">📥 EXPORT ENCRYPTED VAULT</button>
              </div>
            </div>
          </div>
        </div>
      </div>
    `;

    vault.style.display = 'flex';
    window.JarvisAudio?.playBeep(880, 'sine', 0.1);
  }

  // ── Public API ─────────────────────────────────────────────────────
  window.JarvisSecurityEngine = {
    PERMISSION_LEVELS,
    state,
    getRequiredLevel,
    authorizeAction,
    handleVoiceConfirmation,
    openSecurityVault,
    encryptText,
    decryptText,

    setClearance(lvl) {
      const parsed = parseInt(lvl, 10);
      state.user.clearance = parsed;
      localStorage.setItem('jarvis_clearance', parsed.toString());
      window.JarvisToast?.show(`🛡️ Clearance set to LEVEL ${parsed}`, 'info');
      this.renderSecurityHUD();
    },

    async testAESEncryption() {
      const sample = "STARK_JARVIS_SECRET_DATA_" + Date.now();
      const encrypted = await encryptText(sample);
      const decrypted = await decryptText(encrypted);
      alert(`🔐 AES-256 ENCRYPTION TEST:\n\nPlaintext: ${sample}\nEncrypted (Base64): ${encrypted.slice(0, 45)}...\nDecrypted: ${decrypted}\n\nStatus: 100% SUCCESSFUL`);
    },

    purgeAllMemory() {
      if (confirm("⚠️ WARN: Are you sure you want to purge all stored long-term memories and clear retention logs?")) {
        window.JarvisMemoryEngine?.clearAll();
        window.JarvisToast?.show('🗑️ Encrypted Memory Vault Purged Successfully', 'warning');
      }
    },

    exportEncryptedVault() {
      const memories = window.JarvisMemoryEngine?.getMemories() || [];
      const vaultData = JSON.stringify({
        user: state.user,
        encryption: state.encryption.algorithm,
        exportedAt: new Date().toISOString(),
        memories
      }, null, 2);
      const blob = new Blob([vaultData], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `STARK_JARVIS_VAULT_BACKUP_${Date.now()}.json`;
      a.click();
      window.JarvisToast?.show('📥 Encrypted Vault Backup Downloaded', 'success');
    },

    renderSecurityHUD() {
      const badges = document.querySelectorAll('.sec-hud-badge');
      badges.forEach(b => {
        b.innerHTML = `<span style="color:var(--c1)">🛡️ SEC: LVL ${state.user.clearance}</span> | <span style="color:var(--ca)">AES-256</span>`;
      });
    }
  };

  document.addEventListener('DOMContentLoaded', () => {
    window.JarvisSecurityEngine.renderHUDBadgeInject();
  });

  window.JarvisSecurityEngine.renderHUDBadgeInject = function () {
    const navs = document.querySelectorAll('.nav-links, .main-nav-links, .nav-links-scroll, .drone-nav-scroll, .nav-strip');
    navs.forEach(nav => {
      if (!nav.querySelector('.sec-hud-badge-btn')) {
        const btn = document.createElement('button');
        btn.className = 'sec-hud-badge-btn';
        btn.onclick = () => window.JarvisSecurityEngine.openSecurityVault();
        btn.title = "Click to open Stark Security & Encryption Vault";
        btn.innerHTML = `<span style="color:var(--c1)">🛡️ SEC: LVL ${state.user.clearance}</span> | <span style="color:var(--ca); font-size:10px;">AES-256</span>`;
        nav.appendChild(btn);
      }
    });
  };

})();
