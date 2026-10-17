const { chromium } = require("playwright");
const fs = require("node:fs");
const path = require("node:path");

const WEB_BASE = "http://127.0.0.1:5173";
const PREVIEW_URL = `${WEB_BASE}/clinical_hygiene_ortho_preview.html`;

const PROOFS_DIR = path.resolve(__dirname, "../docs/proofs/clinical_hygiene_ortho");
const SUBAGENT_BRAIN_DIR = path.resolve("C:/Users/Admin/.gemini/antigravity/brain/50bc9306-11bc-46b4-a5d4-e70c4242d0ae/proofs");
const CALLER_BRAIN_DIR = path.resolve("C:/Users/Admin/.gemini/antigravity/brain/cbe78645-8247-4a61-875e-c1cdb1eaea11/proofs");

fs.mkdirSync(PROOFS_DIR, { recursive: true });
fs.mkdirSync(SUBAGENT_BRAIN_DIR, { recursive: true });
fs.mkdirSync(CALLER_BRAIN_DIR, { recursive: true });

async function saveProof(page, fileName) {
  const p1 = path.join(PROOFS_DIR, fileName);
  await page.screenshot({ path: p1, fullPage: false });
  const p2 = path.join(SUBAGENT_BRAIN_DIR, fileName);
  fs.copyFileSync(p1, p2);
  const p3 = path.join(CALLER_BRAIN_DIR, fileName);
  fs.copyFileSync(p1, p3);

  const stats = fs.statSync(p1);
  console.log(`[PROOF CAPTURED] ${fileName} -> ${stats.size} bytes (${(stats.size / 1024).toFixed(1)} KB)`);
  if (stats.size < 20480) {
    throw new Error(`Screenshot ${fileName} is too small (${stats.size} bytes < 20KB)`);
  }
}

async function main() {
  const possibleBrowserPaths = [
    "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
    "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe",
    "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
    "C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe",
  ];
  const browserPath = possibleBrowserPaths.find((p) => fs.existsSync(p));
  console.log("Using browser:", browserPath);

  const browser = await chromium.launch({
    headless: true,
    executablePath: browserPath,
    args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-gpu"],
  });

  try {
    // 1. PC Light (1440x900)
    console.log("--- 1. Capturing PC Light (1440x900) ---");
    const pcLightCtx = await browser.newContext({
      viewport: { width: 1440, height: 900 },
      colorScheme: "light",
      deviceScaleFactor: 1,
    });
    const pcLightPage = await pcLightCtx.newPage();
    await pcLightPage.goto(`${PREVIEW_URL}?theme=light`, { waitUntil: "networkidle", timeout: 20000 });
    await pcLightPage.waitForSelector('[data-testid="clinical-hygiene-ortho-preview-root"]', { timeout: 10000 });
    await pcLightPage.waitForTimeout(1000);
    await saveProof(pcLightPage, "pc-light.png");
    await pcLightCtx.close();

    // 2. PC Dark (1440x900)
    console.log("--- 2. Capturing PC Dark (1440x900) ---");
    const pcDarkCtx = await browser.newContext({
      viewport: { width: 1440, height: 900 },
      colorScheme: "dark",
      deviceScaleFactor: 1,
    });
    const pcDarkPage = await pcDarkCtx.newPage();
    await pcDarkPage.goto(`${PREVIEW_URL}?theme=dark`, { waitUntil: "networkidle", timeout: 20000 });
    await pcDarkPage.waitForSelector('[data-testid="clinical-hygiene-ortho-preview-root"]', { timeout: 10000 });
    await pcDarkPage.waitForTimeout(1000);
    await saveProof(pcDarkPage, "pc-dark.png");
    await pcDarkCtx.close();

    // 3. Mobile Light (390x844)
    console.log("--- 3. Capturing Mobile Light (390x844) ---");
    const mobLightCtx = await browser.newContext({
      viewport: { width: 390, height: 844 },
      colorScheme: "light",
      deviceScaleFactor: 2,
      isMobile: true,
      hasTouch: true,
    });
    const mobLightPage = await mobLightCtx.newPage();
    await mobLightPage.goto(`${PREVIEW_URL}?theme=light`, { waitUntil: "networkidle", timeout: 20000 });
    await mobLightPage.waitForSelector('[data-testid="clinical-hygiene-ortho-preview-root"]', { timeout: 10000 });
    await mobLightPage.waitForTimeout(1000);
    await saveProof(mobLightPage, "mobile-light.png");
    await mobLightCtx.close();

    // 4. Mobile Dark (390x844)
    console.log("--- 4. Capturing Mobile Dark (390x844) ---");
    const mobDarkCtx = await browser.newContext({
      viewport: { width: 390, height: 844 },
      colorScheme: "dark",
      deviceScaleFactor: 2,
      isMobile: true,
      hasTouch: true,
    });
    const mobDarkPage = await mobDarkCtx.newPage();
    await mobDarkPage.goto(`${PREVIEW_URL}?theme=dark`, { waitUntil: "networkidle", timeout: 20000 });
    await mobDarkPage.waitForSelector('[data-testid="clinical-hygiene-ortho-preview-root"]', { timeout: 10000 });
    await mobDarkPage.waitForTimeout(1000);
    await saveProof(mobDarkPage, "mobile-dark.png");
    await mobDarkCtx.close();

    console.log("=== ALL 4 SCREENSHOTS SUCCESSFULLY CAPTURED & VALIDATED! ===");
  } finally {
    await browser.close();
  }
}

main().catch((err) => {
  console.error("CAPTURE FAILED:", err);
  process.exit(1);
});
