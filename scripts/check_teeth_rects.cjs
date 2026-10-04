const { chromium } = require('playwright');

async function check() {
  const browser = await chromium.launch({
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    headless: true,
  });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  await page.addInitScript(() => {
    localStorage.setItem('dente_clinic_token', 'audit-token-clinic');
    localStorage.setItem('dente_staff_token', 'audit-token-staff');
    localStorage.setItem('dente_active_role', 'owner');
    localStorage.setItem('dente_demo_showcase', 'true');
    localStorage.setItem('dente_onboarding_completed', 'true');
  });
  await page.goto('http://127.0.0.1:5173/#visit', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(2000);

  await page.evaluate(() => {
    const b = Array.from(document.querySelectorAll('button')).find(el => el.textContent && el.textContent.includes('Зубная формула'));
    if (b) b.click();
  });
  await page.waitForTimeout(1500);

  const rects = await page.evaluate(() => {
    const all = [18, 17, 11, 21, 27, 28, 48, 41, 31, 38];
    const res = {};
    for (const id of all) {
      const el = document.querySelector(`.odontogram-view-container [data-tooth-id="${id}"]`);
      if (el) {
        const r = el.getBoundingClientRect();
        res[id] = { x: Math.round(r.x), y: Math.round(r.y), width: Math.round(r.width), height: Math.round(r.height) };
      } else {
        res[id] = null;
      }
    }
    return res;
  });

  console.log('Teeth rects:', JSON.stringify(rects, null, 2));
  await browser.close();
}

check().catch(console.error);
