const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const OUTPUT_DIR = 'C:/Clinic_MVP/dental-crm/docs/proofs/ui_audit';
if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

(async () => {
  const browser = await chromium.launch();
  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 },
    colorScheme: 'dark' // We strictly test in Dark Mode as requested
  });
  const page = await context.newPage();
  
  page.on('console', msg => console.log(msg.text())); 
  
  console.log('Navigating to local server...');
  await page.goto('http://127.0.0.1:5173/');
  
  // Wait for React to mount and any initial data to load
  await page.waitForTimeout(5000);
  
  console.log('Opening Odontogram tab...');
  await page.evaluate(() => { window.location.hash = '#/odontogram'; });
  
  // Wait for module to render
  await page.waitForTimeout(2000);
  
  // Take screenshot of empty state and layout before popup
  await page.screenshot({ path: path.join(OUTPUT_DIR, 'odontogram_initial_layout.png'), fullPage: true });
  console.log('Saved initial layout screenshot.');
  
  console.log('Clicking Tooth 46 (Lower Jaw - Popup should be ABOVE)...');
  await page.evaluate(() => {
    const el = Array.from(document.querySelectorAll('.tooth-number')).find(el => el.textContent === '46');
    if (el && el.parentElement) {
       el.parentElement.click();
    }
  });
  
  // Wait for popup animation
  await page.waitForTimeout(1500);
  
  await page.screenshot({ path: path.join(OUTPUT_DIR, 'odontogram_tooth46_popup.png'), fullPage: true });
  console.log('Saved Tooth 46 popup screenshot.');
  
  // Close popup
  await page.evaluate(() => {
    // Backdrop click might be hard to simulate blindly, let's just use Escape key
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
  });
  
  await page.waitForTimeout(1000);
  
  console.log('Clicking Tooth 15 (Upper Jaw - Popup should be BELOW)...');
  await page.evaluate(() => {
    const el = Array.from(document.querySelectorAll('.tooth-number')).find(el => el.textContent === '15');
    if (el && el.parentElement) {
       el.parentElement.click();
    }
  });
  
  await page.waitForTimeout(1500);
  
  await page.screenshot({ path: path.join(OUTPUT_DIR, 'odontogram_tooth15_popup.png'), fullPage: true });
  console.log('Saved Tooth 15 popup screenshot.');

  await browser.close();
  console.log('Test completed successfully.');
})();
