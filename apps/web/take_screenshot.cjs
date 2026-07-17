const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

async function run() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  
  let isReady = false;
  for (let i = 0; i < 20; i++) {
    try {
      await page.goto('http://localhost:5174', { timeout: 2000 });
      isReady = true;
      break;
    } catch (e) {
      console.log(`Waiting for server... ${i}`);
      await new Promise(r => setTimeout(r, 1000));
    }
  }

  if (!isReady) {
    console.error('Server is not ready');
    process.exit(1);
  }

  await page.evaluate(() => {
    localStorage.setItem('dente_clinic_token', 'fake-clinic-token');
    localStorage.setItem('dente_staff_token', 'fake-staff-token');
    localStorage.setItem('dente-workspace-profile', JSON.stringify({ state: { flags: {} }}));
  });
  
  await page.goto('http://localhost:5174/#shift', { waitUntil: 'load' });
  await page.waitForTimeout(3000);

  // Check if we are on the Unlock page
  const hasUnlockForm = await page.evaluate(() => {
    return !!document.querySelector('.boot-unlock-form');
  });

  if (hasUnlockForm) {
    console.log('Unlock form detected. Filling it out...');
    await page.fill('input[type="password"]', 'dente-secret-key-1234'); // dummy secret
    await page.click('button[type="submit"]');
    await page.waitForTimeout(4000);
  }

  
  const artifactDir = "C:/Users/Admin/.gemini/antigravity/brain/005bd331-1b27-451e-bba5-2fdf74d50047";
  
  await page.screenshot({ path: path.join(artifactDir, 'screenshot_pc_light.png') });
  
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({ path: path.join(artifactDir, 'screenshot_mobile_light.png') });
  
  await page.emulateMedia({ colorScheme: 'dark' });
  
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.screenshot({ path: path.join(artifactDir, 'screenshot_pc_dark.png') });
  
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({ path: path.join(artifactDir, 'screenshot_mobile_dark.png') });

  await browser.close();
  console.log('Screenshots saved.');
}

run().catch(console.error);
