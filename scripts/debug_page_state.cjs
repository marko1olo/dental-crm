const { chromium } = require("playwright");
const fs = require("node:fs");

async function main() {
  const edgePath = "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe";
  const chromePath = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
  const executablePath = fs.existsSync(edgePath) ? edgePath : chromePath;

  const browser = await chromium.launch({
    headless: true,
    executablePath,
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });

  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await ctx.newPage();

  await page.goto("http://127.0.0.1:5173/", { waitUntil: "domcontentloaded", timeout: 20000 });
  await page.waitForTimeout(2000);

  console.log("Current URL:", page.url());
  const bodyText = await page.evaluate(() => document.body.innerText.slice(0, 400));
  console.log("Body text preview:\n", bodyText);

  const testIds = await page.evaluate(() => {
    return Array.from(document.querySelectorAll("[data-testid]")).map(el => el.getAttribute("data-testid")).slice(0, 30);
  });
  console.log("Visible testids:", testIds);

  await page.screenshot({ path: "docs/screenshots/debug_page.png" });
  console.log("Saved debug_page.png");
  await browser.close();
}

main().catch(console.error);
