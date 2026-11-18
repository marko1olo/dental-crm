import { chromium } from "playwright";

async function run() {
  const browser = await chromium.launch({ channel: "msedge", headless: true });
  const page = await browser.newPage();
  
  page.on("console", (msg) => {
    if (msg.type() === "error") {
      console.error("[BROWSER ERROR]:", msg.text());
    }
  });

  console.log("Navigating to http://127.0.0.1:5173/?demo=true ...");
  await page.goto("http://127.0.0.1:5173/?demo=true");
  
  // Wait for loading screen to disappear
  try {
    await page.waitForFunction(() => !document.body.innerText.includes("Загрузка"), { timeout: 15000 });
    console.log("Loading screen gone!");
  } catch (e) {
    console.log("Loading wait timeout, checking current text...");
  }
  
  const bodyText = await page.innerText("body");
  console.log("Body text preview (first 400 chars):", bodyText.slice(0, 400));

  // Navigate to #schedule if not already there
  await page.goto("http://127.0.0.1:5173/?demo=true#schedule");
  await page.waitForTimeout(3000);

  console.log("Is schedule toolbar visible?", await page.locator('[data-testid="schedule-toolbar"]').isVisible().catch(() => false));
  console.log("Is schedule view visible?", await page.locator('[data-testid="schedule-view"]').isVisible().catch(() => false));
  console.log("Is grid container visible?", await page.locator('.schedule-grid-container').isVisible().catch(() => false));
  
  await browser.close();
}

run();
