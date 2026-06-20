const fs = require('fs');
const lines = fs.readFileSync('apps/web/src/App.tsx', 'utf8').split(/\r?\n/);
let start = lines.findIndex(l => l.includes('return (') && l.includes('app-shell'));
if (start === -1) {
  start = lines.findIndex(l => l.includes('return (') && l.includes('className="app'));
}
if (start === -1) {
  start = lines.findIndex(l => l.includes('return ('));
}
console.log(lines.slice(start, start+100).join('\n'));
