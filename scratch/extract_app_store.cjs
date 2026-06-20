const fs = require('fs');

let appCode = fs.readFileSync('C:/Clinic_MVP/dental-crm/apps/web/src/App.tsx', 'utf8');

const regex = /^\s*const \[\s*([a-zA-Z0-9_]+)\s*,\s*set([a-zA-Z0-9_]+)\s*\] = useState(?:<([^>]+)>)?\(([\s\S]*?)\);/gm;
let match;
const states = [];
const matchesToRemove = [];

while ((match = regex.exec(appCode)) !== null) {
  const [, stateVar, setterRaw, type, initialValue] = match;
  
  // Exclude some that are already extracted but maybe the script is catching them?
  // Wait, if they are in App.tsx, they are NOT extracted yet!
  
  states.push({
    name: stateVar,
    setter: 'set' + setterRaw,
    type: type ? type.trim() : null,
    initialValue: initialValue.trim()
  });
  matchesToRemove.push(match[0]);
}

if (states.length === 0) {
  console.log("No states found.");
  process.exit(0);
}

// Build appStore.ts
let storeContent = `import { create } from "zustand";

// You might need to add missing imports here depending on the types!

interface AppStore {
${states.map(s => `  ${s.name}: ${s.type ? s.type : 'any'};
  ${s.setter}: (val: ${s.type ? s.type : 'any'}) => void;`).join('\n')}
}

export const useAppStore = create<AppStore>((set) => ({
${states.map(s => `  ${s.name}: ${s.initialValue.includes('=>') ? s.initialValue.split('=>')[1].trim() : s.initialValue},
  ${s.setter}: (val) => set({ ${s.name}: val }),`).join('\n')}
}));
`;

fs.writeFileSync('C:/Clinic_MVP/dental-crm/apps/web/src/store/appStore.ts', storeContent);

// Remove from App.tsx
for (let text of matchesToRemove) {
  appCode = appCode.replace(text + '\n', '');
  appCode = appCode.replace(text, '');
}

// Add import
if (!appCode.includes('useAppStore')) {
  appCode = appCode.replace('import { useDocumentStore } from "./store/documentStore";', 'import { useDocumentStore } from "./store/documentStore";\nimport { useAppStore } from "./store/appStore";');
}

// Add destructuring
const destructureBlock = `  const {
    ${states.flatMap(s => [s.name, s.setter]).join(',\n    ')}
  } = useAppStore();\n`;

const hookEnd = appCode.indexOf('} = useDocumentStore();') + '} = useDocumentStore();'.length;
appCode = appCode.substring(0, hookEnd) + '\n' + destructureBlock + appCode.substring(hookEnd);

fs.writeFileSync('C:/Clinic_MVP/dental-crm/apps/web/src/App.tsx', appCode);

console.log(`Extracted ${states.length} states to appStore.ts`);
