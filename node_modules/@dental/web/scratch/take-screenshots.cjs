const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch({ headless: 'new' });
  const page = await browser.newPage();
  
  // Set a standard desktop resolution
  await page.setViewport({ width: 1440, height: 900 });

  // Bypass onboarding via localStorage
  await page.goto('http://127.0.0.1:5174/', { waitUntil: 'networkidle2' });
  await page.evaluate(() => {
    const state = JSON.stringify({
      version: 1,
      dismissed: true,
      draftMode: true,
      savedAt: new Date().toISOString()
    });
    localStorage.setItem('dental-crm:onboarding:v1', state);
    localStorage.setItem('dente:onboarding_local', state);
  });
  // Reload page to apply localStorage
  await page.reload({ waitUntil: 'networkidle2' });
  await new Promise(r => setTimeout(r, 2000));

  // Now go to Settings
  console.log('Navigating to Settings...');
  await page.goto('http://127.0.0.1:5174/#settings', { waitUntil: 'networkidle2' });
  await new Promise(r => setTimeout(r, 2000));
  await page.screenshot({ path: 'apps/web/scratch/settings_screenshot.png', fullPage: true });

  // 2. Documents View
  console.log('Navigating to Documents...');
  await page.goto('http://127.0.0.1:5174/#documents', { waitUntil: 'networkidle2' });
  await new Promise(r => setTimeout(r, 2000));
  await page.screenshot({ path: 'apps/web/scratch/documents_screenshot.png', fullPage: true });

  await browser.close();
  console.log('Screenshots saved.');
})();
