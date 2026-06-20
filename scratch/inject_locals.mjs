import fs from 'fs';

const settingsViewContent = fs.readFileSync('C:/Clinic_MVP/dental-crm/apps/web/src/SettingsView.tsx', 'utf8');
const lines = settingsViewContent.split(/\r?\n/);
const idx = lines.findIndex(l => l.includes('export function SettingsView('));
const startJSX = lines.findIndex(l => l.match(/^  return \(/));

const localsBlock = lines.slice(idx, startJSX).filter(l => !l.includes('const {') && !l.includes('} = props;')).join('\n');

const tabs = [
  "SettingsClinicTab", "SettingsAccessTab", "SettingsTelegramTab", "SettingsProtocolsTab", 
  "SettingsRulesTab", "SettingsPricesTab", "SettingsSourcesTab", "SettingsAiTab", 
  "SettingsImportsTab", "SettingsAuditTab"
];

for (const tab of tabs) {
  const filePath = `C:/Clinic_MVP/dental-crm/apps/web/src/settings/${tab}.tsx`;
  if (fs.existsSync(filePath)) {
    let content = fs.readFileSync(filePath, 'utf8');
    // find "return ("
    const returnIdx = content.indexOf('  return (\n');
    if (returnIdx !== -1) {
      const newContent = content.substring(0, returnIdx) + '\n' + localsBlock + '\n' + content.substring(returnIdx);
      fs.writeFileSync(filePath, newContent);
      console.log(`Injected locals into ${tab}`);
    }
  }
}
