const puppeteer = require('puppeteer');
const path = require('path');

const outDir = "C:\\Users\\Admin\\.gemini\\antigravity\\brain\\bc0239ab-e515-46b0-8dc0-1834905add79";
const PORT = 5173;

async function run() {
  const browser = await puppeteer.launch({ headless: 'new', args: ['--no-sandbox'] });
  
  const viewports = [
    { name: 'pc', width: 1440, height: 900, isMobile: false },
    { name: 'mobile', width: 375, height: 812, isMobile: true }
  ];
  const themes = ['light', 'dark'];
  
  for (const vp of viewports) {
    for (const theme of themes) {
      console.log(`--- Testing viewport: ${vp.name}, theme: ${theme} ---`);
      
      const page = await browser.newPage();
      await page.setViewport({ width: vp.width, height: vp.height, isMobile: vp.isMobile });
      await page.emulateMediaFeatures([{ name: 'prefers-color-scheme', value: theme }]);
      
      await page.goto(`http://localhost:${PORT}/#shift`, { waitUntil: 'networkidle0', timeout: 15000 });
      await new Promise(r => setTimeout(r, 2000)); // extra wait for render
      
      const filename = `dashboard_${vp.name}_${theme}_v2.png`;
      await page.screenshot({ path: path.join(outDir, filename), fullPage: true });
      console.log(`Saved ${filename}`);
      
      await page.close();
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
