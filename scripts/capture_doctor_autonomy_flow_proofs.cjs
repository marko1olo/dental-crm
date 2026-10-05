/**
 * ═══════════════════════════════════════════════════════════════════════════
 * DENTE DENTAL CRM — DOCTOR AUTONOMY & CHAIRSIDE FLOW SCREENSHOT PROOFS
 * Mandate 8e: Doctor & Staff Autonomy (Zero Red Tape / No Blocking Disabled CTAs)
 * Red Team Visual Proof Gate: 1440x900 PC & 390x844 Mobile (Light & Dark)
 * ═══════════════════════════════════════════════════════════════════════════
 */

const { chromium } = require("playwright");
const fs = require("node:fs");
const path = require("node:path");

const DIRS = [
  path.resolve("C:/Clinic_MVP/dental-crm/apps/web/public/screenshots/doctor_autonomy"),
  path.resolve("C:/Clinic_MVP/dental-crm/docs/screenshots/doctor_autonomy"),
  path.resolve("C:/Users/Admin/.gemini/antigravity/brain/a9562fbb-35c1-4457-8b48-542acb752706"),
];

for (const dir of DIRS) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function saveProof(page, filename, description) {
  const primaryPath = path.join(DIRS[0], filename);
  await page.screenshot({ path: primaryPath, fullPage: false });
  const stat = fs.statSync(primaryPath);
  if (stat.size < 25000) {
    throw new Error(`[BLANK DETECTED] Screenshot ${filename} size is only ${stat.size} bytes`);
  }
  console.log(`[PROOF CAPTURED] ${filename} (${stat.size} bytes) -> ${description}`);

  for (let i = 1; i < DIRS.length; i++) {
    try {
      const copyPath = path.join(DIRS[i], filename);
      fs.copyFileSync(primaryPath, copyPath);
    } catch (err) {
      console.warn(`Could not copy to ${DIRS[i]}:`, err.message);
    }
  }
}

