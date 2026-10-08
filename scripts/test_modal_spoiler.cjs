const { chromium } = require("playwright");
const {
  obtainRealAuthTokens,
  injectRealAuthToContext,
  seedLiveScheduleData,
  API_BASE,
} = require("./e2e-auth-helper.cjs");

async function test() {
  const authData = await obtainRealAuthTokens();
  const schedData = await seedLiveScheduleData(authData);

  // Ensure appointment for today
  const localToday = new Date().toLocaleDateString("en-CA");
  const headers = {
    "Content-Type": "application/json",
    "x-dente-clinic-token": authData.clinicToken,
    "x-dente-staff-token": authData.staffToken,
  };
  await fetch(`${API_BASE}/api/appointments`, {
    method: "POST",
    headers,
    body: JSON.stringify({
      patientId: schedData.activePatientId,
      doctorUserId: authData.user.id,
      chairId: schedData.chair1Id,
      startsAt: `${localToday}T09:00:00.000Z`,
      endsAt: `${localToday}T10:00:00.000Z`,
      status: "confirmed",
      reason: "Тест",
    }),
  }).catch(() => {});

  const browser = await chromium.launch({
    executablePath: "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
    headless: true,
  });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  await injectRealAuthToContext(context, authData, { selectedPatientId: schedData.activePatientId });
  const page = await context.newPage();
  await page.goto("http://127.0.0.1:5173/#schedule", { waitUntil: "domcontentloaded" });
  await page.waitForSelector(".schedule-filter-strip", { timeout: 30000 });

  const card = page.locator('[data-testid^="appointment-card-clickable-"]').first();
  await card.waitFor({ timeout: 15000 });
  await card.click();
  await page.waitForSelector('[data-testid="appointment-modal-container"]', { timeout: 15000 });
  console.log("Modal opened!");

  const btn = page.locator('[data-testid="appointment-modal-toggle-additional-btn"]');
  console.log("Button count:", await btn.count(), "visible:", await btn.isVisible());

  // Scroll modal body
  await page.evaluate(() => {
    const scrollContainer = document.querySelector('[data-testid="appointment-modal-container"] .overflow-y-auto');
    if (scrollContainer) scrollContainer.scrollTop = scrollContainer.scrollHeight;
  });
  await page.waitForTimeout(500);

  console.log("After scroll, visible:", await btn.isVisible());
  await btn.click({ force: true });
  await page.waitForTimeout(800);

  const content = page.locator('[data-testid="appointment-modal-additional-content"]');
  console.log("Content class:", await content.getAttribute("class"), "visible:", await content.isVisible());

  await browser.close();
}

test().catch(console.error);
