const fs = require('fs');

const storeKeys = require('C:/Clinic_MVP/dental-crm/scratch/store_keys_settings.json');

let viewCode = fs.readFileSync('C:/Clinic_MVP/dental-crm/apps/web/src/SettingsView.tsx', 'utf8');

let usedKeys = new Set();
for (let key of storeKeys) {
  // Rough heuristic to see if key is mentioned anywhere in the file (could be false positives but safe enough)
  if (viewCode.includes(key)) {
    usedKeys.add(key);
  }
}

// Ensure the store is imported
if (!viewCode.includes('useSettingsStore')) {
  viewCode = viewCode.replace('import { useDocumentStore } from "./store/documentStore";', 'import { useDocumentStore } from "./store/documentStore";\nimport { useSettingsStore } from "./store/settingsStore";');
  if (!viewCode.includes('useSettingsStore')) {
     viewCode = 'import { useSettingsStore } from "./store/settingsStore";\n' + viewCode;
  }
}

// Find SettingsView(props...
const compStart = viewCode.indexOf('export function SettingsView');
if (compStart === -1) {
    console.log("Could not find export function SettingsView");
    process.exit(1);
}

const destructureStart = viewCode.indexOf('const {', compStart);
const destructureEnd = viewCode.indexOf('} = props;', destructureStart);

if (destructureStart > -1 && destructureEnd > -1) {
  let propsBlock = viewCode.substring(destructureStart + 'const {'.length, destructureEnd);
  
  // Split props by comma
  const propLines = propsBlock.split(',').map(s => s.trim()).filter(s => s);
  
  // Keep props that are NOT in usedKeys
  const remainingProps = propLines.filter(p => !usedKeys.has(p));
  
  // Props that we extracted
  const extractedProps = Array.from(usedKeys);

  const newPropsBlock = `const {\n    ${remainingProps.join(',\n    ')}\n  } = props;`;
  const newStoreBlock = `const {\n    ${extractedProps.join(',\n    ')}\n  } = useSettingsStore();`;
  
  viewCode = viewCode.substring(0, destructureStart) + newPropsBlock + '\n  ' + newStoreBlock + viewCode.substring(destructureEnd + '} = props;'.length);
}

fs.writeFileSync('C:/Clinic_MVP/dental-crm/apps/web/src/SettingsView.tsx', viewCode);
console.log('SettingsView.tsx processed!');
