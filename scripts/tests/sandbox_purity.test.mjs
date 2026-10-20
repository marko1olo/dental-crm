import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { execSync } from 'node:child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, '../..');

test('Milestone 1 Purge: No isolated preview HTML sandboxes remain in apps/web', () => {
  const purgedHtmlFiles = [
    'apps/web/cashbox_checkout_preview.html',
    'apps/web/clinical_hygiene_ortho_preview.html',
    'apps/web/endo_modal_preview.html',
    'apps/web/odontogram_popover_preview.html',
    'apps/web/ortho_warranty_preview.html',
    'apps/web/prescription_modal_preview.html',
    'apps/web/cbct_interpolation_10_methods.html',
    'apps/web/cbct_interpolation_gallery_512.html',
    'apps/web/cbct_interpolation_interactive.html',
    'apps/web/cbct_resolution_interpolation_inquisition.html',
    'apps/web/cbct_slice_512_hud.html',
  ];

  for (const relPath of purgedHtmlFiles) {
    const fullPath = path.join(repoRoot, relPath);
    assert.strictEqual(
      fs.existsSync(fullPath),
      false,
      `Purged HTML sandbox must not exist: ${relPath}`
    );
  }
});

test('Milestone 1 Purge: No isolated preview entrypoints remain in apps/web/src', () => {
  const purgedEntrypoints = [
    'apps/web/src/cashbox_checkout_preview_main.tsx',
    'apps/web/src/clinical_hygiene_ortho_preview_main.tsx',
    'apps/web/src/endo_modal_preview_main.tsx',
    'apps/web/src/odontogram_popover_preview_main.tsx',
    'apps/web/src/ortho_warranty_preview_main.tsx',
    'apps/web/src/prescription_modal_preview_main.tsx',
  ];

  for (const relPath of purgedEntrypoints) {
    const fullPath = path.join(repoRoot, relPath);
    assert.strictEqual(
      fs.existsSync(fullPath),
      false,
      `Purged entrypoint must not exist: ${relPath}`
    );
  }
});

test('Milestone 1 Purge: Stray test HTML files removed from repository root', () => {
  const strayRootHtml = [
    'tournament_arena.html',
    'test_curl.html',
  ];

  for (const relPath of strayRootHtml) {
    const fullPath = path.join(repoRoot, relPath);
    assert.strictEqual(
      fs.existsSync(fullPath),
      false,
      `Stray root HTML file must not exist: ${relPath}`
    );
  }
});

test('Milestone 1 Purge: apps/web/ allows strictly ONLY index.html as direct HTML file', () => {
  const webDir = path.join(repoRoot, 'apps/web');
  const files = fs.readdirSync(webDir, { withFileTypes: true });
  const htmlFiles = files
    .filter((f) => f.isFile() && f.name.toLowerCase().endsWith('.html'))
    .map((f) => f.name);

  assert.deepStrictEqual(
    htmlFiles,
    ['index.html'],
    `apps/web/ must contain strictly and only index.html, found: ${htmlFiles.join(', ')}`
  );
});

test('Milestone 1 Purge: apps/web/src/main.tsx has zero standalone bypass query-param branches', () => {
  const mainTsxPath = path.join(repoRoot, 'apps/web/src/main.tsx');
  const content = fs.readFileSync(mainTsxPath, 'utf8');

  const forbiddenBypassPatterns = [
    /params\.has\(["']hygiene["']\)/,
    /params\.has\(["']anesthesia["']\)/,
    /params\.has\(["']telephony["']\)/,
    /params\.has\(["']perio["']\)/,
    /params\.has\(["']prescriptions["']\)/,
    /params\.has\(["']rx["']\)/,
    /params\.has\(["']implant_passport["']\)/,
    /params\.has\(["']implants["']\)/,
    /params\.has\(["']tasks["']\)/,
    /params\.has\(["']clinical_tasks["']\)/,
    /params\.has\(["']tax["']\)/,
    /params\.has\(["']tax_deduction["']\)/,
    /params\.has\(["']orthopedics["']\)/,
    /params\.has\(["']communications["']\)/,
    /params\.has\(["']tournament["']\)/,
    /standParam === ["']odontogram-gate0["']/,
    /standParam === ["']odontogram-gate1["']/,
    /<Tooth46InspectionStand/,
    /<Tooth16InspectionStand/,
    /<TournamentArena/,
  ];

  for (const pattern of forbiddenBypassPatterns) {
    assert.strictEqual(
      pattern.test(content),
      false,
      `main.tsx must not contain bypass branch matching: ${pattern}`
    );
  }

  // Canonical bootstrap verification
  assert.ok(
    content.includes('<AppShell />'),
    'main.tsx must mount canonical <AppShell />'
  );
});

test('Milestone 1 Purge: sandbox_hunter.cjs passes with zero violations', () => {
  const hunterPath = path.join(repoRoot, 'scripts/sandbox_hunter.cjs');
  const output = execSync(`node "${hunterPath}"`, {
    cwd: repoRoot,
    encoding: 'utf8',
  });

  assert.ok(
    output.includes('[OK] 0 Potemkin sandboxes found'),
    'sandbox_hunter.cjs must output 0 Potemkin sandboxes found'
  );
});
