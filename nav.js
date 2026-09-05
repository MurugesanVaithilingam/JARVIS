(function () {
  'use strict';

  const PAGES = [
    { href: 'index.html', label: 'HUD', icon: '🤖', desc: 'Main AI Command Center', cat: 'Core' },
    { href: 'jarvis_pro.html', label: 'JARVIS PRO', icon: '⚡', desc: 'Neural Interface & Pro Dashboard', cat: 'Core' },
    { href: 'stark_hud.html', label: 'STARK', icon: '🌐', desc: 'Stark Holographic Interface', cat: 'Core' },
    { href: 'voice_architecture.html', label: 'VOICE ARCH', icon: '🎙️', desc: 'Voice & Gemini Device Control Architecture', cat: 'AI & Neural' },
    { href: 'ai_ecosystem.html', label: 'ECO', icon: '🧬', desc: 'AI Ecosystem & Agents', cat: 'AI & Neural' },
    { href: 'ai_master_matrix.html', label: 'MATRIX', icon: '⚡', desc: 'Neural Processing Matrix', cat: 'AI & Neural' },
    { href: 'ai_llm_rag.html', label: 'RAG', icon: '🧠', desc: 'Knowledge Base & RAG Engine', cat: 'AI & Neural' },
    { href: 'drone_control.html', label: 'DRONE', icon: '🚁', desc: 'Autonomous Drone Fleet', cat: 'Operations' },
    { href: '3d_lab.html', label: '3D', icon: '🌌', desc: '3D Spatial Visualization Lab', cat: 'Operations' },
    { href: 'tracker.html', label: 'TRACK', icon: '🛰️', desc: 'Satellite & Telemetry Tracker', cat: 'Operations' },
    { href: 'code_studio.html', label: 'CODE', icon: '💻', desc: 'IDE & Code Studio', cat: 'Tools & Security' },
    { href: 'cyber_soc.html', label: 'CYBER', icon: '🛡️', desc: 'Cyber SOC Security Center', cat: 'Tools & Security' },
    { href: 'cmd_hacker.html', label: 'CMD', icon: '📟', desc: 'Terminal & Hacker Console', cat: 'Tools & Security' },
    { href: 'login.html', label: 'LOGIN', icon: '🔐', desc: 'System Access & Auth', cat: 'Core' }
  ];

  // Web Audio Sci-Fi Sound Synthesizer
  let audioCtx = null;
  let soundEnabled = localStorage.getItem('jarvis_nav_sound') !== 'false';

  function initAudio() {
    if (!audioCtx && (window.AudioContext || window.webkitAudioContext)) {
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      audioCtx = new AudioContextClass();
    }
  }

  function playUiSound(type) {
    if (!soundEnabled) return;
    try {
      initAudio();
      if (!audioCtx) return;
      if (audioCtx.state === 'suspended') {
        audioCtx.resume();
      }
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.connect(gain);
      gain.connect(audioCtx.destination);

      const now = audioCtx.currentTime;
      if (type === 'hover') {
        osc.type = 'sine';
        osc.frequency.setValueAtTime(440, now);
        osc.frequency.exponentialRampToValueAtTime(880, now + 0.05);
        gain.gain.setValueAtTime(0.02, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.05);
        osc.start(now);
        osc.stop(now + 0.05);
      } else if (type === 'click') {
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(600, now);
        osc.frequency.exponentialRampToValueAtTime(1200, now + 0.08);
        gain.gain.setValueAtTime(0.05, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);
        osc.start(now);
        osc.stop(now + 0.08);
      } else if (type === 'open') {
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(300, now);
        osc.frequency.exponentialRampToValueAtTime(900, now + 0.12);
        gain.gain.setValueAtTime(0.04, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);
        osc.start(now);
        osc.stop(now + 0.12);
      }
    } catch (e) {}
  }

  function basePrefix() {
    return location.pathname.indexOf('/templates/') !== -1 ? '../' : '';
  }

  function currentFile() {
    const path = (location.pathname.split('/').pop() || 'index.html').toLowerCase();
    return path || 'index.html';
  }

  function inject() {
    const prefix = basePrefix();
    const file = currentFile();
    document.documentElement.classList.add('jarvis-shell');

    // Find existing page header div if present
    const existingHeader = document.querySelector('.hud-header, .stark-header, .eco-nav, .rag-nav-header, .drone-nav, .lab-nav');

    // Attach links HTML
    const linksHtml = PAGES.map((p, i) => {
      const active = file === p.href;
      return `<a class="nav-tab${active ? ' active' : ''}" href="${prefix}${p.href}" data-i="${i}" tabindex="0"${active ? ' aria-current="page"' : ''}>` +
        `<span class="shell-ico" aria-hidden="true">${p.icon}</span>` +
        `<span class="shell-txt">${p.label}</span></a>`;
    }).join('');

    let headerContainer = existingHeader;

    // If page doesn't have a header div, create fallback header container
    if (!headerContainer && !document.getElementById('jarvis-shell-nav')) {
      headerContainer = document.createElement('header');
      headerContainer.id = 'jarvis-shell-nav';
      headerContainer.className = 'hud-header';
      headerContainer.innerHTML = `
        <div class="hl">
          <a class="logo-mark" href="${prefix}index.html">
            <span class="shell-reactor"></span>
            <span><b>J</b>ARVIS</span>
          </a>
          <div class="vline"></div>
          <div class="main-nav-links">${linksHtml}</div>
        </div>
        <div class="hr" id="shellHeaderActions"></div>
      `;
      document.body.prepend(headerContainer);
    }

    // Ensure main-nav-links active state matches current URL
    const navLinksWrap = headerContainer.querySelector('.main-nav-links, .nav-links, .nav-links-scroll, .drone-nav-scroll');
    if (navLinksWrap) {
      const tabs = navLinksWrap.querySelectorAll('.nav-tab');
      tabs.forEach(tab => {
        const href = (tab.getAttribute('href') || '').toLowerCase();
        if (href.endsWith(file) || (file === 'index.html' && href.includes('index.html'))) {
          tab.classList.add('active');
          tab.setAttribute('aria-current', 'page');
        } else {
          tab.classList.remove('active');
          tab.removeAttribute('aria-current');
        }
      });
    }

    // Right Action Container inside Header
    let actionsWrap = headerContainer.querySelector('.hr, .shell-nav-end') || headerContainer.querySelector('div:last-child');
    if (!actionsWrap) {
      actionsWrap = document.createElement('div');
      actionsWrap.className = 'hr';
      headerContainer.appendChild(actionsWrap);
    }

    // Inject Tool Buttons (Search, Sound, Menu) into Header if missing
    if (!document.getElementById('shellCmdSearchBtn')) {
      const searchBtn = document.createElement('button');
      searchBtn.className = 'shell-tool-btn';
      searchBtn.id = 'shellCmdSearchBtn';
      searchBtn.type = 'button';
      searchBtn.title = 'Quick Search / Command Palette (Ctrl+K)';
      searchBtn.innerHTML = `🔍 <span class="shell-kbd-hint">⌘K</span>`;
      actionsWrap.prepend(searchBtn);
    }

    if (!document.getElementById('shellSoundToggleBtn')) {
      const soundBtn = document.createElement('button');
      soundBtn.className = 'shell-tool-btn';
      soundBtn.id = 'shellSoundToggleBtn';
      soundBtn.type = 'button';
      soundBtn.title = 'Toggle Sci-Fi Sound FX';
      soundBtn.innerHTML = soundEnabled ? '🔊' : '🔇';
      actionsWrap.prepend(soundBtn);
    }

    if (!document.getElementById('shellMenuBtn')) {
      const menuBtn = document.createElement('button');
      menuBtn.className = 'shell-menu-btn';
      menuBtn.id = 'shellMenuBtn';
      menuBtn.type = 'button';
      menuBtn.setAttribute('aria-label', 'Open navigation menu');
      menuBtn.innerHTML = `<span class="shell-burger" aria-hidden="true"><span></span><span></span><span></span></span>`;
      actionsWrap.appendChild(menuBtn);
    }

    // Mobile Bottom Floating Dock
    if (!document.getElementById('jarvisShellBottomDock')) {
      const bottomDockItems = [
        { href: 'index.html', label: 'HUD', icon: '🤖' },
        { href: 'stark_hud.html', label: 'STARK', icon: '🌐' },
        { href: 'ai_ecosystem.html', label: 'ECO', icon: '🧬' },
        { href: 'ai_master_matrix.html', label: 'MATRIX', icon: '⚡' }
      ];

      const bottomDockHtml = bottomDockItems.map((p) => {
        const active = file === p.href;
        return `<a class="shell-dock-item${active ? ' active' : ''}" href="${prefix}${p.href}">` +
          `<span class="shell-dock-ico">${p.icon}</span>` +
          `<span class="shell-dock-txt">${p.label}</span></a>`;
      }).join('') + `
        <button class="shell-dock-item shell-dock-more" id="shellDockMoreBtn" type="button" aria-label="Open command menu">
          <span class="shell-dock-ico">☰</span>
          <span class="shell-dock-txt">MORE</span>
        </button>
      `;

      const dock = document.createElement('nav');
      dock.className = 'shell-bottom-dock';
      dock.id = 'jarvisShellBottomDock';
      dock.innerHTML = bottomDockHtml;
      document.body.prepend(dock);
    }

    // Overlay
    if (!document.getElementById('jarvisShellOverlay')) {
      const overlay = document.createElement('div');
      overlay.className = 'shell-overlay';
      overlay.id = 'jarvisShellOverlay';
      document.body.prepend(overlay);
    }

    // Mobile Drawer
    if (!document.getElementById('jarvisShellDrawer')) {
      const drawer = document.createElement('aside');
      drawer.className = 'shell-drawer';
      drawer.id = 'jarvisShellDrawer';
      drawer.setAttribute('aria-hidden', 'true');

      const categories = ['Core', 'AI & Neural', 'Operations', 'Tools & Security'];
      let drawerCardsHtml = '';
      categories.forEach(cat => {
        const catPages = PAGES.filter(p => p.cat === cat);
        drawerCardsHtml += `<div class="shell-drawer-cat">${cat.toUpperCase()}</div><div class="shell-drawer-grid">`;
        catPages.forEach(p => {
          const active = file === p.href;
          drawerCardsHtml += `
            <a class="shell-drawer-card${active ? ' active' : ''}" href="${prefix}${p.href}">
              <span class="sd-icon">${p.icon}</span>
              <div class="sd-info">
                <div class="sd-title">${p.label} <span class="sd-badge">${p.cat}</span></div>
                <div class="sd-desc">${p.desc}</div>
              </div>
            </a>
          `;
        });
        drawerCardsHtml += `</div>`;
      });

      drawer.innerHTML = `
        <div class="shell-drawer-handle" aria-hidden="true"></div>
        <div class="shell-drawer-head">
          <div class="shell-drawer-brand">
            <span class="shell-reactor sm"></span>
            <span>JARVIS COMMAND DECK</span>
          </div>
          <button type="button" class="shell-drawer-close" id="shellDrawerClose" aria-label="Close menu">✕</button>
        </div>
        <div class="shell-drawer-search">
          <input type="text" id="shellDrawerFilter" placeholder="🔎 Filter pages..." autocomplete="off">
        </div>
        <div class="shell-drawer-scroll" id="shellDrawerScroll">
          ${drawerCardsHtml}
        </div>
      `;
      document.body.prepend(drawer);
    }

    // Command Palette Modal
    if (!document.getElementById('jarvisShellCmdPalette')) {
      const cmdPalette = document.createElement('div');
      cmdPalette.className = 'shell-cmd-palette hidden';
      cmdPalette.id = 'jarvisShellCmdPalette';
      cmdPalette.innerHTML = `
        <div class="shell-cmd-box">
          <div class="shell-cmd-head">
            <span class="shell-cmd-icon">⚡</span>
            <input type="text" id="shellCmdInput" placeholder="Type page name or command... (e.g. HUD, RAG, DRONE)" autocomplete="off">
            <button type="button" class="shell-cmd-close" id="shellCmdClose">ESC</button>
          </div>
          <div class="shell-cmd-results" id="shellCmdResults"></div>
          <div class="shell-cmd-foot">
            <span>Navigation: <kbd>↑</kbd> <kbd>↓</kbd> Select: <kbd>↵</kbd> Close: <kbd>ESC</kbd></span>
          </div>
        </div>
      `;
      document.body.prepend(cmdPalette);
    }

    // References
    const menuBtn = document.getElementById('shellMenuBtn');
    const dockMoreBtn = document.getElementById('shellDockMoreBtn');
    const closeBtn = document.getElementById('shellDrawerClose');
    const drawer = document.getElementById('jarvisShellDrawer');
    const overlay = document.getElementById('jarvisShellOverlay');
    const soundBtn = document.getElementById('shellSoundToggleBtn');
    const searchBtn = document.getElementById('shellCmdSearchBtn');
    const cmdPalette = document.getElementById('jarvisShellCmdPalette');
    const cmdCloseBtn = document.getElementById('shellCmdClose');
    const cmdInput = document.getElementById('shellCmdInput');
    const cmdResults = document.getElementById('shellCmdResults');
    const drawerFilter = document.getElementById('shellDrawerFilter');
    const drawerScroll = document.getElementById('shellDrawerScroll');

    function setOpen(open) {
      if (open) playUiSound('open');
      document.documentElement.classList.toggle('shell-nav-open', open);
      if (drawer) drawer.classList.toggle('open', open);
      if (overlay) overlay.classList.toggle('open', open);
      if (drawer) drawer.setAttribute('aria-hidden', open ? 'false' : 'true');
      if (menuBtn) menuBtn.setAttribute('aria-expanded', open ? 'true' : 'false');
      document.body.style.overflow = open ? 'hidden' : '';
      if (open && drawerFilter) {
        setTimeout(() => drawerFilter.focus(), 150);
      }
    }

    // Attach Web Audio Hover & Click FX to all tab links on page
    const allTabs = document.querySelectorAll('.nav-tab, .shell-link');
    allTabs.forEach(tab => {
      tab.addEventListener('mouseenter', () => playUiSound('hover'));
      tab.addEventListener('click', () => playUiSound('click'));
    });

    // Sound toggle listener
    if (soundBtn) {
      soundBtn.addEventListener('click', () => {
        soundEnabled = !soundEnabled;
        localStorage.setItem('jarvis_nav_sound', soundEnabled ? 'true' : 'false');
        soundBtn.textContent = soundEnabled ? '🔊' : '🔇';
        if (soundEnabled) playUiSound('open');
      });
    }

    // Command Palette Logic
    let selectedCmdIdx = 0;
    let filteredPages = [...PAGES];

    function renderCmdResults() {
      if (!cmdResults) return;
      if (filteredPages.length === 0) {
        cmdResults.innerHTML = `<div class="shell-cmd-empty">No matching command module found</div>`;
        return;
      }
      cmdResults.innerHTML = filteredPages.map((p, i) => `
        <a class="shell-cmd-item${i === selectedCmdIdx ? ' active' : ''}" href="${prefix}${p.href}" data-idx="${i}">
          <span class="cmd-ico">${p.icon}</span>
          <div class="cmd-text">
            <span class="cmd-title">${p.label}</span>
            <span class="cmd-sub">${p.desc}</span>
          </div>
          <span class="cmd-cat">${p.cat}</span>
        </a>
      `).join('');

      const activeItem = cmdResults.querySelector('.shell-cmd-item.active');
      if (activeItem) activeItem.scrollIntoView({ block: 'nearest' });
    }

    function openCmdPalette(open) {
      if (!cmdPalette) return;
      if (open) playUiSound('open');
      cmdPalette.classList.toggle('hidden', !open);
      if (open) {
        cmdInput.value = '';
        filteredPages = [...PAGES];
        selectedCmdIdx = 0;
        renderCmdResults();
        setTimeout(() => cmdInput.focus(), 100);
      }
    }

    if (searchBtn) searchBtn.addEventListener('click', () => openCmdPalette(true));
    if (cmdCloseBtn) cmdCloseBtn.addEventListener('click', () => openCmdPalette(false));

    if (cmdPalette) {
      cmdPalette.addEventListener('click', (e) => {
        if (e.target === cmdPalette) openCmdPalette(false);
      });
    }

    if (cmdInput) {
      cmdInput.addEventListener('input', (e) => {
        const q = e.target.value.toLowerCase().trim();
        filteredPages = PAGES.filter(p =>
          p.label.toLowerCase().includes(q) ||
          p.desc.toLowerCase().includes(q) ||
          p.cat.toLowerCase().includes(q)
        );
        selectedCmdIdx = 0;
        renderCmdResults();
      });

      cmdInput.addEventListener('keydown', (e) => {
        if (e.key === 'ArrowDown') {
          e.preventDefault();
          selectedCmdIdx = (selectedCmdIdx + 1) % Math.max(1, filteredPages.length);
          renderCmdResults();
        } else if (e.key === 'ArrowUp') {
          e.preventDefault();
          selectedCmdIdx = (selectedCmdIdx - 1 + filteredPages.length) % Math.max(1, filteredPages.length);
          renderCmdResults();
        } else if (e.key === 'Enter') {
          e.preventDefault();
          if (filteredPages[selectedCmdIdx]) {
            playUiSound('click');
            window.location.href = prefix + filteredPages[selectedCmdIdx].href;
          }
        }
      });
    }

    // Drawer Live Filter
    if (drawerFilter && drawerScroll) {
      drawerFilter.addEventListener('input', (e) => {
        const q = e.target.value.toLowerCase().trim();
        const cards = drawerScroll.querySelectorAll('.shell-drawer-card');
        cards.forEach(card => {
          const txt = card.textContent.toLowerCase();
          card.style.display = txt.includes(q) ? 'flex' : 'none';
        });
      });
    }

    // Drawer listeners
    if (menuBtn) menuBtn.addEventListener('click', () => setOpen(!drawer.classList.contains('open')));
    if (dockMoreBtn) dockMoreBtn.addEventListener('click', () => setOpen(true));
    if (closeBtn) closeBtn.addEventListener('click', () => setOpen(false));
    if (overlay) overlay.addEventListener('click', () => setOpen(false));

    // Global Keybindings
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        setOpen(false);
        openCmdPalette(false);
      } else if ((e.metaKey || e.ctrlKey) && (e.key === 'k' || e.key === 'K')) {
        e.preventDefault();
        openCmdPalette(true);
      }
    });

    // Touch Swipe to Dismiss Drawer on Mobile
    if (drawer) {
      let touchStartY = 0;
      let touchStartX = 0;

      drawer.addEventListener('touchstart', (e) => {
        touchStartY = e.touches[0].clientY;
        touchStartX = e.touches[0].clientX;
      }, { passive: true });

      drawer.addEventListener('touchend', (e) => {
        const deltaY = e.changedTouches[0].clientY - touchStartY;
        const deltaX = e.changedTouches[0].clientX - touchStartX;
        if (deltaX > 80 || deltaY > 120) {
          setOpen(false);
        }
      }, { passive: true });
    }

    // Window Resize listener
    window.addEventListener('resize', () => {
      if (window.matchMedia('(min-width: 1101px)').matches) {
        setOpen(false);
      }
    });

    // ── Universal Real-Time Clock & STARDATE Ticker for All Pages ──
    function updateGlobalClock() {
      const now = new Date();
      const time = now.toLocaleTimeString('en-US', { hour12: false });
      const date = now.toLocaleDateString('en-US', { weekday: 'short', year: 'numeric', month: 'short', day: '2-digit' }).toUpperCase();
      
      const cl = document.getElementById('clock');
      const cd = document.getElementById('clockDate');
      if (cl) cl.textContent = time;
      if (cd) cd.textContent = `STARDATE ${date}`;

      const lc = document.getElementById('liveClock');
      const ld = document.getElementById('liveDate');
      const tc = document.getElementById('topClock');
      const td = document.getElementById('topDate');
      if (lc) lc.textContent = time;
      if (ld) ld.textContent = date;
      if (tc) tc.textContent = time;
      if (td) td.textContent = date;
    }

    updateGlobalClock();
    setInterval(updateGlobalClock, 1000);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', inject);
  } else {
    inject();
  }
})();
