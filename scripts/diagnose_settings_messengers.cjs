const { chromium } = require("playwright");

async function diagnose() {
  const loginRes = await fetch("http://127.0.0.1:4100/api/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: "doctor@clinic.com", password: "dente2026" }),
  });
  const auth = await loginRes.json();
  console.log("Auth OK:", Boolean(auth.clinicToken));

  const browser = await chromium.launch({
    headless: true,
    executablePath: "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
    args: ["--no-sandbox", "--disable-gpu", "--disable-dev-shm-usage"],
  });

  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
  });

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
    localStorage.setItem("dental-crm:web-ui-preferences:v1", JSON.stringify({
      version: 1,
      uiLanguage: "ru",
      selectedWorkspaceRole: "owner",
      onboardingDismissed: true,
      onboardingStep: "done",
    }));
  }, { auth });

  const page = await context.newPage();
  page.on("console", (msg) => {
    const text = msg.text();
    console.log(`[PAGE CONSOLE ${msg.type()}]`, text);
  });
  page.on("pageerror", (err) => {
    console.error("[PAGE ERROR]", err);
  });
  page.on("requestfailed", (req) => {
    console.log(`[REQ FAILED] ${req.method()} ${req.url()}: ${req.failure()?.errorText}`);
  });
  page.on("response", (res) => {
    if (res.url().includes("/api/")) {
      console.log(`[API RES] ${res.status()} ${res.url()}`);
    }
  });

  await page.goto("http://127.0.0.1:5173/?demo=true#settings", { waitUntil: "domcontentloaded", timeout: 25000 });
  await page.waitForTimeout(3000);

  // Check what's visible
  console.log("Current URL:", page.url());
  const bodyText = await page.innerText("body");
  console.log("Body text snippet:", bodyText.slice(0, 300).replace(/\n+/g, " "));

  // If not on settings, click Settings navigation link
  const settingsNavLink = page.locator('a[href*="settings"], button:has-text("Настройки"), [data-testid="nav-settings"]');
  console.log("settingsNavLink count:", await settingsNavLink.count());
  if (await settingsNavLink.count() > 0) {
    await settingsNavLink.first().click({ force: true });
    console.log("Clicked settingsNavLink");
    await page.waitForTimeout(1500);
  }

  // Check role buttons in topbar
  const ownerRoleBtn = page.locator('button:has-text("Владелец"), button:has-text("Управляющий")');
  console.log("ownerRoleBtn count:", await ownerRoleBtn.count());
  if (await ownerRoleBtn.count() > 0) {
    await ownerRoleBtn.first().click({ force: true });
    console.log("Clicked ownerRoleBtn");
    await page.waitForTimeout(1000);
  }

  const adminRoleBtn = page.locator('[data-testid="btn-settings-role-admin"]');
  console.log("adminRoleBtn count:", await adminRoleBtn.count());
  if (await adminRoleBtn.count() > 0) {
    await adminRoleBtn.click({ force: true });
    console.log("Clicked adminRoleBtn");
    await page.waitForTimeout(1500);
  }

  const messengersTabBtn = page.locator('[data-testid="admin-tab-messengers"]');
  console.log("admin-tab-messengers count:", await messengersTabBtn.count());
  if (await messengersTabBtn.count() > 0) {
    await messengersTabBtn.click({ force: true });
    console.log("Clicked admin-tab-messengers");
    await page.waitForTimeout(2000);
  }

  const overviewCard = page.locator("[data-testid='messengers-overview-card']");
  console.log("overviewCard count:", await overviewCard.count());
  const messengersSettings = page.locator(".messengers-settings");
  console.log("messengersSettings count:", await messengersSettings.count());

  await page.screenshot({ path: "docs/screenshots/omnichannel_master/diagnose_pc.png" });
  console.log("Captured diagnose_pc.png");

  await browser.close();
}

diagnose().catch(console.error);
