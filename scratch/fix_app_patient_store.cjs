const fs = require('fs');

const storeKeys = [
  'selectedPatientId',
  'patientCoreDraft',
  'patientCoreSaveState',
  'patientCoreDirty',
  'patientAdministrativeProfileDraft',
  'patientAdministrativeProfileSaveState',
  'patientAdministrativeProfileDirty',
  'newPatientName',
  'newPatientPhone',
  'newPatientBirthDate',
  'isPatientCreating',
  'newRulePatientText',
];

const allKeys = [...storeKeys];
storeKeys.forEach(k => {
    const cap = k.charAt(0).toUpperCase() + k.slice(1);
    allKeys.push(`set${cap}`);
});

let appCode = fs.readFileSync('C:/Clinic_MVP/dental-crm/apps/web/src/App.tsx', 'utf8');

// Add import
if (!appCode.includes('import { usePatientStore }')) {
    appCode = appCode.replace('import { useVisitStore } from "./store/visitStore";', 'import { useVisitStore } from "./store/visitStore";\nimport { usePatientStore } from "./store/patientStore";');
}

// Add inside function App() {
const storeDestructure = `  const {
    ${allKeys.join(',\n    ')}
  } = usePatientStore();\n`;

appCode = appCode.replace('export default function App() {\n  const {\n', 'export default function App() {\n' + storeDestructure + '  const {\n');

// Also fix typescript error with setter parameters that lack type
allKeys.filter(k => k.startsWith('set')).forEach(key => {
    const regex = new RegExp(`(?<![a-zA-Z0-9_])${key}\\(\\(current\\) =>`, 'g');
    appCode = appCode.replace(regex, `${key}((current: any) =>`);
});

fs.writeFileSync('C:/Clinic_MVP/dental-crm/apps/web/src/App.tsx', appCode);

console.log('Fixed App.tsx patient store destructuring');
