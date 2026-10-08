const fs = require('fs');
const path = require('path');

const dir = path.resolve('apps/web/src/components/visit/emkTab');
const files = fs.readdirSync(dir);

for (const file of files) {
  if (!file.endsWith('.ts') && !file.endsWith('.tsx')) continue;
  const filePath = path.join(dir, file);
  let content = fs.readFileSync(filePath, 'utf8');

  // Fix any three dots .../ caused by naive replacement
  content = content.replaceAll('.../../', '../../../');
  content = content.replaceAll('.../', '../../');

  fs.writeFileSync(filePath, content, 'utf8');
}
console.log('Cleaned up dots in emkTab');
