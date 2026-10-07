const { chromium } = require("playwright");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

async function capture() {
  const screenshotsDir = path.resolve(__dirname, "../screenshots");
  if (!fs.existsSync(screenshotsDir)) {
    fs.mkdirSync(screenshotsDir, { recursive: true });
  }

  // Attempt to launch browser with msedge channel, falling back to standard chromium
  let browser;
  try {
    browser = await chromium.launch({
      headless: true,
      channel: "msedge",
      args: ["--no-sandbox", "--disable-setuid-sandbox"],
    });
  } catch (e) {
    browser = await chromium.launch({
      headless: true,
      args: ["--no-sandbox", "--disable-setuid-sandbox"],
    });
  }

  try {
    const context = await browser.newContext({
      viewport: { width: 1440, height: 900 },
    });

    const page = await context.newPage();

    // 1. Light theme
    console.log("Navigating to PC Light preview...");
    await page.goto("http://127.0.0.1:5173/stage_booking_preview.html?theme=light", {
      waitUntil: "domcontentloaded",
    });

    await page.waitForSelector('[data-testid="stage-booking-banner"]', {
      timeout: 15000,
    });
    await page.waitForSelector('[data-testid="quick-booking-drawer"]', {
      timeout: 15000,
    });
    await page.waitForTimeout(1000);

    const lightPath = path.join(screenshotsDir, "stage_booking_drawer_pc_light.png");
    await page.screenshot({ path: lightPath });
    const lightStat = fs.statSync(lightPath);
    const lightHash = crypto.createHash("md5").update(fs.readFileSync(lightPath)).digest("hex");
    console.log(`Saved PC Light screenshot: ${lightPath} (${lightStat.size} bytes, MD5: ${lightHash})`);

    // 2. Dark theme
    console.log("Navigating to PC Dark preview...");
    await page.goto("http://127.0.0.1:5173/stage_booking_preview.html?theme=dark", {
      waitUntil: "domcontentloaded",
    });

    await page.waitForSelector('[data-testid="stage-booking-banner"]', {
      timeout: 15000,
    });
    await page.waitForSelector('[data-testid="quick-booking-drawer"]', {
      timeout: 15000,
    });
    await page.waitForTimeout(1000);

    const darkPath = path.join(screenshotsDir, "stage_booking_drawer_pc_dark.png");
    await page.screenshot({ path: darkPath });
    const darkStat = fs.statSync(darkPath);
    const darkHash = crypto.createHash("md5").update(fs.readFileSync(darkPath)).digest("hex");
    console.log(`Saved PC Dark screenshot: ${darkPath} (${darkStat.size} bytes, MD5: ${darkHash})`);

    if (lightStat.size < 40000 || darkStat.size < 40000) {
      throw new Error(`Screenshots too small: light=${lightStat.size}, dark=${darkStat.size}`);
    }

    if (lightHash === darkHash) {
      throw new Error("Light and Dark screenshots have identical MD5 hash! Theme was not rendered properly.");
    }

    console.log("Stage booking screenshot capture completed successfully with verified unique MD5 hashes!");
  } finally {
    await browser.close();
  }
}

capture().catch((err) => {
  console.error("Capture failed:", err);
  process.exit(1);
});
