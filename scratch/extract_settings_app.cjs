const fs = require('fs');

const prefixes = [
  "onboarding", "telegram", "settingsAdmin", "clinicalAdmin", "scheduleAdmin"
];

let appCode = fs.readFileSync('C:/Clinic_MVP/dental-crm/apps/web/src/App.tsx', 'utf8');

const regex = /^\s*const \[\s*([a-zA-Z0-9_]+)\s*,\s*set([a-zA-Z0-9_]+)\s*\] = useState(?:<([^>]+)>)?\(([\s\S]*?)\);/gm;
let match;
const states = [];
const matchesToRemove = [];

while ((match = regex.exec(appCode)) !== null) {
  const [, stateVar, setterRaw] = match;
  
  const isTarget = prefixes.some(p => stateVar.startsWith(p));
  
  if (isTarget) {
    states.push({ name: stateVar, setter: 'set' + setterRaw });
    matchesToRemove.push(match[0]);
  }
}

for (let text of matchesToRemove) {
  appCode = appCode.replace(text + '\n', '');
  appCode = appCode.replace(text, '');
}

// Ensure App.tsx imports useSettingsStore
if (!appCode.includes('useSettingsStore')) {
  appCode = appCode.replace('import { useDocumentStore }', 'import { useDocumentStore } from "./store/documentStore";\nimport { useSettingsStore } from "./store/settingsStore";\nimport { useDocumentStore as _unused }');
}

// Add destructuring block
const destructureBlock = `  const {
    ${states.flatMap(s => [s.name, s.setter]).join(',\n    ')}
  } = useSettingsStore();\n`;

const hookEnd = appCode.indexOf('} = useDocumentStore();') + '} = useDocumentStore();'.length;
appCode = appCode.substring(0, hookEnd) + '\n' + destructureBlock + appCode.substring(hookEnd);

fs.writeFileSync('C:/Clinic_MVP/dental-crm/apps/web/src/App.tsx', appCode);
console.log(`Extracted ${states.length} states to settingsStore in App.tsx`);
