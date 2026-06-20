import { Project, SyntaxKind } from 'ts-morph';

const project = new Project();
const sourceFile = project.addSourceFileAtPath('C:/Clinic_MVP/dental-crm/apps/web/src/SettingsView.tsx');

const blocks = [];

sourceFile.getVariableStatements().forEach(v => {
  blocks.push({
    type: 'Variable',
    name: v.getDeclarations()[0].getName(),
    lines: v.getEndLineNumber() - v.getStartLineNumber() + 1
  });
});

sourceFile.getFunctions().forEach(f => {
  blocks.push({
    type: 'Function',
    name: f.getName() || 'anonymous',
    lines: f.getEndLineNumber() - f.getStartLineNumber() + 1
  });
});

blocks.sort((a, b) => b.lines - a.lines);

console.log("Top 10 largest blocks in SettingsView.tsx:");
blocks.slice(0, 10).forEach(b => console.log(`${b.type} ${b.name}: ${b.lines} lines`));
