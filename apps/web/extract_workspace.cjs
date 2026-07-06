const fs = require('fs');
const { execSync } = require('child_process');

const appPath = 'C:/Clinic_MVP/dental-crm/apps/web/src/App.tsx';
const targetDir = 'C:/Clinic_MVP/dental-crm/apps/web/src/components/workspace';
const targetFile = targetDir + '/WorkspaceShell.tsx';

let appLines = fs.readFileSync(appPath, 'utf8').split('\n');

const startIdx = appLines.findIndex(l => l.includes('<WorkspaceSidebar'));
const endIdx = appLines.findIndex(l => l.includes('</main>')) - 1;

if (startIdx === -1 || endIdx === -1) {
  console.log("Could not find bounds");
  process.exit(1);
}

const extractedLines = appLines.slice(startIdx, endIdx + 1);

const newComponent = `import React, { Suspense } from 'react';
import { useAppLogicContext } from '../../logic/AppLogicContext';
import { AppLoadingState } from '../../AppBootState';

// We might need a lot of imports. Let's copy all imports from App.tsx.
${appLines.slice(0, appLines.findIndex(l => l.includes('export function App()'))).join('\n')}

export function WorkspaceShell() {
  const {
    // __PLACEHOLDER__
  } = useAppLogicContext();

  return (
    <>
${extractedLines.join('\n')}
    </>
  );
}
`;

fs.mkdirSync(targetDir, { recursive: true });
fs.writeFileSync(targetFile, newComponent);

appLines.splice(startIdx, endIdx - startIdx + 1, '      <WorkspaceShell />');
appLines.splice(2, 0, 'import { WorkspaceShell } from "./components/workspace/WorkspaceShell";');

fs.writeFileSync(appPath, appLines.join('\n'));
console.log('Extraction done. Now finding missing variables...');

// Loop to automatically fix TS errors by pulling missing vars from Context
let iterations = 0;
while (iterations < 5) {
  iterations++;
  try {
    console.log(`Running tsc... iteration ${iterations}`);
    execSync('npx tsc -b', { cwd: 'C:/Clinic_MVP/dental-crm/apps/web', stdio: 'pipe' });
    console.log('Build passed! All variables found.');
    break;
  } catch (e) {
    const output = e.stdout.toString();
    const missingVarRegex = /Cannot find name '([^']+)'/g;
    let match;
    const missingVars = new Set();
    while ((match = missingVarRegex.exec(output)) !== null) {
      // Ignore React, HTML elements
      if (!['React', 'div', 'main', 'span', 'h1', 'p'].includes(match[1])) {
        missingVars.add(match[1]);
      }
    }
    
    if (missingVars.size === 0) {
      console.log('No missing variables found, but build failed. Output:', output);
      break;
    }
    
    console.log('Missing variables found:', [...missingVars]);
    
    // Inject into WorkspaceShell.tsx
    let content = fs.readFileSync(targetFile, 'utf8');
    const existingVarsRegex = /const \{\s*([\s\S]*?)\s*\} = useAppLogicContext\(\);/;
    const existingMatch = content.match(existingVarsRegex);
    if (existingMatch) {
      let currentVars = existingMatch[1].replace('// __PLACEHOLDER__', '').split(',').map(s => s.trim()).filter(s => s);
      const newVars = [...new Set([...currentVars, ...missingVars])];
      const replacement = 'const {\n    ' + newVars.join(',\n    ') + '\n  } = useAppLogicContext();';
      content = content.replace(existingVarsRegex, replacement);
      fs.writeFileSync(targetFile, content);
      console.log(`Injected ${missingVars.size} variables.`);
    } else {
      console.log("Could not find destructuring block.");
      break;
    }
  }
}
