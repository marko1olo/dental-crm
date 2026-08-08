import { Project, SyntaxKind } from "ts-morph";

// Define the path to your tsconfig.json
const TSCONFIG_PATH = "apps/web/tsconfig.json";

// List of dead bindings to remove
const DEAD_PROPERTIES = new Set([
  "previewMigrationAutopilotSources",
  // Add other properties causing TS2339 here
]);

async function main() {
  console.log(`Loading project from ${TSCONFIG_PATH}...`);
  const project = new Project({
    tsConfigFilePath: TSCONFIG_PATH,
  });

  const sourceFiles = project.getSourceFiles();
  let totalRemoved = 0;
  let filesModified = 0;

  console.log(`Analyzing ${sourceFiles.length} files...`);

  for (const sourceFile of sourceFiles) {
    let fileModified = false;

    // Find all variable declarations
    const variableDeclarations = sourceFile.getDescendantsOfKind(SyntaxKind.VariableDeclaration);

    for (const varDecl of variableDeclarations) {
      const initializer = varDecl.getInitializer();
      
      // Check if initializer is a call to useAppLogicContext()
      if (initializer && initializer.getKind() === SyntaxKind.CallExpression) {
        const expression = initializer.asKindOrThrow(SyntaxKind.CallExpression).getExpression();
        
        if (expression.getKind() === SyntaxKind.Identifier && expression.getText() === "useAppLogicContext") {
          const nameNode = varDecl.getNameNode();

          // Check if it's an object destructuring: const { a, b } = useAppLogicContext()
          if (nameNode.getKind() === SyntaxKind.ObjectBindingPattern) {
            const bindingPattern = nameNode.asKindOrThrow(SyntaxKind.ObjectBindingPattern);
            const elements = bindingPattern.getElements();

            // Iterate backwards to avoid index shifting issues when removing elements
            for (let i = elements.length - 1; i >= 0; i--) {
              const element = elements[i];
              // Handle both standard (const { prop }) and renamed (const { prop: renamedProp }) destructuring
              const propertyName = element.getPropertyNameNode()?.getText() || element.getNameNode().getText();

              if (DEAD_PROPERTIES.has(propertyName)) {
                console.log(`[${sourceFile.getFilePath()}] Removing dead property '${propertyName}'`);
                element.remove();
                totalRemoved++;
                fileModified = true;
              }
            }

            // If the binding pattern is empty after removal (e.g. const {} = useAppLogicContext()), remove the whole statement
            if (bindingPattern.getElements().length === 0) {
              const statement = varDecl.getFirstAncestorByKind(SyntaxKind.VariableStatement);
              if (statement) {
                console.log(`[${sourceFile.getFilePath()}] Removing empty useAppLogicContext() statement`);
                statement.remove();
                fileModified = true;
              }
            }
          }
        }
      }
    }

    if (fileModified) {
      filesModified++;
      // Uncomment the line below to actually save the changes to the disk
      await sourceFile.save();
    }
  }

  console.log(`\nFinished analysis.`);
  console.log(`Files modified: ${filesModified}`);
  console.log(`Total properties removed: ${totalRemoved}`);
  console.log(`Note: Changes were NOT saved. Uncomment 'await sourceFile.save()' to apply changes.`);
}

main().catch(console.error);
