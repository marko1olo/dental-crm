/**
 * scripts/capture_live_crm_surgery_proofs.cjs
 * Captures LIVE DENTE CRM interface screenshots (1440x900) in PC Light and PC Dark:
 * - Live CRM Visit EMR with Extraction Cockpit
 * - Live CRM Visit EMR with Sinus Lift & GBR Cockpit
 * - Live CRM Visit EMR with Dental Implantation Cockpit
 * - Live CRM with Implant Passport Modal
 * - Live CRM with Periodontogram Chart Modal
 */

const { chromium } = require("playwright");
const path = require("node:path");
const fs = require("node:fs");

const todayDate = new Date().toLocaleDateString("en-CA");

const targetDirs = [
  path.resolve("docs/screenshots/surgery_live"),
  path.resolve("docs/screenshots/inquisition_live"),
];

for (const dir of targetDirs) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

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
        specialties: ["surgeon", "implantologist", "therapist"],
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
        name: "Кабинет 1 (Хирургия)",
        room: "1",
        defaultDoctorId: "doc-1",
        active: true,
        hasXraySensor: true,
        hasMicroscope: true,
        hasSurgeryKit: true,
      },
    ],
    integrationPresets: [],
    workspaceProfiles: [],
    roleAccessPolicies: [],
    modeHints: [],
    soloDoctorMode: false,
  },
  shiftIntelligence: {
    modeFit: { mode: "small_clinic", title: "Оптимальный режим", fitScore: 100, blockers: [], upgrades: [], lowFrictionNextStep: "ready" },
    doctorLoads: [], assistantLoads: [], chairLoads: [], roleQueues: [], scheduleWarnings: [],
  },
  patients: [
    {
      id: "pat-1",
      organizationId: "00000000-0000-0000-0000-000000000001",
      fullName: "Ковалёв Роман Станиславович",
      status: "active",
      birthDate: "1988-04-12",
      phone: "+7 (999) 888-77-66",
      notes: "Хирургический приём: удаление, остеопластика, дентальная имплантация.",
      allergies: [],
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
      chairId: "chair-1",
      startsAt: `${todayDate}T10:00:00.000Z`,
      endsAt: `${todayDate}T11:00:00.000Z`,
      status: "in_treatment",
      patientName: "Ковалёв Роман Станиславович",
      doctorName: "Д-р Воронов Алексей Владимирович",
      reason: "Хирургический прием: удаление, остеопластика, имплантация",
    },
  ],
  activeVisit: {
    id: "visit-1",
    appointmentId: "app-1",
    patientId: "pat-1",
    doctorId: "doc-1",
    chairId: "chair-1",
    diagnosisTooth: "48",
    status: "in_progress",
    date: todayDate,
  },
  documents: [],
  payments: [],
  billingSummary: { totalPlannedRub: 45000, totalPaidRub: 45000, totalDueRub: 0, draftDocumentAmountRub: 0, taxDeductionEligibleRub: 45000, openTreatmentItems: 1, unpaidDocuments: 0, totalDiscountRub: 0, familyBalanceRub: 0 },
  clinicalMetrics: { activeTreatmentPlans: 1, unscheduledFollowUps: 0, pendingInformedConsents: 0, prescriptionsIssuedThisMonth: 1, postVisitInstructions: 1 },
  importBatches: [], speechProviders: [], auditEvents: [], complianceWarnings: [],
};

