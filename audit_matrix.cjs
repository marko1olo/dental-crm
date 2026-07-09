const puppeteer = require('puppeteer');
const path = require('path');
const outDir = 'C:\\Clinic_MVP\\dental-crm\\docs\\proofs\\ui_audit';
const PORT = 5173;

async function run() {
  const browser = await puppeteer.launch({ headless: 'new', args: ['--no-sandbox'] });
  const viewports = [
    { name: 'pc', width: 1440, height: 900, isMobile: false },
    { name: 'mobile', width: 375, height: 812, isMobile: true }
  ];
  const themes = ['light', 'dark'];
  const tabs = [
    { id: 'shift', path: 'shift' },
    { id: 'schedule', path: 'schedule' },
    { id: 'patients', path: 'patients' },
    { id: 'visit', path: 'visit' },
    { id: 'finance', path: 'finance' },
    { id: 'portal', path: 'portal' }
  ];

  for (const tab of tabs) {
    for (const vp of viewports) {
      for (const theme of themes) {
        console.log(`Testing tab: ${tab.id}, viewport: ${vp.name}, theme: ${theme}`);
        const page = await browser.newPage();
        await page.setViewport({ width: vp.width, height: vp.height, isMobile: vp.isMobile });
        await page.emulateMediaFeatures([{ name: 'prefers-color-scheme', value: theme }]);
        
        await page.goto(`http://localhost:${PORT}/#shift`, { waitUntil: 'networkidle0', timeout: 15000 }).catch(e => console.log('Timeout, continuing...'));
        await page.evaluate((p) => { window.location.hash = p; }, tab.path);
        await new Promise(r => setTimeout(r, 2000));
        
        const filename = `${tab.id}_${vp.name}_${theme}.png`;
        await page.screenshot({ path: path.join(outDir, filename), fullPage: true });
        console.log(`Saved ${filename}`);
        await page.close();
      }
    }
  }
  
  await browser.close();
  console.log('Done');
  process.exit(0);
}

run().catch(e => {
  console.error(e);
  process.exit(1);
});
