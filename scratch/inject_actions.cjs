const fs = require('fs');
const { execSync } = require('child_process');

const prefixes = [
  "copyRequest", "outpatient025u", "release", "attendance", "refund", "personalData", "refusal", "documentPatient"
];

// Get original App.tsx from git!
let appCode = execSync('git show HEAD:apps/web/src/App.tsx', { encoding: 'utf8' });
const lines = appCode.split('\n');

const states = [];

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
}

let storeActions = '';
for (let s of states) {
  let typeStr = s.type === 'any' ? (s.initial === 'false' || s.initial === 'true' ? 'boolean' : s.initial.startsWith('""') ? 'string' : 'any') : s.type;
  storeActions += `  ${s.setter}: (val: ${typeStr} | ((prev: ${typeStr}) => ${typeStr})) => void;\n`;
}

let storeCode = fs.readFileSync('C:/Clinic_MVP/dental-crm/apps/web/src/store/documentStore.ts', 'utf8');
storeCode = storeCode.replace('export interface DocumentState {', 'export interface DocumentState {\n' + storeActions);
fs.writeFileSync('C:/Clinic_MVP/dental-crm/apps/web/src/store/documentStore.ts', storeCode);
console.log(`Added ${states.length} actions to documentStore.ts`);
