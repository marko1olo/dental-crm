const fs = require('fs');

let code = fs.readFileSync('C:/Clinic_MVP/dental-crm/apps/web/src/App.tsx', 'utf8');

code = code.replace(/mprProjectionLabels\[mprProjection\]/g, 'mprProjectionLabels[mprProjection as any]');
code = code.replace(/mprProjectionOrientationLabels\[mprProjection\]/g, 'mprProjectionOrientationLabels[mprProjection as any]');
code = code.replace(/mprWindowPresetLabels\[mprWindowPreset\]/g, 'mprWindowPresetLabels[mprWindowPreset as any]');
code = code.replace(/\(value\) => setMprSliceIndex/g, '(value: any) => setMprSliceIndex');
code = code.replace(/setMprLinkedPlanesEnabled\(\(current\) =>/g, 'setMprLinkedPlanesEnabled((current: any) =>');
code = code.replace(/setMprCrosshairEnabled\(\(current\) =>/g, 'setMprCrosshairEnabled((current: any) =>');

fs.writeFileSync('C:/Clinic_MVP/dental-crm/apps/web/src/App.tsx', code);
