const fs = require('fs');
let c = fs.readFileSync('C:/Clinic_MVP/dental-crm/apps/api/src/routes/patients.ts', 'utf8');
c = c.replace(/import \{ createPatient, patients, updatePatient, updatePatientAdministrativeProfile \} from "\.\.\/sampleData\.js";\r?\n/, '');
fs.writeFileSync('C:/Clinic_MVP/dental-crm/apps/api/src/routes/patients.ts', c);
console.log('cleaned patients.ts');
