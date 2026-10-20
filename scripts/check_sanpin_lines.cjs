const fs = require('fs');
const path = require('path');

function getFiles(dir) {
  let results = [];
  if (!fs.existsSync(dir)) return results;
  const list = fs.readdirSync(dir);
  list.forEach(file => {
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);
    if (stat && stat.isDirectory()) {
      results = results.concat(getFiles(fullPath));
    } else if (file.endsWith('.ts') || file.endsWith('.tsx')) {
      const content = fs.readFileSync(fullPath, 'utf8');
      const lines = content.split('\n').length;
      results.push({ file: path.relative(process.cwd(), fullPath).replace(/\\/g, '/'), lines });
    }
  });
  return results;
}

const files = getFiles('apps/web/src/components/sanpin');
if (fs.existsSync('apps/web/src/ScannerView.tsx')) {
  const scannerContent = fs.readFileSync('apps/web/src/ScannerView.tsx', 'utf8');
  files.push({ file: 'apps/web/src/ScannerView.tsx', lines: scannerContent.split('\n').length });
}

files.sort((a, b) => b.lines - a.lines);
console.log('--- FILES OVER 120 LINES (EXCLUDING TESTS) ---');
const over = files.filter(f => f.lines > 120 && !f.file.includes('__tests__'));
over.forEach(f => console.log(`${f.lines}\t${f.file}`));
console.log('Total over 120 lines:', over.length);
