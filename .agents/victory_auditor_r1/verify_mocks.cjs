const fs = require('fs');
const path = require('path');

function findFiles(dir, filter) {
  let results = [];
  const list = fs.readdirSync(dir);
  list.forEach(file => {
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);
    if (stat && stat.isDirectory()) {
      results = results.concat(findFiles(fullPath, filter));
    } else if (filter(fullPath)) {
      results.push(fullPath);
    }
  });
  return results;
}

const testFiles = findFiles(path.join(__dirname, '../../apps/api/src'), p => p.endsWith('.test.ts'));
console.log(`Found ${testFiles.length} test files in apps/api/src:`);
testFiles.forEach(f => console.log(' - ' + path.relative(path.join(__dirname, '../../'), f)));

let totalDbMocks = 0;
testFiles.forEach(file => {
  const content = fs.readFileSync(file, 'utf8');
  const lines = content.split('\n');
  lines.forEach((line, idx) => {
    if (line.includes('mock.method(db') || line.includes('mock.method(') && line.includes('db')) {
      console.log(`MATCH in ${path.basename(file)}:${idx+1}: ${line.trim()}`);
      totalDbMocks++;
    }
  });
});

console.log(`Total DB query mocks found: ${totalDbMocks}`);
