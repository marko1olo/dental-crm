const { chromium } = require("playwright");
const fs = require("node:fs");
const path = require("node:path");

const WEB_BASE = "http://127.0.0.1:5173";
const PROOFS_DIR = path.resolve(__dirname, "../docs/proofs/emergency");
const SUBAGENT_BRAIN_DIR = path.resolve("C:/Users/Admin/.gemini/antigravity/brain/ccb6b811-9361-46ac-b61d-6d6d08bb04de/proofs");
const PARENT_BRAIN_DIR = path.resolve("C:/Users/Admin/.gemini/antigravity/brain/2d41233f-cb42-451b-b625-8a85401ad490/proofs");

fs.mkdirSync(PROOFS_DIR, { recursive: true });
fs.mkdirSync(SUBAGENT_BRAIN_DIR, { recursive: true });
fs.mkdirSync(PARENT_BRAIN_DIR, { recursive: true });

async function saveProof(page, fileName) {
  const p1 = path.join(PROOFS_DIR, fileName);
  await page.screenshot({ path: p1, fullPage: false });
  const p2 = path.join(SUBAGENT_BRAIN_DIR, fileName);
  fs.copyFileSync(p1, p2);
  const p3 = path.join(PARENT_BRAIN_DIR, fileName);
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
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });

  try {
    const context = await browser.newContext({
      viewport: { width: 1440, height: 900 },
    });
    const page = await context.newPage();

    console.log("Navigating to live emergency HUD...");
    await page.goto(`${WEB_BASE}/?emergency=1`, {
      waitUntil: "domcontentloaded",
      timeout: 30000,
    });

    await page.locator(".emergency-modal-container").waitFor({ state: "visible", timeout: 15000 });
    console.log("Emergency modal container confirmed visible!");

    // 1. PC Light (1440x900)
    console.log("--- 1. Capturing PC Light (1440x900) ---");
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.evaluate(() => {
      document.documentElement.classList.remove("dark");
      document.documentElement.classList.add("light");
      document.documentElement.setAttribute("data-theme", "light");
      document.body.setAttribute("data-theme", "light");
    });
    await page.waitForTimeout(1000);
    await saveProof(page, "emergency_pc_light.png");

    // 2. PC Dark (1440x900)
    console.log("--- 2. Capturing PC Dark (1440x900) ---");
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.evaluate(() => {
      document.documentElement.classList.remove("light");
      document.documentElement.classList.add("dark");
      document.documentElement.setAttribute("data-theme", "dark");
      document.body.setAttribute("data-theme", "dark");
    });
    await page.waitForTimeout(1000);
    await saveProof(page, "emergency_pc_dark.png");

    // 3. Mobile Light (390x844)
    console.log("--- 3. Capturing Mobile Light (390x844) ---");
    await page.setViewportSize({ width: 390, height: 844 });
    await page.evaluate(() => {
      document.documentElement.classList.remove("dark");
      document.documentElement.classList.add("light");
      document.documentElement.setAttribute("data-theme", "light");
      document.body.setAttribute("data-theme", "light");
    });
    await page.waitForTimeout(1000);
    await saveProof(page, "emergency_mobile_light.png");

    // 4. Mobile Dark (390x844)
    console.log("--- 4. Capturing Mobile Dark (390x844) ---");
    await page.setViewportSize({ width: 390, height: 844 });
    await page.evaluate(() => {
      document.documentElement.classList.remove("light");
      document.documentElement.classList.add("dark");
      document.documentElement.setAttribute("data-theme", "dark");
      document.body.setAttribute("data-theme", "dark");
    });
    await page.waitForTimeout(1000);
    await saveProof(page, "emergency_mobile_dark.png");

    console.log("SUCCESS: All 4 emergency visual proofs captured cleanly!");
  } finally {
    await browser.close();
  }
}

main().catch((err) => {
  console.error("FAIL:", err);
  process.exit(1);
});
