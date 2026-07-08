const fs = require('fs');
const content = fs.readFileSync('apps/api/src/treatment/TreatmentPlanBuilder.ts', 'utf-8');
const lines = content.split('\n');

for (let i = 0; i < lines.length; i += 20) {
  console.log(`--- Lines ${i + 1} to ${Math.min(i + 20, lines.length)} ---`);
  console.log(lines.slice(i, i + 20).join('\n'));
}
