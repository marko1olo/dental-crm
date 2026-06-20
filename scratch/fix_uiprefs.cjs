const fs = require('fs');
let code = fs.readFileSync('C:/Clinic_MVP/dental-crm/apps/web/src/store/documentStore.ts', 'utf8');
code = code.split('|| loadUiPreferences().documentIssueSignatureDraft.staffFullName').join('|| ""');
code = code.split('|| loadUiPreferences().documentIssueSignatureDraft.staffRole').join('|| ""');
fs.writeFileSync('C:/Clinic_MVP/dental-crm/apps/web/src/store/documentStore.ts', code);
