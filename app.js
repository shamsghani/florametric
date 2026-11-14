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
    } catch (e) {}
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
      palette: 'botanical'
    });

    // Populate initial meadow with diverse botanical species
    seedWildflowerMeadow();
    garden.start();

    // Click or tap to sow or feed
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

      if (nourishMode) {
        // Feed Sunlight / Plant Food mode
        garden.nourishAt(clickX, clickY, 240);
        playChime(520 + Math.random() * 260);
      } else {
        // Plant seed if near soil line (lower 25% of canvas) or general sowing
        const groundY = gardenCanvas.height - 50;
        const speciesList = AsciiPlants.SPECIES;
        const randomSpecies = speciesList[Math.floor(Math.random() * speciesList.length)];
        
        const newPlant = garden.addPlant(clickX, {
          type: randomSpecies,
          age: 0.05,
          height: 280 + Math.random() * 120,
          curvature: (Math.random() - 0.5) * 0.6,
          seed: Math.floor(Math.random() * 10000)
        });

        playChime(320 + Math.random() * 200);

        let growthTimer = setInterval(() => {
          if (newPlant.age < 1.0) {
            newPlant.setAge(newPlant.age + 0.025);
            if (newPlant.age >= 1.0) {
              newPlant.setAge(1.0);
              clearInterval(growthTimer);
              playChime(580 + Math.random() * 150);
            }
          }
        }, 50);
      }
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
    const species = ['sunflower', 'hibiscus', 'iris', 'thistle', 'marigold', 'daffodil', 'rose', 'dandelion'];
    const count = Math.max(5, Math.floor(width / 130));

    for (let i = 0; i < count; i++) {
      const x = (i + 0.5) * (width / count) + (Math.random() - 0.5) * 35;
      const sp = species[i % species.length];
      garden.addPlant(x, {
        type: sp,
        age: 0.85 + Math.random() * 0.15,
        height: 290 + Math.random() * 90,
        curvature: (Math.random() - 0.5) * 0.5,
        seed: Math.floor(Math.random() * 10000)
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

    startStudioLoop();
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
  }

  function startStudioLoop() {
    if (studioAnimId) cancelAnimationFrame(studioAnimId);
    let lastTime = performance.now();

    const loop = (now) => {
      if (activeTab !== 'studio') return;
      const dt = (now - lastTime) / 1000;
      lastTime = now;
      studioTime += dt;

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
    ctx.shadowColor = '#00ff66';
    ctx.shadowBlur = 4;
    ctx.font = '12px monospace';
    ctx.textAlign = 'center';
    for (let gx = originX - 220; gx <= originX + 220; gx += 16) {
      ctx.fillText('-', gx, groundY + 12);
    }
    ctx.restore();

    // Render plant
    studioPlant.renderToCanvas(ctx, originX, groundY, studioTime, studioWind);

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
      document.getElementById('val-age').textContent = `${Math.round(val * 100)}%`;
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
});
