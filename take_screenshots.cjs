const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

async function run() {
  console.log("Starting Playwright...");
  const browser = await chromium.launch({ headless: true });
  
  const routes = [
    { name: 'schedule', url: 'http://localhost:5173/#/schedule' },
    { name: 'patients', url: 'http://localhost:5173/#/patients' },
    { name: 'visit', url: 'http://localhost:5173/#/visit/patient-123' },
    { name: 'imaging', url: 'http://localhost:5173/#/imaging/patient-123' },
  ];
  
  const viewports = [
    { name: 'desktop', width: 1280, height: 800 },
    { name: 'mobile', width: 375, height: 812 } // iPhone X
  ];

  const screenshotsDir = path.join(__dirname, 'screenshots');
  if (!fs.existsSync(screenshotsDir)) {
    fs.mkdirSync(screenshotsDir);
  }

  for (const viewport of viewports) {
    const context = await browser.newContext({ viewport: { width: viewport.width, height: viewport.height } });
    const page = await context.newPage();
    
    // Set a timeout to allow the app to load
    page.setDefaultTimeout(15000);

    for (const route of routes) {
      console.log(`Navigating to ${route.name} on ${viewport.name}...`);
      try {
        await page.goto(route.url, { waitUntil: 'networkidle' });
        // wait an extra second for any animations/renders
        await page.waitForTimeout(1000);
        
        const screenshotPath = path.join(screenshotsDir, `${route.name}_${viewport.name}.png`);
        await page.screenshot({ path: screenshotPath, fullPage: true });
        console.log(`Saved screenshot: ${screenshotPath}`);
      } catch (err) {
        console.error(`Error capturing ${route.name} on ${viewport.name}:`, err.message);
      }
    }
    
    await context.close();
  }

  await browser.close();
  console.log("Done.");
}

run().catch(console.error);
