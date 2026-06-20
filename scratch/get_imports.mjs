import fs from 'fs';

const code = fs.readFileSync('C:/Clinic_MVP/dental-crm/apps/web/src/App.tsx', 'utf8');
const m1 = code.match(/import\s+\{[^}]*dateInputValuePlusDays[^}]*\}\s+from\s+['"]([^'"]+)['"]/s);
console.log('dateInputValuePlusDays:', m1 ? m1[1] : 'not found');

const m2 = code.match(/import\s+\{[^}]*defaultClinicalToothRowsText[^}]*\}\s+from\s+['"]([^'"]+)['"]/s);
console.log('defaultClinicalToothRowsText:', m2 ? m2[1] : 'not found');
