const { Project, SyntaxKind } = require("ts-morph");
const project = new Project();

// Add files
project.addSourceFilesAtPaths([
    "apps/web/src/*View.tsx"
]);

let count = 0;

for (const sourceFile of project.getSourceFiles()) {
    let fileChanged = false;
    const propAccesses = sourceFile.getDescendantsOfKind(SyntaxKind.PropertyAccessExpression);
    
    // We want to process them in reverse order to avoid breaking offsets
    const toProcess = propAccesses.filter(p => {
        if (p.getName() !== "map") return false;
        if (p.hasQuestionDotToken()) return false;
        
        // Ensure it's part of a CallExpression
        const parent = p.getParent();
        if (parent && parent.getKind() === SyntaxKind.CallExpression) {
            return true;
        }
        return false;
    }).reverse();

    for (const p of toProcess) {
        if (count >= 20) break;
        const expr = p.getExpression().getText();
        p.replaceWithText(`${expr}?.map`);
        fileChanged = true;
        count++;
    }

    if (fileChanged) {
        sourceFile.saveSync();
        console.log(`Patched unprotected .map in: ${sourceFile.getFilePath()}`);
    }
    
    if (count >= 20) break;
}

console.log(`Patched ${count} instances.`);
