/**
 * Florametric — Pure Parametric & Procedural Botanical Generation
 * Zero-dependency, 100% mathematical generative system for living ASCII plants & flowers.
 *
 * Layered architecture (each layer only depends on the layers above it):
 *   1. Math, PRNG, simplex noise & colour utilities
 *   2. Palettes
 *   3. Genome            — the heritable traits a plant is born with
 *   4. BotanicalSimulator — growth, member lifecycles and noise-driven variation
 *   5. BotanicalArchitect / ProceduralFlowerRenderer — geometry -> glyph lists
 *   6. GlyphRenderer / TextRasterizer — glyph lists -> canvas (sprite atlas, rotation) or plain text
 *   7. WindField, GrassTuft, AsciiPlant, AsciiGarden — the living scene
 *   8. Web Components (<florametric-plant> / <ascii-plant>)
 *
 * Glyph contract: { x, y, char, fg, size, rot?, alpha? } where rot is a clockwise
 * rotation in radians around the glyph centre.
 */

(function (root, factory) {
  if (typeof define === 'function' && define.amd) {
    define([], factory);
  } else if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.Florametric = factory();
    root.AsciiPlants = root.Florametric;
    root.AsciiPlant = root.Florametric.AsciiPlant;
    root.AsciiGarden = root.Florametric.AsciiGarden;
    root.GrassTuft = root.Florametric.GrassTuft;
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
    int(max = 0x7fffffff) {
      return Math.floor(this.next() * max);
    }
    // Approximately normal(0, 1) via the sum of uniforms (Irwin–Hall, n = 4)
    gauss() {
      return (this.next() + this.next() + this.next() + this.next() - 2.0) * 1.7320508;
    }
  }

  function clamp(val, min, max) {
    return Math.max(min, Math.min(max, val));
  }

  function lerp(a, b, t) {
    return a + (b - a) * t;
  }

  function smoothstep(min, max, value) {
    const x = Math.max(0, Math.min(1, (value - min) / (max - min)));
    return x * x * (3 - 2 * x);
  }

  /**
   * Seeded 2D simplex noise (after Stefan Gustavson) with fractal Brownian motion.
   * Unlike Math.random(), neighbouring inputs give neighbouring outputs, which is what
   * makes variation read as organic growth instead of jitter. Output is in [-1, 1].
   */
  const GRAD2 = [1, 1, -1, 1, 1, -1, -1, -1, 1, 0, -1, 0, 0, 1, 0, -1];

  class SimplexNoise {
    constructor(seed = 1) {
      const rng = new PRNG(seed);
      const p = new Uint8Array(256);
      for (let i = 0; i < 256; i++) p[i] = i;
      for (let i = 255; i > 0; i--) {
        const j = Math.floor(rng.next() * (i + 1));
        const t = p[i]; p[i] = p[j]; p[j] = t;
      }
      this.perm = new Uint8Array(512);
      for (let i = 0; i < 512; i++) this.perm[i] = p[i & 255];
    }

    noise2(x, y) {
      const F2 = 0.3660254037844386;
      const G2 = 0.21132486540518713;
      const s = (x + y) * F2;
      const i = Math.floor(x + s);
      const j = Math.floor(y + s);
      const t = (i + j) * G2;
      const x0 = x - (i - t);
      const y0 = y - (j - t);
      const i1 = x0 > y0 ? 1 : 0;
      const j1 = 1 - i1;
      const x1 = x0 - i1 + G2;
      const y1 = y0 - j1 + G2;
      const x2 = x0 - 1 + 2 * G2;
      const y2 = y0 - 1 + 2 * G2;
      const perm = this.perm;
      const ii = i & 255;
      const jj = j & 255;
      let n = 0;

      let t0 = 0.5 - x0 * x0 - y0 * y0;
      if (t0 > 0) {
        const g = (perm[ii + perm[jj]] & 7) * 2;
        t0 *= t0;
        n += t0 * t0 * (GRAD2[g] * x0 + GRAD2[g + 1] * y0);
      }
      let t1 = 0.5 - x1 * x1 - y1 * y1;
      if (t1 > 0) {
        const g = (perm[ii + i1 + perm[jj + j1]] & 7) * 2;
        t1 *= t1;
        n += t1 * t1 * (GRAD2[g] * x1 + GRAD2[g + 1] * y1);
      }
      let t2 = 0.5 - x2 * x2 - y2 * y2;
      if (t2 > 0) {
        const g = (perm[ii + 1 + perm[jj + 1]] & 7) * 2;
        t2 *= t2;
        n += t2 * t2 * (GRAD2[g] * x2 + GRAD2[g + 1] * y2);
      }
      return 70 * n;
    }

    fbm2(x, y, octaves = 3) {
      let sum = 0;
      let amp = 1;
      let norm = 0;
      let freq = 1;
      for (let o = 0; o < octaves; o++) {
        sum += this.noise2(x * freq, y * freq) * amp;
        norm += amp;
        amp *= 0.5;
        freq *= 2.0;
      }
      return sum / norm;
    }

    fbm1(x, octaves = 3) {
      return this.fbm2(x, 17.31, octaves);
    }
  }

  // Colour utilities (hex <-> HSL), memoised because palettes are tinted per plant
  const _tintCache = new Map();

  function hexToRgb(hex) {
    let h = hex.charAt(0) === '#' ? hex.slice(1) : hex;
    if (h.length === 3) h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2];
    const n = parseInt(h, 16);
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  }

  function rgbToHex(r, g, b) {
    const c = v => clamp(Math.round(v), 0, 255).toString(16).padStart(2, '0');
    return '#' + c(r) + c(g) + c(b);
  }

  function rgbToHsl(r, g, b) {
    r /= 255; g /= 255; b /= 255;
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    const l = (max + min) / 2;
    if (max === min) return [0, 0, l];
    const d = max - min;
    const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    let h;
    if (max === r) h = (g - b) / d + (g < b ? 6 : 0);
    else if (max === g) h = (b - r) / d + 2;
    else h = (r - g) / d + 4;
    return [h * 60, s, l];
  }

  function hslToRgb(h, s, l) {
    h = ((h % 360) + 360) % 360 / 360;
    if (s === 0) return [l * 255, l * 255, l * 255];
    const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    const p = 2 * l - q;
    const hue = t => {
      if (t < 0) t += 1;
      if (t > 1) t -= 1;
      if (t < 1 / 6) return p + (q - p) * 6 * t;
      if (t < 1 / 2) return q;
      if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
      return p;
    };
    return [hue(h + 1 / 3) * 255, hue(h) * 255, hue(h - 1 / 3) * 255];
  }

  /**
   * Blend two hex colours. t is quantised to `steps` levels so gradual transitions
   * (e.g. ageing stems) still map onto a small, bounded set of colours.
   */
  function mixColor(a, b, t, steps = 8) {
    const q = Math.round(clamp(t, 0, 1) * steps) / steps;
    if (q <= 0 || typeof b !== 'string') return a;
    if (q >= 1 || typeof a !== 'string') return b;
    const key = `${a}|${b}|${q}`;
    let out = _tintCache.get(key);
    if (out === undefined) {
      const ca = hexToRgb(a);
      const cb = hexToRgb(b);
      out = rgbToHex(ca[0] + (cb[0] - ca[0]) * q, ca[1] + (cb[1] - ca[1]) * q, ca[2] + (cb[2] - ca[2]) * q);
      _tintCache.set(key, out);
    }
    return out;
  }

  /**
   * Shift a hex colour in HSL space. Results are quantised and memoised so a garden of
   * plants maps onto a small, bounded set of colours (important for the glyph atlas).
   */
  function tintColor(hex, dHue, dSat, dLight) {
    if (typeof hex !== 'string' || hex.charAt(0) !== '#') return hex;
    const qh = Math.round(dHue);
    const qs = Math.round(dSat * 50) / 50;
    const ql = Math.round(dLight * 50) / 50;
    if (qh === 0 && qs === 0 && ql === 0) return hex;
    const key = `${hex}|${qh}|${qs}|${ql}`;
    let out = _tintCache.get(key);
    if (out === undefined) {
      const [h, s, l] = rgbToHsl(...hexToRgb(hex));
      out = rgbToHex(...hslToRgb(h + qh, clamp(s + qs, 0, 1), clamp(l + ql, 0.05, 0.95)));
      _tintCache.set(key, out);
    }
    return out;
  }

  // =========================================================================
  // 2. CHROMATIC PALETTES
  // =========================================================================

  const PALETTES = {
    botanical: {
      id: 'botanical',
      colorVariance: 1.0,
      name: 'Glowing Botanical',
      stem: '#55e64b',
      stemDark: '#2da82b',
      wilted: '#b08e2f',
      dead: '#7d5c28',
      haloOpacity: 0.28,
      flowers: {
        sunflower: { core: '#d28219', coreDeep: '#8c4b0f', petal: '#ffe628', petalWarm: '#ffb914', halo: '#ff9c00' },
        hibiscus: { outer: '#ff96dc', mid: '#ff41af', inner: '#d22382', stamen: '#ffeb2d', anther: '#ffaa14', halo: '#ff28a0' },
        iris: { standard: '#b973ff', fall: '#8c41eb', deep: '#5f23be', signal: '#ffe12d', halo: '#9641ff' },
        thistle: { calyx: '#5fe14b', brush: '#d773ff', brushDark: '#a541eb', halo: '#b44bfe' },
        marigold: { yellow: '#ffe62d', orange: '#ff7d14', crimson: '#e12819', halo: '#ff4600' },
        daffodil: { petal: '#ffe62d', cup: '#ff7d14', inner: '#c8500a', halo: '#ffbe00' },
        rose: { petal: '#ff2850', dark: '#b41432', light: '#ff6482', sepal: '#4ba032', halo: '#ff143c' },
        dandelion: { yellow: '#ffe628', seed: '#f5f5fa', core: '#a09664', halo: '#ffbe00' },
        tulip: { petal: '#ff375f', inner: '#c81946', stamen: '#ffd700', halo: '#ff2850' },
        flytrap: { jaw: '#55e64b', inside: '#e63750', teeth: '#f5f0dc', halo: '#ff3750' }
      }
    },
    phosphor: {
      id: 'phosphor',
      colorVariance: 0.15,
      name: 'Matrix Phosphor',
      stem: '#00ff66',
      stemDark: '#00aa44',
      wilted: '#338844',
      dead: '#225533',
      haloOpacity: 0.35,
      flowers: {
        sunflower: { core: '#00cc55', coreDeep: '#008833', petal: '#55ff99', petalWarm: '#00ff66', halo: '#00ff66' },
        hibiscus: { outer: '#55ff99', mid: '#00ff66', inner: '#00cc55', stamen: '#aaffcc', anther: '#00ff66', halo: '#00ff66' },
        iris: { standard: '#55ff99', fall: '#00ff66', deep: '#00cc55', signal: '#ccffee', halo: '#00ff66' },
        thistle: { calyx: '#00aa44', brush: '#55ff99', brushDark: '#00ff66', halo: '#00ff66' },
        marigold: { yellow: '#55ff99', orange: '#00ff66', crimson: '#00cc55', halo: '#00ff66' },
        daffodil: { petal: '#55ff99', cup: '#00ff66', inner: '#00aa44', halo: '#00ff66' },
        rose: { petal: '#55ff99', dark: '#00aa44', light: '#aaffcc', sepal: '#008833', halo: '#00ff66' },
        dandelion: { yellow: '#55ff99', seed: '#ccffee', core: '#00aa44', halo: '#00ff66' },
        tulip: { petal: '#55ff99', inner: '#00cc55', stamen: '#ccffee', halo: '#00ff66' },
        flytrap: { jaw: '#00ff66', inside: '#00aa44', teeth: '#ccffee', halo: '#00ff66' }
      }
    },
    amber: {
      id: 'amber',
      colorVariance: 0.15,
      name: '1982 Terminal Amber',
      stem: '#ffb000',
      stemDark: '#aa7000',
      wilted: '#774400',
      dead: '#442200',
      haloOpacity: 0.32,
      flowers: {
        sunflower: { core: '#cc8800', coreDeep: '#885500', petal: '#ffd044', petalWarm: '#ffb000', halo: '#ff9900' },
        hibiscus: { outer: '#ffd044', mid: '#ffb000', inner: '#cc8800', stamen: '#fff088', anther: '#ffb000', halo: '#ff9900' },
        iris: { standard: '#ffd044', fall: '#ffb000', deep: '#cc8800', signal: '#fff088', halo: '#ff9900' },
        thistle: { calyx: '#aa7000', brush: '#ffd044', brushDark: '#ffb000', halo: '#ff9900' },
        marigold: { yellow: '#ffd044', orange: '#ffb000', crimson: '#cc8800', halo: '#ff9900' },
        daffodil: { petal: '#ffd044', cup: '#ffb000', inner: '#aa7000', halo: '#ff9900' },
        rose: { petal: '#ffd044', dark: '#aa7000', light: '#fff088', sepal: '#885500', halo: '#ff9900' },
        dandelion: { yellow: '#ffd044', seed: '#fff0aa', core: '#aa7000', halo: '#ff9900' },
        tulip: { petal: '#ffd044', inner: '#cc8800', stamen: '#fff088', halo: '#ff9900' },
        flytrap: { jaw: '#ffb000', inside: '#cc8800', teeth: '#fff0aa', halo: '#ff9900' }
      }
    },
    cyberpunk: {
      id: 'cyberpunk',
      colorVariance: 0.6,
      name: 'Cyberpunk Neon',
      stem: '#00f5d4',
      stemDark: '#009e86',
      wilted: '#7b2cbf',
      dead: '#3c096c',
      haloOpacity: 0.38,
      flowers: {
        sunflower: { core: '#7b2cbf', coreDeep: '#3c096c', petal: '#fee440', petalWarm: '#00f5d4', halo: '#00f5d4' },
        hibiscus: { outer: '#f72585', mid: '#b5179e', inner: '#7209b7', stamen: '#fee440', anther: '#00f5d4', halo: '#f72585' },
        iris: { standard: '#f72585', fall: '#7209b7', deep: '#3f37c9', signal: '#00f5d4', halo: '#f72585' },
        thistle: { calyx: '#00f5d4', brush: '#f72585', brushDark: '#7209b7', halo: '#f72585' },
        marigold: { yellow: '#fee440', orange: '#f72585', crimson: '#7209b7', halo: '#f72585' },
        daffodil: { petal: '#00f5d4', cup: '#f72585', inner: '#7209b7', halo: '#00f5d4' },
        rose: { petal: '#f72585', dark: '#7209b7', light: '#ff70a6', sepal: '#00f5d4', halo: '#f72585' },
        dandelion: { yellow: '#fee440', seed: '#00f5d4', core: '#7209b7', halo: '#fee440' },
        tulip: { petal: '#f72585', inner: '#7209b7', stamen: '#00f5d4', halo: '#f72585' },
        flytrap: { jaw: '#00f5d4', inside: '#f72585', teeth: '#fee440', halo: '#f72585' }
      }
    },
    monochrome: {
      id: 'monochrome',
      colorVariance: 0.0,
      name: 'Pure Monochrome White',
      stem: '#e0e0e0',
      stemDark: '#888888',
      wilted: '#555555',
      dead: '#333333',
      haloOpacity: 0.18,
      flowers: {
        sunflower: { core: '#888888', coreDeep: '#555555', petal: '#ffffff', petalWarm: '#cccccc', halo: '#ffffff' },
        hibiscus: { outer: '#ffffff', mid: '#cccccc', inner: '#888888', stamen: '#ffffff', anther: '#aaaaaa', halo: '#ffffff' },
        iris: { standard: '#ffffff', fall: '#cccccc', deep: '#888888', signal: '#ffffff', halo: '#ffffff' },
        thistle: { calyx: '#888888', brush: '#ffffff', brushDark: '#aaaaaa', halo: '#ffffff' },
        marigold: { yellow: '#ffffff', orange: '#cccccc', crimson: '#888888', halo: '#ffffff' },
        daffodil: { petal: '#ffffff', cup: '#cccccc', inner: '#888888', halo: '#ffffff' },
        rose: { petal: '#ffffff', dark: '#888888', light: '#dddddd', sepal: '#666666', halo: '#ffffff' },
        dandelion: { yellow: '#ffffff', seed: '#ffffff', core: '#888888', halo: '#ffffff' },
        tulip: { petal: '#ffffff', inner: '#aaaaaa', stamen: '#ffffff', halo: '#ffffff' },
        flytrap: { jaw: '#cccccc', inside: '#888888', teeth: '#ffffff', halo: '#ffffff' }
      }
    }
  };

  // =========================================================================
  // 3. GENOME — HERITABLE TRAITS A PLANT IS BORN WITH
  // =========================================================================

  const STEM_HABITS = ['erect', 'curved_left', 'curved_right', 's_curve', 'windswept', 'zigzag'];

  // [min, max] of every numeric gene. Factors are multipliers around 1.0;
  // colour genes are normalised to [-1, 1] and scaled per species & palette.
  const TRAIT_RANGES = {
    lifeFactor: [0.70, 1.40],      // longevity: stretches the mature prime & member lifespans
    vigor: [0.80, 1.25],           // metabolic growth rate
    branching: [0.25, 1.50],       // axillary branch count & spread
    leafing: [0.60, 1.50],         // leaf cluster count & leaf size
    flowering: [0.65, 1.40],       // flower size, bloom duration & branch-flower fertility
    size: [0.85, 1.22],            // overall shoot height & flower scale
    hue: [-1.0, 1.0],              // petal hue shift (range set per species)
    saturation: [-1.0, 1.0],
    lightness: [-1.0, 1.0],
    growthNoise: [0.08, 0.28],     // amplitude of noise on growth velocity & member emergence
    shapeNoise: [0.35, 1.10],      // stem meander, leaf tilt & petal irregularity
    windSensitivity: [0.75, 1.30]  // stem flexibility
  };

  // Natural colour diversity per species, in hue degrees at hue = ±1
  // (tulips & roses come in many colours; sunflowers & daffodils barely vary).
  const SPECIES_HUE_RANGE = {
    sunflower: 10, hibiscus: 40, iris: 28, thistle: 22, marigold: 14,
    daffodil: 8, rose: 55, dandelion: 6, tulip: 70, flytrap: 12
  };

  class Genome {
    constructor(traits = {}) {
      this.species = traits.species || 'sunflower';
      this.seed = traits.seed !== undefined ? traits.seed : 42;
      for (const key in TRAIT_RANGES) {
        const [lo, hi] = TRAIT_RANGES[key];
        const v = traits[key];
        this[key] = (typeof v === 'number' && isFinite(v)) ? clamp(v, lo, hi) : (lo + hi) / 2;
      }
      this.habit = STEM_HABITS.includes(traits.habit) ? traits.habit : 'erect';
      this.noiseSeed = traits.noiseSeed !== undefined ? traits.noiseSeed : this.seed;
      this.generation = traits.generation || 0;
      this._paletteCache = new Map();
    }

    /** A fresh, fully random genome for a species, deterministic for a given seed. */
    static random(species = 'sunflower', seed = 42, overrides = {}) {
      const rng = new PRNG(((seed ^ 0x5bd1e995) >>> 0) || 1);
      const traits = { species, seed };
      for (const key in TRAIT_RANGES) {
        const [lo, hi] = TRAIT_RANGES[key];
        traits[key] = rng.range(lo, hi);
      }
      traits.habit = rng.choice(STEM_HABITS);
      traits.noiseSeed = rng.int();
      return new Genome(Object.assign(traits, overrides));
    }

    static from(value, species, seed) {
      if (value instanceof Genome) return value;
      if (value && typeof value === 'object') return Genome.random(species, seed, value);
      return Genome.random(species, seed);
    }

    /**
     * Offspring genome: every gene drifts by gaussian noise proportional to its range,
     * so lineages evolve gradually instead of jumping to unrelated morphologies.
     */
    mutate(seed, rate = 0.10) {
      const rng = new PRNG(((seed ^ 0x27d4eb2d) >>> 0) || 1);
      const child = {
        species: this.species,
        seed,
        habit: rng.next() < rate * 1.5 ? rng.choice(STEM_HABITS) : this.habit,
        noiseSeed: rng.int(),
        generation: this.generation + 1
      };
      for (const key in TRAIT_RANGES) {
        const [lo, hi] = TRAIT_RANGES[key];
        child[key] = clamp(this[key] + rng.gauss() * (hi - lo) * rate, lo, hi);
      }
      return new Genome(child);
    }

    /**
     * Derive this individual's colours from a base palette. Only the plant's own
     * species and stem colours shift; the palette's colorVariance keeps themed
     * palettes (phosphor, amber, monochrome) on-theme.
     */
    tintPalette(base) {
      const cached = this._paletteCache.get(base.id);
      if (cached) return cached;

      const v = base.colorVariance !== undefined ? base.colorVariance : 1.0;
      if (v <= 0) {
        this._paletteCache.set(base.id, base);
        return base;
      }

      const dHue = this.hue * (SPECIES_HUE_RANGE[this.species] || 15) * v;
      const dSat = this.saturation * 0.12 * v;
      const dLight = this.lightness * 0.07 * v;
      const baseFlowers = base.flowers[this.species] || base.flowers.sunflower;
      const flowers = {};
      for (const key in baseFlowers) {
        flowers[key] = tintColor(baseFlowers[key], dHue, dSat, dLight);
      }

      // Stems vary subtly with vigour: vigorous plants are a deeper, richer green
      const stemLight = (this.vigor - 1.0) * -0.10 * v + this.lightness * 0.03 * v;
      const stemHue = this.hue * 6 * v;
      const tinted = Object.assign({}, base, {
        stem: tintColor(base.stem, stemHue, 0, stemLight),
        stemDark: tintColor(base.stemDark, stemHue, 0, stemLight),
        flowers: Object.assign({}, base.flowers, { [this.species]: flowers })
      });
      this._paletteCache.set(base.id, tinted);
      return tinted;
    }

    toJSON() {
      const out = { species: this.species, seed: this.seed, habit: this.habit, noiseSeed: this.noiseSeed, generation: this.generation };
      for (const key in TRAIT_RANGES) out[key] = Math.round(this[key] * 1000) / 1000;
      return out;
    }
  }

  // =========================================================================
  // 4. GENETIC MORPHOLOGY & BIOLOGICAL GROWTH SIMULATOR
  // =========================================================================

  class BotanicalSimulator {
    constructor(config = {}) {
      this.type = config.type || 'sunflower';
      this.maxHeight = config.height || 360;
      this.userCurvature = config.curvature !== undefined ? config.curvature : 0.0;
      this.leafDensity = config.leafDensity !== undefined ? config.leafDensity : 1.0;
      this.branchingProp = config.branching !== undefined ? config.branching : 1.0;
      const seed = config.seed !== undefined ? config.seed : 42;
      this.reseedGenetics(seed, Genome.from(config.genome, this.type, seed));
    }

    // Legacy alias used by the Parametric Lab
    get curvature() { return this.userCurvature; }
    set curvature(v) { this.userCurvature = v; }

    /**
     * Re-generate morphology from a seed and a genome (a random genome when omitted).
     * The genome carries the heritable factors (life, branching, leafing, flowering, size,
     * colour, noise); the seed PRNG places individual leaves, branches and timings.
     */
    reseedGenetics(seed, genome = null) {
      this.seed = seed;
      this.genome = genome instanceof Genome ? genome : Genome.random(this.type, seed);
      this.genome.species = this.type;
      this.noise = new SimplexNoise(this.genome.noiseSeed);
      this.clock = 0.0;

      const g = this.genome;
      const rng = new PRNG(this.seed);
      this.rng = rng;
      this.geneticHabit = g.habit;
      this.geneticBendAmp = rng.range(14, 42);
      this.geneticHeightMod = rng.range(0.94, 1.06) * g.size;
      this.geneticMaxBranches = clamp(Math.round(rng.choice([0, 1, 1, 2, 2, 3]) * g.branching), 0, 3);
      this.geneticBranchAngles = [rng.range(0.42, 0.88), rng.range(0.52, 0.96), rng.range(0.48, 0.90)]
        .map(a => clamp(a * (0.8 + 0.2 * g.branching), 0.3, 1.1));
      this.geneticBranchLengths = [rng.range(0.32, 0.58), rng.range(0.28, 0.52), rng.range(0.24, 0.46)]
        .map(l => l * (0.85 + 0.15 * g.branching));
      this.geneticHeadTilt = rng.range(-0.38, 0.38);
      this.geneticFlowerScaleMod = rng.range(0.85, 1.25) * (0.86 + 0.14 * g.flowering) * Math.sqrt(g.size);
      this.geneticPetalChaos = rng.range(0.68, 1.38) * (0.8 + 0.25 * g.shapeNoise);
      this.geneticLeafClusters = clamp(Math.round(rng.choice([2, 3, 4, 5, 6]) * g.leafing), 2, 6);

      // Foliage Genetic Profiles: randomized placement jitters and individual leaf size variations!
      const leafSizeMod = 0.82 + 0.18 * g.leafing;
      this.geneticLeafJitters = [];
      this.geneticLeafSizes = [];
      this.geneticPhyllotaxis = [];
      for (let i = 0; i < 10; i++) {
        this.geneticLeafJitters.push(rng.range(-0.08, 0.08));
        this.geneticLeafSizes.push([rng.range(0.70, 1.45) * leafSizeMod, rng.range(0.70, 1.45) * leafSizeMod]);
        this.geneticPhyllotaxis.push(rng.choice(['paired', 'paired', 'alternate_l', 'alternate_r']));
      }

      this.initMembers();
    }

    /** Swap in an edited genome while keeping the seed-driven placement. */
    applyGenome(genome) {
      this.reseedGenetics(this.seed, Genome.from(genome, this.type, this.seed));
    }

    /**
     * Smooth growth-velocity multiplier from noise, always > 0, so growth timing wanders
     * between individuals and over time without ever running backwards.
     */
    growthNoise(t) {
      return 1.0 + this.genome.growthNoise * this.noise.fbm1(t * 0.12 + 3.7, 2) * 1.6;
    }

    /**
     * Initialize Persistent Member Graph:
     * Individual lifecycles and subcycles for leaves, apical flower, and axillary branches.
     */
    initMembers() {
      const rng = new PRNG(this.seed);
      const g = this.genome;
      const life = g.lifeFactor;
      this.members = {
        leaves: [],
        branches: [],
        apicalFlower: {
          state: 'dormant', // dormant, bud, opening, blooming, wilting, dead
          bloom: 0.0,
          age: 0.0,
          lifespan: rng.range(28, 45) * life * (0.8 + 0.2 * g.flowering), // peak anthesis
          wiltTimer: 11.0,            // 11s of visible wilting and petal shedding
          resproutTimer: 8.0,          // 8s resting calyx before next flush
          cycleCount: 0,
          vigor: rng.range(0.8, 1.2)
        }
      };
      this.seedRelease = 0; // flowers that finished and set seed since the garden last looked

      // 1. Main Stem Leaf Members with Staggered Lifespans (Turnover occurs throughout mature life!)
      const numClusters = Math.min(6, Math.floor(this.geneticLeafClusters * this.leafDensity));
      const leafLifespanBase = [16, 24, 19, 29, 22, 34];
      const makeLeaf = (c, side, ratio, yOffset, sizeMod, allometry, lifespan) => ({
        id: `leaf_${c}_${side < 0 ? 'l' : 'r'}`,
        cluster: c,
        yRatio: ratio,
        yOffset,
        side,
        scaleMod: sizeMod,
        baseScale: sizeMod * allometry,
        scale: sizeMod * allometry * 0.08,
        maturity: 0.08,
        state: 'dormant',
        age: 0.0,
        lifespan,
        wiltTimer: 9.0,
        resproutTimer: rng.range(6, 12),
        isWilted: false,
        isDead: false,
        // Individual emergence speed and a coherent-noise tilt so no two leaves sit alike
        vigor: rng.range(0.75, 1.3),
        tilt: this.noise.noise2(c * 1.37, side * 2.11) * 0.32 * g.shapeNoise
      });

      for (let c = 1; c <= numClusters; c++) {
        const baseRatio = c / (numClusters + 1);
        const jitter = this.geneticLeafJitters[c % this.geneticLeafJitters.length];
        const clampedRatio = clamp(baseRatio + jitter, 0.12, 0.88);
        const phyllo = this.geneticPhyllotaxis[c % this.geneticPhyllotaxis.length];
        const sizePair = this.geneticLeafSizes[c % this.geneticLeafSizes.length];
        const allometry = 0.72 + 0.55 * Math.sin(clampedRatio * Math.PI);
        const baseLifespan = ((leafLifespanBase[c % leafLifespanBase.length] || 22) + rng.range(-3, 3)) * life;

        if (phyllo === 'paired') {
          const yOffsetR = 2 + Math.floor(((this.seed * 3 + c * 5) % 5));
          this.members.leaves.push(makeLeaf(c, -1, clampedRatio, 0, sizePair[0], allometry, baseLifespan * rng.range(0.85, 1.15)));
          this.members.leaves.push(makeLeaf(c, 1, clampedRatio, yOffsetR, sizePair[1], allometry, baseLifespan * rng.range(0.85, 1.15)));
        } else if (phyllo === 'alternate_l') {
          this.members.leaves.push(makeLeaf(c, -1, clampedRatio, 0, sizePair[0], allometry, baseLifespan));
        } else {
          this.members.leaves.push(makeLeaf(c, 1, clampedRatio, 0, sizePair[1], allometry, baseLifespan));
        }
      }

      // 2. Secondary Branches (with child leaves and child flowers)
      const branchMax = Math.min(this.geneticMaxBranches, Math.floor(this.branchingProp * 3));
      const initialSide = ((this.seed % 2) === 0) ? -1 : 1;
      const fertility = clamp(0.35 + 0.5 * g.flowering, 0, 1);

      for (let bi = 0; bi < branchMax; bi++) {
        const branchSide = (bi % 2 === 0) ? initialSide : -initialSide;
        const startYRatio = 0.30 + bi * 0.22;
        const bLenRatio = this.geneticBranchLengths[bi % this.geneticBranchLengths.length] || 0.4;
        const bAngle = this.geneticBranchAngles[bi % this.geneticBranchAngles.length] || 0.65;

        // Child leaves on this branch
        const branchLeaves = [0.45, 0.80].map((posAlong, li) => ({
          id: `br_leaf_${bi}_${li}`,
          posAlong,
          side: li === 0 ? -branchSide : branchSide,
          scale: (li === 0 ? 0.75 : 0.65) * (0.85 + 0.15 * g.leafing),
          state: 'dormant',
          age: 0.0,
          lifespan: rng.range(50, 90) * life,
          wiltTimer: 16.0,
          resproutTimer: rng.range(20, 35)
        }));

        // Child flower at branch tip (a sterile shoot never buds)
        const branchFlower = {
          id: `br_flower_${bi}`,
          state: 'dormant',
          bloom: 0.0,
          age: 0.0,
          lifespan: rng.range(70, 130) * life,
          resproutTimer: rng.range(25, 45),
          isDead: false,
          sterile: rng.next() > fertility
        };

        this.members.branches.push({
          id: `branch_${bi}`,
          index: bi,
          side: branchSide,
          startYRatio,
          lengthRatio: bLenRatio,
          currentLength: 0.0,
          angle: bAngle,
          health: 1.0,
          state: 'dormant',
          isDead: false,
          deathTimer: 0.0,
          leaves: branchLeaves,
          flower: branchFlower,
          wiggle: rng.range(0, 100)
        });
      }
    }

    /**
     * Advance Member Subcycles over time (leaves, flowers, and branches with dependency rules)
     */
    updateMembers(dt, timeSpeed = 1.0, globalAge = 0.0) {
      if (!this.members) this.initMembers();
      const effectiveDt = dt * timeSpeed;
      this.clock += effectiveDt;
      const g = this.genome;
      const noise = this.noise;
      const clock = this.clock;
      const rng = this.rng;
      const effectiveMaxHeight = this.maxHeight * this.geneticHeightMod;
      const growthFactor = (1 - Math.exp(-4 * Math.min(1.0, globalAge))) / (1 - Math.exp(-4));
      const senescence = (globalAge > 21.0) ? clamp((globalAge - 21.0) / 2.5, 0.0, 1.0) : 0.0;
      let shootHeight = Math.max(20, effectiveMaxHeight * growthFactor);
      if (senescence > 0) shootHeight = Math.max(16, shootHeight * (1.0 - senescence * 0.22));

      // 1. UPDATE MAIN STEM LEAVES (Active turnover during mature prime!)
      this.members.leaves.forEach((l, li) => {
        const nodeTargetY = l.yRatio * (effectiveMaxHeight * 0.88);
        const apexDist = shootHeight - nodeTargetY;
        // Per-leaf emergence speed wanders smoothly with noise (never negative)
        const leafRate = (l.vigor || 1.0) * Math.max(0.25, 1.0 + g.growthNoise * 2.2 * noise.noise2(li * 3.1, clock * 0.15));

        if (apexDist >= 0) {
          if (l.state === 'dormant') {
            l.state = 'bud';
            l.maturity = 0.08;
            l.age = 0.0;
            l.isDead = false;
            l.isWilted = false;
          }

          if (l.state === 'bud' || l.state === 'growing') {
            l.maturity = Math.min(1.0, l.maturity + effectiveDt * 0.15 * leafRate);
            if (l.maturity >= 1.0) {
              l.state = 'mature';
            }
          }

          if (l.state === 'mature') {
            l.age += effectiveDt;
            if (l.age >= l.lifespan || senescence > 0.15) {
              l.state = 'wilting';
              l.isWilted = true;
              l.wiltTimer = 9.0;
            }
          }

          if (l.state === 'wilting') {
            l.wiltTimer -= effectiveDt;
            if (l.wiltTimer <= 0) {
              l.state = 'dead';
              l.isDead = true;
              l.isWilted = false;
              l.resproutTimer = 7.0;
            }
          }

          if (l.state === 'dead' && senescence < 0.85) {
            l.resproutTimer -= effectiveDt;
            if (l.resproutTimer <= 0) {
              l.state = 'bud';
              l.maturity = 0.12;
              l.age = 0.0;
              l.isDead = false;
              l.isWilted = false;
              l.wiltTimer = 9.0;
              l.resproutTimer = 7.0;
              l.lifespan = (20.0 + rng.next() * 15.0) * g.lifeFactor;
            }
          }
        }
      });

      // 2. UPDATE APICAL FLOWER (Successive Blooming Waves throughout mature prime!)
      const af = this.members.apicalFlower;
      if (globalAge > 0.42 && senescence < 0.92) {
        if (af.state === 'dormant') {
          af.state = 'bud';
          af.bloom = 0.10;
          af.age = 0.0;
        }

        const bloomRate = (af.vigor || 1.0) * Math.max(0.3, 1.0 + g.growthNoise * 2.0 * noise.noise2(91.7, clock * 0.11));
        if (af.state === 'bud') {
          af.bloom = Math.min(0.40, af.bloom + effectiveDt * 0.08 * bloomRate);
          if (af.bloom >= 0.38) af.state = 'opening';
        } else if (af.state === 'opening') {
          af.bloom = Math.min(1.0, af.bloom + effectiveDt * 0.10 * bloomRate);
          if (af.bloom >= 0.92) af.state = 'blooming';
        } else if (af.state === 'blooming') {
          af.age += effectiveDt;
          if (af.age >= af.lifespan || senescence > 0.15) {
            af.state = 'wilting';
            af.wiltTimer = 11.0;
          }
        } else if (af.state === 'wilting') {
          af.wiltTimer -= effectiveDt;
          af.bloom = Math.max(0.12, af.bloom - effectiveDt * 0.08);
          if (af.wiltTimer <= 0 || af.bloom <= 0.14) {
            af.state = 'dead';
            af.bloom = 0.0;
            af.resproutTimer = 8.0;
            this.seedRelease++; // the spent flower head sets seed
          }
        } else if (af.state === 'dead' && senescence < 0.85) {
          af.resproutTimer -= effectiveDt;
          if (af.resproutTimer <= 0) {
            af.state = 'bud';
            af.bloom = 0.10;
            af.age = 0.0;
            af.cycleCount++;
            af.lifespan = (28.0 + rng.next() * 16.0) * g.lifeFactor * (0.8 + 0.2 * g.flowering);
          }
        }
      }

      // 3. UPDATE SECONDARY BRANCHES & MEMBER DEPENDENCY
      this.members.branches.forEach(b => {
        if (b.isDead) return;

        const branchStartY = b.startYRatio * (effectiveMaxHeight * 0.88);
        if (shootHeight >= branchStartY && globalAge > 0.45 && senescence < 0.90) {
          if (b.state === 'dormant') {
            b.state = 'growing';
            b.currentLength = 4.0;
            b.health = 1.0;
          }

          const targetLen = shootHeight * b.lengthRatio * (1.0 - senescence * 0.35);
          if (b.currentLength < targetLen) {
            b.currentLength = Math.min(targetLen, b.currentLength + effectiveDt * 12.0);
          }

          // Update child leaves on this branch
          b.leaves.forEach(bl => {
            if (bl.state === 'dormant' && b.currentLength >= targetLen * bl.posAlong) {
              bl.state = 'mature';
              bl.age = 0.0;
            }
            if (bl.state === 'mature') {
              bl.age += effectiveDt;
              if (bl.age >= bl.lifespan || senescence > 0.15) {
                bl.state = 'wilting';
              }
            } else if (bl.state === 'wilting') {
              bl.wiltTimer -= effectiveDt;
              if (bl.wiltTimer <= 0) {
                bl.state = 'dead';
              }
            } else if (bl.state === 'dead' && b.health > 0.5 && senescence < 0.85) {
              bl.resproutTimer -= effectiveDt;
              if (bl.resproutTimer <= 0) {
                bl.state = 'mature';
                bl.age = 0.0;
                bl.wiltTimer = 16.0;
                bl.resproutTimer = 25.0;
              }
            }
          });

          // Update child flower on this branch
          const bf = b.flower;
          if (bf.state === 'dormant' && !bf.sterile && b.currentLength >= targetLen * 0.85) {
            bf.state = 'bud';
            bf.bloom = 0.15;
            bf.age = 0.0;
          }
          if (bf.state === 'bud' || bf.state === 'opening') {
            bf.bloom = Math.min(1.0, bf.bloom + effectiveDt * 0.05);
            if (bf.bloom >= 0.85) bf.state = 'blooming';
          } else if (bf.state === 'blooming') {
            bf.age += effectiveDt;
            if (bf.age >= bf.lifespan || senescence > 0.15) {
              bf.state = 'wilting';
            }
          } else if (bf.state === 'wilting') {
            bf.bloom = Math.max(0.0, bf.bloom - effectiveDt * 0.04);
            if (bf.bloom <= 0.05) {
              bf.state = 'dead';
              bf.isDead = true;
              bf.resproutTimer = 35.0;
              this.seedRelease++;
            }
          } else if (bf.state === 'dead' && b.health > 0.6 && senescence < 0.85) {
            bf.resproutTimer -= effectiveDt;
            if (bf.resproutTimer <= 0) {
              bf.state = 'bud';
              bf.bloom = 0.15;
              bf.age = 0.0;
              bf.isDead = false;
            }
          }

          // =========================================================
          // THE BRANCH DEPENDENCY RULE:
          // "if all flowers on that branch are dead and all leaves are dead
          // then there is a chance for it to die"
          // =========================================================
          const allLeavesDead = b.leaves.every(l => l.state === 'dead' || l.state === 'wilting');
          const allFlowersDead = !bf || bf.state === 'dead' || bf.state === 'dormant';

          if (allLeavesDead && allFlowersDead && b.state !== 'dormant') {
            // Vascular sap flow stops; branch withers
            b.health = Math.max(0.0, b.health - effectiveDt * 0.04);
            b.state = 'withering';

            // Progressive organic probability to die and break off once health is depleted
            if (b.health <= 0.0) {
              b.deathTimer += effectiveDt;
              if (rng.next() < (0.06 * effectiveDt) || b.deathTimer > 30.0) {
                b.isDead = true;
                b.state = 'dead';
              }
            }
          } else if (b.state !== 'dormant' && !b.isDead) {
            // Alive leaves or flowers nourish the branch!
            b.health = Math.min(1.0, b.health + effectiveDt * 0.12);
            b.state = b.health > 0.6 ? 'thriving' : 'growing';
            b.deathTimer = 0.0;
          }
        }
      });
    }

    feedMembers(amount = 0.35) {
      if (!this.members) return;
      this.members.leaves.forEach(l => {
        if (l.state === 'wilting' || l.state === 'dead') {
          l.state = 'bud';
          l.maturity = 0.30;
          l.age = 0.0;
          l.isWilted = false;
          l.isDead = false;
          l.wiltTimer = 18.0;
        }
      });
      const af = this.members.apicalFlower;
      if (af.state === 'wilting' || af.state === 'dead') {
        af.state = 'blooming';
        af.bloom = 0.85;
        af.age = 0.0;
      }
      this.members.branches.forEach(b => {
        b.health = 1.0;
        if (b.state === 'withering') b.state = 'thriving';
        b.leaves.forEach(bl => {
          if (bl.state === 'wilting' || bl.state === 'dead') {
            bl.state = 'mature';
            bl.age = 0.0;
          }
        });
        if (b.flower && (b.flower.state === 'wilting' || b.flower.state === 'dead')) {
          b.flower.state = 'blooming';
          b.flower.bloom = 0.80;
          b.flower.isDead = false;
        }
      });
    }

    /**
     * Pure snapshot of the plant's geometry at a given biological age.
     * gust in [-1, 1] is the local wind-field value (see WindField).
     */
    simulate(age = 1.0, bloomOverride = null, time = 0, windStrength = 0.5, pointerDist = null, gust = 0) {
      age = Math.max(0.02, age);
      const g = this.genome;
      const noise = this.noise;
      const flex = g.windSensitivity;
      const growthAge = Math.min(1.0, age);
      // Mature prime life plateau: stays at full height for at least 20n (1.0 <= age <= 21.0)!
      const senescence = (age > 21.0) ? clamp((age - 21.0) / 2.5, 0.0, 1.0) : 0.0;

      const effectiveMaxHeight = this.maxHeight * this.geneticHeightMod;
      const growthFactor = (1 - Math.exp(-4 * growthAge)) / (1 - Math.exp(-4));
      let shootHeight = Math.max(20, effectiveMaxHeight * growthFactor);
      if (senescence > 0) {
        shootHeight = Math.max(16, shootHeight * (1.0 - senescence * 0.22));
      }

      // 1. Stem Spine Spline
      const stemSegments = Math.max(6, Math.floor(shootHeight / 9));
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

        dx += Math.sin(t * Math.PI * 0.9) * (this.userCurvature * 45);

        // Organic meander from noise, keyed to absolute height so tissue that has already
        // grown keeps its shape while the apex keeps extending.
        const yAbs = t * shootHeight;
        dx += noise.fbm2(yAbs / 75, 4.2, 3) * 11 * g.shapeNoise * Math.min(1.0, yAbs / 50);

        // Turgor loss during senescence causes stem to bow/droop with gravity
        if (senescence > 0) {
          dx += (this.seed % 2 === 0 ? 1 : -1) * Math.sin(t * Math.PI) * (24 * senescence * t);
        }

        // Harmonic sway modulated by travelling gusts, plus a fine per-plant flutter
        const bend = windStrength * 16 * Math.pow(t, 1.4) * flex;
        const windWave = (Math.sin(time * 2.2 + t * 2.5) * (0.65 + 0.35 * Math.abs(gust)) + gust * 0.9) * bend
          + noise.noise2(time * 0.9, t * 1.7) * bend * 0.25;

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
        stemNodes.push({ x, y, t, angle: 0 });
      }

      // Tangent of the stem at every node: clockwise lean from vertical, used to rotate glyphs
      for (let i = 0; i < stemNodes.length; i++) {
        const a = stemNodes[Math.max(0, i - 1)];
        const b = stemNodes[Math.min(stemNodes.length - 1, i + 1)];
        stemNodes[i].angle = Math.atan2(b.x - a.x, Math.max(1e-3, b.y - a.y));
      }

      // 2. Leaves with Member Subcycles and Smooth Allometric Emergence
      if (!this.members) this.initMembers();

      const leaves = [];
      const activeLeaves = [];

      this.members.leaves.forEach(l => {
        const nodeTargetY = l.yRatio * (effectiveMaxHeight * 0.88) + (l.yOffset || 0);
        if (shootHeight >= nodeTargetY) {
          // If updateMembers hasn't stepped (static call), compute continuous maturity and wilting
          let maturity = l.maturity;
          let isW = l.isWilted || l.state === 'wilting';

          if (l.state === 'dormant') {
            const apexDistance = shootHeight - nodeTargetY;
            maturity = clamp((apexDistance - 2) / 48, 0.08, 1.0);
            if (nodeTargetY < effectiveMaxHeight * 0.25 && growthAge > 0.65) {
              isW = true;
            }
            if (senescence > 0.12 && nodeTargetY < effectiveMaxHeight * (0.25 + senescence * 0.8)) {
              isW = true;
            }
          }

          if (l.state !== 'dead') {
            const allometry = 0.72 + 0.55 * Math.sin(l.yRatio * Math.PI);
            const scale = (l.baseScale !== undefined ? l.baseScale : ((l.scaleMod || 1.0) * allometry)) * maturity;
            const leafObj = {
              id: l.id,
              y: nodeTargetY,
              side: l.side,
              scale,
              maturity,
              isWilted: isW,
              state: l.state,
              tilt: l.tilt || 0
            };
            leaves.push(leafObj);
            if (!isW && maturity > 0.35) {
              activeLeaves.push(leafObj);
            }
          }
        }
      });

      // 3. Auxin & Axillary Branches with Child Leaves, Tip Flowers, and Living Subcycles
      const branches = [];
      this.members.branches.forEach(b => {
        if (b.isDead) return; // Dead branches drop off organically!

        const startY = b.startYRatio * (effectiveMaxHeight * 0.88);
        if (shootHeight >= startY && growthAge > 0.45) {
          let bLen = b.currentLength;
          if (b.state === 'dormant' || bLen < 1) {
            const bProgress = Math.min(1.0, (growthAge - 0.48) / 0.45);
            bLen = shootHeight * b.lengthRatio * bProgress * (1.0 - senescence * 0.35);
          }

          if (bLen > 2) {
            const bAngle = b.angle + (senescence * 0.28);
            const hasFlower = b.flower && (b.flower.state === 'bud' || b.flower.state === 'opening' || b.flower.state === 'blooming' || b.flower.state === 'wilting');
            branches.push({
              id: b.id,
              startY: startY,
              side: b.side,
              length: bLen,
              angle: bAngle,
              state: b.state,
              health: b.health,
              leaves: b.leaves || [],
              flower: b.flower,
              hasFlower
            });
          }
        }
      });

      // 4. Flower Scaling Modulated by Active Leaves Biomass
      const totalLeafEnergy = activeLeaves.reduce((acc, l) => acc + (l.scale !== undefined ? l.scale : 1.0), 0);
      let flowerScale = (0.65 + totalLeafEnergy * 0.08) * this.geneticFlowerScaleMod;
      flowerScale = clamp(flowerScale, 0.5, 1.45);

      // Continuous Smooth Bud-to-Bloom & Member Subcycles
      let bloom = 0.0;
      if (bloomOverride !== null) {
        bloom = clamp(bloomOverride, 0.0, 1.0);
      } else if (this.members && this.members.apicalFlower && this.members.apicalFlower.state !== 'dormant') {
        bloom = this.members.apicalFlower.bloom;
      } else if (growthAge > 0.42) {
        // Natural gradual opening starting at age 0.42, fully open at 0.88
        bloom = smoothstep(0.42, 0.88, growthAge);
      }

      // Senescence effect on flower: petals droop and fade
      if (senescence > 0.0) {
        bloom = Math.max(0.0, bloom * (1.0 - senescence * 0.65));
      }

      const isBud = (this.members && this.members.apicalFlower && this.members.apicalFlower.state !== 'dormant')
        ? true
        : (growthAge > 0.38 && senescence < 0.88);

      // Two different things wilt and they must not be confused:
      //  - a flower head finishing its bloom (many times per life, local to that head)
      //  - the whole plant ageing at the end of its life (senescence)
      const af = this.members && this.members.apicalFlower;
      const flowerWilting = !!(af && af.state === 'wilting');
      // 0 = fresh bloom, 1 = fully spent; drives the yellowing of the flower stalk only
      let flowerSpent = 0;
      if (af && af.state === 'wilting') flowerSpent = clamp(1 - af.wiltTimer / 11.0, 0, 1);
      else if (af && af.state === 'dead') flowerSpent = clamp(af.resproutTimer / 8.0, 0, 1);
      const isWilting = senescence > 0.15;

      return {
        type: this.type,
        age,
        growthAge,
        senescence,
        isWilting,
        flowerWilting,
        flowerSpent,
        isDecaying: (senescence >= 0.88),
        bloom,
        isBud,
        shootHeight,
        stemNodes,
        leaves,
        branches,
        flowerScale,
        headTilt: this.geneticHeadTilt + (senescence * 0.45 * (this.seed % 2 === 0 ? 1 : -1)),
        petalChaos: this.geneticPetalChaos,
        activeLeafCount: activeLeaves.length,
        branchCount: branches.length,
        // Flower heads nod with the stem tip and the gusts
        windLean: clamp((stemNodes[stemNodes.length - 1].angle || 0) * 0.6, -0.45, 0.45),
        leafFlutter: windStrength * flex * (0.08 * Math.sin(time * 3.1) + 0.12 * gust),
        shapeNoise: g.shapeNoise,
        variant: (Math.imul(this.seed | 0, 2654435761) >>> 0) / 4294967296,
        noise,
        time
      };
    }
  }

  // =========================================================================
  // 4. SPECIES-SPECIFIC BOTANICAL ARCHITECTURE (STEMS & FOLIAGE GUIDELINES)
  // =========================================================================

  class BotanicalArchitect {
    static generatePlantGlyphs(pData, originX, groundY, palette, seed = 42, time = 0, seedsBlown = false) {
      const glyphs = [];
      const pType = pData.type;
      const nodes = pData.stemNodes;
      const shootH = pData.shootHeight;
      const leaves = pData.leaves;
      const branches = pData.branches;
      const fScale = pData.flowerScale;
      const bloom = pData.bloom;
      const age = pData.age;

      // Tissue is drawn in healthy colours; ageing is applied per height at the end
      const cStem = palette.stem;
      const cStemDark = palette.stemDark;
      const cWilted = palette.wilted;
      const cDead = palette.dead;
      const sen = pData.senescence || 0;

      // Senescence completion: plant has decayed back to soil stubble & mulch
      if (pData.isDecaying) {
        const cMulch = palette.dead || '#553c1a';
        glyphs.push({ x: originX - 4, y: groundY + 2, char: ".", fg: cMulch, size: 10 });
        glyphs.push({ x: originX, y: groundY - 2, char: "|", fg: cMulch, size: 12 });
        glyphs.push({ x: originX + 3, y: groundY + 1, char: "_", fg: cMulch, size: 11 });
        glyphs.push({ x: originX + 7, y: groundY + 3, char: ",", fg: cMulch, size: 9 });
        return glyphs;
      }

      // -------------------------------------------------------------
      // 1. STEM DRAWING (SPECIES-SPECIFIC)
      // Every stem glyph is rotated to the local tangent of the stem spline and
      // multi-strand stems are offset perpendicular to it, so curves read as
      // continuous strokes instead of stair-stepped columns.
      // -------------------------------------------------------------
      const stem = (n, offset, char, fg, size) => {
        const ca = Math.cos(n.angle);
        const sa = Math.sin(n.angle);
        glyphs.push({ x: originX + n.x + ca * offset, y: groundY - n.y + sa * offset, char, fg, size, rot: n.angle });
      };

      if (pType === 'sunflower') {
        for (let i = 0; i < nodes.length; i++) {
          const n = nodes[i];
          const ch = (i % 5 === 0) ? "%" : ((i % 7 === 0) ? "#" : "|");
          if (n.y < shootH * 0.55) {
            stem(n, -4, "|", cStem, 14);
            stem(n, 0, ch, cStemDark, 14);
            stem(n, 4, "|", cStem, 14);
          } else {
            stem(n, -2, "|", cStem, 14);
            stem(n, 2, ch, cStemDark, 14);
          }
        }
      } else if (pType === 'iris') {
        for (let i = 0; i < nodes.length; i++) {
          const n = nodes[i];
          stem(n, 0, "|", cStem, 14);
          if (i % 12 === 0 && i > 5 && i < nodes.length - 8) {
            stem({ x: n.x, y: n.y + 4, angle: n.angle }, -4, "(", cStemDark, 13);
            stem({ x: n.x, y: n.y + 4, angle: n.angle }, 4, ")", cStemDark, 13);
          }
        }
      } else if (pType === 'thistle') {
        for (let i = 0; i < nodes.length; i++) {
          const n = nodes[i];
          stem(n, 0, "|", cStem, 14);
          if (i % 3 === 0) {
            stem(n, -5, "!", cStem, 12);
            stem(n, 5, "!", cStem, 12);
          }
        }
      } else if (pType === 'dandelion') {
        for (let i = 0; i < nodes.length; i++) {
          stem(nodes[i], 0, "|", cStem, 14);
        }
      } else if (pType === 'rose') {
        for (let i = 0; i < nodes.length; i++) {
          const n = nodes[i];
          stem(n, 0, "|", cStem, 14);
          if (i % 7 === 0 && i > 3) {
            const thornSide = (i % 14 === 0) ? -1 : 1;
            stem(n, thornSide * 6, thornSide < 0 ? "<" : ">", '#d23737', 13);
          }
        }
      } else if (pType === 'tulip') {
        for (let i = 0; i < nodes.length; i++) {
          stem(nodes[i], -2, "|", cStem, 14);
          stem(nodes[i], 2, "|", cStemDark, 14);
        }
      } else if (pType === 'marigold') {
        for (let i = 0; i < nodes.length; i++) {
          stem(nodes[i], 0, (i % 4 === 0 ? ":" : "|"), cStem, 13);
        }
      } else if (pType === 'daffodil') {
        for (let i = 0; i < nodes.length; i++) {
          stem(nodes[i], 0, "|", cStem, 14);
        }
        const top = nodes[nodes.length - 1];
        stem({ x: top.x, y: top.y - 4, angle: top.angle }, -4, "(", '#b49650', 13);
        stem({ x: top.x, y: top.y - 4, angle: top.angle }, 4, ")", '#b49650', 13);
      } else {
        for (let i = 0; i < nodes.length; i++) {
          const n = nodes[i];
          const ch = (i % 6 === 0) ? "%" : ((i % 7 === 0) ? "+" : "|");
          if (n.y < shootH * 0.4) {
            stem(n, -3, "|", cStem, 14);
            stem(n, 3, ch, cStem, 14);
          } else {
            stem(n, 0, ch, cStem, 14);
          }
        }
      }

      // -------------------------------------------------------------
      // 2. FOLIAGE DRAWING (SPECIES-SPECIFIC)
      // Leaves are laid out in a leaf-local frame and rotated as a whole around their
      // base (genetic tilt + noise + wind flutter); each glyph shares that rotation.
      // -------------------------------------------------------------
      const flutter = pData.leafFlutter || 0;
      const growthAge = pData.growthAge !== undefined ? pData.growthAge : Math.min(1.0, age);
      const leafPush = (bx, by, theta, ox, oy, char, fg, size) => {
        const ct = Math.cos(theta);
        const st = Math.sin(theta);
        glyphs.push({ x: bx + ox * ct - oy * st, y: by + ox * st + oy * ct, char, fg, size, rot: theta });
      };
      const nodeAt = y => {
        const t = y / Math.max(1, shootH);
        return nodes[Math.min(nodes.length - 1, Math.max(0, Math.floor(t * (nodes.length - 1))))];
      };

      if (pType === 'iris') {
        // Fan of flat, sword-shaped (ensiform) blades: two strands that taper to a point,
        // leaning gently outward and swaying with the wind
        const bladeHeights = [0.55, 0.72, 0.85, 0.62, 0.48].map(h => h * shootH * (0.3 + 0.7 * growthAge));
        const bladeLean = [-0.30, -0.14, 0.04, 0.18, 0.34];
        bladeHeights.forEach((bh, bIdx) => {
          const steps = Math.max(3, Math.floor(bh / 9));
          const lean = bladeLean[bIdx] * (1.0 + 0.8 * sen);
          const sway = flutter * 28 + (pData.noise ? pData.noise.noise2(bIdx * 4.3, time * 0.5) * 3 : 0);
          const baseX = originX + bladeLean[bIdx] * 18;
          let prevX = baseX;
          let prevY = groundY;
          for (let st = 1; st <= steps; st++) {
            const u = st / steps;
            const px = baseX + Math.sin(lean) * bh * u + lean * 14 * u * u + sway * u * u;
            const py = groundY - bh * u + u * u * bh * 0.25 * sen;
            const rot = Math.atan2(px - prevX, Math.max(0.5, prevY - py));
            const w = 2.6 * (1 - u * 0.75);
            const ca = Math.cos(rot);
            const sa = Math.sin(rot);
            const col = u < 0.7 ? cStem : cStemDark;
            glyphs.push({ x: px - ca * w, y: py - sa * w, char: "|", fg: col, size: 13, rot });
            if (u < 0.92) glyphs.push({ x: px + ca * w, y: py + sa * w, char: "|", fg: cStemDark, size: 13, rot });
            prevX = px;
            prevY = py;
          }
        });
      } else if (pType === 'dandelion') {
        // Basal rosette of runcinate ("lion's tooth") leaves lying low over the soil.
        // Sized by growth age (0..1), never by total lifespan.
        const numLeaves = 6 + (seed % 3);
        const wilt = pData.senescence || 0;
        const leafCol = wilt > 0.15 ? cWilted : cStem;
        const toothCol = wilt > 0.15 ? cDead : cStemDark;
        for (let i = 0; i < numLeaves; i++) {
          const side = i % 2 === 0 ? -1 : 1;
          const rank = Math.floor(i / 2);
          const elev = 0.18 + rank * 0.16 + (((seed * (i + 1) * 7) % 11) - 5) * 0.015 - wilt * 0.2;
          const leafScale = 0.75 + (((seed * (i + 3) * 13) % 17) / 17) * 0.45;
          const leafLen = (34 + 22 * Math.cos(rank * 0.9)) * leafScale * (0.25 + 0.75 * growthAge);
          const theta = side < 0 ? Math.PI + elev : -elev; // direction of the midrib
          const dirX = Math.cos(theta);
          const dirY = Math.sin(theta);
          for (let d = 6; d <= leafLen; d += 7) {
            const u = d / leafLen;
            const droop = u * u * (5 + wilt * 10) - flutter * 20 * u;
            const mx = originX + dirX * d;
            const my = groundY - 2 + dirY * d + droop;
            glyphs.push({ x: mx, y: my, char: "-", fg: leafCol, size: 12, rot: theta });
            // Backward-pointing lobes, widest mid-leaf, alternating above and below the midrib
            const lobe = Math.sin(u * Math.PI) * 5 * leafScale;
            if (lobe > 1.5 && (d / 7) % 2 < 1) {
              const up = ((d / 7) % 4) < 2 ? -1 : 1;
              glyphs.push({
                x: mx - dirY * lobe * up,
                y: my + dirX * lobe * up,
                char: side < 0 ? ">" : "<",
                fg: toothCol,
                size: Math.max(9, Math.round(10 * leafScale)),
                rot: side < 0 ? elev : -elev
              });
            }
          }
        }
      } else if (pType === 'marigold') {
        leaves.forEach(leaf => {
          const n = nodeAt(leaf.y);
          const lx = originX + n.x;
          const lyScreen = groundY - leaf.y;
          const lScale = leaf.scale || 1.0;
          const isW = leaf.isWilted;
          const col = isW ? cWilted : cStem;
          const theta = -leaf.side * (0.12 + leaf.tilt) + flutter;

          if (leaf.state === 'bud') {
            leafPush(lx, lyScreen, theta, leaf.side * 4, -2, leaf.side < 0 ? "'" : "`", cStem, 10);
            return;
          }

          const rachisLen = Math.round(32 * lScale);
          for (let r = 8; r <= rachisLen; r += 8) {
            const ox = leaf.side * r;
            const oy = -(r * 0.25) + (isW ? r * 0.45 : 0);
            leafPush(lx, lyScreen, theta, ox, oy, isW ? "~" : "-", col, Math.max(9, Math.round(12 * lScale)));
            if (!isW) {
              leafPush(lx, lyScreen, theta, ox, oy - 6 * lScale, "/", cStem, Math.max(8, Math.round(11 * lScale)));
              leafPush(lx, lyScreen, theta, ox, oy + 6 * lScale, "\\", cStem, Math.max(8, Math.round(11 * lScale)));
            } else {
              leafPush(lx, lyScreen, theta, ox, oy + 4 * lScale, "\\", cDead, Math.max(8, Math.round(10 * lScale)));
            }
          }
        });
      } else if (pType === 'tulip') {
        [-1, 1].forEach(side => {
          const tLeafH = shootH * 0.55;
          for (let step = 0; step <= tLeafH; step += 9) {
            const lt = step / tLeafH;
            const ly = groundY - step;
            const arch = Math.sin(lt * Math.PI) * 28 * side + flutter * 25 * lt * lt;
            const slope = Math.cos(lt * Math.PI) * Math.PI * 28 * side / tLeafH;
            const rot = Math.atan2(slope, 1);
            const lx = originX + arch;
            glyphs.push({ x: lx, y: ly, char: side < 0 ? "(" : ")", fg: cStem, size: 15, rot });
            glyphs.push({ x: lx + side * 3, y: ly, char: "|", fg: cStemDark, size: 13, rot });
          }
        });
      } else if (pType === 'thistle') {
        leaves.forEach(leaf => {
          const n = nodeAt(leaf.y);
          const lx = originX + n.x;
          const lyScreen = groundY - leaf.y;
          const lScale = leaf.scale || 1.0;
          const isW = leaf.isWilted;
          const col = isW ? cWilted : cStem;
          const theta = -leaf.side * (0.10 + leaf.tilt) + flutter;

          if (leaf.state === 'bud') {
            leafPush(lx, lyScreen, theta, leaf.side * 4, -2, "*", cStem, 10);
            return;
          }
          if (isW) {
            leafPush(lx, lyScreen, theta, leaf.side * 8 * lScale, 6 * lScale, "\\", cWilted, 12);
            leafPush(lx, lyScreen, theta, leaf.side * 14 * lScale, 12 * lScale, "~", cDead, 11);
            leafPush(lx, lyScreen, theta, leaf.side * 20 * lScale, 18 * lScale, "v", cDead, 10);
            return;
          }
          const spinyPts = [
            { ox: 8, oy: -6, ch: "/" }, { ox: 16, oy: -10, ch: "*" }, { ox: 22, oy: -6, ch: "\\" },
            { ox: 12, oy: 0, ch: "#" }, { ox: 20, oy: 0, ch: "%" }, { ox: 28, oy: 0, ch: "!" },
            { ox: 8, oy: 6, ch: "\\" }, { ox: 16, oy: 10, ch: "*" }, { ox: 24, oy: 6, ch: "/" }
          ];
          const size = Math.max(10, Math.round(13 * lScale));
          spinyPts.forEach(pt => {
            leafPush(lx, lyScreen, theta, leaf.side * pt.ox * lScale, pt.oy * lScale, pt.ch, col, size);
          });
        });
      } else if (pType === 'daffodil') {
        // Flat ribbon leaves rising from the bulb and arching outward under their own weight
        [-1, -1, 1, 1].forEach((side, li) => {
          const leafH = shootH * (li % 2 === 0 ? 0.62 : 0.48) * (0.3 + 0.7 * growthAge);
          const spread = (li % 2 === 0 ? 30 : 46) * (1.0 + 0.6 * sen);
          const steps = Math.max(3, Math.floor(leafH / 9));
          let prevX = originX + side * 5;
          let prevY = groundY;
          for (let st = 1; st <= steps; st++) {
            const u = st / steps;
            const px = originX + side * (5 + spread * u * u) + flutter * 30 * u * u;
            const py = groundY - leafH * Math.sin(u * Math.PI * 0.42) / Math.sin(Math.PI * 0.42) + u * u * leafH * 0.35 * sen;
            const rot = Math.atan2(px - prevX, prevY - py);
            const ca = Math.cos(rot);
            const sa = Math.sin(rot);
            const w = 2.2 * (1 - u * 0.6);
            glyphs.push({ x: px - ca * w, y: py - sa * w, char: "|", fg: cStem, size: 13, rot });
            glyphs.push({ x: px + ca * w, y: py + sa * w, char: "|", fg: cStemDark, size: 13, rot });
            prevX = px;
            prevY = py;
          }
        });
      } else {
        leaves.forEach(leaf => {
          const n = nodeAt(leaf.y);
          const lx = originX + n.x;
          const lyScreen = groundY - leaf.y;
          const lScale = leaf.scale || 1.0;
          const mat = leaf.maturity !== undefined ? leaf.maturity : 1.0;
          const theta = -leaf.side * (0.10 + leaf.tilt) + flutter;

          // Nascent bud stage: leaf has just emerged from apical meristem
          if (mat < 0.35 && !leaf.isWilted) {
            leafPush(lx, lyScreen, theta, leaf.side * 4, -2, leaf.side < 0 ? "'" : "`", cStem, 10);
            return;
          }

          const size = Math.max(9, Math.round(13 * lScale));
          if (leaf.isWilted) {
            const wiltPts = [
              { ox: 8, oy: 4, ch: "\\" },
              { ox: 14, oy: 10, ch: "~" },
              { ox: 19, oy: 16, ch: "v" },
              { ox: 23, oy: 22, ch: "." }
            ];
            wiltPts.forEach((pt, pIdx) => {
              leafPush(lx, lyScreen, theta, leaf.side * pt.ox * lScale, pt.oy * lScale, pt.ch, (pIdx < 2 ? cWilted : cDead), Math.max(9, Math.round(12 * lScale)));
            });
          } else {
            // Gradual leaf unfurling: petiole extends first, then lamina broadens
            const pts = [[6, -2, leaf.side < 0 ? "/" : "\\"], [12, -2, "*"]];
            if (mat >= 0.50) pts.push([18, -2, "%"], [8, 5, "|"], [14, 5, "#"]);
            if (mat >= 0.70) pts.push([8, -8, "+"], [14, -8, "+"], [20, 4, "%"], [24, -2, "#"]);
            if (mat >= 0.85) {
              pts.push([20, -8, "+"], [26, -8, "-"], [26, 4, "&"], [30, -2, "#"],
                [10, 12, "+"], [16, 12, "+"], [22, 12, "+"], [28, 12, "/"]);
            }
            pts.forEach(pt => {
              leafPush(lx, lyScreen, theta, leaf.side * pt[0] * lScale, pt[1] * lScale, pt[2], cStem, size);
            });
          }
        });
      }

      // -------------------------------------------------------------
      // 3. SECONDARY BRANCHES (WITH MEMBER SUBCYCLES & CHILD LEAVES)
      // -------------------------------------------------------------
      branches.forEach(b => {
        const n0 = nodeAt(b.startY);
        const bx0 = originX + n0.x;
        const by0 = groundY - b.startY;

        const isWithering = (b.state === 'withering' || (b.health !== undefined && b.health < 0.35));
        const brStemCol = isWithering ? cDead : cStem;
        const sinA = Math.sin(b.angle);
        const cosA = Math.cos(b.angle);
        const wig = b.wiggle || 0;
        const amp = 5 * (0.6 + (pData.shapeNoise || 0.7));

        // Branch spine with a coherent-noise wiggle; returns point + tangent rotation
        const along = d => {
          const w = pData.noise ? pData.noise.noise2(d / 45, wig) : Math.sin(d * 0.12);
          const sway = flutter * 40 * (d / Math.max(1, b.length)) ** 2;
          return {
            x: bx0 + b.side * (d * sinA + w * amp) + sway,
            y: by0 - d * cosA
          };
        };

        let prev = along(0);
        for (let bi = 8; bi <= b.length; bi += 8) {
          const p = along(bi);
          const rot = Math.atan2(p.x - prev.x, prev.y - p.y);
          glyphs.push({ x: p.x, y: p.y, char: isWithering ? ":" : "|", fg: brStemCol, size: 13, rot });
          prev = p;
        }

        // Child leaves on this branch
        if (b.leaves && b.leaves.length > 0) {
          b.leaves.forEach(bl => {
            if (bl.state === 'dormant' || bl.state === 'dead') return;
            const p = along(b.length * (bl.posAlong || 0.5));
            const isLeafWilted = (bl.state === 'wilting' || isWithering);
            const leafCol = isLeafWilted ? cDead : cStem;
            const theta = isLeafWilted ? bl.side * 0.5 : -bl.side * 0.25 + flutter;
            leafPush(p.x, p.y, theta, bl.side * 5, 0, isLeafWilted ? "~" : (bl.side < 0 ? "<" : ">"), leafCol, 11);
            if (!isLeafWilted && (bl.scale || 0.7) > 0.6) {
              leafPush(p.x, p.y, theta, bl.side * 11, -1, bl.side < 0 ? "<" : ">", cStemDark, 10);
            }
          });
        }

        // Child flower at branch tip
        const bFlower = b.flower;
        const bBloom = (bFlower && bFlower.state !== 'dormant' && !bFlower.isDead) ? bFlower.bloom : (b.hasFlower ? bloom * 0.8 : 0);
        if (bBloom > 0.15) {
          const tip = along(b.length);
          const secFlower = ProceduralFlowerRenderer.generateGlyphs(
            pType, tip.x, tip.y, fScale * 0.65, bBloom, palette, time, false,
            (pData.isWilting || isWithering || (bFlower && bFlower.state === 'wilting')),
            b.side * b.angle * 0.4 + (pData.windLean || 0), pData.variant
          );
          glyphs.push(...secFlower);
        }
      });

      // -------------------------------------------------------------
      // 4. APICAL BUD OR FLOWER ANTHESIS (GRADUAL UNFURLING)
      // -------------------------------------------------------------
      const apexX = originX + nodes[nodes.length - 1].x;
      const apexY = groundY - nodes[nodes.length - 1].y;
      const tilt = pData.headTilt || 0.0;
      const tiltX = apexX + Math.sin(tilt) * 18;
      const tiltY = apexY - Math.cos(tilt) * 14;

      if (pData.isBud) {
        const flowerGlyphs = ProceduralFlowerRenderer.generateGlyphs(
          pType, tiltX, tiltY, fScale, bloom, palette, time, seedsBlown, (pData.isWilting || pData.flowerWilting),
          tilt * 0.5 + (pData.windLean || 0), pData.variant
        );
        glyphs.push(...flowerGlyphs);
      }

      BotanicalArchitect._applyAgeing(glyphs, pData, groundY, palette);
      return glyphs;
    }

    /**
     * Recolour green tissue by height:
     *  - senescence browns the plant from the base upward (green -> straw -> brown),
     *    so the tip stays green longest, as in real plants;
     *  - a spent flower yellows only the top of its own stalk (peduncle), fading back
     *    as the next bud forms. A finished flower never browns the whole plant.
     */
    static _applyAgeing(glyphs, pData, groundY, palette) {
      const sen = pData.senescence || 0;
      const spent = pData.flowerSpent || 0;
      if (sen <= 0 && spent <= 0) return;
      const stem = palette.stem;
      const stemDark = palette.stemDark;
      const straw = palette.wilted || '#b08e2f';
      const brown = palette.dead || '#7d5c28';
      const strawDark = mixColor(straw, brown, 0.5);
      const h = Math.max(1, pData.shootHeight);

      for (let i = 0; i < glyphs.length; i++) {
        const g = glyphs[i];
        if (g.fg !== stem && g.fg !== stemDark) continue;
        const yFrac = clamp((groundY - g.y) / h, 0, 1.2);
        let a = smoothstep(yFrac * 0.55, yFrac * 0.55 + 0.45, sen);
        if (spent > 0 && yFrac > 0.8) a = Math.max(a, spent * 0.3 * Math.min(1, (yFrac - 0.8) / 0.2));
        if (a <= 0) continue;
        const mid = g.fg === stem ? straw : strawDark;
        g.fg = a < 0.5 ? mixColor(g.fg, mid, a * 2) : mixColor(mid, brown, (a - 0.5) * 2);
      }
    }
  }

  // =========================================================================
  // 5. PROCEDURAL FLOWER HEAD GEOMETRY ENGINE (GRADUAL BUD-TO-BLOOM MATH)
  // =========================================================================

  const HEAD_ROT_RESPONSE = { hibiscus: 0.25, iris: 0.45, tulip: 0.7, flytrap: 0.6 };

  class ProceduralFlowerRenderer {
    /**
     * headRot rotates the whole head (clockwise radians) around its centre so heads nod
     * with the stem tip and the wind; variant (0..1) gives each individual its own
     * petal irregularity.
     */
    static generateGlyphs(type, cx, cy, scale, bloom, palette, time = 0, seedsBlown = false, isWilting = false, headRot = 0, variant = 0) {
      const glyphs = this._generateUpright(type, cx, cy, scale, bloom, palette, time, seedsBlown, isWilting, variant);
      // Row-built heads (hibiscus, iris) read as slanted slabs when rotated far
      headRot = clamp(headRot * (HEAD_ROT_RESPONSE[type] !== undefined ? HEAD_ROT_RESPONSE[type] : 1.0), -0.4, 0.4);
      if (headRot) {
        const pivotY = cy - 22 * scale;
        const c = Math.cos(headRot);
        const s = Math.sin(headRot);
        for (let i = 0; i < glyphs.length; i++) {
          const g = glyphs[i];
          const dx = g.x - cx;
          const dy = g.y - pivotY;
          g.x = cx + dx * c - dy * s;
          g.y = pivotY + dx * s + dy * c;
          g.rot = (g.rot || 0) + headRot;
        }
      }
      return glyphs;
    }

    static _generateUpright(type, cx, cy, scale, bloom, palette, time, seedsBlown, isWilting, variant) {
      const glyphs = [];
      const fPalette = palette.flowers[type] || palette.flowers.sunflower;
      const cStem = palette.stem;

      // STAGE 1: TIGHT CLOSED BUD (bloom < 0.18)
      // All species start as a compact protective calyx capsule with sepals!
      if (bloom < 0.18) {
        const budProgress = bloom / 0.18; // 0.0 to 1.0
        const budSize = (12 + budProgress * 4) * scale;
        // Calyx sepals wrapping the bud
        glyphs.push({ x: cx - 5 * scale, y: cy - 4 * scale, char: "(", fg: cStem, size: budSize });
        glyphs.push({ x: cx, y: cy - 8 * scale, char: "#", fg: cStem, size: budSize });
        glyphs.push({ x: cx + 5 * scale, y: cy - 4 * scale, char: ")", fg: cStem, size: budSize });
        // Colored petal tip peeking out as sepals loosen!
        if (budProgress > 0.4) {
          glyphs.push({ x: cx, y: cy - 14 * scale, char: "*", fg: fPalette.petal || fPalette.standard || '#ffe628', size: 12 * scale });
        }
        return glyphs;
      }

      // STAGE 2: PARTING SEPALS & CONICAL BUD (0.18 <= bloom < 0.45)
      // Sepals peel back outward; inner petals form an emerging cone
      if (bloom < 0.45) {
        const partProgress = (bloom - 0.18) / 0.27;
        const sepalDist = 12 * scale * partProgress;
        // Parted sepals
        glyphs.push({ x: cx - sepalDist, y: cy + 2 * scale, char: "\\", fg: cStem, size: 14 * scale });
        glyphs.push({ x: cx + sepalDist, y: cy + 2 * scale, char: "/", fg: cStem, size: 14 * scale });
        glyphs.push({ x: cx, y: cy + 4 * scale, char: "v", fg: cStem, size: 13 * scale });
        // Emerging petal cone
        const petalCol = fPalette.petal || fPalette.outer || fPalette.standard || '#ffe628';
        glyphs.push({ x: cx - 4 * scale, y: cy - 8 * scale, char: "(", fg: petalCol, size: 14 * scale });
        glyphs.push({ x: cx, y: cy - 12 * scale, char: "^", fg: petalCol, size: 15 * scale });
        glyphs.push({ x: cx + 4 * scale, y: cy - 8 * scale, char: ")", fg: petalCol, size: 14 * scale });
        return glyphs;
      }

      // STAGE 3 & 4: HALF-BLOOM & FULL ANTHESIS (bloom >= 0.45)
      // Mathematical expansion factor b_eff: 0.0 at bloom=0.45, 1.0 at bloom=1.0
      const bEff = smoothstep(0.45, 1.0, bloom);
      this._variant = variant || 0;

      switch (type) {
        case 'sunflower':
          this._buildSunflower(glyphs, cx, cy, scale, bEff, fPalette, time, isWilting);
          break;
        case 'hibiscus':
          this._buildHibiscus(glyphs, cx, cy, scale, bEff, fPalette, time, isWilting);
          break;
        case 'iris':
          this._buildIris(glyphs, cx, cy, scale, bEff, fPalette, time, isWilting);
          break;
        case 'thistle':
          this._buildThistle(glyphs, cx, cy, scale, bEff, fPalette, time, isWilting);
          break;
        case 'marigold':
          this._buildMarigold(glyphs, cx, cy, scale, bEff, fPalette, time, isWilting);
          break;
        case 'daffodil':
          this._buildDaffodil(glyphs, cx, cy, scale, bEff, fPalette, time, isWilting);
          break;
        case 'rose':
          this._buildRose(glyphs, cx, cy, scale, bEff, fPalette, time, isWilting);
          break;
        case 'dandelion':
          this._buildDandelion(glyphs, cx, cy, scale, bEff, fPalette, time, seedsBlown, isWilting);
          break;
        case 'tulip':
          this._buildTulip(glyphs, cx, cy, scale, bEff, fPalette, time, isWilting);
          break;
        case 'flytrap':
          this._buildFlytrap(glyphs, cx, cy, scale, bEff, fPalette, time, isWilting);
          break;
        default:
          this._buildSunflower(glyphs, cx, cy, scale, bEff, fPalette, time, isWilting);
      }

      return glyphs;
    }

    /**
     * Bounded Sunflower Architecture:
     * Central Fibonacci disc florets are strictly bounded within rDisc.
     * Ray petals radiate outwards from rDisc to frame the seed head with zero side bleeding.
     */
    static _buildSunflower(out, cx, cy, s, b, pal, time, isWilting = false) {
      const fcy = cy - 25 * s;

      // 1. Central Fibonacci Phyllotaxis Seed Disc (Strictly bounded inside rDisc)
      const rDisc = 22 * s * (0.35 + 0.65 * b);
      const numFlorets = Math.floor(40 * (0.35 + 0.65 * b));
      const goldenAngle = 2.3999632; // 137.5 degrees

      for (let k = 0; k < numFlorets; k++) {
        const rFrac = Math.sqrt((k + 0.5) / numFlorets);
        const r = rFrac * rDisc;
        const theta = k * goldenAngle;
        const px = cx + Math.cos(theta) * r;
        const py = fcy + Math.sin(theta) * (r * 0.88);

        let ch = '#';
        let col = pal.coreDeep;
        if (rFrac < 0.35) {
          ch = (k % 3 === 0) ? '8' : '&';
          col = isWilting ? '#523a1a' : pal.coreDeep;
        } else if (rFrac < 0.75) {
          ch = (k % 2 === 0) ? '*' : '#';
          col = isWilting ? '#634720' : pal.core;
        } else {
          ch = (k % 2 === 0) ? '%' : 'o';
          col = isWilting ? '#7a5b28' : pal.petalWarm;
        }

        out.push({
          x: px,
          y: py,
          char: ch,
          fg: col,
          size: Math.max(9, Math.round((10 + (1 - rFrac) * 3) * s))
        });
      }

      // 2. Radiant Golden Ray Petals (cradling the disc florets from rDisc outwards)
      if (b > 0.15) {
        const petalProgress = (b - 0.15) / 0.85;
        const numPetals = Math.floor(22 + 14 * petalProgress);
        const maxLen = 38 * s * petalProgress;
        const glyphsChoice = ["(", ")", "{", "}", "~", "S", "s", "%", "&"];

        const vPhase = (this._variant || 0) * 40;
        for (let i = 0; i < numPetals; i++) {
          const baseAngle = (i / numPetals) * 2 * Math.PI;
          const layers = [1.0, 0.78];
          // Each individual's ray petals differ in length (smooth, non-repeating pattern)
          const irregular = 1.0 + 0.16 * Math.sin(i * 2.7 + vPhase) + 0.08 * Math.sin(i * 5.3 + vPhase * 1.7);

          layers.forEach((layerScale, lIdx) => {
            const angle = baseAngle + (lIdx * Math.PI / numPetals);
            const petalReach = maxLen * layerScale * irregular;

            for (let seg = 1; seg <= 4; seg++) {
              const segFrac = seg / 4.0;
              const rDist = (rDisc * 0.92) + (segFrac * petalReach);
              const droop = isWilting ? (segFrac * segFrac * 14 * s) : 0;
              const curl = Math.sin(segFrac * Math.PI + i * 0.8) * 5 * s;
              const px = cx + Math.cos(angle) * rDist - Math.sin(angle) * curl;
              const py = fcy + Math.sin(angle) * (rDist * 0.88) + Math.cos(angle) * curl + droop;

              const ch = seg === 4 ? (lIdx === 0 ? "{" : "}") : glyphsChoice[(i * 2 + seg) % glyphsChoice.length];
              const col = isWilting
                ? (seg >= 3 ? '#997722' : '#886611')
                : (seg >= 3 ? pal.petal : pal.petalWarm);

              out.push({
                x: px,
                y: py,
                char: ch,
                fg: col,
                size: Math.max(10, Math.round((11 + seg * 1.8) * s)),
                rot: angle + Math.PI / 2
              });
            }
          });
        }
      }
    }

    static _buildHibiscus(out, cx, cy, s, b, pal, time, isWilting = false) {
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
      const spX = 9.0 * s * (0.5 + 0.5 * b);
      const spY = 12.5 * s * (0.5 + 0.5 * b);
      const startY = fcy - (rows.length * spY) / 2.0;

      rows.forEach((row, rIdx) => {
        const text = row[0];
        const col = isWilting ? '#8c6b2a' : row[1];
        const ly = startY + rIdx * spY + (isWilting ? (rIdx * 1.5 * s) : 0);
        const startX = cx - (text.length * spX) / 2.0;
        for (let cIdx = 0; cIdx < text.length; cIdx++) {
          const ch = text[cIdx];
          if (ch !== ' ') {
            out.push({ x: startX + cIdx * spX, y: ly, char: ch, fg: col, size: 13.5 * s });
          }
        }
      });

      // Golden stamen pushes forward as flower blooms!
      if (b > 0.3) {
        const stamenProgress = (b - 0.3) / 0.7;
        const droopY = isWilting ? 12 * s : 0;
        const stamenPts = [
          { dx: -6 * s * stamenProgress, dy: 5 * s, ch: '%' },
          { dx: -18 * s * stamenProgress, dy: -4 * s, ch: '/' },
          { dx: -30 * s * stamenProgress, dy: -16 * s, ch: '(' },
          { dx: -42 * s * stamenProgress, dy: -28 * s, ch: '~' },
          { dx: -52 * s * stamenProgress, dy: -38 * s, ch: 'o' },
          { dx: -58 * s * stamenProgress, dy: -44 * s, ch: '*' }
        ];
        stamenPts.forEach(pt => {
          out.push({ x: cx + pt.dx, y: fcy + pt.dy + droopY, char: pt.ch, fg: isWilting ? '#8a7024' : pal.stamen, size: 15 * s });
        });
      }
    }

    static _buildIris(out, cx, cy, s, b, pal, time, isWilting = false) {
      const fcy = cy - 20 * s;
      const standardsLeft = [
        { dx: -16 * s * b, dy: -20 * s, txt: "((" },
        { dx: -20 * s * b, dy: -36 * s, txt: "%%%" },
        { dx: -22 * s * b, dy: -54 * s, txt: "@@@" },
        { dx: -18 * s * b, dy: -72 * s, txt: "((((" },
        { dx: -10 * s * b, dy: -84 * s, txt: "\\\\" }
      ];
      const standardsRight = [
        { dx: 16 * s * b, dy: -20 * s, txt: "))" },
        { dx: 20 * s * b, dy: -36 * s, txt: "%%%" },
        { dx: 22 * s * b, dy: -54 * s, txt: "@@@" },
        { dx: 18 * s * b, dy: -72 * s, txt: "))))" },
        { dx: 10 * s * b, dy: -84 * s, txt: "//" }
      ];
      [...standardsLeft, ...standardsRight].forEach(pt => {
        for (let i = 0; i < pt.txt.length; i++) {
          out.push({
            x: cx + pt.dx + i * 7.5 * s,
            y: fcy + pt.dy + (isWilting ? 10 * s : 0),
            char: pt.txt[i],
            fg: isWilting ? '#635338' : pal.standard,
            size: 14 * s
          });
        }
      });

      // Iris Falls: cascade downwards from throat in bounded ribbons
      const fallSteps = Math.floor(9 + 5 * b);
      for (let side of [-1, 1]) {
        for (let i = 0; i <= fallSteps; i++) {
          const ft = i / fallSteps;
          const fx = cx + side * (12 * s + ft * 20 * s * b);
          const fy = fcy - 4 * s + (ft * 34 * s * b) + Math.sin(ft * Math.PI) * 6 * s + (isWilting ? 8 * s : 0);
          const ch = i === fallSteps ? (side < 0 ? "\\" : "/") : (i % 3 === 0 ? "@" : (i % 3 === 1 ? "#" : "%"));
          const col = isWilting ? '#604f32' : (i % 2 === 0 ? pal.fall : pal.standard);
          out.push({ x: fx, y: fy, char: ch, fg: col, size: Math.max(10, Math.round((12 + ft * 3) * s)) });
        }
      }

      if (b > 0.4) {
        const throat = [{ dy: -12 * s, txt: "|(@/9|" }, { dy: -2 * s, txt: "|%&%#|" }, { dy: 8 * s, txt: "\\b)|" }];
        throat.forEach(tr => {
          for (let i = 0; i < tr.txt.length; i++) {
            const ch = tr.txt[i];
            const col = isWilting ? '#7c6530' : ((ch === '@' || ch === '9' || ch === '&') ? pal.signal : pal.deep);
            out.push({ x: cx + (i - tr.txt.length / 2) * 8 * s, y: fcy + tr.dy, char: ch, fg: col, size: 14 * s });
          }
        });
      }
    }

    static _buildThistle(out, cx, cy, s, b, pal, time, isWilting = false) {
      const fcy = cy - 15 * s;
      const calyxChars = [":", ";", "%", "&", "#", "@", "|"];
      const rCalyx = 26 * s;
      for (let dy = 0; dy <= rCalyx * 1.3; dy += 6) {
        const widthAtY = Math.sin((dy / (rCalyx * 1.3)) * Math.PI) * rCalyx;
        for (let dx = -Math.floor(widthAtY); dx <= Math.floor(widthAtY); dx += 7) {
          const ch = calyxChars[(Math.abs(dx + dy)) % calyxChars.length];
          out.push({ x: cx + dx, y: fcy + dy, char: ch, fg: isWilting ? '#52482a' : pal.calyx, size: 12.5 * s });
        }
      }
      for (let plume = -4; plume <= 4; plume++) {
        const pAngle = (plume / 5.0) * 0.75 - Math.PI / 2.0;
        for (let step = 1; step <= 7; step++) {
          const dist = step * 11 * s * b;
          const px = cx + Math.cos(pAngle) * dist;
          const py = fcy + Math.sin(pAngle) * dist + (isWilting ? step * 2 * s : 0);
          const ch = step >= 5 ? '!' : '|';
          const col = isWilting ? '#6e5436' : (step >= 4 ? pal.brush : pal.brushDark);
          out.push({ x: px, y: py, char: ch, fg: col, size: 14 * s, rot: pAngle + Math.PI / 2 });
        }
      }
    }

    /**
     * Bounded Marigold Architecture:
     * Multi-tiered ruffled concentric domes of yellow, orange, and crimson frilled petals.
     * Perfectly radial and hemispherical with zero rectangular edge spill.
     */
    static _buildMarigold(out, cx, cy, s, b, pal, time, isWilting = false) {
      const fcy = cy - 20 * s;
      const numTiers = Math.floor(4 + 3 * b);
      const maxR = 30 * s * b;
      const chars = ["{", "}", "~", "%", "@", "#", "="];

      for (let tier = 1; tier <= numTiers; tier++) {
        const tierFrac = tier / numTiers;
        const tierR = tierFrac * maxR;
        const petalCount = Math.floor(6 + tier * 5);
        const col = isWilting
          ? '#826524'
          : (tierFrac < 0.4 ? pal.yellow : (tierFrac < 0.75 ? pal.orange : pal.crimson));

        for (let p = 0; p < petalCount; p++) {
          const ang = (p / petalCount) * 2 * Math.PI + (tier * 0.4);
          const r = tierR * (0.85 + 0.15 * Math.sin(p * 3 + tier + (this._variant || 0) * 30));
          const px = cx + Math.cos(ang) * r;
          const py = fcy + Math.sin(ang) * (r * 0.75) + (isWilting ? 6 * s : 0);
          const ch = chars[(tier * 2 + p) % chars.length];
          out.push({
            x: px,
            y: py,
            char: ch,
            fg: col,
            size: Math.max(10, Math.round((11 + tier * 1.2) * s)),
            rot: ang + Math.PI / 2
          });
        }
      }
    }

    static _buildDaffodil(out, cx, cy, s, b, pal, time, isWilting = false) {
      const fcy = cy - 20 * s;
      const gridChars = ["#", "*", "%", "#", "*"];
      for (let dy = -2; dy <= 2; dy++) {
        for (let dx = -2; dx <= 2; dx++) {
          const ch = gridChars[(Math.abs(dx + dy)) % gridChars.length];
          const col = (dx === 0 && dy === 0) ? (isWilting ? '#7d6824' : pal.inner) : (isWilting ? '#947a28' : pal.cup);
          out.push({ x: cx + dx * 9 * s, y: fcy + dy * 9 * s, char: ch, fg: col, size: 13.5 * s });
        }
      }
      for (let i = 0; i < 6; i++) {
        const ang = (i / 6.0) * 2 * Math.PI;
        for (let step = 1; step <= 5; step++) {
          const dist = 18 * s + step * 10 * s * b;
          const px = cx + Math.cos(ang) * dist;
          const py = fcy + Math.sin(ang) * dist + (isWilting ? step * 1.5 * s : 0);
          const ch = step === 5 ? '*' : (step >= 3 ? '^' : '+');
          out.push({ x: px, y: py, char: ch, fg: isWilting ? '#9e852a' : pal.petal, size: 14 * s, rot: ang + Math.PI / 2 });
        }
      }
    }

    /**
     * Dense English Rose Architecture:
     * Multi-tiered concentric spiraling whorls, velvet Fermat core, cupped mid petals,
     * scalloped outer reflexed petals, and basal sepals.
     */
    static _buildRose(out, cx, cy, s, b, pal, time, isWilting = false) {
      const fcy = cy - 22 * s;

      // 1. Basal protective sepals wrapping the rose cup
      const sepalPoints = [
        { dx: -18 * s, dy: 14 * s, ch: '\\' },
        { dx: -9 * s, dy: 18 * s, ch: '\\' },
        { dx: 0, dy: 20 * s, ch: 'v' },
        { dx: 9 * s, dy: 18 * s, ch: '/' },
        { dx: 18 * s, dy: 14 * s, ch: '/' }
      ];
      sepalPoints.forEach(sp => {
        out.push({
          x: cx + sp.dx,
          y: fcy + sp.dy,
          char: sp.ch,
          fg: isWilting ? '#52482a' : (pal.sepal || '#4ba032'),
          size: 14 * s
        });
      });

      // 2. Dense spiraling velvet core (Fibonacci / Fermat spiral)
      const coreCount = Math.floor(20 + 16 * b);
      const coreRMax = 15 * s * (0.35 + 0.65 * b);
      const goldenAngle = 2.3999632;
      const coreChars = ['@', '%', '&', '8', '0', 'Q', 'S'];
      for (let k = 0; k < coreCount; k++) {
        const rFrac = Math.sqrt((k + 0.5) / coreCount);
        const r = rFrac * coreRMax;
        const theta = k * goldenAngle;
        const px = cx + Math.cos(theta) * r;
        const py = fcy + Math.sin(theta) * (r * 0.72);
        const ch = coreChars[k % coreChars.length];
        const col = isWilting ? '#6e1d2c' : pal.dark;
        out.push({
          x: px,
          y: py,
          char: ch,
          fg: col,
          size: Math.max(10, Math.round((11 + (1 - rFrac) * 3) * s))
        });
      }

      // 3. Middle overlapping cupped petals & outer scalloped whorls
      const petalRings = [
        { count: 4, r: 22 * s * b, chars: ['(', ')', '{', '}', '%', '&'], col: isWilting ? '#7e2434' : pal.petal },
        { count: 5, r: 30 * s * b, chars: ['{', '}', '(', ')', 'S', 's'], col: isWilting ? '#8c2d3e' : pal.petal },
        { count: 6, r: 38 * s * b, chars: ['{', '}', '~', '(', ')', 'S'], col: isWilting ? '#99394d' : pal.light }
      ];

      petalRings.forEach((ring, rIdx) => {
        const numPetals = ring.count;
        for (let p = 0; p < numPetals; p++) {
          const baseAng = (p / numPetals) * 2 * Math.PI + (rIdx * 0.52);
          const span = (Math.PI * 2) / numPetals * 1.32; // natural overlapping petal arcs
          const steps = 5;
          for (let st = 0; st <= steps; st++) {
            const u = (st / steps) - 0.5;
            const ang = baseAng + u * span;
            const cupping = Math.cos(u * Math.PI);
            const r = ring.r * (0.84 + 0.20 * cupping);
            const droop = isWilting ? (st * 1.5 * s) : 0;
            const px = cx + Math.cos(ang) * r;
            const py = fcy + Math.sin(ang) * (r * 0.74) + droop;
            const ch = (st === 0 || st === steps)
              ? (u < 0 ? '(' : ')')
              : ring.chars[(p * 3 + st) % ring.chars.length];
            out.push({
              x: px,
              y: py,
              char: ch,
              fg: ring.col,
              size: Math.max(10, Math.round((12 + rIdx * 1.5) * s))
            });
          }
        }
      });
    }

    static _buildDandelion(out, cx, cy, s, b, pal, time, seedsBlown = false) {
      const fcy = cy - 20 * s;

      // Core receptacle
      out.push({ x: cx, y: fcy, char: '(#)', fg: pal.core, size: 15 * s });

      // If seeds were blown away, show bare seedhead with a few stragglers
      if (seedsBlown) {
        for (let i = 0; i < 6; i++) {
          const ang = (i / 6) * 2 * Math.PI;
          out.push({ x: cx + Math.cos(ang) * 16 * s, y: fcy + Math.sin(ang) * 16 * s, char: "'", fg: pal.seed, size: 12 * s, rot: ang + Math.PI / 2 });
        }
        return;
      }

      // Full dandelion fluffy seed clock
      const numSeeds = Math.floor(18 + 18 * b);
      const rClock = 42 * s * b;
      for (let i = 0; i < numSeeds; i++) {
        const ang = (i / numSeeds) * 2 * Math.PI;
        const r = rClock * (0.8 + 0.2 * Math.sin(i * 3));
        const px = cx + Math.cos(ang) * r;
        const py = fcy + Math.sin(ang) * r;
        const ch = (i % 3 === 0) ? '*' : ((i % 3 === 1) ? '·' : "'");
        out.push({ x: px, y: py, char: ch, fg: pal.seed, size: 13 * s, rot: ang + Math.PI / 2 });
      }
    }

    /**
     * Dense Sculpted Tulip Chalice Architecture:
     * Elegant goblet chalice with vertical striations, golden internal stamens,
     * basal receptacle, and flaring crown tepal tips.
     */
    static _buildTulip(out, cx, cy, s, b, pal, time, isWilting = false) {
      const fcy = cy - 22 * s;
      const cupHeight = 44 * s;
      const flare = 0.75 + 0.35 * b;
      const maxW = 21 * s * flare;
      const numLayers = 8;

      // 1. Glowing Interior Stamens (3 golden anthers on dark filaments)
      for (let st = -1; st <= 1; st++) {
        const sx = cx + st * 6 * s * flare;
        // Filament
        for (let sy = 0; sy < 3; sy++) {
          out.push({
            x: sx,
            y: fcy - (8 + sy * 5.5) * s,
            char: '|',
            fg: isWilting ? '#5e481c' : '#8a6010',
            size: 13 * s
          });
        }
        // Anther head
        out.push({
          x: sx,
          y: fcy - (23 + Math.abs(st) * 3) * s,
          char: '*',
          fg: isWilting ? '#a88a38' : pal.stamen,
          size: 14 * s
        });
      }

      // 2. Dense Chalice Body & Petal Striations (layer by layer from base to rim)
      for (let li = 0; li < numLayers; li++) {
        const vFrac = li / (numLayers - 1); // 0 = base, 1 = rim
        const ly = fcy + 12 * s - vFrac * cupHeight + (isWilting ? (vFrac * 4 * s) : 0);
        const cupProfile = Math.sin(vFrac * 0.86 * Math.PI);
        const layerW = (7 * s) + (maxW * cupProfile);

        // Left petal contour
        const leftChar = vFrac > 0.85 ? '/' : (vFrac > 0.3 ? '(' : '\\');
        const outerCol = isWilting ? '#7c2b3e' : pal.petal;
        out.push({ x: cx - layerW, y: ly, char: leftChar, fg: outerCol, size: 14 * s });

        // Right petal contour
        const rightChar = vFrac > 0.85 ? '\\' : (vFrac > 0.3 ? ')' : '/');
        out.push({ x: cx + layerW, y: ly, char: rightChar, fg: outerCol, size: 14 * s });

        // Interior shading & vertical striations
        const innerSteps = Math.max(1, Math.floor(layerW / (5.2 * s)));
        for (let j = -innerSteps + 1; j < innerSteps; j++) {
          const u = j / innerSteps;
          const ix = cx + u * layerW * 0.88;
          let ch = '|';
          let col = isWilting ? '#63212f' : pal.inner;
          if (Math.abs(u) < 0.25) {
            ch = (li % 2 === 0) ? '|' : '!';
            col = isWilting ? '#7c2b3e' : pal.petal;
          } else if (Math.abs(u) < 0.65) {
            ch = (u < 0) ? '(' : ')';
            col = (li > 4) ? (isWilting ? '#7c2b3e' : pal.petal) : (isWilting ? '#63212f' : pal.inner);
          } else {
            ch = (li % 2 === 0) ? '%' : '#';
            col = isWilting ? '#63212f' : pal.inner;
          }
          out.push({ x: ix, y: ly, char: ch, fg: col, size: 13.5 * s });
        }
      }

      // 3. Flared Crown Tepal Tips
      for (let t = -2; t <= 2; t++) {
        const tx = cx + t * (maxW * 0.42);
        const ty = fcy - 32 * s - (1 - Math.abs(t) * 0.25) * 6 * s + (isWilting ? 6 * s : 0);
        const ch = (t === 0) ? '^' : (t < 0 ? '/' : '\\');
        out.push({ x: tx, y: ty, char: ch, fg: isWilting ? '#7c2b3e' : pal.petal, size: 14 * s });
      }
    }

    /**
     * Dense Venus Flytrap (Dionaea muscipula) Architecture:
     * Realistic bivalve trap with green basal hinge, crimson digestive glandular carpet,
     * sensitive trigger spines, and bristling marginal cilia needle teeth!
     */
    static _buildFlytrap(out, cx, cy, s, b, pal, time, isWilting = false) {
      const fcy = cy - 20 * s;
      const isOpen = b > 0.3;
      const openSpread = isOpen ? (0.6 + 0.4 * b) : 0.2;

      // 1. Basal Hinge & Winged Petiole Joint
      for (let hx = -2; hx <= 2; hx++) {
        out.push({
          x: cx + hx * 6 * s,
          y: fcy + 14 * s,
          char: '#',
          fg: isWilting ? '#4a4422' : pal.jaw,
          size: 13.5 * s
        });
        out.push({
          x: cx + hx * 5 * s,
          y: fcy + 18 * s,
          char: (hx === 0 ? 'v' : (hx < 0 ? '\\' : '/')),
          fg: isWilting ? '#4a4422' : pal.jaw,
          size: 13.5 * s
        });
      }

      // 2. Dual Bivalve Lobes: Left (-1) and Right (+1)
      for (let side of [-1, 1]) {
        const lobeAngle = side * (0.34 + 0.34 * openSpread);
        const lobeLen = 32 * s;
        const lobeW = 16 * s;

        const numSteps = 7;
        for (let st = 1; st <= numSteps; st++) {
          const frac = st / numSteps;
          const lx = cx + Math.sin(lobeAngle) * (frac * lobeLen);
          const ly = fcy + 12 * s - Math.cos(lobeAngle) * (frac * lobeLen);

          // Outer green jaw rim (epidermis)
          const normX = -Math.cos(lobeAngle) * side;
          const normY = -Math.sin(lobeAngle) * side;
          const bulge = (0.5 + 0.5 * Math.sin(frac * Math.PI));
          const outerX = lx + normX * (lobeW * bulge);
          const outerY = ly + normY * (lobeW * bulge);
          const outerChar = side < 0 ? (st > 4 ? '/' : '(') : (st > 4 ? '\\' : ')');
          out.push({
            x: outerX,
            y: outerY,
            char: outerChar,
            fg: isWilting ? '#4a4422' : pal.jaw,
            size: 14 * s
          });

          // Crimson digestive glandular interior carpet
          const glandSteps = 3;
          for (let g = 0; g < glandSteps; g++) {
            const gFrac = (g + 0.5) / glandSteps;
            const gx = lx + normX * (lobeW * bulge * 0.82 * gFrac);
            const gy = ly + normY * (lobeW * bulge * 0.82 * gFrac);
            const gChar = (st % 2 === 0) ? (g % 2 === 0 ? '@' : '%') : (g % 2 === 0 ? '#' : '&');
            out.push({
              x: gx,
              y: gy,
              char: gChar,
              fg: isWilting ? '#5a1924' : pal.inside,
              size: 13 * s
            });
          }

          // Sensitive trigger hairs in center of lobe cavity
          if (st === 3 || st === 4) {
            const tx = lx + normX * (lobeW * bulge * 0.45);
            const ty = ly + normY * (lobeW * bulge * 0.45) - 3 * s;
            out.push({
              x: tx,
              y: ty,
              char: '!',
              fg: isWilting ? '#8c7d3a' : '#fff677',
              size: 12 * s
            });
          }

          // Marginal cilia teeth (long needle bristles along outer rim)
          const toothLen = (10 + 4 * Math.sin(frac * Math.PI)) * s;
          const toothAng = lobeAngle + (side * (Math.PI / 2.3));
          const toothX = outerX + Math.cos(toothAng) * toothLen;
          const toothY = outerY + Math.sin(toothAng) * toothLen;
          const toothChar = side < 0 ? (st % 2 === 0 ? '\\' : '!') : (st % 2 === 0 ? '/' : '!');
          out.push({
            x: toothX,
            y: toothY,
            char: toothChar,
            fg: isWilting ? '#aba182' : pal.teeth,
            size: 13.5 * s
          });
        }
      }

      // If closed / snapped shut: interlocking teeth across the central seam
      if (!isOpen) {
        for (let c = -4; c <= 4; c++) {
          out.push({
            x: cx + c * 5 * s,
            y: fcy - 12 * s,
            char: (c % 2 === 0 ? '/' : '\\'),
            fg: isWilting ? '#aba182' : pal.teeth,
            size: 14 * s
          });
        }
      }
    }
  }

  // =========================================================================
  // 6. GLYPH RENDERING (CANVAS SPRITE ATLAS + ROTATION) & PLAIN-TEXT RASTER
  // =========================================================================

  const FONT_STACK = '"Courier New", Consolas, monospace';

  /**
   * Glyph sprite atlas. Each (char, colour, device-pixel size) is rasterised once with
   * fillText into a shared atlas page and then blitted with drawImage. Re-assigning
   * ctx.font per glyph and drawing rotated text with fillText are both slow paths;
   * blitting cached sprites keeps rotated glyphs as cheap as upright ones.
   */
  class GlyphAtlas {
    constructor(options = {}) {
      // One large page keeps every blit on the same texture so the GPU can batch them
      this.pageSize = options.pageSize || 2048;
      this.maxPages = options.maxPages || 2;
      this.font = options.font || FONT_STACK;
      this.sprites = new Map();
      this.pages = [];
      this._newPage();
    }

    static isSupported() {
      return typeof OffscreenCanvas !== 'undefined' ||
        (typeof document !== 'undefined' && typeof document.createElement === 'function');
    }

    _createCanvas(w, h) {
      if (typeof OffscreenCanvas !== 'undefined') return new OffscreenCanvas(w, h);
      const c = document.createElement('canvas');
      c.width = w;
      c.height = h;
      return c;
    }

    _newPage() {
      const canvas = this._createCanvas(this.pageSize, this.pageSize);
      const ctx = canvas.getContext('2d');
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      this.page = { canvas, ctx, x: 0, y: 0, rowH: 0 };
      this.pages.push(this.page);
    }

    clear() {
      this.sprites.clear();
      this.pages = [];
      this._newPage();
    }

    /**
     * Sprites are rasterised at bucketed sizes (even device pixels above 14px) and scaled
     * to the exact size when drawn, which bounds the number of sprites per colour.
     */
    static bucket(px) {
      return px <= 14 ? px : Math.round(px / 2) * 2;
    }

    get(char, color, px) {
      const key = char + '\u0000' + color + '\u0000' + px;
      let sprite = this.sprites.get(key);
      if (sprite) return sprite;

      let page = this.page;
      const font = `${px}px ${this.font}`;
      page.ctx.font = font;
      const w = Math.ceil(page.ctx.measureText(char).width) + 4;
      const h = Math.ceil(px * 1.3) + 4;

      if (page.x + w > this.pageSize) {
        page.x = 0;
        page.y += page.rowH;
        page.rowH = 0;
      }
      if (page.y + h > this.pageSize) {
        // Generational flush: when every page is full, start over (sprites are cheap to rebuild)
        if (this.pages.length >= this.maxPages) this.clear();
        else this._newPage();
        page = this.page;
        page.ctx.font = font;
      }

      page.ctx.fillStyle = color;
      page.ctx.fillText(char, page.x + w / 2, page.y + h / 2);
      sprite = { canvas: page.canvas, sx: page.x, sy: page.y, w, h };
      page.x += w;
      page.rowH = Math.max(page.rowH, h);
      this.sprites.set(key, sprite);
      return sprite;
    }
  }

  class GlyphRenderer {
    constructor(options = {}) {
      this.atlas = (options.atlas !== false && GlyphAtlas.isSupported()) ? new GlyphAtlas(options) : null;
    }

    static get shared() {
      if (!GlyphRenderer._shared) GlyphRenderer._shared = new GlyphRenderer();
      return GlyphRenderer._shared;
    }

    /** Device-pixel ratio implied by the context's current transform. */
    static scaleOf(ctx) {
      if (ctx && typeof ctx.getTransform === 'function') {
        const m = ctx.getTransform();
        return Math.hypot(m.a, m.b) || 1;
      }
      return 1;
    }

    /**
     * Draw glyphs (CSS-pixel coordinates). Leaves the context with transform
     * (dpr, 0, 0, dpr, 0, 0) and globalAlpha 1.
     */
    draw(ctx, glyphs, dpr = GlyphRenderer.scaleOf(ctx)) {
      if (!ctx || !glyphs || glyphs.length === 0) return;
      if (!this.atlas || typeof ctx.setTransform !== 'function') {
        this._drawText(ctx, glyphs);
        return;
      }

      let alpha = 1;
      ctx.globalAlpha = 1;
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      let identity = true;

      for (let i = 0; i < glyphs.length; i++) {
        const g = glyphs[i];
        const a = g.alpha !== undefined ? g.alpha : 1;
        if (a <= 0.01) continue;
        if (a !== alpha) {
          ctx.globalAlpha = a;
          alpha = a;
        }

        const exact = Math.max(4, g.size * dpr);
        const px = GlyphAtlas.bucket(Math.round(exact));
        const sp = this.atlas.get(g.char, g.fg, px);
        const k = exact / px;
        const dw = sp.w * k;
        const dh = sp.h * k;
        const rot = g.rot || 0;

        if (rot > -0.02 && rot < 0.02) {
          if (!identity) {
            ctx.setTransform(1, 0, 0, 1, 0, 0);
            identity = true;
          }
          // Whole-pixel destinations keep upright glyphs crisp
          ctx.drawImage(sp.canvas, sp.sx, sp.sy, sp.w, sp.h,
            Math.round(g.x * dpr - dw / 2), Math.round(g.y * dpr - dh / 2), dw, dh);
        } else {
          const c = Math.cos(rot);
          const s = Math.sin(rot);
          ctx.setTransform(c, s, -s, c, g.x * dpr, g.y * dpr);
          identity = false;
          ctx.drawImage(sp.canvas, sp.sx, sp.sy, sp.w, sp.h, -dw / 2, -dh / 2, dw, dh);
        }
      }

      ctx.globalAlpha = 1;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }

    // Fallback for environments without an atlas (e.g. minimal mock contexts)
    _drawText(ctx, glyphs) {
      if (typeof ctx.fillText !== 'function') return;
      if (typeof ctx.save === 'function') ctx.save();
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      let font = '';
      let fill = '';
      for (let i = 0; i < glyphs.length; i++) {
        const g = glyphs[i];
        const f = `${Math.round(g.size)}px ${FONT_STACK}`;
        if (f !== font) { ctx.font = f; font = f; }
        if (g.fg !== fill) { ctx.fillStyle = g.fg; fill = g.fg; }
        ctx.globalAlpha = g.alpha !== undefined ? g.alpha : 1;
        ctx.fillText(g.char, g.x, g.y);
      }
      if (typeof ctx.restore === 'function') ctx.restore();
    }
  }

  /**
   * Rasterise glyphs into a character grid for terminals, READMEs and chat.
   * Fits the drawing into cols x rows while correcting for the ~1:2 aspect of
   * terminal character cells, and maps rotated line glyphs to the nearest of | / - \.
   */
  class TextRasterizer {
    static orient(char, rot) {
      const base = { '|': 0, '!': 0, '/': Math.PI / 4, '-': Math.PI / 2, '~': Math.PI / 2, '\\': -Math.PI / 4 }[char];
      if (base === undefined || !rot) return char;
      let a = (base + rot) % Math.PI;
      if (a < 0) a += Math.PI;
      const idx = Math.round(a / (Math.PI / 4)) % 4;
      if (char === '~' && idx === 2) return '~';
      if (char === '!' && idx === 0) return '!';
      return ['|', '/', '-', '\\'][idx];
    }

    static rasterize(glyphs, cols = 40, rows = 35, options = {}) {
      const aspect = options.aspect || 0.5; // cell width / cell height
      const grid = Array.from({ length: rows }, () => Array(cols).fill(' '));
      const visible = glyphs.filter(g => g.char && g.char.trim() !== '' && (g.alpha === undefined || g.alpha > 0.2));
      if (visible.length === 0) return grid.map(r => r.join('')).join('\n');

      let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
      visible.forEach(g => {
        minX = Math.min(minX, g.x); maxX = Math.max(maxX, g.x);
        minY = Math.min(minY, g.y); maxY = Math.max(maxY, g.y);
      });
      const cellH = Math.max(options.minCell || 10, (maxY - minY + 1) / rows, (maxX - minX + 1) / (cols * aspect));
      const cellW = cellH * aspect;
      const offX = (cols * cellW - (maxX - minX)) / 2;
      const offY = rows * cellH - (maxY - minY) - cellH * 0.5; // sit on the bottom row

      visible.forEach(g => {
        const c = Math.floor((g.x - minX + offX) / cellW);
        const r = Math.floor((g.y - minY + offY) / cellH);
        if (r >= 0 && r < rows && c >= 0 && c < cols) {
          grid[r][c] = TextRasterizer.orient(g.char.length > 1 ? g.char[1] || g.char[0] : g.char, g.rot);
        }
      });
      return grid.map(r => r.join('').replace(/\s+$/, '')).join('\n');
    }
  }

  /**
   * Spatially coherent wind: gust fronts travel across the meadow so neighbouring plants
   * bend together and the wave visibly rolls from one side to the other.
   */
  class WindField {
    constructor(seed = 7) {
      this.noise = new SimplexNoise(seed);
    }
    sample(x, t) {
      return clamp(this.noise.fbm2(x * 0.0022 - t * 0.32, t * 0.07, 2) * 1.4, -1, 1);
    }
  }

  // =========================================================================
  // 7. LIVING MEADOW GRASS (LIFECYCLE: SPROUT -> GROW -> WILT -> DIE -> RESEED)
  // =========================================================================

  class GrassTuft {
    constructor(x, groundY, seed = 123, initialLife = null) {
      this.x = x;
      this.groundY = groundY;
      this.seed = seed;
      const rng = new PRNG(seed);

      this.maxHeight = rng.range(16, 36);
      this.numBlades = rng.choice([2, 3, 3, 4]);
      this.bladeOffsets = [];
      this.bladeCurves = [];
      this.bladeHeights = [];
      for (let i = 0; i < this.numBlades; i++) {
        this.bladeOffsets.push(rng.range(-8, 8));
        this.bladeCurves.push(rng.range(-0.35, 0.35));
        this.bladeHeights.push(rng.range(0.7, 1.0));
      }

      // Lifecycle [0.0, 1.0]:
      // 0.00 - 0.22: Sprout (tender pale-green shoots emerging from soil)
      // 0.22 - 0.68: Grow (lush chlorophyll blades swaying in breeze)
      // 0.68 - 0.88: Wilt (drooping yellow-green to golden-amber straw)
      // 0.88 - 1.00: Die (crumbling dry brown stubble/mulch)
      // >= 1.00: Reseed / Reset to fresh sprout!
      this.life = initialLife !== null ? initialLife : rng.range(0.0, 0.95);
      this.lifeSpeed = rng.range(0.02, 0.045); // full life cycle lasts ~25-50s
      this.nourishBoost = 0.0;
      this._updatePhase();
    }

    _updatePhase() {
      if (this.life < 0.22) {
        this.phase = 'sprout';
      } else if (this.life < 0.68) {
        this.phase = 'grow';
      } else if (this.life < 0.88) {
        this.phase = 'wilt';
      } else {
        this.phase = 'die';
      }
    }

    update(dt, timeSpeed = 1.0) {
      const effectiveDt = dt * timeSpeed;
      const speed = this.lifeSpeed * (1.0 + this.nourishBoost * 2.5);
      this.life += effectiveDt * speed;

      if (this.nourishBoost > 0) {
        this.nourishBoost = Math.max(0, this.nourishBoost - dt * 0.35);
      }

      // Cycle completion: reseed into a fresh green sprout!
      if (this.life >= 1.0) {
        this.life = 0.0;
        this.x += (Math.random() - 0.5) * 8; // subtle organic drift
      }

      this._updatePhase();
    }

    feed(amount = 0.35) {
      this.nourishBoost = Math.min(1.0, this.nourishBoost + amount);
      if (this.phase === 'wilt' || this.phase === 'die') {
        this.life = 0.04;
        this.phase = 'sprout';
      }
    }

    generateGlyphs(time = 0, windStrength = 0.5, pointer = null, palette = null, gust = 0) {
      const glyphs = [];
      const gy = this.groundY;
      const gx = this.x;

      let pointerDeflection = 0;
      if (pointer && pointer.active) {
        const dx = pointer.x - gx;
        const dy = pointer.y - gy;
        const dist = Math.hypot(dx, dy);
        if (dist < 75) {
          pointerDeflection = (dx > 0 ? -1 : 1) * (1.0 - dist / 75) * 14;
        }
      }

      const windSway = (Math.sin(time * 2.4 + gx * 0.06) * (0.6 + 0.4 * Math.abs(gust)) + gust * 1.2) * (windStrength * 7);

      if (this.phase === 'sprout') {
        // STAGE 1: SPROUT
        const progress = this.life / 0.22;
        const sproutH = Math.max(4, Math.floor(12 * progress));
        const col = this.nourishBoost > 0.1 ? '#aaff88' : '#77ee55';
        glyphs.push({ x: gx, y: gy - sproutH * 0.5, char: progress < 0.5 ? "'" : "|", fg: col, size: 11 });
        if (progress > 0.45) {
          glyphs.push({ x: gx + 3, y: gy - sproutH, char: "/", fg: '#99ff77', size: 10 });
        }
      } else if (this.phase === 'grow') {
        // STAGE 2: GROW
        const growProgress = (this.life - 0.22) / 0.46;
        const curH = this.maxHeight * (0.65 + 0.35 * Math.min(1.0, growProgress * 1.4));
        const colBlade = this.nourishBoost > 0.1 ? '#99ffbb' : (palette ? palette.stem : '#55e64b');
        const colBladeDark = palette ? palette.stemDark : '#2da82b';

        for (let b = 0; b < this.numBlades; b++) {
          const bh = curH * this.bladeHeights[b];
          const bx = gx + this.bladeOffsets[b];
          const bCurve = this.bladeCurves[b] * 20;
          const steps = Math.max(2, Math.floor(bh / 8));

          let prevX = bx;
          for (let s = 1; s <= steps; s++) {
            const st = s / steps;
            const sy = gy - (s * 8);
            const sway = (windSway + pointerDeflection) * st * st + (bCurve * st);
            glyphs.push({
              x: bx + sway,
              y: sy,
              char: "|",
              fg: st > 0.5 ? colBlade : colBladeDark,
              size: Math.round(11 + st * 2),
              rot: Math.atan2(bx + sway - prevX, 8)
            });
            prevX = bx + sway;
          }
        }
      } else if (this.phase === 'wilt') {
        // STAGE 3: WILT
        const wiltProgress = (this.life - 0.68) / 0.20;
        const curH = this.maxHeight * (1.0 - wiltProgress * 0.35);
        const colWilt = palette ? palette.wilted : '#c8a832';
        const colStraw = '#b08e2f';

        for (let b = 0; b < this.numBlades; b++) {
          const bh = curH * this.bladeHeights[b];
          const bx = gx + this.bladeOffsets[b];
          const droop = (this.bladeCurves[b] >= 0 ? 1 : -1) * (14 + wiltProgress * 16);
          const steps = Math.max(2, Math.floor(bh / 8));

          let prevX = bx;
          let prevY = gy;
          for (let s = 1; s <= steps; s++) {
            const st = s / steps;
            const sy = gy - (s * 6) + (st * st * 8);
            const sway = (windSway * 0.35) * st + (droop * st);
            glyphs.push({
              x: bx + sway,
              y: sy,
              char: st > 0.75 ? "~" : "|",
              fg: st > 0.5 ? colStraw : colWilt,
              size: 11,
              rot: st > 0.75 ? 0 : Math.atan2(bx + sway - prevX, Math.max(0.5, prevY - sy))
            });
            prevX = bx + sway;
            prevY = sy;
          }
        }
      } else {
        // STAGE 4: DIE
        const colMulch = palette ? palette.dead : '#6b4f23';
        const colStubble = '#4a3618';
        glyphs.push({ x: gx - 3, y: gy + 3, char: ".", fg: colMulch, size: 10 });
        glyphs.push({ x: gx, y: gy + 1, char: "_", fg: colStubble, size: 11 });
        glyphs.push({ x: gx + 4, y: gy + 4, char: ",", fg: colMulch, size: 9 });
      }

      return glyphs;
    }
  }

  // =========================================================================
  // 8. THE ASCIIPLANT CLASS
  // =========================================================================

  const SPECIES = ['sunflower', 'hibiscus', 'iris', 'thistle', 'marigold', 'daffodil', 'rose', 'dandelion', 'tulip', 'flytrap'];

  // Biological-age landmarks (in growth units n: 0 -> 1 grows, 1 -> 21 mature prime)
  const PRIME_END = 21.0;
  const LIFE_END = 23.5;
  const BASE_AGING_RATE = 0.025; // biological age per second at 1x for an average plant

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
        branching: this.branching,
        genome: options.genome
      });
      // Metabolic rate is inherited (genome vigour) unless explicitly overridden
      this.metabolicRate = options.metabolicRate !== undefined ? options.metabolicRate : this.genome.vigor;

      this.pointer = { x: 0, y: 0, active: false };
      this.growthBoost = 0.0;
      this.vitality = 1.0;
      this.seedsBlown = false;
      this.seedRegenTimer = 0.0;
      this.clock = 0.0;
    }

    get genome() {
      return this.simulator.genome;
    }

    /** Replace (part of) the genome, e.g. from the Parametric Lab; keeps age & seed. */
    setGenome(traits) {
      const next = traits instanceof Genome ? traits : new Genome(Object.assign(this.genome.toJSON(), traits));
      this.simulator.applyGenome(next);
      this.metabolicRate = next.vigor;
    }

    /**
     * Fast-forward member subcycles (leaf unfurling, branch elongation) at the current
     * age, so a freshly (re)generated specimen appears as it would have grown.
     */
    settle(seconds = 12, step = 0.25) {
      for (let t = 0; t < seconds; t += step) this.simulator.updateMembers(step, 1.0, this.age);
      if (this.bloom !== null) this.setBloom(this.bloom);
    }

    feed(amount = 0.20) {
      this.growthBoost = Math.min(0.65, this.growthBoost + amount);
      this.vitality = Math.min(1.4, this.vitality + 0.2);
      this.simulator.feedMembers(amount);
    }

    update(dt, timeSpeed = 1.0) {
      this.clock += dt * timeSpeed;
      this.simulator.updateMembers(dt, timeSpeed, this.age);
    }

    /**
     * Biological age gained over dt seconds of garden time. Growth speed wanders with
     * noise; the life factor stretches the mature prime (long-lived individuals stay in
     * their prime for longer) without moving the biological landmarks themselves.
     */
    agingDelta(dt, timeSpeed = 1.0) {
      const longevity = (this.age >= 1.0 && this.age < PRIME_END) ? 1.0 / this.genome.lifeFactor : 1.0;
      return dt * timeSpeed * BASE_AGING_RATE * (this.metabolicRate || 1.0) * this.simulator.growthNoise(this.clock) * longevity;
    }

    /**
     * Restart this individual from a new seed. With { inherit: true } the new genome is a
     * mutated copy of the current one (self-seeding) instead of an unrelated random one.
     */
    reseed(newSeed = Math.floor(Math.random() * 1000000), options = {}) {
      const genome = options.genome || (options.inherit ? this.genome.mutate(newSeed) : Genome.random(this.type, newSeed));
      this.seed = newSeed;
      this.simulator.reseedGenetics(newSeed, genome);
      this.age = 0.04;
      this.bloom = null;
      this.metabolicRate = genome.vigor;
      this.growthBoost = 0.0;
      this.vitality = 1.0;
      this.seedsBlown = false;
      this.seedRegenTimer = 0.0;
      this.clock = 0.0;
    }

    setAge(val) {
      this.age = Math.max(0.0, val);
    }

    setBloom(val) {
      this.bloom = val !== null ? clamp(val, 0.0, 1.0) : null;
      if (this.bloom !== null && this.simulator && this.simulator.members && this.simulator.members.apicalFlower) {
        this.simulator.members.apicalFlower.bloom = this.bloom;
        if (this.bloom > 0.4) this.simulator.members.apicalFlower.state = 'blooming';
      }
    }

    get effectiveBloom() {
      if (this.bloom !== null) return this.bloom;
      if (this.simulator && this.simulator.members && this.simulator.members.apicalFlower && this.simulator.members.apicalFlower.state !== 'dormant') {
        return this.simulator.members.apicalFlower.bloom;
      }
      const gAge = Math.min(1.0, this.age);
      let b = smoothstep(0.42, 0.88, gAge);
      if (this.age > PRIME_END) {
        const sen = clamp((this.age - PRIME_END) / 2.5, 0.0, 1.0);
        b = Math.max(0.0, b * (1.0 - sen * 0.65));
      }
      return b;
    }

    getHeadPosition(originX, groundY) {
      const pData = this.simulator.simulate(this.age, this.bloom, 0, 0);
      const lastNode = pData.stemNodes && pData.stemNodes.length > 0 ? pData.stemNodes[pData.stemNodes.length - 1] : null;
      const apexX = originX + (lastNode ? lastNode.x : 0);
      const apexY = groundY - (lastNode ? lastNode.y : this.height * 0.8);
      const tilt = pData.headTilt || 0;
      const tiltX = apexX + Math.sin(tilt) * 18;
      const tiltY = apexY - Math.cos(tilt) * 14;
      const fScale = pData.flowerScale || 1.0;
      const headOffsetY = (this.type === 'dandelion' || this.type === 'tulip') ? -20 * fScale : 0;
      return {
        x: tiltX,
        y: tiltY + headOffsetY
      };
    }

    setPalette(name) {
      if (PALETTES[name]) this.paletteName = name;
    }

    /** This individual's colours: the base palette tinted by its genome. */
    getPalette() {
      return this.genome.tintPalette(PALETTES[this.paletteName] || PALETTES.botanical);
    }

    generateGlyphs(originX, groundY, time = 0, windStrength = 0.5, gust = 0) {
      let pointerDist = null;
      if (this.pointer.active && this.pointerMode !== 'none') {
        pointerDist = {
          dx: this.pointer.x - originX,
          dy: this.pointer.y - (groundY - this.height * 0.7),
          mode: this.pointerMode,
          strength: 1.0
        };
      }

      const pData = this.simulator.simulate(this.age, this.bloom, time, windStrength, pointerDist, gust);
      const palette = this.getPalette();
      return BotanicalArchitect.generatePlantGlyphs(pData, originX, groundY, palette, this.seed, time, this.seedsBlown);
    }

    /**
     * Render through the shared glyph atlas (rotated glyphs, no per-glyph font changes).
     * options.bloom adds a cheap downscaled glow pass over the whole canvas.
     */
    renderToCanvas(ctx, originX, groundY, time = 0, windStrength = 0.5, options = {}) {
      const glyphs = this.generateGlyphs(originX, groundY, time, windStrength, options.gust || 0);
      GlyphRenderer.shared.draw(ctx, glyphs);

      if (options.bloom && ctx && ctx.canvas) {
        if (!this._bloom) this._bloom = new BloomPass();
        this._bloom.apply(ctx, ctx.canvas.width, ctx.canvas.height);
      }
    }

    toPlainText(cols = 40, rows = 35) {
      const glyphs = this.generateGlyphs(0, 0, 0, 0);
      return TextRasterizer.rasterize(glyphs, cols, rows);
    }
  }

  /**
   * Screen-space glow: blur a 1/3-scale copy of the frame and add it back with 'lighter'.
   * One blur per frame regardless of glyph count (vs. thousands with shadowBlur).
   */
  class BloomPass {
    constructor() {
      this.canvas = typeof document !== 'undefined' ? document.createElement('canvas') : null;
      this.ctx = this.canvas ? this.canvas.getContext('2d') : null;
    }

    /** width/height are the source canvas size in device pixels. */
    apply(ctx, width, height, strength = 1.0) {
      if (!this.ctx || !ctx || !ctx.canvas) return;
      const bw = Math.max(10, Math.floor(width / 3));
      const bh = Math.max(10, Math.floor(height / 3));
      if (this.canvas.width !== bw || this.canvas.height !== bh) {
        this.canvas.width = bw;
        this.canvas.height = bh;
      }
      const b = this.ctx;
      b.clearRect(0, 0, bw, bh);
      if (typeof b.filter !== 'undefined') b.filter = 'blur(2.5px)';
      b.drawImage(ctx.canvas, 0, 0, bw, bh);
      if (typeof b.filter !== 'undefined') b.filter = 'none';

      ctx.save();
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.globalCompositeOperation = 'lighter';
      // Tier 1: luminous inner core. Tier 2: soft atmospheric halo.
      ctx.globalAlpha = 0.38 * strength;
      ctx.drawImage(this.canvas, 0, 0, width, height);
      ctx.globalAlpha = 0.16 * strength;
      ctx.drawImage(this.canvas, -6, -6, width + 12, height + 12);
      ctx.restore();
    }
  }

  // =========================================================================
  // 9. THE ASCIIGARDEN CLASS (LIVING, SELF-SEEDING MEADOW)
  // =========================================================================

  class AsciiGarden {
    constructor(canvas, options = {}) {
      this.canvas = typeof canvas === 'string' && typeof document !== 'undefined' ? document.querySelector(canvas) : canvas;
      this.ctx = this.canvas && typeof this.canvas.getContext === 'function' ? this.canvas.getContext('2d') : null;
      this.plants = [];
      this.windStrength = options.wind !== undefined ? options.wind : 0.6;
      this.windTime = 0;
      this.wind = new WindField(options.windSeed || 7);
      this.particles = []; // Floating pollen, seeds, petals, sunlight motes
      this.isRunning = false;
      this.paletteName = options.palette || 'botanical';
      this.pointer = { x: -999, y: -999, active: false };
      this.renderer = options.renderer || GlyphRenderer.shared;
      this.bloomPass = new BloomPass();
      this.bloom = options.bloom !== false;

      // Lifecycle model:
      //  'reproduce' (default) — flowers set seed, seeds drift and germinate in new spots,
      //                          dead plants are removed: a self-sustaining population.
      //  'respawn'             — a dead plant is reborn in place (single-specimen embeds).
      this.lifecycle = options.lifecycle || 'reproduce';
      this.seedGermination = options.seedGermination !== undefined ? options.seedGermination : 0.12;
      this.minSpacing = options.minSpacing !== undefined ? options.minSpacing : 28;
      this.maxPlants = options.maxPlants || null;   // default derived from width
      this.minPlants = options.minPlants !== undefined ? options.minPlants : null;
      this.maxSpeciesShare = options.maxSpeciesShare !== undefined ? options.maxSpeciesShare : 0.3;
      // Seeds of random species occasionally blow in from outside the meadow (diversity)
      this.immigration = options.immigration !== false;
      this._immigrationTimer = 20 + Math.random() * 20;

      this.reducedMotion = options.reducedMotion !== undefined
        ? !!options.reducedMotion
        : (typeof window !== 'undefined' && typeof window.matchMedia === 'function' &&
          window.matchMedia('(prefers-reduced-motion: reduce)').matches);

      // Time control engine
      this.timeSpeed = options.timeSpeed !== undefined ? options.timeSpeed : 1.0; // 0 = paused, 1 = normal, 3 = fast
      this.onDandelionBlow = null;
      this.onSeedGerminate = null;
      this.onPlantDeath = null;
      this.onPlantReseed = null;

      // Living Meadow Grass along the soil line
      this.grass = [];
      this.enableGrass = options.grass !== false;

      this._listeners = [];
      this._setupEvents();
      this.resize();
    }

    get groundY() {
      return (this.cssHeight || 600) - 50;
    }

    get capacity() {
      return this.maxPlants || clamp(Math.floor((this.cssWidth || 800) / 120), 4, 16);
    }

    get floor() {
      return this.minPlants !== null ? this.minPlants : clamp(Math.floor((this.cssWidth || 800) / 240), 2, 8);
    }

    resize() {
      if (!this.canvas) return;
      const rect = typeof this.canvas.getBoundingClientRect === 'function'
        ? this.canvas.getBoundingClientRect()
        : { width: this.canvas.width || 800, height: this.canvas.height || 600 };
      const dpr = typeof window !== 'undefined' ? Math.min(2, window.devicePixelRatio || 1) : 1;
      this.dpr = dpr;
      this.cssWidth = rect.width || 800;
      this.cssHeight = rect.height || 600;
      this.canvas.width = Math.round(this.cssWidth * dpr);
      this.canvas.height = Math.round(this.cssHeight * dpr);
      if (this.ctx && typeof this.ctx.setTransform === 'function') this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      else if (this.ctx && typeof this.ctx.scale === 'function') this.ctx.scale(dpr, dpr);

      this._soilGlyphs = [];
      for (let gx = 0; gx < this.cssWidth; gx += 16) {
        this._soilGlyphs.push({ x: gx, y: this.groundY + 12, char: '-', fg: '#225528', size: 12 });
      }
      this._initGrass();
    }

    _initGrass() {
      this.grass = [];
      if (!this.enableGrass) return;
      const w = this.cssWidth || 800;
      const gy = this.groundY;
      const tuftSpacing = 22;
      const count = Math.max(1, Math.floor(w / tuftSpacing));
      for (let i = 0; i < count; i++) {
        const gx = (i + 0.5) * tuftSpacing + (Math.sin(i * 1.7) * 6);
        const seed = Math.floor(i * 137 + 42);
        const initLife = (i * 0.13) % 1.0;
        this.grass.push(new GrassTuft(gx, gy, seed, initLife));
      }
    }

    getPalette() {
      return PALETTES[this.paletteName] || PALETTES.botanical;
    }

    _listen(target, type, fn) {
      target.addEventListener(type, fn);
      this._listeners.push([target, type, fn]);
    }

    _setupEvents() {
      if (!this.canvas || typeof this.canvas.addEventListener !== 'function') return;
      const local = e => {
        const rect = typeof this.canvas.getBoundingClientRect === 'function' ? this.canvas.getBoundingClientRect() : { left: 0, top: 0 };
        return { x: e.clientX - rect.left, y: e.clientY - rect.top };
      };

      this._listen(this.canvas, 'mousemove', e => {
        const p = local(e);
        this.pointer.x = p.x;
        this.pointer.y = p.y;
        this.pointer.active = true;

        if (Math.random() < 0.25) {
          this.particles.push({
            x: this.pointer.x + (Math.random() - 0.5) * 20,
            y: this.pointer.y + (Math.random() - 0.5) * 20,
            vx: (Math.random() - 0.5) * 1.5 + (this.windStrength * 0.8),
            vy: -Math.random() * 1.5 - 0.5,
            char: Math.random() < 0.5 ? '*' : (Math.random() < 0.5 ? '·' : '~'),
            color: '#ffe650',
            life: 1.0,
            decay: 0.018 + Math.random() * 0.01
          });
        }
      });

      this._listen(this.canvas, 'mouseleave', () => {
        this.pointer.active = false;
      });

      // Click to blow dandelion seeds if clicking near a dandelion head!
      this._listen(this.canvas, 'click', e => {
        const p = local(e);
        this.checkDandelionBlow(p.x, p.y);
      });

      if (typeof window !== 'undefined' && typeof window.addEventListener === 'function') {
        this._listen(window, 'resize', () => this.resize());
      }
    }

    /** Stop the loop and detach every listener (call when removing the canvas). */
    destroy() {
      this.stop();
      this._listeners.forEach(([t, type, fn]) => t.removeEventListener(type, fn));
      this._listeners = [];
    }

    /**
     * Check if a coordinate hits any blooming dandelion flower head
     */
    checkDandelionBlow(clickX, clickY) {
      let hit = false;
      const groundY = this.groundY;
      this.plants.forEach(({ x: plantX, plant }) => {
        if (plant.type === 'dandelion' && !plant.seedsBlown && plant.age < PRIME_END && (plant.effectiveBloom > 0.35 || plant.age > 0.50)) {
          const head = plant.getHeadPosition(plantX, groundY);
          const dist = Math.hypot(clickX - head.x, clickY - head.y);
          if (dist < 75) {
            this.blowDandelion(plant, head.x, head.y);
            hit = true;
          }
        }
      });
      return hit;
    }

    /**
     * Dandelion seed blow off: releases 32 parachute seeds that swing and have 1/20 chance
     * to sprout! Each seed carries a mutated copy of the parent genome.
     */
    blowDandelion(plant, originX, originY) {
      plant.seedsBlown = true;
      plant.seedRegenTimer = 18.0; // Regenerates in 18s

      const seedChars = ['*', '·', '~', '°', '✦'];
      for (let i = 0; i < 32; i++) {
        const angle = -Math.PI * 0.5 + (Math.random() - 0.5) * 1.3;
        const speed = 2.0 + Math.random() * 4.5;
        this.particles.push({
          x: originX + (Math.random() - 0.5) * 16,
          y: originY + (Math.random() - 0.5) * 16,
          vx: Math.cos(angle) * speed + (this.windStrength * 1.5),
          vy: Math.sin(angle) * speed - 1.5,
          char: seedChars[Math.floor(Math.random() * seedChars.length)],
          color: '#ffffff',
          life: 1.0,
          decay: 0.003 + Math.random() * 0.002, // long floating life
          isDandelionSeed: true,
          parent: plant,
          swingPhase: Math.random() * Math.PI * 2,
          swingSpeed: 2.5 + Math.random() * 2.0
        });
      }

      if (typeof this.onDandelionBlow === 'function') {
        this.onDandelionBlow(plant, originX, originY);
      }
    }

    /**
     * Release n seeds from a plant's flower head. They fall under gravity, drift with the
     * wind field, and may germinate where they land (see _landSeed).
     */
    releaseSeeds(plant, originX, count = 3) {
      const head = plant.getHeadPosition(originX, this.groundY);
      const pal = plant.getPalette();
      const fPal = pal.flowers[plant.type] || pal.flowers.sunflower;
      const color = fPal.core || fPal.inner || fPal.deep || fPal.calyx || '#c8a060';
      for (let i = 0; i < count; i++) {
        this.particles.push({
          x: head.x + (Math.random() - 0.5) * 24,
          y: head.y + (Math.random() - 0.5) * 10,
          vx: (Math.random() - 0.5) * 2.4,
          vy: -Math.random() * 1.2,
          char: Math.random() < 0.5 ? '.' : ',',
          color,
          life: 1.0,
          decay: 0.0,
          isSeed: true,
          parent: plant,
          guaranteed: false
        });
      }
    }

    _canGerminateAt(x, type) {
      if (x < 30 || x > (this.cssWidth || 800) - 30) return false;
      if (this.plants.length >= this.capacity) return false;
      // Competition: no species may crowd out the rest of the meadow
      const sameSpecies = this.plants.filter(p => p.plant.type === type).length;
      if (type && sameSpecies >= Math.max(2, Math.ceil(this.capacity * this.maxSpeciesShare))) return false;
      return !this.plants.some(p => Math.abs(p.x - x) < this.minSpacing);
    }

    /** A wind-borne seed of a random species drifting in from the upwind edge. */
    spawnImmigrantSeed(species = SPECIES[Math.floor(Math.random() * SPECIES.length)]) {
      this.particles.push({
        x: -10,
        y: 60 + Math.random() * (this.groundY * 0.5),
        vx: 1.2 + Math.random() * 1.5,
        vy: 0.2,
        char: '*',
        color: '#e8e2c8',
        life: 1.0,
        decay: 0.0,
        isSeed: true,
        floaty: true,
        species,
        parent: null
      });
    }

    _landSeed(p) {
      const parent = p.parent;
      const chance = p.isDandelionSeed ? 0.05 : (p.floaty ? 0.6 : this.seedGermination);
      const needed = this.plants.length < this.floor;
      if (!(p.guaranteed || needed || Math.random() < chance)) return null;
      const x = clamp(p.x, 40, (this.cssWidth || 800) - 40);
      const type = parent ? parent.type : (p.species || 'dandelion');
      if (!this._canGerminateAt(x, type)) return null;

      const seed = Math.floor(Math.random() * 1000000);
      const seedling = this.addPlant(x, {
        type,
        age: 0.04,
        height: parent ? parent.height * (0.92 + Math.random() * 0.16) : (type === 'dandelion' ? 240 : 290) + Math.random() * 90,
        seed,
        genome: parent ? parent.genome.mutate(seed) : undefined,
        curvature: parent ? parent.curvature * 0.5 + (Math.random() - 0.5) * 0.3 : 0
      });
      if (typeof this.onSeedGerminate === 'function') this.onSeedGerminate(seedling, x);
      return seedling;
    }

    addPlant(x, plantOptions = {}) {
      const plant = new AsciiPlant({
        ...plantOptions,
        palette: this.paletteName
      });
      this.plants.push({ x, plant });
      return plant;
    }

    removePlant(plant) {
      const i = this.plants.findIndex(p => p.plant === plant);
      if (i >= 0) this.plants.splice(i, 1);
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
        // Clamp so a backgrounded tab does not fast-forward the simulation on return
        const dt = Math.min(0.1, Math.max(0, (now - lastTime) / 1000));
        lastTime = now;

        this.update(dt);
        this.render();

        this._raf = requestAnimationFrame(loop);
      };

      this._raf = requestAnimationFrame(loop);
    }

    stop() {
      this.isRunning = false;
      if (this._raf && typeof cancelAnimationFrame === 'function') cancelAnimationFrame(this._raf);
      this._raf = null;
    }

    update(dt) {
      this.windTime += dt;
      const groundY = this.groundY;
      const dead = [];

      this.plants.forEach(({ plant, x }) => {
        // Continuous biological lifecycle:
        // Growth (0 -> 1) -> mature prime (1 -> 21, stretched by the life factor)
        // -> senescence (21 -> 23.5) -> death
        if (this.timeSpeed > 0) {
          const newAge = plant.age + plant.agingDelta(dt, this.timeSpeed);

          if (newAge >= LIFE_END) {
            dead.push({ plant, x });
          } else {
            plant.setAge(newAge);
            plant.update(dt, this.timeSpeed);
          }

          // Spent flower heads set seed which drifts off to start new plants elsewhere
          const sim = plant.simulator;
          if (sim.seedRelease > 0) {
            if (this.lifecycle === 'reproduce') {
              this.releaseSeeds(plant, x, sim.seedRelease * (2 + Math.round(plant.genome.flowering * 2)));
            }
            sim.seedRelease = 0;
          }
        }

        // Sunlight nourishment boost update
        if (plant.growthBoost > 0) {
          if (plant.age > PRIME_END) {
            // Revitalize aging/senescent plant back to radiant mature prime!
            plant.setAge(Math.max(1.0, plant.age - plant.growthBoost * dt * 4.0));
          } else {
            plant.setAge(plant.age + plant.growthBoost * dt * 1.5);
          }
          if (plant.bloom !== null) {
            plant.setBloom(Math.min(1.0, plant.bloom + plant.growthBoost * dt * 1.0));
          }
          plant.growthBoost = Math.max(0, plant.growthBoost - dt * 0.22);
          plant.vitality = Math.max(1.0, plant.vitality - dt * 0.12);
        }

        // Dandelion seed clock regeneration
        if (plant.seedsBlown) {
          plant.seedRegenTimer -= dt;
          if (plant.seedRegenTimer <= 0) {
            plant.seedsBlown = false;
          }
        }

        // Floating petal & leaf shedding during member wilting or whole-plant senescence
        const af = plant.simulator && plant.simulator.members ? plant.simulator.members.apicalFlower : null;
        const isFlowerWilting = af && af.state === 'wilting';
        const hasLeafWilting = plant.simulator && plant.simulator.members && plant.simulator.members.leaves.some(l => l.state === 'wilting');

        if ((isFlowerWilting || plant.age > PRIME_END) && Math.random() < 0.10) {
          const head = plant.getHeadPosition(x, groundY);
          const pal = plant.getPalette();
          const fPal = pal.flowers[plant.type] || pal.flowers.sunflower;
          this.particles.push({
            x: head.x + (Math.random() - 0.5) * 22,
            y: head.y + 8,
            vx: (Math.random() - 0.5) * 1.0 + (this.windStrength * 0.8),
            vy: 0.7 + Math.random() * 0.8,
            char: Math.random() < 0.5 ? '~' : "'",
            color: fPal.petal || fPal.outer || fPal.standard || '#ffd700',
            life: 1.0,
            decay: 0.012 + Math.random() * 0.008,
            spin: (Math.random() - 0.5) * 0.2
          });
        }

        if (hasLeafWilting && Math.random() < 0.04) {
          this.particles.push({
            x: x + (Math.random() - 0.5) * 35,
            y: groundY - (plant.height * Math.random() * 0.6),
            vx: (Math.random() - 0.5) * 0.6 + (this.windStrength * 0.5),
            vy: 1.2 + Math.random() * 0.8,
            char: '~',
            color: '#bfa035',
            life: 1.0,
            decay: 0.015,
            spin: (Math.random() - 0.5) * 0.15
          });
        }
      });

      // End of life: the individual is gone. In 'reproduce' mode it scatters its last seeds
      // (at least one is guaranteed to take if the meadow is getting sparse); in 'respawn'
      // mode it is reborn in place from a mutated copy of its own genome.
      dead.forEach(({ plant, x }) => {
        if (this.lifecycle === 'respawn') {
          plant.reseed(Math.floor(Math.random() * 1000000), { inherit: true });
          if (typeof this.onPlantReseed === 'function') this.onPlantReseed(plant, x);
          return;
        }
        this.removePlant(plant);
        if (typeof this.onPlantDeath === 'function') this.onPlantDeath(plant, x);
        const before = this.particles.length;
        this.releaseSeeds(plant, x, 3 + Math.round(plant.genome.flowering * 2));
        if (this.plants.length < this.floor && this.particles.length > before) {
          this.particles[before].guaranteed = true;
        }
      });

      if (this.immigration && this.lifecycle === 'reproduce' && this.timeSpeed > 0) {
        this._immigrationTimer -= dt * this.timeSpeed;
        if (this._immigrationTimer <= 0) {
          this._immigrationTimer = 25 + Math.random() * 25;
          if (this.plants.length < this.capacity) this.spawnImmigrantSeed();
        }
      }

      // Update particles (pollen, seeds, petals, sunlight motes)
      for (let i = this.particles.length - 1; i >= 0; i--) {
        const p = this.particles[i];

        if (p.isDandelionSeed || p.isSeed) {
          const gust = this.wind.sample(p.x, this.windTime);
          if (p.isDandelionSeed) {
            // Pendulum swinging motion on breeze
            p.x += p.vx + Math.sin(this.windTime * p.swingSpeed + p.swingPhase) * 1.4 + gust * this.windStrength * 0.8;
            // Float gently downward
            p.vy = lerp(p.vy, 0.75, dt * 2.0);
          } else if (p.floaty) {
            // Plumed wind-borne seed: rides the gusts and sinks slowly
            p.vx = lerp(p.vx, (1.0 + gust) * this.windStrength * 2.0 + 0.4, dt * 0.8);
            p.vy = lerp(p.vy, 0.55, dt * 0.5);
            p.x += p.vx;
            if (p.x > (this.cssWidth || 800) - 30) p.vx = -Math.abs(p.vx); // stays in the meadow
          } else {
            // Heavier seeds: gravity with air drag, pushed by gusts
            p.vx = lerp(p.vx, gust * this.windStrength * 2.2, dt * 1.5);
            p.vy = Math.min(2.6, p.vy + dt * 4.0);
            p.x += p.vx;
          }
          p.y += p.vy;

          if (p.y >= groundY) {
            this._landSeed(p);
            this.particles.splice(i, 1);
            continue;
          }
        } else {
          // Standard ambient particle
          p.x += p.vx + Math.sin(this.windTime * 2 + p.y * 0.02) * 0.5;
          p.y += p.vy;
          if (p.spin) p.rot = (p.rot || 0) + p.spin;
        }

        p.life -= p.decay;
        if (p.life <= 0 || p.x > this.cssWidth + 50 || p.x < -50 || p.y < -50 || p.y > this.cssHeight + 50) {
          this.particles.splice(i, 1);
        }
      }

      this.plants.forEach(({ plant }) => {
        plant.pointer.x = this.pointer.x;
        plant.pointer.y = this.pointer.y;
        plant.pointer.active = this.pointer.active;
      });

      // Living Meadow Grass Lifecycle update
      if (this.enableGrass && this.grass.length > 0) {
        this.grass.forEach(g => g.update(dt, this.timeSpeed));
      }
    }

    nourishAt(x, y, radius = 240) {
      const moteChars = ['*', '✦', '°', '·', '☼', '✧', '+', '#'];
      const moteColors = ['#ffea00', '#ffd700', '#ffa500', '#ffffff', '#fff4a3'];

      for (let i = 0; i < 16; i++) {
        const ang = Math.random() * Math.PI * 2;
        const spd = 1.0 + Math.random() * 3.5;
        this.particles.push({
          x: x + (Math.random() - 0.5) * 30,
          y: y + (Math.random() - 0.5) * 30,
          vx: Math.cos(ang) * spd,
          vy: Math.sin(ang) * spd + 1.2,
          char: moteChars[Math.floor(Math.random() * moteChars.length)],
          color: moteColors[Math.floor(Math.random() * moteColors.length)],
          life: 1.0,
          decay: 0.015 + Math.random() * 0.012
        });
      }

      this.plants.forEach(({ x: plantX, plant }) => {
        const dist = Math.abs(plantX - x);
        if (dist < radius) {
          const factor = 1.0 - (dist / radius);
          plant.feed(0.22 * factor);
        }
      });

      // Sunlight nourishment accelerates grass growth & revives wilting blades
      if (this.enableGrass && this.grass.length > 0) {
        this.grass.forEach(g => {
          const dist = Math.abs(g.x - x);
          if (dist < radius) {
            g.feed(0.40 * (1.0 - dist / radius));
          }
        });
      }
    }

    /** Every glyph of the current frame, in draw order (CSS-pixel coordinates). */
    collectGlyphs() {
      const out = this._soilGlyphs ? this._soilGlyphs.slice() : [];
      const wind = this.windStrength * (this.reducedMotion ? 0.25 : 1.0);
      const time = this.reducedMotion ? this.windTime * 0.4 : this.windTime;

      if (this.enableGrass && this.grass.length > 0) {
        const pal = this.getPalette();
        for (let i = 0; i < this.grass.length; i++) {
          const tuft = this.grass[i];
          const gust = this.wind.sample(tuft.x, this.windTime);
          const glyphs = tuft.generateGlyphs(time, wind, this.pointer, pal, gust);
          for (let j = 0; j < glyphs.length; j++) out.push(glyphs[j]);
        }
      }

      const groundY = this.groundY;
      for (let i = 0; i < this.plants.length; i++) {
        const { x, plant } = this.plants[i];
        const gust = this.wind.sample(x, this.windTime);
        const glyphs = plant.generateGlyphs(x, groundY, time, wind, gust);
        for (let j = 0; j < glyphs.length; j++) out.push(glyphs[j]);
      }

      for (let i = 0; i < this.particles.length; i++) {
        const p = this.particles[i];
        out.push({ x: p.x, y: p.y, char: p.char, fg: p.color, size: p.isDandelionSeed ? 14 : 12, alpha: p.isSeed ? 1 : clamp(p.life, 0, 1), rot: p.rot });
      }
      return out;
    }

    /**
     * Frame: background -> every glyph through the sprite atlas in one pass -> one
     * downscaled screen-space bloom pass over the whole canvas.
     */
    render() {
      const ctx = this.ctx;
      if (!ctx) return;
      const dpr = this.dpr || 1;
      if (typeof ctx.setTransform === 'function') ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      ctx.fillStyle = '#050508';
      ctx.fillRect(0, 0, this.cssWidth, this.cssHeight);

      this.renderer.draw(ctx, this.collectGlyphs(), dpr);

      if (this.bloom && this.canvas) {
        this.bloomPass.apply(ctx, this.canvas.width, this.canvas.height);
      }
    }
  }

  // =========================================================================
  // 10. CUSTOM WEB COMPONENTS
  // =========================================================================

  if (typeof customElements !== 'undefined') {
    class FlorametricPlantElement extends HTMLElement {
      connectedCallback() {
        const type = this.getAttribute('type') || 'sunflower';
        const age = parseFloat(this.getAttribute('age') || '1.0');
        const bloom = this.hasAttribute('bloom') ? parseFloat(this.getAttribute('bloom')) : null;
        const height = parseInt(this.getAttribute('height') || '300', 10);
        const palette = this.getAttribute('palette') || 'botanical';
        const interactive = this.getAttribute('interactive') !== 'false';
        const curvature = this.hasAttribute('curvature') ? parseFloat(this.getAttribute('curvature')) : 0;
        const seed = this.hasAttribute('seed') ? parseInt(this.getAttribute('seed'), 10) : undefined;

        this.style.display = 'inline-block';
        this.style.background = '#050508';
        this.style.width = this.style.width || '280px';
        this.style.height = this.style.height || `${height + 80}px`;

        const canvas = document.createElement('canvas');
        canvas.style.width = '100%';
        canvas.style.height = '100%';
        canvas.style.display = 'block';
        // ASCII art is decorative to screen readers; describe it once instead
        canvas.setAttribute('role', 'img');
        canvas.setAttribute('aria-label', this.getAttribute('aria-label') || `Animated ASCII ${type} plant`);
        this.appendChild(canvas);

        // A single embedded specimen is reborn in place instead of seeding elsewhere
        const garden = new AsciiGarden(canvas, { palette, lifecycle: 'respawn' });
        garden.addPlant(canvas.clientWidth / 2 || 140, {
          type, age, bloom, height, palette, interactive, curvature, seed
        });
        this._garden = garden;

        // Only animate while visible on screen
        if (typeof IntersectionObserver !== 'undefined') {
          this._observer = new IntersectionObserver(entries => {
            entries.forEach(entry => {
              if (entry.isIntersecting) garden.start();
              else garden.stop();
            });
          });
          this._observer.observe(this);
        } else {
          garden.start();
        }
      }
      disconnectedCallback() {
        if (this._observer) this._observer.disconnect();
        if (this._garden) this._garden.destroy();
      }
    }

    if (!customElements.get('florametric-plant')) {
      customElements.define('florametric-plant', FlorametricPlantElement);
    }
    if (!customElements.get('ascii-plant')) {
      class AsciiPlantElement extends FlorametricPlantElement { }
      customElements.define('ascii-plant', AsciiPlantElement);
    }
  }

  return {
    AsciiPlant,
    AsciiGarden,
    GrassTuft,
    Genome,
    BotanicalSimulator,
    BotanicalArchitect,
    ProceduralFlowerRenderer,
    GlyphRenderer,
    GlyphAtlas,
    TextRasterizer,
    WindField,
    SimplexNoise,
    PRNG,
    PALETTES,
    TRAIT_RANGES,
    SPECIES,
    generateString: (options) => {
      const plant = new AsciiPlant(options);
      return plant.toPlainText(options.cols || 40, options.rows || 35);
    }
  };
}));
