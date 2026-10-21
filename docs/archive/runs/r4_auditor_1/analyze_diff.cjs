const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const diffText = execSync('git diff apps/web/src/', { encoding: 'utf8', maxBuffer: 50 * 1024 * 1024 });

fs.writeFileSync(path.join(__dirname, 'diff.patch'), diffText, 'utf8');

const diffBlocks = diffText.split(/(?:^|\n)diff --git /).filter(Boolean);

console.log(`Total file diffs: ${diffBlocks.length}`);

let totalAddedLines = 0;
let totalRemovedLines = 0;

const changesPerFile = [];

for (const fdiff of diffBlocks) {
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
  JSON.stringify(changesPerFile, null, 2),
  'utf8'
);
