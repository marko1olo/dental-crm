const { chromium } = require("playwright");

async function check() {
  const browser = await chromium.launch({
    headless: true,
    executablePath: "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
    args: ["--no-sandbox", "--disable-gpu"],
  });
  const page = await browser.newPage();
  await page.goto("http://127.0.0.1:5173/?demo=true#visit", { timeout: 30000 });
  await page.waitForSelector(".app-shell", { timeout: 30000 });
  console.log("App-shell found!");

  // Switch to visit view
  await page.evaluate(() => {
    if (window.__useAppStore) {
      window.__useAppStore.getState().setCurrentView("visit");
    }
  });
  await page.waitForTimeout(2000);

  // Take screenshot directly to live_check.png
  await page.screenshot({ path: "scripts/live_check.png" });
  console.log("Screenshot saved to scripts/live_check.png");
  await browser.close();
}

check().catch(console.error);
