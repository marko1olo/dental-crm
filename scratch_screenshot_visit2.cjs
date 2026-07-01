const {chromium} = require('playwright');
(async () => {
  const b = await chromium.launch({headless: true});
  const p = await b.newPage();
  await p.setViewportSize({width: 1440, height: 1200});
  const OUT = 'C:/Users/Admin/.gemini/antigravity/brain/68ee88bd-584a-4a7f-948f-9353d73ce6fe/scratch/screenshots/final_visit_macros.png';
  await p.goto('http://localhost:5173/');
  
  // Go to patients via URL to avoid encoding issues
  await p.goto('http://localhost:5173/');
  // just click the 2nd nav link
  await p.click('nav a:nth-child(2)');
  await p.waitForTimeout(500);
  
  // Click first patient
  await p.click('.patient-list article:first-child');
  await p.waitForTimeout(500);
  
  // Create visit - there is a button 'Начать прием' but we can just use CSS selector
  await p.click('button:has-text("Начать прием"), .patient-action-start-visit');
  await p.waitForTimeout(1000);
  
  // Scroll to EMK tabs
  await p.evaluate(() => {
    const el = document.querySelector('.macro-templates-row');
    if (el) el.scrollIntoView({behavior: 'smooth', block: 'center'});
  });
  
  await p.waitForTimeout(1000);
  
  await p.screenshot({path: OUT});
  await b.close();
  console.log('screenshot done');
})();
