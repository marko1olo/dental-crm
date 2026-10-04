const { chromium } = require('playwright');

async function test() {
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

  const tooth28 = page.locator('.odontogram-view-container [data-tooth-id="28"]').first();
  console.log('Tooth 28 bounding box:', await tooth28.boundingBox());
  await tooth28.click({ force: true });
  await page.waitForTimeout(1000);

  const btns = await page.evaluate(() => {
    const list = Array.from(document.querySelectorAll('.radial-item-btn'));
    return list.map(b => ({
      text: b.innerText.trim().replace(/\n/g, ' '),
      rect: { x: Math.round(b.getBoundingClientRect().x), y: Math.round(b.getBoundingClientRect().y), w: Math.round(b.getBoundingClientRect().width), h: Math.round(b.getBoundingClientRect().height) }
    }));
  });
  console.log('Radial buttons count for Tooth 28:', btns.length);
  console.log('Buttons for Tooth 28:', btns);

  await browser.close();
}

test().catch(console.error);
