const fs = require('fs');
const path = require('path');

const report = JSON.parse(fs.readFileSync(path.join(__dirname, 'diff_blocks_report.json'), 'utf8'));

const outDir = path.join(__dirname, 'diff_chunks');
if (!fs.existsSync(outDir)) {
  fs.mkdirSync(outDir, { recursive: true });
}

let fileIdx = 0;
for (const item of report) {
  fileIdx++;
  const safeName = item.filePath.replace(/[\/\\]/g, '_');
  const filename = `${String(fileIdx).padStart(2, '0')}_${safeName}.txt`;
  fs.writeFileSync(path.join(outDir, filename), item.block, 'utf8');
}

console.log(`Saved ${fileIdx} file diffs to ${outDir}`);
