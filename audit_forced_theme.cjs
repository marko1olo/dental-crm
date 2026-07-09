const puppeteer = require('puppeteer');
const path = require('path');
const outDir = 'C:\\Clinic_MVP\\dental-crm\\docs\\proofs\\ui_audit';
const PORT = 5173;

async function getVisitPage(browser, vp, theme) {
  const page = await browser.newPage();
  await page.setViewport({ width: vp.width, height: vp.height, isMobile: vp.isMobile });
  await page.emulateMediaFeatures([{ name: 'prefers-color-scheme', value: theme }]);

  // Intercept and force theme via localStorage on new document
  await page.evaluateOnNewDocument((theme) => {
    localStorage.setItem('dente-theme', theme);
    localStorage.setItem('theme', theme);
  }, theme);

  await page.goto(`http://localhost:${PORT}/`, { waitUntil: 'networkidle2', timeout: 25000 }).catch(() => {});
  await new Promise(r => setTimeout(r, 2000));
  
  // Force class on documentElement
  await page.evaluate((theme) => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, theme);

  await page.keyboard.press('Escape');
  await new Promise(r => setTimeout(r, 300));

  const clicked = await page.evaluate(() => {
    const allLinks = Array.from(document.querySelectorAll('a, button, [role="button"], li, nav *'));
    const priemLink = allLinks.find(el => {
      const text = el.textContent?.trim() || '';
      return (text.startsWith('Прием') || text === 'Прием') && el.offsetParent !== null;
    });
    if (priemLink) {
      priemLink.click();
      return priemLink.textContent?.trim();
    }
    window.location.hash = '#visit';
    return null;
  });
  
  await new Promise(r => setTimeout(r, 3000));
  return page;
}

async function run() {
  const browser = await puppeteer.launch({ headless: 'new', args: ['--no-sandbox'] });
  const viewports = [
    { name: 'pc', width: 1440, height: 900, isMobile: false },
    { name: 'mobile', width: 375, height: 812, isMobile: true }
  ];
  const themes = ['light', 'dark'];

  for (const vp of viewports) {
    for (const theme of themes) {
      console.log(`Testing visit, viewport: ${vp.name}, theme: ${theme}`);
      const page = await getVisitPage(browser, vp, theme);
      const filename = `visit_forced_${vp.name}_${theme}.png`;
      await page.screenshot({ path: path.join(outDir, filename), fullPage: true });
      console.log(`Saved ${filename}`);
      await page.close();
    }
  }

  await browser.close();
  console.log('Done');
  process.exit(0);
}

run().catch(e => { console.error(e); process.exit(1); });
