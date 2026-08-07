const fs = require('fs');
const path = require('path');
const { Project, SyntaxKind } = require('ts-morph');

const project = new Project({
  tsConfigFilePath: 'tsconfig.json',
});

const routesDir = path.join(__dirname, 'src', 'routes');
const sourceFiles = project.addSourceFilesAtPaths(`${routesDir}/**/*.ts`);

const serverTs = project.addSourceFileAtPath(path.join(__dirname, 'src', 'server.ts'));
const serverText = serverTs.getFullText();

const orphaned = [];
const missingTryCatch = [];
const missingWithTenantCtx = [];

sourceFiles.forEach(sf => {
  const filePath = sf.getFilePath();
  if (filePath.endsWith('.test.ts')) return;

  const fileName = path.basename(filePath, '.ts');
  const importRegex = new RegExp(`from (['"])\\./routes/${fileName}(?:\\.js)?\\1`, 'g');
  const nestedImportRegex = new RegExp(`from (['"])\\./routes/.+/${fileName}(?:\\.js)?\\1`, 'g');
  
  if (!serverText.match(importRegex) && !serverText.match(nestedImportRegex)) {
    orphaned.push(fileName);
  }

  // Find async handlers without try/catch
  // Typical route: fastify.get('/path', async (req, res) => { ... })
  const callExprs = sf.getDescendantsOfKind(SyntaxKind.CallExpression);
  
  for (const callExpr of callExprs) {
    const propAccess = callExpr.getChildAtIndexIfKind(0, SyntaxKind.PropertyAccessExpression);
    if (!propAccess) continue;
    
    const propName = propAccess.getName();
    if (['get', 'post', 'put', 'delete', 'patch'].includes(propName)) {
      // It's a method call. Is it fastify? We can check arguments
      const args = callExpr.getArguments();
      if (args.length >= 2) {
        const handlerArg = args[args.length - 1]; // usually last arg
        
        let arrowFunc = null;
        if (handlerArg.getKind() === SyntaxKind.ArrowFunction || handlerArg.getKind() === SyntaxKind.FunctionExpression) {
          arrowFunc = handlerArg;
        } else if (handlerArg.getKind() === SyntaxKind.ObjectLiteralExpression) {
            // maybe it's { handler: async () => {} }
            const prop = handlerArg.getProperty('handler');
            if (prop && (prop.getKind() === SyntaxKind.PropertyAssignment || prop.getKind() === SyntaxKind.MethodDeclaration)) {
                if (prop.getKind() === SyntaxKind.MethodDeclaration) {
                   arrowFunc = prop;
                } else {
                   const init = prop.getInitializer();
                   if (init && (init.getKind() === SyntaxKind.ArrowFunction || init.getKind() === SyntaxKind.FunctionExpression)) {
                       arrowFunc = init;
                   }
                }
            }
        }
        
        if (arrowFunc && arrowFunc.isAsync()) {
            const body = arrowFunc.getBody();
            if (body && body.getKind() === SyntaxKind.Block) {
                const hasTry = body.getStatements().some(s => s.getKind() === SyntaxKind.TryStatement);
                if (!hasTry) {
                    missingTryCatch.push(`${fileName}:${arrowFunc.getStartLineNumber()}`);
                }
                
                // For post/put/patch/delete, check withTenantCtx
                if (['post', 'put', 'patch', 'delete'].includes(propName)) {
                     const text = arrowFunc.getText();
                     if (!text.includes('withTenantCtx') && !text.includes('unguardedBypassAllowed') && !text.includes('fastify.') && fileName !== 'auth' && fileName !== 'portal' && fileName !== 'system') {
                         missingWithTenantCtx.push(`${fileName}:${arrowFunc.getStartLineNumber()}`);
                     }
                }
            }
        }
      }
    }
  }
});

console.log('--- Orphaned Routes ---');
console.log(orphaned.join('\n'));

console.log('--- Missing Try/Catch ---');
console.log(missingTryCatch.join('\n'));

console.log('--- Missing Auth / TenantCtx ---');
console.log(missingWithTenantCtx.join('\n'));

