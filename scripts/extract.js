const fs = require("fs");

const path = "apps/web/src/SettingsView.tsx";
const content = fs.readFileSync(path, "utf8");

const startStr = '{settingsTab === "sources" ? (';
const endStr = '          {settingsTab === "ai" ? (';

const startIndex = content.indexOf(startStr);
const endIndex = content.indexOf(endStr);

if (startIndex === -1 || endIndex === -1) {
	console.error("Could not find start or end index");
	process.exit(1);
}

// Extract the JSX block (up to the last closing parenthesis/null check before the AI tab)
const block = content.substring(startIndex, endIndex);

// It ends with:
//           ) : null}
//
//           {settingsTab === "ai" ? (
// So we want to replace the whole block with <SettingsSourcesTab {...props} />
// but keep the whitespace.

const replacement =
	'{settingsTab === "sources" ? <SettingsSourcesTab props={props} /> : null}\n\n';

const newContent =
	content.substring(0, startIndex) + replacement + content.substring(endIndex);

fs.writeFileSync(path, newContent);
fs.writeFileSync("scripts/extracted_block.tsx", block);

console.log("Extracted block of length " + block.length);
