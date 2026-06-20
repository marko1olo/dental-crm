import fs from 'fs';

const code = fs.readFileSync('C:/Clinic_MVP/dental-crm/apps/web/src/App.tsx', 'utf8');

const regex = /const \[([a-zA-Z0-9_]+),\s*([a-zA-Z0-9_]+)\]\s*=\s*useState(?:<([^>]+)>)?\(([\s\S]*?)\);/g;

let match;
const varsToExtract = [];
let modifiedCode = code;

while ((match = regex.exec(code)) !== null) {
  const fullMatch = match[0];
  const name = match[1];
  const setter = match[2];
  const defaultValue = match[4].trim();
  
  if (defaultValue.includes('dashboard?') || defaultValue.includes('activeOrganizationId')) {
    continue;
  }
  
  varsToExtract.push(name, setter);
  
  // Replace the useState declaration with an empty string
  modifiedCode = modifiedCode.replace(fullMatch + '\n', '');
  // Also try replacing it without a newline just in case
  modifiedCode = modifiedCode.replace(fullMatch, '');
}

const destructureStmt = `  const { ${varsToExtract.join(', ')} } = useMainStore();\n`;

// Insert the destructure statement at the top of App function
modifiedCode = modifiedCode.replace('export default function App() {', 'export default function App() {\n' + destructureStmt);

// Add the import for useMainStore
if (!modifiedCode.includes('useMainStore')) {
  modifiedCode = modifiedCode.replace('import { useDocumentStore } from "./store/documentStore";', 'import { useDocumentStore } from "./store/documentStore";\nimport { useMainStore } from "./store/mainStore";');
}

fs.writeFileSync('C:/Clinic_MVP/dental-crm/scratch/AppNew2.tsx', modifiedCode);
console.log(`Extracted ${varsToExtract.length} variables into destructuring from mainStore.`);
