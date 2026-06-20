import { Project, SyntaxKind } from 'ts-morph';
import fs from 'fs';

const project = new Project();
const sourceFile = project.addSourceFileAtPath('C:/Clinic_MVP/dental-crm/apps/web/src/App.tsx');
const appFunction = sourceFile.getFunction('App');

// 1. Identify start and end lines for the massive useState block.
// Start: const [paidContractNumber
// End: const [outpatient025uHealthStatusDisclosureContact
let startNode = null;
let endNode = null;

appFunction.getVariableStatements().forEach(stmt => {
  const text = stmt.getText();
  if (text.includes('const [paidContractNumber')) startNode = stmt;
  if (text.includes('const [outpatient025uHealthStatusDisclosureContact')) endNode = stmt;
});

if (!startNode || !endNode) {
  console.log("Could not find start or end nodes");
  process.exit(1);
}

const startIdx = startNode.getChildIndex();
const endIdx = endNode.getChildIndex();

const documentStateStatements = appFunction.getStatements().slice(startIdx, endIdx + 1);

// Get the functions
const payloadFn = appFunction.getFunction('documentPayloadForKind');
const validateFn = appFunction.getFunction('validateDocumentPayloadForKind');
const createDocFn = appFunction.getFunction('createDocument');

// Grab all text
const statesText = documentStateStatements.map(s => s.getText()).join('\n  ');
const fnsText = [payloadFn.getText(), validateFn.getText(), createDocFn.getText()].join('\n\n  ');

// What external dependencies do these states and functions need from App?
// We will just do a quick scan of what they use that is NOT defined inside them.
// But we know from earlier it's things like `dashboard`, `setError`, `documentCreateSavingKind`, `documentAmountSource`, `documentKindMetadata`, `valid`...
// Wait, `documentCreateSavingKind` is also a state! Is it in the block?
const extraStatesToMove = ['documentCreateSavingKind', 'documentPatient'];
let extraText = '';
appFunction.getVariableStatements().forEach(stmt => {
  const text = stmt.getText();
  if (text.includes('const [documentCreateSavingKind') || text.includes('const documentPatient =')) {
    extraText += stmt.getText() + '\n  ';
  }
});

// Let's just output the hook string!
const newHookText = `
import { useState } from "react";

export function useDocumentLogic(props: any) {
  const { dashboard, setError, documentKindMetadata, documentAmountSource, activePatient } = props;
  
  ${extraText}
  ${statesText}
  
  ${fnsText}
  
  return {
    // we would return all state variables here
  };
}
`;

fs.writeFileSync('C:/Clinic_MVP/dental-crm/scratch/useDocumentLogicRaw.ts', newHookText);
console.log("Extracted raw hook");
