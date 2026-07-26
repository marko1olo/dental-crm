const fs = require('fs');
const path = require('path');

const srcDir = path.join(__dirname, '..', 'screenshots');
const targetDirs = [
  'C:\\Clinic_MVP\\screenshots',
  'C:\\Clinic_MVP\\dental-crm\\screenshots',
  'C:\\Clinic_MVP\\dental-crm\\apps\\web\\screenshots',
  'C:\\Clinic_MVP\\dental-crm\\artifacts\\screenshots',
  'C:\\Clinic_MVP\\dental-crm\\.data\\screenshots'
];

const files = fs.readdirSync(srcDir);
console.log(`Source directory has ${files.length} files.`);

for (const targetDir of targetDirs) {
  if (!fs.existsSync(targetDir)) {
    fs.mkdirSync(targetDir, { recursive: true });
  }
  for (const file of files) {
    const srcFile = path.join(srcDir, file);
    const destFile = path.join(targetDir, file);
    fs.copyFileSync(srcFile, destFile);
  }
  console.log(`Successfully synced ${files.length} files to ${targetDir}`);
}

console.log("ALL screenshots folders synchronized with latest 12:08 captures.");
