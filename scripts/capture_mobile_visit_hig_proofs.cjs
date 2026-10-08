/**
 * scripts/capture_mobile_visit_hig_proofs.cjs
 *
 * DENTE Dental CRM — Red Team Mobile HIG Screenshot Pipeline
 * Captures 390x844 real screenshots of Mobile Chairside Visit Workspace & Handoff Banner
 * in Light and Dark modes per Apple iOS HIG standard.
 */

const { chromium } = require("playwright");
const path = require("node:path");
const fs = require("node:fs");

const ARTIFACT_DIR = "C:\\Users\\Admin\\.gemini\\antigravity\\brain\\4ed8b1f4-6829-43a8-90e6-7f4f48494afc";
const DOCS_DIR = path.resolve(__dirname, "../docs/screenshots/inquisition_live");

async function capture() {
  fs.mkdirSync(ARTIFACT_DIR, { recursive: true });
  fs.mkdirSync(DOCS_DIR, { recursive: true });

  console.log(">>> Launching Chromium for Mobile HIG Proofs (390x844)...");
  const browser = await chromium.launch({
    channel: "chrome",
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });

  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    userAgent:
      "Mozilla/5.0 (iPhone; CPU iPhone OS 16_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.5 Mobile/15E148 Safari/604.1",
    isMobile: true,
    hasTouch: true,
    deviceScaleFactor: 2,
  });

  const page = await context.newPage();

  async function saveScreenshot(filename) {
    const p1 = path.join(ARTIFACT_DIR, filename);
    const p2 = path.join(DOCS_DIR, filename);
    await page.screenshot({ path: p1, fullPage: false });
    fs.copyFileSync(p1, p2);
    const sz = fs.statSync(p1).size;
    console.log(`[PROOF CAPTURED] ${filename} (${(sz / 1024).toFixed(1)} KB)`);
  }

  try {
    // ─── 1. MOBILE LIGHT: STEP 1 (COMPLAINTS & 1-ROW HUD) ───
    console.log(">>> Capturing Mobile Light Step 1...");
    await page.goto("http://127.0.0.1:5173/mobile_hig_preview.html?screen=chairside&theme=light&step=complaints&hideDevBar=1", {
      waitUntil: "networkidle",
      timeout: 30000,
    });
    await page.waitForSelector('[data-testid="mobile-chairside-workspace"]', { visible: true, timeout: 15000 });
    await page.waitForTimeout(600);
    await saveScreenshot("mobile_visit_light_step1_complaints.png");

    // ─── 2. MOBILE LIGHT: STEP 4 (TREATMENT PLAN HANDOFF BANNER & FLOATING CTA) ───
    console.log(">>> Capturing Mobile Light Step 4 (Handoff Banner)...");
    await page.goto("http://127.0.0.1:5173/mobile_hig_preview.html?screen=chairside&theme=light&step=treatment&hideDevBar=1", {
      waitUntil: "networkidle",
      timeout: 30000,
    });
    await page.waitForSelector('[data-testid="visit-treatment-plan-handoff-banner"]', { visible: true, timeout: 15000 });
    await page.waitForSelector('[data-testid="mobile-chairside-workspace-bottom-take-stage-btn"]', { visible: true, timeout: 15000 });
    await page.waitForTimeout(600);
    await saveScreenshot("mobile_visit_light_step4_handoff.png");

    // ─── 3. MOBILE LIGHT: STEP 2 (TOOTH BOTTOM SHEET) ───
    console.log(">>> Capturing Mobile Light Tooth Bottom Sheet...");
    await page.goto("http://127.0.0.1:5173/mobile_hig_preview.html?screen=chairside&theme=light&step=exam&hideDevBar=1", {
      waitUntil: "networkidle",
      timeout: 30000,
    });
    await page.waitForSelector('[data-testid="mobile-chairside-workspace-tooth-tile-16"]', { visible: true, timeout: 15000 });
    await page.click('[data-testid="mobile-chairside-workspace-tooth-tile-16"]');
    await page.waitForSelector('[data-testid="mobile-chairside-workspace-tooth-sheet"]', { visible: true, timeout: 15000 });
    await page.waitForTimeout(500);
    await saveScreenshot("mobile_visit_light_tooth_bottom_sheet.png");

    // ─── 4. MOBILE LIGHT: STEP 5 (BILLING & CHECKOUT CTA) ───
    console.log(">>> Capturing Mobile Light Step 5 Checkout...");
    await page.goto("http://127.0.0.1:5173/mobile_hig_preview.html?screen=chairside&theme=light&step=checkout&hideDevBar=1", {
      waitUntil: "networkidle",
      timeout: 30000,
    });
    await page.waitForSelector('[data-testid="mobile-chairside-workspace-billing-total"]', { visible: true, timeout: 15000 });
    await page.waitForTimeout(600);
    await saveScreenshot("mobile_visit_light_step5_checkout.png");

    // ─── 5. MOBILE DARK: STEP 4 (HANDOFF BANNER IN DARK MODE) ───
    console.log(">>> Capturing Mobile Dark Step 4 (Handoff Banner)...");
    await page.goto("http://127.0.0.1:5173/mobile_hig_preview.html?screen=chairside&theme=dark&step=treatment&hideDevBar=1", {
      waitUntil: "networkidle",
      timeout: 30000,
    });
    await page.waitForSelector('[data-testid="visit-treatment-plan-handoff-banner"]', { visible: true, timeout: 15000 });
    await page.waitForSelector('[data-testid="mobile-chairside-workspace-bottom-take-stage-btn"]', { visible: true, timeout: 15000 });
    await page.waitForTimeout(600);
    await saveScreenshot("mobile_visit_dark_step4_handoff.png");

    // ─── 6. MOBILE DARK: FINAL CHECKOUT SHEET ───
    console.log(">>> Capturing Mobile Dark Checkout Bottom Sheet...");
    await page.goto("http://127.0.0.1:5173/mobile_hig_preview.html?screen=chairside&theme=dark&step=checkout&hideDevBar=1", {
      waitUntil: "networkidle",
      timeout: 30000,
    });
    await page.waitForSelector('[data-testid="mobile-chairside-workspace-primary-cta-btn"]', { visible: true, timeout: 15000 });
    await page.click('[data-testid="mobile-chairside-workspace-primary-cta-btn"]');
    await page.waitForSelector('[data-testid="mobile-chairside-workspace-final-checkout-sheet"]', { visible: true, timeout: 15000 });
    await page.waitForTimeout(500);
    await saveScreenshot("mobile_visit_dark_checkout_sheet.png");

    console.log(">>> ALL 6 PROOF SCREENSHOTS SUCCESSFULLY CAPTURED!");
  } finally {
    await browser.close();
  }
}

capture().catch((err) => {
  console.error("Capture failed:", err);
  process.exit(1);
});
