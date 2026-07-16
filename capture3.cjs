const puppeteer = require('puppeteer');
const path = require('path');

async function capture() {
  const browser = await puppeteer.launch({ headless: 'new' });
  
  const page = await browser.newPage();
  
  const destDir = "C:\\Users\\Admin\\.gemini\\antigravity\\brain\\63103875-698a-4be4-a4a4-73961a003915";

  console.log("Navigating to app...");
  await page.goto('http://127.0.0.1:5173', { waitUntil: 'networkidle' });

  // Wait a bit for everything to settle
  await page.waitForTimeout(2000); await page.waitForSelector('.topbar', { timeout: 30000 }); await page.waitForTimeout(2000);

  // 1. PC Light
  console.log("Capturing PC Light...");
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.waitForTimeout(1000);
  await page.screenshot({ path: path.join(destDir, 'PC_Light_New.png') });

  // Click theme toggle (aria-label="Переключить тему" or the one with Moon/Sun)
  console.log("Toggling theme to Dark...");
  const themeToggle = await page.$('button[title="Переключить тему"]');
  if (themeToggle) {
    await themeToggle.click();
  } else {
    // try clicking the icon-button with Moon or Sun
    await page.evaluate(() => {
       const btns = Array.from(document.querySelectorAll('button.icon-button'));
       // Usually it's the second to last button
       btns[btns.length - 2]?.click();
    });
  }
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
  if (themeToggle) {
    await themeToggle.click();
  } else {
    await page.evaluate(() => {
       const btns = Array.from(document.querySelectorAll('button.icon-button'));
       btns[btns.length - 2]?.click();
    });
  }
  await page.waitForTimeout(1000);

  // 4. Mobile Light
  console.log("Capturing Mobile Light...");
  await page.screenshot({ path: path.join(destDir, 'Mobile_Light_New.png') });

  await browser.close();
  console.log("Done.");
}

capture().catch(console.error);
