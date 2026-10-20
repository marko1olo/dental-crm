const fs = require('fs');
const path = require('path');

const gate0Dir = path.resolve('apps/web/src/components/odontogram/gate0');
const sharedDir = path.resolve('apps/web/src/components/odontogram/shared');

function scanIds(dir) {
  const files = fs.readdirSync(dir, { recursive: true }).filter(f => typeof f === 'string' && (f.endsWith('.tsx') || f.endsWith('.ts')));
  const idDefs = {};
  const idRefs = {};

  files.forEach(f => {
    const fullPath = path.join(dir, f);
    if (!fs.statSync(fullPath).isFile()) return;
    const content = fs.readFileSync(fullPath, 'utf8');

    // definitions: id="..."
    const defMatches = content.matchAll(/\bid=["']([^"']+)["']/g);
    for (const m of defMatches) {
      const id = m[1];
      if (!idDefs[id]) idDefs[id] = [];
      idDefs[id].push(f);
    }

    // references: url(#...)
    const refMatches = content.matchAll(/url\(#([^)]+)\)/g);
    for (const m of refMatches) {
      const id = m[1];
      if (!idRefs[id]) idRefs[id] = [];
      idRefs[id].push(f);
    }
  });

  return { idDefs, idRefs };
}

const gate0 = scanIds(gate0Dir);
console.log('--- GATE0 ID DEFINITIONS ---');
console.log(JSON.stringify(gate0.idDefs, null, 2));

console.log('--- GATE0 URL REFERENCES ---');
console.log(JSON.stringify(gate0.idRefs, null, 2));

// Check missing references
const missing = Object.keys(gate0.idRefs).filter(id => !gate0.idDefs[id]);
console.log('--- MISSING IN GATE0 ---', missing);
