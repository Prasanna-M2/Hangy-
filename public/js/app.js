// app.js - Main Hangly for Windows Application Controller
document.addEventListener('DOMContentLoaded', () => {
  // 1. Initial State & Managers
  const canvas = document.getElementById('physicsCanvas');
  const ctx = canvas.getContext('2d');
  const sound = new SoundEngine();
  const charmMgr = new CharmManager();
  const sim = new RopeSimulation();

  let settings = {
    overlay: {
      isEnabled: true,
      scale: 1.0,
      opacity: 1.0,
      horizontalOffset: 0,
      verticalOffset: 0,
      hangMode: 'topTrailing', // topTrailing, topCenter, topLeading, taskbar, pin, breeze, pendulum, magnetic, elastic, calm
      charm: 'daruma',
      customPinX: 0.85,
      customPinY: 0.04
    },
    sound: {
      enabled: true,
      volume: 0.75
    },
    studio: {
      theme: 'windows-bloom-dark'
    }
  };

  // Mouse & Gesture Tracking
  let isDragging = false;
  let lastMouse = { x: 0, y: 0, time: 0 };
  let mouseVelocity = { x: 0, y: 0 };
  let isHoveringCharm = false;
  let customPin = { x: window.innerWidth * 0.85, y: 20 };
  let isDraggingPin = false;

  // 2. Window Resize & Canvas Bounds
  function resizeCanvas() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    updateAnchor();
  }
  window.addEventListener('resize', resizeCanvas);

  // 3. Anchor Calculation based on Hang Mode
  function updateAnchor() {
    const w = canvas.width;
    const h = canvas.height;
    const mode = settings.overlay.hangMode;
    const hOffset = settings.overlay.horizontalOffset;
    const vOffset = settings.overlay.verticalOffset;
    const scale = settings.overlay.scale;

    let ax = w * 0.85;
    let ay = 12;

    sim.hangMode = mode;

    switch (mode) {
      case 'topLeading':
        ax = 80 + hOffset;
        ay = 12 + vOffset;
        break;
      case 'topCenter':
        ax = (w / 2) + hOffset;
        ay = 12 + vOffset;
        break;
      case 'topTrailing':
        ax = (w - 120) + hOffset;
        ay = 12 + vOffset;
        break;
      case 'taskbar':
        // Hangs from bottom taskbar
        ax = (w - 160) + hOffset;
        ay = (h - 75) + vOffset;
        break;
      case 'pin':
        ax = customPin.x + hOffset;
        ay = customPin.y + vOffset;
        break;
      case 'breeze':
      case 'pendulum':
      case 'magnetic':
      case 'elastic':
      case 'calm':
      default:
        ax = (w - 120) + hOffset;
        ay = 12 + vOffset;
        break;
    }

    sim.setAnchor(ax, ay);

    const pinEl = document.getElementById('customPinIndicator');
    if (pinEl) {
      if (mode === 'pin') {
        pinEl.style.display = 'block';
        pinEl.style.left = `${ax}px`;
        pinEl.style.top = `${ay}px`;
      } else {
        pinEl.style.display = 'none';
      }
    }
  }

  // 4. Charm Setup
  function applyCharm(id) {
    const charm = charmMgr.setCharm(id);
    settings.overlay.charm = id;
    
    // Configure charm mass & beads in physics simulation
    sim.setCharmMetrics({
      mass: charm.mass || 3.0,
      radiusRatio: (charm.radius || 30) / 200,
      knotInset: 0.96
    });

    const beads = [];
    const beadCount = charm.beadCount || 0;
    for (let i = 0; i < beadCount; i++) {
      beads.push({
        size: { width: 14, height: 14 },
        offsetRatio: 0.72 + (i * 0.08),
        mass: 0.45
      });
    }
    sim.setBeads(beads);

    // Update active badges in library and quick bar
    document.querySelectorAll('.charm-card').forEach(c => {
      c.classList.toggle('active-charm', c.dataset.charmId === id);
    });

    const curNameEl = document.getElementById('currentCharmName');
    if (curNameEl) curNameEl.textContent = charm.name;

    showToast(`Hanging ${charm.name}`);
    saveSettingsToServer();
  }

  // 5. Physics & Rendering Animation Loop
  let lastTime = performance.now();
  let frameCounter = 0;
  let fpsTimer = performance.now();
  let currentFps = 60;

  function renderLoop(now) {
    const dt = Math.min((now - lastTime) / 1000, 0.05);
    lastTime = now;

    // FPS Meter
    frameCounter++;
    if (now - fpsTimer >= 1000) {
      currentFps = frameCounter;
      frameCounter = 0;
      fpsTimer = now;
      const fpsEl = document.getElementById('fpsMeter');
      if (fpsEl) fpsEl.textContent = `${currentFps} FPS`;
    }

    // Step Physics
    if (settings.overlay.isEnabled) {
      sim.step(dt);
    }

    // Clear Canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Render Charm & Cord if enabled
    if (settings.overlay.isEnabled && sim.points.length > 0) {
      drawSimulation(ctx);
    }

    requestAnimationFrame(renderLoop);
  }

  function drawSimulation(ctx) {
    const scale = settings.overlay.scale;
    const opacity = settings.overlay.opacity;
    ctx.globalAlpha = opacity;

    const points = sim.points;
    const charm = charmMgr.activeCharm;

    // A. Draw Cord (Verlet chain curve)
    ctx.save();
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    // Shadow
    ctx.strokeStyle = 'rgba(0, 0, 0, 0.35)';
    ctx.lineWidth = 4.5 * scale;
    ctx.beginPath();
    ctx.moveTo(points[0].x + 2, points[0].y + 4);
    for (let i = 1; i < points.length; i++) {
      ctx.lineTo(points[i].x + 2, points[i].y + 4);
    }
    ctx.stroke();

    // Golden / Cord colored rope body
    const cordColor = charm.cordColor || '#d4af37';
    ctx.strokeStyle = cordColor;
    ctx.lineWidth = 3.2 * scale;
    ctx.beginPath();
    ctx.moveTo(points[0].x, points[0].y);
    for (let i = 1; i < points.length; i++) {
      ctx.lineTo(points[i].x, points[i].y);
    }
    ctx.stroke();

    // Cord twisted weave texture
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.35)';
    ctx.lineWidth = 1.2 * scale;
    ctx.setLineDash([4 * scale, 3 * scale]);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.restore();

    // B. Draw Sliding Beads along the Cord
    sim.beads.forEach(bead => {
      ctx.save();
      const beadR = 6.5 * scale;
      const beadColor = charm.beadColor || '#f39c12';

      // Bead Shadow
      ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
      ctx.beginPath();
      ctx.arc(bead.x + 2, bead.y + 2, beadR, 0, Math.PI * 2);
      ctx.fill();

      // Bead Body
      const beadGrad = ctx.createRadialGradient(bead.x - beadR * 0.3, bead.y - beadR * 0.3, 1, bead.x, bead.y, beadR);
      beadGrad.addColorStop(0, '#ffffff');
      beadGrad.addColorStop(0.3, beadColor);
      beadGrad.addColorStop(1, '#1e272e');

      ctx.fillStyle = beadGrad;
      ctx.beginPath();
      ctx.arc(bead.x, bead.y, beadR, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    });

    // C. Draw Charm at the end of the rope
    const lastNode = points[points.length - 1];
    const prevNode = points[points.length - 2] || points[0];

    // Compute rotation angle matching natural hanging orientation
    const dx = lastNode.x - prevNode.x;
    const dy = lastNode.y - prevNode.y;
    const angle = Math.atan2(dy, dx) - Math.PI / 2;

    // Charm ambient glow / shadow
    ctx.save();
    ctx.shadowColor = 'rgba(0, 0, 0, 0.45)';
    ctx.shadowBlur = 16 * scale;
    ctx.shadowOffsetY = 8 * scale;

    charmMgr.renderCharm(ctx, charm, lastNode.x, lastNode.y, angle, scale);
    ctx.restore();

    ctx.globalAlpha = 1.0;
  }

  // 6. Hit Testing & Interaction Handling
  function getCharmCenter() {
    if (sim.points.length === 0) return { x: 0, y: 0 };
    const last = sim.points[sim.points.length - 1];
    return { x: last.x, y: last.y };
  }

  function isOverCharm(x, y) {
    const c = getCharmCenter();
    const r = (charmMgr.activeCharm.radius || 30) * settings.overlay.scale + 20;
    return Math.hypot(x - c.x, y - c.y) <= r;
  }

  // Pointer Events for Desktop Interaction
  window.addEventListener('pointerdown', (e) => {
    const x = e.clientX;
    const y = e.clientY;

    if (settings.overlay.hangMode === 'pin' && e.altKey) {
      customPin.x = x;
      customPin.y = y;
      updateAnchor();
      showToast('Anchor pin moved');
      return;
    }

    if (isOverCharm(x, y)) {
      isDragging = true;
      lastMouse = { x, y, time: performance.now() };
      mouseVelocity = { x: 0, y: 0 };
      canvas.classList.add('grabbing');
      sim.startDrag(x, y);

      // Play subtle touch sound
      sound.play(charmMgr.activeCharm.sound || 'wood', 0.2);
    }
  });

  window.addEventListener('pointermove', (e) => {
    const x = e.clientX;
    const y = e.clientY;
    const now = performance.now();
    const dt = (now - lastMouse.time) / 1000;

    if (dt > 0.005) {
      mouseVelocity.x = (x - lastMouse.x) / dt;
      mouseVelocity.y = (y - lastMouse.y) / dt;
      lastMouse = { x, y, time: now };
    }

    if (isDragging) {
      sim.updateDrag(x, y, mouseVelocity.x, mouseVelocity.y);
    } else {
      // Hover detection
      const over = isOverCharm(x, y);
      if (over !== isHoveringCharm) {
        isHoveringCharm = over;
        if (over) sim.wake();
      }

      // Magnetic hang mode
      if (settings.overlay.hangMode === 'magnetic' && over) {
        sim.nudge((x - lastMouse.x) * 0.4, 0);
      }
    }
  });

  window.addEventListener('pointerup', () => {
    if (isDragging) {
      isDragging = false;
      canvas.classList.remove('grabbing');

      // Fling velocity with momentum release
      const flingSpeed = Math.hypot(mouseVelocity.x, mouseVelocity.y);
      sim.releaseDrag(mouseVelocity.x, mouseVelocity.y);

      // Play material release clack sound
      sound.play(charmMgr.activeCharm.sound || 'wood', Math.min(1.0, flingSpeed / 1000));
    }
  });

  // Double click to flick
  canvas.addEventListener('dblclick', (e) => {
    if (isOverCharm(e.clientX, e.clientY)) {
      sim.nudge(500, -100);
      sound.play(charmMgr.activeCharm.sound || 'wood', 0.8);
      showToast('Flicked!');
    }
  });

  // 7. Modals & UI Binding
  function openModal(id) {
    document.querySelectorAll('.modal-overlay').forEach(m => m.classList.remove('open'));
    const target = document.getElementById(id);
    if (target) target.classList.add('open');
  }

  function closeModal(id) {
    const target = document.getElementById(id);
    if (target) target.classList.remove('open');
  }

  document.querySelectorAll('.modal-close-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const modal = btn.closest('.modal-overlay');
      if (modal) modal.classList.remove('open');
    });
  });

  document.querySelectorAll('.modal-overlay').forEach(modal => {
    modal.addEventListener('click', (e) => {
      if (e.target === modal) modal.classList.remove('open');
    });
  });

  // Top header actions
  document.getElementById('btnOpenLibrary')?.addEventListener('click', () => openModal('libraryModal'));
  document.getElementById('btnOpenStudio')?.addEventListener('click', () => openModal('studioModal'));
  document.getElementById('btnOpenSettings')?.addEventListener('click', () => openModal('settingsModal'));
  
  // Side dock actions
  document.getElementById('dockLibraryBtn')?.addEventListener('click', () => openModal('libraryModal'));
  document.getElementById('dockStudioBtn')?.addEventListener('click', () => openModal('studioModal'));
  document.getElementById('dockSettingsBtn')?.addEventListener('click', () => openModal('settingsModal'));
  document.getElementById('dockFlickBtn')?.addEventListener('click', () => {
    sim.nudge(600, -80);
    sound.play(charmMgr.activeCharm.sound || 'wood', 0.7);
  });
  document.getElementById('dockResetBtn')?.addEventListener('click', () => {
    sim.reset();
    showToast('Reset to rest pose');
  });

  // Desktop shortcuts
  document.getElementById('iconOpenLibrary')?.addEventListener('click', () => openModal('libraryModal'));
  document.getElementById('iconOpenStudio')?.addEventListener('click', () => openModal('studioModal'));
  document.getElementById('iconOpenSettings')?.addEventListener('click', () => openModal('settingsModal'));
  document.getElementById('iconToggleOverlay')?.addEventListener('click', () => {
    settings.overlay.isEnabled = !settings.overlay.isEnabled;
    showToast(settings.overlay.isEnabled ? 'Charm Overlay Enabled' : 'Charm Overlay Hidden');
  });

  // Hang Mode Quick Selector Dropdown
  const hangModeSelect = document.getElementById('hangModeSelect');
  if (hangModeSelect) {
    hangModeSelect.addEventListener('change', (e) => {
      settings.overlay.hangMode = e.target.value;
      updateAnchor();
      showToast(`Hang Mode: ${e.target.options[e.target.selectedIndex].text}`);
      saveSettingsToServer();
    });
  }

  // Charm Library Grid Population
  async function populateLibrary() {
    const grid = document.getElementById('charmsGrid');
    if (!grid) return;
    grid.innerHTML = '';

    await charmMgr.loadCustomCharms();

    Object.values(charmMgr.charms).forEach(charm => {
      const card = document.createElement('div');
      card.className = `charm-card ${charm.id === settings.overlay.charm ? 'active-charm' : ''}`;
      card.dataset.charmId = charm.id;
      card.dataset.category = charm.category || 'classic';

      const previewSrc = charm.preview || charm.svg || '/assets/icons/hangly-icon-256.png';

      card.innerHTML = `
        <div class="charm-card-image-wrap">
          <img src="${previewSrc}" alt="${charm.name}" loading="lazy" />
        </div>
        <h3>${charm.name}</h3>
        <div class="region-tag">${charm.region || 'Universal'}</div>
        <p class="description">${charm.description || ''}</p>
        <div class="charm-card-footer">
          <span class="badge-pill">${charm.sound ? charm.sound.toUpperCase() : 'MATERIAL'}</span>
          <span class="badge-pill">${charm.mass}g</span>
        </div>
      `;

      card.addEventListener('click', () => {
        applyCharm(charm.id);
        sound.play(charm.sound || 'wood', 0.6);
      });

      grid.appendChild(card);
    });
  }

  // Library Category Filter
  document.querySelectorAll('.filter-pill').forEach(pill => {
    pill.addEventListener('click', () => {
      document.querySelectorAll('.filter-pill').forEach(p => p.classList.remove('active'));
      pill.classList.add('active');
      const cat = pill.dataset.category;
      document.querySelectorAll('.charm-card').forEach(card => {
        if (cat === 'all' || card.dataset.category === cat) {
          card.style.display = 'flex';
        } else {
          card.style.display = 'none';
        }
      });
    });
  });

  // AI Charm Studio: Image Upload & Background Removal
  const dropZone = document.getElementById('studioDropZone');
  const fileInput = document.getElementById('charmFileInput');
  const studioPreview = document.getElementById('studioPreviewImage');
  let uploadedDataUrl = null;

  if (dropZone && fileInput) {
    dropZone.addEventListener('click', () => fileInput.click());
    dropZone.addEventListener('dragover', (e) => {
      e.preventDefault();
      dropZone.classList.add('dragover');
    });
    dropZone.addEventListener('dragleave', () => dropZone.classList.remove('dragover'));
    dropZone.addEventListener('drop', (e) => {
      e.preventDefault();
      dropZone.classList.remove('dragover');
      if (e.dataTransfer.files.length > 0) {
        handleFile(e.dataTransfer.files[0]);
      }
    });
    fileInput.addEventListener('change', (e) => {
      if (e.target.files.length > 0) {
        handleFile(e.target.files[0]);
      }
    });
  }

  function handleFile(file) {
    const reader = new FileReader();
    reader.onload = (e) => {
      const rawUrl = e.target.result;
      // If image, remove transparent white background if requested
      processCharmImage(rawUrl, (processedUrl) => {
        uploadedDataUrl = processedUrl;
        if (studioPreview) {
          studioPreview.src = processedUrl;
          studioPreview.style.display = 'block';
        }
        const nameInput = document.getElementById('customCharmName');
        if (nameInput && !nameInput.value) {
          nameInput.value = file.name.replace(/\.[^/.]+$/, "");
        }
        showToast('Image loaded in Studio');
      });
    };
    reader.readAsDataURL(file);
  }

  function processCharmImage(dataUrl, callback) {
    const img = new Image();
    img.onload = () => {
      const c = document.createElement('canvas');
      c.width = img.naturalWidth;
      c.height = img.naturalHeight;
      const cctx = c.getContext('2d');
      cctx.drawImage(img, 0, 0);

      // Simple alpha thresholding for clean cutout
      const imgData = cctx.getImageData(0, 0, c.width, c.height);
      const data = imgData.data;
      for (let i = 0; i < data.length; i += 4) {
        const r = data[i];
        const g = data[i + 1];
        const b = data[i + 2];
        // If near pure white or checkerboard
        if (r > 245 && g > 245 && b > 245) {
          data[i + 3] = 0; // make transparent
        }
      }
      cctx.putImageData(imgData, 0, 0);
      callback(c.toDataURL('image/png'));
    };
    img.src = dataUrl;
  }

  document.getElementById('btnSaveCustomCharm')?.addEventListener('click', async () => {
    const name = document.getElementById('customCharmName')?.value || 'My Charm';
    const mass = parseFloat(document.getElementById('customCharmMass')?.value) || 3.0;
    const soundType = document.getElementById('customCharmSound')?.value || 'wood';
    const beadCount = parseInt(document.getElementById('customCharmBeads')?.value, 10) || 2;

    if (!uploadedDataUrl) {
      showToast('Please upload an image first!');
      return;
    }

    try {
      const res = await fetch('/api/custom-charms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          dataUrl: uploadedDataUrl,
          mass,
          sound: soundType,
          beadCount
        })
      });

      if (res.ok) {
        const json = await res.json();
        await populateLibrary();
        applyCharm(json.charm.id);
        closeModal('studioModal');
        showToast(`Created & hung "${name}"!`);
      }
    } catch (err) {
      console.error('Error saving custom charm:', err);
      showToast('Failed to save custom charm');
    }
  });

  // Settings Tabs & Form Sliders
  document.querySelectorAll('.settings-tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.settings-tab-btn').forEach(b => b.classList.remove('active'));
      document.querySelectorAll('.settings-section').forEach(s => s.classList.remove('active'));
      btn.classList.add('active');
      const tabId = btn.dataset.tab;
      document.getElementById(`tab-${tabId}`)?.classList.add('active');
    });
  });

  function bindSlider(id, targetObj, targetProp, formatFn = (v) => v) {
    const slider = document.getElementById(id);
    const valEl = document.getElementById(`${id}Val`);
    if (!slider) return;

    slider.addEventListener('input', (e) => {
      const val = parseFloat(e.target.value);
      targetObj[targetProp] = val;
      if (valEl) valEl.textContent = formatFn(val);
      updateAnchor();
      saveSettingsToServer();
    });
  }

  bindSlider('sliderScale', settings.overlay, 'scale', v => `${Math.round(v * 100)}%`);
  bindSlider('sliderOpacity', settings.overlay, 'opacity', v => `${Math.round(v * 100)}%`);
  bindSlider('sliderHOffset', settings.overlay, 'horizontalOffset', v => `${v}px`);
  bindSlider('sliderVOffset', settings.overlay, 'verticalOffset', v => `${v}px`);
  bindSlider('sliderGravity', sim.config, 'gravity', v => `${v}`);
  bindSlider('sliderDamping', sim.config, 'damping', v => `${v.toFixed(3)}`);
  bindSlider('sliderVolume', sound, 'volume', v => `${Math.round(v * 100)}%`);

  // Theme Switcher
  const themeSelect = document.getElementById('themeSelect');
  if (themeSelect) {
    themeSelect.addEventListener('change', (e) => {
      const theme = e.target.value;
      document.querySelector('.desktop-viewport').className = `desktop-viewport theme-${theme}`;
      settings.studio.theme = theme;
      saveSettingsToServer();
    });
  }

  // Sound test triggers
  document.querySelectorAll('.btn-test-sound').forEach(btn => {
    btn.addEventListener('click', () => {
      sound.play(btn.dataset.sound, 0.9);
    });
  });

  // Windows 11 System Tray Popup Menu
  const trayBtn = document.getElementById('trayHanglyIcon');
  const trayMenu = document.getElementById('hanglyTrayMenu');
  if (trayBtn && trayMenu) {
    trayBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      trayMenu.classList.toggle('open');
    });
    document.addEventListener('click', (e) => {
      if (!trayMenu.contains(e.target) && e.target !== trayBtn) {
        trayMenu.classList.remove('open');
      }
    });
  }

  // Windows Taskbar Clock Update
  function updateClock() {
    const timeEl = document.getElementById('taskbarTime');
    const dateEl = document.getElementById('taskbarDate');
    if (!timeEl || !dateEl) return;
    const now = new Date();
    timeEl.textContent = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    dateEl.textContent = now.toLocaleDateString([], { month: '2-digit', day: '2-digit', year: 'numeric' });
  }
  setInterval(updateClock, 1000);
  updateClock();

  // Toast Notification System
  function showToast(message) {
    const container = document.getElementById('toastContainer');
    if (!container) return;
    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.innerHTML = `<span>⚡</span><span>${message}</span>`;
    container.appendChild(toast);
    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateY(-10px)';
      setTimeout(() => toast.remove(), 300);
    }, 2400);
  }

  // Server Settings Sync
  async function loadSettingsFromServer() {
    try {
      const res = await fetch('/api/settings');
      if (res.ok) {
        const remote = await res.json();
        settings = { ...settings, ...remote };
        if (settings.overlay.charm) {
          applyCharm(settings.overlay.charm);
        }
        if (settings.overlay.hangMode && hangModeSelect) {
          hangModeSelect.value = settings.overlay.hangMode;
        }
        updateAnchor();
      }
    } catch (e) {
      console.warn('[Sync] Offline or failed to load remote settings', e);
    }
  }

  function saveSettingsToServer() {
    fetch('/api/settings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(settings)
    }).catch(() => {});
  }

  // Keyboard Shortcuts
  window.addEventListener('keydown', (e) => {
    // Space: flick
    if (e.code === 'Space' && !['INPUT', 'TEXTAREA'].includes(e.target.tagName)) {
      e.preventDefault();
      sim.nudge(600, -80);
      sound.play(charmMgr.activeCharm.sound || 'wood', 0.8);
      return;
    }
    // R: reset
    if (e.key === 'r' || e.key === 'R') {
      if (!['INPUT', 'TEXTAREA'].includes(e.target.tagName)) {
        sim.reset();
        showToast('Reset to rest pose');
      }
    }
    // Ctrl/Cmd + L: Library
    if ((e.ctrlKey || e.metaKey) && (e.key === 'l' || e.key === 'L')) {
      e.preventDefault();
      openModal('libraryModal');
    }
    // Ctrl/Cmd + N: Studio
    if ((e.ctrlKey || e.metaKey) && (e.key === 'n' || e.key === 'N')) {
      e.preventDefault();
      openModal('studioModal');
    }
    // Ctrl/Cmd + ,: Settings
    if ((e.ctrlKey || e.metaKey) && e.key === ',') {
      e.preventDefault();
      openModal('settingsModal');
    }
  });

  // Start Application
  charmMgr.preloadAll();
  resizeCanvas();
  populateLibrary();
  loadSettingsFromServer();
  requestAnimationFrame(renderLoop);
});
