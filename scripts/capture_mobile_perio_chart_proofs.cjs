/**
 * scripts/capture_mobile_perio_chart_proofs.cjs
 *
 * Dedicated Mobile Periodontogram Florida Probe Apple HIG Screenshot Proof Runner.
 * Viewport: 390x844 (iPhone 13/14/15/16 standard).
 * Captures:
 * 1. docs/screenshots/inquisition_live/proof_mobile_perio_chart_light.png
 * 2. docs/screenshots/inquisition_live/proof_mobile_perio_chart_dark.png
 * Copies to parent brain directory:
 * C:/Users/Admin/.gemini/antigravity/brain/beb92312-c6d7-426d-a438-12dcad022abc/
 */

const { chromium } = require("playwright");
const path = require("node:path");
const fs = require("node:fs");
const crypto = require("node:crypto");

const targetDirs = [
  path.resolve("docs/screenshots/inquisition_live"),
  "C:/Users/Admin/.gemini/antigravity/brain/beb92312-c6d7-426d-a438-12dcad022abc",
];

for (const d of targetDirs) {
  if (!fs.existsSync(d)) {
    try {
      fs.mkdirSync(d, { recursive: true });
    } catch (_) {}
  }
}

async function saveProof(page, fileName, description = "") {
  let mainBuffer = null;
  for (const dir of targetDirs) {
    const fullPath = path.join(dir, fileName);
    if (!mainBuffer) {
      mainBuffer = await page.screenshot({ fullPage: false, animations: "disabled", timeout: 25000 });
    }
    fs.writeFileSync(fullPath, mainBuffer);
    const stats = fs.statSync(fullPath);
    const md5 = crypto.createHash("md5").update(mainBuffer).digest("hex");
    console.log(`[SAVED] ${fullPath} (${(stats.size / 1024).toFixed(1)} KB, MD5: ${md5}) - ${description}`);
  }
}

async function getActiveBaseUrl() {
  for (const port of [5173, 5174]) {
    try {
      const res = await fetch(`http://127.0.0.1:${port}/surgery_cockpit_preview.html`);
      if (res.ok) return `http://127.0.0.1:${port}`;
    } catch (_) {}
  }
  return "http://127.0.0.1:5173";
}

async function run() {
  console.log("=== MOBILE PERIODONTOGRAM APPLE HIG SCREENSHOT SUITE (390x844) ===");
  const baseUrl = await getActiveBaseUrl();
  console.log(`Using base URL: ${baseUrl}`);

  const browser = await chromium.launch({
    executablePath: "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });

  try {
    const mobileContext = await browser.newContext({
      viewport: { width: 390, height: 844 },
      deviceScaleFactor: 2,
      isMobile: true,
      hasTouch: true,
    });

    const mPage = await mobileContext.newPage();
    mPage.on("console", (msg) => {
      const txt = msg.text();
      if (txt.includes("ERROR") || txt.includes("FAIL")) {
        console.log(`[mPage console]: ${txt}`);
      }
    });

    // 1. Light Mode
    console.log(`Navigating to ${baseUrl}/surgery_cockpit_preview.html?view=perio&theme=light ...`);
    await mPage.goto(`${baseUrl}/surgery_cockpit_preview.html?view=perio&theme=light`, {
      waitUntil: "domcontentloaded",
      timeout: 30000,
    });

    try {
      await mPage.waitForSelector('[data-testid="interactive-periodontogram"]', { timeout: 15000 });
    } catch {
      await mPage.waitForTimeout(3000);
    }
    await mPage.waitForTimeout(1000);

    // Select Tooth 16 and a probing site for optimal clinical showcase
    await mPage.evaluate(() => {
      const tooth16Btn = document.querySelector('[data-testid="perio-quadrant-tooth-16"]');
      if (tooth16Btn) tooth16Btn.click();
    });
    await mPage.waitForTimeout(400);

    // Check horizontal drift
    const scrollInfoLight = await mPage.evaluate(() => ({
      windowInnerWidth: window.innerWidth,
      docScrollWidth: document.documentElement.scrollWidth,
      bodyScrollWidth: document.body.scrollWidth,
    }));
    console.log("[DRIFT CHECK LIGHT]", scrollInfoLight);

    console.log("Capturing proof_mobile_perio_chart_light.png ...");
    await saveProof(mPage, "proof_mobile_perio_chart_light.png", "Mobile Light Periodontogram Florida Probe (390x844)");

    // 2. Dark Mode
    console.log(`Navigating to ${baseUrl}/surgery_cockpit_preview.html?view=perio&theme=dark ...`);
    await mPage.goto(`${baseUrl}/surgery_cockpit_preview.html?view=perio&theme=dark`, {
      waitUntil: "domcontentloaded",
      timeout: 30000,
    });

    try {
      await mPage.waitForSelector('[data-testid="interactive-periodontogram"]', { timeout: 15000 });
    } catch {
      await mPage.waitForTimeout(3000);
    }
    await mPage.waitForTimeout(1000);

    // Select Tooth 16
    await mPage.evaluate(() => {
      const tooth16Btn = document.querySelector('[data-testid="perio-quadrant-tooth-16"]');
      if (tooth16Btn) tooth16Btn.click();
    });
    await mPage.waitForTimeout(400);

    const scrollInfoDark = await mPage.evaluate(() => ({
      windowInnerWidth: window.innerWidth,
      docScrollWidth: document.documentElement.scrollWidth,
      bodyScrollWidth: document.body.scrollWidth,
    }));
    console.log("[DRIFT CHECK DARK]", scrollInfoDark);

    console.log("Capturing proof_mobile_perio_chart_dark.png ...");
    await saveProof(mPage, "proof_mobile_perio_chart_dark.png", "Mobile Dark Periodontogram Florida Probe (390x844)");

    await mobileContext.close();
    console.log("\n>>> MOBILE PERIODONTOGRAM HIG PROOFS CAPTURED SUCCESSFULLY! <<<");
  } finally {
    await browser.close();
  }
}

run().catch((err) => {
  console.error("Capture failed:", err);
  process.exit(1);
});
