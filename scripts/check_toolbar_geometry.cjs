const { chromium } = require("playwright");

(async () => {
  const b = await chromium.launch({
    headless: true,
    executablePath: "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });
  const p = await b.newPage({ viewport: { width: 1440, height: 900 } });
  await p.goto("http://127.0.0.1:5174/");
  await p.waitForTimeout(2500);

  const demoBtn = p.locator("text=Быстрый вход в Демо-тур").first();
  if (await demoBtn.isVisible()) await demoBtn.click();
  await p.waitForTimeout(1000);

  const launchBtn = p.locator(".auth-submit-btn--glow").first();
  if (await launchBtn.isVisible()) await launchBtn.click();
  await p.waitForTimeout(2000);

  // dismiss tour
  await p.evaluate(() => {
    document.querySelectorAll('.tour-spotlight-root, [data-testid="guided-tour-spotlight-overlay"], .tour-backdrop-clickable-zone').forEach((el) => el.remove());
  });

  const primaryPriemBtn = p.locator('button.primary-button:has-text("Прием")').first();
  if (await primaryPriemBtn.isVisible()) await primaryPriemBtn.click({ force: true });
  await p.waitForTimeout(2000);

  const elements = await p.evaluate(() => {
    const bar = document.querySelector('[data-testid="emk-tier1-quick-soap-bar"]');
    const tb = document.querySelector(".emk-unified-toolbar");
    const undoGroup = document.querySelector('[data-testid="emk-undo-redo-group"]');
    const scheduleBtn = document.querySelector('[data-testid="btn-schedule-next-stage"]');
    return {
      tbFound: Boolean(tb),
      tbRect: tb ? tb.getBoundingClientRect() : null,
      tbScrollWidth: tb ? tb.scrollWidth : null,
      tbClientWidth: tb ? tb.clientWidth : null,
      tbScrollLeft: tb ? tb.scrollLeft : null,
      barFound: Boolean(bar),
      barRect: bar ? bar.getBoundingClientRect() : null,
      barInnerHTML: bar ? bar.innerHTML.slice(0, 300) : null,
      undoGroupFound: Boolean(undoGroup),
      undoGroupRect: undoGroup ? undoGroup.getBoundingClientRect() : null,
      scheduleBtnFound: Boolean(scheduleBtn),
      scheduleBtnRect: scheduleBtn ? scheduleBtn.getBoundingClientRect() : null,
    };
  });

  console.log("GEOMETRY:", JSON.stringify(elements, null, 2));

  await b.close();
})();
