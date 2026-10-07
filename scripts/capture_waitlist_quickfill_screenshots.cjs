const { chromium } = require("playwright");
const fs = require("fs");
const path = require("path");

async function capture() {
  const screenshotsDir = path.resolve(__dirname, "../screenshots");
  if (!fs.existsSync(screenshotsDir)) {
    fs.mkdirSync(screenshotsDir, { recursive: true });
  }

  const browser = await chromium.launch({
    headless: true,
    channel: "msedge",
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });

  try {
    const context = await browser.newContext({
      viewport: { width: 1440, height: 900 },
    });

    const page = await context.newPage();

    // 1. Light theme
    console.log("Navigating to light preview...");
    await page.goto("http://127.0.0.1:5173/waitlist_quickfill_preview.html?theme=light", {
      waitUntil: "domcontentloaded",
    });

    await page.waitForSelector('[data-testid="waitlist-quickfill-modal"]', {
      timeout: 15000,
    });
    await page.waitForTimeout(1000);

    const lightPath = path.join(screenshotsDir, "waitlist_quickfill_modal_pc_light.png");
    await page.screenshot({ path: lightPath });
    const lightStat = fs.statSync(lightPath);
    console.log(`Saved PC Light screenshot: ${lightPath} (${lightStat.size} bytes)`);

    // 2. Dark theme
    console.log("Navigating to dark preview...");
    await page.goto("http://127.0.0.1:5173/waitlist_quickfill_preview.html?theme=dark", {
      waitUntil: "domcontentloaded",
    });

    await page.waitForSelector('[data-testid="waitlist-quickfill-modal"]', {
      timeout: 15000,
    });
    await page.waitForTimeout(1000);

    const darkPath = path.join(screenshotsDir, "waitlist_quickfill_modal_pc_dark.png");
    await page.screenshot({ path: darkPath });
    const darkStat = fs.statSync(darkPath);
    console.log(`Saved PC Dark screenshot: ${darkPath} (${darkStat.size} bytes)`);

    if (lightStat.size < 40000 || darkStat.size < 40000) {
      throw new Error(`Screenshots too small: light=${lightStat.size}, dark=${darkStat.size}`);
    }

    console.log("Capture completed successfully!");
  } finally {
    await browser.close();
  }
}

capture().catch((err) => {
  console.error("Capture failed:", err);
  process.exit(1);
});
