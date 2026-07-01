const {chromium} = require('playwright');
const fs = require('fs');

(async () => {
  const b = await chromium.launch({headless: true});
  const p = await b.newPage();
  await p.setViewportSize({width: 1440, height: 1080});
  
  const OUT_DIR = 'C:/Users/Admin/.gemini/antigravity/brain/68ee88bd-584a-4a7f-948f-9353d73ce6fe/scratch/audit_roles/';
  if (!fs.existsSync(OUT_DIR)) {
    fs.mkdirSync(OUT_DIR, {recursive: true});
  }

  const setRole = async (index) => {
    await p.click('.workspace-role-switcher summary');
    await p.waitForTimeout(500);
    await p.click('.workspace-role-switcher button:nth-child(' + index + ')');
    await p.waitForTimeout(1000);
  };

  const take = async (name, hash) => {
    await p.goto('http://localhost:5173/');
    await p.waitForTimeout(500);
    await p.evaluate((h) => window.location.hash = h, hash);
    await p.waitForTimeout(1000);
    await p.screenshot({path: OUT_DIR + name + '.png', fullPage: true});
    console.log('Saved ' + name);
  };

  await p.goto('http://localhost:5173/');
  await p.waitForTimeout(1000);
  
  // 1 is owner, 2 is doctor, 3 is admin, 4 is assistant
  await setRole(2); // doctor
  await take('01_Doctor_Dashboard', '');
  
  await setRole(3); // admin
  await take('02_Admin_Dashboard', '');

  await setRole(4); // assistant
  await take('03_Assistant_Dashboard', '');

  await b.close();
  console.log('Roles audit complete');
})();
