const { chromium } = require("playwright");
const path = require("node:path");
const fs = require("node:fs");

const ARTIFACTS_DIR = "C:/Users/Admin/.gemini/antigravity/brain/f64e7778-5470-452e-8804-8aebe88a7027";

async function main() {
  console.log("Launching Playwright to capture fixed lab_orders_preview header...");
  fs.mkdirSync(ARTIFACTS_DIR, { recursive: true });

  const browser = await chromium.launch({
    channel: "chrome",
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox"]
  });

  try {
    const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });

    // 1. Light theme capture
    console.log("Navigating to lab_orders_preview.html?theme=light&tab=kanban ...");
    await page.goto("http://127.0.0.1:5173/lab_orders_preview.html?theme=light&tab=kanban", {
      waitUntil: "networkidle",
      timeout: 15000
    });
    await page.waitForTimeout(1000);

    const lightPath = path.join(ARTIFACTS_DIR, "fixed_lab_orders_header_light.png");
    // Capture header specifically to show the buttons close-up
    const header = await page.$("header");
    if (header) {
      await header.screenshot({ path: lightPath });
      console.log("Captured header light:", lightPath);
    } else {
      await page.screenshot({ path: lightPath, clip: { x: 0, y: 0, width: 1440, height: 200 } });
    }

    // 2. Dark theme capture
    console.log("Navigating to lab_orders_preview.html?theme=dark&tab=kanban ...");
    await page.goto("http://127.0.0.1:5173/lab_orders_preview.html?theme=dark&tab=kanban", {
      waitUntil: "networkidle",
      timeout: 15000
    });
    await page.waitForTimeout(1000);

    const darkPath = path.join(ARTIFACTS_DIR, "fixed_lab_orders_header_dark.png");
    const headerDark = await page.$("header");
    if (headerDark) {
      await headerDark.screenshot({ path: darkPath });
      console.log("Captured header dark:", darkPath);
    } else {
      await page.screenshot({ path: darkPath, clip: { x: 0, y: 0, width: 1440, height: 200 } });
    }

    console.log("SUCCESS");
  } finally {
    await browser.close();
  }
}

main().catch(err => {
  console.error("CAPTURE ERROR:", err);
  process.exit(1);
});
