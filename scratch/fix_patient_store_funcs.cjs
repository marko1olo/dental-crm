const fs = require('fs');

let code = fs.readFileSync('C:/Clinic_MVP/dental-crm/apps/web/src/store/patientStore.ts', 'utf8');

code = code.replace('patientCoreDraft: emptyPatientCoreDraft,', 'patientCoreDraft: emptyPatientCoreDraft(),');
code = code.replace('patientAdministrativeProfileDraft: emptyPatientAdministrativeProfileDraft,', 'patientAdministrativeProfileDraft: emptyPatientAdministrativeProfileDraft(),');

fs.writeFileSync('C:/Clinic_MVP/dental-crm/apps/web/src/store/patientStore.ts', code);

console.log('Fixed patientStore.ts');
