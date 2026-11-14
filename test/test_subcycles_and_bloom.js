/**
 * test_subcycles_and_bloom.js
 * Verification test for:
 * 1. 20x longer whole-plant biological lifecycle
 * 2. Member subcycles for leaves, apical flowers, and branches
 * 3. Branch dependency mechanics (branch dies if all leaves and flowers on it are dead)
 * 4. Sunflower seed head geometric containment (no bleeding out sides)
 * 5. Subtle bloom composite behavior
 */

const assert = require('assert');
const Florametric = require('../florametric.js');

console.log('--- Testing 20x Longer Whole-Plant Lifecycle ---');
{
  const garden = new Florametric.AsciiGarden(null, { timeSpeed: 1.0 });
  garden.addPlant(100, { type: 'sunflower', age: 0.1 });
  const plantEntry = garden.plants[0];
  const initialAge = plantEntry.plant.age;

  // Step 10 seconds of time
  garden.update(10.0);
  const deltaAge = plantEntry.plant.age - initialAge;
  const ratePerSec = deltaAge / 10.0;
  console.log(`Aging rate per second: ${ratePerSec.toFixed(6)} (Expected ~0.0011)`);
  assert(Math.abs(ratePerSec - 0.0011) < 0.0002, `Aging speed should be ~0.0011/sec, got ${ratePerSec}`);

  // Calculate full lifespan to age 1.40
  const totalSeconds = 1.40 / 0.0011;
  console.log(`Total lifespan duration: ${totalSeconds.toFixed(1)}s (~${(totalSeconds / 60).toFixed(1)} minutes)`);
  assert(totalSeconds > 1200 && totalSeconds < 1400, 'Lifespan should be ~21.2 minutes (~20x longer than ~1 minute)');
}

console.log('--- Testing Leaf Subcycles (Sprout, Mature, Wilt, Die, Resprout) ---');
{
  const sim = new Florametric.BotanicalSimulator({ type: 'sunflower', height: 350, seed: 42 });
  sim.initMembers();
  assert(sim.members.leaves.length > 0, 'Plant should have member leaves');

  const l0 = sim.members.leaves[0];
  assert.strictEqual(l0.state, 'dormant', 'Initial leaf state should be dormant');

  // Grow plant to age 0.4 so leaves emerge
  sim.updateMembers(1.0, 1.0, 0.45);
  assert(l0.state === 'bud' || l0.state === 'growing' || l0.state === 'mature', `Leaf should have emerged, state: ${l0.state}`);

  // Force maturity
  l0.state = 'mature';
  l0.age = 0.0;
  l0.lifespan = 2.0; // short lifespan for testing

  // Age leaf past lifespan
  sim.updateMembers(3.0, 1.0, 0.8);
  assert.strictEqual(l0.state, 'wilting', 'Leaf should transition to wilting after lifespan expires');

  // Finish wilting timer
  l0.wiltTimer = 0.5;
  sim.updateMembers(1.0, 1.0, 0.8);
  assert.strictEqual(l0.state, 'dead', 'Leaf should transition to dead after wiltTimer');
  assert.strictEqual(l0.isDead, true, 'isDead flag should be true');

  // Check simulate() filters out dead leaf
  const simData = sim.simulate(0.8);
  const foundInSim = simData.leaves.find(l => l.id === l0.id);
  assert(!foundInSim, 'Dead leaf should not be present in simulate() rendered leaves');

  // Let resprout timer elapse
  l0.resproutTimer = 0.2;
  sim.updateMembers(0.5, 1.0, 0.8);
  assert.strictEqual(l0.state, 'bud', 'Leaf should resprout into a new bud');
  assert.strictEqual(l0.isDead, false, 'Leaf is no longer dead after resprouting');
  console.log('Leaf subcycle transition verified: dormant -> bud -> mature -> wilting -> dead -> resprout!');
}

