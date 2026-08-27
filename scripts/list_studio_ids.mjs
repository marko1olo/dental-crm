import fs from 'fs';

const c = fs.readFileSync('apps/web/src/pages/ClinicalModalsStudioStandalone.tsx', 'utf8');
const regex = /data-testid="([^"]+)"/g;
let m;
const testIds = [];
while ((m = regex.exec(c)) !== null) {
  testIds.push(m[1]);
}
console.log('Total test IDs found:', testIds.length);
testIds.forEach(id => console.log(' -', id));
