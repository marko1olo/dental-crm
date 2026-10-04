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

  const primaryPriemBtn = p.locator('button.primary-button:has-text("Прием")').first();
  if (await primaryPriemBtn.isVisible()) await primaryPriemBtn.click();
  await p.waitForTimeout(2000);

  const toolbarInfo = await p.evaluate(() => {
    const tb = document.querySelector(".emk-unified-toolbar");
    if (!tb) return { found: false };
    const rect = tb.getBoundingClientRect();
    const children = Array.from(tb.children).map((c) => ({
      tagName: c.tagName,
      className: c.className,
      rect: c.getBoundingClientRect(),
      innerText: (c.innerText || "").slice(0, 100),
      display: window.getComputedStyle(c).display,
    }));
    return {
      found: true,
      rect,
      scrollWidth: tb.scrollWidth,
      clientWidth: tb.clientWidth,
      children,
    };
  });

  console.log("TOOLBAR INFO:", JSON.stringify(toolbarInfo, null, 2));

  await b.close();
})();
