const { chromium } = require("playwright");
const fs = require("node:fs");

async function run() {
  const browser = await chromium.launch({
    headless: true,
    executablePath: "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  await page.goto("http://127.0.0.1:5173/", { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(2000);
  await page.screenshot({ path: "docs/screenshots/omnichannel_inquisition/debug_state.png" });
  const html = await page.content();
  console.log("HTML length:", html.length, "Has demo:", html.includes("Демо"), "Has login:", html.includes("Вход"));
  await browser.close();
}
run();
