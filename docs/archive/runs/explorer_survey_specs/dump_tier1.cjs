const fs = require('fs');
const content = fs.readFileSync('C:/Clinic_MVP/dental-crm/apps/api/src/tests/e2e/tier1-feature-coverage.test.ts', 'utf8');
const lines = content.split('\n');
lines.forEach((line, idx) => {
    const trimmed = line.trim();
    if (trimmed.startsWith('describe(') || trimmed.startsWith('it(')) {
        console.log(`L${idx + 1}: ${trimmed.substring(0, 100)}`);
    }
});
