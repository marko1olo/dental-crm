const fs = require('fs');
let c = fs.readFileSync('C:/Clinic_MVP/dental-crm/apps/api/src/routes/patients.ts', 'utf8');

c = c.replace(
  /\/\/ Duplicate check omitted for MVP DB migration speed/,
  `const dbPatients = await getPatientsFromDb(orgId);\n    const duplicate = findPatientDuplicate(dbPatients, input);\n    if (duplicate) return sendPatientDuplicate(reply);`
);

fs.writeFileSync('C:/Clinic_MVP/dental-crm/apps/api/src/routes/patients.ts', c);
console.log('fixed POST patient duplicate check');
