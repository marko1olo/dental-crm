const { chromium } = require("playwright");
const path = require("path");
const fs = require("fs");

const targetDirs = [
  path.resolve("C:/Clinic_MVP/dental-crm/docs/screenshots/endo_inquisition"),
  path.resolve("C:/Clinic_MVP/dental-crm/apps/web/public/screenshots/endo_inquisition"),
];

for (const d of targetDirs) {
  if (!fs.existsSync(d)) fs.mkdirSync(d, { recursive: true });
}

async function takeScreen(page, fileName, description) {
  const p1 = path.join(targetDirs[0], fileName);
  if (fs.existsSync(p1)) {
    try { fs.unlinkSync(p1); } catch {}
  }
  await page.screenshot({ path: p1, fullPage: false });
  for (let i = 1; i < targetDirs.length; i++) {
    fs.copyFileSync(p1, path.join(targetDirs[i], fileName));
  }
  const stat = fs.statSync(p1);
  console.log(`[CAPTURED] ${fileName} (${description}) — ${(stat.size / 1024).toFixed(1)} KB`);
}

async function captureHarnessForTheme(theme) {
  console.log(`\n==================================================`);
  console.log(`>>> CAPTURING ENDO HARNESS: ${theme.toUpperCase()} <<<`);
  console.log(`==================================================`);

  const browser = await chromium.launch({
    headless: true,
    executablePath: "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });

  try {
    const ctx = await browser.newContext({
      viewport: { width: 1440, height: 900 },
      deviceScaleFactor: 2,
    });

    const page = await ctx.newPage();
    page.on("pageerror", (err) => console.log("[PAGE ERROR]:", err.message));
    page.on("console", (msg) => {
      if (msg.type() === "error") console.log("[CONSOLE ERROR]:", msg.text());
    });

    const targetUrl = `http://127.0.0.1:5173/endo_harness_preview.html?theme=${theme}`;
    console.log(`Navigating to ${targetUrl}...`);
    await page.goto(targetUrl, { waitUntil: "networkidle", timeout: 30000 });
    await page.waitForTimeout(1500);

    await page.waitForSelector('[data-testid="endo-experimental-harness"]', { timeout: 15000 });
    console.log("Endo Experimental Harness mounted!");

    // 1. Initial State Screenshot
    await takeScreen(
      page,
      `01_endo_harness_initial_${theme}.png`,
      `Endo Voxel Harness Начальное состояние (${theme})`
    );

    // 2. Click "Запустить 3D расчет" button
    await page.waitForTimeout(1000);
    console.log("Clicking 'Запустить 3D расчет'...");
    const triggerBtn = await page.waitForSelector('[data-testid="endo-trigger-calc-btn"]', { timeout: 10000 });
    await triggerBtn.click();

    // 3. Wait for calculation to finish (status changes to completed)
    console.log("Waiting for Web Worker calculation to complete...");
    await page.waitForSelector('text=Завершено', { timeout: 60000 });
    console.log("Calculation completed!");
    await page.waitForTimeout(1000);

    // 4. Calculated State Screenshot (showing 3D splines, Vertucci badge, Kuttler WL cards)
    await takeScreen(
      page,
      `02_endo_harness_calculated_${theme}.png`,
      `Endo Voxel Harness с рассчитанными каналами (${theme})`
    );

    // 5. Switch to Sagittal projection (Y-Z)
    console.log("Switching to Sagittal projection (Y-Z)...");
    const sagBtn = await page.waitForSelector('text=Y-Z (Сагиттальный)', { timeout: 5000 });
    await sagBtn.click();
    await page.waitForTimeout(500);

    await takeScreen(
      page,
      `03_endo_harness_sagittal_${theme}.png`,
      `Endo Voxel Harness Сагиттальная проекция Y-Z (${theme})`
    );

  } finally {
    await browser.close();
  }
}

async function main() {
  await captureHarnessForTheme("light");
  console.log("\n✓ All Endo Experimental Harness screenshots captured successfully!");
}

main().catch((err) => {
  console.error("Fatal capture error:", err);
  process.exit(1);
});
