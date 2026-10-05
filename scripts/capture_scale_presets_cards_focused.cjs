/**
 * scripts/capture_scale_presets_cards_focused.cjs
 *
 * Focuses directly on the SovereignScalePresetsCard in:
 * 1. Onboarding Wizard Step 2 ("Клиника" step where SovereignScalePresetsCard is mounted)
 * 2. Owner Settings section (where SovereignScalePresetsCard is displayed with all 3 tiers)
 * Captures both Desktop (1440x900) and Mobile (390x844).
 */

const { chromium } = require("playwright");
const path = require("node:path");
const fs = require("node:fs");
const crypto = require("node:crypto");

const BASE_URL = "http://127.0.0.1:5173";
const todayDate = new Date().toLocaleDateString("en-CA");

const mockDashboard = {
  clinicName: "Стоматология ДЕНТЕ Премиум",
  todayIso: todayDate,
  clinicSettings: {
    profile: {
      id: "c-1",
      organizationId: "00000000-0000-0000-0000-000000000001",
      clinicName: "Стоматология ДЕНТЕ Премиум",
      mode: "solo_doctor",
      defaultVisitMinutes: 30,
      scheduleDefaults: {
        workingDays: [1, 2, 3, 4, 5, 6],
        workdayStart: "08:00",
        workdayEnd: "20:00",
        appointmentBufferMinutes: 10,
      },
      timezone: "Europe/Moscow",
      phone: "+7 (495) 123-45-67",
      address: "Москва, Столярный переулок, 14",
      inn: "7701234567",
      updatedAt: new Date().toISOString(),
    },
    staff: [
      {
        id: "doc-1",
        organizationId: "00000000-0000-0000-0000-000000000001",
        fullName: "Д-р Воронов Алексей Владимирович",
        role: "owner",
        specialties: ["therapist", "orthopedist"],
        active: true,
        color: "#0d9488",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    ],
    chairs: [
      {
        id: "chair-1",
        organizationId: "00000000-0000-0000-0000-000000000001",
        name: "Основное кресло врача",
        room: "1",
        defaultDoctorId: "doc-1",
        active: true,
        hasXraySensor: true,
        hasMicroscope: true,
        hasSurgeryKit: false,
      },
    ],
    integrationPresets: [],
    workspaceProfiles: [],
    roleAccessPolicies: [],
    modeHints: [],
    soloDoctorMode: true,
  },
  shiftIntelligence: {
    modeFit: {
      mode: "solo_doctor",
      title: "Суверенный кабинет",
      fitScore: 100,
      blockers: [],
      upgrades: [],
      lowFrictionNextStep: "ready",
    },
    doctorLoads: [],
    assistantLoads: [],
    chairLoads: [],
    roleQueues: [],
    scheduleWarnings: [],
  },
  patients: [],
  appointments: [],
  payments: [],
};

const OUTPUT_DIRS = [
  path.resolve("docs/screenshots/scale_presets"),
  path.resolve("C:/Users/Admin/.gemini/antigravity/brain/cb2f8a6e-e99b-4544-a483-374373bff0f6"),
  path.resolve("C:/Users/Admin/.gemini/antigravity/brain/beb92312-c6d7-426d-a438-12dcad022abc"),
];

async function capture() {
  const browser = await chromium.launch({
    headless: true,
    executablePath: "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });

  function setupRouting(page) {
    return page.route("**/api/**", async (route) => {
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
            user: { id: "doc-1", fullName: "Д-р Воронов Алексей Владимирович", role: "owner", organizationId: "00000000-0000-0000-0000-000000000001" },
          }),
        });
      }
      return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ success: true }) });
    });
  }

  async function saveShot(page, filename) {
    const primaryPath = path.join(OUTPUT_DIRS[0], filename);
    await page.screenshot({ path: primaryPath, fullPage: false, animations: "disabled" });
    const stats = fs.statSync(primaryPath);
    const hash = crypto.createHash("md5").update(fs.readFileSync(primaryPath)).digest("hex");
    console.log(`[Captured] ${filename} | Size: ${(stats.size / 1024).toFixed(1)} KB | MD5: ${hash}`);
    for (let i = 1; i < OUTPUT_DIRS.length; i++) {
      try { fs.copyFileSync(primaryPath, path.join(OUTPUT_DIRS[i], filename)); } catch (_e) {}
    }
    return primaryPath;
  }

  // 1. Onboarding Wizard Step 2 (Клиника с пресетами) - Desktop Light & Dark
  for (const theme of ["light", "dark"]) {
    const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 2 });
    await context.addInitScript(({ themeMode }) => {
      localStorage.setItem("dente_clinic_token", "live-settings-clinic-token");
      localStorage.setItem("dente_staff_token", "live-settings-staff-token");
      localStorage.setItem("dente_active_role", "owner");
      localStorage.setItem("dente_theme_mode", themeMode);
      localStorage.setItem("dente_cached_active_staff_user", JSON.stringify({
        id: "doc-1", fullName: "Д-р Воронов Алексей Владимирович", role: "owner", organizationId: "00000000-0000-0000-0000-000000000001"
      }));
      localStorage.setItem("dente_ui_preferences_v1", JSON.stringify({
        onboardingDismissed: false, onboardingStep: "clinic", version: 1
      }));
      localStorage.setItem("dental-crm:onboarding:v1", JSON.stringify({
        dismissed: false, step: "clinic", completed: false, onboardingDismissed: false, onboardingStep: "clinic"
      }));
    }, { themeMode: theme });

    const page = await context.newPage();
    await setupRouting(page);
    await page.goto(`${BASE_URL}/#settings`, { waitUntil: "domcontentloaded", timeout: 45000 });
    await page.waitForTimeout(1500);

    if (theme === "dark") {
      await page.evaluate(() => {
        document.documentElement.classList.add("dark");
        document.body.classList.add("dark");
        document.documentElement.style.colorScheme = "dark";
      });
    }

    // Dismiss any tour bubbles
    await page.evaluate(() => {
      const tourCloseBtn = Array.from(document.querySelectorAll("button")).find(
        (b) => b.textContent && (b.textContent.includes("Пропустить") || b.textContent.includes("Больше не показывать"))
      );
      if (tourCloseBtn) tourCloseBtn.click();
    });
    await page.waitForTimeout(600);

    // Switch step to "Клиника" (Step 2)
    await page.evaluate(() => {
      const step2Btn = Array.from(document.querySelectorAll("button")).find(
        (b) => b.textContent && b.textContent.includes("Клиника") && b.textContent.includes("2")
      );
      if (step2Btn) step2Btn.click();
    });
    await page.waitForTimeout(1000);

    await saveShot(page, `scale_presets_step_clinic_${theme}.png`);
    await context.close();
  }

  // 2. Settings Owner with SovereignScalePresetsCard centered - Desktop Light & Dark
  for (const theme of ["light", "dark"]) {
    const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 2 });
    await context.addInitScript(({ themeMode }) => {
      localStorage.setItem("dente_clinic_token", "live-settings-clinic-token");
      localStorage.setItem("dente_staff_token", "live-settings-staff-token");
      localStorage.setItem("dente_active_role", "owner");
      localStorage.setItem("dente_theme_mode", themeMode);
      localStorage.setItem("dente_cached_active_staff_user", JSON.stringify({
        id: "doc-1", fullName: "Д-р Воронов Алексей Владимирович", role: "owner", organizationId: "00000000-0000-0000-0000-000000000001"
      }));
      localStorage.setItem("dente_ui_preferences_v1", JSON.stringify({
        onboardingDismissed: true, onboardingStep: "done", version: 1
      }));
      localStorage.setItem("dental-crm:onboarding:v1", JSON.stringify({
        dismissed: true, step: "done", completed: true, onboardingDismissed: true, onboardingStep: "done"
      }));
      localStorage.setItem("dental-crm:web-ui-preferences:v1", JSON.stringify({
        version: 1,
        onboardingDismissed: true,
        onboardingDismissedAt: new Date().toISOString(),
        onboardingStep: "done",
        onboardingDraftMode: false,
        selectedWorkspaceRole: "owner",
      }));
    }, { themeMode: theme });

    const page = await context.newPage();
    await setupRouting(page);
    await page.goto(`${BASE_URL}/#settings`, { waitUntil: "domcontentloaded", timeout: 45000 });
    await page.waitForTimeout(1500);

    if (theme === "dark") {
      await page.evaluate(() => {
        document.documentElement.classList.add("dark");
        document.body.classList.add("dark");
        document.documentElement.style.colorScheme = "dark";
      });
    }

    // Dismiss tour and any onboarding wizard modal
    await page.evaluate(() => {
      const tourBtn = Array.from(document.querySelectorAll("button")).find(
        (b) => b.textContent && (b.textContent.includes("Пропустить") || b.textContent.includes("Больше не показывать"))
      );
      if (tourBtn) tourBtn.click();

      const dismissWizardBtn = Array.from(document.querySelectorAll("button")).find(
        (b) => b.textContent && (b.textContent.includes("Скрыть") || b.textContent.includes("Продолжить в черновике"))
      );
      if (dismissWizardBtn) dismissWizardBtn.click();
    });
    await page.waitForTimeout(600);

    // Switch to Clinic tab in settings
    await page.evaluate(() => {
      const clinicTab = Array.from(document.querySelectorAll("button, .settings-subnav-btn")).find(
        (b) => b.textContent && (b.textContent.includes("Клиника") || b.textContent.includes("кабинет"))
      );
      if (clinicTab) clinicTab.click();
    });
    await page.waitForTimeout(1000);

    // Dismiss any vite-error-overlay or modal popups
    await page.keyboard.press("Escape");
    await page.evaluate(() => {
      const overlay = document.querySelector("vite-error-overlay");
      if (overlay) overlay.remove();
      const nextOverlay = document.querySelectorAll("iframe, div[style*='z-index: 99999']");
      nextOverlay.forEach(el => el.remove());
    });
    await page.waitForTimeout(500);

    // Scroll to Sovereign Scale Presets card
    await page.evaluate(() => {
      const card = document.querySelector('[data-testid="sovereign-scale-presets-card"]');
      if (card) {
        card.scrollIntoView({ behavior: "instant", block: "center" });
      }
    });
    await page.waitForTimeout(1000);

    await saveShot(page, `scale_presets_settings_tier_card_${theme}.png`);
    await context.close();
  }

  // 3. Mobile View of SovereignScalePresetsCard in Settings - Mobile Light & Dark
  for (const theme of ["light", "dark"]) {
    const context = await browser.newContext({
      viewport: { width: 390, height: 844 },
      deviceScaleFactor: 3,
      isMobile: true,
      hasTouch: true,
    });
    await context.addInitScript(({ themeMode }) => {
      localStorage.setItem("dente_clinic_token", "live-settings-clinic-token");
      localStorage.setItem("dente_staff_token", "live-settings-staff-token");
      localStorage.setItem("dente_active_role", "owner");
      localStorage.setItem("dente_theme_mode", themeMode);
      localStorage.setItem("dente_cached_active_staff_user", JSON.stringify({
        id: "doc-1", fullName: "Д-р Воронов Алексей Владимирович", role: "owner", organizationId: "00000000-0000-0000-0000-000000000001"
      }));
      localStorage.setItem("dente_ui_preferences_v1", JSON.stringify({
        onboardingDismissed: true, onboardingStep: "done", version: 1
      }));
      localStorage.setItem("dental-crm:onboarding:v1", JSON.stringify({
        dismissed: true, step: "done", completed: true, onboardingDismissed: true, onboardingStep: "done"
      }));
      localStorage.setItem("dental-crm:web-ui-preferences:v1", JSON.stringify({
        version: 1,
        onboardingDismissed: true,
        onboardingDismissedAt: new Date().toISOString(),
        onboardingStep: "done",
        onboardingDraftMode: false,
        selectedWorkspaceRole: "owner",
      }));
    }, { themeMode: theme });

    const page = await context.newPage();
    await setupRouting(page);
    await page.goto(`${BASE_URL}/#settings`, { waitUntil: "domcontentloaded", timeout: 45000 });
    await page.waitForTimeout(1500);

    if (theme === "dark") {
      await page.evaluate(() => {
        document.documentElement.classList.add("dark");
        document.body.classList.add("dark");
        document.documentElement.style.colorScheme = "dark";
      });
    }

    // Dismiss tour and any onboarding wizard modal
    await page.evaluate(() => {
      const tourBtn = Array.from(document.querySelectorAll("button")).find(
        (b) => b.textContent && (b.textContent.includes("Пропустить") || b.textContent.includes("Больше не показывать"))
      );
      if (tourBtn) tourBtn.click();

      const dismissWizardBtn = Array.from(document.querySelectorAll("button")).find(
        (b) => b.textContent && (b.textContent.includes("Скрыть") || b.textContent.includes("Продолжить в черновике"))
      );
      if (dismissWizardBtn) dismissWizardBtn.click();
    });
    await page.waitForTimeout(600);

    // Switch to Clinic tab in settings
    await page.evaluate(() => {
      const clinicTab = Array.from(document.querySelectorAll("button, .settings-subnav-btn")).find(
        (b) => b.textContent && (b.textContent.includes("Клиника") || b.textContent.includes("кабинет"))
      );
      if (clinicTab) clinicTab.click();
    });
    await page.waitForTimeout(1000);

    // Scroll to Sovereign Scale Presets card
    await page.evaluate(() => {
      const card = document.querySelector('[data-testid="sovereign-scale-presets-card"]');
      if (card) {
        card.scrollIntoView({ behavior: "instant", block: "start" });
      }
    });
    await page.waitForTimeout(1000);

    await saveShot(page, `scale_presets_mobile_focused_${theme}.png`);
    await context.close();
  }

  await browser.close();
  console.log("All focused screenshots taken successfully!");
}

capture().catch((e) => {
  console.error("Fatal:", e);
  process.exit(1);
});
