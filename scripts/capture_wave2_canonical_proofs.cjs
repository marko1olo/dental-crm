const { chromium } = require("playwright");
const fs = require("fs");
const path = require("path");
const assert = require("assert");

const targetDirs = [
  path.resolve("docs/screenshots/inquisition_live"),
  "C:\\Users\\Admin\\.gemini\\antigravity\\brain\\1cbe3ec4-e647-4d20-8fdd-2e51740038bc\\screenshots",
];

for (const dir of targetDirs) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

// Extract mockDashboard from capture_schedule_proofs.cjs
const schedScript = fs.readFileSync(path.resolve("scripts/capture_schedule_proofs.cjs"), "utf8");
const lines = schedScript.split("\n");
const mockCode = lines.slice(15, 281).join("\n").replace("const mockDashboard =", "mockDashboard =");
const todayDate = new Date().toISOString().slice(0, 10);
let mockDashboard;
eval(mockCode);

assert(mockDashboard && mockDashboard.clinicSettings, "mockDashboard must be defined and valid!");
console.log(`Mock loaded: ${mockDashboard.clinicSettings.profile.clinicName}, ${mockDashboard.patients.length} patients, ${mockDashboard.appointments.length} appointments.`);

async function saveProof(page, fileName) {
  for (const dir of targetDirs) {
    const fullPath = path.join(dir, fileName);
    await page.screenshot({ path: fullPath, fullPage: false, animations: "disabled" });
    console.log(`Saved screenshot: ${fileName} (${fs.statSync(fullPath).size} bytes)`);
  }
}

async function setTheme(page, theme) {
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
  const isDark = ["dark", "night", "ocean", "emerald", "cyber_xray"].includes(theme);
  await page.waitForFunction(
    (dark) => document.documentElement.classList.contains("dark") === dark,
    isDark,
    { timeout: 5000 }
  ).catch(() => {});
  await page.waitForTimeout(400);
}

