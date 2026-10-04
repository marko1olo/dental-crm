const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({
    executablePath: "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
    headless: true,
  });
  const page = await browser.newPage();
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('http://127.0.0.1:5173');
  await page.waitForSelector('[data-tooth-id="16"]', { timeout: 15000 });
  const fdiBtn = page.locator('[data-testid="odontogram-mode-btn-compact_clinical"]').first();
  if (await fdiBtn.getAttribute('aria-checked') !== 'true') {
    await fdiBtn.click();
    await page.waitForTimeout(600);
  }
  const badge = page.locator('.tooth-chart-arch-container [data-tooth-id="16"] .tooth-number-badge').first();
  await badge.hover();
  await page.waitForTimeout(200);
  const info = await page.evaluate(() => {
    const hud = document.querySelector('[data-testid="tooth-card-hud-16"]');
    if (!hud) return 'HUD NOT FOUND IN DOM';
    const rect = hud.getBoundingClientRect();
    const style = window.getComputedStyle(hud);
    return {
      display: style.display,
      visibility: style.visibility,
      opacity: style.opacity,
      zIndex: style.zIndex,
      rect: { top: rect.top, left: rect.left, width: rect.width, height: rect.height },
      parentRect: hud.parentElement.getBoundingClientRect(),
      wrapperRect: hud.closest('.tooth-svg-wrapper').getBoundingClientRect(),
    };
  });
  console.log('HUD DEBUG:', JSON.stringify(info, null, 2));
  await browser.close();
})();
