const {chromium} = require('playwright');
const fs = require('fs');

(async () => {
  const b = await chromium.launch({headless: true});
  const p = await b.newPage();
  await p.setViewportSize({width: 1440, height: 1080});
  
  const OUT_DIR = 'C:/Users/Admin/.gemini/antigravity/brain/68ee88bd-584a-4a7f-948f-9353d73ce6fe/scratch/audit_after/';
  if (!fs.existsSync(OUT_DIR)) {
    fs.mkdirSync(OUT_DIR, {recursive: true});
  }

  const take = async (name, hash) => {
    await p.goto('http://localhost:5173/');
    await p.waitForTimeout(500);
    await p.evaluate((h) => window.location.hash = h, hash);
    await p.waitForTimeout(1000);
    await p.screenshot({path: OUT_DIR + name + '.png', fullPage: true});
    console.log('Saved ' + name);
  };

  await take('01_Dashboard_After', '');
  await take('04_Visit_After', 'visit');
  await take('05_Documents_After', 'documents');
  await take('07_Settings_After', 'settings');

  await b.close();
  console.log('Audit complete');
})();
