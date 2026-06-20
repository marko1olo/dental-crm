const fs = require('fs');

const appCode = fs.readFileSync('C:/Clinic_MVP/dental-crm/apps/web/src/App.tsx', 'utf8');
let appStoreCode = fs.readFileSync('C:/Clinic_MVP/dental-crm/apps/web/src/store/appStore.ts', 'utf8');

const importRegex = /^import\s+[\s\S]*?from\s+['"][^'"]+['"];?/gm;
const imports = appCode.match(importRegex) || [];

const newImports = imports.map(i => {
    // skip other store imports inside appStore itself to prevent cycles if not careful, but maybe it's fine.
    let res = i.replace(/from "\.\//g, 'from "../').replace(/from "\.\.\//g, 'from "../../');
    return res;
}).join('\n');

// Also import defaultUiPreferences
let finalCode = newImports + '\nimport { defaultUiPreferences } from "../AppHelpers";\n' + appStoreCode.replace(/initialUiPreferences\./g, 'defaultUiPreferences.');

fs.writeFileSync('C:/Clinic_MVP/dental-crm/apps/web/src/store/appStore.ts', finalCode);
console.log('Fixed appStore.ts imports and preferences');
