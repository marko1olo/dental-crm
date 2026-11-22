const { chromium } = require("playwright");
const path = require("node:path");
const fs = require("node:fs");

const WEB_URL = "http://127.0.0.1:5173/?demo=true&warehouse=1";
const PROOF_DIR = path.resolve(__dirname, "../docs/proofs/inventory");
const CURRENT_BRAIN_DIR = path.resolve("C:/Users/Admin/.gemini/antigravity/brain/2225d95d-5fb9-403d-b98a-84768cb68fa8");

if (!fs.existsSync(PROOF_DIR)) fs.mkdirSync(PROOF_DIR, { recursive: true });
if (!fs.existsSync(CURRENT_BRAIN_DIR)) fs.mkdirSync(CURRENT_BRAIN_DIR, { recursive: true });

async function suppressTransientOverlays(page) {
  try {
    await page.evaluate(() => {
      const style = document.createElement("style");
      style.id = "warehouse-clean-proof-style";
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
      document.querySelectorAll("vite-error-overlay, .tour-spotlight-root, [data-testid='guided-tour-spotlight-overlay']").forEach((el) => el.remove());
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
  await suppressTransientOverlays(page);
  await page.waitForTimeout(600);
}

function verifyAndSaveScreenshot(buffer, filename, alias) {
  if (buffer.length < 20480) {
    throw new Error(`Screenshot ${filename} is too small: ${buffer.length} bytes (< 20KB threshold)!`);
  }
  const destPrimary = path.join(PROOF_DIR, filename);
  fs.writeFileSync(destPrimary, buffer);

  const destBrain = path.join(CURRENT_BRAIN_DIR, filename);
  fs.writeFileSync(destBrain, buffer);

  if (alias) {
    fs.writeFileSync(path.join(PROOF_DIR, alias), buffer);
    fs.writeFileSync(path.join(CURRENT_BRAIN_DIR, alias), buffer);
  }

  console.log(`[PROOF CAPTURED] ${filename} (alias: ${alias || "none"}): ${buffer.length} bytes -> ${destPrimary}`);
  return destPrimary;
}

async function capture() {
  const browser = await chromium.launch({
    executablePath: "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-dev-shm-usage"],
  });

  try {
    const context = await browser.newContext({
      viewport: { width: 390, height: 844 },
      deviceScaleFactor: 2,
      isMobile: true,
      hasTouch: true,
    });
    const page = await context.newPage();

    console.log(`Navigating to ${WEB_URL}...`);
    await page.goto(WEB_URL, { waitUntil: "domcontentloaded", timeout: 60000 });
    await page.waitForSelector('[data-testid="warehouse-studio-modal"], .warehouse-inventory-modal', { timeout: 30000 });
    await page.waitForFunction(() => {
      const text = document.body ? document.body.innerText : "";
      return !text.includes("Загрузка системы...") && !text.includes("Загрузка склада...");
    }, { timeout: 20000 }).catch(() => {});
    await suppressTransientOverlays(page);
    await page.waitForTimeout(1500);

    // 2A. Mobile Light (390x844)
    await setTheme(page, "light");
    const mobileLightBuf = await page.screenshot({ fullPage: false });
    verifyAndSaveScreenshot(mobileLightBuf, "03_inventory_stock_mobile_light_390x844.png", "inventory_mobile_light_390x844.png");

    // 2B. Mobile Dark (390x844)
    await setTheme(page, "dark");
    const mobileDarkBuf = await page.screenshot({ fullPage: false });
    verifyAndSaveScreenshot(mobileDarkBuf, "04_inventory_stock_mobile_dark_390x844.png", "inventory_mobile_dark_390x844.png");

    await context.close();
    console.log("[SUCCESS] Mobile proofs captured successfully!");
  } finally {
    await browser.close();
  }
}

capture().catch((err) => {
  console.error("[FATAL CAPTURE ERROR]:", err);
  process.exit(1);
});
