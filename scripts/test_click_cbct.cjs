const { chromium } = require("playwright");

(async () => {
  const browser = await chromium.launch({
    headless: true,
    executablePath: "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
  });
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  ctx.addInitScript(() => {
    localStorage.setItem("dente_clinic_token", "live-inquisition-clinic-token");
    localStorage.setItem("dente_staff_token", "live-inquisition-staff-token");
    localStorage.setItem("dente_active_role", "owner");
    localStorage.setItem("dente_tour_completed", "true");
  });
  const page = await ctx.newPage();
  
  // mock minimal dashboard and me
  await page.route("**/api/**", async (route) => {
    const url = route.request().url();
    if (url.includes("/api/auth/session") || url.includes("/api/auth/user/me")) {
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ user: { id: "doc-1", fullName: "Д-р Воронов А.В.", role: "owner", active: true } })
      });
    }
    return route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        clinicSettings: { profile: { id: "c-1", clinicName: "Стоматология ДЕНТЕ Премиум" } },
        patients: [{ id: "pat-1", fullName: "Ковалёв Роман" }],
        appointments: []
      })
    });
  });

  page.on('console', msg => console.log('PAGE LOG:', msg.text()));
  page.on('pageerror', err => console.log('PAGE ERROR:', err.message));

  await page.goto("http://127.0.0.1:5173/#schedule", { waitUntil: "domcontentloaded" });
  await page.waitForSelector('[data-testid="topbar-open-cbct-demo-btn"]', { timeout: 20000 });
  console.log("Found topbar-open-cbct-demo-btn, clicking...");
  
  await page.click('[data-testid="topbar-open-cbct-demo-btn"]');
  console.log("Clicked! Waiting for modal...");

  await page.waitForSelector('[data-testid="cbct-studio-modal"]', { timeout: 20000 });
  console.log("SUCCESS: [data-testid=\"cbct-studio-modal\"] opened!");

  await page.waitForTimeout(3000);
  await page.screenshot({ path: "C:/Clinic_MVP/dental-crm/docs/screenshots/redteam_inquisition/04_dicom_viewer_desktop_dark.png" });
  console.log("Saved 04_dicom_viewer_desktop_dark.png!");

  await browser.close();
})().catch(err => {
  console.error("FATAL ERROR:", err);
  process.exit(1);
});
