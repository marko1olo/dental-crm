/**
 * scripts/capture_visit_all_tabs_inquisition.cjs
 *
 * Dedicated Playwright screenshot script for Red Team Inquisitor Tabs:
 * Captures clean high-resolution live screenshots of ALL 5 visit tabs at 1440x900:
 * 1. tab1_emk_pc_light.png / tab1_emk_pc_dark.png
 * 2. tab2_odontogram_pc_light.png / tab2_odontogram_pc_dark.png
 * 3. tab3_diagnostics_pc_light.png / tab3_diagnostics_pc_dark.png
 * 4. tab4_consents_pc_light.png / tab4_consents_pc_dark.png
 * 5. tab5_anamnesis_pc_light.png / tab5_anamnesis_pc_dark.png
 *
 * Enforces Anti-Blank Byte Guard (>= 20 KB floor).
 * Mandate 8b: strictly <= 800 lines.
 */

const { chromium } = require("playwright");
const path = require("node:path");
const fs = require("node:fs");
const crypto = require("node:crypto");

const todayDate = new Date().toLocaleDateString("en-CA");

const mockDashboard = {
  clinicName: "Стоматология ДЕНТЕ Премиум",
  todayIso: todayDate,
  clinicSettings: {
    profile: {
      id: "c-1",
      organizationId: "00000000-0000-0000-0000-000000000001",
      clinicName: "Стоматология ДЕНТЕ Премиум",
      mode: "small_clinic",
      defaultVisitMinutes: 45,
      scheduleDefaults: {
        workingDays: [1, 2, 3, 4, 5, 6],
        workdayStart: "08:00",
        workdayEnd: "21:00",
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
        name: "Кабинет 1 (Терапия)",
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
    soloDoctorMode: false,
  },
  shiftIntelligence: {
    modeFit: {
      mode: "small_clinic",
      title: "Оптимальный режим",
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
  patients: [
    {
      id: "pat-1",
      organizationId: "00000000-0000-0000-0000-000000000001",
      fullName: "Ковалёв Роман Станиславович",
      status: "active",
      birthDate: "1988-04-12",
      phone: "+7 (999) 888-77-66",
      email: "kovalev@example.ru",
      notes: "Бронхиальная астма, аллергия на латекс",
      administrativeProfile: "normal",
      cardNumber: "402/26",
      totalVisits: 3,
      balanceRub: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
  ],
  appointments: [
    {
      id: "app-1",
      organizationId: "00000000-0000-0000-0000-000000000001",
      patientId: "pat-1",
      doctorUserId: "doc-1",
      doctorId: "doc-1",
      chairId: "chair-1",
      status: "in_treatment",
      state: "in_treatment",
      priority: "normal",
      intent: "treatment",
      startsAt: `${todayDate}T09:00:00.000Z`,
      endsAt: `${todayDate}T10:00:00.000Z`,
      startTime: `${todayDate}T09:00:00.000Z`,
      endTime: `${todayDate}T10:00:00.000Z`,
      durationMinutes: 60,
      serviceTitle: "Лечение глубокого кариеса 4.6",
      serviceCategories: ["therapy"],
      createdByUserId: "doc-1",
      createdAt: `${todayDate}T08:00:00.000Z`,
      updatedAt: `${todayDate}T08:00:00.000Z`,
      patientName: "Ковалёв Роман Станиславович",
      doctorName: "Д-р Воронов Алексей Владимирович",
    },
  ],
  imagingStudies: [
    {
      id: "study-1",
      patientId: "pat-1",
      title: "Прицельная визиография 4.6 (периапикальный статус)",
      kind: "periapical",
      modality: "rvg",
      toothNumber: 46,
      effectiveDoseMicrosv: 2,
      capturedAt: new Date().toISOString(),
      previewUrl: "/radiology/sample_rvg_periapical_46.jpg",
      viewerUrl: "/radiology/sample_rvg_periapical_46.jpg",
      status: "available",
    },
    {
      id: "study-2",
      patientId: "pat-1",
      title: "ОПТГ панорамная томография",
      kind: "panoramic",
      modality: "optg",
      effectiveDoseMicrosv: 18,
      capturedAt: new Date().toISOString(),
      previewUrl: "/radiology/sample_optg_panoramic.jpg",
      viewerUrl: "/radiology/sample_optg_panoramic.jpg",
      status: "available",
    },
  ],
  appointmentReadiness: [],
  scheduleSuggestions: [],
  activeVisit: null,
  visitCloseChecklist: {
    visitId: "v-none",
    readyToSign: false,
    score: 0,
    nextAction: "none",
    blockingItems: 0,
    items: [],
  },
  documents: [],
  protocolTemplates: [],
  serviceCatalog: [],
  treatmentPlanItems: [],
  treatmentPlanScenarios: [],
  clinicalRules: [],
  clinicalRuleEvaluations: [],
  clinicalRuleSummary: {
    activeRules: 0,
    evaluatedRules: 0,
    unresolved: 0,
    blockers: 0,
    warnings: 0,
    requiredServices: 0,
    coveredRules: 0,
  },
  payments: [],
  billingSummary: {
    totalPlannedRub: 0,
    totalInvoicedRub: 0,
    totalPaidRub: 0,
    balanceRub: 0,
  },
};

async function main() {
  const primaryDir = path.resolve("C:/Clinic_MVP/dental-crm/docs/screenshots/visit_tabs");
  const brainDir = path.resolve("C:/Users/Admin/.gemini/antigravity/brain/dcad7df1-03ab-47dd-8573-83dc65dc439b");

  for (const dir of [primaryDir, brainDir]) {
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  }

  console.log("[Playwright] Launching Chrome executable...");
  const browser = await chromium.launch({
    headless: true,
    executablePath: "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
    args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-gpu", "--force-device-scale-factor=1"],
  });

  const setupPageRoutes = async (page) => {
    await page.route("**/api/**", async (route) => {
      const url = route.request().url();
      if (url.includes("/src/")) return route.continue();

      if (url.includes("/api/dashboard") || url.includes("/api/bootstrap")) {
        return route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify(mockDashboard),
        });
      }
      if (url.includes("/api/auth/user/me") || url.includes("/api/auth/session")) {
        return route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            user: {
              id: "doc-1",
              fullName: "Д-р Воронов Алексей Владимирович",
              role: "owner",
              active: true,
              organizationId: "00000000-0000-0000-0000-000000000001",
            },
          }),
        });
      }
      if (url.includes("/api/auth/staff/unlock")) {
        return route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            success: true,
            token: "live-inquisition-staff-token",
            user: { id: "doc-1", fullName: "Д-р Воронов Алексей Владимирович", role: "owner" },
          }),
        });
      }
      if (url.includes("/api/schedule")) {
        return route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify(mockDashboard.appointments),
        });
      }
      if (url.includes("/api/patients")) {
        return route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify(mockDashboard.patients),
        });
      }
      if (url.includes("/api/payments") || url.includes("/api/billing")) {
        return route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify(mockDashboard.payments),
        });
      }
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(url.includes("list") || url.includes("status") ? [] : {}),
      });
    });
  };

  const addAuthInitScript = (ctx) => {
    ctx.addInitScript(() => {
      localStorage.setItem("dente_demo_showcase", "true");
      localStorage.setItem("dente_clinic_token", "live-inquisition-clinic-token");
      localStorage.setItem("dente_staff_token", "live-inquisition-staff-token");
      localStorage.setItem("dente_active_role", "owner");
      localStorage.setItem("dente_theme_mode", "light");
      localStorage.setItem(
        "dente_cached_active_staff_user",
        JSON.stringify({
          id: "doc-1",
          fullName: "Д-р Воронов Алексей Владимирович",
          role: "owner",
          organizationId: "00000000-0000-0000-0000-000000000001",
        })
      );
      localStorage.setItem(
        "dente_ui_preferences_v1",
        JSON.stringify({
          onboardingDismissed: true,
          onboardingStep: "done",
          version: 1,
        })
      );
      localStorage.setItem(
        "dental-crm:onboarding:v1",
        JSON.stringify({
          dismissed: true,
          step: "done",
          completed: true,
          version: 1,
        })
      );
      localStorage.setItem(
        "dental-crm:web-ui-preferences:v1",
        JSON.stringify({
          version: 1,
          uiLanguage: "ru",
          selectedWorkspaceRole: "owner",
          selectedPatientId: "pat-1",
          onboardingDismissed: true,
          onboardingStep: "done",
        })
      );
      localStorage.setItem(
        "dente-workspace-profile",
        JSON.stringify({
          state: {
            clinicName: "Стоматология ДЕНТЕ Премиум",
            currentDoctor: { id: "doc-1", fullName: "Д-р Воронов Алексей Владимирович", role: "owner" },
            flags: { disableTour: true },
          },
        })
      );
    });
  };

  const applyTheme = async (page, theme) => {
    console.log(`Applying theme: ${theme}...`);
    await page.evaluate((th) => {
      localStorage.setItem("dente_theme_mode", th);
      localStorage.setItem("dente_theme", th);
      if (window.__useThemeStore) {
        window.__useThemeStore.getState().setThemeMode(th);
      }
      if (window.__denteThemeStore) {
        window.__denteThemeStore.getState().setTheme(th);
      }
      document.documentElement.setAttribute("data-theme", th);
      const isDark = ["dark", "night", "ocean", "emerald", "cyber_xray"].includes(th);
      document.documentElement.classList.toggle("dark", isDark);
      document.documentElement.classList.toggle("light", !isDark);
      document.body.classList.toggle("dark", isDark);
      document.body.classList.toggle("light", !isDark);
      document.documentElement.style.colorScheme = isDark ? "dark" : "light";
    }, theme);
    await page.waitForTimeout(600);
  };

  const navigateView = async (page, hash, selector) => {
    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        await page.evaluate((h) => { window.location.hash = h; }, hash);
        await page.waitForSelector(selector, { state: "visible", timeout: 30000 });
        await page.waitForSelector(".boot-state", { state: "detached", timeout: 30000 }).catch(() => {});
        await page.waitForSelector('[aria-busy="true"]', { state: "detached", timeout: 30000 }).catch(() => {});
        await page.waitForTimeout(1000);
        break;
      } catch (err) {
        if (attempt === 3) throw err;
        await page.waitForTimeout(1000);
      }
    }
  };

  const saveProof = async (page, filename) => {
    const destPrimary = path.join(primaryDir, filename);
    await page.screenshot({ path: destPrimary, fullPage: false, animations: "disabled" });

    // Anti-Blank Byte Guard (>= 20 KB floor)
    const stats = fs.statSync(destPrimary);
    if (stats.size < 20480) {
      throw new Error(`[ANTI-BLANK REJECTED] File ${filename} is only ${stats.size} bytes (< 20 KB)! Unmounted or failed render.`);
    }

    // Copy to brain artifact dir
    const destBrain = path.join(brainDir, filename);
    fs.copyFileSync(destPrimary, destBrain);

    const hash = crypto.createHash("md5").update(fs.readFileSync(destPrimary)).digest("hex");
    console.log(`[PROOF CAPTURED] ${filename}: ${stats.size} bytes (${(stats.size / 1024).toFixed(1)} KB), MD5=${hash}`);
    return { filename, size: stats.size, md5: hash };
  };

  // Launch browser context (1440x900)
  const pcContext = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    deviceScaleFactor: 1,
    isMobile: false,
    hasTouch: false,
  });
  addAuthInitScript(pcContext);

  const pcPage = await pcContext.newPage();
  await setupPageRoutes(pcPage);

  // 1. Initial load to schedule to seed stores
  console.log("Loading application schedule...");
  await pcPage.goto("http://127.0.0.1:5173/#schedule", { waitUntil: "domcontentloaded", timeout: 60000 });
  await pcPage.waitForSelector(".boot-state", { state: "detached", timeout: 60000 });
  await pcPage.waitForSelector(".app-shell", { state: "visible", timeout: 30000 });
  await pcPage.waitForTimeout(1500);

  // Remove any leftover overlays
  await pcPage.evaluate(() => {
    document.querySelectorAll(".tour-spotlight-root, [data-testid=\"guided-tour-spotlight-overlay\"], .tour-backdrop-clickable-zone, .global-toast-container").forEach((el) => el.remove());
  });

  // 2. Navigate to visit view
  console.log("Navigating to Visit view...");
  await navigateView(pcPage, "visit", ".visit-monolithic-header, [data-testid=\"visit-header-monolith\"]");
  await pcPage.waitForTimeout(1500);

  const tabsToCapture = [
    {
      id: "emk",
      testId: "visit-subtab-emk",
      name: "Дневник приёма",
      lightFile: "tab1_emk_pc_light.png",
      darkFile: "tab1_emk_pc_dark.png",
      contentSelector: ".emk-grid-container, [data-testid=\"visit-emk-tab\"], .visit-emk-tab-container, .emk-workspace-container",
    },
    {
      id: "odontogram",
      testId: "visit-subtab-odontogram",
      name: "Зубная формула",
      lightFile: "tab2_odontogram_pc_light.png",
      darkFile: "tab2_odontogram_pc_dark.png",
      contentSelector: "[data-testid=\"adult-arch-surface\"], .odontogram-interactive-cockpit, .odontogram-tab-container",
    },
    {
      id: "diagnostics",
      testId: "visit-subtab-diagnostics",
      name: "Диагностика",
      lightFile: "tab3_diagnostics_pc_light.png",
      darkFile: "tab3_diagnostics_pc_dark.png",
      contentSelector: "[data-testid=\"visit-diagnostics-tab\"], .visit-diagnostics-tab",
    },
    {
      id: "consents",
      testId: "visit-subtab-consents",
      name: "Согласия",
      lightFile: "tab4_consents_pc_light.png",
      darkFile: "tab4_consents_pc_dark.png",
      contentSelector: "[data-testid=\"visit-consents-tab-panel\"], .vct-root",
    },
    {
      id: "anamnesis",
      testId: "visit-subtab-anamnesis",
      name: "Анамнез",
      lightFile: "tab5_anamnesis_pc_light.png",
      darkFile: "tab5_anamnesis_pc_dark.png",
      contentSelector: "[data-testid=\"visit-anamnesis-tab\"], .visit-anamnesis-tab",
    },
  ];

  const results = [];

  for (const t of tabsToCapture) {
    console.log(`\n======================================================`);
    console.log(`>>> PROCESSING TAB: ${t.name} (${t.id}) <<<`);
    console.log(`======================================================`);

    const subtabBtn = await pcPage.$(`[data-testid="${t.testId}"]`);
    if (!subtabBtn) {
      throw new Error(`Subtab button for ${t.name} ([data-testid="${t.testId}"]) not found!`);
    }

    await subtabBtn.click();
    await pcPage.waitForTimeout(1000);

    if (t.contentSelector) {
      await pcPage.waitForSelector(t.contentSelector, { state: "visible", timeout: 15000 }).catch((e) => {
        console.warn(`[WARNING] Content selector ${t.contentSelector} not immediately visible for ${t.name}:`, e.message);
      });
    }

    // 1. Capture Light mode
    await applyTheme(pcPage, "light");
    await pcPage.waitForTimeout(600);
    const lightRes = await saveProof(pcPage, t.lightFile);
    results.push(lightRes);

    // 2. Capture Dark mode
    await applyTheme(pcPage, "dark");
    await pcPage.waitForTimeout(600);
    const darkRes = await saveProof(pcPage, t.darkFile);
    results.push(darkRes);
  }

  await pcContext.close();
  await browser.close();

  console.log("\n======================================================");
  console.log(">>> ALL 10 SCREENSHOTS CAPTURED AND VERIFIED (>= 20 KB)! <<<");
  console.log("======================================================");
  console.log(JSON.stringify(results, null, 2));
}

main().catch((err) => {
  console.error("FATAL ERROR in capture_visit_all_tabs_inquisition:", err);
  process.exit(1);
});
