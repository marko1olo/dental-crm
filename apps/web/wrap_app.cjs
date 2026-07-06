const fs = require('fs');

let code = fs.readFileSync('C:/Clinic_MVP/dental-crm/apps/web/src/App.tsx', 'utf8');

// The destructuring block is huge. Let's just catch all the destructured variables.
const destructuringRegex = /const \{\s*([\s\S]+?)\s*\} = useAppLogic\(\);/;
const match = code.match(destructuringRegex);

if (match) {
  let vars = match[1].split(',').map(s => s.trim()).filter(s => s && !s.startsWith('//') && !s.includes(':'));
  
  // We need to keep the destructuring, but we ALSO need to pass it into AppLogicProvider
  // Actually, we can just say `const appLogic = useAppLogic();` and `const { ... } = appLogic;`
  code = code.replace(destructuringRegex, `const appLogic = useAppLogic();\n  const {\n    ${match[1]}\n  } = appLogic;`);

  // Now replace <WorkspaceShell /> with <AppLogicProvider value={appLogic}><WorkspaceShell /></AppLogicProvider>
  code = code.replace('<WorkspaceShell />', '<AppLogicProvider value={appLogic}><WorkspaceShell /></AppLogicProvider>');

  // Add the import
  if (!code.includes('AppLogicProvider')) {
    code = code.replace('export function App() {', 'import { AppLogicProvider } from "./logic/AppLogicContext";\n\nexport function App() {');
  }

  fs.writeFileSync('C:/Clinic_MVP/dental-crm/apps/web/src/App.tsx', code);
  console.log('App.tsx wrapped with AppLogicProvider successfully');
} else {
  console.log('Failed to find destructuring block');
}
