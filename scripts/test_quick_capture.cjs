const { chromium } = require("playwright");
const fs = require("node:fs");
const path = require("node:path");

(async () => {
  const browser = await chromium.launch({
    headless: true,
    executablePath: "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });

  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
  });

  const page = await context.newPage();

  page.on("console", (msg) => {
    const text = msg.text();
    if (!text.includes("vite")) {
      console.log(`[BROWSER ${msg.type()}]:`, text);
    }
  });

  console.log("Navigating to http://127.0.0.1:5173/?demo=true#leads ...");
  await page.goto("http://127.0.0.1:5173/?demo=true#leads", { waitUntil: "domcontentloaded", timeout: 20000 });

  console.log("Waiting for app workspace to appear...");
  for (let i = 0; i < 15; i++) {
    await page.waitForTimeout(1000);
    const text = await page.evaluate(() => document.body.innerText);
    const hasSplash = text.includes("Загрузка");
    console.log(`Sec ${i+1}: hasSplash = ${hasSplash}, text length = ${text.length}`);
    if (!hasSplash && text.length > 50) {
      console.log("App loaded! Text sample:", text.slice(0, 100));
      break;
    }
  }

  const outDir = path.resolve(__dirname, "screenshots");
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

  const testPath = path.join(outDir, "test_leads_loaded.png");
  await page.screenshot({ path: testPath });
  console.log("Captured:", testPath, "size:", fs.statSync(testPath).size);

  await browser.close();
})();
