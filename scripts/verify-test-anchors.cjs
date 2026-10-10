/**
 * @file verify-test-anchors.cjs
 * @description Verifies that all test selectors (data-testid, id, aria-label, role) from an original file exist in the decomposed module directory.
 * Usage: node scripts/verify-test-anchors.cjs <originalFilePath> <decomposedDirectoryOrFilePath>
 */

const fs = require('fs');
const path = require('path');

function extractAnchors(content) {
  const anchors = new Set();
  
  // Extract data-testid="..."
  const testIdMatches = content.matchAll(/data-testid=["']([^"']+)["']/g);
  for (const m of testIdMatches) {
    anchors.add(`testid:${m[1]}`);
  }

  // Extract id="..."
  const idMatches = content.matchAll(/\bid=["']([^"']+)["']/g);
  for (const m of idMatches) {
    anchors.add(`id:${m[1]}`);
  }

  // Extract aria-label="..."
  const ariaMatches = content.matchAll(/aria-label=["']([^"']+)["']/g);
  for (const m of ariaMatches) {
    anchors.add(`aria-label:${m[1]}`);
  }

  return anchors;
}

function scanFile(filePath) {
  if (!fs.existsSync(filePath)) return new Set();
  const content = fs.readFileSync(filePath, 'utf8');
  return extractAnchors(content);
}

function scanDir(dirPath) {
  const allAnchors = new Set();
  
  function walk(current) {
    const entries = fs.readdirSync(current, { withFileTypes: true });
    for (const entry of entries) {
      const full = path.join(current, entry.name);
      if (entry.isDirectory()) {
        if (entry.name !== 'node_modules' && entry.name !== '.git' && entry.name !== 'dist') {
          walk(full);
        }
      } else if (/\.(tsx|jsx|ts|js)$/.test(entry.name)) {
        const fileAnchors = scanFile(full);
        for (const a of fileAnchors) allAnchors.add(a);
      }
    }
  }

  walk(dirPath);
  return allAnchors;
}

const originalPath = process.argv[2];
const targetPaths = process.argv.slice(3);

if (!originalPath || targetPaths.length === 0) {
  console.log('Usage: node scripts/verify-test-anchors.cjs <original_file> <target_dir_or_file> [additional_targets...]');
  process.exit(1);
}

console.log(`[TestAnchorAudit] Auditing test anchors:`);
console.log(`  Original: ${originalPath}`);
console.log(`  Targets:  ${targetPaths.join(', ')}`);

const originalAnchors = scanFile(originalPath);

const targetAnchors = new Set();
for (const tPath of targetPaths) {
  if (!fs.existsSync(tPath)) continue;
  const currentAnchors = fs.statSync(tPath).isDirectory()
    ? scanDir(tPath)
    : scanFile(tPath);
  for (const a of currentAnchors) {
    targetAnchors.add(a);
  }
}

const lost = Array.from(originalAnchors).filter(a => !targetAnchors.has(a));

console.log(`[TestAnchorAudit] Found ${originalAnchors.size} original anchors, ${targetAnchors.size} target anchors.`);

if (lost.length > 0) {
  console.error(`\n❌ [TestAnchorAudit] FAILED: ${lost.length} test anchors are MISSING in decomposed code:`);
  lost.forEach(a => console.error(`  - ${a}`));
  process.exit(1);
}

console.log(`\n✔ [TestAnchorAudit] PASSED: 100% of test anchors (${originalAnchors.size}) are preserved.\n`);
process.exit(0);
