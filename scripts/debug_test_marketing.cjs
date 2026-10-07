const { chromium } = require("playwright");
const fs = require("node:fs");

const todayDate = new Date().toLocaleDateString("en-CA");
const code = fs.readFileSync("scripts/capture_analytics_tactile_proofs.cjs", "utf8");
const match = code.match(/const mockDashboard = ({[\s\S]*?\n};\n\nasync function)/);
const mockDashboard = eval("(" + match[1].replace(/;\n\nasync function$/, "") + ")");

(async () => {
  const browser = await chromium.launch({
    headless: true,
    executablePath: "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
    args: ["--no-sandbox"],
  });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  context.addInitScript(() => {
    localStorage.setItem("dente_clinic_token", "live-inquisition-clinic-token");
    localStorage.setItem("dente_staff_token", "live-inquisition-staff-token");
    localStorage.setItem("dente_active_role", "owner");
    localStorage.setItem("dente_theme_mode", "light");
    localStorage.setItem("dente_onboarding_completed", "true");
    localStorage.setItem("dente_tour_completed", "true");
    localStorage.setItem("dente_tour_dismissed", "true");
    localStorage.setItem("dente_ui_preferences_v1", JSON.stringify({ onboardingDismissed: true, onboardingStep: "done", version: 1 }));
    localStorage.setItem("dental-crm:onboarding:v1", JSON.stringify({ dismissed: true, step: "done", completed: true, version: 1 }));
    localStorage.setItem("dental-crm:web-ui-preferences:v1", JSON.stringify({ version: 1, uiLanguage: "ru", selectedWorkspaceRole: "owner", selectedPatientId: "pat-1", onboardingDismissed: true, onboardingStep: "done" }));
    localStorage.setItem("dente-workspace-profile", JSON.stringify({ state: { clinicName: "Стоматология ДЕНТЕ Премиум", currentDoctor: { id: "doc-1", fullName: "Д-р Воронов А. В.", role: "owner" }, flags: { disableTour: true } } }));
  });

  const page = await context.newPage();
  page.on("console", (msg) => {
    const t = msg.text();
    console.log(`[PAGE LOG] ${msg.type()}: ${t}`);
  });
  page.on("pageerror", (err) => {
    console.log(`[PAGE ERROR] ${err.message}\n${err.stack}`);
  });

  await page.route("**/api/**", async (route) => {
    const url = route.request().url();
    if (url.includes("/src/")) return route.continue();
    if (url.includes("/api/dashboard")) {
      return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(mockDashboard) });
    }
    if (url.includes("/api/auth/user/me") || url.includes("/api/auth/session")) {
      return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ user: { id: "doc-1", fullName: "Д-р Воронов Алексей Владимирович", role: "owner", active: true, organizationId: "00000000-0000-0000-0000-000000000001" } }) });
    }
    if (url.includes("/api/auth/staff/unlock")) {
      return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ success: true, token: "live-staff-token", user: { id: "doc-1", fullName: "Д-р Воронов Алексей Владимирович", role: "owner" } }) });
    }
    if (url.includes("/api/schedule")) return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(mockDashboard.appointments) });
    if (url.includes("/api/patients")) return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(mockDashboard.patients) });
    return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({}) });
  });

  await page.goto("http://127.0.0.1:5173/#analytics", { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(2000);

  console.log("1. Dismissing tour...");
  await page.evaluate(() => {
    document.querySelectorAll('.tour-spotlight-root, [data-testid="guided-tour-spotlight-overlay"]').forEach((e) => e.remove());
  });

  console.log("2. Opening dropdown...");
  const moreBtn = page.locator('button.analytics-tab-btn[aria-expanded]');
  await moreBtn.click();
  await page.waitForTimeout(500);

  const menuItems = await page.evaluate(() => {
    return Array.from(document.querySelectorAll('.analytics-dropdown-menu button')).map(b => b.textContent.trim());
  });
  console.log("Dropdown items found:", menuItems);

  console.log("3. Clicking marketing item...");
  const marketingItem = page.locator('.analytics-dropdown-menu button', { hasText: 'Сквозной маркетинг' });
  await marketingItem.click();
  await page.waitForTimeout(1500);

  const title = await page.evaluate(() => {
    return document.querySelector('[data-testid="marketing-attribution-dashboard"] h2')?.textContent || "NOT FOUND";
  });
  console.log("Marketing dashboard title:", title);

  console.log("4. Opening dropdown again for Lost Patients...");
  const moreBtn2 = page.locator('button.analytics-tab-btn[aria-expanded]');
  await moreBtn2.click();
  await page.waitForTimeout(500);

  console.log("5. Clicking Lost Patients...");
  const lostItem = page.locator('.analytics-dropdown-menu button', { hasText: 'Возврат пациентов' });
  await lostItem.click();
  await page.waitForTimeout(1500);

  const lostTitle = await page.evaluate(() => {
    return document.querySelector('.lost-patients-panel, [data-testid="lost-patients-panel"]')?.textContent?.slice(0, 100) || document.body.innerText.slice(0, 150);
  });
  console.log("Lost patients title:", lostTitle);

  await page.screenshot({ path: "test_lost_patients_result.png" });
  console.log("Screenshot saved: test_lost_patients_result.png");
  await browser.close();
})();
