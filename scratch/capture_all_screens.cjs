const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

async function run() {
  console.log("Launching Playwright for full UI screenshot audit...");
  const browser = await chromium.launch({ headless: true });
  
  const views = [
    { id: 'shift', name: 'ShiftView', selector: '[data-nav-id="shift"], a[href="#shift"], nav button:nth-child(1)' },
    { id: 'schedule', name: 'ScheduleView', selector: '[data-nav-id="schedule"], a[href="#schedule"], nav button:nth-child(2)' },
    { id: 'patients', name: 'PatientsView', selector: '[data-nav-id="patients"], a[href="#patients"], nav button:nth-child(3)' },
    { id: 'imaging', name: 'ImagingView', selector: '[data-nav-id="imaging"], a[href="#imaging"], nav button:nth-child(4)' },
    { id: 'visit', name: 'VisitView', selector: '[data-nav-id="visit"], a[href="#visit"], nav button:nth-child(5)' },
    { id: 'finance', name: 'FinanceView', selector: '[data-nav-id="finance"], a[href="#finance"], nav button:nth-child(7)' }
  ];

  const outputDir = path.join(__dirname, '..', 'screenshots');
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  async function ensureWorkspaceLoaded(page) {
    await page.goto('http://127.0.0.1:5173/', { waitUntil: 'networkidle' }).catch(() => {});
    await page.evaluate(() => {
      localStorage.setItem('dente_clinic_token', 'demo_clinic_token');
      localStorage.setItem('dente_staff_token', 'demo_staff_token');
      localStorage.removeItem('dental-crm:onboarding:v1');
      localStorage.setItem('dente_ui_preferences_v1', JSON.stringify({ onboardingDismissed: false, showFullOnboardingGuide: false }));
    });
    await page.reload({ waitUntil: 'networkidle' }).catch(() => {});
    await page.waitForTimeout(1000);

    const demoBtn = await page.$('button:has-text("Попробовать демо-режим")');
    if (demoBtn) {
      console.log('Clicking demo mode setup button...');
      await demoBtn.click();
      await page.waitForTimeout(1500);
    }
  }

  // 1. PC Viewport (1280x800)
  console.log("--- Capturing PC Screenshots ---");
  const pcContext = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const pcPage = await pcContext.newPage();
  await ensureWorkspaceLoaded(pcPage);
  
  for (const view of views) {
    console.log(`Navigating PC to ${view.name}...`);
    // Click sidebar link or fallback to hash set
    try {
      const el = await pcPage.$(view.selector);
      if (el) {
        await el.click();
      } else {
        await pcPage.evaluate((id) => { window.location.hash = id; }, view.id);
      }
    } catch {
      await pcPage.evaluate((id) => { window.location.hash = id; }, view.id);
    }
    await pcPage.waitForTimeout(1200);

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
    try {
      const el = await mobilePage.$(view.selector);
      if (el) {
        await el.click();
      } else {
        await mobilePage.evaluate((id) => { window.location.hash = id; }, view.id);
      }
    } catch {
      await mobilePage.evaluate((id) => { window.location.hash = id; }, view.id);
    }
    await mobilePage.waitForTimeout(1200);

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
