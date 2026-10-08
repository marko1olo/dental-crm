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
  await page.waitForTimeout(4000);

  const billingLoc = page.locator('[data-testid="visit-service-billing-widget"]');
  const count = await billingLoc.count();
  console.log('Count of visit-service-billing-widget:', count);
  if (count > 0) {
    const isVis = await billingLoc.first().isVisible();
    console.log('Is billing widget visible:', isVis);
    const text = await billingLoc.first().innerText();
    console.log('Billing widget header snippet:\n', text.slice(0, 300));
  }
  await browser.close();
})();
