const fs = require('fs');

let storeCode = fs.readFileSync('C:/Clinic_MVP/dental-crm/apps/web/src/store/scheduleStore.ts', 'utf8');

// Fix emptyAppointmentScheduleDraft being a function
storeCode = storeCode.replace(
    'newAppointmentDraft: emptyAppointmentScheduleDraft,',
    'newAppointmentDraft: emptyAppointmentScheduleDraft(),'
);

fs.writeFileSync('C:/Clinic_MVP/dental-crm/apps/web/src/store/scheduleStore.ts', storeCode);

let appCode = fs.readFileSync('C:/Clinic_MVP/dental-crm/apps/web/src/App.tsx', 'utf8');

// Fix 'day' any types in .map
appCode = appCode.replace(/\.map\(\(day\) =>/g, '.map((day: any) =>');

fs.writeFileSync('C:/Clinic_MVP/dental-crm/apps/web/src/App.tsx', appCode);

console.log('Fixed TS errors in scheduleStore and App.tsx');
