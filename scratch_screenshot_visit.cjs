const {chromium} = require('playwright');
(async () => {
  const b = await chromium.launch({headless: true});
  const p = await b.newPage();
  await p.setViewportSize({width: 1440, height: 1200});
  const OUT = 'C:/Users/Admin/.gemini/antigravity/brain/68ee88bd-584a-4a7f-948f-9353d73ce6fe/scratch/screenshots/final_visit_macros.png';
  await p.goto('http://localhost:5173/');
  
  // Go to patients
  await p.click('nav a:nth-child(2)'); // Пациенты
  await p.waitForTimeout(500);
  
  // Click first patient
  await p.click('.patient-list tbody tr:first-child');
  await p.waitForTimeout(500);
  
  // Create visit
  await p.click('button:has-text("Начать прием")');
  await p.waitForTimeout(1000);
  
  // Scroll to EMK
  await p.evaluate(() => {
    const el = document.querySelector('.emk-tabs-container');
    if (el) el.scrollIntoView({behavior: 'smooth', block: 'center'});
  });
  
  await p.waitForTimeout(1000);
  
  await p.screenshot({path: OUT});
  await b.close();
  console.log('screenshot done');
})();
