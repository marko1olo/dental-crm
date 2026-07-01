const {chromium} = require('playwright');
const fs = require('fs');

(async () => {
  const b = await chromium.launch({headless: true});
  const p = await b.newPage();
  await p.setViewportSize({width: 1440, height: 1080});
  
  const OUT_DIR = 'C:/Users/Admin/.gemini/antigravity/brain/68ee88bd-584a-4a7f-948f-9353d73ce6fe/scratch/audit/';
  if (!fs.existsSync(OUT_DIR)) {
    fs.mkdirSync(OUT_DIR, {recursive: true});
  }

  const take = async (name, url, hash = '') => {
    await p.goto(url);
    if(hash) {
       await p.evaluate((h) => window.location.hash = h, hash);
    }
    await p.waitForTimeout(1500); // Wait for renders
    await p.screenshot({path: OUT_DIR + name + '.png', fullPage: true});
    console.log('Saved ' + name);
  };

  await take('01_Dashboard', 'http://localhost:5173/');
  
  // To view patient-specific tabs, we must select a patient first.
  await p.goto('http://localhost:5173/');
  await p.waitForTimeout(1000);
  
  // Click first patient in PatientsView
  await p.click('nav a:nth-child(2)'); // Patients tab
  await p.waitForTimeout(1000);
  await take('02_Patients_List', 'http://localhost:5173/', 'patients');

  await p.click('.patient-list article:first-child');
  await p.waitForTimeout(1000);
  await take('03_Patient_Detail', 'http://localhost:5173/', 'patients');
  
  // Now we have a selected patient, we can visit other tabs
  await take('04_Visit', 'http://localhost:5173/', 'visit');
  await take('05_Documents', 'http://localhost:5173/', 'documents');
  await take('06_Finance', 'http://localhost:5173/', 'finance');
  await take('07_Settings', 'http://localhost:5173/', 'settings');
  await take('08_Schedule', 'http://localhost:5173/', 'schedule');

  await b.close();
  console.log('Audit complete');
})();
