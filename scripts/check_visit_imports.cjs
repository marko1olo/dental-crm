const fs = require('fs');
const path = require('path');

const dir = path.resolve('apps/web/src/hooks/domains/visit');
const files = fs.readdirSync(dir);

console.log('Checking files in:', dir);
for (const file of files) {
  if (!file.endsWith('.ts') && !file.endsWith('.tsx')) continue;
  const filePath = path.join(dir, file);
  let content = fs.readFileSync(filePath, 'utf8');
  let changed = false;

  // Replace ../../ with ../../../ for root-level modules
  const patterns = [
    '../../AppHelpers',
    '../../motionPreference',
    '../../store/',
    '../../components/',
    '../../lib/',
    '../../utils/',
    '../../services/',
    '../../types/',
  ];

  for (const pattern of patterns) {
    const target = pattern;
    const replacement = '../' + pattern;
    if (content.includes(target)) {
      console.log(`Replacing ${target} -> ${replacement} in ${file}`);
      content = content.replaceAll(target, replacement);
      changed = true;
    }
  }

  if (changed) {
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`Updated ${file}`);
  }
}
