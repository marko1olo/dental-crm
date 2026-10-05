const { chromium } = require("playwright");

async function checkConsole() {
  const browser = await chromium.launch({
    headless: true,
    executablePath: "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
    args: ["--no-sandbox", "--disable-gpu"],
  });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();

  page.on("console", (msg) => {
    if (msg.type() === "error" || msg.type() === "warn") {
      console.log(`[Browser ${msg.type()}]:`, msg.text());
    }
  });

  page.on("requestfailed", (req) => {
    console.log("[Req Failed]:", req.url(), req.failure()?.errorText);
  });

  page.on("response", (res) => {
    if (res.status() >= 400) {
      console.log(`[HTTP ${res.status()}]:`, res.url());
    }
  });

  await page.goto("http://127.0.0.1:5173/", { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(3000);

  await context.close();
  await browser.close();
}

checkConsole().catch(console.error);
