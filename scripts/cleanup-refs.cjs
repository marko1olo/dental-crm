const fs = require('fs');
const tsMorph = require('ts-morph');

const project = new tsMorph.Project();
const sourceFile = project.addSourceFileAtPath('apps/web/src/useAppLogic.tsx');

let removedCount = 0;

// Find all variable declarations inside useAppLogic
const appLogicHook = sourceFile.getFunction('useAppLogic');
if (appLogicHook) {
    const varDecls = appLogicHook.getVariableDeclarations();
    for (const decl of varDecls) {
        const name = decl.getName();
        // Check how many times this name is used inside the entire source file.
        // We can do a simple text match. If it only appears once (its own declaration), it's dead.
        const fileText = sourceFile.getFullText();
        const regex = new RegExp(`\\b${name}\\b`, 'g');
        const matches = fileText.match(regex) || [];
        
        // Wait, destructuring arrays like const [foo, setFoo] = useState() have elements that are BindingElements, not full VariableDeclarations.
        // But for `const ref = useRef()`, decl is a VariableDeclaration.
        if (matches.length === 1) {
            console.log(`Removing orphaned variable: ${name}`);
            const stmt = decl.getFirstAncestorByKind(tsMorph.SyntaxKind.VariableStatement);
            if (stmt) {
                stmt.remove();
                removedCount++;
            }
        }
    }
}

sourceFile.saveSync();
console.log(`Removed ${removedCount} orphaned variables.`);
