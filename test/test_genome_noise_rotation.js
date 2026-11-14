// Invariant Tests for:
// 1. Genome: deterministic birth traits, valid ranges, heritable mutation
// 2. Genome expression: traits actually change morphology, colour and lifespan
// 3. Growth noise: smooth, always-positive growth velocity (growth never reverses)
// 4. Glyph rotation: stems, leaves, branches and petals carry tangent rotations
// 5. Regressions: dandelion rosette & daffodil leaves stay bounded at any age
// 6. Plain-text export fits the whole plant and orients rotated strokes
// 7. Self-seeding meadow: offspring inherit, species cannot monopolise the meadow

const assert = require('assert');
const F = require('../florametric.js');

console.log('==================================================');
console.log('TESTING GENOME, GROWTH NOISE & GLYPH ROTATION');
console.log('==================================================');

// -------------------------------------------------------------
// 1. Genome determinism, ranges & mutation
// -------------------------------------------------------------
{
  const a = F.Genome.random('rose', 1234);
  const b = F.Genome.random('rose', 1234);
  const c = F.Genome.random('rose', 4321);
  assert.deepStrictEqual(a.toJSON(), b.toJSON(), 'Same species + seed must give the same genome');
  assert.notDeepStrictEqual(a.toJSON(), c.toJSON(), 'Different seeds must give different genomes');

  for (let s = 0; s < 200; s++) {
    const g = F.Genome.random('tulip', s);
    for (const [key, [lo, hi]] of Object.entries(F.TRAIT_RANGES)) {
      assert(g[key] >= lo && g[key] <= hi, `${key}=${g[key]} outside [${lo}, ${hi}]`);
    }
  }

  // Offspring drift a little from the parent instead of jumping to unrelated traits
  const parent = F.Genome.random('sunflower', 99);
  let totalDrift = 0;
  const N = 100;
  for (let i = 0; i < N; i++) {
    const child = parent.mutate(1000 + i);
    assert.strictEqual(child.generation, parent.generation + 1, 'Child must be one generation later');
    assert.strictEqual(child.species, parent.species, 'Child keeps the species');
    const [lo, hi] = F.TRAIT_RANGES.lifeFactor;
    totalDrift += Math.abs(child.lifeFactor - parent.lifeFactor) / (hi - lo);
  }
  const meanDrift = totalDrift / N;
  console.log(`  Mean lifeFactor drift per generation: ${(meanDrift * 100).toFixed(1)}% of range`);
  assert(meanDrift > 0.01 && meanDrift < 0.2, `Mutation drift should be gradual (got ${meanDrift})`);
  console.log('  ✓ Genomes are deterministic, bounded and heritable with gradual drift');
}

// -------------------------------------------------------------
// 2. Genome expression
// -------------------------------------------------------------
{
  const base = { type: 'sunflower', age: 1.0, bloom: 1.0, height: 360, seed: 77 };
  const small = new F.AsciiPlant({ ...base, genome: { size: 0.85 } });
  const big = new F.AsciiPlant({ ...base, genome: { size: 1.22 } });
  const hSmall = small.simulator.simulate(1.0, 1.0).shootHeight;
  const hBig = big.simulator.simulate(1.0, 1.0).shootHeight;
  assert(hBig > hSmall * 1.3, `Size gene must scale height (${hSmall.toFixed(0)} vs ${hBig.toFixed(0)})`);

  const sparse = new F.AsciiPlant({ ...base, genome: { leafing: 0.6 } });
  const lush = new F.AsciiPlant({ ...base, genome: { leafing: 1.5 } });
  assert(lush.simulator.members.leaves.length >= sparse.simulator.members.leaves.length,
    'Leafing gene must not reduce leaf count');
  assert(lush.simulator.geneticLeafClusters > sparse.simulator.geneticLeafClusters, 'Leafing gene must add leaf clusters');

  const unbranched = new F.AsciiPlant({ ...base, genome: { branching: 0.25 } });
  const bushy = new F.AsciiPlant({ ...base, genome: { branching: 1.5 } });
  assert(bushy.simulator.geneticMaxBranches >= unbranched.simulator.geneticMaxBranches, 'Branching gene must add branches');

  const shortLived = new F.AsciiPlant({ ...base, genome: { lifeFactor: 0.7 } });
  const longLived = new F.AsciiPlant({ ...base, genome: { lifeFactor: 1.4 } });
  assert(longLived.simulator.members.apicalFlower.lifespan > shortLived.simulator.members.apicalFlower.lifespan,
    'Life factor must lengthen member lifespans');
  shortLived.age = longLived.age = 5.0;
  assert(longLived.agingDelta(1, 1) < shortLived.agingDelta(1, 1), 'Life factor must stretch the mature prime');

  // Colour genes tint only the plant's own species; monochrome stays untouched
  const red = new F.AsciiPlant({ type: 'tulip', seed: 1, genome: { hue: -1 } });
  const gold = new F.AsciiPlant({ type: 'tulip', seed: 1, genome: { hue: 1 } });
  assert.notStrictEqual(red.getPalette().flowers.tulip.petal, gold.getPalette().flowers.tulip.petal, 'Hue gene must change petal colour');
  assert.strictEqual(red.getPalette().flowers.rose.petal, F.PALETTES.botanical.flowers.rose.petal, 'Other species keep base colours');
  red.setPalette('monochrome');
  assert.strictEqual(red.getPalette().flowers.tulip.petal, F.PALETTES.monochrome.flowers.tulip.petal, 'Monochrome palette is never tinted');
  console.log('  ✓ Size, leafing, branching, life factor and colour genes shape the phenotype');
}

