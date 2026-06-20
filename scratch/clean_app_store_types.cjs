const fs = require('fs');

const path = 'C:/Clinic_MVP/dental-crm/apps/web/src/store/appStore.ts';
let code = fs.readFileSync(path, 'utf8');

// We want to extract ONLY the interface AppStore { ... } and export const useAppStore = create<AppStore> ...
// Everything above `interface AppStore {` should be replaced with `import { create } from "zustand";`

const interfaceStart = code.indexOf('interface AppStore {');
if (interfaceStart === -1) {
    console.error("Could not find interface AppStore");
    process.exit(1);
}

let storePart = code.substring(interfaceStart);

// Now, replace ALL types in the interface with `any`
const regex = /^\s*([a-zA-Z0-9_]+):\s*(.+);/gm;
let match;
const newLines = [];
const storeLines = storePart.split('\n');

for (let line of storeLines) {
    if (line.includes(': (val: ') && line.includes(') => void;')) {
        // setter
        const parts = line.split(': (val: ');
        const name = parts[0];
        newLines.push(`${name}: (val: any) => void;`);
    } else if (line.includes(': ') && line.trim().endsWith(';')) {
        // getter
        const name = line.split(':')[0];
        if (name.trim() === 'export const useAppStore = create<AppStore>((set) => ({' || name.trim() === '') {
             newLines.push(line);
        } else {
             newLines.push(`${name}: any;`);
        }
    } else {
        // Something else, maybe create block
        let fixedLine = line.replace(/defaultUiPreferences\.[\w]+/g, 'null');
        fixedLine = fixedLine.replace(/emptyClinicProfileDraft/g, 'null');
        fixedLine = fixedLine.replace(/viewFromHash\(\)/g, 'null');
        fixedLine = fixedLine.replace(/settingsTabFromHash\(\)/g, 'null');
        fixedLine = fixedLine.replace(/loadPendingSpeechChunksFromLocalStorage\([^)]+\)/g, '[]');
        
        newLines.push(fixedLine);
    }
}

// Ensure the first line is the import
let finalCode = `import { create } from "zustand";\n\n` + newLines.join('\n');
fs.writeFileSync(path, finalCode);
console.log('Stripped appStore.ts types');
