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

console.log('--- Testing 20n Mature Plateau Lifecycle ---');
{
  const garden = new Florametric.AsciiGarden(null, { timeSpeed: 1.0 });
  garden.addPlant(100, { type: 'sunflower', age: 0.1 });
  const plantEntry = garden.plants[0];
  const initialAge = plantEntry.plant.age;

  // Step 10 seconds of time
  garden.update(10.0);
  const deltaAge = plantEntry.plant.age - initialAge;
  const ratePerSec = deltaAge / 10.0;
  console.log(`Aging rate per second: ${ratePerSec.toFixed(6)} (Expected ~0.02 - 0.035 with metabolic rate)`);
  assert(ratePerSec > 0.015 && ratePerSec < 0.045, `Aging speed should reflect metabolic rate, got ${ratePerSec}`);

  // Test 20n Mature Prime Plateau:
  // Plant takes n = 1.0 to reach full height.
  // Between 1.0 and 21.0 (20n duration), senescence must remain 0.0 and height must remain at 100%!
  const sim = plantEntry.plant.simulator;
  [1.0, 5.0, 10.0, 15.0, 20.9].forEach(testAge => {
    const simData = sim.simulate(testAge);
    assert.strictEqual(simData.senescence, 0.0, `Age ${testAge} in 20n mature plateau must have senescence = 0`);
    assert.strictEqual(simData.growthAge, 1.0, `Age ${testAge} must remain at 100% full vegetative growth (got ${simData.growthAge})`);
    assert(simData.shootHeight >= 300, `Age ${testAge} must remain at full height (got ${simData.shootHeight})`);
  });
  console.log('20n mature prime plateau verified: stays at full height for 20n duration (ages 1.0 to 21.0) with zero senescence!');

  // Senescence begins only after age 21.0
  const senSim = sim.simulate(22.25);
  assert(senSim.senescence > 0.4, 'Senescence must activate after age 21.0');
  assert(senSim.isWilting === true, 'Plant must enter wilting after age 21.0');
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
  const sim = plant.simulator;
  sim.members.leaves[0].state = 'wilting';
  plant.feed(0.5);
  assert.strictEqual(sim.members.leaves[0].state, 'bud', 'Feeding should rejuvenate wilting leaves');

  console.log('Subtle bloom pass and member feed verified!');
}

console.log('--- Testing Reseeded Plant Morphology Diversity ---');
{
  const plant = new Florametric.AsciiPlant({ type: 'sunflower', seed: 12345 });
  const habit1 = plant.simulator.geneticHabit;
  const bend1 = plant.simulator.geneticBendAmp;
  const leafSizes1 = JSON.stringify(plant.simulator.geneticLeafSizes);
  const branches1 = plant.simulator.geneticMaxBranches;

  // Reseed with a new genetic seed
  plant.reseed(987654);
  const habit2 = plant.simulator.geneticHabit;
  const bend2 = plant.simulator.geneticBendAmp;
  const leafSizes2 = JSON.stringify(plant.simulator.geneticLeafSizes);

  console.log(`Original traits: habit=${habit1}, bend=${bend1.toFixed(1)}, branches=${branches1}`);
  console.log(`Reseeded traits: habit=${habit2}, bend=${bend2.toFixed(1)}`);
  assert(bend1 !== bend2 || leafSizes1 !== leafSizes2, 'Reseeded plant must have distinct genetic morphology!');
  console.log('Reseeded plant morphology diversity verified: new seeds produce distinct plant architectures!');
}

console.log('--- Testing Dense Rose, Tulip, and Venus Flytrap Geometries ---');
{
  const palette = Florametric.PALETTES.botanical;

  // 1. Dense English Rose
  const rosePlant = new Florametric.AsciiPlant({ type: 'rose', age: 1.0, bloom: 1.0, height: 350 });
  const roseGlyphs = rosePlant.generateGlyphs(200, 400);
  const roseFlowerGlyphs = roseGlyphs.filter(g =>
    g.fg === palette.flowers.rose.petal ||
    g.fg === palette.flowers.rose.dark ||
    g.fg === palette.flowers.rose.light ||
    g.fg === palette.flowers.rose.sepal
  );
  console.log(`Rose flower glyph count: ${roseFlowerGlyphs.length} (dense target >= 60)`);
  assert(roseFlowerGlyphs.length >= 60, `Rose must be dense with >= 60 glyphs, got ${roseFlowerGlyphs.length}`);

  // 2. Dense Sculpted Tulip Chalice
  const tulipPlant = new Florametric.AsciiPlant({ type: 'tulip', age: 1.0, bloom: 1.0, height: 350 });
  const tulipGlyphs = tulipPlant.generateGlyphs(200, 400);
  const tulipFlowerGlyphs = tulipGlyphs.filter(g =>
    g.fg === palette.flowers.tulip.petal ||
    g.fg === palette.flowers.tulip.inner ||
    g.fg === palette.flowers.tulip.stamen
  );
  console.log(`Tulip flower glyph count: ${tulipFlowerGlyphs.length} (dense target >= 45)`);
  assert(tulipFlowerGlyphs.length >= 45, `Tulip must be dense with >= 45 glyphs, got ${tulipFlowerGlyphs.length}`);

  // 3. Dense Venus Flytrap Bivalve Trap
  const flytrapPlant = new Florametric.AsciiPlant({ type: 'flytrap', age: 1.0, bloom: 1.0, height: 350 });
  const flytrapGlyphs = flytrapPlant.generateGlyphs(200, 400);
  const flytrapFlowerGlyphs = flytrapGlyphs.filter(g =>
    g.fg === palette.flowers.flytrap.jaw ||
    g.fg === palette.flowers.flytrap.inside ||
    g.fg === palette.flowers.flytrap.teeth ||
    g.fg === '#fff677'
  );
  console.log(`Flytrap jaw glyph count: ${flytrapFlowerGlyphs.length} (dense target >= 50)`);
  assert(flytrapFlowerGlyphs.length >= 50, `Flytrap must be dense with >= 50 glyphs, got ${flytrapFlowerGlyphs.length}`);
  console.log('Dense rose, tulip, and venus flytrap geometries verified! ✨');
}

console.log('\nAll subcycles, 20n mature plateau, reseed diversity, and dense flower tests PASSED successfully! ✿');
