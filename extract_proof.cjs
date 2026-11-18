const { execFileSync } = require('child_process');
const fs = require('fs');

const buf = execFileSync('git', ['show', 'f2ab99379:docs/proofs/odontogram/01_pc_light_1440x900.png']);
fs.writeFileSync('temp_f2ab_proof_pc_light.png', buf);
console.log('Saved size:', buf.length);
