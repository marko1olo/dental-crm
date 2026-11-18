import { chromium } from "playwright";

async function run() {
  const browser = await chromium.launch({
    executablePath: "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
    headless: true,
    args: ["--no-sandbox", "--disable-gpu"],
  });
  const page = await browser.newPage();
  
  page.on("console", (msg) => {
    console.log(`[BROWSER ${msg.type()}]:`, msg.text());
  });
  
  page.on("requestfailed", (req) => {
    console.error("[FAILED REQUEST]:", req.url(), req.failure()?.errorText);
  });
  page.on("response", (res) => {
    console.log(`[HTTP ${res.status()}]:`, res.url());
  });

  console.log("Navigating to http://127.0.0.1:5173/?demo=true#analytics ...");
  await page.goto("http://127.0.0.1:5173/?demo=true#analytics", { waitUntil: "commit" });
  
  await page.waitForTimeout(10000);
  
  const text = await page.innerText("body");
  console.log("Body text after 10s:", text.slice(0, 500));
  const el = await page.$('[data-testid="executive-dashboard-root"], [data-testid="executive-financial-summary"], #analytics');
  console.log("Found analytics element?", Boolean(el));
  await browser.close();
}

run();
