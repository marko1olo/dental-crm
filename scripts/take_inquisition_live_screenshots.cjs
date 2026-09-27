/**
 * scripts/take_inquisition_live_screenshots.cjs
 * Adversarial Red Team Live Screenshot Pipeline (Mandates 8c, 8e, 8p, 8b).
 * Captures live screenshots across core views (Schedule, Visit/EMR, Patients, Finance)
 * in 4 core states (1440x900 Desktop Light, 1440x900 Desktop Dark, 390x844 Mobile Light, 390x844 Mobile Dark),
 * plus Theme Switcher Modal and specialized atmospheric themes (Ocean, Cyber X-Ray, Emerald).
 *
 * Invariants:
 * - Running Vite server on http://127.0.0.1:5173/
 * - Resilient auth & data provisioning (Live API or client route interception)
 * - Explicit selector waiters and theme switching
 * - File size >= 40 KB, unique MD5 hashes
 * - Output saved in docs/screenshots/inquisition_live/ and copied to brain
 * - Mandate 8b: strictly <= 800 lines
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
      createdAt: `${todayDate}T08:00:00.000Z`,
      updatedAt: `${todayDate}T08:00:00.000Z`,
    },
    {
      id: "pat-2",
      organizationId: "00000000-0000-0000-0000-000000000001",
      fullName: "Иванов Алексей Сергеевич",
      status: "active",
      birthDate: "1992-08-24",
      phone: "+7 (916) 123-45-67",
      email: "ivanov@example.ru",
      notes: "Здоров",
      administrativeProfile: "normal",
      createdAt: `${todayDate}T08:00:00.000Z`,
      updatedAt: `${todayDate}T08:00:00.000Z`,
    },
    {
      id: "pat-3",
      organizationId: "00000000-0000-0000-0000-000000000001",
      fullName: "Смирнова Елена Васильевна",
      status: "active",
      birthDate: "1995-11-15",
      phone: "+7 (925) 555-44-33",
      email: "smirnova@example.ru",
      notes: "Чувствительность эмали",
      administrativeProfile: "normal",
      createdAt: `${todayDate}T08:00:00.000Z`,
      updatedAt: `${todayDate}T08:00:00.000Z`,
    },
  ],
  patientInsights: [],
  recommendedActions: [],
  appointments: [
    {
      id: "app-1",
      organizationId: "00000000-0000-0000-0000-000000000001",
      patientId: "pat-2",
      doctorUserId: "doc-1",
      doctorId: "doc-1",
      chairId: "chair-1",
      status: "completed",
      state: "completed",
      priority: "normal",
      intent: "treatment",
      startsAt: `${todayDate}T06:00:00.000Z`,
      endsAt: `${todayDate}T07:00:00.000Z`,
      startTime: `${todayDate}T06:00:00.000Z`,
      endTime: `${todayDate}T07:00:00.000Z`,
      durationMinutes: 60,
      serviceTitle: "Терапия: Лечение кариеса",
      serviceCategories: ["therapy"],
      createdByUserId: "doc-1",
      createdAt: `${todayDate}T08:00:00.000Z`,
      updatedAt: `${todayDate}T08:00:00.000Z`,
      patientName: "Иванов Алексей Сергеевич",
      doctorName: "Д-р Воронов А.В.",
    },
    {
      id: "app-2",
      organizationId: "00000000-0000-0000-0000-000000000001",
      patientId: "pat-1",
      doctorUserId: "doc-1",
      doctorId: "doc-1",
      chairId: "chair-1",
      status: "in_treatment",
      state: "in_treatment",
      priority: "normal",
      intent: "treatment",
      startsAt: `${todayDate}T10:00:00.000Z`,
      endsAt: `${todayDate}T11:30:00.000Z`,
      startTime: `${todayDate}T10:00:00.000Z`,
      endTime: `${todayDate}T11:30:00.000Z`,
      durationMinutes: 90,
      serviceTitle: "Эндодонтия 46 зуба (3 канала)",
      serviceCategories: ["therapy", "endodontics"],
      createdByUserId: "doc-1",
      createdAt: `${todayDate}T08:00:00.000Z`,
      updatedAt: `${todayDate}T08:00:00.000Z`,
      patientName: "Ковалёв Роман Станиславович",
      doctorName: "Д-р Воронов А.В.",
    },
    {
      id: "app-3",
      organizationId: "00000000-0000-0000-0000-000000000001",
      patientId: "pat-3",
      doctorUserId: "doc-1",
      doctorId: "doc-1",
      chairId: "chair-1",
      status: "confirmed",
      state: "confirmed",
      priority: "normal",
      intent: "consultation",
      startsAt: `${todayDate}T12:30:00.000Z`,
      endsAt: `${todayDate}T13:30:00.000Z`,
      startTime: `${todayDate}T12:30:00.000Z`,
      endTime: `${todayDate}T13:30:00.000Z`,
      durationMinutes: 60,
      serviceTitle: "Первичная консультация + профгигиена",
      serviceCategories: ["hygiene", "therapy"],
      createdByUserId: "doc-1",
      createdAt: `${todayDate}T08:00:00.000Z`,
      updatedAt: `${todayDate}T08:00:00.000Z`,
      patientName: "Смирнова Елена Васильевна",
      doctorName: "Д-р Воронов А.В.",
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
  imagingStudies: [],
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
  payments: [
    {
      id: "pay-1",
      patientId: "pat-1",
      amountRub: 12500,
      method: "card",
      fiscalReceiptNumber: "ФЧ-000892",
      fiscalReceiptIssuedAt: new Date().toISOString(),
      note: "Оплата за комплексное терапевтическое лечение",
    },
  ],
  billingSummary: {
    totalPlannedRub: 12500,
    totalDiscountRub: 0,
    totalPaidRub: 12500,
    totalDueRub: 0,
    taxDeductionEligibleRub: 12500,
    draftDocumentAmountRub: 0,
    openTreatmentItems: 1,
    unpaidDocuments: 0,
  },
  communicationTemplates: [],
  communicationTasks: [],
  communicationEvents: [],
  communicationSummary: {
    openTasks: 0,
    urgentTasks: 0,
    dueToday: 0,
    overdue: 0,
    completedToday: 0,
    appointmentConfirmations: 0,
    paymentReminders: 0,
    postVisitInstructions: 0,
  },
  importBatches: [],
  speechProviders: [],
  auditEvents: [],
  complianceWarnings: [],
};

async function provisionLiveSession() {
  const API_BASE = "http://127.0.0.1:4100";
  const uniqueId = Date.now();

  try {
    const health = await fetch(`${API_BASE}/api/health`, { signal: AbortSignal.timeout(1200) });
    if (health.ok) {
      console.log("[Provisioning] Live API is online, seeding live database...");
      const initRes = await fetch(`${API_BASE}/api/auth/setup/init`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clinicName: "Стоматология ДЕНТЕ Премиум",
          email: `chief-${uniqueId}@dente-clinic.ru`,
          password: "Password123!",
          ownerName: "Д-р Воронов Алексей Владимирович",
          ownerPin: "1234",
        }),
      });
      if (initRes.ok) {
        const initData = await initRes.json();
        const unlockRes = await fetch(`${API_BASE}/api/auth/staff/unlock`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-dente-clinic-token": initData.clinicToken,
          },
          body: JSON.stringify({ userId: initData.ownerUserId, pinCode: "1234" }),
        });
        if (unlockRes.ok) {
          const unlockData = await unlockRes.json();
          return {
            isIntercepted: false,
            clinicToken: initData.clinicToken,
            staffToken: unlockData.staffToken,
            ownerUserId: initData.ownerUserId,
            patientId: "pat-1",
          };
        }
      }
    }
  } catch (_e) {
    // Fall back to client-side route interception
  }

  console.log("[Provisioning] Using robust client-side route interception and mock session.");
  return {
    isIntercepted: true,
    clinicToken: "live-inquisition-clinic-token",
    staffToken: "live-inquisition-staff-token",
    ownerUserId: "doc-1",
    patientId: "pat-1",
  };
}

async function runInquisitionCapture() {
  const targetDirs = [
    path.resolve("C:/Clinic_MVP/dental-crm/docs/screenshots/inquisition_live"),
    path.resolve("C:/Clinic_MVP/dental-crm/docs/screenshots/audit_7sins"),
    path.resolve("C:/Users/Admin/.gemini/antigravity/brain/a84df016-a7cc-461c-ba80-899ae84de477/screenshots"),
    path.resolve("C:/Users/Admin/.gemini/antigravity/brain/f6419b9a-f6b0-46f5-8d1a-487b39c6ec39/screenshots"),
  ];
  for (const d of targetDirs) {
    if (!fs.existsSync(d)) {
      fs.mkdirSync(d, { recursive: true });
    }
  }
  const outDir = targetDirs[0];

  const auth = await provisionLiveSession();

  console.log("[Playwright] Launching Chrome executable...");
  const browser = await chromium.launch({
    headless: true,
    executablePath: "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });

  const capturedRegistry = [];

  async function setupPageRoutes(page) {
    if (auth.isIntercepted) {
      await page.route("**/api/**", async (route) => {
        const url = route.request().url();
        if (url.includes("/src/")) {
          return route.continue();
        }
        if (url.includes("/api/dashboard")) {
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
              user: {
                id: "doc-1",
                fullName: "Д-р Воронов Алексей Владимирович",
                role: "owner",
              },
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
    }
  }

  // Helper to inject tokens and preferences
  async function applyTheme(page, theme) {
    await page.waitForFunction(() => typeof window !== "undefined" && Boolean(window.__useThemeStore), { timeout: 20000 }).catch(() => {});
    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        const res = await page.evaluate((th) => {
          localStorage.setItem("dente_theme_mode", th);
          if (window.__useThemeStore) {
            window.__useThemeStore.getState().setThemeMode(th);
          }
          document.documentElement.setAttribute("data-theme", th);
          const isDark = ["dark", "night", "ocean", "emerald", "cyber_xray"].includes(th);
          document.documentElement.classList.toggle("dark", isDark);
          document.documentElement.classList.toggle("light", !isDark);
          document.documentElement.style.colorScheme = isDark ? "dark" : "light";
          return {
            th,
            store: window.__useThemeStore?.getState()?.themeMode,
            dataTheme: document.documentElement.getAttribute("data-theme"),
            hasDarkClass: document.documentElement.classList.contains("dark"),
          };
        }, theme);
        console.log(`  [Theme Applied] ${theme}: store=${res?.store}, dataTheme=${res?.dataTheme}, dark=${res?.hasDarkClass}`);
        const isDark = ["dark", "night", "ocean", "emerald", "cyber_xray"].includes(theme);
        await page.waitForFunction((dark) => {
          const hasDark = document.documentElement.classList.contains("dark");
          return dark ? hasDark : !hasDark;
        }, isDark, { timeout: 10000 }).catch(() => {});
        await page.waitForTimeout(800);
        break;
      } catch (err) {
        if (attempt === 3) throw err;
        await page.waitForTimeout(500);
      }
    }
  }

  const configurePage = applyTheme;

  async function navigateView(page, hash, selector) {
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
  }

  async function takeProof(page, fileName, viewName, modeName, viewSelector) {
    const targetFile = path.join(outDir, fileName);

    await page.waitForSelector(".boot-state", { state: "detached", timeout: 30000 }).catch(() => {});
    if (viewSelector) {
      await page.waitForSelector(viewSelector, { state: "visible", timeout: 30000 });
    }
    await page.waitForSelector(".app-shell", { state: "visible", timeout: 30000 });
    await page.waitForSelector('[aria-busy="true"]', { state: "detached", timeout: 30000 }).catch(() => {});
    await page.waitForTimeout(800);

    for (let i = 0; i < 20; i++) {
      const isBoot = await page.evaluate(() => Boolean(document.querySelector(".boot-state"))).catch(() => true);
      if (!isBoot) break;
      await page.waitForTimeout(500);
    }
    if (viewSelector) {
      await page.waitForSelector(viewSelector, { state: "visible", timeout: 30000 });
    }
    await page.waitForTimeout(400);

    if (fs.existsSync(targetFile)) {
      try { fs.unlinkSync(targetFile); } catch (_e) {}
    }
    await page.screenshot({
      path: targetFile,
      fullPage: false,
      animations: "disabled",
      timeout: 15000,
    });
    await page.waitForTimeout(300);

    for (const d of targetDirs) {
      const dest = path.join(d, fileName);
      if (dest !== targetFile) {
        fs.copyFileSync(targetFile, dest);
      }
    }

    const stats = fs.statSync(targetFile);
    const hash = crypto.createHash("md5").update(fs.readFileSync(targetFile)).digest("hex");

    capturedRegistry.push({
      fileName,
      view: viewName,
      mode: modeName,
      sizeBytes: stats.size,
      sizeKb: (stats.size / 1024).toFixed(1),
      md5: hash,
      path: targetFile,
      passSize: stats.size >= 40960,
    });

    console.log(
      `[Captured] ${fileName} (${viewName} ${modeName}): ${stats.size} bytes (${(stats.size / 1024).toFixed(1)} KB), MD5: ${hash}, >=40KB: ${stats.size >= 40960 ? "PASS" : "FAIL"}`
    );
  }

  const addAuthInitScript = (ctx) =>
    ctx.addInitScript(
      ({ ct, st, uid, pid }) => {
        localStorage.setItem("dente_clinic_token", ct);
        localStorage.setItem("dente_staff_token", st);
        localStorage.setItem("dente_active_role", "owner");
        localStorage.setItem("dente_theme_mode", "light");
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
            onboardingDismissed: true,
            onboardingStep: "done",
            version: 1,
          })
        );
        localStorage.setItem(
          "dental-crm:web-ui-preferences:v1",
          JSON.stringify({
            version: 1,
            uiLanguage: "ru",
            selectedWorkspaceRole: "owner",
            selectedPatientId: pid,
            onboardingDismissed: true,
            onboardingStep: "done",
          })
        );
        localStorage.setItem(
          "dente-workspace-profile",
          JSON.stringify({
            state: {
              clinicName: "Стоматология ДЕНТЕ Премиум",
              currentDoctor: { id: uid, fullName: "Д-р Воронов А. В.", role: "owner" },
              flags: { disableTour: true },
            },
          })
        );
      },
      {
        ct: auth.clinicToken,
        st: auth.staffToken,
        uid: auth.ownerUserId,
        pid: auth.patientId,
      }
    );

  // =========================================================================
  // 1. DESKTOP VIEWPORT (1440x900, Scale 2)
  // =========================================================================
  console.log("\n>>> STARTING DESKTOP SUITE (1440x900) <<<");
  const desktopContext = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    deviceScaleFactor: 2,
    isMobile: false,
    hasTouch: false,
  });
  await addAuthInitScript(desktopContext);
  const dPage = await desktopContext.newPage();
  await setupPageRoutes(dPage);

  await dPage.goto("http://127.0.0.1:5173/#schedule", { waitUntil: "domcontentloaded", timeout: 60000 });
  await dPage.waitForSelector(".boot-state", { state: "detached", timeout: 60000 });
  await dPage.waitForSelector(".app-shell", { state: "visible", timeout: 30000 });
  await dPage.waitForSelector(".schedule-filter-strip", { state: "visible", timeout: 30000 });
  await dPage.waitForTimeout(2000);

  // 1A. Schedule Desktop Light & Dark
  await configurePage(dPage, "light");
  await navigateView(dPage, "schedule", ".schedule-filter-strip");
  await takeProof(dPage, "01_schedule_desktop_light.png", "Schedule", "Desktop Light", ".schedule-filter-strip");

  await configurePage(dPage, "dark");
  await takeProof(dPage, "02_schedule_desktop_dark.png", "Schedule", "Desktop Dark", ".schedule-filter-strip");

  // 1B. Visit Desktop Light & Dark
  await navigateView(dPage, "visit", ".visit-monolithic-header, [data-testid=\"visit-header-monolith\"]");
  await configurePage(dPage, "light");
  await dPage.waitForSelector(".visit-monolithic-header, [data-testid=\"visit-header-monolith\"]", { state: "visible", timeout: 30000 });
  await dPage.waitForTimeout(1200);
  await takeProof(dPage, "05_visit_desktop_light.png", "Visit", "Desktop Light", ".visit-monolithic-header, [data-testid=\"visit-header-monolith\"]");

  await configurePage(dPage, "dark");
  await takeProof(dPage, "06_visit_desktop_dark.png", "Visit", "Desktop Dark", ".visit-monolithic-header, [data-testid=\"visit-header-monolith\"]");

  // 1B-2. Visit Diagnostics Tab Desktop Light & Dark
  const diagTabBtn = await dPage.$('[data-testid="visit-subtab-diagnostics"]');
  if (diagTabBtn) {
    console.log("Navigating to Diagnostics tab...");
    await diagTabBtn.click();
    await dPage.waitForTimeout(1000);
    await configurePage(dPage, "light");
    await takeProof(dPage, "visit_tab3_diagnostics_desktop_light.png", "Visit Diagnostics", "Desktop Light", '[data-testid="visit-diagnostics-tab"]');
    await configurePage(dPage, "dark");
    await takeProof(dPage, "visit_tab3_diagnostics_desktop_dark.png", "Visit Diagnostics", "Desktop Dark", '[data-testid="visit-diagnostics-tab"]');
    const emkTabBtn = await dPage.$('[data-testid="visit-subtab-emk"]');
    if (emkTabBtn) await emkTabBtn.click();
    await dPage.waitForTimeout(600);
  }

  // 1C. Patients Desktop Light & Dark
  await navigateView(dPage, "patients", ".patients-search-box, .patients-container");
  await configurePage(dPage, "light");
  await takeProof(dPage, "09_patients_desktop_light.png", "Patients", "Desktop Light", ".patients-search-box, .patients-container");

  await configurePage(dPage, "dark");
  await takeProof(dPage, "10_patients_desktop_dark.png", "Patients", "Desktop Dark", ".patients-search-box, .patients-container");

  // 1D. Finance Desktop Light & Dark
  await navigateView(dPage, "finance", ".finance-header-actions, .finance-panel, #finance");
  await configurePage(dPage, "light");
  await takeProof(dPage, "13_finance_desktop_light.png", "Finance", "Desktop Light", ".finance-header-actions, .finance-panel, #finance");

  await configurePage(dPage, "dark");
  await takeProof(dPage, "14_finance_desktop_dark.png", "Finance", "Desktop Dark", ".finance-header-actions, .finance-panel, #finance");

  // =========================================================================
  // 2. MOBILE VIEWPORT (390x844, Scale 2)
  // =========================================================================
  console.log("\n>>> STARTING MOBILE SUITE (390x844) <<<");
  const mobileContext = await browser.newContext({
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 2,
    isMobile: true,
    hasTouch: true,
  });
  await addAuthInitScript(mobileContext);
  const mPage = await mobileContext.newPage();
  await setupPageRoutes(mPage);

  await mPage.goto("http://127.0.0.1:5173/#schedule", { waitUntil: "domcontentloaded", timeout: 60000 });
  await mPage.waitForSelector(".boot-state", { state: "detached", timeout: 60000 });
  await mPage.waitForSelector(".app-shell", { state: "visible", timeout: 30000 });
  await mPage.waitForSelector(".schedule-filter-strip", { state: "visible", timeout: 30000 });
  await mPage.waitForTimeout(2000);

  // 2A. Schedule Mobile Light & Dark
  await configurePage(mPage, "light");
  await navigateView(mPage, "schedule", ".schedule-filter-strip");
  await takeProof(mPage, "03_schedule_mobile_light.png", "Schedule", "Mobile Light", ".schedule-filter-strip");

  await configurePage(mPage, "dark");
  await takeProof(mPage, "04_schedule_mobile_dark.png", "Schedule", "Mobile Dark", ".schedule-filter-strip");

  // 2B. Visit Mobile Light & Dark
  await navigateView(mPage, "visit", ".visit-monolithic-header, [data-testid=\"visit-header-monolith\"]");
  await configurePage(mPage, "light");
  await takeProof(mPage, "07_visit_mobile_light.png", "Visit", "Mobile Light", ".visit-monolithic-header, [data-testid=\"visit-header-monolith\"]");

  await configurePage(mPage, "dark");
  await takeProof(mPage, "08_visit_mobile_dark.png", "Visit", "Mobile Dark", ".visit-monolithic-header, [data-testid=\"visit-header-monolith\"]");

  // 2C. Patients Mobile Light & Dark
  await navigateView(mPage, "patients", ".patients-search-box, .patients-container");
  await configurePage(mPage, "light");
  await takeProof(mPage, "11_patients_mobile_light.png", "Patients", "Mobile Light", ".patients-search-box, .patients-container");

  await configurePage(mPage, "dark");
  await takeProof(mPage, "12_patients_mobile_dark.png", "Patients", "Mobile Dark", ".patients-search-box, .patients-container");

  // 2D. Finance Mobile Light & Dark
  await navigateView(mPage, "finance", ".finance-header-actions, .finance-panel, #finance");
  await configurePage(mPage, "light");
  await takeProof(mPage, "15_finance_mobile_light.png", "Finance", "Mobile Light", ".finance-header-actions, .finance-panel, #finance");

  await configurePage(mPage, "dark");
  await takeProof(mPage, "16_finance_mobile_dark.png", "Finance", "Mobile Dark", ".finance-header-actions, .finance-panel, #finance");

  await mobileContext.close();

  // =========================================================================
  // 3. THEME SWITCHER MODAL & ATMOSPHERIC THEMES (DESKTOP)
  // =========================================================================
  console.log("\n>>> STARTING ATMOSPHERIC THEMES SUITE <<<");
  await navigateView(dPage, "schedule", ".schedule-filter-strip");
  console.log("  -> Triggering Theme Switcher Modal via topbar button...");
  await dPage.evaluate(() => {
    window.dispatchEvent(new CustomEvent("dente:open-theme-switcher"));
  });
  await dPage.waitForSelector("#theme-modal-title", { state: "visible", timeout: 10000 });
  await takeProof(dPage, "17_theme_switcher_modal.png", "Theme Switcher Modal", "Desktop 10-Themes", "#theme-modal-title");

  // Close modal by clicking "Готово" or pressing Escape
  await dPage.evaluate(() => {
    const btn = Array.from(document.querySelectorAll("button")).find((b) => b.textContent?.includes("Готово"));
    if (btn) btn.click();
    else window.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" }));
  });
  await dPage.waitForSelector("#theme-modal-title", { state: "detached", timeout: 10000 }).catch(() => {});
  await dPage.waitForTimeout(600);

  // Atmospheric Themes on Schedule: Ocean, Cyber X-Ray, Emerald, Sakura, Warm Sand, Night
  await configurePage(dPage, "ocean");
  await navigateView(dPage, "schedule", ".schedule-filter-strip");
  await takeProof(dPage, "18_schedule_desktop_ocean.png", "Schedule", "Desktop Ocean", ".schedule-filter-strip");

  await configurePage(dPage, "cyber_xray");
  await navigateView(dPage, "schedule", ".schedule-filter-strip");
  await takeProof(dPage, "19_schedule_desktop_cyber_xray.png", "Schedule", "Desktop Cyber X-Ray", ".schedule-filter-strip");

  await configurePage(dPage, "emerald");
  await navigateView(dPage, "schedule", ".schedule-filter-strip");
  await takeProof(dPage, "20_schedule_desktop_emerald.png", "Schedule", "Desktop Emerald", ".schedule-filter-strip");

  await configurePage(dPage, "sakura");
  await navigateView(dPage, "schedule", ".schedule-filter-strip");
  await takeProof(dPage, "21_schedule_desktop_sakura.png", "Schedule", "Desktop Sakura", ".schedule-filter-strip");

  await configurePage(dPage, "warm_sand");
  await navigateView(dPage, "schedule", ".schedule-filter-strip");
  await takeProof(dPage, "22_schedule_desktop_warm_sand.png", "Schedule", "Desktop Warm Sand", ".schedule-filter-strip");

  await configurePage(dPage, "night");
  await navigateView(dPage, "schedule", ".schedule-filter-strip");
  await takeProof(dPage, "23_schedule_desktop_night.png", "Schedule", "Desktop Night OLED", ".schedule-filter-strip");

  await desktopContext.close();
  await browser.close();

  // Summary verification
  console.log("\n==================================================");
  console.log("INQUISITION LIVE SCREENSHOT CAPTURE AUDIT REPORT");
  console.log("==================================================");
  console.table(capturedRegistry);

  const hashes = new Set(capturedRegistry.map((r) => r.md5));
  const uniqueHashes = hashes.size === capturedRegistry.length;
  const allAbove40k = capturedRegistry.every((r) => r.sizeBytes >= 40960);

  console.log(`Total captured: ${capturedRegistry.length}/20`);
  console.log(`Unique MD5 hashes: ${uniqueHashes ? "YES (100% distinct screens)" : "FAIL"}`);
  console.log(`All files >= 40 KB: ${allAbove40k ? "PASS" : "FAIL"}`);

  if (!uniqueHashes || !allAbove40k || capturedRegistry.length < 20) {
    throw new Error("Screenshot inquisition verification failed criteria!");
  }
}

runInquisitionCapture().catch((err) => {
  console.error("Screenshot capture failed:", err);
  process.exit(1);
});
