const { chromium } = require("playwright");

const VIEWS = [
    { url: "http://127.0.0.1:5173/#", name: "Dashboard" },
    { url: "http://127.0.0.1:5173/#schedule", name: "Schedule" },
    { url: "http://127.0.0.1:5173/#patients", name: "Patients" },
    { url: "http://127.0.0.1:5173/#finance", name: "Finance" },
    { url: "http://127.0.0.1:5173/#settings", name: "Settings" }
];

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const page = await context.newPage();

  // Mock API
  await page.route(/\/api\//, async (route) => {
      const url = route.request().url();
      if (url.includes("/api/workspace/profile")) {
          await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ hasAssistants: true, hasMultipleChairs: true, hasDentalLab: true, hasInsuranceCoPay: true, hasInstallments: true, workspacePreset: "enterprise", onboardingCompleted: true }) });
      } else {
          await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ success: true, data: [] }) });
      }
  });

  await page.addInitScript(() => {
    localStorage.setItem("dente_onboarding", JSON.stringify({ dismissed: true }));
  });

  for (const view of VIEWS) {
      await page.goto(view.url);
      await page.waitForTimeout(2000);
      
      const overflowInfo = await page.evaluate(() => {
          const isOverflowing = document.documentElement.scrollWidth > window.innerWidth;
          let elements = [];
          if (isOverflowing) {
              const all = document.querySelectorAll('*');
              for (let i = 0; i < all.length; i++) {
                  if (all[i].scrollWidth > window.innerWidth) {
                      elements.push({
                          tag: all[i].tagName,
                          className: all[i].className,
                          width: all[i].scrollWidth
                      });
                  }
              }
          }
          return { isOverflowing, elements };
      });
      
      console.log(`[${view.name}] Horizontal Overflow: ${overflowInfo.isOverflowing}`);
      if (overflowInfo.isOverflowing) {
          console.log(`  Overflowing elements:`, overflowInfo.elements.slice(0, 5));
      }
  }

  await browser.close();
})();
