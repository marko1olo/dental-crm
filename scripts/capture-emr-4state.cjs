const { chromium } = require("playwright");
const fs = require("node:fs");
const path = require("node:path");

const WEB_BASE = "http://127.0.0.1:5173";
const PROOFS_DIR = path.resolve(__dirname, "../docs/proofs/emr");
fs.mkdirSync(PROOFS_DIR, { recursive: true });

async function saveProof(page, fileName) {
  const targetPath = path.join(PROOFS_DIR, fileName);
  await page.screenshot({ path: targetPath, fullPage: false });
  const stats = fs.statSync(targetPath);
  console.log(`[PROOF CAPTURED] ${fileName} -> ${stats.size} bytes (${(stats.size / 1024).toFixed(1)} KB)`);
  if (stats.size < 20480) {
    throw new Error(`Screenshot ${fileName} is too small (${stats.size} bytes < 20KB)`);
  }
  return targetPath;
}

async function main() {
  const possibleBrowserPaths = [
    "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
    "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe",
    "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
    "C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe",
  ];
  const browserPath = possibleBrowserPaths.find((p) => fs.existsSync(p));
  console.log("Using browser binary:", browserPath);

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
    page.on('console', msg => console.log('PAGE LOG:', msg.text()));
    page.on('pageerror', err => console.log('PAGE ERROR:', err.message));
    page.on('response', res => { if (res.status() >= 400) console.log('HTTP ERROR:', res.status(), res.url()); });

    console.log("Navigating to live EMR medical card (http://127.0.0.1:5173/?demo=true&emr=1)...");
    await page.goto(`${WEB_BASE}/?demo=true&emr=1`, {
      waitUntil: "domcontentloaded",
      timeout: 45000,
    });

    await page.waitForFunction(() => !document.body.innerText.includes("Загрузка CRM"), { timeout: 30000 }).catch(() => {});
    await page.locator(".emr043-modal-window").waitFor({ state: "visible", timeout: 45000 });
    console.log("EMR Modal window confirmed visible!");

    // Switch to Overview or Anamnesis / Odontogram tab to ensure rich content
    await page.locator(".emr043-tab-btn").first().waitFor({ state: "visible", timeout: 5000 });

    // 1. PC Light (1440x900)
    console.log("--- 1. Capturing EMR PC Light (1440x900) ---");
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.evaluate(() => {
      document.documentElement.classList.remove("dark");
      document.documentElement.classList.add("light");
      document.documentElement.setAttribute("data-theme", "light");
      document.body.setAttribute("data-theme", "light");
    });
    await page.waitForTimeout(800);
    await saveProof(page, "01_emr_pc_light.png");

    // 2. PC Dark (1440x900)
    console.log("--- 2. Capturing EMR PC Dark (1440x900) ---");
    await page.evaluate(() => {
      document.documentElement.classList.remove("light");
      document.documentElement.classList.add("dark");
      document.documentElement.setAttribute("data-theme", "dark");
      document.body.setAttribute("data-theme", "dark");
    });
    await page.waitForTimeout(800);
    await saveProof(page, "02_emr_pc_dark.png");

    // 3. Mobile Light (390x844)
    console.log("--- 3. Capturing EMR Mobile Light (390x844) ---");
    await page.setViewportSize({ width: 390, height: 844 });
    await page.evaluate(() => {
      document.documentElement.classList.remove("dark");
      document.documentElement.classList.add("light");
      document.documentElement.setAttribute("data-theme", "light");
      document.body.setAttribute("data-theme", "light");
    });
    await page.waitForTimeout(800);
    await saveProof(page, "03_emr_mobile_light.png");

    // 4. Mobile Dark (390x844)
    console.log("--- 4. Capturing EMR Mobile Dark (390x844) ---");
    await page.evaluate(() => {
      document.documentElement.classList.remove("light");
      document.documentElement.classList.add("dark");
      document.documentElement.setAttribute("data-theme", "dark");
      document.body.setAttribute("data-theme", "dark");
    });
    await page.waitForTimeout(800);
    await saveProof(page, "04_emr_mobile_dark.png");

    console.log("All 4 EMR Red Team proofs captured successfully!");
  } finally {
    await browser.close();
  }
}

main().catch((err) => {
  console.error("Capture EMR proofs error:", err);
  process.exit(1);
});
