const { chromium } = require('playwright');
const path = require('path');

async function test() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });

  await page.route('**/api/**', route => {
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        clinicName: "Демо Клиника DENTE",
        todayIso: new Date().toISOString().split("T")[0],
        clinicSettings: {
          profile: { id: "demo-org", organizationId: "demo-org", clinicName: "Демо Клиника DENTE", legalName: "ООО Демо Клиника", timezone: "Europe/Moscow" },
          staff: [{ id: "s-1", fullName: "Петров Иван Иванович", role: "owner", active: true }],
          chairs: [{ id: "c-1", name: "Кресло 1", active: true }]
        },
        appointments: [],
        serviceCatalog: [],
        treatmentPlanScenarios: [],
        billingSummary: { totalPlannedRub: 150000, totalPaidRub: 50000, totalDueRub: 100000, unpaidDocuments: 1 }
      })
    });
  });

  await page.goto('http://127.0.0.1:5173/#finance', { waitUntil: 'domcontentloaded' });
  await page.evaluate(() => {
    localStorage.setItem('dente_clinic_token', 'valid_demo_token');
    localStorage.setItem('dente_staff_token', 'valid_staff_token');
    localStorage.setItem('dente_ui_preferences_v1', JSON.stringify({ onboardingDismissed: true }));
  });
  await page.reload({ waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(1000);

  await page.evaluate(() => {
    window.location.hash = 'finance';
    window.dispatchEvent(new HashChangeEvent("hashchange"));
  });
  await page.waitForTimeout(1000);

  // Test REAL Light Mode
  await page.evaluate(() => {
    document.documentElement.setAttribute('data-theme', 'light');
    document.documentElement.classList.remove('dark');
    document.body.classList.remove('dark-mode', 'dark');
    document.body.classList.add('light-mode', 'light');
    document.body.style.backgroundColor = '#f8fafc';
    document.body.style.color = '#0f172a';
  });
  await page.waitForTimeout(500);
  const lightPath = path.join(__dirname, 'test_real_light_finance.png');
  await page.screenshot({ path: lightPath });
  console.log('Saved Light Mode:', lightPath);

  // Test REAL Dark Mode
  await page.evaluate(() => {
    document.documentElement.setAttribute('data-theme', 'dark');
    document.documentElement.classList.add('dark');
    document.body.classList.remove('light-mode', 'light');
    document.body.classList.add('dark-mode', 'dark');
    document.body.style.backgroundColor = '#0f172a';
    document.body.style.color = '#f8fafc';
  });
  await page.waitForTimeout(500);
  const darkPath = path.join(__dirname, 'test_real_dark_finance.png');
  await page.screenshot({ path: darkPath });
  console.log('Saved Dark Mode:', darkPath);

  await browser.close();
}

test();
