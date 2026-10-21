const fs = require('fs');
const path = require('path');

const diffText = fs.readFileSync(path.join(__dirname, 'diff.patch'), 'utf8');

const diffBlocks = diffText.split(/(?:^|\n)diff --git /).filter(Boolean);

console.log(`Processing ${diffBlocks.length} diff blocks...`);

const report = [];

for (const block of diffBlocks) {
  const lines = block.split('\n');
  const header = lines[0];
  const fileMatch = header.match(/b\/(apps\/web\/src\/[^\s]+)/);
  const filePath = fileMatch ? fileMatch[1] : 'unknown';

  const addedLines = lines.filter(l => l.startsWith('+') && !l.startsWith('+++'));
  const removedLines = lines.filter(l => l.startsWith('-') && !l.startsWith('---'));

  // Check suspicious things:
  // 1. Is any function or block removed without replacement?
  // 2. Are hardcoded strings introduced?
  // 3. Are map/split/filter guarded using nullish coalescing or array check?

  const suspicious = [];

  addedLines.forEach((l, idx) => {
    const text = l.substring(1).trim();
    // Check if hardcoded mock data array or string added
    if (/mockData|fakeData|dummyData/i.test(text)) {
      suspicious.push(`Hardcoded mock/fake symbol: ${text}`);
    }
    if (/^\s*return\s*\[\s*\{\s*id:\s*['"]mock['"]/i.test(text)) {
      suspicious.push(`Hardcoded mock return: ${text}`);
    }
  });

  report.push({
    filePath,
    addedCount: addedLines.length,
    removedCount: removedLines.length,
    suspicious,
    block
  });
}

fs.writeFileSync(path.join(__dirname, 'diff_blocks_report.json'), JSON.stringify(report, null, 2), 'utf8');

console.log(`Report generated with ${report.length} files.`);
