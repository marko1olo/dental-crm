const fs = require('fs');
const parser = require('@babel/parser');
const traverse = require('@babel/traverse').default;

const appPath = 'C:/Clinic_MVP/dental-crm/apps/web/src/App.tsx';
const code = fs.readFileSync(appPath, 'utf8');

// The file has // @ts-nocheck at the top which might cause issues or maybe not.
// We parse the file with babel
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

// Find the main return statement of App()
const body = appFunctionNode.body.body;
const returnStatement = body[body.length - 1];

if (returnStatement.type !== 'ReturnStatement') {
    console.error('Last statement of App() is not a return statement');
    process.exit(1);
}

const logicNodes = body.slice(0, body.length - 1);
const logicStart = logicNodes[0].start;
const logicEnd = logicNodes[logicNodes.length - 1].end;

const returnStart = returnStatement.start;
const returnEnd = returnStatement.end;

const logicString = code.substring(logicStart, logicEnd);
const jsxString = code.substring(returnStart, returnEnd);

// Now we need to find all variables that are referenced in jsxString but declared in logicString.
// The easiest way is to parse the JSX string as a function, and see what identifiers are unbound!
const wrappedJsx = `function Dummy() { ${jsxString} }`;
const jsxAst = parser.parse(wrappedJsx, {
    sourceType: 'module',
    plugins: ['typescript', 'jsx']
});

const referencedVars = new Set();
traverse(jsxAst, {
    Identifier(path) {
        // If this identifier is a reference to a variable, and it is NOT bound within the Dummy function scope
        if (path.isReferencedIdentifier() && !path.scope.hasBinding(path.node.name)) {
            referencedVars.add(path.node.name);
        }
    },
    JSXIdentifier(path) {
        // If it's used as a JSX element <MyComponent>
        if (path.parent.type === 'JSXOpeningElement' && path.parent.name === path.node) {
             // It's a component reference! Only if it starts with uppercase (convention)
             if (/^[A-Z]/.test(path.node.name)) {
                 if (!path.scope.hasBinding(path.node.name)) {
                     referencedVars.add(path.node.name);
                 }
             }
        }
        // If it's a property on an object <Foo.Bar> we only care about Foo, which is handled by Identifier visitor above usually.
    }
});

// Also remove globals from the list (React, console, window, etc.)
const globals = ['window', 'document', 'console', 'React', 'setTimeout', 'setInterval', 'clearTimeout', 'clearInterval', 'undefined', 'NaN', 'Math', 'Date'];
globals.forEach(g => referencedVars.delete(g));

const varsArray = Array.from(referencedVars).sort();
console.log('Variables to return from useAppLogic:', varsArray.length);

const returnedVarsString = varsArray.join(',\n    ');

const hookCode = `// @ts-nocheck
import React, { useState, useEffect, useCallback, useMemo, useRef, Suspense, lazy } from "react";
// Import all stores just to be safe
import { useAppStore } from "../store/appStore";
import { useDocumentStore } from "../store/documentStore";
import { useImagingStore } from "../store/imagingStore";
import { usePatientStore } from "../store/patientStore";
import { useScheduleStore } from "../store/scheduleStore";
import { useVisitStore } from "../store/visitStore";
import { useSettingsStore } from "../store/settingsStore";
// In real life we'd import the exact helpers from AppHelpers, etc.
// For this script, we'll just prepend all imports from App.tsx

${logicString}

  return {
    ${returnedVarsString}
  };
}
`;

fs.writeFileSync('C:/Clinic_MVP/dental-crm/scratch/useAppLogic_draft.ts', hookCode);
fs.writeFileSync('C:/Clinic_MVP/dental-crm/scratch/jsx_vars.json', JSON.stringify(varsArray, null, 2));
console.log('Drafted useAppLogic');

