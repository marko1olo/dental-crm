const fs = require('fs');
let content = fs.readFileSync('apps/web/src/SettingsView.tsx', 'utf8');

const startIdx = content.indexOf('{settingsTab === "rules" ? (\n\t\t\t\t\t<section\n\t\t\t\t\t\tclassName="rule-studio"');
const endIdx = content.indexOf('\t\t\t\t) : null}\n\n\t\t\t\t{settingsTab === "prices" ? (');

if (startIdx === -1 || endIdx === -1) {
    console.log('Not found boundaries', startIdx, endIdx);
    process.exit(1);
}

const finalJSX = content.substring(startIdx + '{settingsTab === "rules" ? (\n'.length, endIdx + '\t\t\t\t) : null}\n'.length);

console.log('Final length:', finalJSX.length);
fs.writeFileSync('rules_block.txt', finalJSX, 'utf8');
