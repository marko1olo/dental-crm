const { chromium } = require("playwright");

async function debug() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  
  page.on("console", (msg) => {
    if (msg.type() === "error") {
      console.error(`[Browser Console ${msg.type()}]:`, msg.text());
    } else {
      console.log(`[Browser Console ${msg.type()}]:`, msg.text());
    }
  });
  page.on("pageerror", (err) => console.error("[Browser PageError]:", err));

  console.log("Navigating to http://127.0.0.1:5173/?demo=true#copilot-hud ...");
  await page.goto("http://127.0.0.1:5173/?demo=true#copilot-hud", { waitUntil: "domcontentloaded" });

  console.log("Waiting 5s for React hydration...");
  await page.waitForTimeout(5000);

  const title = await page.title();
  const url = page.url();
  console.log("Current URL:", url, "Title:", title);

  const hudExists = await page.locator('[data-testid="chairside-copilot-hud"]').count();
  console.log("HUD element count:", hudExists);

  await page.screenshot({ path: "debug_screenshot2.png" });
  console.log("Saved debug_screenshot2.png");

  await browser.close();
}

debug().catch(console.error);
