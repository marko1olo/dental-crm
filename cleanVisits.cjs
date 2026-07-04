const fs = require('fs');
let c = fs.readFileSync('C:/Clinic_MVP/dental-crm/apps/api/src/routes/visits.ts', 'utf8');
c = c.replace(/import \{ acceptVisitDraft, getVisitDraftAutosave, upsertVisitDraftAutosave \} from "\.\.\/sampleData\.js";\r?\n/, '');
fs.writeFileSync('C:/Clinic_MVP/dental-crm/apps/api/src/routes/visits.ts', c);
console.log('cleaned visits.ts');
