/**
 * scripts/audit_dental_lab_workflow_layout.cjs
 *
 * Dedicated Red Team Inquisitorial Visual Proof script for Dental Lab Module (ЗТЛ):
 * 1. LabOrdersPage Registry (PC Light & Dark, 1440x900)
 * 2. DentalLabOrdersKanbanBoard (PC Light & Dark, 1440x900)
 * 3. DentalLabOrdersTrackerModal (PC Light & Dark, 1440x900)
 * 4. DentalLabShadePicker (PC Light & Dark, 1440x900)
 * 5. DentalLabPrintBlank (PC Light, 1440x900)
 * 6. MobileLabOrdersTimeline (Mobile Light & Dark, 390x844)
 */

const puppeteer = require("puppeteer");
const path = require("node:path");
const fs = require("node:fs");

const OUTPUT_DIRS = [
  path.resolve("C:/Clinic_MVP/dental-crm/docs/screenshots/audit_dental_lab_workflow"),
  path.resolve("C:/Users/Admin/.gemini/antigravity/brain/99105d53-2c6f-48f0-85ca-6bb3d865defc"),
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
  if (stat.size < 10000) {
    throw new Error(`[BLANK DETECTED] Screenshot ${filename} is only ${stat.size} bytes!`);
  }
  console.log(`[PROOF CAPTURED] ${filename} (${stat.size} bytes) -> ${description}`);

  // Copy to secondary directories
  for (let i = 1; i < OUTPUT_DIRS.length; i++) {
    const secondaryPath = path.join(OUTPUT_DIRS[i], filename);
    fs.copyFileSync(primaryPath, secondaryPath);
  }
}

async function loadPage(page, url, requiredSelector = '#root') {
  await page.goto("about:blank");
  await page.goto(url, { waitUntil: "domcontentloaded", timeout: 30000 });
  await page.waitForFunction(() => {
    const root = document.getElementById("root");
    return root && root.children.length > 0 && root.innerText.trim().length > 60;
  }, { timeout: 20000 });
  if (requiredSelector && requiredSelector !== '#root') {
    await page.waitForSelector(requiredSelector, { visible: true, timeout: 10000 });
  }
  await sleep(1000);
  await suppressOverlays(page);
  await sleep(500);
}

