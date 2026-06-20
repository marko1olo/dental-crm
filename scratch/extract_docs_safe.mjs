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

// Get bodies
const payloadBody = payloadFn.getBodyText();
const validateBody = validateFn.getBodyText();

// Generate destructuring block
const destructureBlock = `const { ${allDeps.join(', ')} } = state;`;

const newFile = `import { DocumentPayload, GeneratedDocument } from "@dental/shared";

export type DocumentState = Record<string, any>;

export function documentPayloadForKind(kind: GeneratedDocument["kind"], state: DocumentState): DocumentPayload | null {
  ${destructureBlock}
  ${payloadBody}
}

export function validateDocumentPayloadForKind(kind: GeneratedDocument["kind"], state: DocumentState): string[] {
  ${destructureBlock}
  ${validateBody}
}
`;

fs.writeFileSync('C:/Clinic_MVP/dental-crm/apps/web/src/documentLogic.ts', newFile);
console.log("Successfully extracted functions to documentLogic.ts");
