/**
 * scripts/capture_protocols_catalog_screenshots.cjs
 * Автономный Red Team скрипт снятия скриншотов каталога 1 142 клинических протоколов:
 * - 1440x900 Desktop Light & Dark
 * - Проверка 2-3 колоночного грида, скролла табов и контраста бейджей
 */

const puppeteer = require("puppeteer");
const path = require("node:path");
const fs = require("node:fs");

async function main() {
  const outputDir = path.resolve(__dirname, "../docs/screenshots/inquisition_live");
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  const chromePath = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
  const edgePath = "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe";
  const execPath = fs.existsSync(chromePath) ? chromePath : edgePath;

  console.log(`>>> Launching browser from: ${execPath}`);
  const browser = await puppeteer.launch({
    executablePath: execPath,
    headless: "new",
    args: ["--no-sandbox", "--disable-setuid-sandbox", "--window-size=1440,900"],
  });

  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 1440, height: 900 });

    // ─── 1. СВЕТЛАЯ ТЕМА (LIGHT) ───
    console.log(">>> Navigating to Protocols Catalog Preview (Light)...");
    await page.goto("http://127.0.0.1:5173/protocols_catalog_preview.html?theme=light", {
      waitUntil: "networkidle0",
      timeout: 30000,
    });

    await page.waitForSelector('[data-testid="clinical-protocols-catalog-modal"]', { visible: true, timeout: 15000 });
    await page.waitForSelector('[data-testid*="card-procedure-"]', { visible: true, timeout: 15000 });
    // Даем Vite и шрифтам полностью отрендериться
    await new Promise((r) => setTimeout(r, 2000));

    const lightPath = path.join(outputDir, "proof_protocols_catalog_grid_light.png");
    await page.screenshot({ path: lightPath, fullPage: false });
    console.log(`>>> Captured Light screenshot: ${lightPath} (${fs.statSync(lightPath).size} bytes)`);

    // ─── 2. ТЁМНАЯ ТЕМА (DARK) ───
    console.log(">>> Navigating to Protocols Catalog Preview (Dark)...");
    await page.goto("http://127.0.0.1:5173/protocols_catalog_preview.html?theme=dark", {
      waitUntil: "networkidle0",
      timeout: 30000,
    });

    await page.waitForSelector('[data-testid="clinical-protocols-catalog-modal"]', { visible: true, timeout: 15000 });
    await page.waitForSelector('[data-testid*="card-procedure-"]', { visible: true, timeout: 15000 });
    await new Promise((r) => setTimeout(r, 2000));

    const darkPath = path.join(outputDir, "proof_protocols_catalog_grid_dark.png");
    await page.screenshot({ path: darkPath, fullPage: false });
    console.log(`>>> Captured Dark screenshot: ${darkPath} (${fs.statSync(darkPath).size} bytes)`);

    console.log(">>> Finished capturing screenshots successfully!");
  } finally {
    await browser.close();
  }
}

main().catch((err) => {
  console.error("Screenshot capture failed:", err);
  process.exit(1);
});
