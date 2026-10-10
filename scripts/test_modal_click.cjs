const { chromium } = require("playwright");

async function check() {
  const loginRes = await fetch("http://127.0.0.1:4100/api/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: "admin@clinic.ru", password: "Password123!" }),
  });
  const auth = await loginRes.json();

  const browser = await chromium.launch({
    headless: true,
    executablePath: "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
  });

  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  await context.addInitScript(({ cTok, sTok }) => {
    localStorage.setItem("dente_clinic_token", cTok);
    localStorage.setItem("dente_staff_token", sTok);
    localStorage.setItem("dente_active_session_token", sTok);
    localStorage.setItem("dente_user_role", "doctor");
    localStorage.setItem("dente_role", "doctor");
    localStorage.setItem("dente_perspective", "doctor");
    localStorage.setItem("dente_user_name", "Д-р Смирнов Алексей Петрович");
    localStorage.setItem("dente_onboarding_completed", "true");
    localStorage.setItem("dental-crm:onboarding:v1", JSON.stringify({ dismissed: true, step: "done" }));
    localStorage.setItem("dente_ui_preferences_v1", JSON.stringify({ onboardingDismissed: true, version: 1, selectedWorkspaceRole: "doctor" }));
    localStorage.setItem("dente_tour_completed", "true");
    localStorage.setItem("dente_quest_progress_v2", JSON.stringify({ isDismissedPermanently: true, activeTrack: null, tracksProgress: {} }));
    localStorage.setItem("dente_theme", "light");
    localStorage.setItem("dente_theme_mode", "light");
    document.cookie = `dente_clinic_token=${encodeURIComponent(cTok)}; path=/; max-age=31536000; SameSite=Lax`;
    document.cookie = `dente_staff_token=${encodeURIComponent(sTok)}; path=/; max-age=31536000; SameSite=Lax`;
  }, { cTok: auth.clinicToken, sTok: auth.staffToken });

  const page = await context.newPage();
  page.on("console", (msg) => console.log("PAGE CONSOLE:", msg.type(), msg.text()));
  page.on("pageerror", (err) => console.log("PAGE ERROR:", err.message));

  await page.goto("http://127.0.0.1:5173/?demo=true#schedule", { waitUntil: "domcontentloaded" });
  await page.waitForSelector('.schedule-filter-strip, .appointment-card', { timeout: 35000 });
  await new Promise((r) => setTimeout(r, 2000));

  console.log("Schedule loaded! Finding appointment cards...");
  const cards = await page.$$('.appointment-card');
  console.log("Found appointment cards:", cards.length);

  // Click the more menu on the first card
  const moreBtn = await page.$('.appointment-action-more');
  if (moreBtn) {
    console.log("Clicking .appointment-action-more...");
    await moreBtn.click();
    await new Promise((r) => setTimeout(r, 500));
    const treatmentBtn = await page.$('[data-testid^="menu-treatment-btn-"]');
    if (treatmentBtn) {
      console.log("Clicking menu-treatment-btn...");
      await treatmentBtn.click();
      await new Promise((r) => setTimeout(r, 1000));
    }
  }

  const modal = await page.$('[data-testid="appointment-modal-container"]');
  console.log("Is appointment modal container found?", Boolean(modal));
  await page.screenshot({ path: "test_modal_result.png" });
  console.log("Saved test_modal_result.png");

  await browser.close();
}
check().catch(console.error);
