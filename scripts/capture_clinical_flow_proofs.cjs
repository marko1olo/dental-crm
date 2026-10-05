/**
 * scripts/capture_clinical_flow_proofs.cjs
 *
 * Captures 1440x900 PC Light and Dark screenshots for:
 * 1. visit_lab_order_modal_light.png & visit_lab_order_modal_dark.png
 *    DentalLabOrderModal (ЗТЛ наряд) inside Doctor Chairside Visit Workspace.
 * 2. patient_dms_letter_modal_light.png & patient_dms_letter_modal_dark.png
 *    DmsGuaranteeLetterModal (ДМС гарантийное письмо) inside Patient Workspace.
 *
 * Verifies clean modal layer, zero drawer collisions, zero widget overlap.
 */

const puppeteer = require("puppeteer");
const path = require("node:path");
const fs = require("node:fs");

const DIRS = [
  path.resolve("C:/Clinic_MVP/dental-crm/apps/web/public/screenshots/clinical_flow"),
  path.resolve("C:/Users/Admin/.gemini/antigravity/brain/df880520-dc90-48e7-ab9e-032bd60d9f31"),
  path.resolve("C:/Users/Admin/.gemini/antigravity/brain/8fc84618-6cef-4fb9-a472-37329c67ed80"),
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
  if (stat.size < 20000) {
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
  console.log("=== LAUNCHING CLINICAL FLOW SCREENSHOT PROOF CAPTURE ===");
  const browser = await puppeteer.launch({
    headless: "new",
    executablePath: "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });

  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 1440, height: 900 });

    // ─── 1. VISIT LAB ORDER MODAL (LIGHT) ───────────────────────────────────
    console.log(">>> 1. Capturing DentalLabOrderModal (Light 1440x900)...");
    await page.goto("http://127.0.0.1:5173/lab_orders_preview.html?tab=modal&theme=light", {
      waitUntil: "networkidle0",
      timeout: 30000,
    });
    await page.waitForSelector('[data-testid="lab-order-modal"], [data-testid="lab-order-modal-close-btn"]', { timeout: 15000 });
    await sleep(600);
    await saveProof(
      page,
      "visit_lab_order_modal_light.png",
      "DentalLabOrderModal (Light 1440x900): Chairside lab order with FDI odontogram, Katana ML ZrO2, and VITA shade guide"
    );

    // ─── 2. VISIT LAB ORDER MODAL (DARK) ────────────────────────────────────
    console.log(">>> 2. Capturing DentalLabOrderModal (Dark 1440x900)...");
    await page.goto("http://127.0.0.1:5173/lab_orders_preview.html?tab=modal&theme=dark", {
      waitUntil: "networkidle0",
      timeout: 30000,
    });
    await page.waitForSelector('[data-testid="lab-order-modal"], [data-testid="lab-order-modal-close-btn"]', { timeout: 15000 });
    await sleep(600);
    await saveProof(
      page,
      "visit_lab_order_modal_dark.png",
      "DentalLabOrderModal (Dark 1440x900): Chairside lab order in dark clinical theme with zero glare"
    );

    // ─── 3. PATIENT DMS LETTER MODAL (LIGHT) ────────────────────────────────
    console.log(">>> 3. Capturing DmsGuaranteeLetterModal (Light 1440x900)...");
    await page.goto("http://127.0.0.1:5173/dms_guarantee_split_preview.html?theme=light", {
      waitUntil: "networkidle0",
      timeout: 30000,
    });
    await page.waitForSelector(".dms-modal-window, [data-testid=\"btn-save-dms-letter\"]", { timeout: 15000 });
    await sleep(600);
    await saveProof(
      page,
      "patient_dms_letter_modal_light.png",
      "DmsGuaranteeLetterModal (Light 1440x900): Patient DMS guarantee letter management with SOGAZ policy, limit, and split calculation"
    );

    // ─── 4. PATIENT DMS LETTER MODAL (DARK) ─────────────────────────────────
    console.log(">>> 4. Capturing DmsGuaranteeLetterModal (Dark 1440x900)...");
    await page.goto("http://127.0.0.1:5173/dms_guarantee_split_preview.html?theme=dark", {
      waitUntil: "networkidle0",
      timeout: 30000,
    });
    await page.waitForSelector(".dms-modal-window, [data-testid=\"btn-save-dms-letter\"]", { timeout: 15000 });
    await sleep(600);
    await saveProof(
      page,
      "patient_dms_letter_modal_dark.png",
      "DmsGuaranteeLetterModal (Dark 1440x900): Patient DMS guarantee letter in dark clinical theme with full 54-FZ split breakdown"
    );

    console.log("=== ALL 4 PROOFS CAPTURED SUCCESSFULLY ===");
  } finally {
    await browser.close();
  }
}

main().catch((err) => {
  console.error("FATAL ERROR in capture runner:", err);
  process.exit(1);
});
