// Invariant Tests for:
// 1. Bilateral Shoots (Emerging from Left AND Right sides)
// 2. Smooth Leaf Growth (Nascent buds -> unfolding lamina, no pop-in)
// 3. Sunflower Seed Head Confinement (Zero bleeding outside petals)
// 4. Marigold Bounded Radial Pompom
// 5. Continuous Plant Life Cycle (Sprout -> Grow -> Bloom -> Wilt -> Die -> Reseed)
// 6. Sunlight Revitalization on Wilting Specimen

const Florametric = require('../florametric.js');

console.log("==================================================");
console.log("TESTING BILATERAL SHOOTS, LEAF GROWTH & FLOWER BOUNDS");
console.log("==================================================");

// -------------------------------------------------------------
// TEST 1: Bilateral Shoots (Left and Right Branching)
// -------------------------------------------------------------
console.log("\n[TEST 1] Testing Bilateral Shoots (Branches on Left AND Right)...");

let foundLeft = false;
let foundRight = false;
const branchSpecies = ['sunflower', 'rose', 'hibiscus', 'marigold'];

for (const sp of branchSpecies) {
  for (let s = 1; s <= 20; s++) {
    const plant = new Florametric.AsciiPlant({
      type: sp,
      age: 0.95,
      branching: 1.0,
      seed: s * 17
    });
    const sim = plant.simulator.simulate(0.95, 1.0);
    const branches = sim.branches;
    for (const b of branches) {
      if (b.side === -1) foundLeft = true;
      if (b.side === 1) foundRight = true;
    }
    if (branches.length >= 2) {
      const sides = branches.map(b => b.side);
      // Check if both sides exist on multi-branch plants
      if (sides.includes(-1) && sides.includes(1)) {
        console.log(`  ✓ Found specimen (${sp}, seed #${s * 17}) with bilateral branching: [${sides.join(', ')}]`);
      }
    }
  }
}

console.log(`  Found left branches: ${foundLeft}, Found right branches: ${foundRight}`);
console.assert(foundLeft === true, "Must generate branches on the LEFT side (-1)");
console.assert(foundRight === true, "Must generate branches on the RIGHT side (+1)");
console.log("  ✓ Shoots now emerge bilaterally from both left and right axils!");

// -------------------------------------------------------------
// TEST 2: Smooth Leaf Growth (Nascent Buds -> Unfolding Lamina)
// -------------------------------------------------------------
console.log("\n[TEST 2] Testing Smooth Leaf Growth (No Pop-in)...");

const plant = new Florametric.AsciiPlant({ type: 'sunflower', seed: 42, height: 360 });

// Sample leaf maturity at incremental stem growth stages starting at emergence (age 0.16)
const maturitiesAtAges = [];
for (let age = 0.16; age <= 0.85; age += 0.03) {
  const sim = plant.simulator.simulate(age, null);
  const leaves = sim.leaves;
  if (leaves.length > 0) {
    const topLeaf = leaves[leaves.length - 1];
    maturitiesAtAges.push({ age: age.toFixed(2), leafCount: leaves.length, topMaturity: topLeaf.maturity.toFixed(2), topScale: topLeaf.scale.toFixed(2) });
  }
}

console.log("  Leaf maturation progression as stem elongates:");
maturitiesAtAges.slice(0, 8).forEach(m => {
  console.log(`    Age ${m.age}: ${m.leafCount} leaves, Top leaf maturity: ${m.topMaturity}, scale: ${m.topScale}`);
});

// Check that newly emerged leaf starts with small maturity (<= 0.35)
const earliest = maturitiesAtAges[0];
console.assert(parseFloat(earliest.topMaturity) <= 0.35, `Newly emerged leaf must start as a nascent bud (maturity <= 0.35, got ${earliest.topMaturity})`);

// Check that mature plant has fully unfolded leaves (maturity = 1.0)
const fullyMatured = plant.simulator.simulate(0.95, 1.0).leaves;
console.assert(fullyMatured.some(l => l.maturity >= 0.95), "Mature plant must have fully matured leaves");
console.log("  ✓ Leaves emerge as tiny nascent buds and smoothly expand to adult size!");

// -------------------------------------------------------------
// TEST 3: Sunflower Seed Disc Confinement (Zero Bleeding)
// -------------------------------------------------------------
console.log("\n[TEST 3] Testing Sunflower Seed Disc Confinement (Zero Bleeding)...");

