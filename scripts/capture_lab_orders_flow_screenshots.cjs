/**
 * scripts/capture_lab_orders_flow_screenshots.cjs
 *
 * Dedicated Red Team Inquisitor screenshot capture script using Puppeteer:
 * 1. DentalLabOrderModal (Light & Dark, 1440x900)
 * 2. DentalLabShadeSelector in DentalLabOrderModal (Light & Dark, 1440x900)
 * 3. Clinical photo attachment with shade guide (Light & Dark, 1440x900)
 * 4. DentalLabOrdersKanbanBoard with 5 columns (Light & Dark, 1440x900)
 */

const puppeteer = require("puppeteer");
const path = require("node:path");
const fs = require("node:fs");

const OUTPUT_DIRS = [
  path.resolve("C:/Clinic_MVP/dental-crm/apps/web/public/screenshots/lab_orders_flow"),
  path.resolve("C:/Users/Admin/.gemini/antigravity/brain/df880520-dc90-48e7-ab9e-032bd60d9f31"),
];

for (const dir of OUTPUT_DIRS) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function suppressOverlays(page) {
  await page.evaluate(() => {
    const style = document.createElement("style");
    style.id = "suppress-all-tour-overlays";
    style.innerHTML = `
      .tour-spotlight-root,
      .tour-backdrop-clickable-zone,
      [data-testid="guided-tour-spotlight-overlay"],
      [data-testid="guided-tour-coach-mark-card"],
      .shepherd-element {
        display: none !important;
        pointer-events: none !important;
        opacity: 0 !important;
      }
    `;
    document.head.appendChild(style);
  });
}

async function takeProof(page, filename, description) {
  const primaryPath = path.join(OUTPUT_DIRS[0], filename);
  await page.screenshot({ path: primaryPath, fullPage: false });
  const stat = fs.statSync(primaryPath);
  if (stat.size < 20000) {
    throw new Error(`[BLANK DETECTED] Screenshot ${filename} is only ${stat.size} bytes!`);
  }
  console.log(`[PROOF CAPTURED] ${filename} (${stat.size} bytes) -> ${description}`);

  // Copy to secondary directories
  for (let i = 1; i < OUTPUT_DIRS.length; i++) {
    const secondaryPath = path.join(OUTPUT_DIRS[i], filename);
    fs.copyFileSync(primaryPath, secondaryPath);
  }
}

async function loadPage(page, url, requiredSelector = '#root > div') {
  await page.goto(url, { waitUntil: "domcontentloaded", timeout: 30000 });
  await page.waitForSelector(requiredSelector, { timeout: 15000 });
  await sleep(1000);
  await suppressOverlays(page);
  await sleep(500);
}

