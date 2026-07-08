const fs = require('fs');
const { Project, SyntaxKind } = require('ts-morph');
const { execSync } = require('child_process');

const project = new Project({
  tsConfigFilePath: 'apps/web/tsconfig.json'
});

const sourceFile = project.getSourceFile('apps/web/src/useAppLogic.tsx');
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

const referencedIdentifiers = new Set();
telegramStmts.forEach(stmt => {
  const identifiers = stmt.getDescendantsOfKind(SyntaxKind.Identifier);
  identifiers.forEach(id => {
    referencedIdentifiers.add(id.getText());
  });
});

const allTelegramDeclared = new Set();
telegramStmts.forEach(stmt => {
    if (stmt.getKind() === SyntaxKind.VariableStatement) {
        stmt.getDeclarations().forEach(d => {
           allTelegramDeclared.add(d.getName());
           if (d.getNameNode().getKind() === SyntaxKind.ObjectBindingPattern) {
             d.getNameNode().getElements().forEach(el => allTelegramDeclared.add(el.getName()));
           }
        });
    } else if (stmt.getKind() === SyntaxKind.FunctionDeclaration) {
        allTelegramDeclared.add(stmt.getName());
    }
});

const imports = sourceFile.getImportDeclarations();
const generatedImports = [];
const importedSet = new Set(['useTelegramStore']);

imports.forEach(imp => {
  const namedImports = imp.getNamedImports().map(ni => ni.getName());
  const defaultImport = imp.getDefaultImport()?.getText();

  let used = false;
  let usedNamed = [];
  namedImports.forEach(name => {
    if (referencedIdentifiers.has(name) && name !== 'useTelegramStore') {
      used = true;
      usedNamed.push(name);
      importedSet.add(name);
    }
  });

  if (defaultImport && referencedIdentifiers.has(defaultImport)) {
    used = true;
    importedSet.add(defaultImport);
  }

  if (used) {
    let specifier = imp.getModuleSpecifierValue();
    if (specifier.startsWith('./')) {
      specifier = '.' + specifier;
    } else if (specifier.startsWith('../')) {
      specifier = '.' + specifier;
    }

    let importStr = `import { ${usedNamed.join(', ')} } from '${specifier}';`;
    if (defaultImport && referencedIdentifiers.has(defaultImport)) {
        if (usedNamed.length > 0) {
            importStr = `import ${defaultImport}, { ${usedNamed.join(', ')} } from '${specifier}';`;
        } else {
            importStr = `import ${defaultImport} from '${specifier}';`;
        }
    }

    generatedImports.push(importStr);
  }
});

// Remove useDocumentStore duplicates or react duplicates manually just in case
const finalImports = new Set();
generatedImports.forEach(i => {
  if (i.includes('import { useEffect, useMemo, useRef } from \'react\';')) {
     finalImports.add('import { useMemo, useRef } from \'react\';');
  } else if (!finalImports.has(i)) {
     finalImports.add(i);
  }
});
const uniqueGeneratedImports = Array.from(finalImports);


const useAppLogicLocals = new Set();
const allStatements = useAppLogicDecl.getBody().getStatements();
allStatements.forEach(stmt => {
    if (stmt.getKind() === SyntaxKind.VariableStatement) {
        stmt.getDeclarations().forEach(d => {
            const name = d.getName();
            useAppLogicLocals.add(name);
            if (d.getNameNode().getKind() === SyntaxKind.ObjectBindingPattern) {
                d.getNameNode().getElements().forEach(el => {
                    useAppLogicLocals.add(el.getName());
                });
            }
        });
    } else if (stmt.getKind() === SyntaxKind.FunctionDeclaration) {
        useAppLogicLocals.add(stmt.getName());
    }
});

const requiredAppLogicProps = Array.from(referencedIdentifiers).filter(id =>
    !allTelegramDeclared.has(id) &&
    !importedSet.has(id) &&
    useAppLogicLocals.has(id)
);

const newFileContent = `import { useState, useCallback, useEffect } from 'react';
import { useTelegramStore } from '../../store/settingsStore';
${uniqueGeneratedImports.join('\n')}

export function useTelegramLogic(appLogic: any) {
  const {
    ${requiredAppLogicProps.join(',\n    ')}
  } = appLogic;

  ${telegramStmts.map(s => s.getText()).join('\n\n  ')}

  return {
    ${exportedNames.join(',\n    ')}
  };
}
`;

fs.writeFileSync('apps/web/src/logic/useTelegramLogic.tsx', newFileContent);

// Now remove them from useAppLogic.tsx
telegramStmts.forEach(stmt => stmt.remove());

// Add the call to useTelegramLogic
useAppLogicDecl.insertStatements(0, `const telegramLogic = useTelegramLogic(this_is_a_hack);`);
// Wait, we need to export telegramLogic variables in useAppLogic's return statement.
// I will do that via regex on the text file.

sourceFile.saveSync();
console.log('Extracted to useTelegramLogic.tsx. Please review.');
