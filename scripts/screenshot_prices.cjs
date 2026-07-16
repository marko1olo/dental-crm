const puppeteer = require('puppeteer');
const path = require('path');

const wait = (ms) => new Promise(r => setTimeout(r, ms));

async function run() {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  
  await page.setViewport({ width: 1280, height: 720 });
  await page.emulateMediaFeatures([{ name: 'prefers-color-scheme', value: 'dark' }]);

  await page.goto('http://127.0.0.1:5173', { waitUntil: 'networkidle0' });
  
  await page.evaluate(() => {
    localStorage.setItem('dente_clinic_token', 'dental');
    localStorage.setItem('dente_clinic_tenant_id', 'org_dental_1');
  });
  
  await page.goto('http://127.0.0.1:5173', { waitUntil: 'networkidle0' });

  // Click on Settings icon
  const settingsSelector = "nav button, nav a";
  const elementsNav = await page.$$(settingsSelector);
  for (const el of elementsNav) {
    const text = await page.evaluate(e => e.textContent || e.title || e.className, el);
    if (text.toLowerCase().includes('setting') || text.includes('lucide-settings')) {
        await el.click();
        break;
    }
  }
  
  // if standard layout has nav-bottom-item:
  try {
      await page.click('.nav-bottom-item');
  } catch(e) {}
  
  await wait(1000);
  
  // Click on Protocols Tab
  await page.evaluate(() => {
      const spans = Array.from(document.querySelectorAll('span'));
      const target = spans.find(s => s.textContent.includes('Протоколы') || s.textContent.includes('Шаблоны'));
      if (target) {
          target.click();
      }
  });
  
  await wait(1000);
  
  const basePath = 'C:\\Users\\Admin\\.gemini\\antigravity\\brain\\63103875-698a-4be4-a4a4-73961a003915';

  await page.screenshot({ path: path.join(basePath, 'Settings_Prices_Dark.png'), fullPage: true });

  await page.emulateMediaFeatures([{ name: 'prefers-color-scheme', value: 'light' }]);
  await wait(1000);

  await page.screenshot({ path: path.join(basePath, 'Settings_Prices_Light.png'), fullPage: true });

  // Mobile
  await page.setViewport({ width: 375, height: 812, isMobile: true });
  await page.emulateMediaFeatures([{ name: 'prefers-color-scheme', value: 'dark' }]);
  await wait(1000);
  await page.screenshot({ path: path.join(basePath, 'Settings_Prices_Mobile_Dark.png'), fullPage: true });

  await page.emulateMediaFeatures([{ name: 'prefers-color-scheme', value: 'light' }]);
  await wait(1000);
  await page.screenshot({ path: path.join(basePath, 'Settings_Prices_Mobile_Light.png'), fullPage: true });

  await browser.close();
  console.log('Saved screenshots.');
}
run().catch(console.error);
