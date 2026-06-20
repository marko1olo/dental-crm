const fs = require('fs');
const { execSync } = require('child_process');

const prefixes = [
  "payment", "documentIssue", "documentVoid", "personalData", "refusal", "document"
];

let appCode = fs.readFileSync('C:/Clinic_MVP/dental-crm/apps/web/src/App.tsx', 'utf8');

const states = [];

// Better regex using RegExp
const regex = /^\s*const \[\s*([a-zA-Z0-9_]+)\s*,\s*set([a-zA-Z0-9_]+)\s*\] = useState(?:<([^>]+)>)?\(([\s\S]*?)\);/gm;
let match;
while ((match = regex.exec(appCode)) !== null) {
  const [, stateVar, setterRaw, typeArg, initial] = match;
  
  // Skip if it's not a document state or if it's a settings state that we didn't want
  // wait, payment might be for FinanceView. Are payment states for FinanceView or DocumentsView?
  // Let's check if DocumentsView uses payment states.
  // We'll extract ALL of these for now and fix them.
  const isTarget = prefixes.some(p => stateVar.startsWith(p));
  
  if (isTarget) {
    let cleanInitial = initial.trim();
    if (cleanInitial.startsWith('() => ')) cleanInitial = cleanInitial.slice(6).trim();
    
    // Type inference
    let typeStr = typeArg || 'any';
    if (typeStr === 'any') {
      if (cleanInitial === 'true' || cleanInitial === 'false') typeStr = 'boolean';
      else if (cleanInitial.startsWith('"') || cleanInitial.startsWith('`')) typeStr = 'string';
    }

    states.push({
      name: stateVar,
      setter: 'set' + setterRaw,
      type: typeStr,
      initial: cleanInitial,
      fullText: match[0]
    });
  }
}

console.log("Found " + states.length + " states.");
states.forEach(s => console.log(s.name));

