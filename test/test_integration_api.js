// Invariant Tests for the integration API:
// options & presets, every feature toggle, runtime set(), events, plant positioning,
// master seed, one-line helpers, HTML attribute parsing, persistent-meadow pass-through.

const assert = require('assert');
const F = require('../florametric.js');

console.log('==================================================');
console.log('TESTING INTEGRATION API & FEATURE TOGGLES');
console.log('==================================================');

function mockCanvas(width = 800, height = 600) {
  const calls = [];
  const ctx = {
    calls,
    setTransform: (...a) => calls.push(['setTransform', ...a]),
    clearRect: (...a) => calls.push(['clearRect', ...a]),
    fillRect: (...a) => calls.push(['fillRect', ...a]),
    drawImage: (...a) => calls.push(['drawImage', ...a]),
    fillText: () => {}, save: () => {}, restore: () => {}, scale: () => {},
    set fillStyle(v) { calls.push(['fillStyle', v]); }
  };
  return {
    width, height, ctx,
    getBoundingClientRect: () => ({ left: 0, top: 0, width, height }),
    getContext: () => ctx,
    addEventListener: () => {}, removeEventListener: () => {}
  };
}
const run = (garden, seconds, dt = 0.25) => { for (let t = 0; t < seconds; t += dt) garden.update(dt); };

// -------------------------------------------------------------
// 1. Defaults, presets, legacy names
// -------------------------------------------------------------
{
  const g = new F.AsciiGarden(null);
  for (const k of Object.keys(F.defaults)) {
    if (k === 'reducedMotion') continue;
    assert.deepStrictEqual(g.options[k], F.defaults[k], `default ${k}`);
  }
  const st = new F.AsciiGarden(null, { preset: 'static', wind: 0.3 });
  assert.strictEqual(st.options.growth, false, 'static preset stops growth');
  assert.strictEqual(st.options.interactive, false, 'static preset is not interactive');
  assert.strictEqual(st.options.wind, 0.3, 'explicit options win over the preset');
  const legacy = new F.AsciiGarden(null, { bloom: false, lifecycle: 'respawn' });
  assert.strictEqual(legacy.options.glow, false, 'legacy bloom:false -> glow:false');
  assert.strictEqual(legacy.options.reproduction, false, "legacy lifecycle:'respawn' -> reproduction:false");
  assert.strictEqual(legacy.lifecycle, 'respawn');
  for (const name of ['living', 'static', 'calm', 'classic', 'minimal']) assert(F.presets[name], `preset ${name}`);
  console.log('  ✓ Defaults, presets (explicit options win) and legacy option names');
}

// -------------------------------------------------------------
// 2. Life toggles: growth, aging, flowerCycles, reproduction, particles
// -------------------------------------------------------------
{
  const still = new F.AsciiGarden(null, { growth: false, timeSpeed: 5 });
  const p = still.addPlant(400, { type: 'rose', age: 0.5, seed: 1 });
  run(still, 30);
  assert.strictEqual(p.age, 0.5, 'growth:false -> plants never age');

  const evergreen = new F.AsciiGarden(null, { aging: false, timeSpeed: 50, immigration: false });
  const e = evergreen.addPlant(400, { type: 'tulip', age: 20.5, seed: 2 });
  run(evergreen, 60);
  assert(e.age < 21.0 && evergreen.plants.some(x => x.plant === e), `aging:false -> stays in its prime and never dies (age ${e.age.toFixed(2)})`);

  // A flower normally wilts after 28-45 s of bloom; 200 s keeps the plant in its prime
  const forever = new F.AsciiGarden(null, { flowerCycles: false, timeSpeed: 1 });
  const f = forever.addPlant(400, { type: 'sunflower', age: 2, seed: 3 });
  run(forever, 200, 0.5);
  const af = f.simulator.members.apicalFlower;
  assert(['opening', 'blooming'].includes(af.state), `flowerCycles:false -> flower stays in bloom (${af.state})`);
  assert(!f.simulator.members.leaves.some(l => l.state === 'wilting' || l.state === 'dead'), 'flowerCycles:false -> leaves never turn over');

  const sterile = new F.AsciiGarden(null, { reproduction: false });
  const s = sterile.addPlant(400, { type: 'marigold', age: 2, seed: 4 });
  s.simulator.seedRelease = 2;
  sterile.update(0.016);
  assert.strictEqual(sterile.particles.filter(q => q.isSeed).length, 0, 'reproduction:false -> no seeds');
  s.age = 23.499;
  sterile.update(1);
  assert(sterile.plants.length === 1 && s.age < 0.2, 'reproduction:false -> plants regrow in place');

  const tidy = new F.AsciiGarden(null, { particles: false });
  const t = tidy.addPlant(400, { type: 'rose', age: 22, seed: 5 });
  run(tidy, 10, 0.05);
  assert.strictEqual(tidy.particles.length, 0, 'particles:false -> no falling petals or leaves');
  assert(t.age > 22, 'growth still runs');
  console.log('  ✓ growth, aging, flowerCycles, reproduction and particles toggles');
}

