const fs = require('fs');
const lines = fs.readFileSync('apps/web/src/SettingsView.tsx', 'utf8').split('\n');
const returnIdx = lines.findIndex(l => l.includes('return ('));
for (let i = returnIdx; i < lines.length; i++) {
    const m = lines[i].match(/\{settingsTab === "([^"]+)" \? \(/);
    if (m) console.log(m[1], 'at line', i+1);
}
