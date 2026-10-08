const { chromium } = require("playwright");
const fs = require("node:fs");
const path = require("node:path");

async function run() {
  const outDir = path.resolve(__dirname, "..", "docs", "screenshots", "sanpin_inquisition");
  const chromePath = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
  const edgePath = "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe";
  const executablePath = fs.existsSync(chromePath) ? chromePath : (fs.existsSync(edgePath) ? edgePath : undefined);

  const browser = await chromium.launch({
    headless: true,
    ...(executablePath ? { executablePath } : {}),
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });

  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    deviceScaleFactor: 1,
  });

  await context.addInitScript(() => {
    localStorage.setItem("dente_demo_showcase", "true");
    localStorage.setItem("dente_onboarding_completed", "true");
    localStorage.setItem("dente_tour_completed", "true");
    localStorage.setItem("dente_tour_dismissed", "true");
    document.documentElement.setAttribute("data-theme", "light");
    document.documentElement.classList.remove("dark");
  });

  const page = await context.newPage();
  await page.goto("http://127.0.0.1:5173/?demo=true#sanpin/waste", { waitUntil: "domcontentloaded", timeout: 25000 });
  await page.waitForTimeout(2000);

  const openWasteModalBtn = page.locator('[data-testid="open-waste-journal-modal-btn"]').first();
  await openWasteModalBtn.waitFor({ state: "visible", timeout: 10000 });
  await openWasteModalBtn.click();
  await page.waitForTimeout(1000);

  const wasteShotPath = path.join(outDir, "sanpin_medical_waste_accumulate_light.png");
  await page.screenshot({ path: wasteShotPath, fullPage: false });
  console.log(`[OK] Saved: ${wasteShotPath}`);

  await browser.close();
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
