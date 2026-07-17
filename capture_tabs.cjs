const puppeteer = require('puppeteer');
const path = require('path');

async function captureTabs() {
  const browser = await puppeteer.launch({ headless: true });
  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900 });

  const baseUrl = 'http://localhost:5173';
  const outDir = path.join('C:', 'Users', 'Admin', '.gemini', 'antigravity', 'brain', '005bd331-1b27-451e-bba5-2fdf74d50047', 'scratch');
  
  try {
    console.log(`Navigating to ${baseUrl}`);
    await page.goto(baseUrl, { waitUntil: 'domcontentloaded' });
    
    try {
      await page.waitForSelector('button[type="submit"]', { timeout: 3000 });
      await page.click('button[type="submit"]');
      await page.waitForNavigation({ waitUntil: 'domcontentloaded' });
    } catch (e) {
      console.log('No login form found or already logged in.');
    }

    const tabs = ['Расписание', 'Пациенты', 'Счета', 'Настройки', 'Приём', 'Планы'];

    for (const tab of tabs) {
      await page.evaluate((tabName) => {
          const links = Array.from(document.querySelectorAll('button, a, div[role="button"]'));
          const target = links.find(t => t.innerText && t.innerText.trim() === tabName);
          if (target) target.click();
      }, tab);
      
      await page.waitForTimeout(1500); // Wait for tab content to load and animate
      await page.screenshot({ path: path.join(outDir, `tab_${tab}.png`) });
      console.log(`Captured ${tab}`);
    }

  } catch (error) {
    console.error('Error during screenshot capture:', error);
  } finally {
    await browser.close();
  }
}

captureTabs();
