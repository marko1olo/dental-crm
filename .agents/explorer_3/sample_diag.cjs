const fs = require('fs');
const path = require('path');

const reportPath = path.join(__dirname, 'biome_report.json');
let content;
const raw = fs.readFileSync(reportPath);
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

console.log('Sample diagnostic:');
const sample = report.diagnostics.find(d => d.severity === 'error');
console.log(JSON.stringify(sample, null, 2));
