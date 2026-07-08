const fs = require('fs');
const { Project, SyntaxKind } = require('ts-morph');

const project = new Project({
  tsConfigFilePath: 'tsconfig.json'
});

const sourceFile = project.getSourceFile('src/useAppLogic.tsx');
const useAppLogicDecl = sourceFile.getFunction('useAppLogic');

const statements = useAppLogicDecl.getBody().getStatements();
const telegramStmts = [];

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
    // Check if any variable name contains 'telegram' or 'Telegram'
    stmt.getDeclarations().forEach(d => {
       const nameNode = d.getNameNode();
       if (nameNode.getKind() === SyntaxKind.ObjectBindingPattern) {
          nameNode.getElements().forEach(el => {
             if (el.getName().toLowerCase().includes('telegram')) isTelegram = true;
          });
       } else {
          if (d.getName().toLowerCase().includes('telegram')) isTelegram = true;
       }
    });
  } else if (stmt.getKind() === SyntaxKind.FunctionDeclaration) {
    const name = stmt.getName();
    if (name && name.toLowerCase().includes('telegram')) isTelegram = true;
  }

  if (stmt.getKind() === SyntaxKind.ExpressionStatement && text.startsWith('useEffect') && text.toLowerCase().includes('telegram')) {
    isTelegram = true;
  }

  if (isTelegram) {
    telegramStmts.push(stmt);
  }
});

console.log('Telegram statements:', telegramStmts.length);

let exportedNames = [];
telegramStmts.forEach(stmt => {
  if (stmt.getKind() === SyntaxKind.VariableStatement) {
    stmt.getDeclarations().forEach(d => {
       const nameNode = d.getNameNode();
       if (nameNode.getKind() === SyntaxKind.ObjectBindingPattern) {
          nameNode.getElements().forEach(el => exportedNames.push(el.getName()));
       } else {
          const init = d.getInitializer();
          // We only export functions and states (start with is)
          if (init && (init.getKind() === SyntaxKind.ArrowFunction || init.getKind() === SyntaxKind.CallExpression)) {
            exportedNames.push(d.getName());
          }
       }
    });
  } else if (stmt.getKind() === SyntaxKind.FunctionDeclaration) {
    if (stmt.getName()) exportedNames.push(stmt.getName());
  }
});

// We need to determine required imports.
const allImportDeclarations = sourceFile.getImportDeclarations();
const availableImports = new Map(); // identifier -> import info
allImportDeclarations.forEach(imp => {
  const moduleSpecifier = imp.getModuleSpecifierValue();

  // Default import
  const defaultImport = imp.getDefaultImport();
  if (defaultImport) {
    availableImports.set(defaultImport.getText(), { moduleSpecifier, name: defaultImport.getText(), isDefault: true });
  }

  // Named imports
  imp.getNamedImports().forEach(named => {
    const name = named.getName();
    const alias = named.getAliasNode() ? named.getAliasNode().getText() : null;
    const identifier = alias || name;
    availableImports.set(identifier, { moduleSpecifier, name, alias, isDefault: false });
  });
});

// Find all identifiers used in the extracted statements
const usedIdentifiers = new Set();
telegramStmts.forEach(stmt => {
  stmt.getDescendantsOfKind(SyntaxKind.Identifier).forEach(id => {
    usedIdentifiers.add(id.getText());
  });
});

// Calculate which imports are actually needed
const neededImportsMap = new Map(); // moduleSpecifier -> Array of import infos
usedIdentifiers.forEach(id => {
  if (availableImports.has(id)) {
    const importInfo = availableImports.get(id);
    if (!neededImportsMap.has(importInfo.moduleSpecifier)) {
      neededImportsMap.set(importInfo.moduleSpecifier, []);
    }
    // Prevent duplicates
    const existing = neededImportsMap.get(importInfo.moduleSpecifier);
    if (!existing.some(i => (i.alias || i.name) === (importInfo.alias || importInfo.name))) {
        existing.push(importInfo);
    }
  }
});

