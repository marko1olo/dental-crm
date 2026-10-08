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

  const tab = page.locator('[data-testid="visit-subtab-odontogram"]');
  console.log('Tab count:', await tab.count());
  if (await tab.count() > 0) {
    console.log('Tab visible:', await tab.isVisible());
    console.log('Tab bounding box:', await tab.boundingBox());
    await tab.click();
    await page.waitForTimeout(2000);
    const moreBtn = page.locator('[data-testid="diary-more-actions-btn"]');
    console.log('More btn count after tab click:', await moreBtn.count());
    if (await moreBtn.count() > 0) {
      await moreBtn.click();
      await page.waitForTimeout(500);
      const summaryBtn = page.locator('[data-testid="diary-summary-btn"]');
      console.log('Summary btn count:', await summaryBtn.count());
      if (await summaryBtn.count() > 0) {
        await summaryBtn.click();
        await page.waitForTimeout(1000);
        const modal = page.locator('[data-testid="visit-summary-modal"]');
        console.log('Modal count:', await modal.count());
        if (await modal.count() > 0) {
          console.log('Modal is visible:', await modal.isVisible());
        }
      }
    } else {
      // Let's see what is inside the odontogram tab
      const html = await page.evaluate(() => {
        const el = document.querySelector('[data-testid="odontogram-formula"]') || document.body;
        return el.parentElement?.innerHTML?.slice(0, 500);
      });
      console.log('Odontogram parent innerHTML snippet:\n', html);
    }
  }

  await browser.close();
})();
