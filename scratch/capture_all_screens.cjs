const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

async function run() {
  console.log("Launching Playwright for full UI screenshot audit...");
  const browser = await chromium.launch({ headless: true });
  
  const views = [
    { id: 'shift', name: 'ShiftView' },
    { id: 'schedule', name: 'ScheduleView' },
    { id: 'patients', name: 'PatientsView' },
    { id: 'imaging', name: 'ImagingView' },
    { id: 'visit', name: 'VisitView' },
    { id: 'finance', name: 'FinanceView' }
  ];

  const outputDir = path.join(__dirname, '..', 'screenshots');
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  async function ensureWorkspaceLoaded(page) {
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
            staff: [
              { id: "s-1", fullName: "Петров Иван Иванович", role: "owner", active: true }
            ],
            chairs: [
              { id: "c-1", name: "Кресло 1", active: true }
            ]
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

    await page.goto('http://127.0.0.1:5173/#shift', { waitUntil: 'domcontentloaded' }).catch(() => {});
    await page.evaluate(() => {
      localStorage.setItem('dente_clinic_token', 'valid_demo_token');
      localStorage.setItem('dente_staff_token', 'valid_staff_token');
      localStorage.removeItem('dental-crm:onboarding:v1');
      localStorage.setItem('dente_ui_preferences_v1', JSON.stringify({ onboardingDismissed: true, showFullOnboardingGuide: false }));
    });
    await page.reload({ waitUntil: 'domcontentloaded' }).catch(() => {});
    await page.waitForTimeout(1000);
  }

  async function navigateToView(page, viewId) {
    await page.evaluate((id) => {
      window.location.hash = id;
      window.dispatchEvent(new HashChangeEvent("hashchange"));
    }, viewId);
    await page.waitForTimeout(800);
  }

  // 1. PC Viewport (1280x800)
  console.log("--- Capturing PC Screenshots ---");
  const pcContext = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const pcPage = await pcContext.newPage();
  await ensureWorkspaceLoaded(pcPage);
  
  for (const view of views) {
    console.log(`Navigating PC to ${view.name}...`);
    await navigateToView(pcPage, view.id);

    // PC Light Mode
    await pcPage.evaluate(() => {
      document.body.classList.remove('dark-mode');
      document.documentElement.classList.remove('dark');
      document.documentElement.removeAttribute('data-theme');
    });
    await pcPage.waitForTimeout(500);
    const pcLightPath = path.join(outputDir, `screen_pc_light_${view.id}.png`);
    await pcPage.screenshot({ path: pcLightPath });
    console.log(`Saved PC Light: ${pcLightPath}`);

    // PC Dark Mode
    await pcPage.evaluate(() => {
      document.body.classList.add('dark-mode');
      document.documentElement.classList.add('dark');
      document.documentElement.setAttribute('data-theme', 'dark');
    });
    await pcPage.waitForTimeout(500);
    const pcDarkPath = path.join(outputDir, `screen_pc_dark_${view.id}.png`);
    await pcPage.screenshot({ path: pcDarkPath });
    console.log(`Saved PC Dark: ${pcDarkPath}`);
  }
  await pcContext.close();

  // 2. Mobile Viewport (375x812 - iPhone X)
  console.log("--- Capturing Mobile Screenshots ---");
  const mobileContext = await browser.newContext({ viewport: { width: 375, height: 812 } });
  const mobilePage = await mobileContext.newPage();
  await ensureWorkspaceLoaded(mobilePage);

  for (const view of views) {
    console.log(`Navigating Mobile to ${view.name}...`);
    await navigateToView(mobilePage, view.id);

    // Mobile Light Mode
    await mobilePage.evaluate(() => {
      document.body.classList.remove('dark-mode');
      document.documentElement.classList.remove('dark');
      document.documentElement.removeAttribute('data-theme');
    });
    await mobilePage.waitForTimeout(500);
    const mobileLightPath = path.join(outputDir, `screen_mobile_light_${view.id}.png`);
    await mobilePage.screenshot({ path: mobileLightPath });
    console.log(`Saved Mobile Light: ${mobileLightPath}`);

    // Mobile Dark Mode
    await mobilePage.evaluate(() => {
      document.body.classList.add('dark-mode');
      document.documentElement.classList.add('dark');
      document.documentElement.setAttribute('data-theme', 'dark');
    });
    await mobilePage.waitForTimeout(500);
    const mobileDarkPath = path.join(outputDir, `screen_mobile_dark_${view.id}.png`);
    await mobilePage.screenshot({ path: mobileDarkPath });
    console.log(`Saved Mobile Dark: ${mobileDarkPath}`);
  }
  await mobileContext.close();

  await browser.close();
  console.log("All authenticated workspace screenshots captured successfully.");
}

run().catch((err) => {
  console.error("Screenshot generation error:", err);
  process.exit(1);
});
