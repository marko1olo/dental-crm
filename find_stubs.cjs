const { Project, SyntaxKind } = require("ts-morph");
const path = require("path");

const project = new Project();

project.addSourceFilesAtPaths([
  "apps/web/src/AppHelpers.tsx",
  "apps/web/src/hooks/domains/*.ts"
]);

let foundStubs = 0;

for (const sourceFile of project.getSourceFiles()) {
  const objLiterals = sourceFile.getDescendantsOfKind(SyntaxKind.ObjectLiteralExpression);
  let fileModified = false;

  for (const obj of objLiterals) {
    const properties = obj.getProperties();
    let hasSpread = false;
    const stubsToRemove = [];

    for (const prop of properties) {
      if (prop.getKind() === SyntaxKind.SpreadAssignment) {
        hasSpread = true;
      } else if (hasSpread && prop.getKind() === SyntaxKind.PropertyAssignment) {
        const initializer = prop.getInitializer();
        if (!initializer) continue;
        
        const kind = initializer.getKind();
        let isEmptyStub = false;
        
        if (kind === SyntaxKind.NullKeyword || kind === SyntaxKind.UndefinedKeyword) {
          isEmptyStub = true;
        } else if (kind === SyntaxKind.ArrayLiteralExpression) {
          if (initializer.getElements().length === 0) {
            isEmptyStub = true;
          }
        } else if (kind === SyntaxKind.ArrowFunction) {
          const body = initializer.getBody();
          if (body.getKind() === SyntaxKind.Block && body.getStatements().length === 0) {
            isEmptyStub = true;
          } else if (body.getKind() !== SyntaxKind.Block) {
             // Handle () => undefined or () => null
             if (body.getKind() === SyntaxKind.UndefinedKeyword || body.getKind() === SyntaxKind.NullKeyword) {
                 isEmptyStub = true;
             }
          }
        }

        if (isEmptyStub) {
          console.log(`Found stub in ${sourceFile.getFilePath()} at line ${prop.getStartLineNumber()}: ${prop.getName()}`);
          stubsToRemove.push(prop);
        }
      }
    }
    
    if (stubsToRemove.length > 0) {
      for (const p of stubsToRemove) {
          p.remove();
      }
      fileModified = true;
      foundStubs += stubsToRemove.length;
    }
  }
  
  if (fileModified) {
    sourceFile.saveSync();
  }
}

console.log(`Total stubs removed: ${foundStubs}`);
