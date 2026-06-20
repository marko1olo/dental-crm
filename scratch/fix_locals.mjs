import fs from 'fs';

const settingsViewContent = fs.readFileSync('C:/Clinic_MVP/dental-crm/apps/web/src/SettingsView.tsx', 'utf8');
const lines = settingsViewContent.split(/\r?\n/);
const idx = lines.findIndex(l => l.includes('export function SettingsView('));
// Find the last `  return (` before line 2000
let mainReturnIdx = -1;
for (let i = 0; i < lines.length; i++) {
  if (lines[i].match(/^  return \(/)) {
    mainReturnIdx = i;
  }
}

console.log(`Main return at ${mainReturnIdx}`);

// The correct locals block is from right after the massive destruct block to mainReturnIdx
let destructEndIdx = -1;
for (let i = idx; i < mainReturnIdx; i++) {
  if (lines[i].trim() === '} = props;') {
    destructEndIdx = i;
    break;
  }
}

const correctLocalsBlock = lines.slice(destructEndIdx + 1, mainReturnIdx).join('\n');

const tabs = [
  "SettingsClinicTab", "SettingsAccessTab", "SettingsTelegramTab", "SettingsProtocolsTab", 
  "SettingsRulesTab", "SettingsPricesTab", "SettingsSourcesTab", "SettingsAiTab", 
  "SettingsImportsTab", "SettingsAuditTab"
];

for (const tab of tabs) {
  const filePath = `C:/Clinic_MVP/dental-crm/apps/web/src/settings/${tab}.tsx`;
  if (fs.existsSync(filePath)) {
    let content = fs.readFileSync(filePath, 'utf8');
    
    // Find the end of the destructuring block in the tab
    const destructEndTabIdx = content.indexOf('  } = props;\n');
    const returnTabIdx = content.lastIndexOf('  return (\n');
    
    if (destructEndTabIdx !== -1 && returnTabIdx !== -1) {
      const newContent = content.substring(0, destructEndTabIdx + 13) + '\n' + correctLocalsBlock + '\n' + content.substring(returnTabIdx);
      fs.writeFileSync(filePath, newContent);
      console.log(`Fixed locals in ${tab}`);
    }
  }
}
