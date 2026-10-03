const { chromium } = require("playwright");

async function main() {
  const browser = await chromium.launch({
    headless: true,
    executablePath: "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
  });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });

  page.on("pageerror", (err) => console.error("[BROWSER ERROR]:", err.message));
  page.on("console", (msg) => console.log("[CONSOLE]:", msg.text()));

  await page.goto("http://127.0.0.1:5173/#imaging");
  await page.waitForSelector(".app-shell", { timeout: 15000 });

  console.log("Opening RadiologyModule...");
  await page.click('[data-testid="imaging-open-radiology-module"]');
  await page.waitForSelector('[data-testid="radiology-module-container"]', { timeout: 15000 });

  console.log("Opening 3D CBCT Studio...");
  await page.click('[data-testid="btn-open-3d-cbct-studio"]');
  await page.waitForSelector('[data-testid="cbct-studio-modal"]', { timeout: 15000 });
  console.log("cbct-studio-modal is OPEN!");

  // List all elements with data-testid inside cbct-studio-modal
  const testIds = await page.$$eval('[data-testid]', (els) => els.map(e => e.getAttribute('data-testid')));
  console.log("Found testids in DOM:", testIds.filter(id => id.includes("cbct") || id.includes("tab") || id.includes("pano")));

  await browser.close();
}

main().catch(console.error);