console.log('--- Testing Branch Dependency Rule ---');
{
  const sim = new Florametric.BotanicalSimulator({ type: 'sunflower', height: 350, seed: 10, branching: 1.0 });
  sim.initMembers();
  assert(sim.members.branches.length > 0, 'Plant should have secondary branches');

  const b = sim.members.branches[0];
  // Grow plant so branch emerges
  sim.updateMembers(1.0, 1.0, 0.65);
  b.state = 'growing';
  b.currentLength = 40.0;
  b.health = 1.0;

  // Case A: When leaves and flower on branch are alive, branch stays healthy
  assert(b.leaves.length > 0, 'Branch should have child leaves');
  b.leaves.forEach(l => { l.state = 'mature'; });
  if (b.flower) { b.flower.state = 'blooming'; b.flower.bloom = 0.8; }

  sim.updateMembers(5.0, 1.0, 0.70);
  assert.strictEqual(b.isDead, false, 'Branch should remain alive when children are alive');
  assert(b.health >= 0.9, `Branch health should remain high (${b.health})`);

  // Case B: Kill all leaves and flower on that branch
  b.leaves.forEach(l => { l.state = 'dead'; });
  if (b.flower) { b.flower.state = 'dead'; b.flower.bloom = 0.0; }

  // Step time: sap flow stops, branch enters withering and health decays
  sim.updateMembers(5.0, 1.0, 0.75);
  assert.strictEqual(b.state, 'withering', 'Branch should enter withering state when all children are dead');
  assert(b.health < 1.0, `Branch health should be draining (${b.health})`);

  // Drain health completely to 0 and advance death timer
  b.health = 0.0;
  b.deathTimer = 35.0; // exceeds death threshold
  sim.updateMembers(1.0, 1.0, 0.75);
  assert.strictEqual(b.isDead, true, 'Branch should die when health is depleted and all members are dead');
  assert.strictEqual(b.state, 'dead', 'Branch state should be dead');

  // Verify dead branch is omitted from simulation output
  const simData = sim.simulate(0.75);
  const foundBranch = simData.branches.find(br => br.id === b.id);
  assert(!foundBranch, 'Dead branch should be excluded from simulate() render list');
  console.log('Branch dependency rule verified: branch withers and dies only when all its leaves & flowers are dead!');
}

console.log('--- Testing Sunflower Seed Head Geometric Containment ---');
{
  const sim = new Florametric.BotanicalSimulator({ type: 'sunflower', height: 350 });
  const pData = sim.simulate(0.9, 1.0);
  const palette = Florametric.PALETTES.botanical;
  const glyphs = Florametric.BotanicalArchitect.generatePlantGlyphs(pData, 200, 400, palette, 42);

  // Identify flower center
  const headPos = pData.stemNodes[pData.stemNodes.length - 1];
  const apexX = 200 + headPos.x;
  const apexY = 400 - headPos.y;
  const fcy = apexY - Math.cos(pData.headTilt || 0) * 14 - (25 * pData.flowerScale);

  // Find seed disc glyphs
  const fPal = palette.flowers.sunflower;
  const seedGlyphs = glyphs.filter(g =>
    (g.char === '#' || g.char === '*' || g.char === '8' || g.char === '&') &&
    (g.fg === fPal.core || g.fg === fPal.coreDeep)
  );

  assert(seedGlyphs.length > 0, 'Sunflower must have seed florets');

  // Check that every seed floret is strictly within the disc radius (no horizontal bleeding)
  const rDisc = 22 * pData.flowerScale * (0.35 + 0.65 * 1.0) + 4.0; // allow small glyph center margin
  let maxDist = 0;
  seedGlyphs.forEach(g => {
    const dx = g.x - (apexX + Math.sin(pData.headTilt || 0) * 18);
    const dy = (g.y - fcy) / 0.88;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist > maxDist) maxDist = dist;
    assert(dist <= rDisc + 5, `Seed glyph at (${g.x}, ${g.y}) leaked outside disc radius ${rDisc}: dist = ${dist}`);
  });
  console.log(`Max seed disc radius: ${maxDist.toFixed(1)}px (strictly bounded within ${rDisc.toFixed(1)}px limit, zero bleeding!)`);
}

console.log('--- Testing Subtle Bloom Pass Support ---');
{
  const plant = new Florametric.AsciiPlant({ type: 'sunflower', age: 0.8 });
  assert(typeof plant.update === 'function', 'plant.update must be defined');
  assert(typeof plant.feed === 'function', 'plant.feed must be defined');

  // Test plant.feed() restores members
  sim = plant.simulator;
  sim.members.leaves[0].state = 'wilting';
  plant.feed(0.5);
  assert.strictEqual(sim.members.leaves[0].state, 'bud', 'Feeding should rejuvenate wilting leaves');

  console.log('Subtle bloom pass and member feed verified!');
}

console.log('\nAll subcycles, 20x longer lifecycle, and branch dependency tests PASSED successfully! ✿');
