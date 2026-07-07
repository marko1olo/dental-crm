const { chromium, devices } = require('playwright');
const path = require('path');
const fs = require('fs');

const OUTPUT_DIR = path.join(__dirname, 'docs', 'proofs', 'ui_audit');
if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

async function runTest(theme, isMobile) {
  const device = isMobile ? devices['iPhone 12'] : { viewport: { width: 1440, height: 900 } };
  const prefix = isMobile ? 'mobile' : 'pc';
  const name = `odontogram_${prefix}_${theme}`;
  
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    ...device,
    colorScheme: theme
  });
  
  const page = await context.newPage();
  page.on('console', msg => console.log(msg.text()));
  
  console.log(`Running ${name}...`);
  
  try {
    await page.goto('http://127.0.0.1:5173/');
    await page.waitForTimeout(3000);
    
    await page.evaluate(() => { window.location.hash = '#/odontogram'; });
    await page.waitForTimeout(2000); 
    
    // Explicitly enforce theme in Tailwind and custom CSS variables
    if (theme === 'dark') {
      await page.evaluate(() => {
        document.documentElement.classList.add('dark');
        document.body.setAttribute('data-theme', 'dark');
      });
    } else {
      await page.evaluate(() => {
        document.documentElement.classList.remove('dark');
        document.body.setAttribute('data-theme', 'light');
      });
    }
    
    // Extra wait for ResizeObserver to fire and React to re-render scaled teeth
    await page.waitForTimeout(1500);
    
    await page.screenshot({ path: path.join(OUTPUT_DIR, `${name}.png`), fullPage: true });
    console.log(`Saved ${name}.png`);
  } catch (e) {
    console.error(e);
  } finally {
    await browser.close();
  }
}

async function main() {
  await runTest('light', false);
  await runTest('dark', false);
  await runTest('light', true);
  await runTest('dark', true);
  
  console.log('All tests completed successfully.');
}
main();
