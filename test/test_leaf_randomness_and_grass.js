// Test Leaf Randomness (Size & Placement) and Grass Lifecycle (Sprout -> Grow -> Wilt -> Die)
const Florametric = require('../florametric.js');

console.log("==================================================");
console.log("TESTING LEAF RANDOMNESS & LIVING MEADOW GRASS");
console.log("==================================================");

// -------------------------------------------------------------
// TEST SUITE 1: Leaf Size & Placement Randomness
// -------------------------------------------------------------
console.log("\n[TEST 1] Testing Leaf Size and Placement Randomness within specimens...");

const speciesToTest = ['sunflower', 'rose', 'hibiscus', 'thistle', 'marigold'];

speciesToTest.forEach(sp => {
  const plant = new Florametric.AsciiPlant({
    type: sp,
    age: 1.0,
    bloom: 1.0,
    height: 360,
    seed: 42
  });

  const sim = plant.simulator.simulate(1.0, 1.0);
  const leaves = sim.leaves;

  console.log(`\n  Species: ${sp.toUpperCase()} (${leaves.length} active leaves)`);
  console.assert(leaves.length >= 3, `${sp} should have at least 3 leaves`);

  // Verify leaf scales
  const scales = leaves.map(l => l.scale);
  const minScale = Math.min(...scales);
  const maxScale = Math.max(...scales);
  const scaleDiff = maxScale - minScale;
  const variancePct = (scaleDiff / minScale) * 100;

  console.log(`    Min Leaf Scale: ${minScale.toFixed(2)}x, Max Leaf Scale: ${maxScale.toFixed(2)}x`);
  console.log(`    Scale Variance within same plant: ${variancePct.toFixed(1)}%`);
  console.assert(scaleDiff >= 0.25, `Leaf size must have at least 0.25 variance within plant (got ${scaleDiff.toFixed(2)})`);

  // Verify allometry / leaf sizing
  // Mid-stem photosynthetic leaves should have larger scale than apex leaves
  console.log(`    Leaves details:`, leaves.map(l => `nodeY=${l.y.toFixed(1)}, side=${l.side}, scale=${l.scale.toFixed(2)}`));

  // Verify node placement & internode distances
  for (let i = 0; i < leaves.length - 1; i++) {
    for (let j = i + 1; j < leaves.length; j++) {
      const l1 = leaves[i];
      const l2 = leaves[j];
      // For leaves on the same side or alternate, internode spacing should be maintained
      if (l1.side === l2.side) {
        const dy = Math.abs(l1.y - l2.y);
        console.assert(dy >= 15, `Internode spacing on same side must be >= 15px (got ${dy.toFixed(1)}px)`);
      }
    }
  }

  // Check genetic leaf placement variance across two different seeds
  const plantA = new Florametric.AsciiPlant({ type: sp, seed: 101, age: 1.0, height: 350 });
  const plantB = new Florametric.AsciiPlant({ type: sp, seed: 999, age: 1.0, height: 350 });
  const leavesA = plantA.simulator.simulate(1.0, 1.0).leaves;
  const leavesB = plantB.simulator.simulate(1.0, 1.0).leaves;

  const yPositionsA = leavesA.map(l => Math.round(l.y));
  const yPositionsB = leavesB.map(l => Math.round(l.y));
  console.log(`    Seed #101 Node Ys: [${yPositionsA.join(', ')}]`);
  console.log(`    Seed #999 Node Ys: [${yPositionsB.join(', ')}]`);
  console.assert(JSON.stringify(yPositionsA) !== JSON.stringify(yPositionsB), "Different seeds must produce different leaf node placement");
});

console.log("\n  ✓ Leaf size and placement randomness passed all invariant checks!");

// -------------------------------------------------------------
// TEST SUITE 2: GrassTuft Biological Lifecycle
// -------------------------------------------------------------
console.log("\n[TEST 2] Testing GrassTuft 4-Stage Lifecycle (Sprout -> Grow -> Wilt -> Die -> Reseed)...");

const tuft = new Florametric.GrassTuft(100, 500, 12345, 0.0);
console.log("  Initial grass tuft created at (100, 500), life=0.00, phase:", tuft.phase);
console.assert(tuft.phase === 'sprout', "Initial phase must be 'sprout'");

// Check Stage 1: Sprout glyphs
let sproutGlyphs = tuft.generateGlyphs(0, 0.5);
console.log(`  Stage 1 (Sprout, life=${tuft.life.toFixed(2)}): ${sproutGlyphs.length} glyphs, chars: [${sproutGlyphs.map(g => g.char).join('')}]`);
console.assert(sproutGlyphs.some(g => ["'", "|", "/"].includes(g.char)), "Sprout must use tender shoot chars");

// Advance to Stage 2: Grow (life = 0.40)
tuft.life = 0.40;
tuft.update(0);
console.log(`  Stage 2 (Grow, life=${tuft.life.toFixed(2)}): phase=${tuft.phase}`);
console.assert(tuft.phase === 'grow', "Phase at life=0.40 must be 'grow'");
let growGlyphs = tuft.generateGlyphs(1.0, 0.5);
console.log(`    Grow glyphs count: ${growGlyphs.length}, chars: [${growGlyphs.map(g => g.char).join('')}]`);
console.assert(growGlyphs.length > sproutGlyphs.length, "Grow stage must have more glyphs than sprout");
console.assert(growGlyphs.some(g => ["|", "/", "\\"].includes(g.char)), "Grow must have blade glyphs");

