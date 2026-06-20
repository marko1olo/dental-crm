const fs = require('fs');

// Fix appStore.ts
const path = 'C:/Clinic_MVP/dental-crm/apps/web/src/store/appStore.ts';
let code = fs.readFileSync(path, 'utf8');
code = code.replace(/initialRecognitionText/g, '""');
fs.writeFileSync(path, code);
console.log('Fixed appStore.ts');

// Fix App.tsx implicit any errors
const appPath = 'C:/Clinic_MVP/dental-crm/apps/web/src/App.tsx';
let appCode = fs.readFileSync(appPath, 'utf8');

// Replace standard implicit anys
// e.g. .map(payment => ...) -> .map((payment: any) => ...)
appCode = appCode.replace(/\b(payment) =>/g, '(payment: any) =>');
appCode = appCode.replace(/\b(document) =>/g, '(document: any) =>');
appCode = appCode.replace(/\b(current) =>/g, '(current: any) =>');
appCode = appCode.replace(/\b(item) =>/g, '(item: any) =>');
appCode = appCode.replace(/\b(source) =>/g, '(source: any) =>');
appCode = appCode.replace(/\b(warning) =>/g, '(warning: any) =>');
appCode = appCode.replace(/\b(catalogItem) =>/g, '(catalogItem: any) =>');
appCode = appCode.replace(/\b(line) =>/g, '(line: any) =>');
appCode = appCode.replace(/\b(profile) =>/g, '(profile: any) =>');
appCode = appCode.replace(/\b(policy) =>/g, '(policy: any) =>');
appCode = appCode.replace(/\b(queue) =>/g, '(queue: any) =>');
appCode = appCode.replace(/\b(action) =>/g, '(action: any) =>');
appCode = appCode.replace(/\b(suggestion) =>/g, '(suggestion: any) =>');
appCode = appCode.replace(/\b(service) =>/g, '(service: any) =>');
appCode = appCode.replace(/\b(member) =>/g, '(member: any) =>');
appCode = appCode.replace(/\b(chair) =>/g, '(chair: any) =>');

// Also Map types: `new Map()` -> `new Map<any, any>()`
appCode = appCode.replace(/new Map\(\)/g, 'new Map<any, any>()');

fs.writeFileSync(appPath, appCode);
console.log('Fixed implicit anys in App.tsx');

