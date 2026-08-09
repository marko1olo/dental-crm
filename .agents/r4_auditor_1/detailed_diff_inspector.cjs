const fs = require('fs');
const path = require('path');

const summary = JSON.parse(fs.readFileSync(path.join(__dirname, 'diff_summary.json'), 'utf8'));

const detailedReport = [];

for (const item of summary) {
  const file = item.filePath;
  const added = item.added;
  const removed = item.removed;

  // Let's analyze types of additions
  const mapGuards = added.filter(l => l.includes('.map('));
  const splitGuards = added.filter(l => l.includes('.split('));
  const filterGuards = added.filter(l => l.includes('.filter('));
  const optionalChaining = added.filter(l => l.includes('?.'));
  const nullishCoalescing = added.filter(l => l.includes('??'));
  const lengthGuards = added.filter(l => l.includes('.length'));
  const stateDefaults = added.filter(l => l.includes('useState(') || l.includes('useMemo('));

  detailedReport.push({
    file,
    addedLinesCount: added.length,
    removedLinesCount: removed.length,
    mapGuards: mapGuards.length,
    splitGuards: splitGuards.length,
    filterGuards: filterGuards.length,
    optionalChaining: optionalChaining.length,
    nullishCoalescing: nullishCoalescing.length,
    addedSample: added.slice(0, 10),
    removedSample: removed.slice(0, 10)
  });
}

fs.writeFileSync(
  path.join(__dirname, 'detailed_report.json'),
  JSON.stringify(detailedReport, null, 2),
  'utf8'
);

console.log(`Analyzed ${detailedReport.length} files.`);
