const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  
  const errors = [];
  page.on('console', msg => {
    if (msg.type() === 'error') {
      errors.push(`CONSOLE ERROR: ${msg.text()}`);
    }
  });
  page.on('pageerror', exception => {
    errors.push(`PAGE ERROR: ${exception}`);
  });

  try {
    await page.goto('http://127.0.0.1:5173', { waitUntil: 'networkidle' });
    
    // Create artifacts directory if not exists
    const artifactDir = 'C:\\Users\\Admin\\.gemini\\antigravity\\brain\\01cc0f7c-d8d0-4433-951f-33094864abbe';
    if (!fs.existsSync(artifactDir)){
      fs.mkdirSync(artifactDir, { recursive: true });
    }
    
    const screenshotPath = path.join(artifactDir, 'screenshot.png');
    await page.screenshot({ path: screenshotPath });
    
    console.log(JSON.stringify({ screenshot: screenshotPath, errors }));
  } catch (err) {
    console.log(JSON.stringify({ error: err.message, errors }));
  } finally {
    await browser.close();
  }
})();
