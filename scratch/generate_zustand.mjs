import fs from 'fs';

const code = fs.readFileSync('C:/Clinic_MVP/dental-crm/scratch/useDocumentLogicRaw.ts', 'utf8');

const stateVars = [];

// Match `const [name, setName] = useState<Type>(defaultValue);`
// or `const [name, setName] = useState(defaultValue);`
const regex = /const \[([a-zA-Z0-9_]+),\s*([a-zA-Z0-9_]+)\]\s*=\s*useState(?:<([^>]+)>)?\(([\s\S]*?)\);/g;

let match;
while ((match = regex.exec(code)) !== null) {
  const name = match[1];
  const setter = match[2];
  const type = match[3] || 'any'; // Naive fallback, many will be inferred
  const defaultValue = match[4].trim();
  
  // We cannot easily put `() => new Date()` as a raw default in Zustand create(), but we can do it in the initialization.
  stateVars.push({ name, setter, type, defaultValue });
}

let interfaceBody = '';
let storeBody = '';

for (const v of stateVars) {
  // If type is 'any' and default is a string, it's a string
  let inferredType = v.type;
  if (inferredType === 'any') {
    if (v.defaultValue.startsWith('"') || v.defaultValue.startsWith('`')) inferredType = 'string';
    else if (v.defaultValue === 'false' || v.defaultValue === 'true') inferredType = 'boolean';
    else if (v.defaultValue.includes('=>')) inferredType = 'string'; // mostly dates
  }

  interfaceBody += `  ${v.name}: ${inferredType};\n`;
  interfaceBody += `  ${v.setter}: (val: ${inferredType}) => void;\n`;

  // For default value, if it's a function like `() => new Date()`, evaluate it once
  let cleanDefault = v.defaultValue;
  if (cleanDefault.startsWith('() =>')) {
    cleanDefault = `(${cleanDefault})()`;
  }

  storeBody += `  ${v.name}: ${cleanDefault},\n`;
  storeBody += `  ${v.setter}: (val) => set({ ${v.name}: val }),\n`;
}

const zustandFile = `
import { create } from 'zustand';

export interface DocumentState {
${interfaceBody}
}

export const useDocumentStore = create<DocumentState>((set) => ({
${storeBody}
}));
`;

fs.writeFileSync('C:/Clinic_MVP/dental-crm/apps/web/src/store/documentStore.ts', zustandFile);
console.log(`Generated Zustand store with ${stateVars.length} state variables.`);
