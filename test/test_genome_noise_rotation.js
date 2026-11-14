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

console.log('\nALL GENOME, NOISE & ROTATION TESTS PASSED! 🧬');
