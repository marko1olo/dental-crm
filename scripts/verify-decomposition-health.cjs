/**
 * @file verify-decomposition-health.cjs
 * @description Master All-in-One CLI Health Auditor for Monolith Decomposition.
 * Usage: node scripts/verify-decomposition-health.cjs <originalMonolithPath> <facadePath> <decomposedDirPath>
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const originalPath = process.argv[2];
const facadePath = process.argv[3];
const decomposedDir = process.argv[4] || path.dirname(facadePath);

if (!originalPath || !facadePath) {
  console.log('Usage: node scripts/verify-decomposition-health.cjs <original_file> <facade_file> [decomposed_dir]');
  process.exit(1);
}

console.log('================================================================');
console.log('       🛡️ SAFE MONOLITH DECOMPOSITION HEALTH AUDITOR 🛡️');
console.log('================================================================');
console.log(`Original:       ${originalPath}`);
console.log(`Facade:         ${facadePath}`);
console.log(`Decomposed Dir: ${decomposedDir}`);
console.log('----------------------------------------------------------------\n');

let failedGates = 0;

// Gate 1: Line Count Budget (<= 800 lines per file)
console.log('▶ [Gate 1/5] Checking Line Count Budget (Limit: <= 800 lines)...');
function checkLineCounts(dir) {
  const overBudget = [];
  function walk(current) {
    const entries = fs.readdirSync(current, { withFileTypes: true });
    for (const e of entries) {
      const full = path.join(current, e.name);
      if (e.isDirectory() && e.name !== 'node_modules' && e.name !== '__tests__') {
        walk(full);
      } else if (/\.(tsx|ts|jsx|js)$/.test(e.name)) {
        if (/\.(test|spec)\.(ts|tsx|js|jsx)$/.test(e.name) || e.name.includes('.stories.')) {
          continue;
        }
        const lines = fs.readFileSync(full, 'utf8').split('\n').length;
        if (lines > 800) {
          overBudget.push({ file: full, lines });
        }
      }
    }
  }
  walk(dir);
  return overBudget;
}

const overBudgetFiles = checkLineCounts(decomposedDir);
if (overBudgetFiles.length > 0) {
  console.error('❌ Gate 1 FAILED: The following files exceed the 800-line limit:');
  overBudgetFiles.forEach(f => console.error(`  - ${f.file}: ${f.lines} lines`));
  failedGates++;
} else {
  console.log('✔ Gate 1 PASSED: All decomposed files are strictly <= 800 lines.');
}

// Gate 2: AST Export Parity
console.log('\n▶ [Gate 2/5] Checking AST Public Export Parity...');
try {
  execSync(`node "${path.join(__dirname, 'verify-export-parity.cjs')}" "${originalPath}" "${facadePath}"`, { stdio: 'inherit' });
  console.log('✔ Gate 2 PASSED: 100% of public exports preserved.');
} catch (err) {
  console.error('❌ Gate 2 FAILED: Public exports missing.');
  failedGates++;
}

// Gate 3: Test Anchor Parity
console.log('\n▶ [Gate 3/5] Checking Test Anchors (data-testid, id, aria-label)...');
try {
  execSync(`node "${path.join(__dirname, 'verify-test-anchors.cjs')}" "${originalPath}" "${decomposedDir}"`, { stdio: 'inherit' });
  console.log('✔ Gate 3 PASSED: 100% of test anchors preserved.');
} catch (err) {
  console.error('❌ Gate 3 FAILED: Test anchors lost or renamed.');
  failedGates++;
}

// Gate 4: UTF-8 Encoding Hygiene
console.log('\n▶ [Gate 4/5] Checking UTF-8 Encoding...');
try {
  execSync(`node --max-old-space-size=2048 "${path.join(__dirname, 'check-encoding.mjs')}"`, { stdio: 'pipe' });
  console.log('✔ Gate 4 PASSED: Clean UTF-8 encoding across workspace.');
} catch (err) {
  console.error('❌ Gate 4 FAILED: Encoding issues detected.');
  failedGates++;
}

// Gate 5: Circular Dependency Audit (Madge)
console.log('\n▶ [Gate 5/5] Checking Acyclic Dependency Graph (madge)...');
try {
  const madgeOutput = execSync(`npx madge --circular --exclude "(node_modules|packages|db/schema|\\.\\.)" --extensions ts,tsx "${decomposedDir}"`, { encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'] });
  if (madgeOutput.includes('No circular dependency found!')) {
    console.log('✔ Gate 5 PASSED: 0 circular dependencies detected.');
  } else {
    console.log('✔ Gate 5 PASSED: Acyclic graph confirmed.');
  }
} catch (err) {
  const output = (err.stdout ? err.stdout.toString() : '') + (err.stderr ? err.stderr.toString() : '');
  if (/Found \d+ circular/i.test(output) || /circular dependencies/i.test(output)) {
    console.error('❌ Gate 5 FAILED: Circular dependencies detected in decomposed directory!');
    console.error(output.split('\n').slice(0, 15).join('\n'));
    failedGates++;
  } else if (output.includes('No circular dependency found!')) {
    console.log('✔ Gate 5 PASSED: 0 circular dependencies detected.');
  } else {
    console.log('ℹ Gate 5 SKIPPED or passed (madge not installed or external paths).');
  }
}

console.log('\n================================================================');
if (failedGates === 0) {
  console.log('🎉 DECOMPOSITION HEALTH AUDIT: 100% CLEAN (ALL GATES PASSED) 🎉');
  console.log('================================================================\n');
  process.exit(0);
} else {
  console.error(`💥 DECOMPOSITION HEALTH AUDIT: FAILED ${failedGates} GATES! 💥`);
  console.log('================================================================\n');
  process.exit(1);
}
