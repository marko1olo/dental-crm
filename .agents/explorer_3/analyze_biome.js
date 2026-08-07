const fs = require('fs');
const path = require('path');

const reportPath = path.join(__dirname, 'biome_report.json');
const report = JSON.parse(fs.readFileSync(reportPath, 'utf8'));

const errors = [];
const warnings = [];

if (report.diagnostics) {
    for (const diag of report.diagnostics) {
        const severity = diag.severity;
        const category = diag.category;
        const file = diag.location && diag.location.path ? diag.location.path.file : 'unknown';
        const line = diag.location && diag.location.span ? diag.location.span[0] : 0;
        const message = diag.description || (diag.message && diag.message.map(m => m.content).join('')) || '';

        const item = { category, file, line, message, severity };

        if (severity === 'error') {
            errors.push(item);
        } else if (severity === 'warning') {
            warnings.push(item);
        }
    }
}

console.log(`Total errors: ${errors.length}`);
console.log(`Total warnings: ${warnings.length}`);

console.log('\n--- ERRORS SUMMARY BY CATEGORY ---');
const errorCatMap = {};
for (const e of errors) {
    errorCatMap[e.category] = (errorCatMap[e.category] || 0) + 1;
}
console.log(JSON.stringify(errorCatMap, null, 2));

console.log('\n--- DETAILED ERRORS ---');
for (const e of errors) {
    console.log(`${e.file} - Category: ${e.category} - ${e.message}`);
}

console.log('\n--- WARNINGS SUMMARY BY CATEGORY ---');
const warnCatMap = {};
for (const w of warnings) {
    warnCatMap[w.category] = (warnCatMap[w.category] || 0) + 1;
}
console.log(JSON.stringify(warnCatMap, null, 2));
