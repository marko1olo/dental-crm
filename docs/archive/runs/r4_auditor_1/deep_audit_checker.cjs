const fs = require('fs');
const path = require('path');

const chunksDir = path.join(__dirname, 'diff_chunks');
const files = fs.readdirSync(chunksDir);

const auditResults = [];

for (const file of files) {
  const content = fs.readFileSync(path.join(chunksDir, file), 'utf8');
  const lines = content.split('\n');

  const filePathLine = lines.find(l => l.startsWith('diff --git'));
  const match = filePathLine ? filePathLine.match(/b\/(apps\/web\/src\/[^\s]+)/) : null;
  const filePath = match ? match[1] : file;

  const addedLines = lines.filter(l => l.startsWith('+') && !l.startsWith('+++'));
  const removedLines = lines.filter(l => l.startsWith('-') && !l.startsWith('---'));

  const issues = [];
  const defensiveAdditions = [];

  // Check added lines
  addedLines.forEach((addedLine, lineIdx) => {
    const text = addedLine.substring(1);

    // Check 1: Hardcoded / fake strings
    if (/\b(mock|fake|dummy|test_pass|hardcoded)\b/i.test(text)) {
      // Ignore comments or type definitions if any
      if (!/^\s*\/\//.test(text) && !/interface|type/.test(text)) {
        issues.push({
          type: 'HARDCODED_OR_FAKE',
          line: text.trim(),
          context: 'Added line contains suspicious keyword (mock/fake/dummy)'
        });
      }
    }

    // Check 2: Facade / dummy returns
    if (/^\s*return\s+(null|undefined|true|false|""|''|0|\[\]|\{\}|<>\s*<\/>);\s*$/.test(text)) {
      // Check surrounding lines to see if it's a facade bypassing a whole component/function
      issues.push({
        type: 'EARLY_RETURN_FACADE_CHECK',
        line: text.trim(),
        context: 'Added early return statement'
      });
    }

    // Check 3: Circumvention of error handling (empty catch)
    if (/catch\s*\([^)]*\)\s*\{\s*\}/.test(text)) {
      issues.push({
        type: 'EMPTY_CATCH_BLOCK',
        line: text.trim(),
        context: 'Swallowing errors silently'
      });
    }

    // Check 4: Defensive programming patterns
    if (
      text.includes('?? []') ||
      text.includes("?? ''") ||
      text.includes('?? ""') ||
      text.includes('?? {}') ||
      text.includes('?.') ||
      text.includes('Array.isArray') ||
      text.includes('String(') ||
      text.includes('Boolean(')
    ) {
      defensiveAdditions.push(text.trim());
    }
  });

  auditResults.push({
    file,
    filePath,
    addedCount: addedLines.length,
    removedCount: removedLines.length,
    issues,
    defensiveAdditionsCount: defensiveAdditions.length,
    defensiveAdditionsSample: defensiveAdditions.slice(0, 5),
    fullBlock: content
  });
}

fs.writeFileSync(path.join(__dirname, 'audit_results.json'), JSON.stringify(auditResults, null, 2), 'utf8');

console.log(`Deep audit finished for ${auditResults.length} files.`);
const filesWithIssues = auditResults.filter(r => r.issues.length > 0);
console.log(`Files flagging potential issues requiring manual verification: ${filesWithIssues.length}`);
if (filesWithIssues.length > 0) {
  filesWithIssues.forEach(f => {
    console.log(`\nFile: ${f.filePath}`);
    f.issues.forEach(i => console.log(`  - [${i.type}] Line: ${i.line} (${i.context})`));
  });
}
