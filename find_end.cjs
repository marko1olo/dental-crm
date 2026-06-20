const fs = require('fs');
const lines = fs.readFileSync('apps/web/src/App.tsx', 'utf-8').split('\n');
let endIdx = 0;
for(let i=21008; i<lines.length; i++) {
  if (lines[i].includes(' : null}')) {
    console.log(`Line ${i}: ${lines[i]}`);
  }
}