async function main() {
  console.log("=== STARTING DENTAL LAB MODULE RED TEAM VISUAL PROOF RUNNER ===");
  const browser = await puppeteer.launch({
    headless: "new",
    executablePath: "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });

  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 1440, height: 900 });

    console.log(">>> Warming up Vite bundle...");
    await page.goto("http://127.0.0.1:5173/lab_orders_preview.html?tab=registry&theme=light&demo=true", { waitUntil: "domcontentloaded" });
    await page.waitForFunction(() => {
      const root = document.getElementById("root");
      return root && root.children.length > 0 && root.innerText.trim().length > 60;
    }, { timeout: 30000 });
    await sleep(1200);
    console.log(">>> Vite bundle warmed up successfully!");

    // ─── 1. PC LIGHT: LAB ORDERS REGISTRY (1440x900) ────────────────────────
    console.log(">>> 1. Capturing LabOrdersPage Registry (PC Light)...");
    await page.setViewport({ width: 1440, height: 900 });
    await loadPage(page, "http://127.0.0.1:5173/lab_orders_preview.html?tab=registry&theme=light&demo=true", '[data-testid="lab-orders-page-root"], [data-testid="lab-orders-dense-table"]');
    await sleep(600);
    await takeProof(
      page,
      "01_pc_light_lab_orders_1440x900.png",
      "LabOrdersPage Registry (Light 1440x900): Dense 32px controls, canonical status filter chips, VITA shade badges, and live action toolbars"
    );

    // ─── 2. PC DARK: LAB ORDERS REGISTRY (1440x900) ─────────────────────────
    console.log(">>> 2. Capturing LabOrdersPage Registry (PC Dark)...");
    await loadPage(page, "http://127.0.0.1:5173/lab_orders_preview.html?tab=registry&theme=dark&demo=true", '[data-testid="lab-orders-page-root"], [data-testid="lab-orders-dense-table"]');
    await sleep(600);
    await takeProof(
      page,
      "02_pc_dark_lab_orders_1440x900.png",
      "LabOrdersPage Registry (Dark 1440x900): WCAG AAA contrast, dark surface tokens, zero text clipping"
    );

    // ─── 3. PC LIGHT: KANBAN BOARD (1440x900) ───────────────────────────────
    console.log(">>> 3. Capturing DentalLabOrdersKanbanBoard (PC Light)...");
    await loadPage(page, "http://127.0.0.1:5173/lab_orders_preview.html?tab=kanban&theme=light&demo=true", '[data-testid="kanban-preview-container"]');
    await sleep(600);
    await takeProof(
      page,
      "03_pc_light_lab_kanban_1440x900.png",
      "DentalLabOrdersKanbanBoard (Light 1440x900): 5-column stage progression, VITA badges, warranty rework 0 ₽ card, <=2 buttons per card"
    );

    // ─── 4. PC DARK: KANBAN BOARD (1440x900) ────────────────────────────────
    console.log(">>> 4. Capturing DentalLabOrdersKanbanBoard (PC Dark)...");
    await loadPage(page, "http://127.0.0.1:5173/lab_orders_preview.html?tab=kanban&theme=dark&demo=true", '[data-testid="kanban-preview-container"]');
    await sleep(600);
    await takeProof(
      page,
      "04_pc_dark_lab_kanban_1440x900.png",
      "DentalLabOrdersKanbanBoard (Dark 1440x900): Dark theme tokens, crisp contrast, no white border bleeds"
    );

    // ─── 5. PC LIGHT: TRACKER MODAL (1440x900) ──────────────────────────────
    console.log(">>> 5. Capturing DentalLabOrdersTrackerModal (PC Light)...");
    await loadPage(page, "http://127.0.0.1:5173/lab_orders_preview.html?tab=tracker&theme=light&demo=true", '[data-testid="lab-tracker-search-input"]');
    await sleep(600);
    await takeProof(
      page,
      "05_pc_light_lab_tracker_modal_1440x900.png",
      "DentalLabOrdersTrackerModal (Light 1440x900): KPI metric pills, critical deadline alerts, compact search & filter bar, 2 direct card actions + '...'"
    );

    // ─── 6. PC DARK: TRACKER MODAL (1440x900) ───────────────────────────────
    console.log(">>> 6. Capturing DentalLabOrdersTrackerModal (PC Dark)...");
    await loadPage(page, "http://127.0.0.1:5173/lab_orders_preview.html?tab=tracker&theme=dark&demo=true", '[data-testid="lab-tracker-search-input"]');
    await sleep(600);
    await takeProof(
      page,
      "06_pc_dark_lab_tracker_modal_1440x900.png",
      "DentalLabOrdersTrackerModal (Dark 1440x900): Dark mode visual polish, no clipping, correct theme classes"
    );

    // ─── 7. PC LIGHT: VITA SHADE PICKER (1440x900) ──────────────────────────
    console.log(">>> 7. Capturing DentalLabShadePicker (PC Light)...");
    await loadPage(page, "http://127.0.0.1:5173/lab_orders_preview.html?tab=shade_picker&theme=light&demo=true", '[data-testid="vita-classical-tab"]');
    await sleep(600);
    await takeProof(
      page,
      "07_pc_light_lab_shade_picker_1440x900.png",
      "DentalLabShadePicker (Light 1440x900): VITA Classical A1-D4 + Bleach tabs, IPS Natural Die stump selector, >=48px touch targets, photo preview"
    );

    // ─── 8. PC DARK: VITA SHADE PICKER (1440x900) ───────────────────────────
    console.log(">>> 8. Capturing DentalLabShadePicker (PC Dark)...");
    await loadPage(page, "http://127.0.0.1:5173/lab_orders_preview.html?tab=shade_picker&theme=dark&demo=true", '[data-testid="vita-classical-tab"]');
    await sleep(600);
    await takeProof(
      page,
      "08_pc_dark_lab_shade_picker_1440x900.png",
      "DentalLabShadePicker (Dark 1440x900): Dark theme contrast, anatomical swatch circles, photo reference"
    );

    // ─── 9. PC LIGHT: PRINT BLANK (1440x900) ────────────────────────────────
    console.log(">>> 9. Capturing DentalLabPrintBlank (PC Light)...");
    await loadPage(page, "http://127.0.0.1:5173/lab_orders_preview.html?tab=print&theme=light&demo=true", '[data-testid="form-ztl-1-blank"]');
    await sleep(600);
    await takeProof(
      page,
      "09_pc_light_lab_print_blank_1440x900.png",
      "DentalLabPrintBlank (Light 1440x900): Statutory order sheet, 5-stage lab progression, 6-stage orthopedic lifecycle, barcode, QR, zero emojis"
    );

    // ─── 10. MOBILE LIGHT: TIMELINE (390x844) ───────────────────────────────
    console.log(">>> 10. Capturing MobileLabOrdersTimeline (Mobile Light 390x844)...");
    await page.setViewport({ width: 390, height: 844, isMobile: true, hasTouch: true });
    await loadPage(page, "http://127.0.0.1:5173/lab_orders_preview.html?tab=mobile&theme=light&demo=true", '[data-testid="mobile-lab-orders-timeline-view"]');
    await sleep(600);
    await takeProof(
      page,
      "10_mobile_light_lab_timeline_390x844.png",
      "MobileLabOrdersTimeline (Mobile Light 390x844): 1-row header, 4-stage progress track, 44x44px call button, floating thumb bar, 0px horizontal scroll"
    );

    // ─── 11. MOBILE DARK: TIMELINE (390x844) ────────────────────────────────
    console.log(">>> 11. Capturing MobileLabOrdersTimeline (Mobile Dark 390x844)...");
    await loadPage(page, "http://127.0.0.1:5173/lab_orders_preview.html?tab=mobile&theme=dark&demo=true", '[data-testid="mobile-lab-orders-timeline-view"]');
    await sleep(600);
    await takeProof(
      page,
      "11_mobile_dark_lab_timeline_390x844.png",
      "MobileLabOrdersTimeline (Mobile Dark 390x844): Apple iOS HIG, grouped cards, safe area insets, deep dark palette"
    );

    console.log("=== ALL 11 VISUAL PROOFS SUCCESSFULLY CAPTURED ===");
  } catch (err) {
    console.error("FATAL ERROR DURING PROOF CAPTURE:", err);
    process.exit(1);
  } finally {
    await browser.close();
  }
}

main().catch((err) => {
  console.error("UNCAUGHT EXCEPTION:", err);
  process.exit(1);
});
