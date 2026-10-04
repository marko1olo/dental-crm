const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({
    headless: true,
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  try {
    const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    await ctx.addInitScript(() => {
      localStorage.setItem('dente_clinic_token', 'live-inquisition-clinic-token');
      localStorage.setItem('dente_staff_token', 'live-inquisition-staff-token');
      localStorage.setItem('dente_active_role', 'owner');
      localStorage.setItem('dente_theme_mode', 'light');
      localStorage.setItem('dente_active_patient_id', 'pat-1');
      localStorage.setItem('dente_tour_completed', 'true');
    });

    const page = await ctx.newPage();
    page.on('pageerror', err => console.log('PAGE ERROR:', err.message));
    page.on('console', msg => {
      if (msg.type() === 'error') console.log('CONSOLE ERROR:', msg.text());
    });

    // Mock API
    await page.route('**/api/**', async (route) => {
      const url = route.request().url();
      if (url.includes('/src/')) return route.continue();
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          user: { id: 'doc-1', fullName: 'Д-р Воронов Алексей Владимирович', role: 'owner', active: true },
          patients: [{ id: 'pat-1', fullName: 'Ковалёв Роман Станиславович' }],
          appointments: [],
          imagingStudies: [{
            id: 'study-1',
            patientId: 'pat-1',
            kind: 'periapical',
            modality: 'IO_SENSOR',
            title: 'RVG 16',
            status: 'available',
            previewUrl: '/radiology/sample_rvg_tooth16.jpg'
          }]
        })
      });
    });

    await page.goto('http://127.0.0.1:5173/#schedule', { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('.app-shell', { timeout: 30000 });
    await page.click('a[href="#imaging"]');
    await page.waitForTimeout(1500);

    const openRadBtn = await page.waitForSelector('[data-testid="imaging-open-radiology-module"]', { timeout: 15000 });
    await openRadBtn.click();
    await page.waitForSelector('[data-testid="radiology-module-container"]', { timeout: 15000 });
    console.log('Radiology container visible!');

    const openReportBtn = await page.waitForSelector('[data-testid="btn-open-report-studio"]', { timeout: 15000 });
    console.log('Clicking btn-open-report-studio...');
    await openReportBtn.click();

    await page.waitForTimeout(2000);
    await page.screenshot({ path: 'scripts/after_click_report.png' });
    console.log('Saved scripts/after_click_report.png');

    const modal = await page.$('[data-testid="radiology-report-studio-modal"]');
    console.log('Modal found:', Boolean(modal));
    if (modal) {
      console.log('Modal isVisible:', await modal.isVisible());
    }
  } finally {
    await browser.close();
  }
})();
