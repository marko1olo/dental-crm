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

// Add inside function App() {
const storeDestructure = `  const {
    ${allKeys.join(',\n    ')}
  } = usePatientStore();\n`;

if (!appCode.includes('usePatientStore();')) {
    appCode = appCode.replace('export function App() {\n  const {\n', 'export function App() {\n' + storeDestructure + '  const {\n');
}

fs.writeFileSync('C:/Clinic_MVP/dental-crm/apps/web/src/App.tsx', appCode);

console.log('Fixed App.tsx patient store destructuring correctly');