async function capture() {
  const browser = await chromium.launch({
    executablePath: "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });

  try {
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
      if (url.includes("/api/workspace/profile")) {
        return route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            success: true,
            flags: {
              hasAssistants: true,
              hasMultipleChairs: true,
              hasDentalLab: true,
              hasInsuranceCoPay: true,
              hasInstallments: true,
              hasOrthodontics: true,
              hasGnathology: false,
              hasTasks: true,
              hasReclamations: true,
              workspacePreset: "enterprise",
              onboardingCompleted: true,
              hasPediatricMode: false,
              isOmniRole: false,
              numberOfDoctors: 4,
              hasPayrollModule: true,
              hasMarketingModule: true,
              hasAnalyticsModule: true,
              hasCsoScanner: false,
              hasLeadsKanban: false,
              hasOmnichannel: false,
              hasInventoryModule: true,
              aiEnableTreatmentPlan: true,
              aiEnableRecommendations: true,
              aiEnableDocuments: true,
              hasEngineeringStatus: false,
              hasClinicalRules: true,
              hasReferralModule: false,
              hasBpmWorkflows: false,
            },
          }),
        });
      }
      if (url.includes("/api/clinic") || url.includes("/api/settings")) {
        return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(mockDashboard.clinicSettings || {}) });
      }
      return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ success: true }) });
    });

    console.log("Navigating to http://127.0.0.1:5173/#schedule...");
    await page.goto("http://127.0.0.1:5173/#schedule", { waitUntil: "domcontentloaded", timeout: 30000 });
    await page.waitForSelector(".boot-state", { state: "detached", timeout: 30000 });
    console.log("Boot state detached! App successfully bootstrapped.");
    await page.waitForTimeout(800);

    // Dismiss any banner
    const dismissBtn = page.locator('button:has-text("Скрыть"), button:has-text("Понятно"), [data-testid="btn-dismiss-notice"]');
    if (await dismissBtn.isVisible()) {
      await dismissBtn.click().catch(() => {});
      await page.waitForTimeout(300);
    }

    const themes = ["light", "dark"];

    for (const theme of themes) {
      await setTheme(page, theme);

      // --- SCREEN 1: VISIT (Дневник приёма / Согласия / Диагностика) ---
      console.log(`[${theme}] Opening Visit view...`);
      await page.evaluate(() => { window.location.hash = "#schedule"; });
      await page.waitForTimeout(500);
      const inVisitBtn = page.locator('[data-testid="appointment-action-start-appt-1"], button:has-text("В приём")').first();
      if (await inVisitBtn.isVisible()) {
        await inVisitBtn.click();
      } else {
        await page.evaluate(() => { window.location.hash = "#visit"; });
      }
      await page.waitForSelector('[data-testid="visit-subtab-emk"]', { state: "visible", timeout: 15000 });
      await page.waitForTimeout(1000);

      // Check subtab Дневник приёма (visit-subtab-emk)
      const emkTab = page.locator('[data-testid="visit-subtab-emk"]');
      if (await emkTab.isVisible()) {
        await emkTab.click();
        await page.waitForTimeout(800);
      }
      await saveProof(page, `visit_emk_clean_${theme}.png`);

      // Check subtab Согласия (visit-subtab-consents)
      const consentsTab = page.locator('[data-testid="visit-subtab-consents"]');
      if (await consentsTab.isVisible()) {
        await consentsTab.click();
        await page.waitForTimeout(600);
        await saveProof(page, `visit_consents_clean_${theme}.png`);
      }

      // Check subtab Диагностика (visit-subtab-diagnostics)
      const diagTab = page.locator('[data-testid="visit-subtab-diagnostics"]');
      if (await diagTab.isVisible()) {
        await diagTab.click();
        await page.waitForTimeout(600);
        await saveProof(page, `visit_diagnostics_clean_${theme}.png`);
      }

      // --- SCREEN 2: SETTINGS (Матрица прав & Доступ) ---
      console.log(`[${theme}] Opening Settings view...`);
      await page.evaluate(() => { window.location.hash = "#settings/access"; });
      await page.waitForSelector('[data-testid="settings-view"]', { state: "visible", timeout: 25000 });
      await page.waitForTimeout(800);

      // Click "Все разделы" to see full settings if collapsed
      const allBtn = page.locator('[data-testid="btn-settings-role-all"]').first();
      if (await allBtn.isVisible()) {
        await allBtn.click();
        await page.waitForTimeout(500);
      }

      // Ensure "Доступ" tab is clicked
      const accessTab = page.locator('button:has-text("Доступ"), [data-testid="settings-tab-access"]').first();
      if (await accessTab.isVisible()) {
        await accessTab.click();
        await page.waitForTimeout(1000);
      }
      await saveProof(page, `settings_roles_clean_${theme}.png`);

      // --- SCREEN 3: PATIENTS (Картотека пациентов & Карточка) ---
      console.log(`[${theme}] Opening Patients view...`);
      await page.evaluate(() => { window.location.hash = "#patients"; });
      await page.waitForSelector('[data-testid="open-create-patient-modal-btn"], [data-testid^="patient-row-"]', { state: "visible", timeout: 25000 });
      await page.waitForTimeout(1000);

      // Click on first patient row to open patient card
      const firstPatientRow = page.locator('[data-testid^="patient-row-"]').first();
      if (await firstPatientRow.isVisible()) {
        await firstPatientRow.click();
        await page.waitForTimeout(1000);
      }
      await saveProof(page, `patients_clean_${theme}.png`);

      // Open PatientCardModal (Паспортная карточка / Законный представитель)
      const moreActionsBtn = page.locator('[data-testid="patient-card-more-actions-btn"]');
      if (await moreActionsBtn.isVisible()) {
        await moreActionsBtn.click();
        await page.waitForTimeout(500);
        const openCardBtn = page.locator('[data-testid="open-patient-card-modal-btn"]');
        if (await openCardBtn.isVisible()) {
          await openCardBtn.click();
          await page.waitForSelector('.patient-card-modal, [data-testid="patient-card-modal"]', { state: "visible", timeout: 10000 }).catch(() => {});
          await page.waitForTimeout(1000);
          await saveProof(page, `patient_card_modal_clean_${theme}.png`);
          // Close modal
          const closeModalBtn = page.locator('button:has-text("Закрыть"), [aria-label="Закрыть"]').first();
          if (await closeModalBtn.isVisible()) {
            await closeModalBtn.click();
            await page.waitForTimeout(400);
          }
        }
      }
    }

    console.log("All canonical screenshots successfully captured!");
  } finally {
    await browser.close();
  }
}

capture().catch((err) => {
  console.error("Screenshot capture failed:", err);
  process.exit(1);
});
