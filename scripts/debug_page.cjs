const { chromium } = require("playwright");

async function debugDemo() {
  const browser = await chromium.launch({
    headless: true,
    executablePath: "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 2,
    isMobile: true,
    hasTouch: true,
  });
  const page = await context.newPage();
  await page.goto("http://127.0.0.1:5173/", { waitUntil: "domcontentloaded" });

  const quickDemoBtn = page.locator('button:has-text("Быстрый вход в Демо-тур")').first();
  await quickDemoBtn.waitFor({ state: "visible", timeout: 15000 });
  console.log("Clicking quickDemoBtn...");
  await quickDemoBtn.click();
  await page.waitForTimeout(3000);

  const buttons = await page.locator("button").allInnerTexts();
  console.log("Buttons after quick demo click:", buttons);

  await page.screenshot({ path: "docs/screenshots/inquisition_live/debug_after_demo_click.png" });
  console.log("Saved debug_after_demo_click.png");

  await browser.close();
}

debugDemo().catch(console.error);