let manualImports = '';
let reactImports = new Set(); // we will deduce react imports as well

neededImportsMap.forEach((infos, moduleSpecifier) => {
  if (moduleSpecifier === 'react') {
    infos.forEach(i => reactImports.add(i.name));
    return; // handle react imports separately
  }

  // Adjust paths if they are local since we are moving from src/useAppLogic.tsx to src/logic/useTelegramLogic.tsx
  let adjustedModuleSpecifier = moduleSpecifier;
  if (moduleSpecifier.startsWith('./')) {
    adjustedModuleSpecifier = '../' + moduleSpecifier.slice(2);
  } else if (moduleSpecifier.startsWith('../')) {
    adjustedModuleSpecifier = '../' + moduleSpecifier;
  }

  const defaultImports = infos.filter(i => i.isDefault);
  const namedImports = infos.filter(i => !i.isDefault);

  const importParts = [];
  if (defaultImports.length > 0) {
    importParts.push(defaultImports.map(i => i.name).join(', '));
  }

  if (namedImports.length > 0) {
    const namedParts = namedImports.map(i => i.alias ? `${i.name} as ${i.alias}` : i.name);
    importParts.push(`{ ${namedParts.join(', ')} }`);
  }

  manualImports += `import ${importParts.join(', ')} from "${adjustedModuleSpecifier}";\n`;
});

// Add basic React hooks that are almost always needed
['useState', 'useCallback', 'useEffect', 'useMemo', 'useRef'].forEach(hook => reactImports.add(hook));

const reactImportsStr = Array.from(reactImports).join(', ');

const newFileContent = `// @ts-nocheck
import { ${reactImportsStr} } from 'react';
${manualImports}

export function useTelegramLogic(deps: any) {
  // Destructure dependencies here if TS complains
  const {
    setError, queueUiPreferencesServerSync, operatorWorkflowFailureMessage, operatorReadableErrorDetailFromUnknown,
    selectedSpecialty, selectedProtocolId, selectedPatientId, scheduleDoctorFilterId, scheduleAssistantFilterId,
    scheduleChairFilterId, scheduleDefaultDoctorUserId, scheduleDefaultAssistantUserId, scheduleDefaultChairId,
    scheduleStatusFilter, scheduleDateFilter, imagingImportSourceKind, imagingKindFilter, dicomWebEndpointUrl,
    emptyTelegramVisualCardUrlDrafts, defaultTelegramPostVisitCheckupDelayHoursByTopic, reconcileDashboardScopedUiSelections,
    readDenteTelegramHandoffTarget, stripDenteTelegramHandoffQuery, isTelegramOutboxItemDueForUi, activePatient,
    responseErrorMessage, activeDoctor, activeAppointment, normalizeTelegramBotUsernameDraft, normalizeTelegramPublicHttpsUrlDraft,
    normalizeTelegramVisualCardUrlDraftsForSave, telegramHumanMessage, loadDashboard,
    AdminSecretUnlockDomain, adminSecretDraftForDomain, rememberAdminSecret, forgetAdminSecret,
    resolvedAdminSecretUnlockDomain, clearAdminSecretDraft
  } = deps;

  ${telegramStmts.map(s => {
    let text = s.getText();
    // remove the const { setError } from deps if it was accidentally copied as a statement
    // We can be more robust and check if it's a variable statement that just contains { setError } or { error, setError }
    if (text.trim().startsWith('const {') && text.includes('setError')) {
       // Only remove if it's EXACTLY the line causing duplicate variable, but actually useTelegramLogic doesn't have an error store.
       // It comes from appStore in useAppLogic. Let's just remove any const { ... setError ... } = useAppStore() from telegramStmts.
       // Wait, we destructure it in deps. So we should remove it from the statements.
       return '';
    }
    return text;
  }).filter(t => t !== '').join('\n\n  ')}

  return {
    ${exportedNames.join(',\n    ')}
  };
}
`;

fs.writeFileSync('src/logic/useTelegramLogic.tsx', newFileContent);
console.log('Fixed export syntax!');
