const fs = require('fs');
const path = require('path');

const reportPath = path.join(__dirname, 'biome_report.json');
const raw = fs.readFileSync(reportPath);
let content;
if (raw[0] === 0xff && raw[1] === 0xfe) {
    content = raw.toString('utf16le').replace(/^\uFEFF/, '');
} else {
    content = raw.toString('utf8').replace(/^\uFEFF/, '');
}

const jsonStart = content.indexOf('{');
if (jsonStart !== -1) {
    content = content.substring(jsonStart);
}

const report = JSON.parse(content);

const errors = [];
const warnings = [];

if (report.diagnostics) {
    for (const diag of report.diagnostics) {
        const severity = diag.severity;
        const category = diag.category;
        const file = diag.location && diag.location.path ? diag.location.path : 'unknown';
        const line = diag.location && diag.location.start ? diag.location.start.line : 0;
        const col = diag.location && diag.location.start ? diag.location.start.column : 0;
        const message = diag.description || (typeof diag.message === 'string' ? diag.message : (diag.message && diag.message.map ? diag.message.map(m => m.content).join('') : ''));

        const item = { category, file, line, col, message, severity };

        if (severity === 'error') {
            errors.push(item);
        } else if (severity === 'warning') {
            warnings.push(item);
        }
    }
}

console.log(`Total errors: ${errors.length}`);
console.log(`Total warnings: ${warnings.length}`);

console.log('\n--- DETAILED ERRORS (40 TOTAL) ---');
errors.forEach((e, idx) => {
    console.log(`${idx + 1}. [${e.category}] ${e.file}:${e.line}:${e.col} - ${e.message}`);
});
