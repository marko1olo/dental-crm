const fs = require('fs');

const storeKeys = [
  'selectedSpecialty',
  'selectedProtocolId',
  'clearedTranscriptSnapshot',
  'transcript',
  'draft',
  'visitNoteForm',
  'lastServerDraftSavedAt',
  'serverDraftSyncState',
  'localDraftWasRestored',
  'pendingVisitSaveCount',
  'lastPendingVisitSaveAt',
  'lastVisitSaveReceipt',
  'speechLastQuality',
  'isDraftLoading',
  'isDraftAccepting',
  'isPendingVisitSyncing',
  'isVisitDictating',
  'isTranscriptPolishing',
];

const allKeys = [...storeKeys];
storeKeys.forEach(k => {
    const cap = k.charAt(0).toUpperCase() + k.slice(1);
    allKeys.push(`set${cap}`);
});

let visitViewCode = fs.readFileSync('C:/Clinic_MVP/dental-crm/apps/web/src/VisitView.tsx', 'utf8');

// Remove from type VisitViewProps
allKeys.forEach(key => {
    const propRegex = new RegExp(`^\\s+${key}:\\s+.*?;\\r?\\n`, 'gm');
    visitViewCode = visitViewCode.replace(propRegex, '');
});

// Remove from destructuring in VisitView
allKeys.forEach(key => {
    const destructureRegex = new RegExp(`^\\s+${key},\\r?\\n`, 'gm');
    visitViewCode = visitViewCode.replace(destructureRegex, '');
});

// Add import
if (!visitViewCode.includes('import { useVisitStore }')) {
    visitViewCode = visitViewCode.replace('import { useSettingsStore } from "./store/settingsStore";', 'import { useSettingsStore } from "./store/settingsStore";\nimport { useVisitStore } from "./store/visitStore";');
}

// Add inside function VisitView(props: VisitViewProps) {
const storeDestructure = `  const {
    ${allKeys.join(',\n    ')}
  } = useVisitStore();\n`;

visitViewCode = visitViewCode.replace('export function VisitView(props: VisitViewProps) {\n  const {\n', 'export function VisitView(props: VisitViewProps) {\n' + storeDestructure + '  const {\n');

fs.writeFileSync('C:/Clinic_MVP/dental-crm/apps/web/src/VisitView.tsx', visitViewCode);

let appCode = fs.readFileSync('C:/Clinic_MVP/dental-crm/apps/web/src/App.tsx', 'utf8');

// Remove from <VisitView ... />
allKeys.forEach(key => {
    const propPassRegex = new RegExp(`\\s+${key}={${key}}`, 'g');
    appCode = appCode.replace(propPassRegex, '');
});

fs.writeFileSync('C:/Clinic_MVP/dental-crm/apps/web/src/App.tsx', appCode);

console.log('Fixed VisitView.tsx and App.tsx');
