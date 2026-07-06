const fs = require('fs');
const { execSync } = require('child_process');
const path = require('path');

const appPath = 'C:/Clinic_MVP/dental-crm/apps/web/src/App.tsx';
const targetFile = 'C:/Clinic_MVP/dental-crm/apps/web/src/components/workspace/WorkspaceShell.tsx';
const componentName = 'WorkspaceShell';
const appDir = path.dirname(appPath);
const targetDir = path.dirname(targetFile);
// Relative path from targetFile to appDir
let relativePathToSrc = path.relative(targetDir, appDir).replace(/\\/g, '/');
if (!relativePathToSrc.endsWith('/')) relativePathToSrc += '/';

let appLines = fs.readFileSync(appPath, 'utf8').split('\n');

const startIdx = appLines.findIndex(l => l.includes('<WorkspaceSidebar'));
const endIdx = appLines.findIndex(l => l.includes('</main>')) - 1;

if (startIdx === -1 || endIdx === -1) {
  console.log("Could not find bounds");
  process.exit(1);
}

const extractedLines = appLines.slice(startIdx, endIdx + 1);

// Extract imports from App.tsx
const importEndIdx = appLines.findIndex(l => l.includes('export function App()'));
let importsCode = appLines.slice(0, importEndIdx).join('\n');

// Rewrite relative imports
importsCode = importsCode.replace(/from\s+["'](\.\.?\/[^"']+)["']/g, (match, p1) => {
  if (p1.startsWith('./')) {
    return `from "${relativePathToSrc}${p1.substring(2)}"`;
  } else if (p1.startsWith('../')) {
    return `from "${relativePathToSrc}${p1}"`;
  }
  return match;
});

// Create initial new component
const newComponent = `import React, { Suspense } from 'react';
import { useAppLogicContext } from '${relativePathToSrc}logic/AppLogicContext';
import { AppLoadingState } from '${relativePathToSrc}AppBootState';

${importsCode}

export function ${componentName}() {
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

// Update App.tsx
appLines.splice(startIdx, endIdx - startIdx + 1, `      <${componentName} />`);
appLines.splice(2, 0, `import { ${componentName} } from "./components/workspace/${componentName}";`);

fs.writeFileSync(appPath, appLines.join('\n'));
console.log('Extraction done. Now finding missing variables...');

// Loop to automatically fix TS errors
let iterations = 0;
while (iterations < 10) {
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
      if (!['React'].includes(match[1])) {
        missingVars.add(match[1]);
      }
    }
    
    if (missingVars.size === 0) {
      console.log('No missing variables found, but build failed. Output:', output);
      break;
    }
    
    console.log('Missing variables found:', [...missingVars]);
    
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
