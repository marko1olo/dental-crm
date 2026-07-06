const fs = require('fs');

const path = 'apps/web/src/SettingsView.tsx';
let content = fs.readFileSync(path, 'utf8');

const startStr = '{settingsTab === "sources" ? (';
const endStr = '          {settingsTab === "ai" ? (';

const startIndex = content.indexOf(startStr);
const endIndex = content.indexOf(endStr);

if (startIndex === -1 || endIndex === -1) {
    console.error("Could not find start or end index");
    process.exit(1);
}

let block = content.substring(startIndex, endIndex);

const replacement = '{settingsTab === "sources" ? <SettingsSourcesTab props={props} /> : null}\n\n';

const newContent = content.substring(0, startIndex) + replacement + content.substring(endIndex);

fs.writeFileSync(path, newContent);
fs.writeFileSync('scripts/extracted_block.tsx', block);

console.log("Extracted block of length " + block.length);
