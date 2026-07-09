const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const OUTPUT_DIR = 'C:/Clinic_MVP/dental-crm/docs/proofs/ui_audit';
if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

const VIEWPORTS = [
  { name: 'PC', width: 1920, height: 1080 },
  { name: 'Laptop', width: 1366, height: 768 },
  { name: 'Tablet', width: 768, height: 1024 },
  { name: 'Mobile', width: 375, height: 812 }
];

const PAGES_TO_AUDIT = [
  { name: 'Dashboard', hash: '#/dashboard' },
  { name: 'PatientCard', hash: '#/patient/mock-patient' },
  { name: 'Odontogram', hash: '#/odontogram' },
  { name: 'Finance', hash: '#/finance' },
  { name: 'PatientPortal', hash: '#/portal' }
];

async function setupMocks(page) {
  await page.route('**/api/**', route => {
    const url = route.request().url();
    if (url.includes('/patients')) {
      route.fulfill({
        status: 200, contentType: 'application/json',
        body: JSON.stringify([{ id: 'mock-patient', fullName: 'Иванов Иван Иванович', phone: '+79991234567' }])
      });
    } else if (url.includes('/appointments') || url.includes('/schedule')) {
      route.fulfill({
        status: 200, contentType: 'application/json',
        body: JSON.stringify([{ id: 'apt1', patientId: 'mock-patient', chairId: 'chair-1', start: new Date().toISOString(), end: new Date(Date.now() + 3600000).toISOString() }])
      });
    } else {
      route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ success: true, data: [] }) });
    }
  });
}

(async () => {
  const browser = await chromium.launch();

  for (const vp of VIEWPORTS) {
    const context = await browser.newContext({
      viewport: { width: vp.width, height: vp.height },
      colorScheme: 'dark'
    });
    
    for (const p of PAGES_TO_AUDIT) {
      const page = await context.newPage();
      await setupMocks(page);
      
      console.log(`Navigating to ${p.name} on ${vp.name}...`);
      await page.goto(`http://127.0.0.1:5173/`);
      
      await page.evaluate((hash) => { window.location.hash = hash; }, p.hash);
      await page.waitForTimeout(3000); // Wait for render
      
      const filename = path.join(OUTPUT_DIR, `${p.name}_${vp.name}_Dark.png`);
      await page.screenshot({ path: filename, fullPage: true });
      console.log(`Saved ${filename}`);
      
      await page.close();
    }

    const contextLight = await browser.newContext({
      viewport: { width: vp.width, height: vp.height },
      colorScheme: 'light'
    });
    
    for (const p of PAGES_TO_AUDIT) {
      const page = await contextLight.newPage();
      await setupMocks(page);
      
      await page.goto(`http://127.0.0.1:5173/`);
      await page.evaluate((hash) => { window.location.hash = hash; }, p.hash);
      await page.waitForTimeout(3000); // Wait for render
      
      const filename = path.join(OUTPUT_DIR, `${p.name}_${vp.name}_Light.png`);
      await page.screenshot({ path: filename, fullPage: true });
      console.log(`Saved ${filename}`);
      
      await page.close();
    }

    await context.close();
    await contextLight.close();
  }

  await browser.close();
  console.log('Audit screenshots completed.');
})();
