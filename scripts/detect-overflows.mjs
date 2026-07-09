import puppeteer from 'puppeteer';

const APP_URL = 'http://127.0.0.1:5173';

const VIEWS = [
  { name: 'Dashboard', hash: '#/dashboard' },
  { name: 'EMK', hash: '#/patients/00000000-0000-0000-0000-000000000001' },
  { name: 'Odontogram', hash: '#/visit/00000000-0000-0000-0000-000000000002' },
];

(async () => {
  const browser = await puppeteer.launch({ headless: 'new' });
  const page = await browser.newPage();
  
  await page.evaluateOnNewDocument(() => {
    localStorage.setItem('dente_clinic_token', 'audit-bypass');
    localStorage.setItem('dente_staff_token', 'audit-bypass');
  });

  for (const view of VIEWS) {
    await page.setViewport({ width: 375, height: 812, isMobile: true, hasTouch: true });
    await page.goto(`${APP_URL}/${view.hash}`, { waitUntil: 'domcontentloaded' });
    await new Promise(r => setTimeout(r, 4000));
    
    const bugs = await page.evaluate(() => {
      const issues = [];
      const w = window.innerWidth;
      document.querySelectorAll('*').forEach(el => {
        const rect = el.getBoundingClientRect();
        if (rect.right > w + 1 && el.tagName !== 'HTML' && el.tagName !== 'BODY') {
           // check if it's scrollable or just overflowing
           const style = window.getComputedStyle(el);
           if (style.overflowX !== 'scroll' && style.overflowX !== 'auto') {
             issues.push(`Overflow: <${el.tagName.toLowerCase()} class="${el.className}"> width: ${rect.width}, right: ${rect.right} > viewport ${w}`);
           }
        }
      });
      return issues;
    });

    if (bugs.length > 0) {
      console.log(`[${view.name} Mobile] Found overflows:`);
      // print unique ones
      const unique = [...new Set(bugs)];
      unique.slice(0, 10).forEach(b => console.log('  ' + b));
    } else {
      console.log(`[${view.name} Mobile] No obvious horizontal overflows.`);
    }
  }

  await browser.close();
})();