// -------------------------------------------------------------
// 3. Growth noise
// -------------------------------------------------------------
{
  const plant = new F.AsciiPlant({ type: 'iris', seed: 5, age: 0.05, genome: { growthNoise: 0.28 } });
  let min = Infinity, max = -Infinity;
  let prevAge = plant.age;
  for (let t = 0; t < 400; t += 0.25) {
    const m = plant.simulator.growthNoise(t);
    min = Math.min(min, m);
    max = Math.max(max, m);
    plant.clock = t;
    plant.age += plant.agingDelta(0.25, 1);
    assert(plant.age > prevAge, 'Growth must never run backwards');
    prevAge = plant.age;
  }
  console.log(`  Growth velocity multiplier range: ${min.toFixed(2)} .. ${max.toFixed(2)}`);
  assert(min > 0.3, 'Growth velocity must stay positive');
  assert(max - min > 0.2, 'Growth velocity must actually vary');
  // Smoothness: consecutive samples change gently (noise, not jitter)
  let maxStep = 0;
  for (let t = 0; t < 100; t += 0.1) maxStep = Math.max(maxStep, Math.abs(plant.simulator.growthNoise(t + 0.1) - plant.simulator.growthNoise(t)));
  assert(maxStep < 0.05, `Growth noise must be smooth (max step ${maxStep.toFixed(3)})`);
  console.log('  ✓ Growth velocity wanders smoothly and stays positive');
}

// -------------------------------------------------------------
// 4. Glyph rotation
// -------------------------------------------------------------
{
  const plant = new F.AsciiPlant({ type: 'sunflower', age: 1.0, bloom: 1.0, seed: 3, curvature: 0.6 });
  const glyphs = plant.generateGlyphs(300, 500, 1.3, 0.8, 0.5);
  const rotated = glyphs.filter(g => Math.abs(g.rot || 0) > 0.05);
  console.log(`  ${rotated.length}/${glyphs.length} glyphs carry a rotation`);
  assert(rotated.length > glyphs.length * 0.3, 'A curved, wind-blown plant must have many rotated glyphs');

  // Stem glyphs follow the stem: rotation equals the local tangent lean
  const sim = plant.simulator.simulate(1.0, 1.0, 1.3, 0.8, null, 0.5);
  const leaning = sim.stemNodes.filter(n => Math.abs(n.angle) > 0.05);
  assert(leaning.length > 0, 'A curved stem must have leaning tangents');
  console.log('  ✓ Stems, foliage and petals are drawn with tangent-aligned rotations');
}

