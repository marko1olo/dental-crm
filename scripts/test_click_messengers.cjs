const { chromium } = require("playwright");

(async () => {
  const browser = await chromium.launch({
    headless: true,
    executablePath: "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
  });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const loginRes = await fetch("http://127.0.0.1:4100/api/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: "doctor@clinic.com", password: "dente2026" }),
  });
  const auth = await loginRes.json();
  await context.addInitScript(({ auth }) => {
    localStorage.setItem("dente_clinic_token", auth.clinicToken);
    localStorage.setItem("dente_staff_token", auth.staffToken);
    localStorage.setItem("dente_active_role", "owner");
    localStorage.setItem("dental-crm:active-user:v1", JSON.stringify({ ...auth.user, role: "owner" }));
    localStorage.setItem("dente_cached_active_staff_user", JSON.stringify({ ...auth.user, role: "owner" }));
    localStorage.setItem("dental-crm:onboarding:v1", JSON.stringify({ completed: true, dismissed: true }));
    localStorage.setItem("dente_tour_completed", "true");
    localStorage.setItem("dente_training_mode_completed", "true");
    localStorage.setItem("dente_training_active", "false");
    localStorage.setItem("dente_quest_progress_v2", JSON.stringify({ isDismissedPermanently: true, activeTrack: null, tracksProgress: {} }));
  }, { auth });
  const page = await context.newPage();
  await page.goto("http://127.0.0.1:5173/#settings", { waitUntil: "domcontentloaded" });
  await page.waitForSelector('[data-testid="settings-view"]', { timeout: 30000 });
  
  // Click admin role
  await page.locator('[data-testid="btn-settings-role-admin"]').click();
  await page.waitForTimeout(600);

  // Click messengers tab
  const btn = page.getByRole("tab", { name: /Мессенджеры и каденции/i });
  console.log("Found messengers tab count:", await btn.count());
  await btn.click();
  await page.waitForTimeout(2000);

  const card = page.locator('[data-testid="messengers-overview-card"]');
  console.log("Found overview card count:", await card.count());
  await page.screenshot({ path: "scripts/test_clicked_messengers.png" });
  await browser.close();
})().catch(console.error);
