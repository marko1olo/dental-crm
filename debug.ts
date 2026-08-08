import { Project, SyntaxKind } from "ts-morph";
const project = new Project({ tsConfigFilePath: "apps/web/tsconfig.json" });
const sourceFile = project.getSourceFileOrThrow("apps/web/src/useSettingsDerivations.tsx");
const variableDeclarations = sourceFile.getDescendantsOfKind(SyntaxKind.VariableDeclaration);
for (const varDecl of variableDeclarations) {
  const initializer = varDecl.getInitializer();
  if (initializer && initializer.getKind() === SyntaxKind.Identifier) {
    if (initializer.getText() === "appLogic") {
       console.log("FOUND APPLOGIC INITIALIZER: ", varDecl.getText().substring(0, 50));
       const nameNode = varDecl.getNameNode();
       console.log("NameNode Kind: ", nameNode.getKindName());
    }
  }
}
