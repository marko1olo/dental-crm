const { chromium } = require('playwright');
const path = require('path');

async function run() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  // Intercept API calls to prevent 401 unauthorized logouts
  await page.route('/api/**', route => {
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        success: true,
        clinicProfile: { id: "demo-org", name: "Демо Клиника DENTE" },
        user: { id: "demo-user", fullName: "Демо Доктор", role: "owner" }
      })
    });
  });

  await page.goto('http://127.0.0.1:5173/#shift');
  await page.evaluate(() => {
    localStorage.setItem('dente_clinic_token', 'valid_demo_token');
    localStorage.setItem('dente_staff_token', 'valid_staff_token');
    localStorage.setItem('dente_ui_preferences_v1', JSON.stringify({ onboardingDismissed: true, showFullOnboardingGuide: false }));
  });
  await page.reload({ waitUntil: 'networkidle' });
  await page.waitForTimeout(2000);

  const ssPath = path.join(__dirname, 'mocked_workspace_test.png');
  await page.screenshot({ path: ssPath });
  console.log('Saved mocked workspace screenshot:', ssPath);

  await browser.close();
}

run();
