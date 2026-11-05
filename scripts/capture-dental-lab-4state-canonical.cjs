const { chromium } = require("playwright");
const path = require("node:path");
const fs = require("node:fs");

async function captureDentalLab4State() {
  const proofsDir = path.resolve(__dirname, "../docs/proofs/dental_lab");
  const proofsDirAlt = path.resolve(__dirname, "../docs/proofs/lab");
  fs.mkdirSync(proofsDir, { recursive: true });
  fs.mkdirSync(proofsDirAlt, { recursive: true });

  console.log("=== Launching Playwright for 4-State Dental Lab Proofs ===");
  const browser = await chromium.launch({
    channel: "chrome",
    headless: true,
    args: ["--no-sandbox", "--disable-gpu", "--disable-dev-shm-usage"],
  });

  try {
    // ═══════════════════════════════════════════════════════════════════════
    // 1. PC 1440x900 (LIGHT & DARK)
    // ═══════════════════════════════════════════════════════════════════════
    const desktopContext = await browser.newContext({
      viewport: { width: 1440, height: 900 },
      deviceScaleFactor: 1,
    });

    // 1.1 PC Light
    console.log("Capturing 01_lab_orders_pc_light.png...");
    const pcLightPage = await desktopContext.newPage();
    await pcLightPage.goto("http://127.0.0.1:5173/lab-preview.html?view=studio&theme=light", {
      waitUntil: "networkidle",
      timeout: 30000,
    });
    await pcLightPage.waitForSelector('[data-testid="dental-lab-studio-modal-root"]', { timeout: 15000 });
    await pcLightPage.waitForTimeout(1000);

    const pcLightPath = path.join(proofsDir, "01_lab_orders_pc_light.png");
    await pcLightPage.screenshot({ path: pcLightPath, fullPage: false, animations: "disabled" });
    fs.copyFileSync(pcLightPath, path.join(proofsDirAlt, "01_lab_orders_pc_light.png"));
    console.log(`✓ Saved ${pcLightPath} (${(fs.statSync(pcLightPath).size / 1024).toFixed(1)} KB)`);

    // 1.2 PC Dark
    console.log("Capturing 02_lab_orders_pc_dark.png...");
    const pcDarkPage = await desktopContext.newPage();
    await pcDarkPage.goto("http://127.0.0.1:5173/lab-preview.html?view=studio&theme=dark", {
      waitUntil: "networkidle",
      timeout: 30000,
    });
    await pcDarkPage.waitForSelector('[data-testid="dental-lab-studio-modal-root"]', { timeout: 15000 });
    await pcDarkPage.waitForTimeout(1000);

    const pcDarkPath = path.join(proofsDir, "02_lab_orders_pc_dark.png");
    await pcDarkPage.screenshot({ path: pcDarkPath, fullPage: false, animations: "disabled" });
    fs.copyFileSync(pcDarkPath, path.join(proofsDirAlt, "02_lab_orders_pc_dark.png"));
    console.log(`✓ Saved ${pcDarkPath} (${(fs.statSync(pcDarkPath).size / 1024).toFixed(1)} KB)`);

    await desktopContext.close();

    // ═══════════════════════════════════════════════════════════════════════
    // 2. MOBILE 390x844 (LIGHT & DARK)
    // ═══════════════════════════════════════════════════════════════════════
    const mobileContext = await browser.newContext({
      viewport: { width: 390, height: 844 },
      deviceScaleFactor: 2,
      isMobile: true,
      hasTouch: true,
    });

    // 2.1 Mobile Light
    console.log("Capturing 03_lab_orders_mobile_light.png...");
    const mobileLightPage = await mobileContext.newPage();
    await mobileLightPage.goto("http://127.0.0.1:5173/lab-preview.html?view=studio&theme=light", {
      waitUntil: "networkidle",
      timeout: 30000,
    });
    await mobileLightPage.waitForSelector('[data-testid="dental-lab-studio-modal-root"]', { timeout: 15000 });
    await mobileLightPage.waitForTimeout(1000);

    const mobileLightPath = path.join(proofsDir, "03_lab_orders_mobile_light.png");
    await mobileLightPage.screenshot({ path: mobileLightPath, fullPage: false, animations: "disabled" });
    fs.copyFileSync(mobileLightPath, path.join(proofsDirAlt, "03_lab_orders_mobile_light.png"));
    console.log(`✓ Saved ${mobileLightPath} (${(fs.statSync(mobileLightPath).size / 1024).toFixed(1)} KB)`);

    // 2.2 Mobile Dark
    console.log("Capturing 04_lab_orders_mobile_dark.png...");
    const mobileDarkPage = await mobileContext.newPage();
    await mobileDarkPage.goto("http://127.0.0.1:5173/lab-preview.html?view=studio&theme=dark", {
      waitUntil: "networkidle",
      timeout: 30000,
    });
    await mobileDarkPage.waitForSelector('[data-testid="dental-lab-studio-modal-root"]', { timeout: 15000 });
    await mobileDarkPage.waitForTimeout(1000);

    const mobileDarkPath = path.join(proofsDir, "04_lab_orders_mobile_dark.png");
    await mobileDarkPage.screenshot({ path: mobileDarkPath, fullPage: false, animations: "disabled" });
    fs.copyFileSync(mobileDarkPath, path.join(proofsDirAlt, "04_lab_orders_mobile_dark.png"));
    console.log(`✓ Saved ${mobileDarkPath} (${(fs.statSync(mobileDarkPath).size / 1024).toFixed(1)} KB)`);

    // ═══════════════════════════════════════════════════════════════════════
    // 3. ORDER MODAL & EXPEDITION (LIGHT & DARK)
    // ═══════════════════════════════════════════════════════════════════════
    console.log("Capturing Order Modal states...");
    const modalLightPage = await desktopContext.newPage().catch(() => browser.newPage({ viewport: { width: 1440, height: 900 } }));
    await modalLightPage.goto("http://127.0.0.1:5173/lab-preview.html?view=modal&theme=light&tab=main", {
      waitUntil: "networkidle",
      timeout: 30000,
    });
    await modalLightPage.waitForSelector('[data-testid="lab-order-modal"]', { timeout: 15000 });
    await modalLightPage.waitForTimeout(1000);
    const modalLightPath = path.join(proofsDir, "05_lab_order_modal_pc_light.png");
    await modalLightPage.screenshot({ path: modalLightPath, fullPage: false, animations: "disabled" });
    fs.copyFileSync(modalLightPath, path.join(proofsDirAlt, "05_lab_order_modal_pc_light.png"));
    console.log(`✓ Saved ${modalLightPath} (${(fs.statSync(modalLightPath).size / 1024).toFixed(1)} KB)`);

    const modalDarkPage = await browser.newPage({ viewport: { width: 1440, height: 900 } });
    await modalDarkPage.goto("http://127.0.0.1:5173/lab-preview.html?view=modal&theme=dark&tab=main", {
      waitUntil: "networkidle",
      timeout: 30000,
    });
    await modalDarkPage.waitForSelector('[data-testid="lab-order-modal"]', { timeout: 15000 });
    await modalDarkPage.waitForTimeout(1000);
    const modalDarkPath = path.join(proofsDir, "06_lab_order_modal_pc_dark.png");
    await modalDarkPage.screenshot({ path: modalDarkPath, fullPage: false, animations: "disabled" });
    fs.copyFileSync(modalDarkPath, path.join(proofsDirAlt, "06_lab_order_modal_pc_dark.png"));
    console.log(`✓ Saved ${modalDarkPath} (${(fs.statSync(modalDarkPath).size / 1024).toFixed(1)} KB)`);

    await mobileContext.close();
    console.log("=== ALL CANONICAL 4-STATE DENTAL LAB PROOFS CAPTURED SUCCESSFULLY! ===");
  } finally {
    await browser.close();
  }
}

captureDentalLab4State().catch((err) => {
  console.error("FATAL in captureDentalLab4State:", err);
  process.exit(1);
});
