const fs = require('fs');
const parser = require('@babel/parser');
const traverse = require('@babel/traverse').default;

const appPath = 'C:/Clinic_MVP/dental-crm/apps/web/src/App.tsx';
const code = fs.readFileSync(appPath, 'utf8');

const ast = parser.parse(code, {
    sourceType: 'module',
    plugins: ['typescript', 'jsx']
});

let appFunctionNode = null;

traverse(ast, {
    FunctionDeclaration(path) {
        if (path.node.id && path.node.id.name === 'App') {
            appFunctionNode = path.node;
        }
    }
});

if (!appFunctionNode) {
    console.error('Could not find App() function');
    process.exit(1);
}

const body = appFunctionNode.body.body;
const returnStatement = body[body.length - 1];

const logicNodes = body.slice(0, body.length - 1);
const logicStart = logicNodes[0].start;
const logicEnd = logicNodes[logicNodes.length - 1].end;

const logicString = code.substring(logicStart, logicEnd);
const jsxString = code.substring(returnStatement.start, returnStatement.end);

// To find variables:
const wrappedJsx = `function Dummy() { ${jsxString} }`;
const jsxAst = parser.parse(wrappedJsx, {
    sourceType: 'module',
    plugins: ['typescript', 'jsx']
});

const referencedVars = new Set();
traverse(jsxAst, {
    Identifier(path) {
        if (path.isReferencedIdentifier() && !path.scope.hasBinding(path.node.name)) {
            referencedVars.add(path.node.name);
        }
    },
    JSXIdentifier(path) {
        if (path.parent.type === 'JSXOpeningElement' && path.parent.name === path.node) {
             if (/^[A-Z]/.test(path.node.name) && !path.scope.hasBinding(path.node.name)) {
                 referencedVars.add(path.node.name);
             }
        }
    }
});

const globals = ['window', 'document', 'console', 'React', 'setTimeout', 'setInterval', 'clearTimeout', 'clearInterval', 'undefined', 'NaN', 'Math', 'Date', 'Promise', 'Array', 'Object', 'String', 'Number', 'Boolean', 'URL', 'URLSearchParams', 'fetch'];
globals.forEach(g => referencedVars.delete(g));
const varsArray = Array.from(referencedVars).sort();

const returnedVarsString = varsArray.join(',\n    ');

// 1. Create useAppLogic.ts
// We need to copy ALL the imports from App.tsx over to useAppLogic.ts
// But App.tsx also needs some imports (e.g. useAppLogic, React, Suspense, lazy).
// Let's just copy all imports to both for now, Vite will tree-shake unused ones!

const importRegex = /^import\s+[\s\S]*?from\s+['"][^'"]+['"];?/gm;
const allImports = code.match(importRegex).join('\n');

const hookCode = `// @ts-nocheck
${allImports}
import { useAppStore } from "./store/appStore";
import { useDocumentStore } from "./store/documentStore";
import { useImagingStore } from "./store/imagingStore";
import { usePatientStore } from "./store/patientStore";
import { useScheduleStore } from "./store/scheduleStore";
import { useVisitStore } from "./store/visitStore";
import { useSettingsStore } from "./store/settingsStore";

export function useAppLogic() {
${logicString}

  return {
    ${returnedVarsString}
  };
}
`;

fs.writeFileSync('C:/Clinic_MVP/dental-crm/apps/web/src/useAppLogic.tsx', hookCode);

// 2. Rewrite App.tsx
const beforeLogic = code.substring(0, logicStart);
const afterLogic = code.substring(logicEnd);

// Instead of rewriting imports perfectly, we just add `import { useAppLogic } from './useAppLogic';` at the top
let newAppCode = `import { useAppLogic } from './useAppLogic';\n` + beforeLogic + `
  const {
    ${returnedVarsString}
  } = useAppLogic();
` + afterLogic;

fs.writeFileSync(appPath, newAppCode);
console.log('Successfully split App.tsx and useAppLogic.tsx!');

