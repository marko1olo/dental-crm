const { chromium } = require("playwright");

async function probe() {
  console.log("Launching Chromium...");
  const browser = await chromium.launch({
    headless: true,
    executablePath: "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
    args: ["--no-sandbox", "--disable-gpu"],
  });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();
  console.log("Navigating to 127.0.0.1:5173 with waitUntil: commit...");
  await page.goto("http://127.0.0.1:5173/", { waitUntil: "commit", timeout: 10000 });
  console.log("Committed! Waiting 2s...");
  await page.waitForTimeout(2000);
  const title = await page.title();
  console.log("Page title:", title);
  await page.screenshot({ path: "probe_visit.png" });
  console.log("Screenshot saved to probe_visit.png");
  await browser.close();
}

probe().catch(e => console.error("PROBE ERROR:", e));
