const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const auth = await (await fetch('http://127.0.0.1:4100/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'doctor@clinic.com', password: 'dente2026' }),
  })).json();

  await context.addInitScript(({ clinicToken, staffToken, user }) => {
    localStorage.setItem('dente_clinic_token', clinicToken);
    localStorage.setItem('dente_staff_token', staffToken);
    localStorage.setItem('dente_active_role', 'doctor');
    localStorage.setItem('dental-crm:active-user:v1', JSON.stringify(user));
  }, { clinicToken: auth.clinicToken, staffToken: auth.staffToken, user: auth.user });

  const page = await context.newPage();
  await page.goto('http://127.0.0.1:5173/#visit', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(3000);

  // Switch to odontogram tab
  const odontogramTab = page.locator('[data-testid="visit-subtab-odontogram"]');
  await odontogramTab.click();
  await page.waitForTimeout(2000);

  // Dispatch event
  await page.evaluate(() => {
    window.dispatchEvent(new CustomEvent('dente:open-visit-summary-modal'));
  });
  await page.waitForTimeout(1000);

  const modal = page.locator('[data-testid="visit-summary-modal"]');
  console.log('Is modal open via event:', await modal.isVisible());

  if (!(await modal.isVisible())) {
    const moreBtn = page.locator('[data-testid="diary-more-actions-btn"]');
    await moreBtn.click();
    await page.waitForTimeout(500);
    const summaryBtn = page.locator('[data-testid="diary-summary-btn"]');
    await summaryBtn.click();
    await page.waitForTimeout(1000);
    console.log('Is modal open via click:', await modal.isVisible());
  }

  await browser.close();
})();
