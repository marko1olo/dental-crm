const fs = require('fs');
const { Project, SyntaxKind } = require('ts-morph');

const project = new Project({
  tsConfigFilePath: '/app/apps/web/tsconfig.json'
});

const sourceFile = project.getSourceFile('/app/apps/web/src/useAppLogic.tsx');
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

let exportedNames = [];
telegramStmts.forEach(stmt => {
  if (stmt.getKind() === SyntaxKind.VariableStatement) {
    stmt.getDeclarations().forEach(d => {
       const nameNode = d.getNameNode();
       if (nameNode.getKind() === SyntaxKind.ObjectBindingPattern) {
          nameNode.getElements().forEach(el => exportedNames.push(el.getName()));
       } else {
          const init = d.getInitializer();
          if (init && (init.getKind() === SyntaxKind.ArrowFunction || init.getKind() === SyntaxKind.CallExpression)) {
            exportedNames.push(d.getName());
          }
       }
    });
  } else if (stmt.getKind() === SyntaxKind.FunctionDeclaration) {
    if (stmt.getName()) exportedNames.push(stmt.getName());
  }
});

let allUsedIdentifiers = new Set();
telegramStmts.forEach(stmt => {
  stmt.getDescendantsOfKind(SyntaxKind.Identifier).forEach(id => {
    allUsedIdentifiers.add(id.getText());
  });
});

const requiredImports = [];
const seenModules = new Set();
sourceFile.getImportDeclarations().forEach(importDecl => {
  const moduleSpecifier = importDecl.getModuleSpecifierValue();
  let newModuleSpecifier = moduleSpecifier;
  if (newModuleSpecifier.startsWith('./')) {
    newModuleSpecifier = '../' + newModuleSpecifier.slice(2);
  } else if (newModuleSpecifier.startsWith('../')) {
    newModuleSpecifier = '../' + newModuleSpecifier;
  }

  if (seenModules.has(newModuleSpecifier)) {
    return; // deduplicate modules
  }

  const namedImports = [];
  let isTypeOnly = importDecl.isTypeOnly();

  importDecl.getNamedImports().forEach(ni => {
    const name = ni.getName();
    if (allUsedIdentifiers.has(name) || (ni.getAliasNode() && allUsedIdentifiers.has(ni.getAliasNode().getText()))) {
      let exportName = ni.getName();
      let alias = ni.getAliasNode() ? ni.getAliasNode().getText() : null;
      let text = alias ? `${exportName} as ${alias}` : exportName;
      if (ni.isTypeOnly() && !isTypeOnly) {
          namedImports.push(`type ${text}`);
      } else {
          namedImports.push(text);
      }
    }
  });

  const defaultImport = importDecl.getDefaultImport();
  let defaultImportName = null;
  if (defaultImport && allUsedIdentifiers.has(defaultImport.getText())) {
    defaultImportName = defaultImport.getText();
  }

  if (namedImports.length > 0 || defaultImportName) {
    seenModules.add(newModuleSpecifier);
    let importText = 'import ';
    if (isTypeOnly) importText += 'type ';
    if (defaultImportName) {
      importText += defaultImportName;
      if (namedImports.length > 0) importText += ', ';
    }
    if (namedImports.length > 0) {
      let cleanedImports = namedImports.map(i => {
         if (i.startsWith('type type ')) return i.replace('type type ', 'type ');
         return i;
      });
      cleanedImports = [...new Set(cleanedImports)];
      importText += `{ ${cleanedImports.join(', ')} }`;
    }
    importText += ` from '${newModuleSpecifier}';`;
    requiredImports.push(importText);
  }
});

const importsBlock = requiredImports.join('\n');

const newFileContent = `${importsBlock}

export function useTelegramLogic(deps: any) {
  const { activePatient, activeDoctor, activeAppointment, loadDashboard, queueUiPreferencesServerSync, selectedSpecialty, selectedProtocolId, selectedPatientId, scheduleDoctorFilterId, scheduleAssistantFilterId, scheduleChairFilterId, scheduleDefaultDoctorUserId, scheduleDefaultAssistantUserId, scheduleDefaultChairId, scheduleStatusFilter, scheduleDateFilter, imagingImportSourceKind, imagingKindFilter, dicomWebEndpointUrl, reconcileDashboardScopedUiSelections, resolvedAdminSecretUnlockDomain, adminSecretDraftForDomain, rememberAdminSecret, clearAdminSecretDraft, forgetAdminSecret } = deps; // Destructure dependencies here if TS complains

  ${telegramStmts.map(s => s.getText().replace(/\[\.\.\.new Set\((.*?)\)\]/g, 'Array.from(new Set($1))')).join('\n\n  ')}

  return {
    ${exportedNames.join(',\n    ')}
  };
}
`;

fs.writeFileSync('/app/apps/web/src/logic/useTelegramLogic.tsx', newFileContent);
console.log('Fixed export syntax!');
