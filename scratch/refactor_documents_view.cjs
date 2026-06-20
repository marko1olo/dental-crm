const fs = require('fs');

const storeKeys = JSON.parse(fs.readFileSync('C:/Clinic_MVP/dental-crm/scratch/store_keys.json', 'utf8'));
const keySet = new Set(storeKeys);

// --- Process App.tsx ---
let appCode = fs.readFileSync('C:/Clinic_MVP/dental-crm/apps/web/src/App.tsx', 'utf8');

// The <DocumentsView component starts at a known position and ends at >
const docViewStartIndex = appCode.indexOf('<DocumentsView');
const docViewEndIndex = appCode.indexOf('>', docViewStartIndex);

const docViewBlock = appCode.substring(docViewStartIndex, docViewEndIndex + 1);
const lines = docViewBlock.split('\n');
const newLines = [];

for (let i = 0; i < lines.length; i++) {
  const line = lines[i];
  const match = line.match(/^(\s+)([a-zA-Z0-9_]+)=/);
  if (match) {
    const propName = match[2];
    if (keySet.has(propName)) {
      // It's in the store, skip it!
      continue;
    }
  }
  newLines.push(line);
}

const newDocViewBlock = newLines.join('\n');
appCode = appCode.substring(0, docViewStartIndex) + newDocViewBlock + appCode.substring(docViewEndIndex + 1);

fs.writeFileSync('C:/Clinic_MVP/dental-crm/apps/web/src/App.tsx', appCode);
console.log("App.tsx processed!");

// --- Process DocumentsView.tsx ---
let docViewCode = fs.readFileSync('C:/Clinic_MVP/dental-crm/apps/web/src/DocumentsView.tsx', 'utf8');

// We need to parse the destructured props:
//   const {
//     activeAppointment,
//     ...
//   } = props;

const destructureStart = docViewCode.indexOf('  const {');
const destructureEnd = docViewCode.indexOf('} = props;', destructureStart);

const destructureBlock = docViewCode.substring(destructureStart, destructureEnd + 10);
const destructureLines = destructureBlock.split('\n');

const propsKeys = [];
const storeKeysToExtract = [];

for (let line of destructureLines) {
  const cleanLine = line.trim().replace(/,$/, '');
  if (cleanLine === 'const {' || cleanLine === '} = props;') continue;
  
  // It's a variable name
  if (keySet.has(cleanLine)) {
    storeKeysToExtract.push(cleanLine);
  } else {
    propsKeys.push(cleanLine);
  }
}

const newPropsDestructure = `  const {\n    ${propsKeys.join(',\n    ')}\n  } = props;`;
const storeDestructure = `  const {\n    ${storeKeysToExtract.join(',\n    ')}\n  } = useDocumentStore();`;

docViewCode = docViewCode.substring(0, destructureStart) + newPropsDestructure + '\n' + storeDestructure + docViewCode.substring(destructureEnd + 10);

// Add import for useDocumentStore
if (!docViewCode.includes('useDocumentStore')) {
  docViewCode = docViewCode.replace('import {', 'import { useDocumentStore } from "./store/documentStore";\nimport {');
}

fs.writeFileSync('C:/Clinic_MVP/dental-crm/apps/web/src/DocumentsView.tsx', docViewCode);
console.log("DocumentsView.tsx processed!");
