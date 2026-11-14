// Invariant Tests for species botany (docs/BOTANY.md):
// 1. Every species has a shoot / branch / leaf profile
// 2. Shoot straightness: rose canes zigzag, dandelion & iris scapes stay straight
// 3. Unbranched species never branch; branched species respect their caps
// 4. Stem textures: rose prickles, sunflower hairs, thistle wings; smooth dandelion
// 5. Flexibility: a dandelion scape bends further in the same wind than a sunflower
// 6. ASCII variety: strokes use direction-matched characters, outlines use ( )
// 7. Flower identity: hibiscus column, iris beard, daffodil corona, dandelion phases
// 8. Buds are green and colour up as they open

const assert = require('assert');
const F = require('../florametric.js');

console.log('==================================================');
console.log('TESTING SPECIES BOTANY PROFILES');
console.log('==================================================');

// -------------------------------------------------------------
// 1. Profiles
// -------------------------------------------------------------
for (const sp of F.SPECIES) {
  const b = F.BOTANY[sp];
  assert(b && b.shoot && b.branch && b.leaf, `${sp} must have shoot, branch and leaf profiles`);
  for (const k of ['straightness', 'kink', 'internode', 'flex', 'width', 'texture']) {
    assert(b.shoot[k] !== undefined, `${sp}.shoot.${k} missing`);
  }
}
console.log('  ✓ All 10 species carry shoot, branch and leaf profiles');

// -------------------------------------------------------------
// 2. Straightness (mean absolute turn between stem segments, no wind)
// -------------------------------------------------------------
function tortuosity(type, seeds = 12) {
  let total = 0;
  for (let s = 1; s <= seeds; s++) {
    const p = new F.AsciiPlant({ type, seed: s * 13, age: 1.0, height: 340, genome: { habit: 'erect', shapeNoise: 0.7 } });
    const nodes = p.simulator.simulate(1.0, 1.0, 0, 0).stemNodes;
    let turn = 0;
    for (let i = 2; i < nodes.length; i++) {
      const a1 = Math.atan2(nodes[i - 1].x - nodes[i - 2].x, nodes[i - 1].y - nodes[i - 2].y);
      const a2 = Math.atan2(nodes[i].x - nodes[i - 1].x, nodes[i].y - nodes[i - 1].y);
      turn += Math.abs(a2 - a1);
    }
    total += turn / (nodes.length - 2);
  }
  return total / seeds;
}
const tRose = tortuosity('rose');
const tHib = tortuosity('hibiscus');
const tDand = tortuosity('dandelion');
const tIris = tortuosity('iris');
const tSun = tortuosity('sunflower');
console.log(`  Mean turn per segment (rad): rose ${tRose.toFixed(3)}, hibiscus ${tHib.toFixed(3)}, sunflower ${tSun.toFixed(3)}, iris ${tIris.toFixed(3)}, dandelion ${tDand.toFixed(3)}`);
assert(tRose > tDand * 3, 'A rose cane must be far more jagged than a dandelion scape');
assert(tRose > tIris * 3, 'A rose cane must be far more jagged than an iris scape');
assert(tRose > tHib, 'Rose canes zigzag more than hibiscus stems');
assert(tHib > tSun, 'Hibiscus stems are less straight than a sunflower stalk');
console.log('  ✓ Rose zigzags, hibiscus bends at nodes, sunflower/iris/dandelion stay straight');

// -------------------------------------------------------------
// 3. Branching
// -------------------------------------------------------------
for (const sp of ['tulip', 'daffodil', 'dandelion', 'flytrap']) {
  for (let s = 1; s <= 25; s++) {
    const p = new F.AsciiPlant({ type: sp, seed: s, branching: 1.0, genome: { branching: 1.5 } });
    assert.strictEqual(p.simulator.members.branches.length, 0, `${sp} must never branch`);
  }
}
for (let s = 1; s <= 25; s++) {
  const iris = new F.AsciiPlant({ type: 'iris', seed: s, genome: { branching: 1.5 } });
  assert(iris.simulator.members.branches.length <= 1, 'An iris scape carries at most one side branch');
}
console.log('  ✓ Scapes (tulip, daffodil, dandelion, flytrap) never branch; iris at most once');

