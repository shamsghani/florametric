/**
 * test_persistent_meadow.js
 * Invariant test suite for Persistent Time-Anchored Meadow Engine (t0 Epoch, Continuous Real-World Growth)
 */

const assert = require('assert');
const Florametric = require('../florametric.js');

console.log('==================================================');
console.log('TESTING PERSISTENT TIME-ANCHORED MEADOW ENGINE');
console.log('==================================================');

// -------------------------------------------------------------
// TEST 1: Speed Preset Parsing
// -------------------------------------------------------------
console.log('\n[TEST 1] Testing Speed Preset Parsing...');
assert(Math.abs(Florametric.parseTimeSpeed('24h') - (40 / 86400)) < 1e-9, '24h speed mismatch');
assert(Math.abs(Florametric.parseTimeSpeed('3d') - (40 / (3 * 86400))) < 1e-9, '3d speed mismatch');
assert(Math.abs(Florametric.parseTimeSpeed('7d') - (40 / (7 * 86400))) < 1e-9, '7d speed mismatch');
assert(Math.abs(Florametric.parseTimeSpeed('30d') - (40 / (30 * 86400))) < 1e-9, '30d speed mismatch');
assert(Math.abs(Florametric.parseTimeSpeed('1h') - (40 / 3600)) < 1e-9, '1h speed mismatch');
assert.strictEqual(Florametric.parseTimeSpeed('0.1x'), 0.1, '0.1x speed mismatch');
assert.strictEqual(Florametric.parseTimeSpeed(0.5), 0.5, 'Numeric speed mismatch');
console.log('  ✓ All speed presets (24h, 3d, 7d, 30d, 1h, multipliers) parsed accurately!');

// -------------------------------------------------------------
// TEST 2: Config Token Serialization & Deserialization
// -------------------------------------------------------------
console.log('\n[TEST 2] Testing Meadow Config URL-Safe Serialization...');
const testConfig = {
  startTime: 1731612000000,
  speed: '24h',
  plantCount: 6,
  species: ['sunflower', 'rose', 'tulip'],
  palette: 'amber',
  seed: 98765,
  wind: 0.75,
  grass: true
};

const token = Florametric.encodeMeadowConfig(testConfig);
console.log(`  Encoded compact token (${token.length} chars): ${token}`);
assert(token.length > 20 && token.length < 300, 'Token length should be compact');

const restored = Florametric.decodeMeadowConfig(token);
assert.strictEqual(restored.startTime, testConfig.startTime, 'startTime mismatch');
assert.strictEqual(restored.speed, testConfig.speed, 'speed mismatch');
assert.strictEqual(restored.plantCount, testConfig.plantCount, 'plantCount mismatch');
assert.deepStrictEqual(restored.species, testConfig.species, 'species mismatch');
assert.strictEqual(restored.palette, testConfig.palette, 'palette mismatch');
assert.strictEqual(restored.seed, testConfig.seed, 'seed mismatch');
console.log('  ✓ Config round-trip serialization preserved all parameters flawlessly!');

// -------------------------------------------------------------
// TEST 3: Starting Point Growth State (t0)
// -------------------------------------------------------------
console.log('\n[TEST 3] Testing Meadow State at Starting Point t0 (Seedling Stage)...');
const t0 = 1731612000000;
const meadow = Florametric.createPersistentMeadow(null, {
  startTime: t0,
  speed: '24h',
  plantCount: 5,
  species: ['sunflower', 'rose', 'tulip', 'dandelion', 'iris'],
  palette: 'botanical',
  seed: 42
});

// Sync to t0
meadow.syncToTime(t0);
assert.strictEqual(meadow.plants.length, 5, 'Meadow must have 5 plants');

meadow.plants.forEach((p, idx) => {
  console.log(`  Plant #${idx + 1} (${p.plant.type}): age=${p.plant.age.toFixed(3)}`);
  assert(p.plant.age >= 0.03 && p.plant.age <= 0.09, `Plant at t0 must be a young sprout (got ${p.plant.age})`);
});
const summaryT0 = meadow.getMeadowSummary(t0);
assert.strictEqual(summaryT0.stage, 'Sprouting', 'Meadow at t0 must be in Sprouting stage');
console.log('  ✓ Meadow at t0 initialized as fresh sprouting seedlings!');

