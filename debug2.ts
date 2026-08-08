import { Project, SyntaxKind } from "ts-morph";
const project = new Project({ tsConfigFilePath: "apps/web/tsconfig.json" });
const sourceFile = project.getSourceFileOrThrow("apps/web/src/useSettingsDerivations.tsx");
const variableDeclarations = sourceFile.getDescendantsOfKind(SyntaxKind.VariableDeclaration);
for (const varDecl of variableDeclarations) {
  const nameNode = varDecl.getNameNode();
  if (nameNode.getKind() === SyntaxKind.ObjectBindingPattern) {
    const initializer = varDecl.getInitializer();
    if (initializer) {
      console.log("ObjectBindingPattern Initializer text: ", initializer.getText());
      console.log("ObjectBindingPattern Initializer kind: ", initializer.getKindName());
    }
  }
}
