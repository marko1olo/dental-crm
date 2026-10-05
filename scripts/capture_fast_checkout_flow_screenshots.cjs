/**
 * scripts/capture_fast_checkout_flow_screenshots.cjs
 * RED TEAM INQUISITOR: Capture 1440x900 PC Light & Dark screenshots of Fast Checkout Multi-Split POS Flow.
 */

const { chromium } = require("playwright");
const path = require("node:path");
const fs = require("node:fs");

async function main() {
  const dir1 = path.resolve(__dirname, "../apps/web/public/screenshots/fast_checkout_flow");
  const dir2 = path.resolve(__dirname, "../docs/screenshots/inquisition_live");
  fs.mkdirSync(dir1, { recursive: true });
  fs.mkdirSync(dir2, { recursive: true });

  console.log(">>> Launching Chromium for Fast Checkout Visual Capture...");
  const browser = await chromium.launch({
    channel: "chrome",
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });

  try {
    const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });

    // ─── 1. PC LIGHT (1440x900) ───
    console.log(">>> Navigating to Fast Checkout Preview (Light 1440x900)...");
    await page.goto("http://127.0.0.1:5173/fast_checkout_preview.html?theme=light", {
      waitUntil: "networkidle",
      timeout: 30000,
    });

    const splitBtn = await page.waitForSelector('[data-testid="btn-checkout-split-three-way"]', {
      visible: true,
      timeout: 15000,
    });
    console.log(">>> Activating 3-way multi-split preset (Cash + Card + Deposit)...");
    await splitBtn.click();
    await page.waitForTimeout(500);

    // Scroll modal body to reveal the multi-split tender inputs & change calculator
    await page.evaluate(() => {
      const scrollable = document.querySelector('.overflow-y-auto');
      if (scrollable) {
        scrollable.scrollTop = 450;
      }
    });
    await page.waitForTimeout(800);

    const lightPath1 = path.join(dir1, "fast_checkout_split_modal_pc_light.png");
    const lightPath2 = path.join(dir2, "fast_checkout_split_modal_pc_light.png");
    await page.screenshot({ path: lightPath1, fullPage: false });
    fs.copyFileSync(lightPath1, lightPath2);
    console.log(`>>> Captured PC Light screenshot: ${lightPath1} (${fs.statSync(lightPath1).size} bytes)`);

    // ─── 2. PC DARK (1440x900) ───
    console.log(">>> Navigating to Fast Checkout Preview (Dark 1440x900)...");
    await page.goto("http://127.0.0.1:5173/fast_checkout_preview.html?theme=dark", {
      waitUntil: "networkidle",
      timeout: 30000,
    });

    const splitBtnDark = await page.waitForSelector('[data-testid="btn-checkout-split-three-way"]', {
      visible: true,
      timeout: 15000,
    });
    console.log(">>> Activating 3-way multi-split preset (Dark mode)...");
    await splitBtnDark.click();
    await page.waitForTimeout(500);

    // Scroll modal body to reveal the multi-split tender inputs & change calculator in dark mode
    await page.evaluate(() => {
      const scrollable = document.querySelector('.overflow-y-auto');
      if (scrollable) {
        scrollable.scrollTop = 450;
      }
    });
    await page.waitForTimeout(800);

    const darkPath1 = path.join(dir1, "fast_checkout_split_modal_pc_dark.png");
    const darkPath2 = path.join(dir2, "fast_checkout_split_modal_pc_dark.png");
    await page.screenshot({ path: darkPath1, fullPage: false });
    fs.copyFileSync(darkPath1, darkPath2);
    console.log(`>>> Captured PC Dark screenshot: ${darkPath1} (${fs.statSync(darkPath1).size} bytes)`);

    console.log(">>> Fast Checkout Flow Screenshots successfully captured!");
  } finally {
    await browser.close();
  }
}

main().catch((err) => {
  console.error("Screenshot capture failed:", err);
  process.exit(1);
});
