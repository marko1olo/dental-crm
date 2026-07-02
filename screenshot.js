const puppeteer = require('puppeteer');
(async () => {
  const browser = await puppeteer.launch({ headless: 'new' });
  const page = await browser.newPage();
  
  // Set desktop viewport
  await page.setViewport({ width: 1280, height: 800 });
  await page.goto('http://localhost:5173', { waitUntil: 'networkidle0' });
  
  // Wait a moment for any animations/renders
  await new Promise(r => setTimeout(r, 2000));
  
  // Try to find the dental chart or patient view
  await page.screenshot({ path: 'screenshot_desktop.png', fullPage: true });
  
  // Set mobile viewport
  await page.setViewport({ width: 375, height: 812 });
  await new Promise(r => setTimeout(r, 1000));
  await page.screenshot({ path: 'screenshot_mobile.png', fullPage: true });

  await browser.close();
})();
