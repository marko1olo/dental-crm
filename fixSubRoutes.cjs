const fs = require('fs');
const path = require('path');
const routesDir = 'C:/Clinic_MVP/dental-crm/apps/api/src/routes/documents';
const subFiles = fs.readdirSync(routesDir).filter(f => f.endsWith('.ts'));

for (const f of subFiles) {
  const p = path.join(routesDir, f);
  let sub = fs.readFileSync(p, 'utf8');
  
  if (sub.includes('readIssuedDocumentSnapshot')) {
    sub = sub.replace(/readIssuedDocumentSnapshot,?\s*/, '');
    sub = 'import { readIssuedDocumentSnapshot } from "../../db/documentQuery.js";\n' + sub;
  }
  
  if (sub.includes('findIssuedDuplicateTaxCertificate(document)')) {
     sub = sub.replace(/await findIssuedDuplicateTaxCertificate\(document\)/g, 'await findIssuedDuplicateTaxCertificate(document, [])');
  }

  fs.writeFileSync(p, sub);
}
console.log('Fixed imports in sub-routes safely');