// -------------------------------------------------------------
// 3. Motion & look toggles: wind/gusts, soil, grass, background, rotation, glow
// -------------------------------------------------------------
{
  const snapshot = (opts) => {
    const g = new F.AsciiGarden(mockCanvas(), opts);
    g.addPlant(400, { type: 'iris', age: 1, seed: 6 });
    const a = g.collectGlyphs().map(q => q.x.toFixed(2)).join();
    g.update(2.3);
    const b = g.collectGlyphs().map(q => q.x.toFixed(2)).join();
    return a === b;
  };
  assert.strictEqual(snapshot({ wind: 0, gusts: false, growth: false }), true, 'wind:0 + gusts:false -> nothing moves');
  assert.strictEqual(snapshot({ growth: false }), false, 'default wind sways the plants');

  const bare = new F.AsciiGarden(mockCanvas(), { soil: false, grass: false });
  assert.strictEqual(bare.collectGlyphs().length, 0, 'soil:false + grass:false -> empty ground');
  assert(new F.AsciiGarden(mockCanvas()).collectGlyphs().some(q => q.char === '-'), 'soil line by default');

  const glass = mockCanvas();
  const tg = new F.AsciiGarden(glass, { background: 'transparent', glow: false });
  tg.render();
  assert(glass.ctx.calls.some(c => c[0] === 'clearRect') && !glass.ctx.calls.some(c => c[0] === 'fillRect'), 'background:transparent clears instead of filling');

  // rotation:false -> every glyph drawn upright
  const stubAtlas = { get: () => ({ canvas: {}, sx: 0, sy: 0, w: 10, h: 10 }) };
  const glyphs = [{ x: 10, y: 10, char: '|', fg: '#fff', size: 12, rot: 0.6 }, { x: 20, y: 20, char: '(', fg: '#fff', size: 12, rot: 1.2 }];
  const rotated = (rotate) => {
    const c = mockCanvas().ctx;
    const r = new F.GlyphRenderer({ atlas: false });
    r.atlas = stubAtlas;
    r.draw(c, glyphs, 1, { rotate });
    return c.calls.filter(k => k[0] === 'setTransform' && Math.abs(k[2]) > 1e-6).length;
  };
  assert(rotated(true) > 0, 'rotation on draws rotated sprites');
  assert.strictEqual(rotated(false), 0, 'rotation:false draws every glyph upright');
  console.log('  ✓ wind/gusts, soil, grass, transparent background and rotation toggles');
}

// -------------------------------------------------------------
// 4. Variation, genome defaults, master seed
// -------------------------------------------------------------
{
  const plain = new F.AsciiGarden(null, { variation: false });
  const r1 = plain.addPlant(200, { type: 'rose', seed: 11 });
  const r2 = plain.addPlant(400, { type: 'rose', seed: 99 });
  assert.strictEqual(r1.genome.hue, 0);
  assert.strictEqual(r1.getPalette().flowers.rose.petal, r2.getPalette().flowers.rose.petal, 'variation:false -> canonical colours');
  assert.strictEqual(r1.getPalette().flowers.rose.petal, F.PALETTES.botanical.flowers.rose.petal);

  const tinted = new F.AsciiGarden(null, { genome: { hue: 0.9, size: 1.2 } });
  const tp = tinted.addPlant(300, { type: 'tulip' });
  assert(Math.abs(tp.genome.hue - 0.9) < 1e-9 && Math.abs(tp.genome.size - 1.2) < 1e-9, 'garden genome defaults apply to new plants');

  const seeds = sd => { const g = new F.AsciiGarden(null, { seed: sd }); return [g.addPlant(100).seed, g.addPlant(200).seed]; };
  assert.deepStrictEqual(seeds(7), seeds(7), 'same master seed -> same plants');
  assert.notDeepStrictEqual(seeds(7), seeds(8), 'different master seed -> different plants');
  assert.notStrictEqual(seeds(7)[0], seeds(7)[1], 'plants in one garden differ');
  console.log('  ✓ variation:false, garden genome defaults and deterministic master seed');
}

