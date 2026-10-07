const { chromium } = require("playwright");
const path = require("node:path");

async function checkScreen() {
  const API_BASE = "http://127.0.0.1:4100";
  const uniqueId = Date.now();
  const initRes = await fetch(`${API_BASE}/api/auth/setup/init`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      clinicName: "Клиника ДЕНТЕ Омнихаб",
      email: `om-${uniqueId}@dente.ru`,
      password: "Password123!",
      ownerName: "Д-р Громов Константин Сергеевич",
      ownerPin: "1234",
    }),
  });
  const initData = await initRes.json();

  const unlockRes = await fetch(`${API_BASE}/api/auth/staff/unlock`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-dente-clinic-token": initData.clinicToken,
    },
    body: JSON.stringify({ userId: initData.ownerUserId, pinCode: "1234" }),
  });
  const unlockData = await unlockRes.json();

  const browser = await chromium.launch({
    headless: true,
    executablePath: "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
    args: ["--no-sandbox", "--disable-gpu"],
  });

  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  await context.addInitScript(({ ct, st, uid }) => {
    localStorage.setItem("dente_clinic_token", ct);
    localStorage.setItem("dente_staff_token", st);
    localStorage.setItem("dente_active_role", "owner");
    localStorage.setItem("dente_staff_session", JSON.stringify({
      userId: uid,
      name: "Д-р Громов К. С.",
      fullName: "Д-р Громов Константин Сергеевич",
      role: "owner",
    }));
    localStorage.setItem("dental-crm:web-ui-preferences:v1", JSON.stringify({
      version: 1,
      uiLanguage: "ru",
      selectedWorkspaceRole: "owner",
      onboardingDismissed: true,
      onboardingStep: "done",
    }));
    localStorage.setItem("dente-workspace-profile", JSON.stringify({
      state: {
        clinicName: "Клиника ДЕНТЕ Омнихаб",
        currentDoctor: { id: uid, fullName: "Д-р Громов К. С.", role: "owner" },
        flags: { disableTour: true },
      },
    }));
  }, { ct: initData.clinicToken, st: unlockData.staffToken, uid: initData.ownerUserId });

  const page = await context.newPage();
  await page.goto("http://127.0.0.1:5173/#settings", { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(2000);

  // Remove tour overlays
  await page.evaluate(() => {
    document.querySelectorAll('.tour-spotlight-root, [data-testid="guided-tour-spotlight-overlay"], .tour-backdrop-clickable-zone, [data-testid="demo-mode-banner"], .global-toast-container, [role="alert"]').forEach((el) => el.remove());
  });

  await page.locator('[data-testid="btn-settings-role-admin"]').click();
  await page.waitForTimeout(1000);

  await page.locator('[data-testid="admin-tab-messengers"]').click();
  await page.waitForTimeout(3000);

  await page.screenshot({ path: "scripts/screen_after_messengers_click.png" });
  console.log("Saved scripts/screen_after_messengers_click.png");

  const html = await page.evaluate(() => {
    const el = document.querySelector(".messengers-settings, .messenger-channel-tabs, [data-testid='messengers-overview-card']");
    return el ? el.outerHTML.slice(0, 500) : "NOT FOUND IN DOM";
  });
  console.log("DOM search result:", html);

  await browser.close();
}

checkScreen().catch(console.error);
