/**
 * ASCII Plants Engine - Pure Parametric & Procedural Botanical Generation
 * Zero-dependency, 100% mathematical generative system for living ASCII plants.
 * 
 * Features:
 *  - High genetic diversity & randomness per seed (habit, curvature, branching, flower tilt)
 *  - Distinct species-specific botanical guidelines for stems and foliage (spines, thorns, sword blades, basal rosettes, sheaths)
 *  - 5 Biological growth rules (internodes, bunching, auxin branching, leaf energy scaling, senescence wilting)
 *  - Pure glowing typography on OLED dark canvas (no solid block rectangles)
 *  - 60 FPS harmonic wind physics & pointer heliotropism
 *  - Custom Web Component (<ascii-plant>) and static text generator
 */

(function (root, factory) {
  if (typeof define === 'function' && define.amd) {
    define([], factory);
  } else if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.AsciiPlants = factory();
    root.AsciiPlant = root.AsciiPlants.AsciiPlant;
    root.AsciiGarden = root.AsciiPlants.AsciiGarden;
  }
}(typeof self !== 'undefined' ? self : this, function () {

  // =========================================================================
  // 1. PRNG & MATHEMATICAL UTILITIES
  // =========================================================================

  class PRNG {
    constructor(seed = 12345) {
      this.s = (seed | 0) || 1;
    }
    next() {
      let t = (this.s += 0x6D2B79F5);
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    }
    range(min, max) {
      return min + this.next() * (max - min);
    }
    choice(arr) {
      return arr[Math.floor(this.next() * arr.length)];
    }
  }

  function clamp(val, min, max) {
    return Math.max(min, Math.min(max, val));
  }

  // =========================================================================
  // 2. CHROMATIC PALETTES
  // =========================================================================

  const PALETTES = {
    botanical: {
      id: 'botanical',
      name: 'Glowing Botanical',
      stem: '#55e64b',
      stemDark: '#2da82b',
      wilted: '#b08e2f',
      dead: '#7d5c28',
      haloOpacity: 0.22,
      flowers: {
        sunflower: { core: '#d28219', coreDeep: '#8c4b0f', petal: '#ffe628', petalWarm: '#ffb914', halo: '#ff9c00' },
        hibiscus:  { outer: '#ff96dc', mid: '#ff41af', inner: '#d22382', stamen: '#ffeb2d', anther: '#ffaa14', halo: '#ff28a0' },
        iris:      { standard: '#b973ff', fall: '#8c41eb', deep: '#5f23be', signal: '#ffe12d', halo: '#9641ff' },
        thistle:   { calyx: '#5fe14b', brush: '#d773ff', brushDark: '#a541eb', halo: '#b44bfe' },
        marigold:  { yellow: '#ffe62d', orange: '#ff7d14', crimson: '#e12819', halo: '#ff4600' },
        daffodil:  { petal: '#ffe62d', cup: '#ff7d14', inner: '#c8500a', halo: '#ffbe00' },
        rose:      { petal: '#ff2850', dark: '#b41432', light: '#ff6482', sepal: '#4ba032', halo: '#ff143c' },
        dandelion: { yellow: '#ffe628', seed: '#f5f5fa', core: '#a09664', halo: '#ffbe00' },
        tulip:     { petal: '#ff375f', inner: '#c81946', stamen: '#ffd700', halo: '#ff2850' },
        flytrap:   { jaw: '#55e64b', inside: '#e63750', teeth: '#f5f0dc', halo: '#ff3750' }
      }
    },
    phosphor: {
      id: 'phosphor',
      name: 'Matrix Phosphor',
      stem: '#00ff66',
      stemDark: '#00aa44',
      wilted: '#338844',
      dead: '#225533',
      haloOpacity: 0.35,
      flowers: {
        sunflower: { core: '#00cc55', coreDeep: '#008833', petal: '#55ff99', petalWarm: '#00ff66', halo: '#00ff66' },
        hibiscus:  { outer: '#55ff99', mid: '#00ff66', inner: '#00cc55', stamen: '#aaffcc', anther: '#00ff66', halo: '#00ff66' },
        iris:      { standard: '#55ff99', fall: '#00ff66', deep: '#00cc55', signal: '#ccffee', halo: '#00ff66' },
        thistle:   { calyx: '#00aa44', brush: '#55ff99', brushDark: '#00ff66', halo: '#00ff66' },
        marigold:  { yellow: '#55ff99', orange: '#00ff66', crimson: '#00cc55', halo: '#00ff66' },
        daffodil:  { petal: '#55ff99', cup: '#00ff66', inner: '#00aa44', halo: '#00ff66' },
        rose:      { petal: '#55ff99', dark: '#00aa44', light: '#aaffcc', sepal: '#008833', halo: '#00ff66' },
        dandelion: { yellow: '#55ff99', seed: '#ccffee', core: '#00aa44', halo: '#00ff66' },
        tulip:     { petal: '#55ff99', inner: '#00cc55', stamen: '#ccffee', halo: '#00ff66' },
        flytrap:   { jaw: '#00ff66', inside: '#00aa44', teeth: '#ccffee', halo: '#00ff66' }
      }
    },
    amber: {
      id: 'amber',
      name: '1982 Terminal Amber',
      stem: '#ffb000',
      stemDark: '#aa7000',
      wilted: '#774400',
      dead: '#442200',
      haloOpacity: 0.32,
      flowers: {
        sunflower: { core: '#cc8800', coreDeep: '#885500', petal: '#ffd044', petalWarm: '#ffb000', halo: '#ff9900' },
        hibiscus:  { outer: '#ffd044', mid: '#ffb000', inner: '#cc8800', stamen: '#fff088', anther: '#ffb000', halo: '#ff9900' },
        iris:      { standard: '#ffd044', fall: '#ffb000', deep: '#cc8800', signal: '#fff088', halo: '#ff9900' },
        thistle:   { calyx: '#aa7000', brush: '#ffd044', brushDark: '#ffb000', halo: '#ff9900' },
        marigold:  { yellow: '#ffd044', orange: '#ffb000', crimson: '#cc8800', halo: '#ff9900' },
        daffodil:  { petal: '#ffd044', cup: '#ffb000', inner: '#aa7000', halo: '#ff9900' },
        rose:      { petal: '#ffd044', dark: '#aa7000', light: '#fff088', sepal: '#885500', halo: '#ff9900' },
        dandelion: { yellow: '#ffd044', seed: '#fff0aa', core: '#aa7000', halo: '#ff9900' },
        tulip:     { petal: '#ffd044', inner: '#cc8800', stamen: '#fff088', halo: '#ff9900' },
        flytrap:   { jaw: '#ffb000', inside: '#cc8800', teeth: '#fff0aa', halo: '#ff9900' }
      }
    },
    cyberpunk: {
      id: 'cyberpunk',
      name: 'Cyberpunk Neon',
      stem: '#00f5d4',
      stemDark: '#009e86',
      wilted: '#7b2cbf',
      dead: '#3c096c',
      haloOpacity: 0.38,
      flowers: {
        sunflower: { core: '#7b2cbf', coreDeep: '#3c096c', petal: '#fee440', petalWarm: '#00f5d4', halo: '#00f5d4' },
        hibiscus:  { outer: '#f72585', mid: '#b5179e', inner: '#7209b7', stamen: '#fee440', anther: '#00f5d4', halo: '#f72585' },
        iris:      { standard: '#f72585', fall: '#7209b7', deep: '#3f37c9', signal: '#00f5d4', halo: '#f72585' },
        thistle:   { calyx: '#00f5d4', brush: '#f72585', brushDark: '#7209b7', halo: '#f72585' },
        marigold:  { yellow: '#fee440', orange: '#f72585', crimson: '#7209b7', halo: '#f72585' },
        daffodil:  { petal: '#00f5d4', cup: '#f72585', inner: '#7209b7', halo: '#00f5d4' },
        rose:      { petal: '#f72585', dark: '#7209b7', light: '#ff70a6', sepal: '#00f5d4', halo: '#f72585' },
        dandelion: { yellow: '#fee440', seed: '#00f5d4', core: '#7209b7', halo: '#fee440' },
        tulip:     { petal: '#f72585', inner: '#7209b7', stamen: '#00f5d4', halo: '#f72585' },
        flytrap:   { jaw: '#00f5d4', inside: '#f72585', teeth: '#fee440', halo: '#f72585' }
      }
    },
    monochrome: {
      id: 'monochrome',
      name: 'Pure Monochrome White',
      stem: '#e0e0e0',
      stemDark: '#888888',
      wilted: '#555555',
      dead: '#333333',
      haloOpacity: 0.18,
      flowers: {
        sunflower: { core: '#888888', coreDeep: '#555555', petal: '#ffffff', petalWarm: '#cccccc', halo: '#ffffff' },
        hibiscus:  { outer: '#ffffff', mid: '#cccccc', inner: '#888888', stamen: '#ffffff', anther: '#aaaaaa', halo: '#ffffff' },
        iris:      { standard: '#ffffff', fall: '#cccccc', deep: '#888888', signal: '#ffffff', halo: '#ffffff' },
        thistle:   { calyx: '#888888', brush: '#ffffff', brushDark: '#aaaaaa', halo: '#ffffff' },
        marigold:  { yellow: '#ffffff', orange: '#cccccc', crimson: '#888888', halo: '#ffffff' },
        daffodil:  { petal: '#ffffff', cup: '#cccccc', inner: '#888888', halo: '#ffffff' },
        rose:      { petal: '#ffffff', dark: '#888888', light: '#dddddd', sepal: '#666666', halo: '#ffffff' },
        dandelion: { yellow: '#ffffff', seed: '#ffffff', core: '#888888', halo: '#ffffff' },
        tulip:     { petal: '#ffffff', inner: '#aaaaaa', stamen: '#ffffff', halo: '#ffffff' },
        flytrap:   { jaw: '#cccccc', inside: '#888888', teeth: '#ffffff', halo: '#ffffff' }
      }
    }
  };

  // =========================================================================
  // 3. GENETIC MORPHOLOGY & BIOLOGICAL GROWTH SIMULATOR
  // =========================================================================

  class BotanicalSimulator {
    constructor(config = {}) {
      this.type = config.type || 'sunflower';
      this.seed = config.seed !== undefined ? config.seed : 42;
      this.maxHeight = config.height || 360;
      this.userCurvature = config.curvature !== undefined ? config.curvature : 0.0;
      this.leafDensity = config.leafDensity !== undefined ? config.leafDensity : 1.0;
      this.branchingProp = config.branching !== undefined ? config.branching : 1.0;

      // Extract unique genetic traits from PRNG seed
      const rng = new PRNG(this.seed);
      this.geneticHabit = rng.choice(['erect', 'curved_left', 'curved_right', 's_curve', 'windswept', 'zigzag']);
      this.geneticBendAmp = rng.range(12, 38);
      this.geneticHeightMod = rng.range(0.85, 1.25);
      this.geneticMaxBranches = rng.choice([0, 1, 1, 2, 2, 3]);
      this.geneticBranchAngles = [rng.range(0.45, 0.85), rng.range(0.55, 0.95), rng.range(0.5, 0.9)];
      this.geneticBranchLengths = [rng.range(0.35, 0.55), rng.range(0.3, 0.5), rng.range(0.25, 0.45)];
      this.geneticHeadTilt = rng.range(-0.35, 0.35); // natural nodding / tilting
      this.geneticFlowerScaleMod = rng.range(0.85, 1.3);
      this.geneticPetalChaos = rng.range(0.7, 1.35);
      this.geneticLeafClusters = rng.choice([2, 3, 3, 4, 5]);
    }

    simulate(age = 1.0, bloomOverride = null, time = 0, windStrength = 0.5, pointerDist = null) {
      age = clamp(age, 0.02, 1.0);
      const effectiveMaxHeight = this.maxHeight * this.geneticHeightMod;
      const growthFactor = (1 - Math.exp(-4 * age)) / (1 - Math.exp(-4));
      const shootHeight = Math.max(20, effectiveMaxHeight * growthFactor);

      // 1. Stem spine spline
      const stemSegments = Math.max(6, Math.floor(shootHeight / 8));
      const stemNodes = [];
      const dirMult = this.geneticHabit.includes('left') ? -1 : 1;

      for (let i = 0; i <= stemSegments; i++) {
        const t = i / stemSegments;
        let dx = 0;

        if (this.geneticHabit === 'erect') {
          dx = Math.sin(t * Math.PI) * 8 * dirMult;
        } else if (this.geneticHabit.includes('curved')) {
          dx = Math.sin(t * Math.PI * 0.85) * this.geneticBendAmp * dirMult;
        } else if (this.geneticHabit === 's_curve') {
          dx = Math.sin(t * Math.PI * 1.8) * (this.geneticBendAmp * 0.65);
        } else if (this.geneticHabit === 'windswept') {
          dx = Math.pow(t, 1.5) * (this.geneticBendAmp * 1.4) * dirMult;
        } else if (this.geneticHabit === 'zigzag') {
          dx = Math.sin(t * Math.PI * 3.2) * 10;
        }

        // Add user slider curvature override
        dx += Math.sin(t * Math.PI * 0.9) * (this.userCurvature * 45);

        // Harmonic wind oscillation
        const windWave = Math.sin(time * 2.2 + t * 2.5) * (windStrength * 16 * Math.pow(t, 1.4));

        // Pointer influence (heliotropic pull towards mouse or flinch)
        let pointerDeflection = 0;
        if (pointerDist) {
          const distSq = pointerDist.dx * pointerDist.dx + pointerDist.dy * pointerDist.dy;
          const infl = Math.exp(-distSq / (2 * 250 * 250)) * (pointerDist.strength || 1.0);
          if (pointerDist.mode === 'flinch') {
            pointerDeflection = -Math.sign(pointerDist.dx) * infl * 40 * t;
          } else {
            pointerDeflection = Math.sign(pointerDist.dx) * Math.min(50, Math.abs(pointerDist.dx) * 0.2) * infl * t;
          }
        }

        const x = dx + windWave + pointerDeflection;
        const y = t * shootHeight;
        stemNodes.push({ x, y, t });
      }

      // 2. Leaves & Internodes
      const leaves = [];
      if (age > 0.18) {
        const numClusters = Math.min(6, Math.floor(this.geneticLeafClusters * this.leafDensity));
        for (let c = 1; c <= numClusters; c++) {
          const targetY = (c / (numClusters + 1)) * shootHeight;
          if (targetY < shootHeight - 25) {
            leaves.push({ y: targetY, side: -1, isWilted: false });
            leaves.push({ y: targetY + 4, side: 1, isWilted: false });
          }
        }
      }

      // 3. Basal Senescence (oldest leaves wilt)
      if (age > 0.68) {
        for (let l of leaves) {
          if (l.y < effectiveMaxHeight * 0.28) {
            l.isWilted = true;
          }
        }
      }

      // 4. Auxin & Axillary Branching
      const activeLeaves = leaves.filter(l => !l.isWilted);
      const branches = [];
      const branchMax = Math.min(this.geneticMaxBranches, Math.floor(this.branchingProp * 3));
      
      if (activeLeaves.length >= 3 && age > 0.58 && branchMax > 0) {
        const actualBranches = Math.min(branchMax, Math.floor(activeLeaves.length / 2));
        for (let bi = 0; bi < actualBranches; bi++) {
          const originLeaf = activeLeaves[Math.min(activeLeaves.length - 1, bi * 2 + 1)];
          const bProgress = (age - 0.58) / 0.42;
          const bLen = shootHeight * this.geneticBranchLengths[bi] * bProgress;
          branches.push({
            startY: originLeaf.y,
            side: originLeaf.side,
            length: bLen,
            angle: this.geneticBranchAngles[bi],
            hasFlower: (bProgress > 0.8)
          });
        }
      }

      // 5. Flower Scaling
      const leafEnergy = activeLeaves.length;
      let flowerScale = (0.65 + leafEnergy * 0.08) * this.geneticFlowerScaleMod;
      flowerScale = clamp(flowerScale, 0.5, 1.45);

      let bloom = 0.0;
      if (bloomOverride !== null) {
        bloom = clamp(bloomOverride, 0.0, 1.0);
      } else if (age > 0.48) {
        bloom = clamp((age - 0.48) / 0.52, 0.0, 1.0);
      }

      return {
        type: this.type,
        age,
        bloom,
        isBud: (age > 0.40),
        shootHeight,
        stemNodes,
        leaves,
        branches,
        flowerScale,
        headTilt: this.geneticHeadTilt,
        petalChaos: this.geneticPetalChaos,
        activeLeafCount: activeLeaves.length
      };
    }
  }

  // =========================================================================
  // 4. SPECIES-SPECIFIC BOTANICAL ARCHITECTURE (STEMS & FOLIAGE GUIDELINES)
  // =========================================================================

  class BotanicalArchitect {
    static generatePlantGlyphs(pData, originX, groundY, palette, seed = 42, time = 0) {
      const glyphs = [];
      const rng = new PRNG(seed);
      const pType = pData.type;
      const nodes = pData.stemNodes;
      const shootH = pData.shootHeight;
      const leaves = pData.leaves;
      const branches = pData.branches;
      const fScale = pData.flowerScale;
      const bloom = pData.bloom;
      const age = pData.age;

      const cStem = palette.stem;
      const cStemDark = palette.stemDark;
      const cWilted = palette.wilted;
      const cDead = palette.dead;

      // -------------------------------------------------------------
      // 1. SPECIES-SPECIFIC STEM DRAWING
      // -------------------------------------------------------------
      if (pType === 'sunflower') {
        // SUNFLOWER: Heavy, fibrous, triple/double column stalk
        for (let i = 0; i < nodes.length; i++) {
          const n = nodes[i];
          const px = originX + n.x;
          const py = groundY - n.y;
          const ch = (i % 5 === 0) ? "%" : ((i % 7 === 0) ? "#" : "|");
          if (n.y < shootH * 0.55) {
            glyphs.push({ x: px - 4, y: py, char: "|", fg: cStem, size: 14, glowCol: cStem, glowRad: 8 });
            glyphs.push({ x: px, y: py, char: ch, fg: cStem, size: 14, glowCol: cStem, glowRad: 8 });
            glyphs.push({ x: px + 4, y: py, char: "|", fg: cStem, size: 14, glowCol: cStem, glowRad: 8 });
          } else {
            glyphs.push({ x: px - 2, y: py, char: "|", fg: cStem, size: 14, glowCol: cStem, glowRad: 8 });
            glyphs.push({ x: px + 2, y: py, char: ch, fg: cStem, size: 14, glowCol: cStem, glowRad: 8 });
          }
        }
      } else if (pType === 'iris') {
        // IRIS: Slender, smooth, angular scape with triangular node sheaths
        for (let i = 0; i < nodes.length; i++) {
          const n = nodes[i];
          const px = originX + n.x;
          const py = groundY - n.y;
          const ch = (i > 8 && nodes[i].x > nodes[i-4].x) ? "/" : ((i > 8 && nodes[i].x < nodes[i-4].x) ? "\\" : "|");
          glyphs.push({ x: px, y: py, char: ch, fg: cStem, size: 14, glowCol: cStem, glowRad: 7 });
          if (i % 12 === 0 && i > 5 && i < nodes.length - 8) {
            glyphs.push({ x: px - 4, y: py - 4, char: "(", fg: cStemDark, size: 13, glowCol: cStemDark, glowRad: 6 });
            glyphs.push({ x: px + 4, y: py - 4, char: ")", fg: cStemDark, size: 13, glowCol: cStemDark, glowRad: 6 });
          }
        }
      } else if (pType === 'thistle') {
        // THISTLE: Spiny winged stem with prickles and spines
        for (let i = 0; i < nodes.length; i++) {
          const n = nodes[i];
          const px = originX + n.x;
          const py = groundY - n.y;
          glyphs.push({ x: px, y: py, char: "|", fg: cStem, size: 14, glowCol: cStem, glowRad: 8 });
          if (i % 3 === 0) {
            glyphs.push({ x: px - 5, y: py, char: "!", fg: cStem, size: 12, glowCol: cStem, glowRad: 6 });
            glyphs.push({ x: px + 5, y: py, char: "!", fg: cStem, size: 12, glowCol: cStem, glowRad: 6 });
          }
          if (i % 6 === 0) {
            glyphs.push({ x: px - 7, y: py, char: "*", fg: cStemDark, size: 10, glowCol: cStemDark, glowRad: 6 });
            glyphs.push({ x: px + 7, y: py, char: "*", fg: cStemDark, size: 10, glowCol: cStemDark, glowRad: 6 });
          }
        }
      } else if (pType === 'dandelion') {
        // DANDELION: Leafless hollow tubular scape
        for (let i = 0; i < nodes.length; i++) {
          const n = nodes[i];
          const px = originX + n.x;
          const py = groundY - n.y;
          glyphs.push({ x: px, y: py, char: "|", fg: cStem, size: 14, glowCol: cStem, glowRad: 7 });
        }
      } else if (pType === 'rose') {
        // ROSE: Woody cane with sharp hooked thorns
        for (let i = 0; i < nodes.length; i++) {
          const n = nodes[i];
          const px = originX + n.x;
          const py = groundY - n.y;
          glyphs.push({ x: px, y: py, char: "|", fg: cStem, size: 14, glowCol: cStem, glowRad: 8 });
          if (i % 7 === 0 && i > 3) {
            const thornSide = (i % 14 === 0) ? -1 : 1;
            glyphs.push({ x: px + thornSide * 6, y: py, char: thornSide < 0 ? "<" : ">", fg: '#d23737', size: 13, glowCol: '#d23737', glowRad: 6 });
          }
        }
      } else if (pType === 'tulip') {
        // TULIP: Smooth fleshy glaucous stem
        for (let i = 0; i < nodes.length; i++) {
          const n = nodes[i];
          const px = originX + n.x;
          const py = groundY - n.y;
          glyphs.push({ x: px - 2, y: py, char: "|", fg: cStem, size: 14, glowCol: cStem, glowRad: 7 });
          glyphs.push({ x: px + 2, y: py, char: "|", fg: cStem, size: 14, glowCol: cStem, glowRad: 7 });
        }
      } else if (pType === 'marigold') {
        // MARIGOLD: Slender ridged square stem
        for (let i = 0; i < nodes.length; i++) {
          const n = nodes[i];
          const px = originX + n.x;
          const py = groundY - n.y;
          glyphs.push({ x: px, y: py, char: (i % 4 === 0 ? ":" : "|"), fg: cStem, size: 13, glowCol: cStem, glowRad: 7 });
        }
      } else if (pType === 'daffodil') {
        // DAFFODIL: Slender scape with neck spathe
        for (let i = 0; i < nodes.length; i++) {
          const n = nodes[i];
          const px = originX + n.x;
          const py = groundY - n.y;
          glyphs.push({ x: px, y: py, char: "|", fg: cStem, size: 14, glowCol: cStem, glowRad: 7 });
        }
        const apexX = originX + nodes[nodes.length - 1].x;
        const apexY = groundY - nodes[nodes.length - 1].y;
        glyphs.push({ x: apexX - 4, y: apexY + 4, char: "(", fg: '#b49650', size: 13, glowCol: '#b49650', glowRad: 6 });
        glyphs.push({ x: apexX + 4, y: apexY + 4, char: ")", fg: '#b49650', size: 13, glowCol: '#b49650', glowRad: 6 });
      } else {
        // HIBISCUS & DEFAULTS
        for (let i = 0; i < nodes.length; i++) {
          const n = nodes[i];
          const px = originX + n.x;
          const py = groundY - n.y;
          const ch = (i % 6 === 0) ? "%" : ((i % 7 === 0) ? "+" : "|");
          if (n.y < shootH * 0.4) {
            glyphs.push({ x: px - 3, y: py, char: "|", fg: cStem, size: 14, glowCol: cStem, glowRad: 8 });
            glyphs.push({ x: px + 3, y: py, char: ch, fg: cStem, size: 14, glowCol: cStem, glowRad: 8 });
          } else {
            glyphs.push({ x: px, y: py, char: ch, fg: cStem, size: 14, glowCol: cStem, glowRad: 8 });
          }
        }
      }

      // -------------------------------------------------------------
      // 2. SPECIES-SPECIFIC LEAF & FOLIAGE DRAWING
      // -------------------------------------------------------------
      if (pType === 'iris') {
        // IRIS: Tall sword-like ensiform blade leaves rising from soil!
        const bladeHeights = [shootH * 0.55, shootH * 0.72, shootH * 0.85, shootH * 0.62];
        const bladeOffsets = [-22, -10, 12, 24];
        bladeHeights.forEach((bh, bIdx) => {
          const bx = bladeOffsets[bIdx];
          const steps = Math.floor(bh / 10);
          for (let bi = 0; bi <= steps; bi++) {
            const bt = bi / steps;
            const by = groundY - (bi * 10);
            const curv = Math.sin(bt * Math.PI * 0.5) * (bx * 0.4);
            const px = originX + bx + curv;
            const ch = bx > 0 ? "/" : "\\";
            glyphs.push({ x: px, y: by, char: ch, fg: bt < 0.7 ? cStem : cStemDark, size: 13, glowCol: cStem, glowRad: 7 });
          }
          glyphs.push({ x: originX + bx * 1.4, y: groundY - bh, char: "^", fg: cStem, size: 12, glowCol: cStem, glowRad: 8 });
        });
      } else if (pType === 'dandelion') {
        // DANDELION: Basal rosette of lion's-tooth leaves hugging the soil
        const angles = [-1.2, -0.7, -0.3, 0.3, 0.7, 1.2];
        angles.forEach(ang => {
          const leafLen = (50 + Math.sin(ang * 4) * 20) * age;
          for (let dist = 10; dist <= leafLen; dist += 8) {
            const lx = originX + Math.sin(ang) * dist;
            const ly = groundY - Math.cos(ang) * (dist * 0.35);
            glyphs.push({ x: lx, y: ly, char: ang < 0 ? ">" : "<", fg: cStem, size: 13, glowCol: cStem, glowRad: 7 });
            glyphs.push({ x: lx, y: ly - 3, char: "#", fg: cStemDark, size: 11, glowCol: cStemDark, glowRad: 6 });
          }
        });
      } else if (pType === 'marigold') {
        // MARIGOLD: Pinnately compound feathery leaflets
        leaves.forEach(leaf => {
          const t = leaf.y / Math.max(1, shootH);
          const nIdx = Math.min(nodes.length - 1, Math.floor(t * (nodes.length - 1)));
          const lx = originX + nodes[nIdx].x;
          const lyScreen = groundY - leaf.y;
          const rachisLen = 32;
          for (let r = 8; r <= rachisLen; r += 8) {
            const rx = lx + leaf.side * r;
            const ry = lyScreen - (r * 0.25);
            glyphs.push({ x: rx, y: ry, char: "-", fg: cStem, size: 12, glowCol: cStem, glowRad: 6 });
            glyphs.push({ x: rx, y: ry - 6, char: "/", fg: cStem, size: 11, glowCol: cStem, glowRad: 6 });
            glyphs.push({ x: rx, y: ry + 6, char: "\\", fg: cStem, size: 11, glowCol: cStem, glowRad: 6 });
          }
        });
      } else if (pType === 'tulip') {
        // TULIP: Broad clasping sheath leaves cradling lower stem
        [-1, 1].forEach(side => {
          const tLeafH = shootH * 0.55;
          for (let step = 0; step <= tLeafH; step += 9) {
            const lt = step / tLeafH;
            const ly = groundY - step;
            const arch = Math.sin(lt * Math.PI) * 28 * side;
            const lx = originX + arch;
            glyphs.push({ x: lx, y: ly, char: side < 0 ? "(" : ")", fg: cStem, size: 15, glowCol: cStem, glowRad: 8 });
            glyphs.push({ x: lx + side * 3, y: ly, char: "|", fg: cStemDark, size: 13, glowCol: cStemDark, glowRad: 7 });
          }
        });
      } else if (pType === 'thistle') {
        // THISTLE: Deeply lobed spiny leaves with needle tips
        leaves.forEach(leaf => {
          const t = leaf.y / Math.max(1, shootH);
          const nIdx = Math.min(nodes.length - 1, Math.floor(t * (nodes.length - 1)));
          const lx = originX + nodes[nIdx].x;
          const lyScreen = groundY - leaf.y;
          const spinyPts = [
            { ox: leaf.side * 8, oy: -6, ch: "/" }, { ox: leaf.side * 16, oy: -10, ch: "*" }, { ox: leaf.side * 22, oy: -6, ch: "\\" },
            { ox: leaf.side * 12, oy: 0, ch: "#" }, { ox: leaf.side * 20, oy: 0, ch: "%" }, { ox: leaf.side * 28, oy: 0, ch: "!" },
            { ox: leaf.side * 8, oy: 6, ch: "\\" }, { ox: leaf.side * 16, oy: 10, ch: "*" }, { ox: leaf.side * 24, oy: 6, ch: "/" }
          ];
          spinyPts.forEach(pt => {
            glyphs.push({ x: lx + pt.ox, y: lyScreen + pt.oy, char: pt.ch, fg: cStem, size: 13, glowCol: cStem, glowRad: 7 });
          });
        });
      } else if (pType === 'daffodil') {
        // DAFFODIL: Flat linear ribbon-like leaves
        [-1, 1].forEach(side => {
          const leafH = shootH * 0.75;
          for (let step = 0; step <= leafH; step += 10) {
            glyphs.push({ x: originX + side * 16, y: groundY - step, char: "|", fg: cStem, size: 14, glowCol: cStem, glowRad: 7 });
          }
          glyphs.push({ x: originX + side * 16, y: groundY - leafH, char: "n", fg: cStem, size: 13, glowCol: cStem, glowRad: 7 });
        });
      } else {
        // SUNFLOWER / HIBISCUS: Cordate / ovate leaves with midrib & serration
        leaves.forEach(leaf => {
          const t = leaf.y / Math.max(1, shootH);
          const nIdx = Math.min(nodes.length - 1, Math.floor(t * (nodes.length - 1)));
          const lx = originX + nodes[nIdx].x;
          const lyScreen = groundY - leaf.y;

          if (leaf.isWilted) {
            const wiltPts = [
              { ox: leaf.side * 8, oy: 4, ch: "\\" },
              { ox: leaf.side * 14, oy: 10, ch: "~" },
              { ox: leaf.side * 19, oy: 16, ch: "v" },
              { ox: leaf.side * 23, oy: 22, ch: "." }
            ];
            wiltPts.forEach(pt => {
              glyphs.push({ x: lx + pt.ox, y: lyScreen + pt.oy, char: pt.ch, fg: cDead, size: 13, glowCol: cWilted, glowRad: 6 });
            });
          } else {
            const leafPts = [
              { ox: leaf.side * 8, oy: -10, ch: "+" }, { ox: leaf.side * 14, oy: -10, ch: "+" }, { ox: leaf.side * 20, oy: -10, ch: "+" }, { ox: leaf.side * 26, oy: -10, ch: "-" },
              { ox: leaf.side * 6, oy: -2, ch: "|" }, { ox: leaf.side * 12, oy: -2, ch: "*" }, { ox: leaf.side * 18, oy: -2, ch: "%" }, { ox: leaf.side * 24, oy: -2, ch: "#" }, { ox: leaf.side * 30, oy: -2, ch: "#" },
              { ox: leaf.side * 8, oy: 6, ch: "|" }, { ox: leaf.side * 14, oy: 6, ch: "#" }, { ox: leaf.side * 20, oy: 6, ch: "%" }, { ox: leaf.side * 26, oy: 6, ch: "&" }, { ox: leaf.side * 32, oy: 6, ch: "%" },
              { ox: leaf.side * 10, oy: 14, ch: "+" }, { ox: leaf.side * 16, oy: 14, ch: "+" }, { ox: leaf.side * 22, oy: 14, ch: "+" }, { ox: leaf.side * 28, oy: 14, ch: "/" }
            ];
            leafPts.forEach(pt => {
              glyphs.push({ x: lx + pt.ox, y: lyScreen + pt.oy, char: pt.ch, fg: cStem, size: 13, glowCol: cStem, glowRad: 8 });
            });
          }
        });
      }

      // -------------------------------------------------------------
      // 3. SECONDARY BRANCHES & LATERAL BLOSSOMS
      // -------------------------------------------------------------
      branches.forEach(b => {
        const t = b.startY / Math.max(1, shootH);
        const nIdx = Math.min(nodes.length - 1, Math.floor(t * (nodes.length - 1)));
        const bx0 = originX + nodes[nIdx].x;
        const by0 = groundY - b.startY;
        for (let bi = 0; bi <= b.length; bi += 8) {
          const curvX = bx0 + b.side * (bi * Math.sin(b.angle) + Math.sin(bi * 0.12) * 5);
          const curvY = by0 - (bi * Math.cos(b.angle));
          glyphs.push({ x: curvX, y: curvY, char: b.side > 0 ? "/" : "\\", fg: cStem, size: 13, glowCol: cStem, glowRad: 8 });
        }
        if (b.hasFlower && bloom > 0.2) {
          const fEndX = bx0 + b.side * (b.length * Math.sin(b.angle));
          const fEndY = by0 - (b.length * Math.cos(b.angle));
          const secFlower = ProceduralFlowerRenderer.generateGlyphs(
            pType, fEndX, fEndY, fScale * 0.65, bloom * 0.8, palette, time
          );
          glyphs.push(...secFlower);
        }
      });

      // -------------------------------------------------------------
      // 4. APICAL BUD OR FULL BLOSSOM
      // -------------------------------------------------------------
      const apexX = originX + nodes[nodes.length - 1].x;
      const apexY = groundY - nodes[nodes.length - 1].y;
      const tilt = pData.headTilt || 0.0;
      const tiltX = apexX + Math.sin(tilt) * 18;
      const tiltY = apexY - Math.cos(tilt) * 14;

      if (pData.isBud) {
        if (bloom < 0.15) {
          glyphs.push({ x: tiltX, y: tiltY - 6, char: "(#)", fg: cStem, size: 16, glowCol: cStem, glowRad: 10 });
          glyphs.push({ x: tiltX, y: tiltY - 14, char: "*", fg: palette.flowers[pType]?.petal || '#ffe628', size: 14, glowCol: cStem, glowRad: 12 });
        } else {
          const flowerGlyphs = ProceduralFlowerRenderer.generateGlyphs(
            pType, tiltX, tiltY, fScale, bloom, palette, time
          );
          glyphs.push(...flowerGlyphs);
        }
      }

      return glyphs;
    }
  }

  // =========================================================================
  // 5. PROCEDURAL FLOWER HEAD GEOMETRY ENGINE (PURE POLAR MATH)
  // =========================================================================

  class ProceduralFlowerRenderer {
    static generateGlyphs(type, cx, cy, scale, bloom, palette, time = 0) {
      const glyphs = [];
      const fPalette = palette.flowers[type] || palette.flowers.sunflower;
      const haloCol = fPalette.halo || '#ffaa00';

      switch (type) {
        case 'sunflower':
          this._buildSunflower(glyphs, cx, cy, scale, bloom, fPalette, haloCol, time);
          break;
        case 'hibiscus':
          this._buildHibiscus(glyphs, cx, cy, scale, bloom, fPalette, haloCol, time);
          break;
        case 'iris':
          this._buildIris(glyphs, cx, cy, scale, bloom, fPalette, haloCol, time);
          break;
        case 'thistle':
          this._buildThistle(glyphs, cx, cy, scale, bloom, fPalette, haloCol, time);
          break;
        case 'marigold':
          this._buildMarigold(glyphs, cx, cy, scale, bloom, fPalette, haloCol, time);
          break;
        case 'daffodil':
          this._buildDaffodil(glyphs, cx, cy, scale, bloom, fPalette, haloCol, time);
          break;
        case 'rose':
          this._buildRose(glyphs, cx, cy, scale, bloom, fPalette, haloCol, time);
          break;
        case 'dandelion':
          this._buildDandelion(glyphs, cx, cy, scale, bloom, fPalette, haloCol, time);
          break;
        case 'tulip':
          this._buildTulip(glyphs, cx, cy, scale, bloom, fPalette, haloCol, time);
          break;
        case 'flytrap':
          this._buildFlytrap(glyphs, cx, cy, scale, bloom, fPalette, haloCol, time);
          break;
        default:
          this._buildSunflower(glyphs, cx, cy, scale, bloom, fPalette, haloCol, time);
      }

      return glyphs;
    }

    static _buildSunflower(out, cx, cy, s, b, pal, halo, time) {
      const fcy = cy - 25 * s;
      const discLines = [
        "######&&&88|",
        "#*#*#*#*#*#*#*#*#*#&&88#|",
        "###################&&88#",
        "#*#*#*#*#*#*#*#*#*#&&88#",
        "######&&&88|"
      ];
      const spX = 9.5 * s;
      const spY = 13.0 * s;
      const startY = fcy - (discLines.length * spY) / 2.0;
      
      discLines.forEach((line, rIdx) => {
        const ly = startY + rIdx * spY;
        const startX = cx - (line.length * spX) / 2.0;
        for (let cIdx = 0; cIdx < line.length; cIdx++) {
          const ch = line[cIdx];
          const col = (ch === '#' || ch === '&') ? pal.coreDeep : pal.core;
          out.push({ x: startX + cIdx * spX, y: ly, char: ch, fg: col, size: 14 * s, glowCol: halo, glowRad: 18 * s });
        }
      });

      const numPetals = 32;
      const maxLen = 65 * s * b;
      const glyphsChoice = ["(", ")", "{", "}", "~", "S", "s", "8", "*", "%", "&"];
      for (let i = 0; i < numPetals; i++) {
        const angle = (i / numPetals) * 2 * Math.PI;
        for (let seg = 1; seg <= 5; seg++) {
          const rDist = 26 * s + (seg / 5.0) * maxLen;
          const curl = Math.sin(seg * 0.85 + i) * 8 * s;
          const px = cx + Math.cos(angle) * rDist - Math.sin(angle) * curl;
          const py = fcy + Math.sin(angle) * rDist + Math.cos(angle) * curl;
          const ch = glyphsChoice[(i * 3 + seg) % glyphsChoice.length];
          const col = seg >= 4 ? pal.petal : pal.petalWarm;
          out.push({ x: px, y: py, char: ch, fg: col, size: (11 + seg * 2) * s, glowCol: halo, glowRad: 22 * s });
        }
      }
    }

    static _buildHibiscus(out, cx, cy, s, b, pal, halo, time) {
      const fcy = cy - 25 * s;
      const rows = [
        ["           /!/          ", pal.outer],
        ["     /**%/ 1@@@@@@1****- ", pal.outer],
        [" ****%) )/ @@@@@@@#@& !&#", pal.mid],
        ["@@@/ /%*======@@@/#&/ /**%", pal.mid],
        ["@@@// /#**%) #######/#//**", pal.inner],
        [" |##/@///#%#@@@@@@@@@@/|@@@/**#", pal.inner],
        [" #@ /(@############/==*###", pal.mid],
        [" % |##@@@@@@#@@@/@@######*", pal.mid],
        [" *@@@&%@--@@### / | */ ", pal.outer],
        ["   **@@@%# / *%&-#*%%   ", pal.outer],
        ["          | |@@@#*      ", pal.mid]
      ];
      const spX = 9.0 * s * b;
      const spY = 12.5 * s * b;
      const startY = fcy - (rows.length * spY) / 2.0;

      rows.forEach((row, rIdx) => {
        const text = row[0];
        const col = row[1];
        const ly = startY + rIdx * spY;
        const startX = cx - (text.length * spX) / 2.0;
        for (let cIdx = 0; cIdx < text.length; cIdx++) {
          const ch = text[cIdx];
          if (ch !== ' ') {
            out.push({ x: startX + cIdx * spX, y: ly, char: ch, fg: col, size: 13.5 * s, glowCol: halo, glowRad: 18 * s });
          }
        }
      });

      const stamenPts = [
        { dx: -6 * s, dy: 5 * s, ch: '%' },
        { dx: -18 * s, dy: -4 * s, ch: '/' },
        { dx: -30 * s, dy: -16 * s, ch: '(' },
        { dx: -42 * s, dy: -28 * s, ch: '~' },
        { dx: -52 * s, dy: -38 * s, ch: 'o' },
        { dx: -58 * s, dy: -44 * s, ch: '*' }
      ];
      stamenPts.forEach(pt => {
        out.push({ x: cx + pt.dx, y: fcy + pt.dy, char: pt.ch, fg: pal.stamen, size: 15 * s, glowCol: pal.stamen, glowRad: 20 * s });
      });
    }

    static _buildIris(out, cx, cy, s, b, pal, halo, time) {
      const fcy = cy - 20 * s;
      const standardsLeft = [
        { dx: -16*s, dy: -20*s, txt: "((" },
        { dx: -20*s, dy: -36*s, txt: "%%%" },
        { dx: -22*s, dy: -54*s, txt: "@@@" },
        { dx: -18*s, dy: -72*s, txt: "((((" },
        { dx: -10*s, dy: -84*s, txt: "\\\\" }
      ];
      const standardsRight = [
        { dx: 16*s, dy: -20*s, txt: "))" },
        { dx: 20*s, dy: -36*s, txt: "%%%" },
        { dx: 22*s, dy: -54*s, txt: "@@@" },
        { dx: 18*s, dy: -72*s, txt: "))))" },
        { dx: 10*s, dy: -84*s, txt: "//" }
      ];
      [...standardsLeft, ...standardsRight].forEach(pt => {
        for (let i = 0; i < pt.txt.length; i++) {
          out.push({ x: cx + pt.dx + i * 7.5 * s, y: fcy + pt.dy, char: pt.txt[i], fg: pal.standard, size: 14 * s, glowCol: halo, glowRad: 18 * s });
        }
      });

      const fallsL = "///###@@@@@@@@@@@@@@@@@@@@@@";
      const fallsR = "@@@@@@@@@@@@@@@@@@@@@@###\\\\\\";
      for (let i = 0; i < fallsL.length; i++) {
        const px = cx - 18 * s - (i * 4.5 * s * b);
        const py = fcy - 4 * s + (Math.sin(i * 0.14) * 18 * s * b);
        out.push({ x: px, y: py, char: fallsL[i], fg: (i % 2 === 0 ? pal.fall : pal.standard), size: 13.5 * s, glowCol: halo, glowRad: 18 * s });
      }
      for (let i = 0; i < fallsR.length; i++) {
        const px = cx + 18 * s + (i * 4.5 * s * b);
        const py = fcy - 4 * s + (Math.sin(i * 0.14) * 18 * s * b);
        out.push({ x: px, y: py, char: fallsR[i], fg: (i % 2 === 0 ? pal.fall : pal.standard), size: 13.5 * s, glowCol: halo, glowRad: 18 * s });
      }

      const throat = [
        { dy: -12 * s, txt: "|(@/9|" },
        { dy: -2 * s, txt: "|%&%#|" },
        { dy: 8 * s, txt: "\\b)|" }
      ];
      throat.forEach(tr => {
        for (let i = 0; i < tr.txt.length; i++) {
          const ch = tr.txt[i];
          const col = (ch === '@' || ch === '9' || ch === '&') ? pal.signal : pal.deep;
          out.push({ x: cx + (i - tr.txt.length / 2) * 8 * s, y: fcy + tr.dy, char: ch, fg: col, size: 14 * s, glowCol: pal.signal, glowRad: 18 * s });
        }
      });
    }

    static _buildThistle(out, cx, cy, s, b, pal, halo, time) {
      const fcy = cy - 15 * s;
      const calyxChars = [":", ";", "%", "&", "#", "@", "|"];
      const rCalyx = 26 * s;
      for (let dy = 0; dy <= rCalyx * 1.3; dy += 6) {
        const widthAtY = Math.sin((dy / (rCalyx * 1.3)) * Math.PI) * rCalyx;
        for (let dx = -Math.floor(widthAtY); dx <= Math.floor(widthAtY); dx += 7) {
          const ch = calyxChars[(Math.abs(dx + dy)) % calyxChars.length];
          out.push({ x: cx + dx, y: fcy + dy, char: ch, fg: pal.calyx, size: 12.5 * s, glowCol: pal.calyx, glowRad: 14 * s });
        }
      }
      for (let plume = -4; plume <= 4; plume++) {
        const pAngle = (plume / 5.0) * 0.75 - Math.PI / 2.0;
        for (let step = 1; step <= 7; step++) {
          const dist = step * 11 * s * b;
          const px = cx + Math.cos(pAngle) * dist;
          const py = fcy + Math.sin(pAngle) * dist;
          const ch = step >= 5 ? '!' : (plume > 0 ? '/' : '\\');
          const col = step >= 4 ? pal.brush : pal.brushDark;
          out.push({ x: px, y: py, char: ch, fg: col, size: 14 * s, glowCol: halo, glowRad: 18 * s });
        }
      }
    }

    static _buildMarigold(out, cx, cy, s, b, pal, halo, time) {
      const fcy = cy - 20 * s;
      const bands = [
        ["=======", pal.yellow],
        ["##############", pal.yellow],
        ["##==============##", pal.orange],
        ["|||||||||||||||||||", pal.orange],
        ["#%==============%:9", pal.orange],
        ["@@@@@@@@@@@@@@@@@@@@@", pal.crimson],
        ["@@@@@@@@@@@@@@@@@", pal.crimson]
      ];
      const spY = 12 * s * b;
      const spX = 9 * s * b;
      const startY = fcy - (bands.length * spY) / 2.0;
      bands.forEach((band, rIdx) => {
        const txt = band[0];
        const col = band[1];
        const ry = startY + rIdx * spY;
        const rxStart = cx - (txt.length * spX) / 2.0;
        for (let i = 0; i < txt.length; i++) {
          out.push({ x: rxStart + i * spX, y: ry, char: txt[i], fg: col, size: 14 * s, glowCol: halo, glowRad: 18 * s });
        }
      });
    }

    static _buildDaffodil(out, cx, cy, s, b, pal, halo, time) {
      const fcy = cy - 20 * s;
      const gridChars = ["#", "*", "%", "#", "*"];
      for (let dy = -2; dy <= 2; dy++) {
        for (let dx = -2; dx <= 2; dx++) {
          const ch = gridChars[(Math.abs(dx + dy)) % gridChars.length];
          const col = (dx === 0 && dy === 0) ? pal.inner : pal.cup;
          out.push({ x: cx + dx * 9 * s, y: fcy + dy * 9 * s, char: ch, fg: col, size: 13.5 * s, glowCol: halo, glowRad: 16 * s });
        }
      }
      for (let i = 0; i < 6; i++) {
        const ang = (i / 6.0) * 2 * Math.PI;
        for (let step = 1; step <= 5; step++) {
          const dist = 18 * s + step * 10 * s * b;
          const px = cx + Math.cos(ang) * dist;
          const py = fcy + Math.sin(ang) * dist;
          const ch = step === 5 ? '*' : (step >= 3 ? '^' : '+');
          out.push({ x: px, y: py, char: ch, fg: pal.petal, size: 14 * s, glowCol: halo, glowRad: 18 * s });
        }
      }
    }

    static _buildRose(out, cx, cy, s, b, pal, halo, time) {
      const fcy = cy - 22 * s;
      const numWhorls = 24;
      const rMax = 38 * s * b;
      for (let i = 0; i < numWhorls; i++) {
        const theta = i * 0.7;
        const r = (i / numWhorls) * rMax;
        const px = cx + Math.cos(theta) * r;
        const py = fcy + Math.sin(theta) * r * 0.75;
        const ch = (i < 6) ? '@' : ((i < 14) ? '%' : '{');
        const col = (i < 8) ? pal.dark : ((i < 18) ? pal.petal : pal.light);
        out.push({ x: px, y: py, char: ch, fg: col, size: (12 + (i / 3)) * s, glowCol: halo, glowRad: 18 * s });
      }
    }

    static _buildDandelion(out, cx, cy, s, b, pal, halo, time) {
      const fcy = cy - 20 * s;
      const numSeeds = 36;
      const rClock = 42 * s * b;
      out.push({ x: cx, y: fcy, char: '(#)', fg: pal.core, size: 15 * s, glowCol: halo, glowRad: 16 * s });
      for (let i = 0; i < numSeeds; i++) {
        const ang = (i / numSeeds) * 2 * Math.PI;
        const r = rClock * (0.8 + 0.2 * Math.sin(i * 3));
        const px = cx + Math.cos(ang) * r;
        const py = fcy + Math.sin(ang) * r;
        const ch = (i % 3 === 0) ? '*' : ((i % 3 === 1) ? '·' : "'");
        out.push({ x: px, y: py, char: ch, fg: pal.seed, size: 13 * s, glowCol: halo, glowRad: 16 * s });
      }
    }

    static _buildTulip(out, cx, cy, s, b, pal, halo, time) {
      const fcy = cy - 22 * s;
      const cupRows = [
        [" \\ | / ", pal.stamen],
        ["(|   |)", pal.petal],
        [" |   | ", pal.petal],
        [" \\___/ ", pal.inner]
      ];
      cupRows.forEach((row, ri) => {
        const txt = row[0];
        const col = row[1];
        const ry = fcy - 15 * s + ri * 11 * s * b;
        const rx = cx - (txt.length * 8 * s) / 2;
        for (let ci = 0; ci < txt.length; ci++) {
          if (txt[ci] !== ' ') {
            out.push({ x: rx + ci * 8 * s, y: ry, char: txt[ci], fg: col, size: 15 * s, glowCol: halo, glowRad: 18 * s });
          }
        }
      });
    }

    static _buildFlytrap(out, cx, cy, s, b, pal, halo, time) {
      const fcy = cy - 18 * s;
      const isOpen = b > 0.3;
      const jawText = isOpen ? ["\\w/\\w/", "|  X  |", " \\___/ "] : ["|X|X|X|", " ||||| "];
      jawText.forEach((line, li) => {
        const ry = fcy - 10 * s + li * 12 * s;
        const rx = cx - (line.length * 9 * s) / 2;
        for (let ci = 0; ci < line.length; ci++) {
          const ch = line[ci];
          const col = (ch === 'w' || ch === '\\' || ch === '/') ? pal.teeth : pal.jaw;
          out.push({ x: rx + ci * 9 * s, y: ry, char: ch, fg: col, size: 14 * s, glowCol: halo, glowRad: 18 * s });
        }
      });
    }
  }

  // =========================================================================
  // 6. THE ASCIIPLANT CLASS (INSTANCE)
  // =========================================================================

  class AsciiPlant {
    constructor(options = {}) {
      this.type = options.type || 'sunflower';
      this.age = options.age !== undefined ? options.age : 1.0;
      this.bloom = options.bloom !== undefined ? options.bloom : null;
      this.height = options.height || 360;
      this.curvature = options.curvature !== undefined ? options.curvature : 0.0;
      this.leafDensity = options.leafDensity !== undefined ? options.leafDensity : 1.0;
      this.branching = options.branching !== undefined ? options.branching : 1.0;
      this.seed = options.seed !== undefined ? options.seed : 42;
      this.paletteName = options.palette || 'botanical';
      this.interactive = options.interactive !== false;
      this.pointerMode = options.pointerMode || 'reach';
      
      this.simulator = new BotanicalSimulator({
        type: this.type,
        seed: this.seed,
        height: this.height,
        curvature: this.curvature,
        leafDensity: this.leafDensity,
        branching: this.branching
      });

      this.pointer = { x: 0, y: 0, active: false };
      this.growthVelocity = 0.0;
      this.growthBoost = 0.0;
      this.vitality = 1.0;
    }

    /**
     * Nourish plant with sunlight / plant food to temporarily accelerate growth!
     */
    feed(amount = 0.15) {
      this.growthBoost = Math.min(0.6, this.growthBoost + amount);
      this.vitality = Math.min(1.4, this.vitality + 0.2);
    }

    setAge(val) {
      this.age = clamp(val, 0.0, 1.0);
    }

    setBloom(val) {
      this.bloom = val !== null ? clamp(val, 0.0, 1.0) : null;
    }

    setPalette(name) {
      if (PALETTES[name]) this.paletteName = name;
    }

    getPalette() {
      return PALETTES[this.paletteName] || PALETTES.botanical;
    }

    generateGlyphs(originX, groundY, time = 0, windStrength = 0.5) {
      let pointerDist = null;
      if (this.pointer.active && this.pointerMode !== 'none') {
        pointerDist = {
          dx: this.pointer.x - originX,
          dy: this.pointer.y - (groundY - this.height * 0.7),
          mode: this.pointerMode,
          strength: 1.0
        };
      }

      const pData = this.simulator.simulate(this.age, this.bloom, time, windStrength, pointerDist);
      const palette = this.getPalette();
      return BotanicalArchitect.generatePlantGlyphs(pData, originX, groundY, palette, this.seed, time);
    }

    renderToCanvas(ctx, originX, groundY, time = 0, windStrength = 0.5) {
      const glyphs = this.generateGlyphs(originX, groundY, time, windStrength);
      const palette = this.getPalette();

      ctx.save();
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';

      // Pass 1: Wide atmospheric bloom halo around characters
      ctx.globalAlpha = palette.haloOpacity ? Math.min(0.65, palette.haloOpacity * 2.2) : 0.5;
      glyphs.forEach(g => {
        if (g.glowRad > 8) {
          ctx.font = `${Math.round(g.size)}px "Courier New", Consolas, monospace`;
          ctx.shadowColor = g.glowCol || g.fg;
          ctx.shadowBlur = Math.min(26, g.glowRad * 1.5);
          ctx.fillStyle = g.glowCol || g.fg;
          ctx.fillText(g.char, g.x, g.y);
        }
      });

      // Pass 2: Crisp foreground text with tight self-glow
      ctx.globalAlpha = 1.0;
      glyphs.forEach(g => {
        ctx.font = `${Math.round(g.size)}px "Courier New", Consolas, monospace`;
        ctx.shadowColor = g.glowCol || g.fg;
        ctx.shadowBlur = 4;
        ctx.fillStyle = g.fg;
        ctx.fillText(g.char, g.x, g.y);
      });

      ctx.restore();
    }

    toPlainText(cols = 40, rows = 35) {
      const grid = Array.from({ length: rows }, () => Array(cols).fill(' '));
      const glyphs = this.generateGlyphs(cols * 5, rows * 10, 0, 0);
      glyphs.forEach(g => {
        const c = Math.floor(g.x / 10);
        const r = Math.floor(g.y / 10);
        if (r >= 0 && r < rows && c >= 0 && c < cols) {
          grid[r][c] = g.char[0] || '*';
        }
      });
      return grid.map(row => row.join('')).join('\n');
    }
  }

  // =========================================================================
  // 7. THE ASCIIGARDEN CLASS
  // =========================================================================

  class AsciiGarden {
    constructor(canvas, options = {}) {
      this.canvas = typeof canvas === 'string' ? document.querySelector(canvas) : canvas;
      this.ctx = this.canvas.getContext('2d');
      this.plants = [];
      this.windStrength = options.wind !== undefined ? options.wind : 0.6;
      this.windTime = 0;
      this.particles = [];
      this.isRunning = false;
      this.paletteName = options.palette || 'botanical';
      this.pointer = { x: -999, y: -999, active: false };

      this._setupEvents();
      this.resize();
    }

    resize() {
      const rect = this.canvas.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;
      this.canvas.width = (rect.width || 800) * dpr;
      this.canvas.height = (rect.height || 600) * dpr;
      this.ctx.scale(dpr, dpr);
      this.cssWidth = rect.width || 800;
      this.cssHeight = rect.height || 600;
    }

    _setupEvents() {
      this.canvas.addEventListener('mousemove', e => {
        const rect = this.canvas.getBoundingClientRect();
        this.pointer.x = e.clientX - rect.left;
        this.pointer.y = e.clientY - rect.top;
        this.pointer.active = true;

        if (Math.random() < 0.35) {
          this.particles.push({
            x: this.pointer.x + (Math.random() - 0.5) * 20,
            y: this.pointer.y + (Math.random() - 0.5) * 20,
            vx: (Math.random() - 0.5) * 1.5 + (this.windStrength * 0.8),
            vy: -Math.random() * 1.5 - 0.5,
            char: Math.random() < 0.5 ? '*' : (Math.random() < 0.5 ? '·' : '~'),
            color: '#ffe650',
            life: 1.0,
            decay: 0.012 + Math.random() * 0.01
          });
        }
      });

      this.canvas.addEventListener('mouseleave', () => {
        this.pointer.active = false;
      });

      window.addEventListener('resize', () => this.resize());
    }

    addPlant(x, plantOptions = {}) {
      const plant = new AsciiPlant({
        ...plantOptions,
        palette: this.paletteName
      });
      this.plants.push({ x, plant });
      return plant;
    }

    clear() {
      this.plants = [];
      this.particles = [];
    }

    start() {
      if (this.isRunning) return;
      this.isRunning = true;
      let lastTime = performance.now();

      const loop = (now) => {
        if (!this.isRunning) return;
        const dt = (now - lastTime) / 1000;
        lastTime = now;

        this.update(dt);
        this.render();

        requestAnimationFrame(loop);
      };

      requestAnimationFrame(loop);
    }

    stop() {
      this.isRunning = false;
    }

    update(dt) {
      this.windTime += dt;

      // Update plants growth boost and vitality
      this.plants.forEach(({ plant }) => {
        if (plant.growthBoost > 0) {
          plant.age = clamp(plant.age + plant.growthBoost * dt * 0.65, 0.0, 1.0);
          if (plant.bloom !== null) {
            plant.bloom = clamp(plant.bloom + plant.growthBoost * dt * 0.75, 0.0, 1.0);
          }
          plant.growthBoost = Math.max(0, plant.growthBoost - dt * 0.22);
          plant.vitality = Math.max(1.0, plant.vitality - dt * 0.12);
        }
      });

      // Update ambient particles (pollen & sunlight nutrient motes)
      for (let i = this.particles.length - 1; i >= 0; i--) {
        const p = this.particles[i];
        p.x += p.vx + Math.sin(this.windTime * 2 + p.y * 0.02) * 0.5;
        p.y += p.vy;
        p.life -= p.decay;
        if (p.life <= 0 || p.x > this.cssWidth + 50 || p.y < -50 || p.y > this.cssHeight + 50) {
          this.particles.splice(i, 1);
        }
      }

      this.plants.forEach(({ plant }) => {
        plant.pointer.x = this.pointer.x;
        plant.pointer.y = this.pointer.y;
        plant.pointer.active = this.pointer.active;
      });
    }

    /**
     * Shower sunlight / plant food at (x, y) to nourish nearby plants
     */
    nourishAt(x, y, radius = 240) {
      // Spawn golden sunlight motes
      const moteChars = ['*', '✦', '°', '·', '☼', '✧', '+', '#'];
      const moteColors = ['#ffea00', '#ffd700', '#ffa500', '#ffffff', '#fff4a3'];

      for (let i = 0; i < 18; i++) {
        const ang = Math.random() * Math.PI * 2;
        const spd = 1.0 + Math.random() * 3.5;
        this.particles.push({
          x: x + (Math.random() - 0.5) * 30,
          y: y + (Math.random() - 0.5) * 30,
          vx: Math.cos(ang) * spd,
          vy: Math.sin(ang) * spd + 1.2, // drifting down like golden rain
          char: moteChars[Math.floor(Math.random() * moteChars.length)],
          color: moteColors[Math.floor(Math.random() * moteColors.length)],
          life: 1.0,
          decay: 0.015 + Math.random() * 0.012
        });
      }

      // Nourish nearby plants with distance attenuation
      this.plants.forEach(({ x: plantX, plant }) => {
        const dist = Math.abs(plantX - x);
        if (dist < radius) {
          const factor = 1.0 - (dist / radius);
          plant.feed(0.22 * factor);
        }
      });
    }

    render() {
      const ctx = this.ctx;
      const w = this.cssWidth;
      const h = this.cssHeight;

      ctx.fillStyle = '#050508';
      ctx.fillRect(0, 0, w, h);

      const groundY = h - 50;
      ctx.save();
      ctx.fillStyle = '#225528';
      ctx.shadowColor = '#00ff66';
      ctx.shadowBlur = 4;
      ctx.font = '12px monospace';
      ctx.textAlign = 'center';
      for (let gx = 0; gx < w; gx += 16) {
        ctx.fillText('-', gx, groundY + 12);
      }
      ctx.restore();

      this.plants.forEach(({ x, plant }) => {
        plant.renderToCanvas(ctx, x, groundY, this.windTime, this.windStrength);
      });

      ctx.save();
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      this.particles.forEach(p => {
        ctx.font = '12px monospace';
        ctx.fillStyle = p.color;
        ctx.globalAlpha = p.life;
        ctx.shadowColor = p.color;
        ctx.shadowBlur = 8;
        ctx.fillText(p.char, p.x, p.y);
      });
      ctx.restore();
    }
  }

  // =========================================================================
  // 8. CUSTOM WEB COMPONENT: <ascii-plant>
  // =========================================================================

  if (typeof customElements !== 'undefined' && !customElements.get('ascii-plant')) {
    class AsciiPlantElement extends HTMLElement {
      connectedCallback() {
        const type = this.getAttribute('type') || 'sunflower';
        const age = parseFloat(this.getAttribute('age') || '1.0');
        const bloom = this.hasAttribute('bloom') ? parseFloat(this.getAttribute('bloom')) : null;
        const height = parseInt(this.getAttribute('height') || '300', 10);
        const palette = this.getAttribute('palette') || 'botanical';
        const interactive = this.getAttribute('interactive') !== 'false';

        this.style.display = 'inline-block';
        this.style.background = '#050508';
        this.style.width = this.style.width || '280px';
        this.style.height = this.style.height || `${height + 80}px`;

        const canvas = document.createElement('canvas');
        canvas.style.width = '100%';
        canvas.style.height = '100%';
        canvas.style.display = 'block';
        this.appendChild(canvas);

        const garden = new AsciiGarden(canvas, { palette });
        garden.addPlant(canvas.clientWidth / 2 || 140, {
          type, age, bloom, height, palette, interactive
        });
        garden.start();
        this._garden = garden;
      }
      disconnectedCallback() {
        if (this._garden) this._garden.stop();
      }
    }
    customElements.define('ascii-plant', AsciiPlantElement);
  }

  return {
    AsciiPlant,
    AsciiGarden,
    PALETTES,
    SPECIES: ['sunflower', 'hibiscus', 'iris', 'thistle', 'marigold', 'daffodil', 'rose', 'dandelion', 'tulip', 'flytrap'],
    generateString: (options) => {
      const plant = new AsciiPlant(options);
      return plant.toPlainText(options.cols || 40, options.rows || 35);
    }
  };
}));
