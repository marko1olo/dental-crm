const { chromium } = require("playwright");

async function checkResources() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });

  page.on("requestfailed", (req) => {
    console.error("[Request Failed]:", req.url(), req.failure()?.errorText);
  });
  page.on("console", (m) => {
    if (m.type() === "error") {
      console.error("[Console Error]:", m.text());
    }
  });
  page.on("pageerror", (err) => console.error("[PageError]:", err.message));

  console.log("Navigating to http://127.0.0.1:5173/?demo=true#copilot-hud ...");
  await page.goto("http://127.0.0.1:5173/?demo=true#copilot-hud", { waitUntil: "domcontentloaded", timeout: 20000 });
  await page.waitForTimeout(6000);

  const hudExists = await page.locator('[data-testid="chairside-copilot-hud"]').count();
  console.log("HUD count after 6s:", hudExists);

  await page.screenshot({ path: "hud_state_check.png" });
  console.log("Saved hud_state_check.png");

  await browser.close();
}

checkResources().catch(console.error);
