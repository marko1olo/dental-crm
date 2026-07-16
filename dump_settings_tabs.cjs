const fs = require('fs');
let content = fs.readFileSync('apps/web/src/SettingsView.tsx', 'utf8');

// PRICES
let startIdx = content.indexOf('{settingsTab === "prices" ? (\n\t\t\t\t\t<section\n\t\t\t\t\t\tclassName="pricelist-studio"');
let endIdx = content.indexOf('\t\t\t\t) : null}\n\n\t\t\t\t{settingsTab === "sources" ? (');

if (startIdx === -1 || endIdx === -1) {
    console.log('Not found prices boundaries');
} else {
    let finalJSX = content.substring(startIdx + '{settingsTab === "prices" ? (\n'.length, endIdx + '\t\t\t\t) : null}\n'.length);
    fs.writeFileSync('prices_block.txt', finalJSX, 'utf8');
}

// SOURCES
startIdx = content.indexOf('{settingsTab === "sources" ? (\n\t\t\t\t\t<section\n\t\t\t\t\t\tclassName="settings-studio"');
endIdx = content.indexOf('\t\t\t\t) : null}\n\n\t\t\t\t{settingsTab === "ai" ? (');

if (startIdx === -1 || endIdx === -1) {
    console.log('Not found sources boundaries');
} else {
    let finalJSX = content.substring(startIdx + '{settingsTab === "sources" ? (\n'.length, endIdx + '\t\t\t\t) : null}\n'.length);
    fs.writeFileSync('sources_block.txt', finalJSX, 'utf8');
}

// AI
startIdx = content.indexOf('{settingsTab === "ai" ? (\n\t\t\t\t\t<section\n\t\t\t\t\t\tclassName="settings-studio"');
endIdx = content.indexOf('\t\t\t\t) : null}\n\n\t\t\t\t{settingsTab === "clinic" ? (');

if (startIdx === -1 || endIdx === -1) {
    console.log('Not found ai boundaries');
} else {
    let finalJSX = content.substring(startIdx + '{settingsTab === "ai" ? (\n'.length, endIdx + '\t\t\t\t) : null}\n'.length);
    fs.writeFileSync('ai_block.txt', finalJSX, 'utf8');
}

console.log('Blocks dumped!');
