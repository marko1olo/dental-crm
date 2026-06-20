const fs = require('fs');
const { execSync } = require('child_process');

const prefixes = [
  "copyRequest", "outpatient025u", "release", "attendance", "refund", "personalData", "refusal", "documentPatient"
];

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

let storeImpls = '';
for (let s of states) {
  storeImpls += `  ${s.name}: ${s.initial},\n`;
  storeImpls += `  ${s.setter}: (val) => set((state) => ({ ${s.name}: typeof val === 'function' ? (val as any)(state.${s.name}) : val })),\n`;
}

let storeCode = fs.readFileSync('C:/Clinic_MVP/dental-crm/apps/web/src/store/documentStore.ts', 'utf8');

// We need to inject `storeImpls` right before `}));` at the end of the file.
const endObjIndex = storeCode.lastIndexOf('}));');
if (endObjIndex > -1) {
  storeCode = storeCode.substring(0, endObjIndex) + storeImpls + storeCode.substring(endObjIndex);
  fs.writeFileSync('C:/Clinic_MVP/dental-crm/apps/web/src/store/documentStore.ts', storeCode);
  console.log(`Injected ${states.length} implementations to documentStore.ts`);
} else {
  console.error("Could not find })); in documentStore.ts");
}
