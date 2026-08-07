const path = require('path');
const { Project, SyntaxKind } = require('ts-morph');

const project = new Project({
  tsConfigFilePath: 'tsconfig.json',
});

const routesDir = path.join(__dirname, 'src', 'routes');
const sourceFiles = project.addSourceFilesAtPaths(`${routesDir}/**/*.ts`);

const missingAuth = [];

sourceFiles.forEach(sf => {
  const filePath = sf.getFilePath();
  if (filePath.endsWith('.test.ts')) return;

  const fileName = path.basename(filePath, '.ts');
  const callExprs = sf.getDescendantsOfKind(SyntaxKind.CallExpression);
  
  for (const callExpr of callExprs) {
    const propAccess = callExpr.getChildAtIndexIfKind(0, SyntaxKind.PropertyAccessExpression);
    if (!propAccess) continue;
    
    const propName = propAccess.getName();
    if (['post', 'put', 'patch', 'delete'].includes(propName)) {
      const args = callExpr.getArguments();
      if (args.length >= 2) {
        const handlerArg = args[args.length - 1]; 
        
        let arrowFunc = null;
        if (handlerArg.getKind() === SyntaxKind.ArrowFunction || handlerArg.getKind() === SyntaxKind.FunctionExpression) {
          arrowFunc = handlerArg;
        } else if (handlerArg.getKind() === SyntaxKind.ObjectLiteralExpression) {
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
                 const text = arrowFunc.getText();
                 const authTokens = [
                     'withTenantCtx', 'requireStaffIdentity', 'requireOrganizationId',
                     'requirePatientIdentity', 'requireAnyIdentity', 'unguardedBypassAllowed',
                     'requireClinicalMutationAccess', 'requireAdmin', 'verify'
                 ];
                 const hasAuth = authTokens.some(t => text.includes(t));
                 if (!hasAuth && fileName !== 'auth' && fileName !== 'portal' && fileName !== 'system') {
                     missingAuth.push(`${fileName}:${arrowFunc.getStartLineNumber()}`);
                 }
            }
        }
      }
    }
  }
});

console.log('--- Missing Auth / TenantCtx ---');
console.log(missingAuth.join('\n'));
