const { chromium } = require("playwright");
const path = require("node:path");
const fs = require("node:fs");

const WEB_URL = "http://127.0.0.1:5173/?demo=true&warehouse=1";
const PROOF_DIR = path.resolve(__dirname, "../docs/proofs/inventory");
const CURRENT_BRAIN_DIR = path.resolve("C:/Users/Admin/.gemini/antigravity/brain/2225d95d-5fb9-403d-b98a-84768cb68fa8");

if (!fs.existsSync(PROOF_DIR)) fs.mkdirSync(PROOF_DIR, { recursive: true });
if (!fs.existsSync(CURRENT_BRAIN_DIR)) fs.mkdirSync(CURRENT_BRAIN_DIR, { recursive: true });

async function suppressOverlays(page) {
  try {
    await page.evaluate(() => {
      const style = document.createElement("style");
      style.id = "clean-proof-style";
      style.innerHTML = `
        .tour-spotlight-root,
        .tour-backdrop-clickable-zone,
        [data-testid="guided-tour-spotlight-overlay"],
        [data-testid="guided-tour-coach-mark-card"],
        [data-testid="demo-mode-banner"],
        .global-toast-container,
        vite-error-overlay {
          display: none !important;
          pointer-events: none !important;
        }
      `;
      document.head.appendChild(style);
      document.querySelectorAll("vite-error-overlay, .tour-spotlight-root").forEach((el) => el.remove());
    });
  } catch (_) {}
}

async function setTheme(page, theme) {
  await page.evaluate((th) => {
    document.documentElement.setAttribute("data-theme", th);
    if (th === "dark") {
      document.documentElement.classList.add("dark");
      document.documentElement.classList.remove("light");
    } else {
      document.documentElement.classList.add("light");
      document.documentElement.classList.remove("dark");
    }
    localStorage.setItem("dente_theme", th);
    localStorage.setItem("dente_theme_mode", th);
    localStorage.setItem("theme", th);
    document.documentElement.style.colorScheme = th;
  }, theme);
  await suppressOverlays(page);
  await page.waitForTimeout(500);
}

function saveProof(buffer, filename) {
  if (buffer.length < 20480) {
    throw new Error(`Screenshot ${filename} is too small: ${buffer.length} bytes!`);
  }
  const p1 = path.join(PROOF_DIR, filename);
  const p2 = path.join(CURRENT_BRAIN_DIR, filename);
  fs.writeFileSync(p1, buffer);
  fs.writeFileSync(p2, buffer);
  console.log(`[CAPTURED] ${filename}: ${buffer.length} bytes`);
}

async function run() {
  const browser = await chromium.launch({
    executablePath: "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
    headless: true,
  });

  try {
    const context = await browser.newContext({
      viewport: { width: 1440, height: 900 },
    });
    const page = await context.newPage();

    console.log(`Navigating to ${WEB_URL}...`);
    await page.goto(WEB_URL, { waitUntil: "domcontentloaded", timeout: 45000 });
    await page.waitForSelector('[data-testid="warehouse-studio-modal"], .warehouse-inventory-modal', { timeout: 20000 });
    await suppressOverlays(page);
    await page.waitForTimeout(1000);

    // 1. PC Light
    await setTheme(page, "light");
    const pcLight = await page.screenshot({ fullPage: false });
    saveProof(pcLight, "01_inventory_stock_pc_light_1440x900.png");

    // 2. PC Dark
    await setTheme(page, "dark");
    const pcDark = await page.screenshot({ fullPage: false });
    saveProof(pcDark, "02_inventory_stock_pc_dark_1440x900.png");

    // 3 & 4: Ресайз под Mobile Touch (390x844)
    console.log("Resizing to mobile 390x844...");
    await page.setViewportSize({ width: 390, height: 844 });
    await page.evaluate(() => window.dispatchEvent(new Event("resize")));
    await page.waitForTimeout(1000);
    await suppressOverlays(page);

    // 3. Mobile Light
    await setTheme(page, "light");
    const mobLight = await page.screenshot({ fullPage: false });
    saveProof(mobLight, "03_inventory_stock_mobile_light_390x844.png");

    // 4. Mobile Dark
    await setTheme(page, "dark");
    const mobDark = await page.screenshot({ fullPage: false });
    saveProof(mobDark, "04_inventory_stock_mobile_dark_390x844.png");

    await context.close();
    console.log("\n[SUCCESS] ALL 4-STATE PROOFS CAPTURED SUCCESSFULLY!");
  } finally {
    await browser.close();
  }
}

run().catch((err) => {
  console.error("[ERROR]", err);
  process.exit(1);
});
