const fs = require('fs');
const path = require('path');

const whitelistPath = path.join(__dirname, 'file_limits_whitelist.json');
let whitelist = {};
if (fs.existsSync(whitelistPath)) {
  try {
    whitelist = JSON.parse(fs.readFileSync(whitelistPath, 'utf8'));
  } catch (e) {
    console.error('Failed to parse whitelist:', e);
  }
}

const rootDirs = ['apps/web/src', 'apps/api/src'];
const allowedExts = new Set(['.ts', '.tsx', '.js', '.jsx']);

let scannedCount = 0;
let whitelistedPassingCount = 0;
const violations = [];

function scanDir(dir) {
  if (!fs.existsSync(dir)) return;
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name !== 'node_modules' && entry.name !== 'dist' && entry.name !== '.git') {
        scanDir(fullPath);
      }
    } else if (entry.isFile()) {
      const ext = path.extname(entry.name);
      if (allowedExts.has(ext)) {
        scannedCount++;
        const relPath = path.relative(process.cwd(), fullPath).replace(/\\/g, '/');
        const content = fs.readFileSync(fullPath, 'utf8');
        const lines = content.split('\n').length;
        
        if (whitelist[relPath] !== undefined) {
          const ceiling = whitelist[relPath];
          if (lines > ceiling) {
            violations.push(`  - [${lines} lines] ${relPath} :: Legacy monolith exceeded whitelist ceiling (${lines} > ${ceiling})`);
          } else {
            whitelistedPassingCount++;
          }
        } else {
          if (lines > 500) {
            violations.push(`  - [${lines} lines] ${relPath} :: New file exceeds 500 lines limit (${lines} > 500)`);
          }
        }
      }
    }
  }
}

for (const dir of rootDirs) {
  scanDir(path.resolve(process.cwd(), dir));
}

console.log(`[check_file_limits] Scanned ${scannedCount} source files in apps/web/src and apps/api/src.`);
console.log(`[check_file_limits] Legacy whitelisted files passing ceiling: ${whitelistedPassingCount}.`);

if (violations.length > 0) {
  console.log(`\n[FATAL] Found ${violations.length} file limit violation(s):`);
  for (const v of violations) {
    console.log(v);
  }
  console.log('\nAnti-Monolith Invariant violated: No file may exceed 500 lines without approval.\n');
  process.exit(1);
} else {
  console.log('\n[PASS] All scanned files comply with anti-monolith invariants (<= 500 lines or within whitelist ceilings).\n');
  process.exit(0);
}
