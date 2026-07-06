const fs = require('fs');
const { Project, SyntaxKind } = require('ts-morph');
const { execSync } = require('child_process');

const project = new Project({
  tsConfigFilePath: 'C:/Clinic_MVP/dental-crm/apps/web/tsconfig.json'
});

const sourceFile = project.getSourceFile('C:/Clinic_MVP/dental-crm/apps/web/src/useAppLogic.tsx');
const useAppLogicDecl = sourceFile.getFunction('useAppLogic');

const statements = useAppLogicDecl.getBody().getStatements();
const telegramStmts = [];
const nonTelegramStmts = [];

statements.forEach(stmt => {
  const text = stmt.getText();
  if (
    stmt.getKind() === SyntaxKind.VariableStatement &&
    text.includes('useTelegramStore()')
  ) {
    telegramStmts.push(stmt);
    return;
  }
  
  let isTelegram = false;
  if (stmt.getKind() === SyntaxKind.VariableStatement) {
    const name = stmt.getDeclarations()[0].getName();
    if (name.toLowerCase().includes('telegram')) isTelegram = true;
  } else if (stmt.getKind() === SyntaxKind.FunctionDeclaration) {
    const name = stmt.getName();
    if (name && name.toLowerCase().includes('telegram')) isTelegram = true;
  }

  // Check if it's an effect that mentions telegram
  if (stmt.getKind() === SyntaxKind.ExpressionStatement && text.startsWith('useEffect') && text.toLowerCase().includes('telegram')) {
    isTelegram = true;
  }

  if (isTelegram) {
    telegramStmts.push(stmt);
  } else {
    nonTelegramStmts.push(stmt);
  }
});

console.log('Telegram statements:', telegramStmts.length);

// We need to figure out what exports this hook needs to make
let exportedNames = [];
telegramStmts.forEach(stmt => {
  if (stmt.getKind() === SyntaxKind.VariableStatement) {
    stmt.getDeclarations().forEach(d => {
       if (d.getName().startsWith('is') || d.getInitializer()?.getKind() === SyntaxKind.ArrowFunction || d.getInitializer()?.getKind() === SyntaxKind.CallExpression) {
         exportedNames.push(d.getName());
       }
    });
  } else if (stmt.getKind() === SyntaxKind.FunctionDeclaration) {
    if (stmt.getName()) exportedNames.push(stmt.getName());
  }
});

const newFileContent = `import { useState, useCallback, useEffect } from 'react';
import { useTelegramStore } from '../../store/settingsStore';
// TODO: imports
export function useTelegramLogic(appLogic: any) {
  // Destructure needed things from appLogic if any
  // __PLACEHOLDER__

  ${telegramStmts.map(s => s.getText()).join('\n\n  ')}

  return {
    ${exportedNames.join(',\n    ')}
  };
}
`;

fs.writeFileSync('C:/Clinic_MVP/dental-crm/apps/web/src/logic/useTelegramLogic.tsx', newFileContent);

// Now remove them from useAppLogic.tsx
telegramStmts.forEach(stmt => stmt.remove());

// Add the call to useTelegramLogic
useAppLogicDecl.insertStatements(0, `const telegramLogic = useTelegramLogic(this_is_a_hack);`);
// Wait, we need to export telegramLogic variables in useAppLogic's return statement.
// I will do that via regex on the text file.

sourceFile.saveSync();
console.log('Extracted to useTelegramLogic.tsx. Please review.');
