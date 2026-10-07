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

  console.log("Navigating to http://127.0.0.1:5173/?cbct=demo...");
  await page.goto("http://127.0.0.1:5173/?cbct=demo", { waitUntil: "domcontentloaded", timeout: 20000 });
  await page.waitForTimeout(3000);

  console.log("Current URL:", page.url());
  const modalVisible = await page.isVisible('[data-testid="cbct-studio-modal"]').catch(() => false);
  console.log("cbct-studio-modal visible:", modalVisible);

  const canvasCount = await page.locator("canvas").count();
  console.log("Canvas elements found:", canvasCount);

  await page.screenshot({ path: "docs/screenshots/cbct_direct_debug.png" });
  console.log("Saved cbct_direct_debug.png");
  await browser.close();
}

main().catch(console.error);
