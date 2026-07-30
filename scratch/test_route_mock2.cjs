const { chromium } = require('playwright');
const path = require('path');

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
          totalPlannedRub: 0,
          totalPaidRub: 0,
          totalDueRub: 0,
          unpaidDocuments: 0,
          taxDeductionEligibleRub: 0
        }
      })
    });
  });

  await page.goto('http://127.0.0.1:5173/#shift', { waitUntil: 'domcontentloaded' });
  await page.evaluate(() => {
    localStorage.setItem('dente_clinic_token', 'valid_demo_token');
    localStorage.setItem('dente_staff_token', 'valid_staff_token');
    localStorage.setItem('dente_ui_preferences_v1', JSON.stringify({ onboardingDismissed: true, showFullOnboardingGuide: false }));
  });
  await page.reload({ waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(2500);

  const ssPath = path.join(__dirname, 'mocked_workspace_test2.png');
  await page.screenshot({ path: ssPath });
  console.log('Saved mocked workspace screenshot:', ssPath);

  await browser.close();
}

test();