// -------------------------------------------------------------
// 4. Stem textures
// -------------------------------------------------------------
function stemGlyphs(type, seed = 5) {
  const p = new F.AsciiPlant({ type, seed, age: 1.0, bloom: 1.0, height: 340, branching: 0 });
  const sim = p.simulator.simulate(1.0, 1.0, 0, 0);
  const g = p.generateGlyphs(300, 600, 0, 0);
  // stem band: within 12px of the spine, above the basal foliage and below the flower
  return g.filter(q => q.y > 600 - sim.shootHeight * 0.85 && q.y < 580 && sim.stemNodes.some(n => Math.abs(300 + n.x - q.x) < 12 && Math.abs(600 - n.y - q.y) < 5));
}
const roseStem = stemGlyphs('rose');
const sunStem = stemGlyphs('sunflower');
const thistleStem = stemGlyphs('thistle');
const dandStem = stemGlyphs('dandelion');
assert(roseStem.filter(q => q.char === '<' || q.char === '>').length >= 3, 'Rose canes carry prickles');
assert(sunStem.filter(q => q.char === "'").length >= 5, 'Sunflower stalks are hairy');
assert(thistleStem.filter(q => q.char === '<' || q.char === '>').length >= 6, 'Thistle stems carry spiny wings');
assert.strictEqual(dandStem.filter(q => q.char === '<' || q.char === '>' || q.char === "'").length, 0, 'A dandelion scape is smooth');
console.log('  ✓ Prickles on rose, hairs on sunflower, spiny wings on thistle, smooth dandelion');

// -------------------------------------------------------------
// 5. Flexibility in wind
// -------------------------------------------------------------
function windBend(type) {
  const p = new F.AsciiPlant({ type, seed: 3, age: 1.0, height: 320, genome: { windSensitivity: 1.0, habit: 'erect' } });
  const calm = p.simulator.simulate(1.0, 1.0, 0, 0, null, 0).stemNodes;
  const windy = p.simulator.simulate(1.0, 1.0, 0, 1.0, null, 1.0).stemNodes;
  return Math.abs(windy[windy.length - 1].x - calm[calm.length - 1].x) / calm[calm.length - 1].y;
}
const bDand = windBend('dandelion');
const bSun = windBend('sunflower');
console.log(`  Relative tip deflection in a gust: dandelion ${bDand.toFixed(3)}, sunflower ${bSun.toFixed(3)}`);
assert(bDand > bSun * 1.8, 'A hollow dandelion scape must bend far more than a stout sunflower stalk');
console.log('  ✓ Flexible scapes bend more than stiff stalks');

// -------------------------------------------------------------
// 6. ASCII variety
// -------------------------------------------------------------
{
  const rose = new F.AsciiPlant({ type: 'rose', seed: 9, age: 1.0, bloom: 1.0, curvature: 0.5 });
  const g = rose.generateGlyphs(300, 600, 0, 0.4, 0.3);
  const chars = new Set(g.map(q => q.char));
  console.log(`  Distinct characters in one rose: ${chars.size} (${[...chars].join('')})`);
  assert(chars.size >= 12, 'A plant must be drawn with a rich variety of ASCII characters');
  for (const c of ['/', '\\', '(', ')']) assert(chars.has(c), `Expected '${c}' among the strokes`);
  const pipes = g.filter(q => q.char === '|').length / g.length;
  assert(pipes < 0.4, `Strokes must not be mostly pipes (${(pipes * 100).toFixed(0)}% '|')`);
  // Largest gap between neighbouring stroke glyphs is '-' (0°) to '\\' (~59°): residual <= ~0.52 rad
  const bigTurns = g.filter(q => Math.abs(q.rot || 0) > 0.53 && ['|', '/', '\\', '-'].includes(q.char)).length;
  assert.strictEqual(bigTurns, 0, 'Line glyphs are chosen by direction and only nudged by small residual rotations');
  console.log('  ✓ Direction-matched | / - \\ strokes, ( ) outlines and texture fills');
}