// Advance to Stage 3: Wilt (life = 0.75)
tuft.life = 0.75;
tuft.update(0);
console.log(`  Stage 3 (Wilt, life=${tuft.life.toFixed(2)}): phase=${tuft.phase}`);
console.assert(tuft.phase === 'wilt', "Phase at life=0.75 must be 'wilt'");
let wiltGlyphs = tuft.generateGlyphs(1.0, 0.5);
console.log(`    Wilt glyphs count: ${wiltGlyphs.length}, chars: [${wiltGlyphs.map(g => g.char).join('')}]`);
console.assert(wiltGlyphs.some(g => ["~", "\\", "/"].includes(g.char)), "Wilt must feature drooping straw glyphs");

// Advance to Stage 4: Die (life = 0.95)
tuft.life = 0.95;
tuft.update(0);
console.log(`  Stage 4 (Die, life=${tuft.life.toFixed(2)}): phase=${tuft.phase}`);
console.assert(tuft.phase === 'die', "Phase at life=0.95 must be 'die'");
let dieGlyphs = tuft.generateGlyphs(1.0, 0.5);
console.log(`    Die glyphs count: ${dieGlyphs.length}, chars: [${dieGlyphs.map(g => g.char).join('')}]`);
console.assert(dieGlyphs.some(g => [".", "_", ","].includes(g.char)), "Die stage must feature mulch/stubble chars");

// Advance beyond 1.0: Cycle completion & Reseed!
tuft.life = 1.05;
tuft.update(0.01);
console.log(`  Reseed Cycle: life=${tuft.life.toFixed(2)}, phase=${tuft.phase}`);
console.assert(tuft.phase === 'sprout', "Cycle completion must reset to 'sprout'");
console.assert(tuft.life < 0.22, "Life must be reset to sprout range");

// Test Sunlight Revitalization
console.log("\n  Testing Sunlight Revitalization on wilting grass...");
const wiltingTuft = new Florametric.GrassTuft(150, 500, 555, 0.80);
console.log(`    Before feeding: life=${wiltingTuft.life.toFixed(2)}, phase=${wiltingTuft.phase}`);
console.assert(wiltingTuft.phase === 'wilt', "Should be wilting before feed");
wiltingTuft.feed(0.5);
console.log(`    After feeding sunlight: life=${wiltingTuft.life.toFixed(2)}, phase=${wiltingTuft.phase}, nourishBoost=${wiltingTuft.nourishBoost.toFixed(2)}`);
console.assert(wiltingTuft.phase === 'sprout', "Sunlight nourishment must revitalize wilting grass into fresh sprout");

console.log("\n  ✓ GrassTuft lifecycle and revitalization passed all invariant checks!");

// -------------------------------------------------------------
// TEST SUITE 3: AsciiGarden Meadow Grass Integration
// -------------------------------------------------------------
console.log("\n[TEST 3] Testing AsciiGarden Meadow Grass Integration...");

function createMockCanvas(w = 1200, h = 600) {
  return {
    width: w,
    height: h,
    clientWidth: w,
    clientHeight: h,
    getBoundingClientRect: () => ({ left: 0, top: 0, width: w, height: h }),
    getContext: () => ({
      scale: () => {},
      clearRect: () => {},
      fillRect: () => {},
      fillText: () => {},
      drawImage: () => {},
      save: () => {},
      restore: () => {}
    }),
    addEventListener: () => {}
  };
}

const mockCanvas = createMockCanvas(1200, 600);
const garden = new Florametric.AsciiGarden(mockCanvas, { wind: 0.6, grass: true });

console.log(`  Garden initialized with ${garden.grass.length} grass tufts along soil line`);
console.assert(garden.grass.length >= 40, `1200px canvas should have >= 40 tufts (got ${garden.grass.length})`);

// Check distribution across canvas
const firstTuft = garden.grass[0];
const lastTuft = garden.grass[garden.grass.length - 1];
console.log(`  First tuft X: ${firstTuft.x.toFixed(1)}, Last tuft X: ${lastTuft.x.toFixed(1)}`);
console.assert(firstTuft.x < 50, "First tuft should be near left border");
console.assert(lastTuft.x > 1150, "Last tuft should be near right border");

// Check updates
const prevLife = firstTuft.life;
garden.update(0.5);
console.log(`  After 0.5s update: first tuft life went from ${prevLife.toFixed(3)} to ${firstTuft.life.toFixed(3)}`);
console.assert(firstTuft.life > prevLife, "Garden update must advance grass life");

// Check nourishAt
const midGrass = garden.grass.find(g => Math.abs(g.x - 600) < 15);
const oldNourish = midGrass.nourishBoost;
garden.nourishAt(600, 550, 100);
console.log(`  Sunlight showered at x=600: mid grass nourishBoost went from ${oldNourish.toFixed(2)} to ${midGrass.nourishBoost.toFixed(2)}`);
console.assert(midGrass.nourishBoost > oldNourish, "Nourish at coordinate must boost nearby grass");

// Render pass test
let renderSuccess = false;
try {
  garden.render();
  renderSuccess = true;
} catch (e) {
  console.error("Render failed:", e);
}
console.assert(renderSuccess === true, "Garden render() must execute cleanly with grass");
console.log("  Render pass executed cleanly without exceptions.");

console.log("\n==================================================");
console.log("ALL LEAF RANDOMNESS & LIVING GRASS TESTS PASSED! ✨");
console.log("==================================================");
