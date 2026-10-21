const fs = require('fs');
const path = require('path');

const report = JSON.parse(fs.readFileSync(path.join(__dirname, 'diff_blocks_report.json'), 'utf8'));

for (const item of report) {
  console.log(`=== FILE: ${item.filePath} (+${item.addedCount} / -${item.removedCount}) ===`);
  const lines = item.block.split('\n');
  const hunks = lines.filter(l => l.startsWith('+') || l.startsWith('-') || l.startsWith('@@'));
  hunks.forEach(h => console.log(h));
  console.log('\n');
}
