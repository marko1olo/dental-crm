const fs = require('fs');
const { execSync } = require('child_process');

console.log("Compiling TS to JS to measure performance...");
execSync("npx tsc --build apps/api/tsconfig.json || true", { stdio: 'inherit' });
