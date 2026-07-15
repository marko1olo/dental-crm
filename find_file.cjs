const fs = require('fs');
const path = require('path');
function walk(dir) {
  let results = [];
  const list = fs.readdirSync(dir);
  list.forEach(file => {
    file = path.join(dir, file);
    const stat = fs.statSync(file);
    if (stat && stat.isDirectory()) {
      results = results.concat(walk(file));
    } else if (file.endsWith('.tsx')) {
      const content = fs.readFileSync(file, 'utf-8');
      if (content.includes('type="file"')) results.push(file);
    }
  });
  return results;
}
console.log(walk('apps/web/src'));
