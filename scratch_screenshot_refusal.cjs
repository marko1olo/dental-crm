const {chromium} = require('playwright');
(async () => {
  const b = await chromium.launch({headless: true});
  const p = await b.newPage();
  await p.setViewportSize({width: 1440, height: 1200});
  const OUT = 'C:/Users/Admin/.gemini/antigravity/brain/68ee88bd-584a-4a7f-948f-9353d73ce6fe/scratch/screenshots/final_documents_refusal_chips.png';
  await p.goto('http://localhost:5173/');
  
  await p.click('nav a:has-text("Документы")');
  await p.waitForSelector('.quick-doc-picker');
  
  await p.click('button:has-text("Создать документ")');
  await p.waitForTimeout(500);
  
  await p.click('.quick-doc-more-toggle'); // Open details
  await p.selectOption('.quick-doc-more-row select', 'medical_intervention_refusal');
  
  await p.waitForTimeout(1000);
  
  await p.evaluate(() => {
    const el = document.querySelector('.document-payload-card');
    if (el) el.scrollIntoView({behavior: 'smooth', block: 'start'});
  });
  
  await p.waitForTimeout(1000);
  
  await p.screenshot({path: OUT});
  await b.close();
  console.log('documents refusal chips screenshot taken');
})();