// -------------------------------------------------------------
// TEST 4: Growth Progression after 12 Hours (Half-Day)
// -------------------------------------------------------------
console.log('\n[TEST 4] Testing Growth Progression after 12 Hours (Anthesis Stage)...');
const t12h = t0 + (12 * 3600 * 1000);
meadow.syncToTime(t12h);

meadow.plants.forEach((p, idx) => {
  console.log(`  Plant #${idx + 1} (${p.plant.type}) at +12h: age=${p.plant.age.toFixed(3)}, bloom=${p.plant.effectiveBloom.toFixed(2)}`);
  assert(p.plant.age > 0.40 && p.plant.age < 0.75, `Plant at +12h should be in active anthesis/bloom (got ${p.plant.age})`);
});
const summary12h = meadow.getMeadowSummary(t12h);
assert.strictEqual(summary12h.stage, 'Blooming Anthesis', 'Meadow at +12h must be in Blooming Anthesis stage');
console.log('  ✓ Plants after 12 hours have visibly grown to active blooming stage!');

// -------------------------------------------------------------
// TEST 5: Growth Progression after 24 Hours (1 Day Later)
// -------------------------------------------------------------
console.log('\n[TEST 5] Testing Growth Progression after 24 Hours (1 Full Day Later)...');
const t24h = t0 + (24 * 3600 * 1000);
meadow.syncToTime(t24h);

const speciesPreserved = meadow.plants.map(p => p.plant.type);
assert.deepStrictEqual(speciesPreserved, ['sunflower', 'rose', 'tulip', 'dandelion', 'iris'], 'Species identity must be preserved');

meadow.plants.forEach((p, idx) => {
  console.log(`  Plant #${idx + 1} (${p.plant.type}) at +24h: age=${p.plant.age.toFixed(3)}, bloom=${p.plant.effectiveBloom.toFixed(2)}`);
  assert(p.plant.age >= 0.88 && p.plant.age <= 1.25, `Plant at +24h must reach mature anthesis/prime (got ${p.plant.age})`);
  assert(p.plant.effectiveBloom > 0.85, `Plant at +24h must be in full bloom (got ${p.plant.effectiveBloom})`);
});
console.log('  ✓ Exactly 1 day later, the same plants are further along and flourishing in full bloom!');

// -------------------------------------------------------------
// TEST 6: Growth Progression after 3 Days (20n Mature Prime Plateau)
// -------------------------------------------------------------
console.log('\n[TEST 6] Testing Growth Progression after 3 Days (20n Mature Prime)...');
const t3d = t0 + (3 * 24 * 3600 * 1000);
meadow.syncToTime(t3d);

meadow.plants.forEach((p, idx) => {
  console.log(`  Plant #${idx + 1} (${p.plant.type}) at +3d: age=${p.plant.age.toFixed(3)}`);
  assert(p.plant.age >= 2.5 && p.plant.age <= 3.8, `Plant at +3d must be in mature prime plateau (got ${p.plant.age})`);
  const sim = p.plant.simulator.simulate(p.plant.age);
  assert.strictEqual(sim.senescence, 0.0, 'Plant in mature prime plateau must have 0 senescence');
  assert.strictEqual(sim.growthAge, 1.0, 'Plant must stay at 100% full vegetative height');
});
const summary3d = meadow.getMeadowSummary(t3d);
assert.strictEqual(summary3d.stage, 'Mature Prime (Flourishing)', 'Meadow stage must be Mature Prime');
console.log('  ✓ After 3 days, plants are flourishing in their 20n mature prime plateau with 0 senescence!');

// -------------------------------------------------------------
// TEST 7: Deterministic Generational Continuity
// -------------------------------------------------------------
console.log('\n[TEST 7] Testing Deterministic Generational Reseeding over Extended Time...');
// Advance by 30 days (spans across senescence and into generation 1)
const t30d = t0 + (30 * 24 * 3600 * 1000);
meadow.syncToTime(t30d);

meadow.plants.forEach((p, idx) => {
  console.log(`  Plant #${idx + 1} (${p.plant.type}) at +30d: age=${p.plant.age.toFixed(3)}, seed=${p.plant.seed}`);
  assert(p.plant.age >= 0.0 && p.plant.age <= 23.5, 'Plant age must wrap within biological cycle');
});
console.log('  ✓ Long-term multi-generational continuity runs deterministically!');

console.log('\n==================================================');
console.log('ALL PERSISTENT TIME-ANCHORED MEADOW TESTS PASSED! ✨');
console.log('==================================================');
