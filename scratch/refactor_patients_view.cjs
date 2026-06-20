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

const regexes = [
  /^\s*const \[selectedPatientId, setSelectedPatientId\] = useState<string \| null>\(initialUiPreferences\.selectedPatientId\);\r?\n/gm,
  /^\s*const \[patientCoreDraft, setPatientCoreDraft\] = useState<PatientCoreDraft>\(emptyPatientCoreDraft\);\r?\n/gm,
  /^\s*const \[patientCoreSaveState, setPatientCoreSaveState\] = useState<PatientCoreSaveState>\("idle"\);\r?\n/gm,
  /^\s*const \[patientCoreDirty, setPatientCoreDirty\] = useState\(false\);\r?\n/gm,
  /^\s*const \[patientAdministrativeProfileDraft, setPatientAdministrativeProfileDraft\] =\s+useState<PatientAdministrativeProfileDraft>\(emptyPatientAdministrativeProfileDraft\);\r?\n/gm,
  /^\s*const \[patientAdministrativeProfileSaveState, setPatientAdministrativeProfileSaveState\] =\s+useState<PatientAdministrativeProfileSaveState>\("idle"\);\r?\n/gm,
  /^\s*const \[patientAdministrativeProfileDirty, setPatientAdministrativeProfileDirty\] = useState\(false\);\r?\n/gm,
  /^\s*const \[newPatientName, setNewPatientName\] = useState\(""\);\r?\n/gm,
  /^\s*const \[newPatientPhone, setNewPatientPhone\] = useState\(""\);\r?\n/gm,
  /^\s*const \[newPatientBirthDate, setNewPatientBirthDate\] = useState\(""\);\r?\n/gm,
  /^\s*const \[isPatientCreating, setIsPatientCreating\] = useState\(false\);\r?\n/gm,
  /^\s*const \[newRulePatientText, setNewRulePatientText\] = useState\("Это правило снижает риск повторного лечения и объясняет пациенту необходимость этапа."\);\r?\n/gm,
];

regexes.forEach(regex => {
    appCode = appCode.replace(regex, '');
});

// Remove from <PatientsView ... />
allKeys.forEach(key => {
    const propPassRegex = new RegExp(`\\s+${key}={${key}}`, 'g');
    appCode = appCode.replace(propPassRegex, '');
});

fs.writeFileSync('C:/Clinic_MVP/dental-crm/apps/web/src/App.tsx', appCode);

let patientsViewCode = fs.readFileSync('C:/Clinic_MVP/dental-crm/apps/web/src/PatientsView.tsx', 'utf8');

// Remove from type PatientsViewProps
allKeys.forEach(key => {
    const propRegex = new RegExp(`^\\s+${key}:\\s+.*?;\\r?\\n`, 'gm');
    patientsViewCode = patientsViewCode.replace(propRegex, '');
});

// Remove from destructuring in PatientsView
allKeys.forEach(key => {
    const destructureRegex = new RegExp(`^\\s+${key},\\r?\\n`, 'gm');
    patientsViewCode = patientsViewCode.replace(destructureRegex, '');
});

// Add import
if (!patientsViewCode.includes('import { usePatientStore }')) {
    patientsViewCode = patientsViewCode.replace('import { useSettingsStore } from "./store/settingsStore";', 'import { useSettingsStore } from "./store/settingsStore";\nimport { usePatientStore } from "./store/patientStore";');
    if (!patientsViewCode.includes('import { usePatientStore }')) {
        patientsViewCode = patientsViewCode.replace('import { ', 'import { usePatientStore } from "./store/patientStore";\nimport { ');
    }
}

// Add inside function PatientsView(props: PatientsViewProps) {
const storeDestructure = `  const {
    ${allKeys.join(',\n    ')}
  } = usePatientStore();\n`;

patientsViewCode = patientsViewCode.replace('export function PatientsView(props: PatientsViewProps) {\n  const {\n', 'export function PatientsView(props: PatientsViewProps) {\n' + storeDestructure + '  const {\n');

fs.writeFileSync('C:/Clinic_MVP/dental-crm/apps/web/src/PatientsView.tsx', patientsViewCode);

console.log('Fixed PatientsView.tsx and App.tsx');
