import { Project, SyntaxKind } from "ts-morph";
import * as fs from "fs";

// Define the path to your tsconfig.json
const TSCONFIG_PATH = "apps/web/tsconfig.json";

// Read dead properties from file
const deadPropsFile = fs.readFileSync("dead_props.txt", "utf8");
const DEAD_PROPERTIES = new Set(deadPropsFile.split("\n").map(s => s.trim()).filter(s => s.length > 0));

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
      
      let isTarget = false;

      if (initializer) {
        if (initializer.getKind() === SyntaxKind.CallExpression) {
            const expression = initializer.asKindOrThrow(SyntaxKind.CallExpression).getExpression();
            if (expression.getKind() === SyntaxKind.Identifier && (expression.getText() === "useAppLogicContext" || expression.getText() === "useAppLogic")) {
                isTarget = true;
            }
        } else if (initializer.getKind() === SyntaxKind.Identifier) {
            const text = initializer.getText();
            if (text === "appLogic" || text === "ctx" || text === "appLogicValue" || text === "context") {
                isTarget = true;
            }
        }
      }
      
      if (isTarget) {
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

    if (fileModified) {
      filesModified++;
      await sourceFile.save();
    }
  }

  console.log(`\nFinished analysis.`);
  console.log(`Files modified: ${filesModified}`);
  console.log(`Total properties removed: ${totalRemoved}`);
}

main().catch(console.error);
