const fs = require('fs');
const code = fs.readFileSync('C:/Clinic_MVP/dental-crm/apps/web/src/App.tsx', 'utf8');
const lines = code.split('\n');
const importLines = lines.filter(l => l.startsWith('import ') && (l.includes('isDateInputValue') || l.includes('normalizeRubAmountInput')));
console.log(importLines.join('\n'));
