const { chromium } = require("playwright");
const fs = require("fs");
const path = require("path");

const targetDirs = [
  path.resolve("docs/screenshots/inquisition_live"),
  "C:\\Users\\Admin\\.gemini\\antigravity\\brain\\1cbe3ec4-e647-4d20-8fdd-2e51740038bc\\screenshots",
];

for (const dir of targetDirs) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

const lines = fs.readFileSync(path.resolve("scripts/capture_schedule_proofs.cjs"), "utf8").split("\n");
const mockCode = lines.slice(15, 281).join("\n");
const todayDate = new Date().toISOString().slice(0, 10);
let mockDashboard;
eval(mockCode);

async function capture() {
  const browser = await chromium.launch({
    executablePath: "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });

  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    deviceScaleFactor: 2,
  });

  await context.addInitScript(() => {
    localStorage.setItem("dente_clinic_token", "mock-clinic-token-12345");
    localStorage.setItem("dente_staff_token", "mock-staff-token-67890");
    localStorage.setItem("dente_active_user_id", "doc-1");
    localStorage.setItem("dente_active_role", "owner");
    localStorage.setItem("dente_active_mode", "clinic");
    sessionStorage.setItem("dente_unlocked", "true");
    localStorage.setItem("dente_theme", "light");
    localStorage.setItem("theme", "light");
    localStorage.setItem(
      "dente_ui_preferences_v1",
      JSON.stringify({
        onboardingDismissed: true,
        onboardingStep: "done",
        onboardingDraftMode: false,
        version: 1,
      })
    );
    localStorage.setItem(
      "dental-crm:onboarding:v1",
      JSON.stringify({
        dismissed: true,
        step: "done",
        completed: true,
        onboardingDismissed: true,
        onboardingStep: "done",
        onboardingDraftMode: false,
        version: 1,
      })
    );
    localStorage.setItem(
      "dental-crm:web-ui-preferences:v1",
      JSON.stringify({
        version: 1,
        uiLanguage: "ru",
        selectedWorkspaceRole: "owner",
        onboardingDismissed: true,
        onboardingStep: "done",
        onboardingDraftMode: false,
      })
    );
  });

  const page = await context.newPage();

  await page.route("**/api/**", async (route) => {
    const url = route.request().url();
    if (url.includes("/src/")) return route.continue();
    if (url.includes("/api/dashboard")) {
      return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(mockDashboard) });
    }
    if (url.includes("/api/auth/user/me") || url.includes("/api/auth/session")) {
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          user: { id: "doc-1", fullName: "Д-р Воронов Алексей Владимирович", role: "owner", active: true, organizationId: "00000000-0000-0000-0000-000000000001" },
        }),
      });
    }
    if (url.includes("/api/auth/staff/unlock")) {
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ success: true, token: "mock-staff-token", user: { id: "doc-1", fullName: "Д-р Воронов Алексей Владимирович", role: "owner" } }),
      });
    }
    if (url.includes("/api/schedule")) {
      return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(mockDashboard.appointments) });
    }
    if (url.includes("/api/patients")) {
      return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(mockDashboard.patients || []) });
    }
    return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify([]) });
  });

  console.log("Navigating to http://127.0.0.1:5173/#schedule to bootstrap...");
  await page.goto("http://127.0.0.1:5173/#schedule", { waitUntil: "domcontentloaded", timeout: 30000 });
  await page.waitForSelector(".boot-state", { state: "detached", timeout: 30000 }).catch(() => {});
  await page.waitForSelector(".schedule-filter-strip", { state: "visible", timeout: 30000 }).catch(() => {});
  await page.waitForTimeout(1000);

  // Dismiss banner/onboarding
  const dismissBtn = page.locator('button:has-text("Скрыть"), button:has-text("Понятно"), [data-testid="btn-dismiss-notice"]');
  if (await dismissBtn.isVisible()) {
    await dismissBtn.click().catch(() => {});
    await page.waitForTimeout(300);
  }

  const themes = ["light", "dark"];

  for (const theme of themes) {
    console.log(`Setting theme ${theme}...`);

    await page.evaluate((th) => {
      if (window.__useThemeStore) {
        window.__useThemeStore.getState().setThemeMode(th);
      }
      document.documentElement.setAttribute("data-theme", th);
      const isDark = ["dark", "night", "ocean", "emerald", "cyber_xray"].includes(th);
      document.documentElement.classList.toggle("dark", isDark);
      document.documentElement.classList.toggle("light", !isDark);
      document.documentElement.style.colorScheme = isDark ? "dark" : "light";
    }, theme);
    await page.waitForTimeout(500);

    // 1. Visit EMK proof
    console.log(`Opening Visit view in ${theme}...`);
    await page.goto("http://127.0.0.1:5173/#visit", { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(1000);

    const emkTab = page.locator('[data-testid="visit-subtab-emk"]');
    if (await emkTab.isVisible()) {
      await emkTab.click();
      await page.waitForTimeout(600);
    }

    const visitShot = path.resolve(`docs/screenshots/inquisition_live/visit_emk_clean_${theme}.png`);
    await page.screenshot({ path: visitShot });
    for (const d of targetDirs) {
      fs.copyFileSync(visitShot, path.join(d, `visit_emk_clean_${theme}.png`));
    }
    console.log(`Captured: visit_emk_clean_${theme}.png`);

    // 2. Settings Access & Roles
    console.log(`Opening Settings view in ${theme}...`);
    await page.goto("http://127.0.0.1:5173/#settings", { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(1000);

    // Click 'Все разделы'
    const allBtn = page.locator('[data-testid="btn-settings-role-all"]').first();
    if (await allBtn.isVisible()) {
      await allBtn.click();
      await page.waitForTimeout(600);
    }

    // Click 'Доступ' tab
    const accessTab = page.locator('button:has-text("Доступ"), [data-testid="settings-tab-access"]').first();
    if (await accessTab.isVisible()) {
      await accessTab.click();
      await page.waitForTimeout(800);
    }

    const settingsShot = path.resolve(`docs/screenshots/inquisition_live/settings_roles_clean_${theme}.png`);
    await page.screenshot({ path: settingsShot });
    for (const d of targetDirs) {
      fs.copyFileSync(settingsShot, path.join(d, `settings_roles_clean_${theme}.png`));
    }
    console.log(`Captured: settings_roles_clean_${theme}.png`);

    // 3. Patients registry & card
    console.log(`Opening Patients view in ${theme}...`);
    await page.goto("http://127.0.0.1:5173/#patients", { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(1000);

    const patientShot = path.resolve(`docs/screenshots/inquisition_live/patients_clean_${theme}.png`);
    await page.screenshot({ path: patientShot });
    for (const d of targetDirs) {
      fs.copyFileSync(patientShot, path.join(d, `patients_clean_${theme}.png`));
    }
    console.log(`Captured: patients_clean_${theme}.png`);
  }

  await browser.close();
  console.log("All clean debureaucratized screenshots successfully captured!");
}

capture().catch((err) => {
  console.error("Screenshot capture failed:", err);
  process.exit(1);
});
