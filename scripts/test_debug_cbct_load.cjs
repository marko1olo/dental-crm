const { chromium } = require("playwright");

async function test() {
  const browser = await chromium.launch({
    headless: true,
    executablePath: "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });
  const page = await browser.newPage();
  page.on("console", (msg) => console.log(`[CONSOLE ${msg.type()}]:`, msg.text()));
  page.on("pageerror", (err) => console.log(`[PAGE ERROR]:`, err.message));
  page.on("response", (res) => {
    if (res.status() >= 400) {
      console.log(`[HTTP ${res.status()}]:`, res.url());
    }
  });

  console.log("Navigating to http://127.0.0.1:5173/cbct_adaptive_inquisition_preview.html...");
  await page.goto("http://127.0.0.1:5173/cbct_adaptive_inquisition_preview.html", { waitUntil: "domcontentloaded", timeout: 15000 }).catch(e => console.log("goto error:", e.message));

  const title = await page.title();
  console.log("Page title:", title);
  await page.waitForTimeout(3000);
  const text = await page.evaluate(() => document.body.innerText.slice(0, 300));
  console.log("Body text snippet:", text);
  await page.screenshot({ path: "scripts/debug_cbct_page.png" });
  console.log("Screenshot saved to scripts/debug_cbct_page.png");

  await browser.close();
}

test().catch(console.error);
