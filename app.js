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
  let studioDt = 0.016;
  const codexGardens = [];
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

    // Only the visible view animates; hidden canvases cost nothing
    if (garden && tabId !== 'garden') garden.stop();
    if (tabId !== 'codex') codexGardens.forEach(g => g.stop());

    if (tabId === 'garden') {
      if (!garden) {
        initGarden();
      } else {
        garden.resize();
        garden.start();
      }
    } else if (tabId === 'studio') {
      initStudio();
    } else if (tabId === 'codex') {
      initCodex();
      codexGardens.forEach(g => g.start());
    } else if (tabId === 'embed') {
      initMeadowArchitect();
    }
  }

  function describeGenome(g) {
    return `life ×${g.lifeFactor.toFixed(2)}, size ×${g.size.toFixed(2)}, branching ×${g.branching.toFixed(2)}`;
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
      showToast(`A ${plant.type} seed took root — generation ${plant.genome.generation} 🌱`);
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

    // Touch interaction for smartphones and tablets
    gardenCanvas.addEventListener('touchstart', e => {
      if (e.touches && e.touches.length > 0) {
        isMouseDown = true;
        const touch = e.touches[0];
        handleGardenInteraction({ clientX: touch.clientX, clientY: touch.clientY });
      }
    }, { passive: true });

    gardenCanvas.addEventListener('touchmove', e => {
      if (e.touches && e.touches.length > 0 && nourishMode) {
        const touch = e.touches[0];
        handleGardenInteraction({ clientX: touch.clientX, clientY: touch.clientY });
      }
    }, { passive: true });

    window.addEventListener('touchend', () => {
      isMouseDown = false;
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

        const sown = garden.addPlant(clickX, {
          type: randomSpecies,
          age: 0.05,
          height: 280 + Math.random() * 120,
          curvature: (Math.random() - 0.5) * 0.6,
          seed: Math.floor(Math.random() * 1000000)
        });

        playChime(320 + Math.random() * 200);
        showToast(`Sowed ${randomSpecies} 🌱 (${describeGenome(sown.genome)})`);
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

    const btnExport = document.getElementById('btn-export-meadow');
    if (btnExport) {
      btnExport.addEventListener('click', () => {
        if (garden && garden.plants.length > 0) {
          const currentSpecies = Array.from(new Set(garden.plants.map(p => p.plant.type)));
          architectState.species = currentSpecies;
          architectState.plantCount = garden.plants.length;
          architectState.palette = garden.paletteName;
          architectState.startTime = Date.now();
        }
        switchTab('embed');
        if (typeof syncArchitectControlsFromState === 'function') {
          syncArchitectControlsFromState();
        }
        showToast('Meadow configuration loaded into Architect! ⌛');
      });
    }
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
    // The specimen must exist before the controls (the genome panel reads it)
    if (!studioPlant) {
      studioPlant = new AsciiPlants.AsciiPlant({
        type: 'sunflower',
        age: 1.0,
        bloom: null, // auto: the flower follows the plant's age
        height: 380,
        curvature: 0.15,
        leafDensity: 1.0,
        seed: 42,
        palette: 'botanical',
        interactive: true
      });
      studioPlant.growTo(studioPlant.age);
    }

    if (!studioCanvas) {
      studioCanvas = document.getElementById('studio-canvas');
      studioCtx = studioCanvas.getContext('2d');
      setupStudioControls();
      setupStudioEvents();
    }

    resizeStudioCanvas();
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
    const dpr = typeof window !== 'undefined' ? Math.min(2, window.devicePixelRatio || 1) : 1;
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
      studioDt = dt;

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
      const pal = studioPlant.getPalette();
      const grassGlyphs = [];
      studioGrass.forEach(g => {
        g.update(studioDt, 1.0);
        grassGlyphs.push(...g.generateGlyphs(studioTime, studioWind, studioPlant.pointer, pal));
      });
      AsciiPlants.GlyphRenderer.shared.draw(ctx, grassGlyphs);
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
    document.getElementById('stat-branch').textContent = `Secondary Shoots: ${simData.branchCount}`;
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

    const updateStudioTouch = (touch) => {
      if (!touch) return;
      const rect = studioCanvas.getBoundingClientRect();
      studioPlant.pointer.x = touch.clientX - rect.left;
      studioPlant.pointer.y = touch.clientY - rect.top;
      studioPlant.pointer.active = true;
    };

    studioCanvas.addEventListener('touchstart', e => {
      if (e.touches && e.touches.length > 0) {
        updateStudioTouch(e.touches[0]);
      }
    }, { passive: true });

    studioCanvas.addEventListener('touchmove', e => {
      if (e.touches && e.touches.length > 0) {
        updateStudioTouch(e.touches[0]);
      }
    }, { passive: true });

    studioCanvas.addEventListener('touchend', () => {
      studioPlant.pointer.active = false;
    }, { passive: true });

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
    const sPointer = document.getElementById('select-pointer-mode');
    const sPalette = document.getElementById('select-palette');

    sSpecies.addEventListener('change', e => {
      setStudioSpecies(e.target.value);
    });

    sAge.addEventListener('input', e => {
      // Regrow the specimen to this age (leaves, branches and flower included) and let
      // the flower follow the age again
      studioPlant.bloom = null;
      studioPlant.growTo(parseFloat(e.target.value));
      syncAgeControls();
    });

    sBloom.addEventListener('input', e => {
      const val = parseFloat(e.target.value);
      studioPlant.setBloom(val);
      document.getElementById('val-bloom').textContent = `${Math.round(val * 100)}%`;
    });

    syncAgeControls();

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


    sPointer.addEventListener('change', e => {
      studioPlant.pointerMode = e.target.value;
    });

    sPalette.addEventListener('change', e => {
      studioPlant.setPalette(e.target.value);
    });

    // Randomize DNA Seed
    document.getElementById('btn-randomize-seed').addEventListener('click', () => {
      const newSeed = Math.floor(Math.random() * 1000000);
      studioPlant.seed = newSeed;
      studioPlant.simulator.reseedGenetics(newSeed, AsciiPlants.Genome.random(studioPlant.type, newSeed));
      studioPlant.metabolicRate = studioPlant.genome.vigor;
      studioPlant.growTo(studioPlant.age);
      syncGenomeControls();
      showToast(`DNA Seed: #${newSeed} (${describeGenome(studioPlant.genome)})`);
    });

    buildGenomeControls();

    // Studio Feed Button
    document.getElementById('btn-studio-feed').addEventListener('click', () => {
      studioPlant.feed(0.35);
      studioGrass.forEach(g => g.feed(0.5));
      // Sunlight speeds up a growing plant and pulls an ageing one back toward its prime;
      // a plant in its prime keeps its age (feeding revives wilting members instead)
      const age = studioPlant.age;
      if (age < 1.0) studioPlant.setAge(Math.min(1.0, age + 0.15));
      else if (age > 21.0) studioPlant.setAge(Math.max(20.9, age - 1.2));
      if (studioPlant.bloom !== null) {
        studioPlant.setBloom(Math.min(1.0, studioPlant.bloom + 0.2));
      }
      syncAgeControls();
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

  function ageLabel(val) {
    if (val <= 1.0) return `${Math.round(val * 100)}% (Growth)`;
    if (val <= 21.0) return `Mature Prime (${Math.round(((val - 1.0) / 20.0) * 100)}%)`;
    return `Senescence (${Math.round(Math.min(1, (val - 21.0) / 2.5) * 100)}%)`;
  }

  function syncAgeControls() {
    document.getElementById('slider-age').value = studioPlant.age;
    document.getElementById('val-age').textContent = ageLabel(studioPlant.age);
    const auto = studioPlant.bloom === null;
    const b = studioPlant.effectiveBloom;
    document.getElementById('slider-bloom').value = b;
    document.getElementById('val-bloom').textContent = auto ? `Auto (${Math.round(b * 100)}%)` : `${Math.round(b * 100)}%`;
  }

  function setStudioSpecies(type) {
    studioPlant.type = type;
    studioPlant.simulator.type = type;
    studioPlant.setGenome({ species: type });
    studioPlant.growTo(studioPlant.age);
  }

  const GENOME_SLIDERS = [
    { key: 'lifeFactor', label: 'Life factor' },
    { key: 'vigor', label: 'Vigor (growth rate)' },
    { key: 'branching', label: 'Branching' },
    { key: 'leafing', label: 'Leafing' },
    { key: 'flowering', label: 'Flowering' },
    { key: 'size', label: 'Size' },
    { key: 'hue', label: 'Petal hue' },
    { key: 'shapeNoise', label: 'Shape noise' },
    { key: 'growthNoise', label: 'Growth noise' }
  ];

  function buildGenomeControls() {
    const host = document.getElementById('genome-controls');
    if (!host) return;
    host.innerHTML = '';
    GENOME_SLIDERS.forEach(({ key, label }) => {
      const [lo, hi] = AsciiPlants.TRAIT_RANGES[key];
      const row = document.createElement('div');
      row.innerHTML = `
        <div class="slider-header">
          <label for="gene-${key}">${label}</label>
          <span id="val-gene-${key}" class="val-badge"></span>
        </div>
        <input type="range" id="gene-${key}" min="${lo}" max="${hi}" step="0.01" class="ctrl-slider">`;
      host.appendChild(row);
      row.querySelector('input').addEventListener('input', e => {
        studioPlant.setGenome({ [key]: parseFloat(e.target.value) });
        studioPlant.growTo(studioPlant.age);
        syncGenomeControls();
      });
    });
    syncGenomeControls();
  }

  function syncGenomeControls() {
    const g = studioPlant.genome;
    GENOME_SLIDERS.forEach(({ key }) => {
      const input = document.getElementById(`gene-${key}`);
      const badge = document.getElementById(`val-gene-${key}`);
      if (!input) return;
      input.value = g[key];
      badge.textContent = key === 'hue' ? `${g[key] >= 0 ? '+' : ''}${g[key].toFixed(2)}` : `×${g[key].toFixed(2)}`;
    });
    const gen = document.getElementById('val-generation');
    if (gen) gen.textContent = `Gen ${g.generation} · ${g.habit.replace('_', ' ')}`;
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
        const cGarden = new AsciiPlants.AsciiGarden(cCanvas, { wind: 0.45, palette: 'botanical', lifecycle: 'respawn' });
        // Canonical specimen: standard size & colours, scaled to leave head-room in the card
        cGarden.addPlant(cCanvas.clientWidth / 2 || 130, {
          type: sp.id,
          age: 1.0,
          bloom: 1.0,
          height: Math.max(90, Math.min(150, (cCanvas.clientHeight || 260) - 150)),
          genome: { size: 0.9, hue: 0, saturation: 0, lightness: 0 },
          interactive: true
        });
        codexGardens.push(cGarden);
        if (activeTab === 'codex') cGarden.start();
      }, 50);
    });

    // Delegated actions for codex buttons
    grid.addEventListener('click', e => {
      const inspectBtn = e.target.closest('.btn-inspect');
      if (inspectBtn) {
        const spType = inspectBtn.dataset.type;
        document.getElementById('select-species').value = spType;
        if (studioPlant) setStudioSpecies(spType);
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
  // 6. PERSISTENT MEADOW ARCHITECT & CODE GENERATOR
  // =========================================================================

  const architectState = {
    startTime: Date.now(),
    speed: '24h',
    plantCount: 7,
    species: ['sunflower', 'rose', 'tulip', 'dandelion', 'iris', 'thistle', 'hibiscus'],
    palette: 'botanical',
    seed: 42,
    timeShiftMs: 0,
    format: 'webcomponent', // 'webcomponent' | 'vanilla' | 'npm' | 'url'
    kind: 'meadow',         // 'plant' | 'garden' | 'meadow'
    preset: '',
    features: {}            // only the switches the user changed
  };

  // Feature switches shown in the builder (every one is also an attribute & option)
  const FEATURE_CONTROLS = [
    { key: 'growth', label: 'Growth' },
    { key: 'flowerCycles', label: 'Flowers wilt & seed' },
    { key: 'aging', label: 'Aging' },
    { key: 'reproduction', label: 'Reseeding', kinds: ['garden'] },
    { key: 'glow', label: 'Glow' },
    { key: 'rotation', label: 'Rotated glyphs' },
    { key: 'grass', label: 'Grass' },
    { key: 'soil', label: 'Soil line' },
    { key: 'gusts', label: 'Wind gusts' },
    { key: 'interactive', label: 'Pointer interaction' },
    { key: 'particles', label: 'Falling petals' },
    { key: 'variation', label: 'Genetic variation' },
    { key: 'background', label: 'Transparent background', kind: 'transparent' },
    { key: 'wind', label: 'Wind', kind: 'range' }
  ];

  const KIND_HINTS = {
    plant: 'One specimen in its own box: product cards, sidebars, headers.',
    garden: 'A row of plants that grows, blooms and reseeds while the page is open.',
    meadow: 'Anchored to a start time: every visitor sees the same meadow, further along each day.'
  };

  // Options reference rows: [JS option, attribute, description] (defaults read from the library)
  const OPTION_DOCS = [
    ['Look'],
    ['palette', 'palette', 'botanical, phosphor, amber, cyberpunk or monochrome'],
    ['background', 'background', 'Any CSS colour, or transparent'],
    ['glow', 'glow', 'Soft bloom glow around the glyphs'],
    ['glowStrength', 'glow-strength', 'Glow intensity'],
    ['rotation', 'rotation', 'Glyphs follow curves; false = classic upright ASCII'],
    ['grass', 'grass', 'Living grass along the soil'],
    ['soil', 'soil', 'The dashed soil line'],
    ['groundOffset', 'ground-offset', 'Pixels from the bottom edge to the soil line'],
    ['Motion'],
    ['wind', 'wind', 'Breeze strength; 0 = still air'],
    ['gusts', 'gusts', 'Gust fronts rolling across the plants'],
    ['reducedMotion', 'reduced-motion', 'Gentle motion; unset = follow the visitor\'s system setting'],
    ['fps', 'fps', 'Frame-rate cap; 0 = display refresh rate'],
    ['pauseOffscreen', 'pause-offscreen', 'Stop drawing while scrolled out of view'],
    ['Life'],
    ['growth', 'growth', 'Plants grow and age over time'],
    ['timeSpeed', 'time-speed', 'Speed of the biological clock'],
    ['aging', 'aging', 'false = plants reach their prime and stay there'],
    ['flowerCycles', 'flower-cycles', 'false = flowers stay in bloom (no wilting or seed heads)'],
    ['reproduction', 'reproduction', 'Spent flowers seed new plants; false = regrow in place'],
    ['immigration', 'immigration', 'Occasional wind-blown seeds of new species'],
    ['variation', 'variation', 'false = every plant is its species\' textbook individual'],
    ['genome', 'genome', 'Default genes for new plants, e.g. {"hue": 0.4}'],
    ['seed', 'seed', 'Master seed: same seed, same plants'],
    ['Interaction'],
    ['interactive', 'interactive', 'Pointer bending, pollen and dandelion blowing'],
    ['pointerMode', 'pointer-mode', 'reach (bend toward), flinch (away) or none'],
    ['pollen', 'pollen', 'Pollen trail behind the pointer'],
    ['particles', 'particles', 'Falling petals and leaves'],
    ['dandelionBlow', 'dandelion-blow', 'Click a seed clock to blow its seeds'],
    ['Content'],
    ['preset', 'preset', 'static, calm, classic, minimal or living (applied first)', '—'],
    ['type', 'type', 'Plant species (florametric-plant)', 'sunflower'],
    ['species / count', 'species / count', 'Species list and number of plants (florametric-garden)', 'all / up to 7'],
    ['age / bloom', 'age / bloom', 'Biological age (0-1 grows, 1-21 prime) and bloom override', '1 / auto'],
    ['animate', 'animate', 'false = draw a single still frame', 'true']
  ];

  let architectPreviewGarden = null;
  let architectInitialized = false;

  const ALL_SPECIES_LIST = [
    { id: 'sunflower', name: 'Sunflower', icon: '🌻' },
    { id: 'rose', name: 'Rose', icon: '🌹' },
    { id: 'tulip', name: 'Tulip', icon: '🌷' },
    { id: 'dandelion', name: 'Dandelion', icon: '🌾' },
    { id: 'hibiscus', name: 'Hibiscus', icon: '🌺' },
    { id: 'iris', name: 'Iris', icon: '🪻' },
    { id: 'thistle', name: 'Thistle', icon: '🪡' },
    { id: 'marigold', name: 'Marigold', icon: '🏵️' },
    { id: 'daffodil', name: 'Daffodil', icon: '🌼' },
    { id: 'flytrap', name: 'Flytrap', icon: '🪴' }
  ];

  function formatIsoLocal(timestamp) {
    const d = new Date(timestamp);
    const pad = n => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  }

  function syncArchitectControlsFromState() {
    const inputT0 = document.getElementById('gen-t0');
    if (inputT0) inputT0.value = formatIsoLocal(architectState.startTime);

    const selSpeed = document.getElementById('gen-speed');
    if (selSpeed) selSpeed.value = architectState.speed;

    const sCount = document.getElementById('gen-count');
    if (sCount) {
      sCount.value = architectState.plantCount;
      document.getElementById('val-gen-count').textContent = `${architectState.plantCount} plants`;
    }

    const selPal = document.getElementById('gen-palette');
    if (selPal) selPal.value = architectState.palette;

    const inputSeed = document.getElementById('gen-seed');
    if (inputSeed) inputSeed.value = architectState.seed;

    renderSpeciesChips();
    updateArchitectPreview();
  }

  function architectOptions() {
    const o = { palette: architectState.palette, seed: architectState.seed };
    if (architectState.preset) o.preset = architectState.preset;
    return Object.assign(o, architectState.features);
  }

  function updateArchitectPreview() {
    const previewCanvas = document.getElementById('gen-preview-canvas');
    if (!previewCanvas) return;

    // Rebuild the preview for the current kind and options (cheap, and always exact)
    if (architectPreviewGarden) architectPreviewGarden.destroy();
    const kind = architectState.kind;
    const opts = architectOptions();
    const targetTime = Date.now() + architectState.timeShiftMs;

    if (kind === 'meadow') {
      architectPreviewGarden = Florametric.createPersistentMeadow(previewCanvas, Object.assign({
        startTime: architectState.startTime,
        speed: architectState.speed,
        plantCount: architectState.plantCount,
        species: architectState.species
      }, opts));
      architectPreviewGarden.syncToTime(targetTime);
    } else if (kind === 'garden') {
      architectPreviewGarden = Florametric.garden(previewCanvas, Object.assign({
        species: architectState.species, count: architectState.plantCount, age: 3
      }, opts));
    } else {
      architectPreviewGarden = Florametric.plant(previewCanvas, Object.assign({
        type: architectState.species[0], age: 3
      }, opts));
    }

    // Stats
    const statElapsed = document.getElementById('gen-stat-elapsed');
    const statStage = document.getElementById('gen-stat-stage');
    const statAvgAge = document.getElementById('gen-stat-avg-age');
    if (kind === 'meadow') {
      const summary = architectPreviewGarden.getMeadowSummary(targetTime);
      if (statElapsed) statElapsed.textContent = `Elapsed: ${summary.elapsedHours} hrs (${summary.elapsedDays} days)`;
      if (statStage) statStage.textContent = `Stage: ${summary.stage}`;
      if (statAvgAge) statAvgAge.textContent = `Avg Age: ${summary.averageAge}`;
    } else {
      const n = architectPreviewGarden.plants.length;
      const eff = effectiveFeatures();
      if (statElapsed) statElapsed.textContent = `${n} plant${n === 1 ? '' : 's'}`;
      if (statStage) statStage.textContent = eff.growth ? 'Living: grows & blooms' : 'Static: no growth';
      if (statAvgAge) statAvgAge.textContent = eff.wind > 0 ? `Wind ${(+eff.wind).toFixed(2)}` : 'Still air';
    }

    updateCodeSnippetOutput();
  }

  function scriptBaseUrl() {
    const host = window.location.hostname;
    if (!host || host === 'localhost' || host === '127.0.0.1') return 'https://shamsghani.github.io/florametric';
    const path = window.location.pathname.replace(/\/index\.html$/, '').replace(/\/+$/, '');
    return `${window.location.origin}${path}`;
  }

  /** Options that differ from the library defaults, in insertion order (preset first). */
  function changedOptions() {
    const out = {};
    if (architectState.preset) out.preset = architectState.preset;
    const base = Object.assign({}, Florametric.defaults, architectState.preset ? Florametric.presets[architectState.preset] : {});
    Object.keys(architectState.features).forEach(k => {
      if (architectState.features[k] !== base[k]) out[k] = architectState.features[k];
    });
    return out;
  }

  const kebab = k => k.replace(/[A-Z]/g, c => '-' + c.toLowerCase());

  function updateCodeSnippetOutput() {
    const codeEl = document.getElementById('gen-code-output');
    if (!codeEl) return;

    const kind = architectState.kind;
    const baseUrl = scriptBaseUrl();
    const changed = changedOptions();
    const spString = architectState.species.join(',');
    const attrs = Object.keys(changed).map(k => `  ${kebab(k)}="${changed[k]}"`);
    const jsOpts = Object.keys(changed).map(k => `  ${k}: ${JSON.stringify(changed[k])},`);
    const js = (lines) => lines.concat(jsOpts).join('\n').replace(/,$/, '');
    const species = `[${architectState.species.map(sp => `'${sp}'`).join(', ')}]`;

    let tag;
    let call;
    if (kind === 'plant') {
      tag = ['<florametric-plant', `  type="${architectState.species[0]}"`, `  palette="${architectState.palette}"`, `  seed="${architectState.seed}"`]
        .concat(attrs, ['  style="width: 280px; height: 380px;">', '</florametric-plant>']);
      call = `Florametric.plant('#flower', {\n${js([`  type: '${architectState.species[0]}',`, `  palette: '${architectState.palette}',`, `  seed: ${architectState.seed},`])}\n});`;
    } else if (kind === 'garden') {
      tag = ['<florametric-garden', `  species="${spString}"`, `  count="${architectState.plantCount}"`, `  palette="${architectState.palette}"`, `  seed="${architectState.seed}"`]
        .concat(attrs, ['  style="height: 360px;">', '</florametric-garden>']);
      call = `Florametric.garden('#garden', {\n${js([`  species: ${species},`, `  count: ${architectState.plantCount},`, `  palette: '${architectState.palette}',`, `  seed: ${architectState.seed},`])}\n});`;
    } else {
      tag = ['<florametric-meadow', `  start-time="${architectState.startTime}"`, `  speed="${architectState.speed}"`, `  plant-count="${architectState.plantCount}"`,
        `  species="${spString}"`, `  palette="${architectState.palette}"`, `  seed="${architectState.seed}"`]
        .concat(attrs, ['  style="height: 380px;">', '</florametric-meadow>']);
      call = `Florametric.createPersistentMeadow('#meadow', {\n${js([`  startTime: ${architectState.startTime}, // ${new Date(architectState.startTime).toISOString()}`, `  speed: '${architectState.speed}',`, `  plantCount: ${architectState.plantCount},`, `  species: ${species},`, `  palette: '${architectState.palette}',`, `  seed: ${architectState.seed},`])}\n});`;
    }
    const boxId = kind === 'plant' ? 'flower' : kind;
    const boxStyle = kind === 'plant' ? 'width: 280px; height: 380px;' : 'height: 380px;';

    if (architectState.format === 'webcomponent') {
      codeEl.textContent = `<!-- 1. Load Florametric once per page -->
<script src="${baseUrl}/florametric.js"></script>

<!-- 2. Place the element (size it with CSS) -->
${tag.join('\n')}`;
    } else if (architectState.format === 'vanilla') {
      codeEl.textContent = `<!-- A box to draw in (a <canvas> or any element with a height) -->
<div id="${boxId}" style="${boxStyle}"></div>

<script src="${baseUrl}/florametric.js"></script>
<script>
  const garden = ${call.replace(/\n/g, '\n  ')}

  // Change anything later: garden.set({ wind: 0, glow: false });
</script>`;
    } else if (architectState.format === 'npm') {
      codeEl.textContent = `// 1. Install (types included)
//    npm install github:shamsghani/florametric

// 2. Import and mount into an element with a height
import Florametric from 'florametric';

const garden = ${call}

// 3. Clean up when your component unmounts
// garden.destroy();`;
    } else if (architectState.format === 'url') {
      const configToken = Florametric.encodeMeadowConfig({
        startTime: architectState.startTime,
        speed: architectState.speed,
        plantCount: architectState.plantCount,
        species: architectState.species,
        palette: architectState.palette,
        seed: architectState.seed
      });
      codeEl.textContent = `${baseUrl}/#meadow=${configToken}`;
    }
  }

  function renderSpeciesChips() {
    const wrap = document.getElementById('gen-species-pills');
    if (!wrap) return;
    wrap.innerHTML = '';
    ALL_SPECIES_LIST.forEach(sp => {
      const isSelected = architectState.species.includes(sp.id);
      const chip = document.createElement('button');
      chip.type = 'button';
      chip.className = `species-chip ${isSelected ? 'active' : ''}`;
      chip.innerHTML = `<span class="chip-icon">${sp.icon}</span> <span>${sp.name}</span>`;
      chip.addEventListener('click', () => {
        if (architectState.species.includes(sp.id)) {
          if (architectState.species.length > 1) {
            architectState.species = architectState.species.filter(s => s !== sp.id);
          } else {
            showToast('Meadow must contain at least one species!');
            return;
          }
        } else {
          architectState.species.push(sp.id);
        }
        renderSpeciesChips();
        updateArchitectPreview();
      });
      wrap.appendChild(chip);
    });
  }

  function initMeadowArchitect() {
    if (architectInitialized) {
      updateArchitectPreview();
      return;
    }
    architectInitialized = true;

    // 1. Initial values
    architectState.startTime = Date.now();
    const inputT0 = document.getElementById('gen-t0');
    if (inputT0) {
      inputT0.value = formatIsoLocal(architectState.startTime);
      inputT0.addEventListener('change', e => {
        const val = new Date(e.target.value).getTime();
        if (!isNaN(val)) {
          architectState.startTime = val;
          document.querySelectorAll('.preset-pill').forEach(p => p.classList.remove('active'));
          updateArchitectPreview();
        }
      });
    }

    // Now button
    const btnNow = document.getElementById('btn-t0-now');
    if (btnNow) {
      btnNow.addEventListener('click', () => {
        architectState.startTime = Date.now();
        if (inputT0) inputT0.value = formatIsoLocal(architectState.startTime);
        document.querySelectorAll('.preset-pill').forEach(p => p.classList.remove('active'));
        const nowPill = document.querySelector('.preset-pill[data-offset="0"]');
        if (nowPill) nowPill.classList.add('active');
        updateArchitectPreview();
        showToast('Epoch reset to current time! ⏱️');
      });
    }

    // Preset pills (-12h, -1d, -3d, -1w)
    document.querySelectorAll('.preset-pill').forEach(pill => {
      pill.addEventListener('click', () => {
        document.querySelectorAll('.preset-pill').forEach(p => p.classList.remove('active'));
        pill.classList.add('active');
        const offset = parseInt(pill.dataset.offset, 10);
        architectState.startTime = Date.now() + offset;
        if (inputT0) inputT0.value = formatIsoLocal(architectState.startTime);
        updateArchitectPreview();
      });
    });

    // Speed
    const selSpeed = document.getElementById('gen-speed');
    if (selSpeed) {
      selSpeed.addEventListener('change', e => {
        architectState.speed = e.target.value;
        updateArchitectPreview();
      });
    }

    // Count slider
    const sCount = document.getElementById('gen-count');
    if (sCount) {
      sCount.addEventListener('input', e => {
        const val = parseInt(e.target.value, 10);
        architectState.plantCount = val;
        document.getElementById('val-gen-count').textContent = `${val} plants`;
        updateArchitectPreview();
      });
    }

    // Palette
    const selPalette = document.getElementById('gen-palette');
    if (selPalette) {
      selPalette.addEventListener('change', e => {
        architectState.palette = e.target.value;
        updateArchitectPreview();
      });
    }

    // Seed
    const inputSeed = document.getElementById('gen-seed');
    if (inputSeed) {
      inputSeed.addEventListener('input', e => {
        architectState.seed = parseInt(e.target.value, 10) || 42;
        updateArchitectPreview();
      });
    }
    const btnRandSeed = document.getElementById('btn-gen-random-seed');
    if (btnRandSeed) {
      btnRandSeed.addEventListener('click', () => {
        architectState.seed = Math.floor(Math.random() * 100000);
        if (inputSeed) inputSeed.value = architectState.seed;
        updateArchitectPreview();
        playChime(660);
      });
    }

    // Time scrub testing pills (Simulate Revisit)
    document.querySelectorAll('.scrub-pill').forEach(pill => {
      pill.addEventListener('click', () => {
        document.querySelectorAll('.scrub-pill').forEach(p => p.classList.remove('active'));
        pill.classList.add('active');
        architectState.timeShiftMs = parseInt(pill.dataset.shift, 10) || 0;
        updateArchitectPreview();
        playChime(520 + Math.random() * 100);
      });
    });

    // Code format switcher tabs
    document.querySelectorAll('.exp-tab').forEach(tab => {
      tab.addEventListener('click', () => {
        document.querySelectorAll('.exp-tab').forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        architectState.format = tab.dataset.format;
        updateCodeSnippetOutput();
      });
    });

    // Copy Code button
    const btnCopyCode = document.getElementById('btn-copy-gen-code');
    if (btnCopyCode) {
      btnCopyCode.addEventListener('click', () => {
        const codeEl = document.getElementById('gen-code-output');
        if (codeEl) {
          navigator.clipboard.writeText(codeEl.textContent).then(() => {
            showToast('Code snippet copied to clipboard! 📋');
            playChime(784);
          });
        }
      });
    }

    // What to embed
    document.querySelectorAll('.kind-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        architectState.kind = btn.dataset.kind;
        if (architectState.kind !== 'meadow' && architectState.format === 'url') architectState.format = 'webcomponent';
        applyKindVisibility();
        updateArchitectPreview();
      });
    });

    const selPreset = document.getElementById('gen-preset');
    if (selPreset) {
      selPreset.addEventListener('change', e => {
        architectState.preset = e.target.value;
        architectState.features = {};
        renderFeatureControls();
        updateArchitectPreview();
      });
    }

    renderFeatureControls();
    renderOptionsReference();
    applyKindVisibility();
    renderSpeciesChips();
    updateArchitectPreview();
  }

  function effectiveFeatures() {
    const preset = architectState.preset ? Florametric.presets[architectState.preset] : {};
    return Object.assign({}, Florametric.defaults, preset, architectState.features);
  }

  function renderFeatureControls() {
    const host = document.getElementById('gen-features');
    if (!host) return;
    host.innerHTML = '';
    const eff = effectiveFeatures();
    FEATURE_CONTROLS.forEach(fc => {
      if (fc.kinds && !fc.kinds.includes(architectState.kind)) return;
      const row = document.createElement('label');
      row.className = 'feature-toggle' + (fc.kind === 'range' ? ' wide' : '');
      if (fc.kind === 'range') {
        row.innerHTML = `${fc.label} <input type="range" min="0" max="1.5" step="0.05" value="${eff.wind}"> <span class="val-badge">${(+eff.wind).toFixed(2)}</span>`;
        row.querySelector('input').addEventListener('input', e => {
          architectState.features.wind = +e.target.value;
          row.querySelector('.val-badge').textContent = (+e.target.value).toFixed(2);
          updateArchitectPreview();
        });
      } else {
        const checked = fc.kind === 'transparent' ? eff.background === 'transparent' : !!eff[fc.key];
        row.innerHTML = `<input type="checkbox" ${checked ? 'checked' : ''}> ${fc.label}`;
        row.querySelector('input').addEventListener('change', e => {
          if (fc.kind === 'transparent') architectState.features.background = e.target.checked ? 'transparent' : Florametric.defaults.background;
          else architectState.features[fc.key] = e.target.checked;
          updateArchitectPreview();
        });
      }
      host.appendChild(row);
    });
  }

  function applyKindVisibility() {
    const kind = architectState.kind;
    document.querySelectorAll('.kind-btn').forEach(b => {
      b.classList.toggle('active', b.dataset.kind === kind);
      b.setAttribute('aria-checked', b.dataset.kind === kind ? 'true' : 'false');
    });
    document.querySelectorAll('#view-embed .only-meadow').forEach(el => { el.style.display = kind === 'meadow' ? '' : 'none'; });
    document.querySelectorAll('#view-embed .not-plant').forEach(el => { el.style.display = kind === 'plant' ? 'none' : ''; });
    document.querySelectorAll('.exp-tab').forEach(t => t.classList.toggle('active', t.dataset.format === architectState.format));
    const hint = document.getElementById('gen-kind-hint');
    if (hint) hint.textContent = KIND_HINTS[kind];
    const title = document.getElementById('gen-preview-time-title');
    if (title && kind !== 'meadow') title.textContent = kind === 'plant' ? 'Single plant preview' : 'Garden preview';
    renderFeatureControls();
  }

  function renderOptionsReference() {
    const table = document.getElementById('options-reference');
    if (!table) return;
    const fmt = v => (v === null || v === undefined ? 'auto' : (typeof v === 'object' ? 'none' : String(v)));
    let html = '<thead><tr><th>Attribute</th><th>JavaScript option</th><th>Default</th><th>What it does</th></tr></thead><tbody>';
    OPTION_DOCS.forEach(row => {
      if (row.length === 1) {
        html += `<tr class="group-row"><td colspan="4">${row[0]}</td></tr>`;
        return;
      }
      const [opt, attr, desc, def] = row;
      const value = def !== undefined ? def : fmt(Florametric.defaults[opt]);
      html += `<tr><td><code>${attr}</code></td><td><code>${opt}</code></td><td>${value}</td><td>${desc}</td></tr>`;
    });
    table.innerHTML = html + '</tbody>';
  }

  // =========================================================================
  // 7. GLOBAL NAVBAR CONTROLS & UTILITIES
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
    if (garden) garden.set({ timeSpeed: cur.val });

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
    if (garden) garden.set({ wind: current.val });
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

  // Start in Garden Mode, URL Hash Meadow, or Tab
  if (window.location.hash.startsWith('#meadow=')) {
    const token = window.location.hash.replace('#meadow=', '');
    const decoded = Florametric.decodeMeadowConfig(token);
    switchTab('garden');
    if (decoded) {
      setTimeout(() => {
        if (garden) garden.clear();
        const persistent = Florametric.createPersistentMeadow(gardenCanvas, decoded);
        window.garden = persistent;
        garden = persistent;
        const summary = persistent.getMeadowSummary();
        showToast(`Loaded Persistent Meadow! Started ${summary.elapsedHours}h ago (${summary.stage}) 🌱`);
      }, 100);
    }
  } else {
    const initialTab = window.location.hash ? window.location.hash.replace('#', '') : 'garden';
    if (['garden', 'studio', 'codex', 'embed'].includes(initialTab)) {
      switchTab(initialTab);
    } else {
      initGarden();
    }
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
