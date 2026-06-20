import { Project, SyntaxKind } from 'ts-morph';

const project = new Project();
const sourceFile = project.addSourceFileAtPath('../apps/web/src/App.tsx');

const appFunction = sourceFile.getFunction('App');
if (!appFunction) {
  console.log("App function not found");
  process.exit(1);
}

const blocks = [];

appFunction.getVariableStatements().forEach(v => {
  blocks.push({
    type: 'Variable',
    name: v.getDeclarations()[0].getName(),
    lines: v.getEndLineNumber() - v.getStartLineNumber() + 1
  });
});

appFunction.getFunctions().forEach(f => {
  blocks.push({
    type: 'Function',
    name: f.getName() || 'anonymous',
    lines: f.getEndLineNumber() - f.getStartLineNumber() + 1
  });
});

const returnStatement = appFunction.getStatements().find(s => s.getKind() === SyntaxKind.ReturnStatement);
if (returnStatement) {
  blocks.push({
    type: 'ReturnStatement',
    name: 'Main JSX Return',
    lines: returnStatement.getEndLineNumber() - returnStatement.getStartLineNumber() + 1
  });
}

blocks.sort((a, b) => b.lines - a.lines);

console.log("Top 20 largest blocks in App():");
blocks.slice(0, 20).forEach(b => console.log(`${b.type} ${b.name}: ${b.lines} lines`));
