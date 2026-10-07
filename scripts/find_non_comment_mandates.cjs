const fs = require('fs');
const path = require('path');

function walk(dir, filelist = []) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const filepath = path.join(dir, file);
    if (fs.statSync(filepath).isDirectory()) {
      if (file !== 'node_modules' && file !== '.git') walk(filepath, filelist);
    } else if (/\.(tsx|ts|jsx|js)$/.test(file) && !file.includes('.test.') && !file.includes('.spec.')) {
      filelist.push(filepath);
    }
  }
  return filelist;
}

const files = walk('apps/web/src');
let total = 0;
const results = [];

for (const f of files) {
  const content = fs.readFileSync(f, 'utf8');
  const lines = content.split('\n');
  lines.forEach((line, idx) => {
    if (/(Мандат|Mandate)/i.test(line)) {
      const trimmed = line.trim();
      // Skip regular comments
      if (/^\s*(\/\/|\/\*|\*)/.test(trimmed)) return;
      // Skip JSX comments: {/* ... */}
      if (/^\s*\{\/\*.*?\*\/\}\s*$/.test(trimmed)) return;
      if (/\{\/\*/.test(trimmed) && /\*\/\}/.test(trimmed) && !/["'`]/.test(trimmed) && !/>/.test(trimmed)) return;
      
      results.push({ file: f, line: idx + 1, text: trimmed });
      total++;
    }
  });
}

fs.writeFileSync('scripts/mandates_inventory.json', JSON.stringify(results, null, 2), 'utf8');
console.log(`Saved ${results.length} occurrences to scripts/mandates_inventory.json`);

