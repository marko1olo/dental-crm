/**
 * scripts/capture_mobile_patient_history_proof.cjs
 *
 * Captures mobile (iPhone 14 / Apple HIG 390x844 viewport) screenshots in Light and Dark modes for:
 * - Patient Clinical Timeline (Apple Health Records style)
 * - MKB-10 diagnosis header
 * - SOAP accordion grid (Subjective, Anamnesis, Status Localis, Plan)
 * - Radiology & Photo scans grid
 * - Deducted warehouse materials
 * - Quick action buttons: [ 🖨 Выписка 043/у ], [ 📋 В план лечения ], [ К визиту ↗ ]
 * - Tactile expand/collapse controls [ ⊞ Развернуть всё ] and [ ⊟ Свернуть всё ]
 */

const { chromium } = require("playwright");
const path = require("node:path");
const fs = require("node:fs");

const OUT_DIR = path.resolve(__dirname, "..", "docs", "screenshots", "inquisition_live");
const BRAIN_DIR = path.resolve("C:\\Users\\Admin\\.gemini\\antigravity\\brain\\beb92312-c6d7-426d-a438-12dcad022abc");

if (!fs.existsSync(OUT_DIR)) {
  fs.mkdirSync(OUT_DIR, { recursive: true });
}

async function captureMobilePatientHistoryProof() {
  console.log("[Playwright] Launching Chrome in iPhone 390x844 mobile resolution...");
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

  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 2,
    isMobile: true,
    hasTouch: true,
  });

  const page = await context.newPage();

  page.on("pageerror", (err) => console.log("[PAGE ERROR]", err.message));
  page.on("console", (msg) => {
    if (msg.type() === "error") {
      console.log(`[BROWSER ERROR]`, msg.text());
    }
  });

  // 1. Capture LIGHT Mode
  console.log("[Playwright] Navigating to preview in LIGHT mode (390x844)...");
  await page.goto("http://127.0.0.1:5173/patient_timeline_preview.html?theme=light", {
    waitUntil: "domcontentloaded",
    timeout: 30000,
  });

  await page.waitForSelector(".clinical-timeline-container", { timeout: 15000 });
  await page.waitForTimeout(1500);

  // Clean overlays or banners if any
  await page.evaluate(() => {
    document.querySelectorAll('.tour-spotlight-root, [data-testid="guided-tour-spotlight-overlay"], .tour-backdrop-clickable-zone, [data-testid="demo-mode-banner"], .global-toast-container, [role="alert"]').forEach((el) => el.remove());
  });

  const lightShot = path.join(OUT_DIR, "proof_mobile_patient_history_light.png");
  await page.screenshot({ path: lightShot, fullPage: false });
  console.log("[Playwright] Saved Light Mode Proof:", lightShot);

  // Scroll to action buttons and scans in Light mode
  const actionsEl = page.locator(".clinical-details-actions").first();
  if (await actionsEl.count() > 0) {
    await actionsEl.scrollIntoViewIfNeeded();
    await page.waitForTimeout(500);
    const lightDetailsShot = path.join(OUT_DIR, "proof_mobile_patient_history_details_light.png");
    await page.screenshot({ path: lightDetailsShot, fullPage: false });
    console.log("[Playwright] Saved Light Details Proof:", lightDetailsShot);
  }

  // 2. Capture DARK Mode
  console.log("[Playwright] Navigating to preview in DARK mode (390x844)...");
  await page.goto("http://127.0.0.1:5173/patient_timeline_preview.html?theme=dark", {
    waitUntil: "domcontentloaded",
    timeout: 30000,
  });

  await page.waitForSelector(".clinical-timeline-container", { timeout: 15000 });
  await page.waitForTimeout(1500);

  // Clean overlays or banners if any
  await page.evaluate(() => {
    document.querySelectorAll('.tour-spotlight-root, [data-testid="guided-tour-spotlight-overlay"], .tour-backdrop-clickable-zone, [data-testid="demo-mode-banner"], .global-toast-container, [role="alert"]').forEach((el) => el.remove());
  });

  const darkShot = path.join(OUT_DIR, "proof_mobile_patient_history_dark.png");
  await page.screenshot({ path: darkShot, fullPage: false });
  console.log("[Playwright] Saved Dark Mode Proof:", darkShot);

  // Scroll to action buttons and scans in Dark mode
  const actionsDarkEl = page.locator(".clinical-details-actions").first();
  if (await actionsDarkEl.count() > 0) {
    await actionsDarkEl.scrollIntoViewIfNeeded();
    await page.waitForTimeout(500);
    const darkDetailsShot = path.join(OUT_DIR, "proof_mobile_patient_history_details_dark.png");
    await page.screenshot({ path: darkDetailsShot, fullPage: false });
    console.log("[Playwright] Saved Dark Details Proof:", darkDetailsShot);
  }

  await browser.close();

  // Copy to BRAIN_DIR for orchestrator inspection
  if (fs.existsSync(BRAIN_DIR)) {
    const brainLight = path.join(BRAIN_DIR, "proof_mobile_patient_history_light.png");
    const brainDark = path.join(BRAIN_DIR, "proof_mobile_patient_history_dark.png");
    fs.copyFileSync(lightShot, brainLight);
    fs.copyFileSync(darkShot, brainDark);
    const lightDetails = path.join(OUT_DIR, "proof_mobile_patient_history_details_light.png");
    const darkDetails = path.join(OUT_DIR, "proof_mobile_patient_history_details_dark.png");
    if (fs.existsSync(lightDetails)) fs.copyFileSync(lightDetails, path.join(BRAIN_DIR, "proof_mobile_patient_history_details_light.png"));
    if (fs.existsSync(darkDetails)) fs.copyFileSync(darkDetails, path.join(BRAIN_DIR, "proof_mobile_patient_history_details_dark.png"));
    console.log("[Playwright] Copied screenshots to brain dir:", BRAIN_DIR);
  } else {
    console.log("[Playwright] Brain dir does not exist:", BRAIN_DIR);
  }

  console.log("[Playwright] Successfully completed mobile captures!");
}

captureMobilePatientHistoryProof().catch((err) => {
  console.error("[Playwright] Capture script failed:", err);
  process.exit(1);
});
