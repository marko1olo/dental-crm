const { chromium } = require("playwright");
const fs = require("node:fs");

async function diag() {
  const browser = await chromium.launch({
    executablePath: "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
    headless: true,
  });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();

  page.on("console", (msg) => console.log(`[PAGE LOG]: ${msg.type()} - ${msg.text()}`));
  page.on("pageerror", (err) => console.log(`[PAGE ERROR]: ${err.message}`));

  await page.goto("http://127.0.0.1:5173/?demo=true&warehouse=1", { waitUntil: "networkidle", timeout: 30000 }).catch((e) => console.log("goto err:", e.message));
  await page.waitForTimeout(2000);

  const url = page.url();
  console.log("[CURRENT URL]:", url);

  const title = await page.title();
  console.log("[CURRENT TITLE]:", title);

  const bodyText = await page.evaluate(() => document.body ? document.body.innerText.slice(0, 300) : "NO BODY");
  console.log("[BODY TEXT]:", bodyText);

  await page.screenshot({ path: "docs/proofs/inventory/debug_screen.png" });
  await browser.close();
}

diag().catch(console.error);
