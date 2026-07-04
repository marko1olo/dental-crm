const fs = require('fs');
let code = fs.readFileSync('C:/Clinic_MVP/dental-crm/apps/api/src/db/imagingQuery.ts', 'utf8');
code = code.replace('capturedAt?: string;', 'capturedAt?: string | null;');
code = code.replace('visitId?: string | null;', 'visitId?: string | null | undefined;');
fs.writeFileSync('C:/Clinic_MVP/dental-crm/apps/api/src/db/imagingQuery.ts', code);
console.log('imagingQuery updated');
