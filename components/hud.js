/* ================================================================
   J.A.R.V.I.S. v3 — HUD Animation Component
   Arc Reactor + Tactical Radar Sweeper + Nanotech Suit Simulator
   ================================================================ */

(function() {

  // ── 1. Arc Reactor Canvas Animation ───────────────────────
  const canvas = document.getElementById('arcCanvas');
  if (canvas) {
    const ctx = canvas.getContext('2d');
    const W = canvas.width, H = canvas.height;
    const cx = W / 2, cy = H / 2;

    let a1 = 0, a2 = 0, a3 = 0, a4 = 0;
    let dataPoints = Array.from({length: 36}, () => Math.random() > 0.55 ? 1 : 0);

    function getColor() {
      const style = getComputedStyle(document.documentElement);
      return style.getPropertyValue('--c1').trim() || '#00D4FF';
    }

    function hexToRgb(hex) {
      hex = hex.replace('#','');
      if (hex.length === 3) hex = hex.split('').map(c=>c+c).join('');
      const n = parseInt(hex, 16);
      return [(n>>16)&255,(n>>8)&255,n&255];
    }

    function drawRing(r, w, a, op, dash=[], rot=0) {
      const [R,G,B] = hexToRgb(getColor());
      ctx.save();
      ctx.translate(cx,cy);
      ctx.rotate(rot);
      ctx.beginPath();
      ctx.arc(0,0,r,0,Math.PI*2);
      ctx.strokeStyle = `rgba(${R},${G},${B},${op})`;
      ctx.lineWidth = w;
      ctx.globalAlpha = 1;
      if (dash.length) ctx.setLineDash(dash);
      ctx.stroke();
      ctx.restore();
    }

    function drawDataRing(r, pts, rot) {
      const [R,G,B] = hexToRgb(getColor());
      const step = (Math.PI*2)/pts.length;
      ctx.save();
      ctx.translate(cx,cy);
      ctx.rotate(rot);
      pts.forEach((active,i) => {
        const angle = i*step;
        const x1 = Math.cos(angle)*(r-4), y1 = Math.sin(angle)*(r-4);
        const x2 = Math.cos(angle)*(r+4), y2 = Math.sin(angle)*(r+4);
        ctx.beginPath();
        ctx.moveTo(x1,y1);
        ctx.lineTo(x2,y2);
        ctx.strokeStyle = active ? `rgba(${R},${G},${B},0.9)` : `rgba(${R},${G},${B},0.12)`;
        ctx.lineWidth = active ? 2 : 0.5;
        ctx.stroke();
      });
      ctx.restore();
    }

    function drawSegments(r, rot) {
      const [R,G,B] = hexToRgb(getColor());
      const segs = 10, gap = 0.1;
      ctx.save();
      ctx.translate(cx,cy);
      ctx.rotate(rot);
      for (let i = 0; i < segs; i++) {
        const s = (i/segs)*Math.PI*2 + gap;
        const e = ((i+1)/segs)*Math.PI*2 - gap;
        const active = i%3 !== 0;
        ctx.beginPath();
        ctx.arc(0,0,r,s,e);
        ctx.strokeStyle = active ? `rgba(${R},${G},${B},0.6)` : `rgba(255,107,53,0.35)`;
        ctx.lineWidth = 3;
        ctx.stroke();
      }
      ctx.restore();
    }

    function drawHex(pulse) {
      const [R,G,B] = hexToRgb(getColor());
      const r = 26 + pulse*3;
      ctx.save();
      ctx.translate(cx,cy);
      ctx.rotate(Math.PI/6);
      ctx.beginPath();
      for (let i=0;i<6;i++) {
        const a = (i/6)*Math.PI*2;
        const x = Math.cos(a)*r, y = Math.sin(a)*r;
        if (i===0) ctx.moveTo(x,y); else ctx.lineTo(x,y);
      }
      ctx.closePath();
      ctx.strokeStyle = `rgba(${R},${G},${B},0.8)`;
      ctx.lineWidth = 1.5;
      ctx.stroke();
      ctx.fillStyle = `rgba(${R},${G},${B},${0.04+pulse*0.07})`;
      ctx.fill();
      ctx.restore();
    }

    function drawCore(pulse) {
      const [R,G,B] = hexToRgb(getColor());
      const grad = ctx.createRadialGradient(cx,cy,0,cx,cy,18+pulse*5);
      grad.addColorStop(0, `rgba(${Math.min(R+80,255)},${Math.min(G+40,255)},${Math.min(B+30,255)},0.95)`);
      grad.addColorStop(0.4, `rgba(${R},${G},${B},0.7)`);
      grad.addColorStop(1, `rgba(${R},${G},${B},0)`);
      ctx.beginPath();
      ctx.arc(cx,cy,18+pulse*5,0,Math.PI*2);
      ctx.fillStyle = grad;
      ctx.globalAlpha = 1;
      ctx.fill();
    }

    function drawTicks(r, n, rot) {
      const [R,G,B] = hexToRgb(getColor());
      ctx.save();
      ctx.translate(cx,cy);
      ctx.rotate(rot);
      for (let i=0;i<n;i++) {
        const a=(i/n)*Math.PI*2;
        const major = i%(n/8)===0;
        ctx.beginPath();
        ctx.moveTo(Math.cos(a)*(r-(major?8:4)), Math.sin(a)*(r-(major?8:4)));
        ctx.lineTo(Math.cos(a)*r, Math.sin(a)*r);
        ctx.strokeStyle = `rgba(${R},${G},${B},${major?0.65:0.18})`;
        ctx.lineWidth = major ? 1.5 : 0.5;
        ctx.stroke();
      }
      ctx.restore();
    }

    function frame() {
      ctx.clearRect(0,0,W,H);
      const pulse = (Math.sin(Date.now()*0.002)+1)/2;
      a1 += 0.005; a2 -= 0.008; a3 += 0.003; a4 -= 0.004;

      const [R,G,B] = hexToRgb(getColor());

      drawRing(120, 8, a1, 0.03+pulse*0.03);
      drawRing(120, 1, a1, 0.15);

      drawTicks(112, 72, a3*0.5);
      drawSegments(104, a1);
      drawRing(90, 1, a2, 0.4, [4,4], a2);
      drawRing(80, 1, a1, 0.22, [2,6], a1*1.5);
      drawDataRing(70, dataPoints, a4);
      drawRing(58, 2, a2, 0.5, [], a2);
      drawRing(48, 1, a1, 0.28, [3,3], a1);
      drawRing(40, 1.5, 0, 0.3, [], a3);

      drawHex(pulse);
      drawCore(pulse);

      ctx.save();
      ctx.translate(cx,cy);
      ctx.font = `500 7px 'Share Tech Mono'`;
      ctx.fillStyle = `rgba(${R},${G},${B},${0.35+pulse*0.25})`;
      ctx.globalAlpha = 1;
      ctx.textAlign = 'center';
      const pname = window.JarvisActivePersona?.shortName || 'JARVIS';
      ctx.fillText(pname, 0, -128);
      ctx.fillText(`PWR ${Math.floor(55+pulse*10)}%`, 0, 138);
      ctx.restore();

      requestAnimationFrame(frame);
    }
    frame();
  }

  // ── 2. Live Tactical Radar Canvas Sweeper Animation ───────
  const radarCanvas = document.getElementById('radarCanvas');
  if (radarCanvas) {
    const rCtx = radarCanvas.getContext('2d');
    const rW = radarCanvas.width, rH = radarCanvas.height;
    const rcx = rW / 2, rcy = rH / 2;
    let sweepAngle = 0;

    const blips = [
      { r: 25, a: 0.8, size: 3, label: 'T-1' },
      { r: 45, a: 2.3, size: 4, label: 'T-2' },
      { r: 35, a: 4.1, size: 3, label: 'STARK-SAT' },
      { r: 52, a: 5.5, size: 3, label: 'DRONE-04' },
    ];

    function renderRadar() {
      rCtx.clearRect(0, 0, rW, rH);
      sweepAngle += 0.035;

      const style = getComputedStyle(document.documentElement);
      const c1 = style.getPropertyValue('--c1').trim() || '#00D4FF';

      // Concentric grid rings
      [15, 30, 45, 58].forEach(r => {
        rCtx.beginPath();
        rCtx.arc(rcx, rcy, r, 0, Math.PI * 2);
        rCtx.strokeStyle = 'rgba(0, 212, 255, 0.15)';
        rCtx.lineWidth = 0.5;
        rCtx.stroke();
      });

      // Axis lines
      rCtx.beginPath();
      rCtx.moveTo(rcx - 60, rcy); rCtx.lineTo(rcx + 60, rcy);
      rCtx.moveTo(rcx, rcy - 60); rCtx.lineTo(rcx, rcy + 60);
      rCtx.strokeStyle = 'rgba(0, 212, 255, 0.15)';
      rCtx.lineWidth = 0.5;
      rCtx.stroke();

      // Rotating sweep cone
      rCtx.save();
      rCtx.translate(rcx, rcy);
      const grad = rCtx.createConicGradient(sweepAngle, 0, 0);
      grad.addColorStop(0, 'rgba(0, 212, 255, 0.4)');
      grad.addColorStop(0.12, 'rgba(0, 212, 255, 0.05)');
      grad.addColorStop(0.3, 'rgba(0, 212, 255, 0)');
      rCtx.fillStyle = grad;
      rCtx.beginPath();
      rCtx.arc(0, 0, 58, 0, Math.PI * 2);
      rCtx.fill();
      rCtx.restore();

      // Sweep line
      const lx = rcx + Math.cos(sweepAngle) * 58;
      const ly = rcy + Math.sin(sweepAngle) * 58;
      rCtx.beginPath();
      rCtx.moveTo(rcx, rcy);
      rCtx.lineTo(lx, ly);
      rCtx.strokeStyle = c1;
      rCtx.lineWidth = 1.5;
      rCtx.stroke();

      // Target blips
      blips.forEach(b => {
        const bx = rcx + Math.cos(b.a) * b.r;
        const by = rcy + Math.sin(b.a) * b.r;
        const diff = (sweepAngle % (Math.PI * 2)) - (b.a % (Math.PI * 2));
        const alpha = (diff >= 0 && diff < 0.8) ? 1 - diff : 0.3;

        rCtx.beginPath();
        rCtx.arc(bx, by, b.size, 0, Math.PI * 2);
        rCtx.fillStyle = `rgba(255, 45, 123, ${alpha})`;
        rCtx.fill();
        rCtx.strokeStyle = `rgba(255, 45, 123, ${alpha * 0.8})`;
        rCtx.stroke();

        rCtx.font = '7px "Share Tech Mono"';
        rCtx.fillStyle = `rgba(0, 212, 255, ${alpha * 0.8})`;
        rCtx.fillText(b.label, bx + 5, by + 2);
      });

      requestAnimationFrame(renderRadar);
    }
    renderRadar();
  }

  // ── 3. Particle Background ────────────────────────────────
  const pCanvas = document.getElementById('particleCanvas');
  if (pCanvas) {
    const pCtx = pCanvas.getContext('2d');
    function resizePCanvas() {
      pCanvas.width  = window.innerWidth;
      pCanvas.height = window.innerHeight;
    }
    resizePCanvas();
    window.addEventListener('resize', resizePCanvas);

    const particles = Array.from({length: 55}, () => ({
      x: Math.random()*window.innerWidth,
      y: Math.random()*window.innerHeight,
      r: Math.random()*1.4+0.3,
      vx: (Math.random()-0.5)*0.28,
      vy: (Math.random()-0.5)*0.28,
      a: Math.random(),
      type: Math.random() > 0.65 ? 'hex' : 'dot',
    }));

    function pFrame() {
      pCtx.clearRect(0,0,pCanvas.width,pCanvas.height);
      const style = getComputedStyle(document.documentElement);
      const c1 = style.getPropertyValue('--c1').trim() || '#00D4FF';
      particles.forEach(p => {
        p.x += p.vx; p.y += p.vy;
        if (p.x < 0) p.x = pCanvas.width;
        if (p.x > pCanvas.width) p.x = 0;
        if (p.y < 0) p.y = pCanvas.height;
        if (p.y > pCanvas.height) p.y = 0;
        const alpha = 0.08 + (Math.sin(Date.now()*0.001+p.x)*0.5+0.5)*0.2;
        pCtx.beginPath();
        pCtx.arc(p.x,p.y,p.r,0,Math.PI*2);
        pCtx.fillStyle = c1;
        pCtx.globalAlpha = alpha;
        pCtx.fill();
      });
      requestAnimationFrame(pFrame);
    }
    pFrame();
  }

  // ── 4. Suit Studio Modal & Prompt Generator Wiring ────────
  document.addEventListener('DOMContentLoaded', () => {
    const modal = document.getElementById('suitStudioModal');
    const openBtn = document.getElementById('suitStudioBtn');
    const closeBtn = document.getElementById('suitStudioClose');
    const fileInp = document.getElementById('photoInput');
    const dropArea = document.getElementById('photoDropArea');
    const simBtn = document.getElementById('triggerSuitAnimBtn');
    const styleSel = document.getElementById('suitStyleSel');
    const conceptSel = document.getElementById('sceneConceptSel');
    const promptText = document.getElementById('generatedPromptText');
    const copyBtn = document.getElementById('copyPromptBtn');
    const canvasSim = document.getElementById('suitSimCanvas');

    let loadedImg = null;

    if (openBtn) {
      openBtn.addEventListener('click', () => {
        modal?.classList.remove('hidden');
        updatePromptText();
      });
    }

    if (closeBtn) closeBtn.addEventListener('click', () => modal?.classList.add('hidden'));

    if (dropArea) {
      dropArea.addEventListener('click', () => fileInp?.click());
      dropArea.addEventListener('dragover', e => { e.preventDefault(); dropArea.style.borderColor = '#00ff88'; });
      dropArea.addEventListener('dragleave', () => dropArea.style.borderColor = 'var(--c1)');
      dropArea.addEventListener('drop', e => {
        e.preventDefault();
        dropArea.style.borderColor = 'var(--c1)';
        if (e.dataTransfer.files?.[0]) handleFile(e.dataTransfer.files[0]);
      });
    }

    if (fileInp) {
      fileInp.addEventListener('change', e => {
        if (e.target.files?.[0]) handleFile(e.target.files[0]);
      });
    }

    function handleFile(file) {
      const reader = new FileReader();
      reader.onload = evt => {
        const img = new Image();
        img.onload = () => {
          loadedImg = img;
          drawSimOverlay(0);
          document.getElementById('dropPrompt').style.opacity = '0';
          window.JarvisToast?.show('Photo loaded! Click "SIMULATE NANOTECH SUIT-UP".', 'success');
        };
        img.src = evt.target.result;
      };
      reader.readAsDataURL(file);
    }

    function drawSimOverlay(progress = 0) {
      if (!canvasSim) return;
      const sCtx = canvasSim.getContext('2d');
      const w = canvasSim.width, h = canvasSim.height;
      sCtx.clearRect(0, 0, w, h);

      if (loadedImg) {
        sCtx.drawImage(loadedImg, 0, 0, w, h);
      }

      if (progress > 0) {
        // Draw Nanotech Metallic Grid Overlay
        sCtx.save();
        sCtx.fillStyle = `rgba(0, 212, 255, ${0.15 + progress * 0.25})`;
        sCtx.fillRect(0, 0, w, h);

        // Hex grid armor assembly simulation
        const step = 20;
        sCtx.strokeStyle = 'rgba(0, 212, 255, 0.6)';
        sCtx.lineWidth = 1;
        for (let x = 0; x < w; x += step) {
          for (let y = 0; y < h * progress; y += step) {
            sCtx.strokeRect(x, y, step - 2, step - 2);
          }
        }

        // Glowing Arc Reactor Chest Overlay
        sCtx.beginPath();
        sCtx.arc(w / 2, h * 0.65, 18, 0, Math.PI * 2);
        sCtx.fillStyle = 'rgba(200, 240, 255, 0.9)';
        sCtx.shadowColor = '#00D4FF';
        sCtx.shadowBlur = 20;
        sCtx.fill();

        sCtx.restore();
      }
    }

    if (simBtn) {
      simBtn.addEventListener('click', () => {
        window.JarvisAudio?.playThwip();
        let step = 0;
        const interval = setInterval(() => {
          step += 0.05;
          drawSimOverlay(step);
          if (step >= 1) {
            clearInterval(interval);
            window.JarvisToast?.show('Nanotech Suit-Up Simulation Complete!', 'success');
          }
        }, 40);
      });
    }

    function updatePromptText() {
      const style = styleSel?.value || 'supermaker';
      const concept = conceptSel?.value || 'suitup';

      const prompts = {
        supermaker: {
          suitup: "Supermaker AI Iron Man Video Generator: Cinematic front portrait shot of a person transforming into glowing metallic red and gold nanotech Iron Man armor Mark 85, photorealistic metallic plates, real-time chest arc reactor pulse, cinematic Stark Industries studio lighting, 8k resolution, 60fps.",
          flight: "Supermaker AI Iron Man Generator: Cinematic pan, Iron Man armor flying through clouds at supersonic speed, golden arc reactor glowing brightly, repulsor trail FX, photorealistic metallic reflectivity.",
          combat: "Supermaker AI Iron Man Generator: Close up, Iron Man in combat stance, nanotech arm shield deploying, glowing repulsor gauntlet charging, 4K Marvel style lighting.",
          landing: "Supermaker AI Iron Man Generator: Dynamic ground hero landing, dust particles flying, metallic knee and hand impact, nanotech helmet faceplate closing, photorealistic.",
        },
        nanotech: {
          suitup: "Runway Gen-3 Alpha: Cinematic slow-motion shot, front facing portrait of a person as glowing cyan nanotech particles quickly spread over their clothes and assemble into a sleek mechanical Iron Man suit, glowing white eyes activate, ultra detailed Marvel cinematic style.",
          flight: "Luma Dream Machine: Cinematic camera tracking shot, Iron Man soaring over futuristic city skyline at dusk, golden thruster trails, photorealistic metallic armor reflections.",
          combat: "Runway Gen-3: Dynamic action camera, Iron Man raising dual repulsor cannons, glowing cyan energy beam charging up, cinematic smoke and lens flare.",
          landing: "Luma Dream Machine: Superhero ground slam landing, shockwave ripple, nanotech armor assembling around joints upon impact, cinematic 8k photorealistic.",
        },
        loova: {
          suitup: "Loova AI Transformers Effect: Piece-by-piece snap-on metallic armor transformation of front-facing portrait into Iron Man suit, mechanical gears locking, chest arc reactor ignition, cinematic lighting.",
          flight: "Loova AI Transformer: Aerial tracking, suit thrusters igniting, soaring high speed above clouds.",
          combat: "Loova AI Transformer: Defensive nanotech shield deploying from wrist, glowing energy barrier.",
          landing: "Loova AI Transformer: Heavy armor ground landing, metallic impact sound FX visualizer.",
        },
        spiderman: {
          suitup: "Runway Gen-3: Cinematic close-up, nanotech Spider-Man suit flowing over person's shoulders and neck, high-fidelity red and blue fabric texture, glowing white ocular lens eye plates snapping shut, Marvel movie style.",
          flight: "Luma Dream Machine: High-speed web-swinging between New York skyscrapers at sunset, dynamic camera tilt, photorealistic Spider-Man suit motion.",
          combat: "Runway Gen-3: Spider-Man crouched on wall, web-shooters primed, spider-sense radar visual overlay.",
          landing: "Luma Dream Machine: Superhero wall-stick landing, three-point crouch stance, nanotech spider arms deploying from back.",
        },
        anime: {
          suitup: "OpenArt Restyle Video (Strength 1.6): High-octane anime comic book style transformation into glowing mech warrior armor, vibrant cel-shaded colors, dramatic manga action lines.",
          flight: "OpenArt Restyle: Anime action flight sequence, vibrant energy trails, manga speed lines.",
          combat: "OpenArt Restyle: Anime special move charging up, electric aura, bold comic outline.",
          landing: "OpenArt Restyle: Dramatic anime hero landing, crater crack lines, glowing power aura.",
        }
      };

      const selected = prompts[style]?.[concept] || prompts.supermaker.suitup;
      if (promptText) promptText.value = selected;
    }

    if (styleSel) styleSel.addEventListener('change', updatePromptText);
    if (conceptSel) conceptSel.addEventListener('change', updatePromptText);

    if (copyBtn) {
      copyBtn.addEventListener('click', () => {
        if (promptText?.value) {
          navigator.clipboard.writeText(promptText.value);
          window.JarvisToast?.show('AI Video Prompt copied to clipboard!', 'success');
        }
      });
    }
  });

})();
