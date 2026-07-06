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

const replacement = '<SettingsSourcesTab settingsTab={settingsTab} props={props} />\n\n';

let newContent = content.substring(0, startIndex) + replacement + content.substring(endIndex);

// Add import at the top
if (!newContent.includes('SettingsSourcesTab')) {
    const importStr = 'import { SettingsSourcesTab } from "./components/settings/SettingsSourcesTab";\n';
    newContent = importStr + newContent;
}

fs.writeFileSync(path, newContent);
console.log("Patched SettingsView.tsx");
