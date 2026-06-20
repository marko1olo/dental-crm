const fs = require('fs');
let code = fs.readFileSync('C:/Clinic_MVP/dental-crm/apps/web/src/store/patientStore.ts', 'utf8');

code = code.replace(/import type \{\s*\} from "@dental\/shared";\r?\n/, '');
code = code.replace('type PatientAdministrativeProfileSaveState', 'type PatientAdministrativeProfileSaveState,\n  type PatientCoreDraft,\n  type PatientAdministrativeProfileDraft');

fs.writeFileSync('C:/Clinic_MVP/dental-crm/apps/web/src/store/patientStore.ts', code);
