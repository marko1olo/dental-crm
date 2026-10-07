const fs = require('fs');
const path = require('path');

function walk(dir, fileList = []) {
  if (!fs.existsSync(dir)) return fileList;
  for (const file of fs.readdirSync(dir)) {
    const full = path.join(dir, file);
    if (fs.statSync(full).isDirectory()) {
      if (file !== 'node_modules' && file !== 'dist' && file !== '.git') walk(full, fileList);
    } else if (full.endsWith('.tsx') || full.endsWith('.ts')) {
      fileList.push(full);
    }
  }
  return fileList;
}

const files = walk('apps/web/src');
let uiMatches = [];

for (const file of files) {
  if (file.includes('__tests__') || file.includes('.test.')) continue;
  const lines = fs.readFileSync(file, 'utf8').split('\n');
  lines.forEach((line, idx) => {
    const trimmed = line.trim();
    if (trimmed.startsWith('//') || trimmed.startsWith('/*') || trimmed.startsWith('*')) return;
    
    // Check if it's user facing (inside string literal or JSX)
    const isJargon = trimmed.includes('Мандат') || 
                     trimmed.includes('Mandate 8') || 
                     trimmed.includes('0 блокировок') || 
                     trimmed.includes('ВНУТРЕННИЙ ЖАРГОН') ||
                     trimmed.includes('Wave ') ||
                     trimmed.includes('Взрослый стандарт') ||
                     trimmed.includes('взрослый стандарт') ||
                     trimmed.includes('детское говно') ||
                     (trimmed.includes('804н') && (trimmed.includes('title=') || trimmed.includes('placeholder=') || trimmed.includes('label') || trimmed.includes('>') || trimmed.includes('"') || trimmed.includes("'")));

    if (isJargon) {
      uiMatches.push({ file: path.relative('apps/web/src', file), lineNum: idx + 1, text: trimmed });
    }
  });
}

console.log('Total non-test potential UI lines:', uiMatches.length);
// Group by top-level component directory
const byDir = {};
for (const m of uiMatches) {
  const parts = m.file.split(path.sep);
  const dir = parts.length > 1 ? parts[0] + '/' + parts[1] : parts[0];
  byDir[dir] = (byDir[dir] || 0) + 1;
}
console.log('By directory:', JSON.stringify(byDir, null, 2));
console.log('\nSample matches:');
uiMatches.slice(0, 30).forEach(m => console.log(`${m.file}:${m.lineNum} -> ${m.text.slice(0, 110)}`));