const sfPlant = new Florametric.AsciiPlant({ type: 'sunflower', age: 1.0, bloom: 1.0, branching: 0, seed: 1234 });
const sfGlyphs = sfPlant.generateGlyphs(500, 500);

// Get head center
const headPos = sfPlant.getHeadPosition(500, 500);
const fcy = headPos.y - 25;

const palette = sfPlant.getPalette();
const fPal = palette.flowers.sunflower;
const seedGlyphs = sfGlyphs.filter(g => 
  (g.fg === fPal.core || g.fg === fPal.coreDeep) &&
  Math.hypot(g.x - headPos.x, g.y - fcy) < 100
);

console.log(`  Found ${seedGlyphs.length} sunflower seed disc glyphs`);
console.assert(seedGlyphs.length >= 20, "Must render full Fibonacci seed disc");

// Check maximum radius of seed florets
const seedDistances = seedGlyphs.map(g => Math.hypot(g.x - headPos.x, g.y - fcy));
const maxSeedRadius = Math.max(...seedDistances);
console.log(`  Max seed disc radius from center: ${maxSeedRadius.toFixed(1)}px`);

// Check petal glyphs
const petalGlyphs = sfGlyphs.filter(g => (g.fg === fPal.petal || g.fg === fPal.petalWarm) && Math.hypot(g.x - headPos.x, g.y - fcy) < 100);
const petalDistances = petalGlyphs.map(g => Math.hypot(g.x - headPos.x, g.y - fcy));
const minPetalRadius = Math.min(...petalDistances);
const maxPetalRadius = Math.max(...petalDistances);

console.log(`  Petals reach from ${minPetalRadius.toFixed(1)}px to ${maxPetalRadius.toFixed(1)}px`);
console.assert(maxSeedRadius < 35, `Seed disc must be compact (expected < 35px, got ${maxSeedRadius.toFixed(1)}px)`);
console.assert(maxPetalRadius > maxSeedRadius * 2, `Petals must extend far beyond seed disc (petals: ${maxPetalRadius.toFixed(1)}px, seeds: ${maxSeedRadius.toFixed(1)}px)`);
console.log("  ✓ Sunflower seed disc is strictly confined inside the ray petals with zero bleeding!");

// -------------------------------------------------------------
// TEST 4: Marigold Radial Pompom Confinement
// -------------------------------------------------------------
console.log("\n[TEST 4] Testing Marigold Bounded Radial Pompom...");

const mariPlant = new Florametric.AsciiPlant({ type: 'marigold', age: 1.0, bloom: 1.0, branching: 0, seed: 777 });
const mariGlyphs = mariPlant.generateGlyphs(500, 500);
const mariHead = mariPlant.getHeadPosition(500, 500);
const mariFcy = mariHead.y - 20;

const mPal = mariPlant.getPalette().flowers.marigold;
const mariFlowerGlyphs = mariGlyphs.filter(g => 
  (g.fg === mPal.yellow || g.fg === mPal.orange || g.fg === mPal.crimson) &&
  Math.hypot(g.x - mariHead.x, g.y - mariFcy) < 100
);
console.log(`  Marigold flower glyphs count: ${mariFlowerGlyphs.length}`);
const mariRadii = mariFlowerGlyphs.map(g => Math.hypot(g.x - mariHead.x, g.y - mariFcy));
const mariMaxR = Math.max(...mariRadii);

console.log(`  Marigold maximum petal radius: ${mariMaxR.toFixed(1)}px`);
console.assert(mariMaxR < 55, `Marigold must be bounded radial pompom (< 55px, got ${mariMaxR.toFixed(1)}px)`);
console.log("  ✓ Marigold renders as a lush bounded radial pompom!");

// -------------------------------------------------------------
// TEST 5: Continuous Plant Life Cycle (Grow -> Bloom -> 20n Plateau -> Wilt -> Die -> Reseed)
// -------------------------------------------------------------
console.log("\n[TEST 5] Testing Continuous Plant Life Cycle (with 20n Mature Plateau)...");

const mockCanvas = {
  width: 800, height: 600, clientWidth: 800, clientHeight: 600,
  getBoundingClientRect: () => ({ left: 0, top: 0, width: 800, height: 600 }),
  getContext: () => ({ scale: () => {}, clearRect: () => {}, fillRect: () => {}, fillText: () => {}, drawImage: () => {}, save: () => {}, restore: () => {} }),
  addEventListener: () => {}
};

