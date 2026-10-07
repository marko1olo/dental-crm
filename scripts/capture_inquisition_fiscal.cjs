const { chromium } = require("playwright");
const path = require("node:path");
const fs = require("node:fs");

async function run() {
  const outputDir = path.resolve(__dirname, "../docs/screenshots/inquisition_live");
  fs.mkdirSync(outputDir, { recursive: true });

  console.log(">>> Launching Chrome via Playwright...");
  const browser = await chromium.launch({
    channel: "chrome",
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });

  try {
    const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });

    // ─── 1. FAST CHECKOUT SPLIT MODAL PC LIGHT (1440x900) ───
    console.log(">>> Navigating to Fast Checkout Preview (Light 1440x900)...");
    await page.goto("http://127.0.0.1:5173/fast_checkout_preview.html?theme=light", {
      waitUntil: "domcontentloaded",
      timeout: 20000,
    });
    await page.waitForSelector('[data-testid="fast-checkout-modal"]', { timeout: 15000 });
    
    const split3Way = await page.$('[data-testid="btn-checkout-split-three-way"]');
    if (split3Way) {
      console.log(">>> Clicking 3-way multi-split preset (Cash + Card + Deposit)...");
      await split3Way.click();
      await page.waitForTimeout(600);
    }

    const lightPath = path.join(outputDir, "fast_checkout_split_modal_pc_light.png");
    await page.screenshot({ path: lightPath, fullPage: false });
    console.log(`>>> Captured PC Light screenshot: ${lightPath} (${fs.statSync(lightPath).size} bytes)`);

    // ─── 2. FAST CHECKOUT SPLIT MODAL PC DARK (1440x900) ───
    console.log(">>> Navigating to Fast Checkout Preview (Dark 1440x900)...");
    await page.goto("http://127.0.0.1:5173/fast_checkout_preview.html?theme=dark", {
      waitUntil: "domcontentloaded",
      timeout: 20000,
    });
    await page.waitForSelector('[data-testid="fast-checkout-modal"]', { timeout: 15000 });
    
    const split3WayDark = await page.$('[data-testid="btn-checkout-split-three-way"]');
    if (split3WayDark) {
      console.log(">>> Clicking 3-way multi-split preset (Dark mode)...");
      await split3WayDark.click();
      await page.waitForTimeout(600);
    }

    const darkPath = path.join(outputDir, "fast_checkout_split_modal_pc_dark.png");
    await page.screenshot({ path: darkPath, fullPage: false });
    console.log(`>>> Captured PC Dark screenshot: ${darkPath} (${fs.statSync(darkPath).size} bytes)`);

    // ─── 3. INVOICES REGISTRY PC LIGHT (1440x900) ───
    console.log(">>> Navigating to Invoices Registry Preview (Light 1440x900)...");
    await page.goto("http://127.0.0.1:5173/invoices_registry_preview.html?theme=light", {
      waitUntil: "domcontentloaded",
      timeout: 20000,
    });
    await page.waitForSelector('[data-testid="invoice-card-inv-offline-01"]', { timeout: 15000 });
    await page.waitForTimeout(600);

    const invLightPath = path.join(outputDir, "invoices_registry_pc_light.png");
    await page.screenshot({ path: invLightPath, fullPage: false });
    console.log(`>>> Captured Invoices Registry PC Light screenshot: ${invLightPath} (${fs.statSync(invLightPath).size} bytes)`);

    // ─── 4. INVOICES REGISTRY PC DARK (1440x900) ───
    console.log(">>> Navigating to Invoices Registry Preview (Dark 1440x900)...");
    await page.goto("http://127.0.0.1:5173/invoices_registry_preview.html?theme=dark", {
      waitUntil: "domcontentloaded",
      timeout: 20000,
    });
    await page.waitForSelector('[data-testid="invoice-card-inv-offline-01"]', { timeout: 15000 });
    await page.waitForTimeout(600);

    const invDarkPath = path.join(outputDir, "invoices_registry_pc_dark.png");
    await page.screenshot({ path: invDarkPath, fullPage: false });
    console.log(`>>> Captured Invoices Registry PC Dark screenshot: ${invDarkPath} (${fs.statSync(invDarkPath).size} bytes)`);

    console.log(">>> All 4 live audit screenshots successfully captured!");
  } finally {
    await browser.close();
  }
}

run().catch((err) => {
  console.error("Capture script error:", err);
  process.exit(1);
});