async function main() {
  console.log("=== STARTING DENTAL LAB ORDERS & REMAKES FLOW SCREENSHOT RUNNER (ZERO BLANK TOLERANCE) ===");
  const browser = await puppeteer.launch({
    headless: "new",
    executablePath: "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });

  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 1440, height: 900 });

    // ─── 1. MODAL MAIN TAB (LIGHT) ──────────────────────────────────────────
    console.log(">>> 1. Capturing DentalLabOrderModal (Main Specs Light)...");
    await loadPage(page, "http://127.0.0.1:5173/lab_orders_preview.html?tab=modal&theme=light", '[data-testid="lab-order-modal"], [data-testid="lab-order-modal-close-btn"]');
    await page.evaluate(() => {
      const scrollEl = document.querySelector('div.flex-1.min-h-0.overflow-y-auto');
      if (scrollEl) scrollEl.scrollTop = 0;
    });
    await sleep(400);
    await takeProof(
      page,
      "lab_order_modal_light.png",
      "DentalLabOrderModal (Light 1440x900): Odontogram tooth selection, Katana ML ZrO2 material, express presets, doctor clinical override"
    );

    // ─── 2. MODAL MAIN TAB (DARK) ───────────────────────────────────────────
    console.log(">>> 2. Capturing DentalLabOrderModal (Main Specs Dark)...");
    await loadPage(page, "http://127.0.0.1:5173/lab_orders_preview.html?tab=modal&theme=dark", '[data-testid="lab-order-modal"], [data-testid="lab-order-modal-close-btn"]');
    await page.evaluate(() => {
      const scrollEl = document.querySelector('div.flex-1.min-h-0.overflow-y-auto');
      if (scrollEl) scrollEl.scrollTop = 0;
    });
    await sleep(400);
    await takeProof(
      page,
      "lab_order_modal_dark.png",
      "DentalLabOrderModal (Dark 1440x900): Odontogram tooth selection, Katana ML ZrO2 material, express presets, doctor clinical override"
    );

    // ─── 3. MODAL SHADES TAB (LIGHT) ────────────────────────────────────────
    console.log(">>> 3. Capturing DentalLabOrderModal (VITA Shades Light)...");
    await loadPage(page, "http://127.0.0.1:5173/lab_orders_preview.html?tab=modal_shades&theme=light", '[data-testid="3zone-stratification-container"], [data-testid="shade-system-classical-btn"]');
    await page.evaluate(() => {
      const scrollEl = document.querySelector('div.flex-1.min-h-0.overflow-y-auto');
      if (scrollEl) scrollEl.scrollTop = 0;
    });
    await sleep(400);
    await takeProof(
      page,
      "lab_order_shades_light.png",
      "DentalLabOrderModal Shades Tab (Light 1440x900): VITA Classical/3D-Master palette, 3-zone stratification, Natural Die ND2 stump"
    );

    // Scroll to bottom for photo attachment card (Light)
    await page.evaluate(() => {
      const scrollEl = document.querySelector('div.flex-1.min-h-0.overflow-y-auto');
      if (scrollEl) scrollEl.scrollTop = scrollEl.scrollHeight;
    });
    await sleep(500);
    await takeProof(
      page,
      "lab_order_shades_photo_light.png",
      "DentalLabOrderModal Shades Tab (Light 1440x900): Clinical photo attachment with shade guide, translucency, and mamelons"
    );

    // ─── 4. MODAL SHADES TAB (DARK) ─────────────────────────────────────────
    console.log(">>> 4. Capturing DentalLabOrderModal (VITA Shades Dark)...");
    await loadPage(page, "http://127.0.0.1:5173/lab_orders_preview.html?tab=modal_shades&theme=dark", '[data-testid="3zone-stratification-container"], [data-testid="shade-system-classical-btn"]');
    await page.evaluate(() => {
      const scrollEl = document.querySelector('div.flex-1.min-h-0.overflow-y-auto');
      if (scrollEl) scrollEl.scrollTop = 0;
    });
    await sleep(400);
    await takeProof(
      page,
      "lab_order_shades_dark.png",
      "DentalLabOrderModal Shades Tab (Dark 1440x900): VITA Classical/3D-Master palette, 3-zone stratification, Natural Die ND2 stump"
    );

    // Scroll to bottom for photo attachment card (Dark)
    await page.evaluate(() => {
      const scrollEl = document.querySelector('div.flex-1.min-h-0.overflow-y-auto');
      if (scrollEl) scrollEl.scrollTop = scrollEl.scrollHeight;
    });
    await sleep(500);
    await takeProof(
      page,
      "lab_order_shades_photo_dark.png",
      "DentalLabOrderModal Shades Tab (Dark 1440x900): Clinical photo attachment with shade guide, translucency, and mamelons"
    );

    // ─── 5. KANBAN BOARD (LIGHT) ────────────────────────────────────────────
    console.log(">>> 5. Capturing DentalLabOrdersKanbanBoard (Workflow & Warranty Remakes Light)...");
    await loadPage(page, "http://127.0.0.1:5173/lab_orders_preview.html?tab=kanban&theme=light", '.ztl-kanban-board, .ztl-kanban-column');
    await takeProof(
      page,
      "lab_kanban_light.png",
      "DentalLabOrdersKanbanBoard (Light 1440x900): 4 clinical columns + warranty rework column (0 ₽ for patient upon lab defect)"
    );

    // ─── 6. KANBAN BOARD (DARK) ─────────────────────────────────────────────
    console.log(">>> 6. Capturing DentalLabOrdersKanbanBoard (Workflow & Warranty Remakes Dark)...");
    await loadPage(page, "http://127.0.0.1:5173/lab_orders_preview.html?tab=kanban&theme=dark", '.ztl-kanban-board, .ztl-kanban-column');
    await takeProof(
      page,
      "lab_kanban_dark.png",
      "DentalLabOrdersKanbanBoard (Dark 1440x900): 4 clinical columns + warranty rework column (0 ₽ for patient upon lab defect)"
    );

    console.log("\n=======================================================");
    console.log("ALL ZTL LAB ORDERS SCREENSHOTS CAPTURED WITH 100% SUCCESS!");
    console.log("=======================================================\n");
  } finally {
    await browser.close();
  }
}

main().catch((err) => {
  console.error("Screenshot runner failed:", err);
  process.exit(1);
});
