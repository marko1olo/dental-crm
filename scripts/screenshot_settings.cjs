const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

async function run() {
  const browser = await chromium.launch();
  const context = await browser.newContext({
    viewport: { width: 1280, height: 720 },
    colorScheme: 'dark'
  });
  const page = await context.newPage();
  await page.goto('http://127.0.0.1:5173', { waitUntil: 'networkidle' });
  
  // Click on Settings icon
  await page.locator('.nav-bottom-item').first().click();
  await page.waitForTimeout(1000);
  
  // Click on Protocols Tab
  await page.getByText('Протоколы').click();
  await page.waitForTimeout(1000);
  
  const p = path.join(process.env.APPDATA || process.env.LOCALAPPDATA || 'C:\\Users\\Admin\\AppData\\Roaming', '..', '..', 'Admin', '.gemini', 'antigravity', 'brain', '63103875-698a-4be4-a4a4-73961a003915', 'Settings_Protocols_Dark.png');
  await page.screenshot({ path: p, fullPage: true });

  await browser.close();
  console.log('Saved to', p);
}
run().catch(console.error);
