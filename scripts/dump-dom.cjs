const puppeteer = require('puppeteer');
const fs = require('fs');

(async () => {
  const browser = await puppeteer.launch({ headless: 'new' });
  const page = await browser.newPage();
  
  await page.evaluateOnNewDocument(() => {
    localStorage.setItem('dente-patient-token', '"test"');
    localStorage.setItem('dente-patient-phone', '"+1234567890"');
    localStorage.setItem('dente-wizard-completed', 'true');
    localStorage.setItem('dente-workspace-role', '"admin"');
  });

  await page.goto('http://localhost:5173', { waitUntil: 'networkidle0' });
  
  await new Promise(r => setTimeout(r, 2000));
  
  const html = await page.content();
  fs.writeFileSync('dom_dump.html', html);
  
  await browser.close();
})();
