const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const getFiles = d => fs.readdirSync(d, {withFileTypes:true}).flatMap(f => f.isDirectory() ? getFiles(path.join(d, f.name)) : path.join(d, f.name));
const comps = getFiles('apps/web/src/components').filter(f => f.endsWith('.tsx') || f.endsWith('.ts'));
comps.forEach(c => {
  const name = path.basename(c, path.extname(c));
  const res = execSync(`git grep -l "${name}" || true`).toString().trim();
  if (!res || res.split('\\n').filter(p => p !== c.replace(/\\\\/g, '/')).length === 0) {
    console.log('ORPHAN:', c);
  }
});