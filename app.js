/**
 * ASCII Botanica Application Logic
 * Orchestrates Garden, Parametric Studio, Codex Gallery, and Code Exporters.
 */

document.addEventListener('DOMContentLoaded', () => {

  // =========================================================================
  // 1. STATE & GLOBAL INSTANCES
  // =========================================================================

  let activeTab = 'garden';
  let studioPlant = null;
  let studioCanvas = null;
  let studioCtx = null;
  let studioTime = 0;
  let studioWind = 0.60;
  let studioAnimId = null;
  let studioBloomCanvas = null;
  let studioBloomCtx = null;

  let garden = null;
  const gardenCanvas = document.getElementById('garden-canvas');
  let nourishMode = false;

  // Sound Chimes (Web Audio API)
  let audioCtx = null;
  let soundEnabled = false;

  function playChime(freq = 440) {
    if (!soundEnabled) return;
    try {
      if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, audioCtx.currentTime);
      gain.gain.setValueAtTime(0.04, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + 1.2);
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.start();
      osc.stop(audioCtx.currentTime + 1.2);
    } catch (e) { }
  }

  // =========================================================================
  // 2. NAVIGATION & TABS
  // =========================================================================

  const navBtns = document.querySelectorAll('.nav-btn');
  const tabViews = document.querySelectorAll('.tab-view');

  navBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const target = btn.dataset.tab;
      switchTab(target);
    });
  });

  function switchTab(tabId) {
    activeTab = tabId;
    navBtns.forEach(b => b.classList.toggle('active', b.dataset.tab === tabId));
    tabViews.forEach(v => v.classList.toggle('active', v.id === `view-${tabId}`));

    if (tabId === 'garden') {
      if (!garden) {
        initGarden();
      } else {
        garden.resize();
      }
    } else if (tabId === 'studio') {
      initStudio();
    } else if (tabId === 'codex') {
      initCodex();
    }
  }

  // =========================================================================
  // 3. THE MEADOW (GARDEN MODE)
  // =========================================================================

  function initGarden() {
    garden = new AsciiPlants.AsciiGarden(gardenCanvas, {
      wind: 0.65,
      palette: 'botanical',
      timeSpeed: 1.0
    });
    window.garden = garden;

    garden.onDandelionBlow = (plant, x, y) => {
      playChime(784); // G5
      setTimeout(() => playChime(988), 120); // B5
      setTimeout(() => playChime(1175), 240); // D6
      showToast('Dandelion seeds blown! Floating on the wind... 🌾 (5% soil germination chance)');
    };

    garden.onSeedGerminate = (plant, x) => {
      playChime(523);
      setTimeout(() => playChime(659), 120);
      showToast('A dandelion parachute seed sprouted in the soil! 🌱');
    };

    // Populate initial meadow with diverse botanical species
    seedWildflowerMeadow();
    garden.start();

    // Click or tap to sow, feed, or interact
    let isMouseDown = false;

    gardenCanvas.addEventListener('mousedown', e => {
      isMouseDown = true;
      handleGardenInteraction(e);
    });

    window.addEventListener('mouseup', () => {
      isMouseDown = false;
    });

    gardenCanvas.addEventListener('mousemove', e => {
      if (isMouseDown && nourishMode) {
        handleGardenInteraction(e);
      }
    });

    function handleGardenInteraction(e) {
      const rect = gardenCanvas.getBoundingClientRect();
      const clickX = e.clientX - rect.left;
      const clickY = e.clientY - rect.top;

      // 1. Check if clicking on dandelion flower head to blow seeds
      if (garden.checkDandelionBlow(clickX, clickY)) {
        return;
      }

      // 2. Feed Sunlight / Plant Food mode
      if (nourishMode) {
        garden.nourishAt(clickX, clickY, 240);
        playChime(520 + Math.random() * 260);
        return;
      }

      // 3. Plant seed if clicking near soil line (lower portion of canvas)
      const groundY = (garden.cssHeight || rect.height) - 50;
      if (clickY >= groundY - 70) {
        const speciesList = AsciiPlants.SPECIES;
        const randomSpecies = speciesList[Math.floor(Math.random() * speciesList.length)];

        garden.addPlant(clickX, {
          type: randomSpecies,
          age: 0.05,
          height: 280 + Math.random() * 120,
          curvature: (Math.random() - 0.5) * 0.6,
          seed: Math.floor(Math.random() * 10000)
        });

        playChime(320 + Math.random() * 200);
        showToast(`Sowed new ${randomSpecies} seed 🌱`);
        return;
      }

      // 4. Clicked in open air: shower gentle ambient pollen
      garden.nourishAt(clickX, clickY, 90);
      playChime(659);
    }

    // Garden HUD buttons
    const btnHudClock = document.getElementById('btn-clock-cycle');
    if (btnHudClock) {
      btnHudClock.addEventListener('click', () => cycleTimeSpeed());
    }

    // Shower Sunlight burst button
    document.getElementById('btn-sunlight-burst').addEventListener('click', () => {
      const w = garden.cssWidth || 800;
      for (let x = 60; x <= w - 60; x += 110) {
        garden.nourishAt(x, 140, 220);
      }
      playChime(587); // D5
      setTimeout(() => playChime(740), 100); // F#5
      setTimeout(() => playChime(880), 200); // A5
      showToast('Sunlight shower applied! Growth accelerated ☀️');
    });

    // Garden HUD buttons
    document.getElementById('btn-clear-garden').addEventListener('click', () => {
      garden.clear();
      showToast('Meadow cleared');
    });

    document.getElementById('btn-flower-all').addEventListener('click', () => {
      garden.plants.forEach(({ plant }) => {
        let b = 0.0;
        const bTimer = setInterval(() => {
          b += 0.04;
          plant.setBloom(b);
          if (b >= 1.0) {
            plant.setBloom(1.0);
            clearInterval(bTimer);
          }
        }, 30);
      });
      playChime(660);
      showToast('All flowers blooming! ✿');
    });

    document.getElementById('btn-preset-wildflower').addEventListener('click', () => {
      seedWildflowerMeadow();
      showToast('Wildflower meadow planted!');
    });
  }

  function seedWildflowerMeadow() {
    garden.clear();
    const width = garden.cssWidth || 800;
    const species = ['sunflower', 'dandelion', 'hibiscus', 'iris', 'thistle', 'marigold', 'daffodil', 'rose'];
    const count = Math.max(5, Math.floor(width / 130));
    // Staggered biological lifecycles: young sprout, adolescent, prime adult, mature flushes
    const initialAges = [0.25, 2.5, 6.0, 11.5, 16.5, 0.7, 8.5, 14.0, 19.5, 1.2];

    for (let i = 0; i < count; i++) {
      const x = (i + 0.5) * (width / count) + (Math.random() - 0.5) * 35;
      const sp = species[i % species.length];
      const baseAge = initialAges[i % initialAges.length];
      garden.addPlant(x, {
        type: sp,
        age: baseAge + (Math.random() - 0.5) * 0.4,
        metabolicRate: 0.75 + Math.random() * 0.50,
        height: 290 + Math.random() * 90,
        curvature: (Math.random() - 0.5) * 0.5,
        seed: Math.floor(Math.random() * 100000)
      });
    }
  }

  // =========================================================================
  // 4. THE PARAMETRIC LAB (STUDIO MODE)
  // =========================================================================

  function initStudio() {
    if (!studioCanvas) {
      studioCanvas = document.getElementById('studio-canvas');
      studioCtx = studioCanvas.getContext('2d');
      setupStudioControls();
      setupStudioEvents();
    }

    resizeStudioCanvas();

    if (!studioPlant) {
      studioPlant = new AsciiPlants.AsciiPlant({
        type: 'sunflower',
        age: 1.0,
        bloom: 1.0,
        height: 380,
        curvature: 0.15,
        leafDensity: 1.0,
        seed: 42,
        palette: 'botanical',
        interactive: true
      });
    }

    initStudioGrass();
    startStudioLoop();
  }

  let studioGrass = [];
  function initStudioGrass() {
    studioGrass = [];
    if (!studioCanvas) return;
    const w = studioCanvas.cssWidth || 600;
    const h = studioCanvas.cssHeight || 600;
    const groundY = h - 60;
    const originX = w / 2;
    for (let gx = originX - 200; gx <= originX + 200; gx += 24) {
      if (Math.abs(gx - originX) < 18) continue;
      const seed = Math.floor(gx * 73 + 19);
      const initLife = (Math.abs(gx) * 0.017) % 1.0;
      studioGrass.push(new AsciiPlants.GrassTuft(gx, groundY, seed, initLife));
    }
  }

  function resizeStudioCanvas() {
    if (!studioCanvas) return;
    const rect = studioCanvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    studioCanvas.width = (rect.width || 600) * dpr;
    studioCanvas.height = (rect.height || 600) * dpr;
    studioCtx.scale(dpr, dpr);
    studioCanvas.cssWidth = rect.width || 600;
    studioCanvas.cssHeight = rect.height || 600;
    initStudioGrass();
  }

  function startStudioLoop() {
    if (studioAnimId) cancelAnimationFrame(studioAnimId);
    let lastTime = performance.now();

    const loop = (now) => {
      if (activeTab !== 'studio') return;
      const dt = Math.min(0.1, (now - lastTime) / 1000);
      lastTime = now;
      studioTime += dt;

      if (studioPlant) studioPlant.update(dt, 1.0);

      renderStudio();
      studioAnimId = requestAnimationFrame(loop);
    };

    studioAnimId = requestAnimationFrame(loop);
  }

  function renderStudio() {
    const ctx = studioCtx;
    const w = studioCanvas.cssWidth;
    const h = studioCanvas.cssHeight;

    ctx.fillStyle = '#050508';
    ctx.fillRect(0, 0, w, h);

    const groundY = h - 60;
    const originX = w / 2;

    // Soil line
    ctx.save();
    ctx.fillStyle = '#225528';
    ctx.font = '12px monospace';
    ctx.textAlign = 'center';
    for (let gx = originX - 220; gx <= originX + 220; gx += 16) {
      ctx.fillText('-', gx, groundY + 12);
    }
    ctx.restore();

    // Render living meadow grass at specimen base
    if (studioGrass.length > 0) {
      ctx.save();
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      const pal = studioPlant.getPalette();
      studioGrass.forEach(g => {
        g.update(0.016, 1.0);
        const glyphs = g.generateGlyphs(studioTime, studioWind, studioPlant.pointer, pal);
        glyphs.forEach(glyph => {
          ctx.font = `${glyph.size}px monospace`;
          ctx.fillStyle = glyph.fg;
          ctx.fillText(glyph.char, glyph.x, glyph.y);
        });
      });
      ctx.restore();
    }

    // Render plant
    studioPlant.renderToCanvas(ctx, originX, groundY, studioTime, studioWind);

    // Fast Screen-Space Bloom Pass (dual-tier ethereal glowing halo with zero per-glyph lag)
    if (!studioBloomCanvas) {
      studioBloomCanvas = document.createElement('canvas');
      studioBloomCtx = studioBloomCanvas.getContext('2d');
    }
    const bw = Math.max(10, Math.floor(w / 3));
    const bh = Math.max(10, Math.floor(h / 3));
    if (studioBloomCanvas.width !== bw || studioBloomCanvas.height !== bh) {
      studioBloomCanvas.width = bw;
      studioBloomCanvas.height = bh;
    }
    studioBloomCtx.clearRect(0, 0, bw, bh);
    if (typeof studioBloomCtx.filter !== 'undefined') {
      studioBloomCtx.filter = 'blur(2.5px)';
    }
    studioBloomCtx.drawImage(studioCanvas, 0, 0, bw, bh);
    if (typeof studioBloomCtx.filter !== 'undefined') {
      studioBloomCtx.filter = 'none';
    }

    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.globalAlpha = 0.38;
    ctx.drawImage(studioBloomCanvas, 0, 0, w, h);
    ctx.globalAlpha = 0.16;
    ctx.drawImage(studioBloomCanvas, -2, -2, w + 4, h + 4);
    ctx.restore();

    // Update real-time statistics
    const simData = studioPlant.simulator.simulate(studioPlant.age, studioPlant.bloom);
    document.getElementById('stat-leaves').textContent = `Active Leaves: ${simData.activeLeafCount}`;
    document.getElementById('stat-energy').textContent = `Leaf Energy: ${simData.flowerScale.toFixed(2)}x`;
    document.getElementById('stat-branch').textContent = `Secondary Shoot: ${simData.secondaryShoot ? 'Active' : 'Dormant'}`;
  }

  function setupStudioEvents() {
    studioCanvas.addEventListener('mousemove', e => {
      const rect = studioCanvas.getBoundingClientRect();
      studioPlant.pointer.x = e.clientX - rect.left;
      studioPlant.pointer.y = e.clientY - rect.top;
      studioPlant.pointer.active = true;
    });

    studioCanvas.addEventListener('mouseleave', () => {
      studioPlant.pointer.active = false;
    });

    window.addEventListener('resize', () => {
      if (activeTab === 'studio') resizeStudioCanvas();
    });
  }

  function setupStudioControls() {
    const sSpecies = document.getElementById('select-species');
    const sAge = document.getElementById('slider-age');
    const sBloom = document.getElementById('slider-bloom');
    const sHeight = document.getElementById('slider-height');
    const sCurvature = document.getElementById('slider-curvature');
    const sWind = document.getElementById('slider-wind');
    const sLeafDensity = document.getElementById('slider-leaf-density');
    const sPointer = document.getElementById('select-pointer-mode');
    const sPalette = document.getElementById('select-palette');

    sSpecies.addEventListener('change', e => {
      studioPlant.type = e.target.value;
      studioPlant.simulator.type = e.target.value;
    });

    sAge.addEventListener('input', e => {
      const val = parseFloat(e.target.value);
      studioPlant.setAge(val);
      let label = '';
      if (val <= 1.0) {
        label = `${Math.round(val * 100)}% (Growth)`;
      } else if (val <= 21.0) {
        label = `Mature Prime (${Math.round(((val - 1.0) / 20.0) * 100)}%)`;
      } else {
        label = `Senescence (${Math.round(((val - 21.0) / 2.5) * 100)}%)`;
      }
      document.getElementById('val-age').textContent = label;
    });

    sBloom.addEventListener('input', e => {
      const val = parseFloat(e.target.value);
      studioPlant.setBloom(val);
      document.getElementById('val-bloom').textContent = `${Math.round(val * 100)}%`;
    });

    sHeight.addEventListener('input', e => {
      const val = parseInt(e.target.value, 10);
      studioPlant.height = val;
      studioPlant.simulator.maxHeight = val;
      document.getElementById('val-height').textContent = `${val}px`;
    });

    sCurvature.addEventListener('input', e => {
      const val = parseFloat(e.target.value);
      studioPlant.curvature = val;
      studioPlant.simulator.curvature = val;
      document.getElementById('val-curvature').textContent = val.toFixed(2);
    });

    sWind.addEventListener('input', e => {
      studioWind = parseFloat(e.target.value);
      document.getElementById('val-wind').textContent = studioWind.toFixed(2);
    });

    sLeafDensity.addEventListener('input', e => {
      const val = parseFloat(e.target.value);
      studioPlant.leafDensity = val;
      studioPlant.simulator.leafDensity = val;
      document.getElementById('val-leaf-density').textContent = `${val.toFixed(1)}x`;
    });

    sPointer.addEventListener('change', e => {
      studioPlant.pointerMode = e.target.value;
    });

    sPalette.addEventListener('change', e => {
      studioPlant.setPalette(e.target.value);
    });

    // Randomize DNA Seed
    document.getElementById('btn-randomize-seed').addEventListener('click', () => {
      const newSeed = Math.floor(Math.random() * 100000);
      studioPlant.seed = newSeed;
      studioPlant.simulator.seed = newSeed;
      studioPlant.simulator.rng = new AsciiPlants.AsciiPlant({ seed: newSeed }).simulator.rng;
      showToast(`DNA Seed: #${newSeed}`);
    });

    // Studio Feed Button
    document.getElementById('btn-studio-feed').addEventListener('click', () => {
      studioPlant.feed(0.35);
      studioGrass.forEach(g => g.feed(0.5));
      // Accelerate growth smoothly
      studioPlant.setAge(Math.min(1.0, studioPlant.age + 0.15));
      if (studioPlant.bloom !== null) {
        studioPlant.setBloom(Math.min(1.0, studioPlant.bloom + 0.2));
      }
      // Update slider positions
      document.getElementById('slider-age').value = studioPlant.age;
      document.getElementById('val-age').textContent = `${Math.round(studioPlant.age * 100)}%`;
      if (studioPlant.bloom !== null) {
        document.getElementById('slider-bloom').value = studioPlant.bloom;
        document.getElementById('val-bloom').textContent = `${Math.round(studioPlant.bloom * 100)}%`;
      }
      playChime(660);
      showToast('Specimen nourished with sunlight! ☀️');
    });

    // Export Action Buttons
    document.getElementById('btn-copy-ascii').addEventListener('click', () => {
      const asciiText = studioPlant.toPlainText(45, 38);
      navigator.clipboard.writeText(asciiText).then(() => {
        showToast('Plain ASCII copied to clipboard!');
      });
    });

    document.getElementById('btn-copy-tag').addEventListener('click', () => {
      const tag = `<florametric-plant type="${studioPlant.type}" age="${studioPlant.age}" bloom="${studioPlant.bloom !== null ? studioPlant.bloom : 1.0}" height="${studioPlant.height}" palette="${studioPlant.paletteName}" interactive></florametric-plant>`;
      navigator.clipboard.writeText(tag).then(() => {
        showToast('<florametric-plant> tag copied!');
      });
    });

    document.getElementById('btn-download-png').addEventListener('click', () => {
      const link = document.createElement('a');
      link.download = `florametric-${studioPlant.type}.png`;
      link.href = studioCanvas.toDataURL('image/png');
      link.click();
      showToast('PNG image downloaded!');
    });
  }

  // =========================================================================
  // 5. THE SPECIES CODEX
  // =========================================================================

  let codexInitialized = false;

  function initCodex() {
    if (codexInitialized) return;
    codexInitialized = true;

    const grid = document.getElementById('codex-grid');
    grid.innerHTML = '';

    const speciesCatalog = [
      { id: 'sunflower', name: 'Golden Sunflower', latin: 'Helianthus annuus', desc: 'Dense fibrous disc floret with swirling flame ray petals.' },
      { id: 'hibiscus', name: 'Tropical Hibiscus', latin: 'Hibiscus rosa-sinensis', desc: '5-lobed rounded whorls with prominent curved golden stamen.' },
      { id: 'iris', name: 'Royal Purple Iris', latin: 'Iris germanica', desc: 'Upright feathery standards, drooping wing falls, and golden signal flare.' },
      { id: 'thistle', name: 'Wild Thistle', latin: 'Cirsium vulgare', desc: 'Green stippled calyx cup crowned by radiating purple bristles.' },
      { id: 'marigold', name: 'French Marigold', latin: 'Tagetes patula', desc: 'Concentric fiery bands of crimson, orange, and golden pompons.' },
      { id: 'daffodil', name: 'Golden Daffodil', latin: 'Narcissus pseudonarcissus', desc: '6-pointed lemon star perianth with deep orange trumpet corona.' },
      { id: 'rose', name: 'Velvet Rose', latin: 'Rosa rubiginosa', desc: 'Multi-tiered concentric crimson whorls with thorny stem.' },
      { id: 'dandelion', name: 'Dandelion Clock', latin: 'Taraxacum officinale', desc: 'Spherical fluffy seed globe with drifting parachute seeds.' },
      { id: 'tulip', name: 'Garden Tulip', latin: 'Tulipa gesneriana', desc: 'Sleek architectural goblet cup with smooth scalloped rim.' },
      { id: 'flytrap', name: 'Venus Flytrap', latin: 'Dionaea muscipula', desc: 'Carnivorous bivalve trap with sensitive interlocking marginal teeth.' }
    ];

    speciesCatalog.forEach(sp => {
      const card = document.createElement('div');
      card.className = 'codex-card';

      card.innerHTML = `
        <div class="codex-canvas-wrap">
          <canvas id="codex-canvas-${sp.id}"></canvas>
        </div>
        <div class="codex-info">
          <div class="codex-title">${sp.name}</div>
          <div class="codex-latin">${sp.latin}</div>
        </div>
        <div class="codex-card-actions">
          <button class="card-action-btn btn-inspect" data-type="${sp.id}">Inspect in Lab</button>
          <button class="card-action-btn btn-copy" data-type="${sp.id}">Copy ASCII</button>
        </div>
      `;

      grid.appendChild(card);

      // Initialize mini canvas for card
      setTimeout(() => {
        const cCanvas = document.getElementById(`codex-canvas-${sp.id}`);
        if (!cCanvas) return;
        const cGarden = new AsciiPlants.AsciiGarden(cCanvas, { wind: 0.45, palette: 'botanical' });
        cGarden.addPlant(cCanvas.clientWidth / 2 || 130, {
          type: sp.id,
          age: 1.0,
          bloom: 1.0,
          height: 150,
          interactive: true
        });
        cGarden.start();
      }, 50);
    });

    // Delegated actions for codex buttons
    grid.addEventListener('click', e => {
      const inspectBtn = e.target.closest('.btn-inspect');
      if (inspectBtn) {
        const spType = inspectBtn.dataset.type;
        document.getElementById('select-species').value = spType;
        if (studioPlant) {
          studioPlant.type = spType;
          studioPlant.simulator.type = spType;
        }
        switchTab('studio');
        return;
      }

      const copyBtn = e.target.closest('.btn-copy');
      if (copyBtn) {
        const spType = copyBtn.dataset.type;
        const txt = AsciiPlants.generateString({ type: spType, age: 1.0, bloom: 1.0 });
        navigator.clipboard.writeText(txt).then(() => {
          showToast(`Copied ${spType} ASCII art!`);
        });
      }
    });
  }

  // =========================================================================
  // 6. GLOBAL NAVBAR CONTROLS & UTILITIES
  // =========================================================================

  const timeSpeeds = [
    { label: 'Time: 1x ⏱️', navLabel: '1x ⏱️', val: 1.0 },
    { label: 'Time: 3x ⏩', navLabel: '3x ⏩', val: 3.0 },
    { label: 'Time: 8x 🚀', navLabel: '8x 🚀', val: 8.0 },
    { label: 'Time: ⏸️ Paused', navLabel: 'Paused ⏸️', val: 0.0 }
  ];
  let timeSpeedIndex = 0;

  function cycleTimeSpeed() {
    timeSpeedIndex = (timeSpeedIndex + 1) % timeSpeeds.length;
    const cur = timeSpeeds[timeSpeedIndex];
    if (garden) garden.timeSpeed = cur.val;

    const btnClock = document.getElementById('btn-clock-toggle');
    if (btnClock) {
      btnClock.querySelector('.lbl').textContent = `Time: ${cur.navLabel}`;
      btnClock.style.borderColor = cur.val > 1.0 ? 'var(--accent-gold)' : '';
      btnClock.style.background = cur.val > 1.0 ? 'rgba(255, 190, 40, 0.15)' : '';
    }

    const btnHudClock = document.getElementById('btn-clock-cycle');
    if (btnHudClock) {
      btnHudClock.textContent = cur.label;
      btnHudClock.style.borderColor = cur.val > 1.0 ? 'var(--accent-gold)' : '';
    }

    showToast(`Biological Clock: ${cur.label}`);
    playChime(440 + cur.val * 35);
  }

  const btnClock = document.getElementById('btn-clock-toggle');
  if (btnClock) {
    btnClock.addEventListener('click', cycleTimeSpeed);
  }

  const btnNourish = document.getElementById('btn-nourish-toggle');
  btnNourish.addEventListener('click', () => {
    nourishMode = !nourishMode;
    btnNourish.querySelector('.lbl').textContent = nourishMode ? 'Nourish: On ☀️' : 'Nourish: Off';
    btnNourish.style.borderColor = nourishMode ? 'var(--accent-gold)' : '';
    btnNourish.style.background = nourishMode ? 'rgba(255, 190, 40, 0.15)' : '';

    // Change canvas cursor
    gardenCanvas.style.cursor = nourishMode ? 'crosshair' : 'default';
    showToast(nourishMode ? 'Nourish Mode ON: Click/tap to shower sunlight! ☀️' : 'Nourish Mode OFF: Click soil to plant seeds 🌱');
    if (nourishMode) playChime(660);
  });

  const btnWind = document.getElementById('btn-wind-toggle');
  let windLevel = 1; // 0 = Calm, 1 = Med, 2 = Strong
  const windLevels = [
    { name: 'Calm', val: 0.2 },
    { name: 'Med', val: 0.65 },
    { name: 'Gale', val: 1.2 }
  ];

  btnWind.addEventListener('click', () => {
    windLevel = (windLevel + 1) % windLevels.length;
    const current = windLevels[windLevel];
    btnWind.querySelector('.lbl').textContent = `Breeze: ${current.name}`;
    if (garden) garden.windStrength = current.val;
    studioWind = current.val;
  });

  const btnSound = document.getElementById('btn-sound-toggle');
  btnSound.addEventListener('click', () => {
    soundEnabled = !soundEnabled;
    btnSound.querySelector('.lbl').textContent = soundEnabled ? 'Sound: On' : 'Sound: Off';
    btnSound.style.borderColor = soundEnabled ? 'var(--accent-green)' : '';
    if (soundEnabled) playChime(520);
  });

  function showToast(msg) {
    const toast = document.getElementById('toast');
    toast.textContent = msg;
    toast.classList.add('show');
    setTimeout(() => {
      toast.classList.remove('show');
    }, 2400);
  }

  // Start in Garden Mode (or URL hash if specified)
  const initialTab = window.location.hash ? window.location.hash.replace('#', '') : 'garden';
  if (['garden', 'studio', 'codex', 'embed'].includes(initialTab)) {
    switchTab(initialTab);
  } else {
    initGarden();
  }

  // Automatic sunlight demo trigger if URL query param present
  if (window.location.search.includes('sunlight=1')) {
    setTimeout(() => {
      const burstBtn = document.getElementById('btn-sunlight-burst');
      if (burstBtn) burstBtn.click();
    }, 450);
  }

  // Automatic dandelion blow demo trigger if URL query param present
  if (window.location.search.includes('blow_dandelion=1')) {
    setTimeout(() => {
      if (garden) {
        const dand = garden.plants.find(p => p.plant.type === 'dandelion');
        if (dand) {
          const head = dand.plant.getHeadPosition(dand.x, garden.cssHeight - 50);
          garden.blowDandelion(dand.plant, head.x, head.y);
        }
      }
    }, 450);
  }
});
