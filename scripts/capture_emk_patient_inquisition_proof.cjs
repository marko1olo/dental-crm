/**
 * scripts/capture_emk_patient_inquisition_proof.cjs
 *
 * Captures 4-state visual proofs (PC Light/Dark 1440x900, Mobile Light/Dark 390x844) for:
 * - Patient Clinical Timeline & History (purged "Выписка 043/у" -> "Выписка из карты")
 * - Treatment Plan & Chairside Workspace (purged Potemkin names & bird language)
 */

const { chromium } = require("playwright");
const path = require("node:path");
const fs = require("node:fs");

const OUT_DIR = path.resolve(__dirname, "..", "docs", "screenshots", "inquisition_live");
const BRAIN_DIR = path.resolve("C:\\Users\\Admin\\.gemini\\antigravity\\brain\\e99ad5c9-e8e6-4b58-825a-9029fbbeb880");

if (!fs.existsSync(OUT_DIR)) {
  fs.mkdirSync(OUT_DIR, { recursive: true });
}
if (!fs.existsSync(BRAIN_DIR)) {
  fs.mkdirSync(BRAIN_DIR, { recursive: true });
}

async function safeGoto(page, url) {
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      await page.goto(url, { waitUntil: "domcontentloaded", timeout: 20000 });
      return;
    } catch (e) {
      console.warn(`[Playwright] Navigation attempt ${attempt} failed: ${e.message}, retrying in 1s...`);
      if (attempt === 3) throw e;
      await new Promise((r) => setTimeout(r, 1200));
    }
  }
}

