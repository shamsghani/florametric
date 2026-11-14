// Benchmark rendering performance
const ap = require('../florametric.js');

const garden = {
  plants: []
};

// Create 8 mature plants with full flowers (worst case scenario)
for (let i = 0; i < 8; i++) {
  const p = new ap.AsciiPlant({
    type: ['sunflower', 'hibiscus', 'iris', 'thistle', 'marigold', 'dandelion'][i % 6],
    age: 1.0,
    bloom: 1.0,
    height: 380,
    seed: 100 + i
  });
  garden.plants.push({ x: 100 + i * 120, plant: p });
}

console.log("8 plants created.");

// Benchmark glyph generation time
const t0 = Date.now();
let totalGlyphs = 0;
for (let frame = 0; frame < 60; frame++) {
  for (let { x, plant } of garden.plants) {
    const glyphs = plant.generateGlyphs(x, 600, frame * 0.016, 0.6);
    totalGlyphs += glyphs.length;
  }
}
const elapsed = Date.now() - t0;
console.log(`60 frames generated for 8 plants in ${elapsed}ms (${(elapsed/60).toFixed(2)}ms per frame)`);
console.log(`Average glyphs per frame: ${totalGlyphs / 60}`);