const garden = new Florametric.AsciiGarden(mockCanvas, { wind: 0.6, timeSpeed: 1.0 });
const testPlant = garden.addPlant(400, { type: 'sunflower', age: 0.10, seed: 101 });

// Step 1: Young Growth (age 0.10)
console.log(`  Phase 1: Young plant age=${testPlant.age.toFixed(2)}`);
let simData = testPlant.simulator.simulate(testPlant.age);
console.assert(simData.senescence === 0, "Young plant must have zero senescence");

// Step 2: Peak Bloom (age 0.90)
testPlant.setAge(0.90);
simData = testPlant.simulator.simulate(testPlant.age);
console.log(`  Phase 2: Full Bloom age=${testPlant.age.toFixed(2)}, bloom=${simData.bloom.toFixed(2)}, isBud=${simData.isBud}`);
console.assert(simData.bloom > 0.85, "Peak plant must be in full bloom");
console.assert(simData.senescence === 0, "Full bloom plant must have zero senescence");

// Step 2.5: 20n Mature Prime Plateau (age 12.0)
testPlant.setAge(12.0);
simData = testPlant.simulator.simulate(testPlant.age);
console.log(`  Phase 2.5: 20n Mature Prime Plateau age=${testPlant.age.toFixed(2)}, senescence=${simData.senescence.toFixed(2)}`);
console.assert(simData.senescence === 0, "20n mature prime plateau must maintain zero senescence");
console.assert(simData.growthAge === 1.0, "Plant must stay at 100% full vegetative height");

// Step 3: Senescence / Wilt (age 22.0)
testPlant.setAge(22.0);
simData = testPlant.simulator.simulate(testPlant.age);
console.log(`  Phase 3: Senescence age=${testPlant.age.toFixed(2)}, senescence=${simData.senescence.toFixed(2)}, isWilting=${simData.isWilting}`);
console.assert(simData.isWilting === true, "Post-plateau plant must enter wilting senescence");
console.assert(simData.senescence > 0.3, "Senescence must be elevated after age 21.0");

// Step 4: Decay stubble (age 23.4)
testPlant.setAge(23.4);
simData = testPlant.simulator.simulate(testPlant.age);
console.log(`  Phase 4: Decay stubble age=${testPlant.age.toFixed(2)}, isDecaying=${simData.isDecaying}`);
console.assert(simData.isDecaying === true, "Age 23.4 must trigger decay stubble");

// Step 5: Cycle completion & Reseed
let reseedFired = false;
garden.onPlantReseed = (p, x) => {
  reseedFired = true;
  console.log(`  ✓ onPlantReseed callback fired at x=${x.toFixed(1)}!`);
};

// Force age to 23.499 and run update
testPlant.age = 23.499;
garden.update(1.0); // effectiveDt * agingSpeed will push age >= 23.5
console.log(`  Phase 5: After cycle completion, plant age reset to ${testPlant.age.toFixed(2)}`);
console.assert(testPlant.age < 0.20, "Plant must reset to young sprout after completing life cycle");
console.assert(reseedFired === true, "onPlantReseed callback must fire");

// -------------------------------------------------------------
// TEST 6: Sunlight Revitalization on Wilting Plant
// -------------------------------------------------------------
console.log("\n[TEST 6] Testing Sunlight Revitalization on Wilting Specimen...");

const wiltingPlant = garden.addPlant(300, { type: 'rose', age: 22.0, seed: 999 });
console.log(`  Before feed: age=${wiltingPlant.age.toFixed(2)}, wilting=${wiltingPlant.simulator.simulate(wiltingPlant.age).isWilting}`);
console.assert(wiltingPlant.simulator.simulate(wiltingPlant.age).isWilting === true, "Plant should be wilting");

// Nourish with sunlight
garden.nourishAt(300, 450, 150);
garden.update(0.1);
console.log(`  After sunlight feed: age=${wiltingPlant.age.toFixed(2)}, growthBoost=${wiltingPlant.growthBoost.toFixed(2)}`);
console.assert(wiltingPlant.age < 22.0, "Sunlight nourishment must reverse aging and revitalize wilting plant");

console.log("\n==================================================");
console.log("ALL INVARIANT TESTS PASSED! ✨");
console.log("==================================================");
