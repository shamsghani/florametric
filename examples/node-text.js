// Plain-text ASCII plants for terminals, READMEs and chat: node examples/node-text.js [species]
const Florametric = require('../florametric.js');

const type = process.argv[2] || 'tulip';
console.log(Florametric.generateString({ type, age: 1, bloom: 1, seed: 7, cols: 44, rows: 28 }));