async function main() {
  console.log("=== LAUNCHING DOCTOR AUTONOMY FLOW PROOF HARVEST ===");

  const browser = await chromium.launch({
    headless: true,
    executablePath: "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
    args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-gpu", "--disable-dev-shm-usage"],
  });

  try {
    // ═════════════════════════════════════════════════════════════════════════
    // 1. PC 1440x900 SCREENS (Light & Dark)
    // ═════════════════════════════════════════════════════════════════════════
    const pcContext = await browser.newContext({
      viewport: { width: 1440, height: 900 },
      deviceScaleFactor: 1,
    });
    const pcPage = await pcContext.newPage();

    // 1.1 Express Booking (AppointmentModal) — Light
    console.log(">>> Capturing 01_schedule_express_booking_pc_light.png...");
    await pcPage.goto("http://127.0.0.1:5173/doctor_autonomy_preview.html?view=schedule_modal&theme=light", {
      waitUntil: "domcontentloaded",
      timeout: 30000,
    });
    await pcPage.waitForSelector('[data-testid="appointment-modal-cito-express-btn"]', { timeout: 15000 });
    await sleep(800);
    await saveProof(
      pcPage,
      "01_schedule_express_booking_pc_light.png",
      "Express Booking (PC Light 1440x900): 1-click '+ Аноним / Острая боль', zero required assistant/branch fields",
    );

    // 1.2 Express Booking (AppointmentModal) — Dark
    console.log(">>> Capturing 02_schedule_express_booking_pc_dark.png...");
    await pcPage.goto("http://127.0.0.1:5173/doctor_autonomy_preview.html?view=schedule_modal&theme=dark", {
      waitUntil: "domcontentloaded",
      timeout: 30000,
    });
    await pcPage.waitForSelector('[data-testid="appointment-modal-cito-express-btn"]', { timeout: 15000 });
    await sleep(800);
    await saveProof(
      pcPage,
      "02_schedule_express_booking_pc_dark.png",
      "Express Booking (PC Dark 1440x900): Dark theme, high contrast CITO buttons, zero dead ends",
    );

    // 1.3 EMK Physiological Norm 1-Click — Light
    console.log(">>> Capturing 03_emk_physiological_norm_pc_light.png...");
    await pcPage.goto("http://127.0.0.1:5173/doctor_autonomy_preview.html?view=emk_toolbar&theme=light", {
      waitUntil: "domcontentloaded",
      timeout: 30000,
    });
    await pcPage.waitForSelector('[data-testid="btn-chairside-physiological-norm"]', { timeout: 15000 });
    // Click the 1-click norm button to show physiological norm filled
    await pcPage.click('[data-testid="btn-chairside-physiological-norm"]');
    await sleep(800);
    await saveProof(
      pcPage,
      "03_emk_physiological_norm_pc_light.png",
      "EMK Physiological Norm (PC Light 1440x900): 1-click '✓ Соматически здоров / Норма' active, non-blocking finish CTA",
    );

    // 1.4 EMK Physiological Norm 1-Click — Dark
    console.log(">>> Capturing 04_emk_physiological_norm_pc_dark.png...");
    await pcPage.goto("http://127.0.0.1:5173/doctor_autonomy_preview.html?view=emk_toolbar&theme=dark", {
      waitUntil: "domcontentloaded",
      timeout: 30000,
    });
    await pcPage.waitForSelector('[data-testid="btn-chairside-physiological-norm"]', { timeout: 15000 });
    await pcPage.click('[data-testid="btn-chairside-physiological-norm"]');
    await sleep(800);
    await saveProof(
      pcPage,
      "04_emk_physiological_norm_pc_dark.png",
      "EMK Physiological Norm (PC Dark 1440x900): Dark clinical theme, autosave active, zero glare",
    );

    // 1.5 Fast Checkout 54-FZ — Light
    console.log(">>> Capturing 07_fast_checkout_54fz_pc_light.png...");
    await pcPage.goto("http://127.0.0.1:5173/fast_checkout_preview.html?theme=light", {
      waitUntil: "domcontentloaded",
      timeout: 30000,
    });
    await pcPage.waitForSelector('[data-testid="fast-checkout-modal"]', { timeout: 15000 });
    await sleep(800);
    await saveProof(
      pcPage,
      "07_fast_checkout_54fz_pc_light.png",
      "Fast Checkout 54-FZ (PC Light 1440x900): Physical person payment without mandatory INN, split methods, 100% warranty",
    );

    // 1.6 Fast Checkout 54-FZ — Dark
    console.log(">>> Capturing 08_fast_checkout_54fz_pc_dark.png...");
    await pcPage.goto("http://127.0.0.1:5173/fast_checkout_preview.html?theme=dark", {
      waitUntil: "domcontentloaded",
      timeout: 30000,
    });
    await pcPage.waitForSelector('[data-testid="fast-checkout-modal"]', { timeout: 15000 });
    await sleep(800);
    await saveProof(
      pcPage,
      "08_fast_checkout_54fz_pc_dark.png",
      "Fast Checkout 54-FZ (PC Dark 1440x900): POS ledger in dark mode with multi-tender support",
    );

    await pcPage.close();
    await pcContext.close();

    // ═════════════════════════════════════════════════════════════════════════
    // 2. MOBILE 390x844 SCREENS (Light & Dark)
    // ═════════════════════════════════════════════════════════════════════════
    const mobileContext = await browser.newContext({
      viewport: { width: 390, height: 844 },
      deviceScaleFactor: 2,
      isMobile: true,
      hasTouch: true,
      userAgent:
        "Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Mobile/15E148 Safari/604.1",
    });
    const mobilePage = await mobileContext.newPage();

    // 2.1 Mobile Chairside EHR — Light
    console.log(">>> Capturing 05_mobile_chairside_visit_light.png...");
    await mobilePage.goto(
      "http://127.0.0.1:5173/mobile_hig_preview.html?screen=chairside&theme=light&hideDevBar=1",
      { waitUntil: "networkidle", timeout: 30000 },
    );
    await mobilePage.waitForSelector('[data-testid="mobile-chairside-workspace"]', { timeout: 15000 });
    await sleep(800);
    await saveProof(
      mobilePage,
      "05_mobile_chairside_visit_light.png",
      "Mobile Chairside EHR (Mobile Light 390x844): Touch targets >= 44x44px, Q1-Q4 quadrants, Floating Bottom Bar in Thumb Zone",
    );

    // 2.2 Mobile Chairside EHR — Dark
    console.log(">>> Capturing 06_mobile_chairside_visit_dark.png...");
    await mobilePage.goto(
      "http://127.0.0.1:5173/mobile_hig_preview.html?screen=chairside&theme=dark&hideDevBar=1",
      { waitUntil: "networkidle", timeout: 30000 },
    );
    await mobilePage.waitForSelector('[data-testid="mobile-chairside-workspace"]', { timeout: 15000 });
    await sleep(800);
    await saveProof(
      mobilePage,
      "06_mobile_chairside_visit_dark.png",
      "Mobile Chairside EHR (Mobile Dark 390x844): Dark OLED theme, touch targets >= 44x44px, Floating Bottom Bar",
    );

    // 2.3 Mobile Fast Checkout — Light
    console.log(">>> Capturing 09_mobile_fast_checkout_light.png...");
    await mobilePage.goto(
      "http://127.0.0.1:5173/fast_checkout_preview.html?theme=light",
      { waitUntil: "domcontentloaded", timeout: 30000 },
    );
    await mobilePage.waitForSelector('[data-testid="fast-checkout-modal"]', { timeout: 15000 });
    await sleep(800);
    await saveProof(
      mobilePage,
      "09_mobile_fast_checkout_light.png",
      "Mobile Fast Checkout (Mobile Light 390x844): Responsive POS drawer, big payment buttons, zero INN friction",
    );

    // 2.4 Mobile Fast Checkout — Dark
    console.log(">>> Capturing 10_mobile_fast_checkout_dark.png...");
    await mobilePage.goto(
      "http://127.0.0.1:5173/fast_checkout_preview.html?theme=dark",
      { waitUntil: "domcontentloaded", timeout: 30000 },
    );
    await mobilePage.waitForSelector('[data-testid="fast-checkout-modal"]', { timeout: 15000 });
    await sleep(800);
    await saveProof(
      mobilePage,
      "10_mobile_fast_checkout_dark.png",
      "Mobile Fast Checkout (Mobile Dark 390x844): Dark POS drawer, full 54-FZ compliance without red tape",
    );

    await mobilePage.close();
    await mobileContext.close();

    console.log("=== ALL 10 PROOFS CAPTURED SUCCESSFULLY ===");
  } finally {
    await browser.close();
  }
}

main().catch((err) => {
  console.error("FATAL ERROR in capture runner:", err);
  process.exit(1);
});
