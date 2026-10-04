const { chromium } = require("playwright");
const path = require("node:path");

(async () => {
  const b = await chromium.launch({
    headless: true,
    executablePath: "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });
  const p = await b.newPage({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 2 });
  await p.goto("http://127.0.0.1:5174/");
  await p.waitForTimeout(3000);

  const demoBtn = p.locator("text=Быстрый вход в Демо-тур").first();
  if (await demoBtn.isVisible()) {
    await demoBtn.click();
    await p.waitForTimeout(1500);
  }

  const launchBtn = p.locator(".auth-submit-btn--glow").first();
  if (await launchBtn.isVisible()) {
    await launchBtn.click();
    await p.waitForTimeout(2500);
  }

  const skipTour = p.locator('button:has-text("Пропустить"), button:has-text("Больше не показывать")').first();
  if (await skipTour.isVisible()) {
    console.log("Dismissing tour...");
    await skipTour.click();
    await p.waitForTimeout(1000);
  }

  await p.evaluate(() => {
    document.querySelectorAll('.tour-spotlight-root, [data-testid="guided-tour-spotlight-overlay"], .tour-backdrop-clickable-zone').forEach((el) => el.remove());
  });

  const primaryPriemBtn = p.locator('button.primary-button:has-text("Прием")').first();
  if (await primaryPriemBtn.isVisible()) {
    console.log("Clicking primary Прием button...");
    await primaryPriemBtn.click();
    await p.waitForTimeout(2500);
  }

  const shotPath = path.resolve("docs/screenshots/inquisition_live/debug_after_priem_click.png");
  await p.screenshot({ path: shotPath });
  console.log("Screenshot saved:", shotPath);

  const text = await p.evaluate(() => document.body.innerText);
  console.log("Page text after click:", text.slice(0, 400));

  await b.close();
})();