// -------------------------------------------------------------
// 7. Flower identity
// -------------------------------------------------------------
{
  const P = F.PALETTES.botanical;
  const R = F.ProceduralFlowerRenderer;
  const hib = R.generateGlyphs('hibiscus', 300, 300, 1, 1, P);
  assert(hib.some(q => q.fg === P.flowers.hibiscus.anther), 'Hibiscus shows anthers on its staminal column');
  assert(hib.some(q => q.fg === P.flowers.hibiscus.inner), 'Hibiscus shows its dark eye');
  const iris = R.generateGlyphs('iris', 300, 300, 1, 1, P);
  assert(iris.some(q => q.fg === P.flowers.iris.signal && q.char === '*'), 'Bearded iris shows its yellow beard');
  const daff = R.generateGlyphs('daffodil', 300, 300, 1, 1, P);
  assert(daff.filter(q => q.fg === P.flowers.daffodil.cup).length >= 10, 'Daffodil shows its trumpet corona');
  const yellow = R.generateGlyphs('dandelion', 300, 300, 1, 1, P, 0, false, 0, 0, 0, { clock: false });
  const clock = R.generateGlyphs('dandelion', 300, 300, 1, 1, P, 0, false, 0, 0, 0, { clock: true });
  assert(yellow.some(q => q.fg === P.flowers.dandelion.yellow) && !yellow.some(q => q.fg === P.flowers.dandelion.seed), 'Dandelion flowers yellow first');
  assert(clock.filter(q => q.fg === P.flowers.dandelion.seed).length >= 20, 'Then becomes a seed clock');

  // Dandelion phase follows its lifecycle: yellow while young, clock later in the bloom
  const d = new F.AsciiPlant({ type: 'dandelion', seed: 4, age: 1.0, bloom: null });
  const af = d.simulator.members.apicalFlower;
  af.state = 'blooming'; af.bloom = 1; af.lifespan = 40; af.age = 5;
  assert.strictEqual(d.simulator.isSeedClock(null, 1), false, 'Early bloom: yellow flower');
  af.age = 30;
  assert.strictEqual(d.simulator.isSeedClock(null, 1), true, 'Late bloom: seed clock');
  console.log('  ✓ Hibiscus column & eye, iris beard, daffodil corona, dandelion flower -> clock');
}

// -------------------------------------------------------------
// 8. Buds are green
// -------------------------------------------------------------
{
  const P = F.PALETTES.botanical;
  const greenness = hex => { const n = parseInt(hex.slice(1), 16); return ((n >> 8) & 255) - Math.max((n >> 16) & 255, n & 255); };
  for (const sp of ['tulip', 'rose', 'hibiscus', 'iris']) {
    const bud = F.ProceduralFlowerRenderer.generateGlyphs(sp, 300, 300, 1, 0.05, P);
    const open = F.ProceduralFlowerRenderer.generateGlyphs(sp, 300, 300, 1, 1.0, P);
    const avg = gl => gl.reduce((a, q) => a + greenness(q.fg), 0) / gl.length;
    assert(avg(bud) > avg(open), `${sp} bud must be greener than its open flower`);
  }
  console.log('  ✓ Buds are green and colour up as they open');
}

// -------------------------------------------------------------
// 9. No floating heads: the stem (via its flower stalk) reaches every flower head
// -------------------------------------------------------------
{
  for (const sp of F.SPECIES) {
    for (const bloom of [0.3, 1.0]) {
      const p = new F.AsciiPlant({ type: sp, seed: 21, age: 1.0, bloom, height: 320, branching: 0 });
      const sim = p.simulator.simulate(1.0, bloom, 0, 0);
      const pal = p.getPalette();
      const g = p.generateGlyphs(300, 600, 0, 0);
      const apexY = 600 - sim.shootHeight;
      const stem = g.filter(q => q.fg === pal.stem || q.fg === pal.stemDark);
      const head = g.filter(q => q.y < apexY - 3 && q.fg !== pal.stem && q.fg !== pal.stemDark);
      if (head.length === 0) continue;
      let gap = Infinity;
      for (const h of head) for (const st of stem) gap = Math.min(gap, Math.hypot(h.x - st.x, h.y - st.y));
      assert(gap < 8, `${sp} (bloom ${bloom}) head floats ${gap.toFixed(1)}px away from its stem`);
    }
  }
  console.log('  ✓ Every species\' flower head is joined to its stem by a flower stalk');
}

console.log('\nALL SPECIES BOTANY TESTS PASSED! 🌿');
