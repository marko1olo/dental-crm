const fs = require('fs');

let appCode = fs.readFileSync('C:/Clinic_MVP/dental-crm/apps/web/src/App.tsx', 'utf8');

const regex = /^\s*const \[\s*([a-zA-Z0-9_]+)\s*,\s*set([a-zA-Z0-9_]+)\s*\] = useState(?:<([^>]+)>)?\(([\s\S]*?)\);/gm;
let match;
const states = [];
const matchesToRemove = [];

while ((match = regex.exec(appCode)) !== null) {
  const [, stateVar, setterRaw, type, initialValue] = match;
  
  // If initial value starts with () => it is a lazy init.
  let cleanInitialValue = initialValue.trim();
  if (cleanInitialValue.startsWith('() =>')) {
     // Execute it!
     cleanInitialValue = `(${cleanInitialValue})()`;
  }
  
  states.push({
    name: stateVar,
    setter: 'set' + setterRaw,
    type: type ? type.trim() : null,
    initialValue: cleanInitialValue
  });
  matchesToRemove.push(match[0]);
}

if (states.length === 0) {
  console.log("No states found.");
  process.exit(0);
}

// Build appStore.ts
const appHelpers = fs.readFileSync('C:/Clinic_MVP/dental-crm/apps/web/src/AppHelpers.tsx', 'utf8');
const imports = [];
const lines = appHelpers.split('\n');
for (let line of lines) {
    if (line.startsWith('import ')) {
        let fixedLine = line;
        if (line.includes('from "./')) {
            fixedLine = line.replace('from "./', 'from "../');
        } else if (line.includes('from "../')) {
            fixedLine = line.replace('from "../', 'from "../../');
        }
        imports.push(fixedLine);
    }
}

let storeContent = `${imports.join('\n')}
import { initialUiPreferences, initialRecognitionText, emptyClinicProfileDraft, viewFromHash, settingsTabFromHash, loadPendingSpeechChunksFromLocalStorage } from "../AppHelpers";
import { create } from "zustand";

interface AppStore {
${states.map(s => `  ${s.name}: ${s.type ? s.type : 'any'};
  ${s.setter}: (val: ${s.type ? s.type : 'any'}) => void;`).join('\n')}
}

export const useAppStore = create<AppStore>((set) => ({
${states.map(s => `  ${s.name}: ${s.initialValue.replace('loadPendingSpeechChunksFromLocalStorage(activeOrganizationId)', 'loadPendingSpeechChunksFromLocalStorage("todo-active-org-id")')},
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

console.log(`Extracted ${states.length} states to appStore.ts correctly`);
