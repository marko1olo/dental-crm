const fs = require('fs');
let code = fs.readFileSync('C:/Clinic_MVP/dental-crm/apps/api/src/db/documentQuery.ts', 'utf8');

code = code.replace(/storagePath: snapshot\.storagePath/g, 'storagePath: snapshot.snapshotPath');

fs.writeFileSync('C:/Clinic_MVP/dental-crm/apps/api/src/db/documentQuery.ts', code);
console.log('done fixing documentQuery.ts snapshotPath');
