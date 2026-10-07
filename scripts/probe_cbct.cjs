const { chromium } = require("playwright");

async function probe() {
  const browser = await chromium.launch({
    headless: true,
    executablePath: "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
    args: ["--no-sandbox", "--disable-setuid-sandbox", "--enable-webgl", "--ignore-gpu-blocklist"],
  });

  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  page.on("console", (msg) => console.log("LOG:", msg.type(), msg.text()));
  page.on("pageerror", (err) => console.log("PAGE_ERR:", err.message));
  page.on("requestfailed", (req) => console.log("REQ_FAIL:", req.url(), req.failure()?.errorText));
  page.on("response", (res) => {
    if (res.status() >= 400) console.log("HTTP_ERR:", res.status(), res.url());
  });

  console.log("Navigating to http://127.0.0.1:5173/?cbct=demo...");
  await page.goto("http://127.0.0.1:5173/?cbct=demo", { waitUntil: "domcontentloaded", timeout: 30000 });
  await page.waitForTimeout(4000);

  const text = await page.evaluate(() => document.body.innerText.slice(0, 500));
  console.log("BODY SNIPPET:", text);

  const modal = await page.$('[data-testid="cbct-studio-modal"]');
  console.log("MODAL FOUND:", !!modal);

  const canvasCount = await page.evaluate(() => document.querySelectorAll("canvas").length);
  console.log("CANVAS COUNT:", canvasCount);

  await page.screenshot({ path: "scripts/probe_cbct_screenshot.png" });
  console.log("Screenshot saved to scripts/probe_cbct_screenshot.png");

  await browser.close();
}

probe().catch(console.error);
