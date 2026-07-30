const { chromium } = require('playwright');

async function test() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  page.on('console', msg => console.log('CONSOLE:', msg.text()));
  page.on('pageerror', err => console.error('PAGE ERROR:', err));

  await page.route('**/api/**', route => {
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        clinicName: "Демо Клиника DENTE",
        todayIso: new Date().toISOString().split("T")[0],
        clinicSettings: {
          profile: {
            id: "demo-org",
            organizationId: "demo-org",
            clinicName: "Демо Клиника DENTE",
            legalName: "ООО Демо Клиника",
            timezone: "Europe/Moscow"
          },
          staff: [],
          chairs: []
        },
        appointments: [],
        serviceCatalog: [],
        treatmentPlanScenarios: [],
        billingSummary: {
          totalPlannedRub: 150000,
          totalPaidRub: 50000,
          totalDueRub: 100000,
          unpaidDocuments: 1,
          taxDeductionEligibleRub: 50000
        }
      })
    });
  });

  await page.goto('http://127.0.0.1:5173/#finance', { waitUntil: 'domcontentloaded' });
  await page.evaluate(() => {
    localStorage.setItem('dente_clinic_token', 'valid_demo_token');
    localStorage.setItem('dente_staff_token', 'valid_staff_token');
    localStorage.setItem('dente_ui_preferences_v1', JSON.stringify({ onboardingDismissed: true, showFullOnboardingGuide: false }));
  });
  await page.reload({ waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(1000);

  // Switch hash to finance
  await page.evaluate(() => {
    window.location.hash = 'finance';
    window.dispatchEvent(new HashChangeEvent("hashchange"));
  });
  await page.waitForTimeout(2000);

  await browser.close();
}

test();
