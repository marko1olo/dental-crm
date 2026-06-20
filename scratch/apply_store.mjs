import fs from 'fs';

let code = fs.readFileSync('C:/Clinic_MVP/dental-crm/apps/web/src/App.tsx', 'utf8');
const storeCode = fs.readFileSync('C:/Clinic_MVP/dental-crm/apps/web/src/store/documentStore.ts', 'utf8');

// Find all state variables generated in the store
const vars = [];
const regex = /  ([a-zA-Z0-9_]+): /g;
let m;
while ((m = regex.exec(storeCode)) !== null) {
  // skip the ones inside the interface by only taking from the `useDocumentStore = create<DocumentState>` part
  if (m.index > storeCode.indexOf('export const useDocumentStore')) {
    vars.push(m[1]);
  }
}

console.log(`Found ${vars.length} variables to destructure.`);

const destructureBlock = `  const {\n    ${vars.join(',\n    ')}\n  } = useDocumentStore();`;

// The start of the block in App.tsx is `const [documentCreateSavingKind, setDocumentCreateSavingKind]`
// The end is `const [outpatient025uHealthStatusDisclosureContact, setOutpatient025uHealthStatusDisclosureContact] = useState("");`

const startStr = 'const [documentCreateSavingKind, setDocumentCreateSavingKind] = useState<GeneratedDocument["kind"] | null>(null);';
const endStr = 'const [outpatient025uHealthStatusDisclosureContact, setOutpatient025uHealthStatusDisclosureContact] = useState("");';

const startIndex = code.indexOf(startStr);
const endIndex = code.indexOf(endStr) + endStr.length;

if (startIndex === -1 || endIndex === -1) {
  console.log("Could not find start or end index!");
  process.exit(1);
}

const before = code.substring(0, startIndex);
const after = code.substring(endIndex);

let newCode = before + destructureBlock + after;

// Also import useDocumentStore at the top
const importStr = `import { useDocumentStore } from "./store/documentStore";\n`;
const importPos = newCode.indexOf('import {');
newCode = newCode.substring(0, importPos) + importStr + newCode.substring(importPos);

fs.writeFileSync('C:/Clinic_MVP/dental-crm/apps/web/src/App.tsx', newCode);
console.log('App.tsx updated successfully.');
