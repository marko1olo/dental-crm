const fs = require('node:fs');
const path = require('node:path');

const dirs = ['cardsStyles', 'drawerStyles', 'hudStyles'];
let violations = 0;
let totalFiles = 0;

for (const dir of dirs) {
  const fullDir = path.resolve(__dirname, '../apps/web/src/components/copilot', dir);
  if (!fs.existsSync(fullDir)) continue;
  const files = fs.readdirSync(fullDir).filter((f) => f.endsWith('.css'));
  for (const f of files) {
    totalFiles++;
    const content = fs.readFileSync(path.join(fullDir, f), 'utf8');
    const lines = content.split('\n').length;
    if (lines > 120) {
      console.log(`VIOLATION: ${dir}/${f} -> ${lines} lines`);
      violations++;
    }
  }
}

const facades = ['CopilotGenerativeCards.css', 'CopilotDrawer.css', 'ChairsideCopilotHUD.css'];
for (const f of facades) {
  const fullPath = path.resolve(__dirname, '../apps/web/src/components/copilot', f);
  const content = fs.readFileSync(fullPath, 'utf8');
  const lines = content.split('\n').length;
  console.log(`FACADE: ${f} -> ${lines} lines`);
  if (lines > 120) {
    console.log(`VIOLATION: ${f} -> ${lines} lines`);
    violations++;
  }
}

console.log(`TOTAL MODULAR FILES: ${totalFiles}, VIOLATIONS: ${violations}`);
if (violations > 0) process.exit(1);
