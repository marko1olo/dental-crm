const fs = require('fs');
const { execSync } = require('child_process');

const prefixes = [
  "onboarding", "telegram", "settingsAdmin", "clinicalAdmin", "scheduleAdmin"
];

// Read from git history because App.tsx already lost these
let appCode = execSync('git show HEAD:apps/web/src/App.tsx', { encoding: 'utf8' });

const regex = /^\s*const \[\s*([a-zA-Z0-9_]+)\s*,\s*set([a-zA-Z0-9_]+)\s*\] = useState(?:<([^>]+)>)?\(([\s\S]*?)\);/gm;
let match;
const states = [];

while ((match = regex.exec(appCode)) !== null) {
  const [, stateVar, setterRaw, typeArg, initial] = match;
  
  const isTarget = prefixes.some(p => stateVar.startsWith(p));
  
  if (isTarget) {
    let cleanInitial = initial.trim();
    if (cleanInitial.startsWith('() => ')) cleanInitial = cleanInitial.slice(6).trim();
    
    // Better initial handling for JSON/Multi-line
    if (cleanInitial.includes('localStorage.getItem(')) {
        // Fallback for types that shouldn't crash
        cleanInitial = 'null';
    } else if (cleanInitial.includes('initialUiPreferences.')) {
        // keep it
    }

    let typeStr = typeArg || 'any';
    if (typeStr === 'any') {
      if (cleanInitial === 'true' || cleanInitial === 'false') typeStr = 'boolean';
      else if (cleanInitial.startsWith('"') || cleanInitial.startsWith('`')) typeStr = 'string';
      else if (cleanInitial.startsWith('[')) typeStr = 'any[]';
    }

    states.push({
      name: stateVar,
      setter: 'set' + setterRaw,
      type: typeStr,
      initial: cleanInitial,
    });
  }
}

let storeFields = '';
let storeActions = '';
let storeImpls = '';
let storeInitial = '';

for (let s of states) {
  storeFields += `  ${s.name}: ${s.type};\n`;
  storeActions += `  ${s.setter}: (val: ${s.type} | ((prev: ${s.type}) => ${s.type})) => void;\n`;
  storeInitial += `  ${s.name}: ${s.initial},\n`;
  storeImpls += `  ${s.setter}: (val) => set((state) => ({ ${s.name}: typeof val === 'function' ? (val as any)(state.${s.name}) : val })),\n`;
}

const storeContent = `import { create } from "zustand";
import { initialUiPreferences } from "../AppHelpers"; // assume this might be needed

export interface SettingsState {
${storeFields}
}

export interface SettingsActions {
${storeActions}
}

const initialSettingsState: SettingsState = {
${storeInitial}
};

export const useSettingsStore = create<SettingsState & SettingsActions>()((set) => ({
  ...initialSettingsState,
${storeImpls}
}));
`;

fs.writeFileSync('C:/Clinic_MVP/dental-crm/apps/web/src/store/settingsStore.ts', storeContent);
console.log(`Regenerated settingsStore.ts with ${states.length} states.`);
