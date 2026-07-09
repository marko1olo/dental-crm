const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const getFiles = d => fs.readdirSync(d, {withFileTypes:true}).flatMap(f => f.isDirectory() ? getFiles(path.join(d, f.name)) : path.join(d, f.name));
const comps = getFiles('apps/web/src/components').filter(f => f.endsWith('.tsx') || f.endsWith('.ts'));
comps.forEach(c => {
  const name = path.basename(c, path.extname(c));
  if (name === 'index' || c.includes('tests')) return;
  try {
    const res = execSync(`git grep -l "${name}"`, { stdio: 'pipe' }).toString().trim();
    if (!res) { console.log('ORPHAN:', c); }
    else {
      const lines = res.split('\\n').map(l => path.resolve(l));
      const absC = path.resolve(c);
      if (lines.filter(l => l !== absC).length === 0) {
        console.log('ORPHAN:', c);
      }
    }
  } catch(e) {
    console.log('ORPHAN:', c);
  }
});