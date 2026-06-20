const fs = require('fs');
const lines = fs.readFileSync('apps/web/src/App.tsx', 'utf8').split(/\r?\n/);
let inOnboarding = false;
let content = '';
for(let i=12327; i<13294; i++) {
  content += lines[i] + '\n';
}
fs.writeFileSync('scratch/onboarding.txt', content);
