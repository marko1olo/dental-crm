const fs = require('fs');

const tsFilePath = 'apps/api/src/sampleData.ts';
let code = fs.readFileSync(tsFilePath, 'utf8');

// I will run a script to transpile this typescript code, maybe it's too much.
// I will just modify the code directly via bash to add performance timing to measure it.
