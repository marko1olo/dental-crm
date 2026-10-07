const { chromium } = require("playwright");

async function test() {
  const browser = await chromium.launch({
    headless: true,
    executablePath: "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });

  const initRes = await fetch("http://127.0.0.1:4100/api/auth/setup/init", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      clinicName: "Test Schedule Direct",
      email: "test-" + Date.now() + "@dente-crm.ru",
      password: "Password123!",
      ownerName: "Д-р Тест",
      ownerPin: "1234",
    }),
  });
  const initData = await initRes.json();
  const unlockRes = await fetch("http://127.0.0.1:4100/api/auth/staff/unlock", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-dente-clinic-token": initData.clinicToken,
    },
    body: JSON.stringify({ userId: initData.ownerUserId, pinCode: "1234" }),
  });
  const unlockData = await unlockRes.json();
  const headers = {
    "Content-Type": "application/json",
    "x-dente-clinic-token": initData.clinicToken,
    "x-dente-staff-token": unlockData.staffToken,
  };
  const dashRes = await fetch("http://127.0.0.1:4100/api/dashboard", { headers });
  const dashData = await dashRes.json();
  const chairs = dashData.chairs || dashData.clinicSettings?.chairs;

  const pRes = await fetch("http://127.0.0.1:4100/api/patients", {
    method: "POST",
    headers,
    body: JSON.stringify({ fullName: "Пациент Отмененный", phone: "+79991234567" }),
  });
  const pData = await pRes.json();
  const patientId = pData.patient?.id || pData.id;

  const now = new Date();
  const aRes = await fetch("http://127.0.0.1:4100/api/appointments", {
    method: "POST",
    headers,
    body: JSON.stringify({
      patientId,
      doctorId: initData.ownerUserId,
      chairId: chairs[0].id,
      startsAt: new Date(now.getTime() + 15 * 60 * 1000).toISOString(),
      endsAt: new Date(now.getTime() + 45 * 60 * 1000).toISOString(),
      status: "cancelled",
      reason: "Отмена по болезни",
    }),
  });
  console.log("Appt creation status:", aRes.status);

  await context.addInitScript(
    ({ cToken, sToken }) => {
      localStorage.setItem("dente_clinic_token", cToken);
      localStorage.setItem("dente_staff_token", sToken);
      localStorage.setItem("dente_tour_completed", "true");
      localStorage.setItem("dente_onboarding_dismissed", "true");
      localStorage.setItem("dente_theme", "light");
    },
    { cToken: initData.clinicToken, sToken: unlockData.staffToken }
  );

  const page = await context.newPage();
  await page.goto("http://127.0.0.1:5173/#schedule", { waitUntil: "domcontentloaded" });
  await page.waitForSelector('[data-testid="schedule-view"], #schedule', { timeout: 20000 });
  await page.waitForTimeout(2000);

  // Switch to timeline
  const timelineBtn = page.locator('[data-testid="schedule-view-mode-timeline"]').first();
  console.log("Timeline btn visible:", await timelineBtn.isVisible());
  if (await timelineBtn.isVisible()) {
    await timelineBtn.click({ force: true });
    await page.waitForTimeout(1000);
  }

  const buttons = await page.evaluate(() => {
    return Array.from(document.querySelectorAll("button"))
      .map((b) => ({
        text: b.textContent.trim(),
        testId: b.getAttribute("data-testid"),
      }))
      .filter((b) => b.testId || b.text.includes("подбор") || b.text.includes("Smart"));
  });
  console.log("Relevant buttons on schedule:", JSON.stringify(buttons, null, 2));

  // Check if recovery popover or button exists
  const recBtn = page.locator('[data-testid="smart-slot-recovery-open-btn"]').first();
  console.log("Recovery btn visible:", await recBtn.isVisible());
  if (await recBtn.isVisible()) {
    await recBtn.click({ force: true });
    await page.waitForTimeout(800);
    const popover = page.locator('[data-testid="smart-slot-recovery-popover"]').first();
    console.log("Popover visible:", await popover.isVisible());
  }

  await page.screenshot({ path: "docs/screenshots/redteam_inquisition/test_proof_02.png" });
  await browser.close();
}

test().catch(console.error);
