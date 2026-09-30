import { chromium } from 'playwright';

async function run() {
  const browser = await chromium.launch({
    headless: true,
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--ignore-gpu-blocklist', '--use-gl=angle', '--enable-webgl']
  });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();

  page.on('pageerror', err => console.error('[PAGE ERROR]', err.message, err.stack));
  page.on('console', msg => console.log('[CONSOLE]', msg.type(), msg.text()));

  await page.route('**/api/**', async (route) => {
    const url = route.request().url();
    if (url.includes('/api/dashboard')) {
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          clinicSettings: { profile: { id: 'c-1', mode: 'small_clinic' }, staff: [], chairs: [] },
          shiftIntelligence: { modeFit: { mode: 'small_clinic' } },
          patients: []
        })
      });
    }
    if (url.includes('/api/auth/user/me') || url.includes('/api/auth/session')) {
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ user: { id: 'doc-1', role: 'owner' } })
      });
    }
    return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([]) });
  });

  await page.addInitScript(() => {
    localStorage.setItem('dente_clinic_token', 'audit-token-clinic');
    localStorage.setItem('dente_staff_token', 'audit-token-staff');
    localStorage.setItem('dente_active_role', 'owner');
    localStorage.setItem('dente_onboarding_completed', 'true');
  });

  console.log('Navigating to http://127.0.0.1:5173/#imaging...');
  await page.goto('http://127.0.0.1:5173/#imaging', { waitUntil: 'networkidle' });
  console.log('Clicking imaging-open-3d-mpr...');
  await page.locator('[data-testid="imaging-open-3d-mpr"]').click();
  console.log('Waiting for modal...');
  await page.locator('[data-testid="cbct-studio-modal"]').waitFor({ state: 'visible' });

  const btn = page.locator('[data-testid="cbct-btn-load-demo-volume"]');
  console.log('Clicking demo volume btn...');
  await btn.click();

  for (let i = 0; i < 30; i++) {
    await page.waitForTimeout(1000);
    const info = await page.evaluate(() => {
      const dropzone = document.querySelector('[data-testid="cbct-empty-volume-dropzone"]');
      const axial = document.querySelector('[data-testid="cbct-viewport-container-axial"]');
      const loading = document.querySelector('[data-testid="cbct-loading-status-overlay"]');
      const statusH3 = dropzone?.querySelector('h3')?.textContent?.trim();
      const progressText = dropzone?.querySelector('.font-mono')?.textContent?.trim();
      return { hasDropzone: !!dropzone, hasAxial: !!axial, hasLoading: !!loading, statusH3, progressText };
    });
    console.log(`[Second ${i+1}] State:`, info);
    if (info.hasAxial) {
      console.log('SUCCESS! Axial container mounted!');
      break;
    }
  }

  await browser.close();
}

run().catch(e => console.error(e));
