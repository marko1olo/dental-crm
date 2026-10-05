/**
 * scripts/capture_dms_guarantee_split_screenshots.cjs
 * RED TEAM INQUISITOR: Capture 1440x900 PC Light & Dark screenshots of DMS Guarantee Letter & Split Bill Flow.
 */

const { chromium } = require("playwright");
const path = require("node:path");
const fs = require("node:fs");

async function main() {
  const dir1 = path.resolve(__dirname, "../apps/web/public/screenshots/insurance_flow");
  const dir2 = "C:\\Users\\Admin\\.gemini\\antigravity\\brain\\df880520-dc90-48e7-ab9e-032bd60d9f31";
  
  fs.mkdirSync(dir1, { recursive: true });
  try {
    fs.mkdirSync(dir2, { recursive: true });
  } catch (e) {
    console.log("Brain dir fallback note:", e.message);
  }

  console.log(">>> Launching Chromium for DMS Guarantee Split Visual Capture...");
  const browser = await chromium.launch({
    channel: "chrome",
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });

  try {
    const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });

    // ─── 1. PC LIGHT (1440x900) ───
    console.log(">>> Navigating to DMS Guarantee Split Preview (Light 1440x900)...");
    await page.goto("http://127.0.0.1:5173/dms_guarantee_split_preview.html?theme=light", {
      waitUntil: "networkidle",
      timeout: 30000,
    });

    await page.waitForSelector(".dms-modal-window", { visible: true, timeout: 15000 });
    await page.waitForTimeout(600);

    // 1. Scroll directly to Section 5: Bill Split Calculator
    await page.evaluate(() => {
      const calcHeader = Array.from(document.querySelectorAll("h3")).find((h) =>
        h.textContent && h.textContent.includes("5. Калькулятор")
      );
      if (calcHeader) {
        calcHeader.scrollIntoView({ behavior: "instant", block: "start" });
      }
    });
    await page.waitForTimeout(400);

    // 2. Click "Смешанная (Нал + Карта)" chip to show full split breakdown
    const mixedChip = await page.waitForSelector('button:has-text("Смешанная")', { timeout: 5000 });
    if (mixedChip) {
      await mixedChip.click();
    }
    await page.waitForTimeout(600);

    const lightPath1 = path.join(dir1, "dms_guarantee_split_light.png");
    const lightPath2 = path.join(dir2, "dms_guarantee_split_light.png");
    await page.screenshot({ path: lightPath1, fullPage: false });
    try {
      fs.copyFileSync(lightPath1, lightPath2);
    } catch (e) {
      console.log("Copy to brain dir skipped:", e.message);
    }
    console.log(`>>> Captured PC Light screenshot: ${lightPath1} (${fs.statSync(lightPath1).size} bytes)`);

    // ─── 2. PC DARK (1440x900) ───
    console.log(">>> Navigating to DMS Guarantee Split Preview (Dark 1440x900)...");
    await page.goto("http://127.0.0.1:5173/dms_guarantee_split_preview.html?theme=dark", {
      waitUntil: "networkidle",
      timeout: 30000,
    });

    await page.waitForSelector(".dms-modal-window", { visible: true, timeout: 15000 });
    await page.waitForTimeout(600);

    // 1. Scroll directly to Section 5 in Dark Mode
    await page.evaluate(() => {
      const calcHeader = Array.from(document.querySelectorAll("h3")).find((h) =>
        h.textContent && h.textContent.includes("5. Калькулятор")
      );
      if (calcHeader) {
        calcHeader.scrollIntoView({ behavior: "instant", block: "start" });
      }
    });
    await page.waitForTimeout(400);

    // 2. Click "Смешанная (Нал + Карта)" chip in Dark Mode
    const mixedChipDark = await page.waitForSelector('button:has-text("Смешанная")', { timeout: 5000 });
    if (mixedChipDark) {
      await mixedChipDark.click();
    }
    await page.waitForTimeout(600);

    const darkPath1 = path.join(dir1, "dms_guarantee_split_dark.png");
    const darkPath2 = path.join(dir2, "dms_guarantee_split_dark.png");
    await page.screenshot({ path: darkPath1, fullPage: false });
    try {
      fs.copyFileSync(darkPath1, darkPath2);
    } catch (e) {
      console.log("Copy to brain dir skipped:", e.message);
    }
    console.log(`>>> Captured PC Dark screenshot: ${darkPath1} (${fs.statSync(darkPath1).size} bytes)`);

    console.log(">>> DMS Guarantee & Bill Split Screenshots successfully captured!");
  } finally {
    await browser.close();
  }
}

main().catch((err) => {
  console.error("Screenshot capture failed:", err);
  process.exit(1);
});
