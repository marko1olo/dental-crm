const fs = require('fs');
const lines = fs.readFileSync('apps/web/src/SettingsView.tsx', 'utf8').split('\n');
let balance = 0;
let startLine = -1;
let endLine = -1;
for (let i = 0; i < lines.length; i++) {
    if (lines[i].includes('{settingsTab === "prices" ? (')) {
        startLine = i;
    }
    if (startLine !== -1 && i >= startLine) {
        const line = lines[i];
        const opens = (line.match(/<section/g) || []).length;
        const closes = (line.match(/<\/section>/g) || []).length;
        balance += opens;
        balance -= closes;
        if (balance === 0 && opens === 0 && closes > 0) {
            endLine = i;
            break;
        }
    }
}
console.log('Start line:', startLine + 1, 'End line:', endLine + 1, 'Total lines:', endLine - startLine);
