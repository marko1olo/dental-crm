#!/usr/bin/env node

/**
 * sandbox_hunter.cjs
 *
 * Scans the repository recursively to eliminate fake Potemkin preview sandboxes,
 * isolated HTML mockups, and standalone test pages that simulate reality in a vacuum.
 *
 * Compliant with THE HAMMER Master Prompt Rule 23:
 * "КАТЕГОРИЧЕСКИЙ ЗАПРЕТ НА ЛЮБЫЕ *_preview.html, *_preview.tsx, *preview*.html, test-*.html"
 * And Milestone 1 Mandate:
 * "В apps/web/ разрешён СТРОГО ЕДИНСТВЕННЫЙ HTML-файл — index.html. Любой другой .html файл в apps/web/ должен триггерить ошибку."
 *
 * Exit code 0 on clean tree, exit code 1 on any detected sandbox fraud.
 */

const fs = require('fs');
const path = require('path');

const repoRoot = path.resolve(__dirname, '..');

const IGNORE_DIRS = new Set([
  'node_modules',
  '.git',
  'dist',
  'build',
  '.data',
  'pglite-data',
  'temp-test-db',
  'test-results',
  'coverage',
  '.postgres',
  'screenshots',
  'docs',
  'scratch',
  '.agents',
  'artifacts'
]);

const TEST_DIR_PATTERNS = [
  /[\\/]tests[\\/]/,
  /[\\/]__tests__[\\/]/,
  /[\\/]playwright[\\/]/,
  /[\\/]e2e[\\/]/,
  /[\\/]test[\\/]/
];

function isOfficialTestDir(filePath) {
  return TEST_DIR_PATTERNS.some((pattern) => pattern.test(filePath));
}

function scanDirectory(dir) {
  let findings = [];
  if (!fs.existsSync(dir)) return findings;

  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    if (IGNORE_DIRS.has(entry.name)) continue;

    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      findings = findings.concat(scanDirectory(fullPath));
    } else {
      const lowerName = entry.name.toLowerCase();
      const relPath = path.relative(repoRoot, fullPath).split(path.sep).join('/');
      const parentDirRel = path.relative(repoRoot, dir).split(path.sep).join('/');

      // Mandate 1: Repository root purity — only index.html (GitHub Pages landing) permitted in root
      if (dir === repoRoot && lowerName.endsWith('.html')) {
        if (entry.name !== 'index.html') {
          findings.push({
            path: relPath,
            rule: 'root *.html',
            detail: `No standalone/test .html files permitted in repository root: ${entry.name}`
          });
          continue;
        }
      }

      // Mandate 2: apps/web/ HTML Purity — Strictly index.html permitted directly under apps/web/
      if (parentDirRel === 'apps/web' && lowerName.endsWith('.html')) {
        if (entry.name !== 'index.html') {
          findings.push({
            path: relPath,
            rule: 'apps/web/ single index.html purity',
            detail: `apps/web/ permits strictly ONLY index.html. Forbidden stray HTML file: ${entry.name}`
          });
          continue;
        }
      }

      // Mandate 2b: apps/web/public HTML Purity — Strictly whitelisted canonical public assets
      if (parentDirRel === 'apps/web/public' && lowerName.endsWith('.html')) {
        const ALLOWED_PUBLIC_HTML = new Set(['gallery.html', 'offline.html', 'viewer3d.html']);
        if (!ALLOWED_PUBLIC_HTML.has(lowerName)) {
          findings.push({
            path: relPath,
            rule: 'apps/web/public *.html purity',
            detail: `apps/web/public permits strictly only whitelisted assets (gallery.html, offline.html, viewer3d.html). Forbidden stray HTML: ${entry.name}`
          });
          continue;
        }
      }

      // Mandate 3: apps/web/src/ HTML Purity — Zero HTML files allowed in source tree
      if (relPath.startsWith('apps/web/src/') && lowerName.endsWith('.html')) {
        findings.push({
          path: relPath,
          rule: 'apps/web/src/ *.html',
          detail: 'No HTML files permitted inside apps/web/src/'
        });
        continue;
      }

      // Pattern 1: Any *preview*.html outside official tests
      if (lowerName.endsWith('.html') && lowerName.includes('preview')) {
        if (!isOfficialTestDir(fullPath)) {
          findings.push({
            path: relPath,
            rule: '*preview*.html',
            detail: 'Potemkin isolated preview HTML sandbox detected'
          });
          continue;
        }
      }

      // Pattern 1b: Any *standalone*.html outside official tests
      if (lowerName.endsWith('.html') && (lowerName.startsWith('standalone') || lowerName.includes('standalone'))) {
        if (!isOfficialTestDir(fullPath)) {
          findings.push({
            path: relPath,
            rule: '*standalone*.html',
            detail: 'Potemkin isolated standalone HTML sandbox detected outside official test suites'
          });
          continue;
        }
      }

      // Pattern 2: Any test-*.html or test_*.html outside official tests
      if (lowerName.endsWith('.html') && (lowerName.startsWith('test-') || lowerName.startsWith('test_'))) {
        if (!isOfficialTestDir(fullPath)) {
          findings.push({
            path: relPath,
            rule: 'test-*.html / test_*.html',
            detail: 'Unsanctioned test HTML sandbox outside official test suites'
          });
          continue;
        }
      }

      // Pattern 3: Any *_preview.tsx, *.preview.tsx, preview.tsx or isolated mock mounts
      if (
        (lowerName.endsWith('.tsx') || lowerName.endsWith('.ts')) &&
        (lowerName === 'preview.tsx' ||
          lowerName.endsWith('_preview.tsx') ||
          lowerName.endsWith('.preview.tsx') ||
          lowerName.startsWith('preview_') ||
          lowerName.endsWith('_preview_main.tsx') ||
          lowerName.includes('preview_main')) &&
        !isOfficialTestDir(fullPath)
      ) {
        findings.push({
          path: relPath,
          rule: '*_preview.tsx / preview.tsx',
          detail: 'Isolated preview sandbox entrypoint detected outside test suites'
        });
        continue;
      }

      // Pattern 4: Any .tsx or .html file mounting standalone createRoot outside index.html and main.tsx
      if (
        (lowerName.endsWith('.tsx') || lowerName.endsWith('.html')) &&
        !isOfficialTestDir(fullPath) &&
        !relPath.includes('index.html') &&
        !relPath.includes('main.tsx')
      ) {
        const content = fs.readFileSync(fullPath, 'utf8');
        if (
          (content.includes('createRoot(') || content.includes('ReactDOM.render(')) &&
          content.includes('preview')
        ) {
          findings.push({
            path: relPath,
            rule: 'standalone createRoot preview',
            detail: 'Standalone React root mounting fake preview data detected'
          });
        }
      }
    }
  }

  return findings;
}

console.log('[sandbox_hunter] Scanning repository for Potemkin sandboxes and preview fraud...');
const violations = scanDirectory(repoRoot);

if (violations.length > 0) {
  console.error(`\n[FATAL] Sandbox Hunter detected ${violations.length} forbidden sandbox/preview file(s):`);
  for (const v of violations) {
    console.error(`  - [${v.rule}] ${v.path}: ${v.detail}`);
  }
  console.error('\nRule 23 (The Ironclad Ban on Fake Preview Sandboxes) violated!');
  console.error('All visual proofs and features MUST live in the live application root (index.html).\n');
  process.exit(1);
}

console.log('[sandbox_hunter] [OK] 0 Potemkin sandboxes found. Codebase is clean of preview fraud.');
process.exit(0);
