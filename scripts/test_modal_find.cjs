const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({
    headless: true,
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  console.log('Navigating to preview...');
  await page.goto('http://127.0.0.1:5173/cbct_2click_nerve_preview.html?step=1&theme=dark', { waitUntil: 'domcontentloaded' });
  console.log('Waiting for modal...');
  const modal = await page.waitForSelector('[data-testid="cbct-studio-modal"]', { timeout: 10000 });
  console.log('MODAL FOUND:', !!modal);
  await page.waitForTimeout(2000);
  console.log('Taking screenshot...');
  await page.screenshot({ path: 'scripts/test_modal_shot.png' });
  console.log('SCREENSHOT SUCCESS!');
  await browser.close();
})();