async function captureAllProofs() {
  console.log("[Playwright] Launching Chrome for 4-State Visual Inquisition...");
  const browser = await chromium.launch({
    headless: true,
    executablePath: "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
    args: [
      "--no-sandbox",
      "--disable-setuid-sandbox",
      "--disable-dev-shm-usage",
      "--disable-gpu",
    ],
  });

  // ─── 1. MOBILE CONTEXT (390x844, Apple HIG) ───
  console.log("[Playwright] Opening Mobile Context (390x844)...");
  const mobileContext = await browser.newContext({
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 2,
    isMobile: true,
    hasTouch: true,
  });
  const mobilePage = await mobileContext.newPage();

  // 1.1 Mobile Light Patient History
  console.log("[Playwright] Capturing Mobile Light Patient History...");
  await safeGoto(mobilePage, "http://127.0.0.1:5173/patient_timeline_preview.html?theme=light");
  await mobilePage.waitForSelector(".clinical-timeline-container", { timeout: 15000 });
  await mobilePage.waitForTimeout(800);
  await mobilePage.evaluate(() => {
    document.querySelectorAll('.tour-spotlight-root, [data-testid="guided-tour-spotlight-overlay"], .tour-backdrop-clickable-zone, [data-testid="demo-mode-banner"], .global-toast-container, [role="alert"]').forEach((el) => el.remove());
  });

  const mobHistLight = path.join(OUT_DIR, "proof_mobile_patient_history_light.png");
  await mobilePage.screenshot({ path: mobHistLight, fullPage: false });
  fs.copyFileSync(mobHistLight, path.join(BRAIN_DIR, "proof_mobile_patient_history_light.png"));

  // Scroll to details pane with action button
  const actionsEl = mobilePage.locator(".clinical-details-actions").first();
  if (await actionsEl.count() > 0) {
    await actionsEl.scrollIntoViewIfNeeded();
    await mobilePage.waitForTimeout(500);
    const mobHistDetailsLight = path.join(OUT_DIR, "proof_mobile_patient_history_details_light.png");
    await mobilePage.screenshot({ path: mobHistDetailsLight, fullPage: false });
    fs.copyFileSync(mobHistDetailsLight, path.join(BRAIN_DIR, "proof_mobile_patient_history_details_light.png"));
  }

  // 1.2 Mobile Dark Patient History
  console.log("[Playwright] Capturing Mobile Dark Patient History...");
  await safeGoto(mobilePage, "http://127.0.0.1:5173/patient_timeline_preview.html?theme=dark");
  await mobilePage.waitForSelector(".clinical-timeline-container", { timeout: 15000 });
  await mobilePage.waitForTimeout(800);
  await mobilePage.evaluate(() => {
    document.querySelectorAll('.tour-spotlight-root, [data-testid="guided-tour-spotlight-overlay"], .tour-backdrop-clickable-zone, [data-testid="demo-mode-banner"], .global-toast-container, [role="alert"]').forEach((el) => el.remove());
  });

  const mobHistDark = path.join(OUT_DIR, "proof_mobile_patient_history_dark.png");
  await mobilePage.screenshot({ path: mobHistDark, fullPage: false });
  fs.copyFileSync(mobHistDark, path.join(BRAIN_DIR, "proof_mobile_patient_history_dark.png"));

  const actionsDarkEl = mobilePage.locator(".clinical-details-actions").first();
  if (await actionsDarkEl.count() > 0) {
    await actionsDarkEl.scrollIntoViewIfNeeded();
    await mobilePage.waitForTimeout(500);
    const mobHistDetailsDark = path.join(OUT_DIR, "proof_mobile_patient_history_details_dark.png");
    await mobilePage.screenshot({ path: mobHistDetailsDark, fullPage: false });
    fs.copyFileSync(mobHistDetailsDark, path.join(BRAIN_DIR, "proof_mobile_patient_history_details_dark.png"));
  }

  // 1.3 Mobile Light Treatment Plan
  console.log("[Playwright] Capturing Mobile Light Treatment Plan...");
  await safeGoto(mobilePage, "http://127.0.0.1:5173/treatment_plan_preview.html?theme=light");
  await mobilePage.waitForTimeout(1000);
  const mobPlanLight = path.join(OUT_DIR, "proof_mobile_treatment_plan_light.png");
  await mobilePage.screenshot({ path: mobPlanLight, fullPage: false });
  fs.copyFileSync(mobPlanLight, path.join(BRAIN_DIR, "proof_mobile_treatment_plan_light.png"));

  // 1.4 Mobile Dark Treatment Plan
  console.log("[Playwright] Capturing Mobile Dark Treatment Plan...");
  await safeGoto(mobilePage, "http://127.0.0.1:5173/treatment_plan_preview.html?theme=dark");
  await mobilePage.waitForTimeout(1000);
  const mobPlanDark = path.join(OUT_DIR, "proof_mobile_treatment_plan_dark.png");
  await mobilePage.screenshot({ path: mobPlanDark, fullPage: false });
  fs.copyFileSync(mobPlanDark, path.join(BRAIN_DIR, "proof_mobile_treatment_plan_dark.png"));

  await mobileContext.close();

  // ─── 2. DESKTOP PC CONTEXT (1440x900) ───
  console.log("[Playwright] Opening Desktop PC Context (1440x900)...");
  const pcContext = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    deviceScaleFactor: 1,
    isMobile: false,
  });
  const pcPage = await pcContext.newPage();

  // 2.1 PC Light Patient History
  console.log("[Playwright] Capturing PC Light Patient History...");
  await safeGoto(pcPage, "http://127.0.0.1:5173/patient_timeline_preview.html?theme=light");
  await pcPage.waitForSelector(".clinical-timeline-container", { timeout: 15000 });
  await pcPage.waitForTimeout(800);
  await pcPage.evaluate(() => {
    document.querySelectorAll('.tour-spotlight-root, [data-testid="guided-tour-spotlight-overlay"], .tour-backdrop-clickable-zone, [data-testid="demo-mode-banner"], .global-toast-container, [role="alert"]').forEach((el) => el.remove());
  });

  const pcHistLight = path.join(OUT_DIR, "proof_pc_patient_history_light.png");
  await pcPage.screenshot({ path: pcHistLight, fullPage: false });
  fs.copyFileSync(pcHistLight, path.join(BRAIN_DIR, "proof_pc_patient_history_light.png"));

  // 2.2 PC Dark Patient History
  console.log("[Playwright] Capturing PC Dark Patient History...");
  await safeGoto(pcPage, "http://127.0.0.1:5173/patient_timeline_preview.html?theme=dark");
  await pcPage.waitForSelector(".clinical-timeline-container", { timeout: 15000 });
  await pcPage.waitForTimeout(800);
  await pcPage.evaluate(() => {
    document.querySelectorAll('.tour-spotlight-root, [data-testid="guided-tour-spotlight-overlay"], .tour-backdrop-clickable-zone, [data-testid="demo-mode-banner"], .global-toast-container, [role="alert"]').forEach((el) => el.remove());
  });

  const pcHistDark = path.join(OUT_DIR, "proof_pc_patient_history_dark.png");
  await pcPage.screenshot({ path: pcHistDark, fullPage: false });
  fs.copyFileSync(pcHistDark, path.join(BRAIN_DIR, "proof_pc_patient_history_dark.png"));

  // 2.3 PC Light Treatment Plan
  console.log("[Playwright] Capturing PC Light Treatment Plan...");
  await safeGoto(pcPage, "http://127.0.0.1:5173/treatment_plan_preview.html?theme=light");
  await pcPage.waitForTimeout(1000);
  const pcPlanLight = path.join(OUT_DIR, "proof_pc_treatment_plan_light.png");
  await pcPage.screenshot({ path: pcPlanLight, fullPage: false });
  fs.copyFileSync(pcPlanLight, path.join(BRAIN_DIR, "proof_pc_treatment_plan_light.png"));

  // 2.4 PC Dark Treatment Plan
  console.log("[Playwright] Capturing PC Dark Treatment Plan...");
  await safeGoto(pcPage, "http://127.0.0.1:5173/treatment_plan_preview.html?theme=dark");
  await pcPage.waitForTimeout(1000);
  const pcPlanDark = path.join(OUT_DIR, "proof_pc_treatment_plan_dark.png");
  await pcPage.screenshot({ path: pcPlanDark, fullPage: false });
  fs.copyFileSync(pcPlanDark, path.join(BRAIN_DIR, "proof_pc_treatment_plan_dark.png"));

  await pcContext.close();
  await browser.close();

  console.log("[Playwright] All screenshots captured and copied successfully!");
}

captureAllProofs().catch((err) => {
  console.error("[Playwright] Error capturing proofs:", err);
  process.exit(1);
});
