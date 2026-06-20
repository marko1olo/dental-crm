const fs = require('fs');

const prefixes = [
  "copyRequest", "outpatient025u", "release", "attendance", "refund", "personalData", "refusal", "documentPatient"
];

let appCode = fs.readFileSync('C:/Clinic_MVP/dental-crm/apps/web/src/App.tsx', 'utf8');
const lines = appCode.split('\n');

const states = [];
const appNewLines = [];

for (let line of lines) {
  const match = line.match(/^(\s*)const \[\s*([a-zA-Z0-9_]+)\s*,\s*set([a-zA-Z0-9_]+)\s*\] = useState(\<[^>]+\>)?\((.*)\);/);
  if (match) {
    const [, indent, stateVar, setterRaw, typeArg, initial] = match;
    const isTarget = prefixes.some(p => stateVar.startsWith(p));
    if (isTarget) {
      states.push({
        name: stateVar,
        setter: 'set' + setterRaw,
        type: typeArg ? typeArg.slice(1, -1) : 'any',
        initial: initial.startsWith('() => ') ? initial.slice(6) : initial
      });
      continue;
    }
  }
  appNewLines.push(line);
}

appCode = appNewLines.join('\n');

// 1. Generate store fields
let storeFields = '';
let storeActions = '';
for (let s of states) {
  let typeStr = s.type === 'any' ? (s.initial === 'false' || s.initial === 'true' ? 'boolean' : s.initial.startsWith('""') ? 'string' : 'any') : s.type;
  storeFields += `  ${s.name}: ${typeStr};\n`;
  storeActions += `  ${s.setter}: (val: ${typeStr} | ((prev: ${typeStr}) => ${typeStr})) => void;\n`;
}

// 2. Generate initial state
let storeInitial = '';
for (let s of states) {
  storeInitial += `  ${s.name}: ${s.initial},\n`;
}

// 3. Generate setter impls
let storeImpls = '';
for (let s of states) {
  storeImpls += `  ${s.setter}: (val) => set((state) => ({ ${s.name}: typeof val === "function" ? (val as any)(state.${s.name}) : val })),\n`;
}

// 4. Update documentStore.ts
let storeCode = fs.readFileSync('C:/Clinic_MVP/dental-crm/apps/web/src/store/documentStore.ts', 'utf8');

storeCode = storeCode.replace('export interface DocumentState {', 'export interface DocumentState {\n' + storeFields);
storeCode = storeCode.replace('export interface DocumentActions {', 'export interface DocumentActions {\n' + storeActions);
storeCode = storeCode.replace('const initialDocumentState: DocumentState = {', 'const initialDocumentState: DocumentState = {\n' + storeInitial);
storeCode = storeCode.replace('...initialDocumentState,', '...initialDocumentState,\n' + storeImpls);

fs.writeFileSync('C:/Clinic_MVP/dental-crm/apps/web/src/store/documentStore.ts', storeCode);
console.log(`Added ${states.length} fields to documentStore.ts`);

// 5. Update App.tsx UseDocumentStore destructuring
// We need to find the `useDocumentStore()` call in App.tsx and inject the new variables.
// Actually, App.tsx DOES NOT destructure them if we removed them during DocumentsView cleanup?
// WAIT! I removed destructuring from DocumentsView, but App.tsx still uses them for validation or something else?
// Let's just remove them. If App.tsx needs them, it will fail to compile. I'll add them to the destructuring block!

const destructureStart = appCode.indexOf('  const {');
const destructureEnd = appCode.indexOf('} = useDocumentStore();');
if (destructureStart > -1 && destructureEnd > -1) {
  const newNames = states.flatMap(s => [s.name, s.setter]).join(',\n    ');
  appCode = appCode.substring(0, destructureEnd) + '    ' + newNames + ',\n  ' + appCode.substring(destructureEnd);
}

fs.writeFileSync('C:/Clinic_MVP/dental-crm/apps/web/src/App.tsx', appCode);
console.log('App.tsx processed');