async function captureLiveCrmSurgeryProofs() {
  console.log("[Playwright] Launching Chrome executable...");
  const browser = await chromium.launch({
    headless: true,
    executablePath: "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
    args: [
      "--no-sandbox",
      "--disable-setuid-sandbox",
      "--disable-dev-shm-usage",
      "--disable-gpu",
      "--js-flags=--max-old-space-size=1024",
    ],
  });

  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    deviceScaleFactor: 2,
    isMobile: false,
    hasTouch: false,
    serviceWorkers: "block",
  });

  await context.addInitScript(() => {
    try {
      Object.defineProperty(navigator, 'serviceWorker', { get: () => undefined });
    } catch {}
    sessionStorage.setItem("dente:sw-controller-reload", "1");
    localStorage.setItem("dente_clinic_token", "mock-clinic-token-12345");
    localStorage.setItem("dente_staff_token", "mock-staff-token-67890");
    localStorage.setItem("dente_active_user_id", "doc-1");
    localStorage.setItem("dente_active_role", "owner");
    localStorage.setItem("dente_active_mode", "clinic");
    sessionStorage.setItem("dente_unlocked", "true");
    localStorage.setItem("dente_theme_mode", "light");
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
    localStorage.setItem("dente_tour_completed", "true");
    localStorage.setItem(
      "dente_quest_progress_v2",
      JSON.stringify({
        activeTrackId: "solo_doctor",
        currentStepIndex: 0,
        completedStepIds: [],
        isTourActive: false,
        isDismissedPermanently: true,
        tracksProgress: {
          solo_doctor: { completed: true, completedStepIds: [] },
          reception_admin: { completed: true, completedStepIds: [] },
          imaging_diagnostics: { completed: true, completedStepIds: [] },
        },
      })
    );
    localStorage.setItem(
      "dental-crm:web-ui-preferences:v1",
      JSON.stringify({
        version: 1,
        uiLanguage: "ru",
        selectedWorkspaceRole: "owner",
        selectedPatientId: "pat-1",
        selectedSpecialty: "surgery",
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

    // Suppress tour spotlight overlay
    const injectTourStyle = () => {
      const style = document.createElement("style");
      style.id = "dente-tour-suppress";
      style.textContent = `
        .tour-spotlight-root, [data-testid="guided-tour-spotlight-overlay"], .tour-backdrop-clickable-zone, [data-testid="guided-tour-coach-mark-card"], [data-testid="guided-tour-pulsing-halo-anchor"] {
          display: none !important;
          pointer-events: none !important;
        }
      `;
      if (document.head) {
        document.head.appendChild(style);
      } else {
        document.addEventListener("DOMContentLoaded", () => document.head.appendChild(style));
      }
    };
    injectTourStyle();
  });

  const page = await context.newPage();

  page.on("pageerror", (err) => console.log("[PAGE ERROR]", err.message, err.stack));
  page.on("console", (msg) => {
    if (msg.type() === "error") console.log("[BROWSER ERROR]", msg.text());
  });

  // API interception
  await page.route("**/api/**", async (route) => {
    const url = route.request().url();
    if (url.includes("/src/")) return route.continue();
    if (url.includes("/api/dashboard")) return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(mockDashboard) });
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
          token: "mock-staff-token-67890",
          user: { id: "doc-1", fullName: "Д-р Воронов Алексей Владимирович", role: "owner" },
        }),
      });
    }
    if (url.includes("/api/patients/pat-1/tooth-states")) {
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ success: true, toothStates: { "48": "ExtractionIndicated", "46": "Absent", "16": "Healthy" } }),
      });
    }
    if (url.includes("/api/patients/pat-1/treatment-plans")) {
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ success: true, plans: [] }),
      });
    }
    if (url.includes("/draft/autosave")) {
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ success: true, savedAt: new Date().toISOString() }),
      });
    }
    if (url.includes("/api/templates")) {
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ success: true, templates: [] }),
      });
    }
    if (url.includes("/api/clinical/804n") || url.includes("/api/clinical/icd10")) {
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify([]),
      });
    }
    if (url.includes("/api/patients")) return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(mockDashboard.patients) });
    if (url.includes("/api/schedule")) return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(mockDashboard.appointments) });
    return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify([]) });
  });

  async function applyTheme(th) {
    await page.evaluate((t) => {
      localStorage.setItem("dente_theme_mode", t);
      if (window.__useThemeStore) {
        window.__useThemeStore.getState().setThemeMode(t);
      }
      document.documentElement.setAttribute("data-theme", t);
      const isDark = ["dark", "night", "ocean", "emerald", "cyber_xray"].includes(t);
      document.documentElement.classList.toggle("dark", isDark);
      document.documentElement.classList.toggle("light", !isDark);
      document.documentElement.style.colorScheme = isDark ? "dark" : "light";
    }, th);
    await page.waitForTimeout(600);
  }

  async function saveProof(filename) {
    for (const dir of targetDirs) {
      const targetPath = path.join(dir, filename);
      await page.screenshot({ path: targetPath, fullPage: false });
      console.log(`[Captured] ${targetPath}`);
    }
  }

  console.log("Navigating to http://127.0.0.1:5173/#schedule...");
  await page.goto("http://127.0.0.1:5173/#schedule", { waitUntil: "domcontentloaded", timeout: 60000 });
  await page.waitForSelector(".boot-state", { state: "detached", timeout: 60000 }).catch(() => {});
  await page.waitForSelector(".app-shell", { state: "visible", timeout: 30000 });
  await page.waitForTimeout(1000);

  // Switch to visit view
  console.log("Switching to visit view...");
  await page.evaluate(() => {
    if (window.__usePatientStore) window.__usePatientStore.getState().setSelectedPatientId("pat-1");
    if (window.__useVisitStore) window.__useVisitStore.getState().setSelectedSpecialty("surgeon");
    if (window.__useAppStore) window.__useAppStore.getState().setCurrentView("visit");
    window.location.hash = "visit";
  });

  // Wait for visit panel to mount
  console.log("Waiting for visit view to mount...");
  await page.locator('[data-testid="visit-view"], .visit-monolithic-header').first().waitFor({ state: "visible", timeout: 40000 });
  console.log("Visit view mounted!");

  // Dismiss any tour/onboarding modal if present
  const dismissBtn = page.locator('button:has-text("Понятно"), button:has-text("Пропустить"), [data-testid="btn-dismiss-notice"]');
  if (await dismissBtn.isVisible()) {
    await dismissBtn.click({ force: true }).catch(() => {});
    await page.waitForTimeout(400);
  }

  // Wait for specialty focus bar to be visible
  console.log("Waiting for visit-specialty-focus...");
  await page.locator('[data-testid="visit-specialty-focus"]').waitFor({ state: "visible", timeout: 25000 });

  // Open Specialty Protocol Drawer
  console.log("Opening specialty protocol drawer...");
  const protocolToggleBtn = page.locator('[data-testid="toggle-specialty-protocol-drawer"]');
  await protocolToggleBtn.waitFor({ state: "visible", timeout: 15000 });
  const drawer = page.locator('[data-testid="specialty-protocol-drawer"]');
  if (!(await drawer.isVisible())) {
    await protocolToggleBtn.click({ force: true });
    await drawer.waitFor({ state: "visible", timeout: 15000 });
  }
  console.log("Specialty protocol drawer is open!");

  const themes = ["light", "dark"];

  for (const theme of themes) {
    console.log(`\n=== PROCESSING THEME: ${theme.toUpperCase()} ===`);
    await applyTheme(theme);
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.waitForTimeout(400);

    // Ensure protocol drawer is open
    const drawer = page.locator('[data-testid="specialty-protocol-drawer"]');
    if (!(await drawer.isVisible())) {
      const toggle = page.locator('[data-testid="toggle-specialty-protocol-drawer"]');
      await toggle.click({ force: true });
      await drawer.waitFor({ state: "visible", timeout: 15000 });
    }

    // 1. EXTRACTION COCKPIT
    console.log(`Capturing live extraction protocol in ${theme}...`);
    const extractionNormBtn = page.locator('[data-testid="btn-surgery-norm-surgery_extraction_simple"]');
    await extractionNormBtn.waitFor({ state: "visible", timeout: 15000 });
    await extractionNormBtn.click({ force: true });
    await page.locator('[data-testid="visit-surgery-extraction-bar"]').waitFor({ state: "visible", timeout: 15000 });
    await page.waitForTimeout(600);
    await saveProof(`live_crm_surgery_extraction_${theme}.png`);

    // 2. SINUS LIFT & GBR COCKPIT
    console.log(`Capturing live sinus/GBR protocol in ${theme}...`);
    const sinusNormBtn = page.locator('[data-testid="btn-surgery-norm-surgery_sinus_lift_gbr"]');
    await sinusNormBtn.waitFor({ state: "visible", timeout: 15000 });
    await sinusNormBtn.click({ force: true });
    await page.locator('[data-testid="visit-surgery-sinus-gbr-bar"]').waitFor({ state: "visible", timeout: 15000 });
    await page.waitForTimeout(600);
    await saveProof(`live_crm_surgery_sinus_gbr_${theme}.png`);

    // 3. DENTAL IMPLANTATION COCKPIT
    console.log(`Capturing live implant protocol in ${theme}...`);
    const implantNormBtn = page.locator('[data-testid="btn-surgery-norm-surgery_implant_standard"]');
    await implantNormBtn.waitFor({ state: "visible", timeout: 15000 });
    await implantNormBtn.click({ force: true });
    await page.locator('[data-testid="visit-surgery-implant-bar"]').waitFor({ state: "visible", timeout: 15000 });
    await page.waitForTimeout(600);
    await saveProof(`live_crm_surgery_implant_${theme}.png`);

    // 4. IMPLANT PASSPORT MODAL
    console.log(`Capturing live implant passport modal in ${theme}...`);
    const openPassportBtn = page.locator('[data-testid="btn-open-implant-passport-modal"]');
    await openPassportBtn.waitFor({ state: "visible", timeout: 15000 });
    await openPassportBtn.click({ force: true });
    await page.locator('.implant-passport-card-container, [data-testid="tab-content-passport"], .implant-passport-modal').waitFor({ state: "visible", timeout: 15000 });
    
    // Switch to passport tab
    const passportTabBtn = page.locator('[data-testid="implant-tab-passport"]');
    if (await passportTabBtn.isVisible()) {
      await passportTabBtn.click({ force: true });
      await page.waitForTimeout(400);
    }
    await page.waitForTimeout(600);
    await saveProof(`live_crm_implant_passport_modal_${theme}.png`);

    // Close implant passport modal
    console.log(`Closing implant passport modal in ${theme}...`);
    const closePassportBtn = page.locator('button[aria-label="Закрыть окно паспорта"], [data-testid*="btn-close-implant-passport"], button[aria-label="Закрыть модальное окно"]').first();
    if (await closePassportBtn.isVisible()) {
      await closePassportBtn.click({ force: true });
    }
    await page.keyboard.press("Escape").catch(() => {});
    await page.waitForTimeout(600);

    // 5. PERIODONTOGRAM MODAL
    console.log(`Capturing live periodontogram modal in ${theme}...`);
    // Ensure Odontogram subtab is active (where VisitDiarySection is mounted)
    const odontoSubtab = page.locator('[data-testid="visit-subtab-odontogram"]');
    if (await odontoSubtab.isVisible()) {
      await odontoSubtab.click({ force: true });
      await page.waitForTimeout(500);
    }
    const moreMenuBtn = page.locator('[data-testid="diary-more-actions-btn"]').first();
    await moreMenuBtn.scrollIntoViewIfNeeded();
    await moreMenuBtn.waitFor({ state: "visible", timeout: 15000 });
    await moreMenuBtn.click({ force: true });
    await page.waitForTimeout(400);
    const perioMenuOption = page.locator('[data-testid="open-tier3-perio-btn"]').first();
    await perioMenuOption.waitFor({ state: "visible", timeout: 10000 });
    await perioMenuOption.click({ force: true });
    await page.locator('div[role="dialog"][aria-label="Кабинет врача-пародонтолога"]').waitFor({ state: "visible", timeout: 15000 });
    await page.waitForTimeout(600);
    await saveProof(`live_crm_periodontogram_chart_${theme}.png`);

    // Close perio modal
    console.log(`Closing perio modal in ${theme}...`);
    const closePerioBtn = page.locator('button[aria-label="Закрыть кабинет пародонтологии"], button[title="Закрыть кабинет пародонтологии"]').first();
    if (await closePerioBtn.isVisible()) {
      await closePerioBtn.click({ force: true });
    }
    await page.keyboard.press("Escape").catch(() => {});
    await page.waitForTimeout(600);
    await page.evaluate(() => window.scrollTo(0, 0));
  }

  await browser.close();
  console.log("\n[SUCCESS] Live CRM surgery screenshots captured successfully!");
}

captureLiveCrmSurgeryProofs().catch((err) => {
  console.error("Live CRM capture failed:", err);
  process.exit(1);
});
