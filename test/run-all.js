// Run every JavaScript test suite; exit non-zero if any suite throws or reports a
// failed console.assert (which on its own only prints and does not fail the process).
const { spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const dir = __dirname;
const suites = fs.readdirSync(dir).filter(f => /^test_.*\.js$/.test(f)).sort();
let failed = 0;

for (const file of suites) {
  const res = spawnSync(process.execPath, [path.join(dir, file)], { encoding: 'utf8' });
  const output = (res.stdout || '') + (res.stderr || '');
  const ok = res.status === 0 && !/Assertion failed/.test(output);
  if (!ok) {
    failed++;
    console.log(`✗ ${file}\n${output.split('\n').filter(l => /Assertion|Error|✗/.test(l)).slice(0, 8).join('\n')}`);
  } else {
    console.log(`✓ ${file}`);
  }
}

console.log(`\n${suites.length - failed}/${suites.length} suites passed`);
process.exit(failed ? 1 : 0);
