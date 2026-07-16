const fs = require('fs');

const viewPath = 'apps/web/src/SettingsView.tsx';
let viewContent = fs.readFileSync(viewPath, 'utf8');

const sourceRegex = /\{settingsTab === "sources" \? \([\s\S]*?\n\t\t\t\t\) : null\}/g;
const matches = viewContent.match(sourceRegex);

if (matches && matches.length > 0) {
    fs.writeFileSync('sources_blocks.txt', matches.join('\n\n'), 'utf8');
    console.log(`Found ${matches.length} source blocks`);
} else {
    console.log("No sources block found");
}

const aiRegex = /\{settingsTab === "ai" \? \([\s\S]*?\n\t\t\t\t\) : null\}/g;
const aiMatches = viewContent.match(aiRegex);

if (aiMatches && aiMatches.length > 0) {
    fs.writeFileSync('ai_blocks.txt', aiMatches.join('\n\n'), 'utf8');
    console.log(`Found ${aiMatches.length} AI blocks`);
} else {
    console.log("No AI block found");
}
