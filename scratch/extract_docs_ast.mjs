import { Project, SyntaxKind } from 'ts-morph';
import fs from 'fs';

const project = new Project();
const sourceFile = project.addSourceFileAtPath('C:/Clinic_MVP/dental-crm/apps/web/src/App.tsx');

const appFunction = sourceFile.getFunction('App');

const payloadFn = appFunction.getFunction('documentPayloadForKind');
const validateFn = appFunction.getFunction('validateDocumentPayloadForKind');

if (!payloadFn || !validateFn) {
  console.log("Functions not found!");
  process.exit(1);
}

function getDependencies(fn) {
  const deps = new Set();
  const declarations = new Set();
  
  fn.getVariableDeclarations().forEach(v => declarations.add(v.getName()));
  fn.getParameters().forEach(p => declarations.add(p.getName()));

  fn.getDescendantsOfKind(SyntaxKind.Identifier).forEach(id => {
    const symbol = id.getSymbol();
    if (symbol) {
      const decls = symbol.getDeclarations();
      if (decls.length > 0) {
        const decl = decls[0];
        if (decl.getSourceFile() === sourceFile && decl.getAncestors().includes(appFunction) && !decl.getAncestors().includes(fn)) {
          if (!declarations.has(id.getText())) {
            deps.add(id.getText());
          }
        }
      }
    }
  });
  return Array.from(deps);
}

const payloadDeps = getDependencies(payloadFn);
const validateDeps = getDependencies(validateFn);
const allDeps = Array.from(new Set([...payloadDeps, ...validateDeps]));

console.log(`Found ${allDeps.length} dependencies.`);

// To safely modify without breaking iteration, we find them and replace from bottom to top
function prefixDependencies(fn) {
  const identifiersToReplace = [];
  fn.getDescendantsOfKind(SyntaxKind.Identifier).forEach(id => {
    if (allDeps.includes(id.getText())) {
      // Avoid replacing property names in object literals unless it's a shorthand like { paidContractNumber } -> { paidContractNumber: state.paidContractNumber }
      const parent = id.getParent();
      if (parent.getKind() === SyntaxKind.ShorthandPropertyAssignment) {
        identifiersToReplace.push({ node: id, text: `${id.getText()}: state.${id.getText()}` });
      } else if (parent.getKind() === SyntaxKind.PropertyAccessExpression && parent.getNameNode() === id) {
        // Do nothing for `foo.paidContractNumber`
      } else if (parent.getKind() === SyntaxKind.PropertyAssignment && parent.getNameNode() === id) {
        // Do nothing for `{ paidContractNumber: 123 }`
      } else {
        identifiersToReplace.push({ node: id, text: `state.${id.getText()}` });
      }
    }
  });
  
  // Replace in reverse order so we don't mess up text offsets
  identifiersToReplace.sort((a, b) => b.node.getPos() - a.node.getPos());
  for (const item of identifiersToReplace) {
    item.node.replaceWithText(item.text);
  }
}

prefixDependencies(payloadFn);
prefixDependencies(validateFn);

const payloadFnText = payloadFn.getText();
const validateFnText = validateFn.getText();

// Now create the new file
const newFile = `
import { DocumentPayload, GeneratedDocument } from "@dental/shared";

export type DocumentState = Record<string, any>;

export ${payloadFnText.replace('function documentPayloadForKind(kind: GeneratedDocument["kind"])', 'function documentPayloadForKind(kind: GeneratedDocument["kind"], state: DocumentState)')}

export ${validateFnText.replace('function validateDocumentPayloadForKind(kind: GeneratedDocument["kind"])', 'function validateDocumentPayloadForKind(kind: GeneratedDocument["kind"], state: DocumentState)')}
`;

fs.writeFileSync('C:/Clinic_MVP/dental-crm/apps/web/src/documentLogic.ts', newFile);
console.log("Successfully extracted functions to documentLogic.ts");
