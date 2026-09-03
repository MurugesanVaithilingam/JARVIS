/* ================================================================
   J.A.R.V.I.S. v3 — Settings & Multi-Key Automatic Rotation Engine
   Supports Key Pools (comma-separated keys) & Auto-Rotation on Limit
   ================================================================ */

(function() {
  window.JarvisSettings = {
    providers: [],
    keyIndexes: {},

    open() {
      this._populate();
      this._load();
      document.getElementById('settingsModal')?.classList.remove('hidden');
    },
    close() {
      document.getElementById('settingsModal')?.classList.add('hidden');
    },

    save() {
      this.providers.forEach(p => {
        const el = document.getElementById(`k_${p.id}`);
        if (!el) return;
        const v = el.value.trim();
        if (v) localStorage.setItem(`jarvis_key_${p.id}`, v);
        else   localStorage.removeItem(`jarvis_key_${p.id}`);
      });
      const els = {
        elevenlabs: document.getElementById('k_elevenlabs'),
        el_voice:   document.getElementById('k_el_voice'),
        proxy:      document.getElementById('proxyUrl'),
        useProxy:   document.getElementById('useProxy'),
      };
      if (els.elevenlabs?.value.trim()) localStorage.setItem('jarvis_key_elevenlabs', els.elevenlabs.value.trim()); else localStorage.removeItem('jarvis_key_elevenlabs');
      if (els.el_voice?.value.trim())   localStorage.setItem('jarvis_el_voice', els.el_voice.value.trim());          else localStorage.removeItem('jarvis_el_voice');
      localStorage.setItem('jarvis_proxy_url', els.proxy?.value.trim() || 'http://localhost/jarvis/proxy.php');
      localStorage.setItem('jarvis_use_proxy', els.useProxy?.checked ? '1' : '0');

      window.JarvisApp?.onSettingsChanged();
      this.close();
      window.JarvisToast?.show('Configuration saved with Key Rotation support.', 'success');
    },

    // Gets active key (or cycles through comma-separated key pool)
    getKey(id) {
      const raw = localStorage.getItem(`jarvis_key_${id}`) || '';
      if (!raw) return '';
      const keys = raw.split(',').map(k => k.trim()).filter(k => k.length > 0);
      if (!keys.length) return '';
      const idx = this.keyIndexes[id] || 0;
      return keys[idx % keys.length];
    },

    // Automatically rotates to the NEXT key in pool when rate limit / quota is hit!
    rotateKey(id) {
      const raw = localStorage.getItem(`jarvis_key_${id}`) || '';
      if (!raw) return '';
      const keys = raw.split(',').map(k => k.trim()).filter(k => k.length > 0);
      if (keys.length > 1) {
        const currentIdx = this.keyIndexes[id] || 0;
        const nextIdx = (currentIdx + 1) % keys.length;
        this.keyIndexes[id] = nextIdx;
        window.JarvisToast?.show(`🔄 Key limit reached for ${id} — auto-rotated to Key #${nextIdx + 1}!`, 'warning', 4000);
        return keys[nextIdx];
      }
      return keys[0];
    },

    getELKey()        { return localStorage.getItem('jarvis_key_elevenlabs') || ''; },
    getELVoice()      { return localStorage.getItem('jarvis_el_voice') || ''; },
    getProxyUrl()     { return localStorage.getItem('jarvis_proxy_url') || 'http://localhost/jarvis/proxy.php'; },
    useProxy()        { return localStorage.getItem('jarvis_use_proxy') === '1'; },

    _populate() {
      const container = document.getElementById('keyForms');
      if (!container || !this.providers.length) return;
      const sec = document.createElement('div');
      sec.className = 'msection';
      sec.innerHTML = '<h3 class="msect-title">AI PROVIDER KEYS (COMMAS FOR MULTI-KEY ROTATION)</h3>';
      const grid = document.createElement('div');
      grid.className = 'kgrid';
      this.providers.forEach(p => {
        const fg = document.createElement('div');
        fg.className = 'fg';
        const isFree = p.free;
        fg.innerHTML = `
          <label class="flbl">
            ${p.icon} ${p.name}
            ${isFree ? `<span class="fhint">— ${p.freeNote || 'free tier'}</span>` : '<span class="fhint">— comma-separate keys for auto-rotation</span>'}
          </label>
          <input type="password" class="finp" id="k_${p.id}"
            placeholder="${p.keyPlaceholder || 'API key 1, API key 2...'}" autocomplete="off">
        `;
        grid.appendChild(fg);
      });
      sec.appendChild(grid);
      container.innerHTML = '';
      container.appendChild(sec);
    },

    _load() {
      this.providers.forEach(p => {
        const el = document.getElementById(`k_${p.id}`);
        if (el) el.value = localStorage.getItem(`jarvis_key_${p.id}`) || '';
      });
      const el = document.getElementById('k_elevenlabs');
      const ev = document.getElementById('k_el_voice');
      const px = document.getElementById('proxyUrl');
      const up = document.getElementById('useProxy');
      if (el)  el.value     = this.getELKey();
      if (ev)  ev.value     = this.getELVoice();
      if (px)  px.value     = this.getProxyUrl();
      if (up)  up.checked   = this.useProxy();
    },
  };

  document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('settingsBtn')  ?.addEventListener('click', () => window.JarvisSettings.open());
    document.getElementById('settingsClose')?.addEventListener('click', () => window.JarvisSettings.close());
    document.getElementById('cancelCfg')   ?.addEventListener('click', () => window.JarvisSettings.close());
    document.getElementById('saveCfg')     ?.addEventListener('click', () => window.JarvisSettings.save());
    document.getElementById('settingsModal')?.addEventListener('click', e => {
      if (e.target === e.currentTarget) window.JarvisSettings.close();
    });

    // Persona modal
    document.getElementById('personaBtn')  ?.addEventListener('click', () => {
      window.JarvisPersonaManager?.buildUI();
      document.getElementById('personaModal')?.classList.remove('hidden');
    });
    document.getElementById('personaClose')?.addEventListener('click', () => {
      document.getElementById('personaModal')?.classList.add('hidden');
    });
    document.getElementById('personaModal')?.addEventListener('click', e => {
      if (e.target === e.currentTarget) document.getElementById('personaModal')?.classList.add('hidden');
    });

    // Tools button toggle
    document.getElementById('toolsBtn')?.addEventListener('click', () => {
      const panel = document.getElementById('toolsPanel');
      const btn   = document.getElementById('toolsBtn');
      if (panel) {
        panel.classList.toggle('hidden');
        btn?.classList.toggle('active');
      }
    });
  });
})();
