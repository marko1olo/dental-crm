const puppeteer = require('puppeteer');
(async () => {
  const browser = await puppeteer.launch({ headless: 'new' });
  const page = await browser.newPage();
  
  await page.setViewport({ width: 1280, height: 800 });
  await page.goto('http://localhost:5173', { waitUntil: 'networkidle0' });
  
  await new Promise(r => setTimeout(r, 1000));

  await page.evaluate(() => {
    const buttons = Array.from(document.querySelectorAll('button'));
    const btn = buttons.find(b => b.textContent.includes('Открыть прием'));
    if (btn) btn.click();
  });

  await new Promise(r => setTimeout(r, 2000));

  // Inject AI data
  await page.evaluate(() => {
    const teeth = document.querySelectorAll('.tooth');
    if (teeth.length > 0) {
      const t36 = Array.from(teeth).find(t => t.textContent.includes('36'));
      const t46 = Array.from(teeth).find(t => t.textContent.includes('46'));
      
      if (t36) {
        t36.classList.remove('tooth-idle');
        t36.classList.add('tooth-treatment', 'tooth-ai-detected');
        t36.setAttribute('title', 'ShadowAnalyst: Кариес дентина');
      }
      if (t46) {
        t46.classList.remove('tooth-idle');
        t46.classList.add('tooth-done', 'tooth-ai-detected');
        t46.setAttribute('title', 'ShadowAnalyst: Коронка');
      }
    }
  });

  await new Promise(r => setTimeout(r, 1000));
  await page.screenshot({ path: 'screenshot_visit_desktop3.png', fullPage: true });
  await browser.close();
})();
