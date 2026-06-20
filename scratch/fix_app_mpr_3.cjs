const fs = require('fs');

let code = fs.readFileSync('C:/Clinic_MVP/dental-crm/apps/web/src/App.tsx', 'utf8');
code = code.replace(/setMprSliceIndex\(\(value\) => clampMprSliceIndex/g, 'setMprSliceIndex((value: any) => clampMprSliceIndex');
fs.writeFileSync('C:/Clinic_MVP/dental-crm/apps/web/src/App.tsx', code);