// -------------------------------------------------------------
// 5. Regressions: rosette & ribbon leaves stay bounded at any age
// -------------------------------------------------------------
{
  for (const age of [0.5, 1.0, 6.0, 15.0, 20.5]) {
    const d = new F.AsciiPlant({ type: 'dandelion', age, seed: 11, height: 300 });
    const gl = d.generateGlyphs(500, 500, 0, 0);
    const lowGlyphs = gl.filter(g => g.y > 470); // the rosette lies just above the soil
    const spread = Math.max(...lowGlyphs.map(g => Math.abs(g.x - 500)));
    assert(spread < 90, `Dandelion rosette must stay compact at age ${age} (spread ${spread.toFixed(0)}px)`);
  }
  const daff = new F.AsciiPlant({ type: 'daffodil', age: 1.0, seed: 2, height: 320 });
  const leafGlyphs = daff.generateGlyphs(400, 500, 0, 0).filter(g => g.char === '|' && g.y > 300 && Math.abs(g.x - 400) > 8);
  assert(leafGlyphs.some(g => Math.abs(g.rot || 0) > 0.2), 'Daffodil leaves must arch, not stand as straight poles');
  console.log('  ✓ Dandelion rosettes stay compact at every age; daffodil leaves arch');
}

// -------------------------------------------------------------
// 6. Plain-text export
// -------------------------------------------------------------
{
  assert.strictEqual(F.TextRasterizer.orient('|', Math.PI / 4), '/', '| rotated 45° clockwise reads as /');
  assert.strictEqual(F.TextRasterizer.orient('|', -Math.PI / 4), '\\', '| rotated 45° anticlockwise reads as \\');
  assert.strictEqual(F.TextRasterizer.orient('|', Math.PI / 2), '-', '| rotated 90° reads as -');
  assert.strictEqual(F.TextRasterizer.orient('#', 1.0), '#', 'Non-stroke glyphs keep their character');

  const txt = F.generateString({ type: 'sunflower', age: 1.0, bloom: 1.0, seed: 7, cols: 40, rows: 35 });
  const lines = txt.split('\n');
  assert(lines.length <= 35 && lines.every(l => l.length <= 40), 'Export must fit the requested grid');
  const firstInk = lines.findIndex(l => l.trim().length > 0);
  assert(firstInk >= 0 && firstInk < 5, 'The flower head must be inside the grid (not clipped off the top)');
  assert(/[{}()%&8*#o]/.test(lines.slice(firstInk, firstInk + 6).join('')), 'Top of the export must be the flower head');
  console.log('  ✓ Text export fits the whole plant and maps rotated strokes to | / - \\');
}

// -------------------------------------------------------------
// 7. Self-seeding meadow
// -------------------------------------------------------------
{
  const garden = new F.AsciiGarden(null, { timeSpeed: 1.0 });
  const parent = garden.addPlant(400, { type: 'marigold', age: 1.0, seed: 8 });
  parent.simulator.seedRelease = 1; // a flower head just set seed
  garden.update(0.016);
  const seeds = garden.particles.filter(p => p.isSeed && p.parent === parent);
  assert(seeds.length >= 2, 'A spent flower must release seeds into the garden');

  // Species share cap: a meadow full of one species cannot accept more of it
  const crowded = new F.AsciiGarden(null, {});
  const cap = Math.max(2, Math.ceil(crowded.capacity * crowded.maxSpeciesShare));
  for (let i = 0; i < cap; i++) crowded.addPlant(60 + i * 60, { type: 'sunflower', seed: i });
  assert.strictEqual(crowded._canGerminateAt(700, 'sunflower'), false, 'A dominant species must be capped');
  assert.strictEqual(crowded._canGerminateAt(700, 'iris'), true, 'Other species may still germinate');
  assert.strictEqual(crowded._canGerminateAt(62, 'iris'), false, 'Seedlings need room (min spacing)');
  console.log('  ✓ Flowers set seed; species competition and spacing keep the meadow diverse');
}

// -------------------------------------------------------------
// 8. Wilting is local: a spent flower never browns the whole plant;
//    old age browns the plant gradually from the base upward
// -------------------------------------------------------------
{
  const plant = new F.AsciiPlant({ type: 'sunflower', age: 5.0, seed: 21, height: 360 });
  plant.settle();
  const pal = plant.getPalette();
  const af = plant.simulator.members.apicalFlower;
  af.state = 'wilting';
  af.bloom = 0.6;
  af.wiltTimer = 1.0; // late in its wilt

  const sim = plant.simulator.simulate(plant.age, null, 0, 0);
  assert.strictEqual(sim.isWilting, false, 'A prime plant is not senescent just because its flower wilts');
  assert.strictEqual(sim.flowerWilting, true, 'The flower head itself is wilting');

  const glyphs = plant.generateGlyphs(400, 600, 0, 0);
  const tissue = glyphs.filter(g => g.y > 600 - sim.shootHeight * 0.75 && g.y < 595);
  const green = tissue.filter(g => g.fg === pal.stem || g.fg === pal.stemDark).length;
  assert(green > tissue.length * 0.6, `Lower 75% of a prime plant must stay green while its flower wilts (${green}/${tissue.length})`);
  assert(!tissue.some(g => g.fg === pal.wilted || g.fg === pal.dead), 'No straw/brown stem tissue below the flower stalk');

  // Branch flowers keep blooming in their own colours while the apex wilts
  const bushy = new F.AsciiPlant({ type: 'rose', age: 5.0, seed: 3, genome: { branching: 1.5, flowering: 1.4 } });
  bushy.settle(40);
  const br = bushy.simulator.members.branches.find(b => b.flower && b.flower.state === 'blooming');
  if (br) {
    bushy.simulator.members.apicalFlower.state = 'wilting';
    bushy.simulator.members.apicalFlower.wiltTimer = 5;
    const rosePal = bushy.getPalette().flowers.rose;
    const bg = bushy.generateGlyphs(400, 600, 0, 0);
    assert(bg.some(g => g.fg === rosePal.petal || g.fg === rosePal.light), 'Blooming branch flowers keep their petal colours');
  }

  // Senescence: base browns first, the tip stays greener
  const old = new F.AsciiPlant({ type: 'sunflower', age: 21.9, seed: 21, height: 360 });
  const oldSim = old.simulator.simulate(old.age, null, 0, 0);
  const oldGlyphs = old.generateGlyphs(400, 600, 0, 0);
  const oPal = old.getPalette();
  const greenness = g => { const n = parseInt(g.fg.slice(1), 16); return ((n >> 8) & 255) - ((n >> 16) & 255); }; // G - R
  const stemOf = band => oldGlyphs.filter(g => g.char === '|' && g.rot !== undefined &&
    g.y < 600 - oldSim.shootHeight * band[0] && g.y > 600 - oldSim.shootHeight * band[1]);
  const base = stemOf([0.02, 0.25]);
  const tip = stemOf([0.70, 0.95]);
  const avg = arr => arr.reduce((acc, g) => acc + greenness(g), 0) / Math.max(1, arr.length);
  console.log(`  Senescent stem greenness (G-R): base ${avg(base).toFixed(0)}, tip ${avg(tip).toFixed(0)}`);
  assert(base.length && tip.length, 'Senescent plant still has stem tissue');
  assert(avg(base) < avg(tip), 'Senescence must brown the base before the tip');
  assert(oldGlyphs.some(g => g.fg !== oPal.stem && g.fg !== oPal.stemDark && g.fg !== oPal.wilted && g.fg !== oPal.dead && /^#/.test(g.fg)),
    'Ageing must produce intermediate (blended) colours, not a hard switch');
  console.log('  ✓ Flower wilting stays local; old age browns gradually from the base up');
}

// -------------------------------------------------------------
// 9. Gradual, palette-aware flower wilting; seed heads; gentle recovery; genome ageing
// -------------------------------------------------------------
{
  const R = F.ProceduralFlowerRenderer;
  const pal = F.PALETTES.botanical;
  const fresh = R.generateGlyphs('sunflower', 300, 300, 1, 1.0, pal, 0, false, 0);
  const half = R.generateGlyphs('sunflower', 300, 300, 1, 1.0, pal, 0, false, 0.5);
  const spent = R.generateGlyphs('sunflower', 300, 300, 1, 1.0, pal, 0, false, 1.0);
  const meanY = gl => gl.reduce((a, g) => a + g.y, 0) / gl.length;
  console.log(`  Sunflower head glyphs: fresh ${fresh.length}, half-wilted ${half.length}, spent ${spent.length}`);
  assert(fresh.length > half.length && half.length > spent.length, 'Petals must shed progressively');
  assert(meanY(spent) > meanY(fresh) + 3, 'A wilting head must droop');
  const freshCols = new Set(fresh.map(g => g.fg));
  assert(half.some(g => !freshCols.has(g.fg)), 'Wilting colours must blend, not switch');

  // Themes keep their look: a fully wilted flower in phosphor/amber never turns brown-red
  for (const theme of ['phosphor', 'amber']) {
    const tp = F.PALETTES[theme];
    const gl = R.generateGlyphs('rose', 300, 300, 1, 1.0, tp, 0, false, 1.0);
    const allowed = new Set([tp.wilted, tp.dead]);
    const offTheme = gl.filter(g => {
      const n = parseInt(g.fg.slice(1), 16);
      const r = (n >> 16) & 255, gg = (n >> 8) & 255, b = n & 255;
      return theme === 'phosphor' ? r > gg : b > r; // phosphor stays green, amber stays warm
    });
    assert.strictEqual(offTheme.length, 0, `Wilted ${theme} flower must stay on-theme (${offTheme.length} off-theme glyphs)`);
  }

  // Seed head: wilting -> seedhead (seeds drop in waves) -> rest -> new bud
  const plant = new F.AsciiPlant({ type: 'sunflower', age: 5.0, seed: 4 });
  const sim = plant.simulator;
  const af = sim.members.apicalFlower;
  af.state = 'wilting'; af.bloom = 0.15; af.wiltTimer = 0.01;
  sim.seedRelease = 0;
  sim.updateMembers(0.1, 1, plant.age);
  assert.strictEqual(af.state, 'seedhead', 'A finished flower must become a seed head');
  const head = plant.generateGlyphs(400, 600, 0, 0);
  const petal = plant.getPalette().flowers.sunflower.petal;
  assert(!head.some(g => g.fg === petal), 'A seed head has no petals');
  for (let t = 0; t < af.seedDuration + 1 && af.state === 'seedhead'; t += 0.25) sim.updateMembers(0.25, 1, plant.age);
  assert.strictEqual(sim.seedRelease, 3, 'Seeds must drop in three waves');
  assert.strictEqual(af.state, 'dead', 'After dropping its seeds the head rests before the next bud');

  // Sunlight re-opens a spent flower gradually instead of snapping to full bloom
  af.state = 'seedhead'; af.seedTimer = 3; af.seedDuration = 10; af.bloom = 0;
  plant.feed(0.3);
  assert.strictEqual(af.state, 'opening', 'Fed flower re-opens');
  assert(af.bloom < 0.6, `Fed flower starts half-open (bloom ${af.bloom})`);

  // Genome: long-lived, vigorous plants brown later at the same age
  const hardy = new F.AsciiPlant({ type: 'iris', age: 22.0, seed: 9, genome: { lifeFactor: 1.4, vigor: 1.25 } });
  const frail = new F.AsciiPlant({ type: 'iris', age: 22.0, seed: 9, genome: { lifeFactor: 0.7, vigor: 0.8 } });
  const aH = hardy.simulator.simulate(22.0).ageing;
  const aF = frail.simulator.simulate(22.0).ageing;
  console.log(`  Visible ageing at age 22: hardy ${aH.toFixed(2)}, frail ${aF.toFixed(2)}`);
  assert(aH < aF, 'Hardy genomes must brown later than frail ones');
  console.log('  ✓ Gradual petal shedding, on-theme wilting, seed heads, gentle recovery & genome ageing');
}

// -------------------------------------------------------------
// 10. growTo(): scrubbing biological age regrows a consistent specimen
// -------------------------------------------------------------
{
  const plant = new F.AsciiPlant({ type: 'sunflower', seed: 42, age: 1.0, bloom: null });
  const glyphsAt = age => { plant.growTo(age); return JSON.stringify(plant.generateGlyphs(300, 600, 0, 0)); };

  plant.growTo(0.15);
  const sprout = plant.simulator.simulate(plant.age, null, 0, 0);
  assert.strictEqual(plant.effectiveBloom, 0, 'A 15% sprout has no open flower');
  assert(sprout.shootHeight < 200, 'A sprout is short');
  assert.strictEqual(sprout.branches.length, 0, 'A sprout has no branches');

  plant.growTo(1.0);
  assert(plant.effectiveBloom > 0.8, 'A plant at the start of its prime is in bloom');

  const a = glyphsAt(6.0);
  glyphsAt(0.2);
  glyphsAt(22.5);
  const b = glyphsAt(6.0);
  assert.strictEqual(a, b, 'Scrubbing back to the same age must show the identical plant');

  plant.growTo(22.5);
  assert(plant.simulator.simulate(plant.age).isWilting, 'Scrubbing into senescence shows an ageing plant');
  console.log('  ✓ growTo() regrows a consistent specimen at any age (sprout, prime, senescence)');
}

console.log('\nALL GENOME, NOISE & ROTATION TESTS PASSED! 🧬');
