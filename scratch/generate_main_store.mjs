import fs from 'fs';

const code = fs.readFileSync('C:/Clinic_MVP/dental-crm/apps/web/src/App.tsx', 'utf8');

// Extract all imports from App.tsx
const importBlock = [];
const lines = code.split('\n');
let inImport = false;
for (const line of lines) {
  if (line.startsWith('import ')) {
    inImport = true;
  }
  if (inImport) {
    let modifiedLine = line.replace(/from "(\.\/[^"]+)"/, 'from ".$1"').replace(/from '(\.\/[^']+)'/, 'from ".$1"');
    // Change ./ to ../
    modifiedLine = modifiedLine.replace(/from "\.\//g, 'from "../');
    modifiedLine = modifiedLine.replace(/from '\.\//g, 'from \'../');
    
    // Also change ./store/documentStore to ./documentStore since we are inside store/
    modifiedLine = modifiedLine.replace(/from "\.\.\/store\//g, 'from "./');
    
    importBlock.push(modifiedLine);
  }
  if (inImport && line.includes(';')) {
    inImport = false;
  }
  if (!inImport && line.startsWith('export default function')) {
    break;
  }
}

const importsStr = importBlock.join('\n');

const stateVars = [];
const regex = /const \[([a-zA-Z0-9_]+),\s*([a-zA-Z0-9_]+)\]\s*=\s*useState(?:<([^>]+)>)?\(([\s\S]*?)\);/g;

let match;
while ((match = regex.exec(code)) !== null) {
  const name = match[1];
  const setter = match[2];
  let type = match[3] || 'any';
  const defaultValue = match[4].trim();
  
  // Exclude some things we definitely can't put in store due to closures
  if (defaultValue.includes('dashboard?') || defaultValue.includes('activeOrganizationId')) {
    continue;
  }
  
  stateVars.push({ name, setter, type, defaultValue });
}

let interfaceBody = '';
let storeBody = '';

for (const v of stateVars) {
  let inferredType = v.type;
  if (inferredType === 'any') {
    if (v.defaultValue.startsWith('"') || v.defaultValue.startsWith('\`') || v.defaultValue === "''") inferredType = 'string';
    else if (v.defaultValue === 'false' || v.defaultValue === 'true') inferredType = 'boolean';
    else if (!isNaN(v.defaultValue) && v.defaultValue !== '') inferredType = 'number';
    else if (v.defaultValue.includes('=>')) inferredType = 'any';
    else if (v.defaultValue.startsWith('[]')) inferredType = 'any[]';
    else inferredType = 'any';
  }

  interfaceBody += `  ${v.name}: ${inferredType};\n`;
  interfaceBody += `  ${v.setter}: (val: ${inferredType} | ((prev: ${inferredType}) => ${inferredType})) => void;\n`;

  let cleanDefault = v.defaultValue;
  if (cleanDefault.startsWith('() =>')) {
    cleanDefault = `(${cleanDefault})()`;
  }

  storeBody += `  ${v.name}: ${cleanDefault},\n`;
  storeBody += `  ${v.setter}: (val) => set((state) => ({ ${v.name}: typeof val === 'function' ? (val as any)(state.${v.name}) : val })),\n`;
}

const zustandFile = `
import { create } from 'zustand';
${importsStr}

export interface MainState {
${interfaceBody}
}

export const useMainStore = create<MainState>((set) => ({
${storeBody}
}));
`;

fs.writeFileSync('C:/Clinic_MVP/dental-crm/apps/web/src/store/mainStore.ts', zustandFile);
console.log(`Generated mainStore.ts with ${stateVars.length} state variables.`);
