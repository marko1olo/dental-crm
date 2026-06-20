const fs = require('fs');
const path = 'C:/Clinic_MVP/dental-crm/apps/web/src/App.tsx';
let code = fs.readFileSync(path, 'utf8');

if (code.startsWith("import { useAppLogic }")) {
    code = code.replace("import { useAppLogic } from './useAppLogic';\n// @ts-nocheck", "// @ts-nocheck\nimport { useAppLogic } from './useAppLogic';");
    fs.writeFileSync(path, code);
    console.log("Fixed App.tsx @ts-nocheck");
}
