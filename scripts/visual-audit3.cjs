const puppeteer = require('puppeteer');
const fs = require('fs');

(async () => {
  const browser = await puppeteer.launch({ headless: 'new' });
  const page = await browser.newPage();
  
  await page.setViewport({ width: 1440, height: 900 });

  const delay = ms => new Promise(res => setTimeout(res, ms));

  const artifactsDir = 'C:/Users/Admin/.gemini/antigravity/brain/e413e738-71c0-4b21-884d-6f53c4ba6235/';
  
  const takeScreenshot = async (name) => {
    const path = `${artifactsDir}audit_${name}.png`;
    await page.screenshot({ path });
    console.log(`Saved ${path}`);
  };

  try {
    console.log("Navigating to app...");
    await page.goto('http://localhost:5173', { waitUntil: 'networkidle2' });
    
    await delay(2000);

    // Click demo mode if visible
    const clickedDemo = await page.evaluate(() => {
        const buttons = Array.from(document.querySelectorAll('button'));
        const demoBtn = buttons.find(b => b.textContent && b.textContent.includes('Попробовать демо-режим'));
        if (demoBtn) {
            demoBtn.click();
            return true;
        }
        return false;
    });

    if (clickedDemo) {
        console.log("Clicked Demo Mode...");
        await delay(2000);
        // Wait for confirmation button "Завершить настройку"
        await page.evaluate(() => {
            const buttons = Array.from(document.querySelectorAll('button'));
            const proceedBtn = buttons.find(b => b.textContent && b.textContent.includes('Завершить'));
            if (proceedBtn) proceedBtn.click();
        });
        await delay(3000);
    }

    // Now wait for .app-shell
    await page.waitForSelector('.app-shell', { timeout: 10000 }).catch(() => console.log('Timeout waiting for .app-shell'));
    await delay(3000);
    
    // 1. Dashboard / Schedule
    await takeScreenshot('schedule');

    // 2. Patients
    await page.evaluate(() => { window.location.hash = 'patients'; });
    await delay(3000);
    await takeScreenshot('patients');

    // 3. Settings
    await page.evaluate(() => { window.location.hash = 'settings'; });
    await delay(3000);
    await takeScreenshot('settings');

    // 4. Imaging / CT
    await page.evaluate(() => { window.location.hash = 'imaging'; });
    await delay(3000);
    await takeScreenshot('imaging');

  } catch (err) {
    console.error("Error during audit:", err);
  } finally {
    await browser.close();
  }
})();
