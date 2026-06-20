const fs = require('fs');

const prefixes = [
  "payment", "documentIssue", "documentVoid", "personalData", "refusal", "document"
];

let appCode = fs.readFileSync('C:/Clinic_MVP/dental-crm/apps/web/src/App.tsx', 'utf8');

const regex = /^\s*const \[\s*([a-zA-Z0-9_]+)\s*,\s*set([a-zA-Z0-9_]+)\s*\] = useState(?:<([^>]+)>)?\(([\s\S]*?)\);/gm;
let match;
const states = [];
const matchesToRemove = [];

while ((match = regex.exec(appCode)) !== null) {
  const [, stateVar, setterRaw, typeArg, initial] = match;
  
  // Exclude some things that start with document but shouldn't be in documentStore
  // (actually everything starting with document is documentStore related)
  const isTarget = prefixes.some(p => stateVar.startsWith(p));
  
  if (isTarget) {
    let cleanInitial = initial.trim();
    if (cleanInitial.startsWith('() => ')) cleanInitial = cleanInitial.slice(6).trim();
    
    // Type inference
    let typeStr = typeArg || 'any';
    if (typeStr === 'any') {
      if (cleanInitial === 'true' || cleanInitial === 'false') typeStr = 'boolean';
      else if (cleanInitial.startsWith('"') || cleanInitial.startsWith('`')) typeStr = 'string';
    }

    states.push({
      name: stateVar,
      setter: 'set' + setterRaw,
      type: typeStr,
      initial: cleanInitial,
      fullText: match[0]
    });
    matchesToRemove.push(match[0]);
  }
}

// 1. Remove from App.tsx
for (let text of matchesToRemove) {
  appCode = appCode.replace(text + '\n', '');
  appCode = appCode.replace(text, ''); // Fallback
}

// 2. Add to destructuring block in App.tsx
const destructureEnd = appCode.indexOf('} = useDocumentStore();');
if (destructureEnd > -1) {
  const newNames = states.flatMap(s => [s.name, s.setter]).join(',\n    ');
  appCode = appCode.substring(0, destructureEnd) + '    ' + newNames + ',\n  ' + appCode.substring(destructureEnd);
}

fs.writeFileSync('C:/Clinic_MVP/dental-crm/apps/web/src/App.tsx', appCode);

// 3. Update documentStore.ts
let storeCode = fs.readFileSync('C:/Clinic_MVP/dental-crm/apps/web/src/store/documentStore.ts', 'utf8');

let storeFields = '';
let storeActions = '';
let storeImpls = '';

for (let s of states) {
  storeFields += `  ${s.name}: ${s.type};\n`;
  storeActions += `  ${s.setter}: (val: ${s.type} | ((prev: ${s.type}) => ${s.type})) => void;\n`;
  storeImpls += `  ${s.name}: ${s.initial},\n`;
  storeImpls += `  ${s.setter}: (val) => set((state) => ({ ${s.name}: typeof val === 'function' ? (val as any)(state.${s.name}) : val })),\n`;
}

storeCode = storeCode.replace('export interface DocumentState {', 'export interface DocumentState {\n' + storeFields + storeActions);

const endObjIndex = storeCode.lastIndexOf('}));');
if (endObjIndex > -1) {
  storeCode = storeCode.substring(0, endObjIndex) + storeImpls + storeCode.substring(endObjIndex);
  fs.writeFileSync('C:/Clinic_MVP/dental-crm/apps/web/src/store/documentStore.ts', storeCode);
  console.log(`Added ${states.length} states to documentStore.ts`);
} else {
  console.error("Could not find })); in documentStore.ts");
}
