const fs = require('fs');
const path = require('path');

const summary = JSON.parse(fs.readFileSync(path.join(__dirname, 'diff_summary.json'), 'utf8'));

const findings = [];
const defensiveGuardsSummary = [];

const hardcodedOrFakeRegex = /\b(HARDCODED|FAKE_DATA|TEST_PASS|DUMMY_RESULT|MOCK_SUCCESS)\b/i;
const suspiciousEmptyReturn = /^\s*return\s*(true|false|null|""|''|\[\]|\{\}|0);\s*$/;
const emptyCatch = /catch\s*\([^)]*\)\s*\{\s*\}/;

for (const item of summary) {
  const file = item.filePath;
  const added = item.added;
  const removed = item.removed;

  const fileFindings = [];

  // Check 1: Hardcoded test strings or fake outputs
  added.forEach((line, idx) => {
    if (hardcodedOrFakeRegex.test(line)) {
      fileFindings.push({
        type: 'HARDCODED_OR_FAKE',
        line: line.trim(),
        detail: `Added line matches fake/hardcoded pattern: "${line.trim()}"`
      });
    }
  });

  // Check 2: Facade or dummy returns replacing logic
  added.forEach((line) => {
    if (suspiciousEmptyReturn.test(line)) {
      fileFindings.push({
        type: 'SUSPICIOUS_RETURN',
        line: line.trim(),
        detail: `Added suspicious early return: "${line.trim()}"`
      });
    }
  });

  // Check 3: Circumvention of error handling
  added.forEach((line) => {
    if (emptyCatch.test(line)) {
      fileFindings.push({
        type: 'EMPTY_CATCH',
        line: line.trim(),
        detail: `Added empty catch block swallowing errors: "${line.trim()}"`
      });
    }
  });

  // Check 4: Defensive programming patterns added
  let defensiveCount = 0;
  added.forEach((line) => {
    if (
      line.includes('?? []') ||
      line.includes('?? ""') ||
      line.includes("?? ''") ||
      line.includes('?? {}') ||
      line.includes('?.') ||
      line.includes('Array.isArray') ||
      line.includes('Boolean(')
    ) {
      defensiveCount++;
    }
  });

  defensiveGuardsSummary.push({
    file,
    defensiveCount,
    addedCount: item.addedCount,
    removedCount: item.removedCount
  });

  if (fileFindings.length > 0) {
    findings.push({ file, fileFindings });
  }
}

console.log(`Forensic check completed.`);
console.log(`Files with potential flags: ${findings.length}`);
console.log(JSON.stringify(findings, null, 2));

fs.writeFileSync(
  path.join(__dirname, 'forensic_findings.json'),
  JSON.stringify({ findings, defensiveGuardsSummary }, null, 2),
  'utf8'
);
