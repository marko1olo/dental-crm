const fs = require('fs');
const path = require('path');

const utilsDir = path.join(__dirname, 'apps/web/src/utils');
const files = fs.readdirSync(utilsDir).filter(f => f.endsWith('Helpers.ts'));

const modulesToFix = [
  'browserScanUtils',
  'clinicProfileUtils',
  'dateTimeUtils',
  'localStorageHelpers',
  'routeUtils',
  'preferencesUtils',
  'financeUtils',
  'logger',
  'dateUtils',
  'draftDefaults'
];

files.forEach(file => {
    const filePath = path.join(utilsDir, file);
    let content = fs.readFileSync(filePath, 'utf8');

    // Fix double-replaced relative paths
    modulesToFix.forEach(mod => {
        const regex = new RegExp(`from\\s+["']\\.\\.\\/${mod}["']`, 'g');
        content = content.replace(regex, `from "./${mod}"`);
    });

    // Fix duplicate 'money' and 'moneyUnknownLabel' in PatientHelpers
    if (file === 'PatientHelpers.ts') {
       // It seems the re-export block got copied. Let's just remove the exact lines if they are duplicates.
       // Actually, easier to just let ts-morph or regex remove it, but let's just strip 'export { money, moneyUnknownLabel };'
       content = content.replace(/export\s*\{\s*money,\s*moneyUnknownLabel\s*\}\s*;/g, '');
       content = content.replace(/import\s*\{\s*money,\s*moneyUnknownLabel\s*\}\s*from\s*["'].*?financeUtils["']\s*;/g, '');
    }

    fs.writeFileSync(filePath, content);
});

console.log("Cleanup complete.");
