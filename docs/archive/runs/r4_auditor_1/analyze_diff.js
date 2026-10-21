const fs = require('fs');
const path = require('path');

const diffText = fs.readFileSync(path.join(__dirname, 'diff.patch'), 'utf8');

const fileDiffs = diffText.split(/^diff --git /m).filter(Boolean);

console.log(`Total file diffs: ${fileDiffs.length}`);

let totalAddedLines = 0;
let totalRemovedLines = 0;
const suspiciousPatterns = [
  /return\s+(true|false|null|""|''|\[\]|\{\}|0);?\s*$/m,
  /catch\s*\([^)]*\)\s*\{\s*\}/m,
  /hardcoded|fake|mock|dummy|placeholder/i
];

const changesPerFile = [];

for (const fdiff of fileDiffs) {
  const lines = fdiff.split('\n');
  const fileHeader = lines[0];
  const match = fileHeader.match(/b\/(apps\/web\/src\/[^\s]+)/);
  const filePath = match ? match[1] : fileHeader;

  const added = [];
  const removed = [];

  for (const line of lines) {
    if (line.startsWith('+') && !line.startsWith('+++')) {
      added.push(line.substring(1));
    } else if (line.startsWith('-') && !line.startsWith('---')) {
      removed.push(line.substring(1));
    }
  }

  totalAddedLines += added.length;
  totalRemovedLines += removed.length;

  changesPerFile.push({
    filePath,
    addedCount: added.length,
    removedCount: removed.length,
    added,
    removed
  });
}

console.log(`Summary: ${changesPerFile.length} files changed, +${totalAddedLines} / -${totalRemovedLines}`);

fs.writeFileSync(
  path.join(__dirname, 'diff_summary.json'),
  JSON.stringify(changesPerFile, null, 2)
);
