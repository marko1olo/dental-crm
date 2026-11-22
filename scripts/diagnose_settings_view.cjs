const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  page.on('console', msg => console.log('PAGE LOG:', msg.text()));
  page.on('pageerror', err => console.log('PAGE ERROR:', err.message));
  await page.goto('http://127.0.0.1:5173/?standalone=settings#settings/access', { waitUntil: 'commit', timeout: 45000 });
  
  // Wait for React to finish lazy loading
  for (let i = 0; i < 30; i++) {
    await page.waitForTimeout(500);
    const hasLauncher = await page.evaluate(() => !!document.querySelector('[data-testid="direct-settings-launcher-root"]'));
    if (hasLauncher) {
      console.log(`>>> LAUNCHER MOUNTED at ${(i * 0.5).toFixed(1)}s!`);
      break;
    }
  }

  const info = await page.evaluate(() => {
    return {
      hash: window.location.hash,
      hasLauncher: !!document.querySelector('[data-testid="direct-settings-launcher-root"]'),
      hasRbac: !!document.querySelector('[data-testid="granular-role-matrix-panel"]'),
      bodySnippet: document.body.innerText.slice(0, 300)
    };
  });
  console.log('INFO:', JSON.stringify(info, null, 2));
  await browser.close();
})();
