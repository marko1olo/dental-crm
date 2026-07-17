const puppeteer = require('puppeteer');
const path = require('path');

async function takeScreenshots() {
  const browser = await puppeteer.launch({ headless: true });
  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900 });

  // Assume the dev server is running on localhost:5173
  const baseUrl = 'http://localhost:5173';
  
  try {
    console.log(`Navigating to ${baseUrl}`);
    await page.goto(baseUrl, { waitUntil: 'networkidle2' });
    
    // Login if needed
    try {
      await page.waitForSelector('button[type="submit"]', { timeout: 3000 });
      console.log('Login form found, submitting...');
      await page.click('button[type="submit"]');
      await page.waitForNavigation({ waitUntil: 'networkidle2' });
    } catch (e) {
      console.log('No login form found or already logged in.');
    }

    const outDir = path.join('C:', 'Users', 'Admin', '.gemini', 'antigravity', 'brain', '005bd331-1b27-451e-bba5-2fdf74d50047', 'scratch');

    // 1. Dashboard/Schedule
    await page.screenshot({ path: path.join(outDir, 'schedule_light.png') });
    console.log('Saved schedule_light.png');

    // Switch to Dark mode if there is a toggle
    try {
        await page.evaluate(() => {
            document.documentElement.classList.add('dark');
        });
        await page.waitForTimeout(500);
        await page.screenshot({ path: path.join(outDir, 'schedule_dark.png') });
        console.log('Saved schedule_dark.png');
        await page.evaluate(() => {
            document.documentElement.classList.remove('dark');
        });
        await page.waitForTimeout(500);
    } catch (e) {}

    // 2. Patients View
    try {
        // Try to click Patients tab
        await page.evaluate(() => {
            const tabs = Array.from(document.querySelectorAll('button, a'));
            const patientTab = tabs.find(t => t.innerText && t.innerText.includes('Пациенты'));
            if (patientTab) patientTab.click();
        });
        await page.waitForTimeout(1000);
        await page.screenshot({ path: path.join(outDir, 'patients_light.png') });
        console.log('Saved patients_light.png');
    } catch (e) {}

    // 3. Visit View
    try {
        await page.evaluate(() => {
            const tabs = Array.from(document.querySelectorAll('button, a'));
            const visitTab = tabs.find(t => t.innerText && t.innerText.includes('Приём'));
            if (visitTab) visitTab.click();
        });
        await page.waitForTimeout(1000);
        await page.screenshot({ path: path.join(outDir, 'visit_light.png') });
        console.log('Saved visit_light.png');
    } catch (e) {}
    
  } catch (error) {
    console.error('Error during screenshot capture:', error);
  } finally {
    await browser.close();
  }
}

takeScreenshots();
