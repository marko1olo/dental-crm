const { chromium } = require('playwright');
const path = require('path');

async function capture() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();
  
  const destDir = "C:\\Users\\Admin\\.gemini\\antigravity\\brain\\63103875-698a-4be4-a4a4-73961a003915";

  console.log("Navigating to app...");
  await page.goto('http://127.0.0.1:5173', { waitUntil: 'load' });

  // Wait a bit for everything to settle
  await page.waitForTimeout(4000);

  // 1. PC Light
  console.log("Capturing PC Light...");
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.waitForTimeout(1000);
  await page.screenshot({ path: path.join(destDir, 'PC_Light_New.png') });

  // Click theme toggle
  console.log("Toggling theme to Dark...");
  await page.evaluate(() => {
     localStorage.setItem('dente_theme_mode', 'dark');
     document.documentElement.setAttribute('data-theme', 'dark');
  });
  await page.waitForTimeout(1000);

  // 2. PC Dark
  console.log("Capturing PC Dark...");
  await page.screenshot({ path: path.join(destDir, 'PC_Dark_New.png') });

  // 3. Mobile Dark
  console.log("Capturing Mobile Dark...");
  await page.setViewportSize({ width: 375, height: 812 });
  await page.waitForTimeout(1000);
  await page.screenshot({ path: path.join(destDir, 'Mobile_Dark_New.png') });

  // Toggle theme to Light
  console.log("Toggling theme to Light...");
  await page.evaluate(() => {
     localStorage.setItem('dente_theme_mode', 'light');
     document.documentElement.setAttribute('data-theme', 'light');
  });
  await page.waitForTimeout(1000);

  // 4. Mobile Light
  console.log("Capturing Mobile Light...");
  await page.screenshot({ path: path.join(destDir, 'Mobile_Light_New.png') });

  await browser.close();
  console.log("Done.");
}

capture().catch(console.error);
