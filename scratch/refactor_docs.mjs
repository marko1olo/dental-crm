import { Project, SyntaxKind } from 'ts-morph';
import fs from 'fs';

const project = new Project();
const sourceFile = project.addSourceFileAtPath('C:/Clinic_MVP/dental-crm/apps/web/src/App.tsx');
const helpersFile = project.addSourceFileAtPath('C:/Clinic_MVP/dental-crm/apps/web/src/AppHelpers.tsx');

const appFunction = sourceFile.getFunction('App');

// Find the target functions
const payloadFn = appFunction.getFunction('documentPayloadForKind');
const validateFn = appFunction.getFunction('validateDocumentPayloadForKind');

if (!payloadFn || !validateFn) {
  console.log("Functions not found!");
  process.exit(1);
}

// We will gather all identifier dependencies
function getDependencies(fn) {
  const deps = new Set();
  const declarations = new Set();
  
  // Exclude local declarations
  fn.getVariableDeclarations().forEach(v => declarations.add(v.getName()));
  fn.getParameters().forEach(p => declarations.add(p.getName()));

  fn.getDescendantsOfKind(SyntaxKind.Identifier).forEach(id => {
    const symbol = id.getSymbol();
    if (symbol) {
      const decls = symbol.getDeclarations();
      if (decls.length > 0) {
        const decl = decls[0];
        // If the declaration is outside this function, but inside App()
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
console.log("Dependencies found:", allDeps);

// Now we rename all these dependencies inside the functions to `state.XYZ`
allDeps.forEach(dep => {
  payloadFn.getDescendantsOfKind(SyntaxKind.Identifier).forEach(id => {
    if (id.getText() === dep && id.getParentIfKind(SyntaxKind.PropertyAccessExpression)?.getNameNode() !== id) {
      // Very naive replacement but works for simple identifiers if we are careful
      // Actually ts-morph allows renaming, but rename() affects the whole file!
      // Better to just change the text.
    }
  });
});

console.log("Extracting into a new signature...");
