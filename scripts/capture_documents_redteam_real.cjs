const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

async function capture() {
  const browser = await chromium.launch({
    channel: 'msedge',
    headless: true,
  });

  const outDir = path.resolve('docs/screenshots/documents_inquisition');
  const artifactDir = path.resolve('C:/Users/Admin/.gemini/antigravity/brain/d0e64071-8cc3-4835-9ceb-580781248f23');

  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

  const saveProof = (filename, buffer) => {
    fs.writeFileSync(path.join(outDir, filename), buffer);
    fs.writeFileSync(path.join(artifactDir, filename), buffer);
    console.log(`Saved ${filename}: ${buffer.length} bytes`);
  };

  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    deviceScaleFactor: 1,
  });

  await context.addInitScript(() => {
    localStorage.setItem("dente_clinic_token", "dental_live_token");
    localStorage.setItem("dente_staff_token", "staff_live_token");
    localStorage.setItem("dente_active_session_token", "session_token_123");
    localStorage.setItem("dente_organization_id", "org_dental_1");
    localStorage.setItem("dente_user_role", "doctor");
    localStorage.setItem("dente_role", "doctor");
    localStorage.setItem("dente_perspective", "doctor");
    localStorage.setItem("dente_user_name", "Д-р Соколов А. В.");
    localStorage.setItem("dente_onboarding_completed", "true");
    localStorage.setItem("dental-crm:onboarding:v1", JSON.stringify({ dismissed: true, step: "done" }));
    localStorage.setItem("dente_ui_preferences_v1", JSON.stringify({ onboardingDismissed: true, version: 1, selectedWorkspaceRole: "doctor" }));
    localStorage.setItem("dente_tour_completed", "true");
    localStorage.setItem("dente_quest_progress_v2", JSON.stringify({ isDismissedPermanently: true, activeTrack: null, tracksProgress: {} }));
  });

  const page = await context.newPage();
  console.log('Navigating to http://127.0.0.1:5173/#documents...');
  await page.goto('http://127.0.0.1:5173/#documents', { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForTimeout(2000);

  // Clear any leftover overlays
  await page.evaluate(() => {
    document.querySelectorAll(
      '.tour-spotlight-root, [data-testid="guided-tour-spotlight-overlay"], .tour-backdrop-clickable-zone, [data-testid="demo-mode-banner"], .global-toast-container'
    ).forEach(el => el.remove());
  });

  // Check if documents catalog is visible
  const catalog = page.locator('[data-testid="documents-catalog-view"]').first();
  await catalog.waitFor({ state: 'visible', timeout: 15000 });
  console.log('Documents catalog mounted successfully!');

  // 1. Light
  console.log('Capturing Documents Catalog (Light)...');
  await page.evaluate(() => {
    document.documentElement.removeAttribute('data-theme');
    document.documentElement.classList.remove('dark');
  });
  await page.waitForTimeout(600);
  let buf = await page.screenshot({ fullPage: false });
  saveProof('proof_documents_catalog_light_1440x900.png', buf);

  // 2. Dark
  console.log('Capturing Documents Catalog (Dark)...');
  await page.evaluate(() => {
    document.documentElement.setAttribute('data-theme', 'dark');
    document.documentElement.classList.add('dark');
  });
  await page.waitForTimeout(600);
  buf = await page.screenshot({ fullPage: false });
  saveProof('proof_documents_catalog_dark_1440x900.png', buf);

  // 3. FNS Tax Modal - Dark
  console.log('Opening FNS Tax Modal (Dark)...');
  const taxBtn = page.locator('[data-testid="btn-open-tax_deduction_certificate"]').first();
  await taxBtn.scrollIntoViewIfNeeded();
  await taxBtn.click();
  await page.waitForTimeout(1000);
  buf = await page.screenshot({ fullPage: false });
  saveProof('proof_fns_tax_sheet_dark_1440x900.png', buf);

  // 4. FNS Tax Modal - Light
  console.log('Switching to Light for FNS Tax...');
  await page.evaluate(() => {
    document.documentElement.removeAttribute('data-theme');
    document.documentElement.classList.remove('dark');
  });
  await page.waitForTimeout(600);
  buf = await page.screenshot({ fullPage: false });
  saveProof('proof_fns_tax_sheet_light_1440x900.png', buf);

  // Close FNS modal
  await page.keyboard.press('Escape');
  await page.waitForTimeout(500);

  // 5. Contract A4 Sheet Modal - Light
  console.log('Opening Contract A4 Sheet Modal (Light)...');
  const contractBtn = page.locator('[data-testid="btn-open-treatment_contract_paid"]').first();
  await contractBtn.scrollIntoViewIfNeeded();
  await contractBtn.click();
  await page.waitForTimeout(1200);
  buf = await page.screenshot({ fullPage: false });
  saveProof('proof_a4_contract_sheet_light_1440x900.png', buf);

  // 6. Contract A4 Sheet Modal - Dark
  console.log('Switching to Dark for Contract A4 Sheet...');
  await page.evaluate(() => {
    document.documentElement.setAttribute('data-theme', 'dark');
    document.documentElement.classList.add('dark');
  });
  await page.waitForTimeout(600);
  buf = await page.screenshot({ fullPage: false });
  saveProof('proof_a4_contract_sheet_dark_1440x900.png', buf);

  await browser.close();
  console.log('ALL 6 PROOFS CAPTURED SUCCESSFULLY!');
}

capture().catch(console.error);