// -------------------------------------------------------------
// 5. Runtime set(), events, positioning
// -------------------------------------------------------------
{
  const g = new F.AsciiGarden(mockCanvas(800, 600));
  const p = g.addPlant(0.25, { type: 'daffodil' });
  const q = g.addPlant('75%', { type: 'iris' });
  assert.strictEqual(g.plants[0].x, 200, 'fractional x');
  assert.strictEqual(g.plants[1].x, 600, 'percentage x');
  g.canvas.getBoundingClientRect = () => ({ left: 0, top: 0, width: 400, height: 600 });
  g.resize();
  assert.strictEqual(g.plants[0].x, 100, 'fractional positions follow resizes');

  g.set({ wind: 0, palette: 'amber', glow: false });
  assert.strictEqual(g.windStrength, 0);
  assert.strictEqual(p.paletteName, 'amber', 'palette changes reach existing plants');
  assert.strictEqual(g.bloom, false);
  g.set({ preset: 'static' });
  assert.strictEqual(g.options.growth, false, 'set({ preset }) applies a preset');
  g.set({ flowerCycles: false });
  assert.strictEqual(q.simulator.memberCycles, false, 'flowerCycles reaches existing plants');

  const seen = [];
  const handler = (plant, x) => seen.push(['germinate', plant.type, Math.round(x)]);
  const legacy = [];
  const eg = new F.AsciiGarden(null, { minPlants: 5 });
  eg.onSeedGerminate = () => legacy.push(1);
  eg.on('germinate', handler);
  eg._landSeed({ x: 300, parent: null, species: 'tulip', guaranteed: true });
  assert.strictEqual(seen.length, 1, "on('germinate') fires");
  assert.strictEqual(legacy.length, 1, 'legacy onSeedGerminate still fires');
  eg.off('germinate', handler);
  eg._landSeed({ x: 500, parent: null, species: 'rose', guaranteed: true });
  assert.strictEqual(seen.length, 1, 'off() unsubscribes');
  console.log('  ✓ addPlant fractions/percentages, set() at runtime, on()/off() events');
}

// -------------------------------------------------------------
// 6. One-line helpers & attribute parsing
// -------------------------------------------------------------
{
  const g = F.garden(null, { species: ['rose', 'tulip'], count: 4, age: 0.9, autoStart: false });
  assert.strictEqual(g.plants.length, 4);
  assert.deepStrictEqual(g.plants.map(e => e.plant.type), ['rose', 'tulip', 'rose', 'tulip']);
  assert(g.plants.every(e => e.plant.age === 0.9), 'shared age applies to every plant');
  assert.deepStrictEqual(g.plants.map(e => e.fx), [0.125, 0.375, 0.625, 0.875], 'plants spread evenly');

  const custom = F.garden(null, { plants: ['iris', { type: 'rose', x: 0.8, age: 2 }], autoStart: false });
  assert.strictEqual(custom.plants[1].fx, 0.8);
  assert.strictEqual(custom.plants[1].plant.age, 2);

  const one = F.plant(null, { type: 'hibiscus', autoStart: false });
  assert.strictEqual(one.plants.length, 1);
  assert.strictEqual(one.plants[0].plant.type, 'hibiscus');
  assert.strictEqual(one.options.reproduction, false, 'single plants regrow in place');

  const still = F.render(null, { type: 'rose' });
  assert.strictEqual(still.isRunning, false, 'render() draws once without an animation loop');
  assert.strictEqual(still.options.growth, false);

  const parsed = F.optionsFromAttributes({
    'flower-cycles': 'false', wind: '0', glow: '', rotation: 'off', 'time-speed': '2',
    genome: '{"hue":0.5}', species: 'rose, tulip', background: 'transparent', unknown: 'x', interactive: 'no'
  });
  assert.deepStrictEqual(parsed, {
    flowerCycles: false, wind: 0, glow: true, rotation: false, timeSpeed: 2,
    genome: { hue: 0.5 }, species: ['rose', 'tulip'], background: 'transparent', interactive: false
  });
  console.log('  ✓ Florametric.garden / plant / render helpers and HTML attribute parsing');
}

// -------------------------------------------------------------
// 7. Persistent meadows accept every feature option
// -------------------------------------------------------------
{
  const m = F.createPersistentMeadow(null, { glow: false, rotation: false, particles: false, speed: '24h', plantCount: 3 });
  m.stop();
  assert.strictEqual(m.options.glow, false);
  assert.strictEqual(m.options.rotation, false);
  assert.strictEqual(m.options.reproduction, false, 'meadows always regrow in place');
  assert.strictEqual(m.plants.length, 3);
  console.log('  ✓ createPersistentMeadow passes feature options through');
}

console.log('\nALL INTEGRATION API TESTS PASSED! 🔌');
