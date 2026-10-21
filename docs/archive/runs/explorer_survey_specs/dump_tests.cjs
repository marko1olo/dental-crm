const fs = require('fs');
const path = require('path');

const dir = 'C:/Clinic_MVP/dental-crm/apps/api/src/tests/e2e';
const files = fs.readdirSync(dir).filter(f => f.startsWith('tier'));

for (const file of files) {
    console.log(`\n========================================`);
    console.log(`FILE: ${file}`);
    console.log(`========================================`);
    const content = fs.readFileSync(path.join(dir, file), 'utf8');
    const lines = content.split('\n');
    lines.forEach((line, idx) => {
        const trimmed = line.trim();
        if (trimmed.startsWith('describe(') || trimmed.startsWith('it(')) {
            console.log(`L${idx + 1}: ${trimmed.substring(0, 100)}`);
        }
    });
}
