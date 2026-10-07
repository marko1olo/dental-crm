const { chromium } = require("playwright");
const path = require("path");
const fs = require("fs");

const SCREENSHOTS_DIR = path.resolve(__dirname, "../screenshots");
const DOCS_SCREENSHOTS_DIR = path.resolve(__dirname, "../docs/screenshots");

if (!fs.existsSync(SCREENSHOTS_DIR)) fs.mkdirSync(SCREENSHOTS_DIR, { recursive: true });
if (!fs.existsSync(DOCS_SCREENSHOTS_DIR)) fs.mkdirSync(DOCS_SCREENSHOTS_DIR, { recursive: true });

async function main() {
  console.log(">>> Launching Edge via Playwright ({ channel: 'msedge' })...");
  const browser = await chromium.launch({
    channel: "msedge",
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });

  try {
    const screens = [
      {
        url: "http://127.0.0.1:5173/payment_modal_preview.html?theme=light",
        selector: '[data-testid="payment-modal-studio"]',
        filename: "payment_modal_pc_light.png",
      },
      {
        url: "http://127.0.0.1:5173/payment_modal_preview.html?theme=dark",
        selector: '[data-testid="payment-modal-studio"]',
        filename: "payment_modal_pc_dark.png",
      },
      {
        url: "http://127.0.0.1:5173/ortho_protocol_preview.html?theme=light",
        selector: '[data-testid="orthodontic-visit-protocol-widget"]',
        filename: "ortho_protocol_pc_light.png",
      },
      {
        url: "http://127.0.0.1:5173/ortho_protocol_preview.html?theme=dark",
        selector: '[data-testid="orthodontic-visit-protocol-widget"]',
        filename: "ortho_protocol_pc_dark.png",
      },
    ];

    for (const s of screens) {
      console.log(`>>> Capturing ${s.filename} at 1440x900...`);
      const context = await browser.newContext({
        viewport: { width: 1440, height: 900 },
        deviceScaleFactor: 1,
      });
      const page = await context.newPage();
      await page.goto(s.url, { waitUntil: "domcontentloaded", timeout: 30000 });
      await page.waitForSelector(s.selector, { state: "visible", timeout: 20000 });
      await page.waitForTimeout(1500);

      const primaryPath = path.join(SCREENSHOTS_DIR, s.filename);
      const docsPath = path.join(DOCS_SCREENSHOTS_DIR, s.filename);

      await page.screenshot({ path: primaryPath, fullPage: false });
      fs.copyFileSync(primaryPath, docsPath);

      const stats = fs.statSync(primaryPath);
      console.log(`✓ Saved ${s.filename} (${stats.size} bytes)`);
      if (stats.size < 40000) {
        throw new Error(`Screenshot ${s.filename} is too small: ${stats.size} bytes`);
      }
      await context.close();
    }
  } finally {
    await browser.close();
  }
  console.log(">>> ALL SCREENSHOTS CAPTURED SUCCESSFULLY!");
}

main().catch((err) => {
  console.error("FATAL screenshot capture failure:", err);
  process.exit(1);
});
