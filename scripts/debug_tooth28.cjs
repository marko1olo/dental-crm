const { chromium } = require('playwright');

async function debug() {
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
    localStorage.setItem('dente_tour_completed', 'true');
    localStorage.setItem('dente_quest_progress_v1', JSON.stringify({
      isDismissedPermanently: true,
      isTourActive: false,
      tracksProgress: {
        solo_doctor: { completed: true, completedStepIds: [] },
        reception_admin: { completed: true, completedStepIds: [] },
        imaging_diagnostics: { completed: true, completedStepIds: [] }
      }
    }));
  });
  await page.goto('http://127.0.0.1:5173/#visit', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(2000);

  await page.evaluate(() => {
    document.querySelectorAll('[data-testid="guided-tour-spotlight-overlay"], .tour-spotlight-root').forEach(el => el.remove());
    const b = Array.from(document.querySelectorAll('button')).find(el => el.textContent && el.textContent.includes('Зубная формула'));
    if (b) b.click();
  });
  await page.waitForTimeout(1500);

  const t28Info = await page.evaluate(() => {
    const el = document.querySelector('.odontogram-view-container [data-tooth-id="28"]');
    if (!el) return { exists: false };
    const rect = el.getBoundingClientRect();
    const style = window.getComputedStyle(el);
    return {
      exists: true,
      rect: { x: rect.x, y: rect.y, w: rect.width, h: rect.height },
      display: style.display,
      visibility: style.visibility,
      opacity: style.opacity,
      offsetParent: el.offsetParent !== null
    };
  });
  console.log('Tooth 28 debug info:', t28Info);

  // Now click it via DOM click
  const clickRes = await page.evaluate(() => {
    const el = document.querySelector('.odontogram-view-container [data-tooth-id="28"]');
    if (!el) return false;
    el.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, view: window }));
    return true;
  });
  console.log('Dispatched click on tooth 28:', clickRes);
  await page.waitForTimeout(1000);

  const menuInfo = await page.evaluate(() => {
    const hub = document.querySelector('.radial-tooth-menu-container');
    if (!hub) return null;
    const btns = Array.from(document.querySelectorAll('.radial-item-btn')).map(b => ({
      text: b.innerText.trim().replace(/\n/g, ' '),
      rect: { x: Math.round(b.getBoundingClientRect().x), y: Math.round(b.getBoundingClientRect().y), w: Math.round(b.getBoundingClientRect().width), h: Math.round(b.getBoundingClientRect().height) }
    }));
    return { open: true, btns };
  });
  console.log('Menu info for tooth 28:', JSON.stringify(menuInfo, null, 2));

  await browser.close();
}

debug().catch(console.error);
