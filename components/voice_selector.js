/* ================================================================
   J.A.R.V.I.S. Voice Selector Panel
   - Lists ALL available browser voices
   - Girl voices highlighted separately
   - Live preview button for each voice
   - Saves selected voice to localStorage
   ================================================================ */

(function () {

  // ── Known Girl / Female voice keywords ────────────────────────
  const GIRL_KEYWORDS = [
    'female','woman','girl','zira','samantha','victoria','fiona','moira',
    'tessa','veena','karen','allison','ava','susan','serena','linda',
    'alice','amelie','anna','nora','sara','lekha','heera','raveena',
    'google hindi female','google us english','google uk english female',
    'microsoft zira','microsoft hazel','microsoft susan','microsoft heera'
  ];
  const BOY_KEYWORDS = [
    'male','man','daniel','david','james','mark','rishi','alex',
    'george','lee','oliver','aaron','arthur','albert','google uk english male',
    'microsoft david','microsoft james','microsoft george','microsoft mark'
  ];

  function detectGender(v) {
    const n = (v.name + ' ' + v.lang).toLowerCase();
    if (GIRL_KEYWORDS.some(k => n.includes(k))) return 'girl';
    if (BOY_KEYWORDS.some(k => n.includes(k))) return 'boy';
    return 'unknown';
  }

  // ── Get selected voice preference ─────────────────────────────
  window.JarvisVoiceSelector = {
    getVoiceName() { return localStorage.getItem('jarvis_browser_voice') || ''; },
    setVoiceName(name) { localStorage.setItem('jarvis_browser_voice', name); },

    getSelectedVoice() {
      const saved = this.getVoiceName();
      const voices = window.speechSynthesis?.getVoices() || [];
      return voices.find(v => v.name === saved) || null;
    },

    // Open voice selector modal
    open() {
      const modal = document.getElementById('voiceSelectorModal');
      if (!modal) { this._buildModal(); }
      this._renderVoices();
      document.getElementById('voiceSelectorModal')?.classList.remove('hidden');
    },

    close() {
      document.getElementById('voiceSelectorModal')?.classList.add('hidden');
    },

    // Preview a voice
    preview(voiceName, text) {
      const voices = window.speechSynthesis?.getVoices() || [];
      const v = voices.find(x => x.name === voiceName);
      window.speechSynthesis.cancel();
      const utt = new SpeechSynthesisUtterance(text || 'Hello Sir, I am your personal AI assistant JARVIS. How may I help you today?');
      if (v) utt.voice = v;
      utt.rate = 0.95; utt.pitch = 1; utt.volume = 1;
      window.speechSynthesis.speak(utt);
    },

    select(voiceName) {
      this.setVoiceName(voiceName);
      // Update voice.js to use this voice
      document.querySelectorAll('.vcard').forEach(c => c.classList.remove('selected'));
      document.querySelector(`.vcard[data-voice="${CSS.escape(voiceName)}"]`)?.classList.add('selected');
      window.JarvisToast?.show(`✅ Voice set: ${voiceName}`, 'success', 3000);
    },

    _renderVoices() {
      const voices = window.speechSynthesis?.getVoices() || [];
      const container = document.getElementById('voiceGrid');
      if (!container) return;

      container.innerHTML = '';

      if (voices.length === 0) {
        container.innerHTML = '<p style="color:var(--c2);padding:20px;text-align:center;">⚠ No voices found. Try refreshing the page or use Chrome/Edge.</p>';
        return;
      }

      const saved = this.getVoiceName();

      // Separate girl / boy / other
      const girls   = voices.filter(v => detectGender(v) === 'girl');
      const boys    = voices.filter(v => detectGender(v) === 'boy');
      const others  = voices.filter(v => detectGender(v) === 'unknown');

      const renderSection = (title, emoji, list, cls) => {
        if (!list.length) return;
        const hdr = document.createElement('div');
        hdr.className = 'vsect-hdr';
        hdr.innerHTML = `${emoji} ${title} <span class="vcount">${list.length}</span>`;
        container.appendChild(hdr);

        const grid = document.createElement('div');
        grid.className = 'vgrid';
        list.forEach(v => {
          const card = document.createElement('div');
          card.className = `vcard ${cls} ${v.name === saved ? 'selected' : ''}`;
          card.dataset.voice = v.name;
          card.innerHTML = `
            <div class="vname">${v.name}</div>
            <div class="vlang">${v.lang} ${v.localService ? '· Local' : '· Online'}</div>
            <div class="vbtns">
              <button class="vprev" onclick="window.JarvisVoiceSelector.preview('${v.name.replace(/'/g,"\\'")}')">▶ Preview</button>
              <button class="vsel"  onclick="window.JarvisVoiceSelector.select('${v.name.replace(/'/g,"\\'")}')">✔ Use</button>
            </div>
          `;
          grid.appendChild(card);
        });
        container.appendChild(grid);
      };

      renderSection('Girl / Female Voices', '👩', girls, 'girl');
      renderSection('Boy / Male Voices',    '👨', boys,  'boy');
      renderSection('Other Voices',         '🎙️', others,'other');
    },

    _buildModal() {
      const m = document.createElement('div');
      m.id = 'voiceSelectorModal';
      m.className = 'modal-overlay hidden';
      m.innerHTML = `
        <div class="modal-box" style="max-width:780px;max-height:85vh;overflow-y:auto;">
          <div class="modal-hdr">
            <span>🎙️ VOICE SELECTOR — Choose Your JARVIS Voice</span>
            <button class="mclose" onclick="window.JarvisVoiceSelector.close()">✕</button>
          </div>
          <div class="modal-body">
            <div class="vsearch-bar">
              <input id="voiceSearch" class="finp" placeholder="🔍 Search voices..." oninput="window.JarvisVoiceSelector._filterVoices(this.value)" style="width:100%;margin-bottom:16px;">
            </div>
            <div id="voiceCurrentInfo" style="background:rgba(0,212,255,.08);border:1px solid var(--brd);border-radius:8px;padding:12px 16px;margin-bottom:16px;font-size:12px;color:var(--c2);">
              Current voice: <strong id="currentVoiceName" style="color:var(--c1);">Loading...</strong>
            </div>
            <div id="voiceGrid"></div>
          </div>
          <div class="modal-ftr">
            <button class="btn-ghost" onclick="window.JarvisVoiceSelector.close()">Close</button>
            <button class="btn-primary" onclick="window.JarvisVoiceSelector.preview(window.JarvisVoiceSelector.getVoiceName())">▶ Preview Selected</button>
            <button class="btn-primary" onclick="window.JarvisVoiceSelector.close(); window.JarvisToast?.show('Voice saved!','success')">💾 Save & Close</button>
          </div>
        </div>
      `;
      document.body.appendChild(m);

      // Add voice selector styles
      const style = document.createElement('style');
      style.textContent = `
        .vsect-hdr {
          font-family: var(--fhud, monospace);
          font-size: 11px;
          letter-spacing: 2px;
          color: var(--c1);
          padding: 10px 4px 6px;
          margin-top: 12px;
          border-bottom: 1px solid var(--brd);
          display: flex;
          align-items: center;
          gap: 8px;
        }
        .vcount {
          background: var(--c1);
          color: #000;
          border-radius: 10px;
          padding: 1px 7px;
          font-size: 10px;
          font-weight: 700;
        }
        .vgrid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
          gap: 10px;
          margin: 10px 0 16px;
        }
        .vcard {
          background: rgba(0,212,255,.05);
          border: 1px solid var(--brd);
          border-radius: 8px;
          padding: 12px;
          transition: all .2s;
          cursor: pointer;
        }
        .vcard:hover { border-color: var(--c1); background: rgba(0,212,255,.12); }
        .vcard.selected { border-color: var(--c1); background: rgba(0,212,255,.18); box-shadow: 0 0 12px rgba(0,212,255,.3); }
        .vcard.girl  { border-color: rgba(255,105,180,.35); }
        .vcard.girl:hover, .vcard.girl.selected { border-color: #FF69B4; background: rgba(255,105,180,.12); box-shadow: 0 0 12px rgba(255,105,180,.3); }
        .vcard.girl .vname::before { content: '👩 '; }
        .vcard.boy .vname::before  { content: '👨 '; }
        .vcard.other .vname::before{ content: '🎙️ '; }
        .vname { font-size: 12px; font-weight: 600; color: var(--c1); margin-bottom: 3px; word-break: break-word; }
        .vlang { font-size: 10px; color: var(--c2); margin-bottom: 8px; }
        .vbtns { display: flex; gap: 6px; }
        .vprev {
          flex: 1; padding: 4px 6px; font-size: 10px; cursor: pointer;
          background: rgba(0,212,255,.1); border: 1px solid var(--brd);
          border-radius: 4px; color: var(--c1); transition: all .2s;
        }
        .vprev:hover { background: rgba(0,212,255,.25); }
        .vsel {
          flex: 1; padding: 4px 6px; font-size: 10px; cursor: pointer;
          background: var(--c1); border: none; border-radius: 4px;
          color: #000; font-weight: 700; transition: all .2s;
        }
        .vsel:hover { opacity: .85; }
        .vcard.girl .vsel { background: #FF69B4; }
        #voiceSearch { background: rgba(0,212,255,.05); color: var(--c1); border: 1px solid var(--brd); border-radius: 6px; padding: 8px 12px; }
      `;
      document.head.appendChild(style);

      // Close on backdrop click
      m.addEventListener('click', e => { if (e.target === m) this.close(); });
    },

    _filterVoices(query) {
      const q = query.toLowerCase();
      document.querySelectorAll('.vcard').forEach(card => {
        const name = card.querySelector('.vname')?.textContent?.toLowerCase() || '';
        const lang = card.querySelector('.vlang')?.textContent?.toLowerCase() || '';
        card.style.display = (!q || name.includes(q) || lang.includes(q)) ? '' : 'none';
      });
    },
  };

  // ── Patch voice.js to use selected voice ──────────────────────
  // Extend _speakBrowser to use saved voice preference
  const originalInit = () => {
    const saved = window.JarvisVoiceSelector?.getVoiceName();
    if (saved && window.JarvisVoice?._speakBrowser) {
      const orig = window.JarvisVoice._speakBrowser.bind(window.JarvisVoice);
      window.JarvisVoice._speakBrowser = function(text, onFinished) {
        const voices = window.speechSynthesis?.getVoices() || [];
        const pref = voices.find(v => v.name === saved);
        if (!pref) { orig(text, onFinished); return; }

        window.speechSynthesis.cancel();
        const utt = new SpeechSynthesisUtterance(text);
        utt.voice = pref;
        // Gender-based pitch
        const gender = detectGender(pref);
        utt.pitch  = gender === 'girl' ? 1.15 : 0.85;
        utt.rate   = 0.95;
        utt.volume = 1;
        utt.onend  = onFinished;
        utt.onerror = onFinished;
        window.speechSynthesis.speak(utt);
      };
    }
  };

  // ── Wire Voice button in settings & add standalone button ─────
  document.addEventListener('DOMContentLoaded', () => {
    // Patch after voice engine is ready
    setTimeout(originalInit, 500);

    // Update current voice display when modal opens
    const orig = window.JarvisVoiceSelector.open.bind(window.JarvisVoiceSelector);
    window.JarvisVoiceSelector.open = function() {
      if (!document.getElementById('voiceSelectorModal')) this._buildModal();
      // Ensure voices are loaded
      if (window.speechSynthesis?.getVoices().length === 0) {
        window.speechSynthesis.onvoiceschanged = () => {
          window.speechSynthesis.onvoiceschanged = null;
          this._renderVoices();
        };
      } else {
        this._renderVoices();
      }
      const cur = document.getElementById('currentVoiceName');
      if (cur) cur.textContent = this.getVoiceName() || 'Default (Auto)';
      document.getElementById('voiceSelectorModal')?.classList.remove('hidden');
    };

    // Re-patch after voice.js loads
    window.speechSynthesis?.addEventListener?.('voiceschanged', () => { originalInit(); });
  });

})();
