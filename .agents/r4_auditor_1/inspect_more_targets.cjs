const fs = require('fs');
const path = require('path');

const chunksDir = path.join(__dirname, 'diff_chunks');
const files = fs.readdirSync(chunksDir);

const targets = [
  'AppointmentCard.tsx',
  'SettingsClinicTab.tsx',
  'MessageDeliveryConsole.tsx',
  'SettingsImportsTab.tsx',
  'LostPatientsPanel.tsx',
  'ManagerReportsPanel.tsx',
  'ctPlanningExportPanel.tsx',
  'ctPlanningImplantModelPanel.tsx'
];

for (const target of targets) {
  const file = files.find(f => f.includes(target));
  if (file) {
    console.log(`================================================================================`);
    console.log(`TARGET FILE: ${target} (${file})`);
    console.log(`================================================================================`);
    const content = fs.readFileSync(path.join(chunksDir, file), 'utf8');
    console.log(content);
    console.log('\n');
  }
}
