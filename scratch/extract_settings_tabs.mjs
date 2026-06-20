import { Project, SyntaxKind } from 'ts-morph';
import fs from 'fs';

const project = new Project();
const sourceFile = project.addSourceFileAtPath('C:/Clinic_MVP/dental-crm/apps/web/src/SettingsView.tsx');

// We know the file has `{settingsTab === "clinic" ? (` blocks.
// Let's just use string parsing! It's much simpler for JSX blocks that are clearly defined.

const content = fs.readFileSync('C:/Clinic_MVP/dental-crm/apps/web/src/SettingsView.tsx', 'utf8');

const tabs = [
  "clinic", "access", "telegram", "protocols", "rules", "prices", "sources", "ai", "imports", "audit"
];

// First, extract the massive destructuring block so we can reuse it, or just pass `props: any` and use `props.xyz`.
// Actually, it's safer to just copy the destructuring block as-is for now, and let TS trim it later if needed.
// The destructuring block starts at `const {` right after `export function SettingsView(props: SettingsViewProps) {`
const destructMatch = content.match(/const \{\s+([a-zA-Z0-9_,\s]+)\s+\} = props;/);
let destructBlock = "const { } = props;";
let propsList = [];
if (destructMatch) {
  propsList = destructMatch[1].split(',').map(s => s.trim()).filter(Boolean);
  destructBlock = destructMatch[0];
}

// We need to find the JSX blocks for each tab.
// A tab block looks like: `{settingsTab === "clinic" ? (\n ... \n          ) : null}`
// Because it can be deeply nested and have unbalanced regex, we write a simple bracket matcher.

let modifiedContent = content;

if (!fs.existsSync('C:/Clinic_MVP/dental-crm/apps/web/src/settings')) {
  fs.mkdirSync('C:/Clinic_MVP/dental-crm/apps/web/src/settings');
}

for (const tab of tabs) {
  const startPattern = `{settingsTab === "${tab}" ? (`;
  const altStartPattern = `{clinicPublicLookup && settingsTab === "${tab}" ? (`; // edge case for imports
  
  let startIdx = modifiedContent.indexOf(startPattern);
  if (startIdx === -1) {
    startIdx = modifiedContent.indexOf(altStartPattern);
  }
  
  if (startIdx === -1) {
    console.log(`Tab ${tab} not found!`);
    continue;
  }
  
  // Find matching closing parenthesis for the ternary
  // We are at `{settingsTab === "..." ? (`
  // We want to find the matching `) : null}`
  let openCount = 0;
  let endIdx = -1;
  for (let i = startIdx; i < modifiedContent.length; i++) {
    if (modifiedContent[i] === '{') openCount++;
    if (modifiedContent[i] === '}') {
      openCount--;
      if (openCount === 0) {
        endIdx = i;
        break;
      }
    }
  }
  
  if (endIdx === -1) {
    console.log(`Could not find end for ${tab}`);
    continue;
  }
  
  const block = modifiedContent.substring(startIdx, endIdx + 1);
  // Extract the inner JSX inside the ternary:
  // `{settingsTab === "..." ? (  INNER  ) : null}`
  
  let innerMatch = block.match(/\? \(\s*([\s\S]+?)\s*\)\s*:\s*(null|undefined)\s*\}$/);
  let innerJSX = "";
  if (innerMatch) {
    innerJSX = innerMatch[1];
  } else {
    console.log(`Could not extract inner JSX for ${tab}. Trying fallback...`);
    // Fallback: strip the wrapper manually
    const firstParen = block.indexOf('? (');
    const lastParen = block.lastIndexOf(') :');
    if (firstParen !== -1 && lastParen !== -1) {
      innerJSX = block.substring(firstParen + 3, lastParen).trim();
    } else {
      console.log(`Failed totally for ${tab}`);
      continue;
    }
  }
  
  const tabName = tab.charAt(0).toUpperCase() + tab.slice(1);
  const componentName = `Settings${tabName}Tab`;
  
  // Create component file
  // We must include imports! We will just copy the top imports from SettingsView.tsx.
  const importsMatch = content.match(/^([\s\S]+?)type SettingsViewProps/);
  const imports = importsMatch ? importsMatch[1] : `import React, { KeyboardEvent, useRef } from "react";\nimport {\n  AlertTriangle, Check, CheckCircle2, Copy, FileText, Image as ImageIcon, Plus, RefreshCw, Send, Sparkles, UploadCloud, UserCheck\n} from "lucide-react";\n`;
  
  // Filter the destructuring block to only include props actually used in innerJSX
  const usedProps = propsList.filter(p => innerJSX.includes(p) || p === "activePatient");
  const localDestruct = `const {\n    ${usedProps.join(',\n    ')}\n  } = props;`;
  
  const componentContent = `${imports}\ntype SettingsViewProps = Record<string, any>;\n\nexport function ${componentName}(props: SettingsViewProps) {\n  ${localDestruct}\n\n  return (\n    <>\n      ${innerJSX}\n    </>\n  );\n}\n`;
  
  fs.writeFileSync(`C:/Clinic_MVP/dental-crm/apps/web/src/settings/${componentName}.tsx`, componentContent);
  console.log(`Created ${componentName}.tsx`);
  
  // Replace in modifiedContent
  modifiedContent = modifiedContent.substring(0, startIdx) + 
                    `{settingsTab === "${tab}" ? <${componentName} {...props} /> : null}` + 
                    modifiedContent.substring(endIdx + 1);
}

// Add imports to the top of SettingsView.tsx
let newImports = "";
for (const tab of tabs) {
  const tabName = tab.charAt(0).toUpperCase() + tab.slice(1);
  newImports += `import { Settings${tabName}Tab } from "./settings/Settings${tabName}Tab";\n`;
}

modifiedContent = newImports + modifiedContent;

fs.writeFileSync('C:/Clinic_MVP/dental-crm/apps/web/src/SettingsView.tsx', modifiedContent);
console.log("SettingsView.tsx updated!");
