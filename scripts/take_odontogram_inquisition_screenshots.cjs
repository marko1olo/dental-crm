/**
 * scripts/take_odontogram_inquisition_screenshots.cjs
 *
 * Odontogram & Interactive Tooth Chart Red Team Live Screenshot Suite.
 * Mandate 8c: 4-State visual proof (1440x900 Desktop Light/Dark, 390x844 Mobile Light/Dark)
 * Mandate 8p: Zero cartoon emojis, high contrast, clean toolbars (32-36px).
 * Mandate 8b: Strictly <= 800 lines.
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
      hasPediatricMode: true,
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
      notes: "Бронхиальная астма, аллергия на лидокаин",
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
  ],
  patientInsights: [],
  recommendedActions: [],
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
  payments: [],
  billingSummary: {
    totalPlannedRub: 12500,
    totalDiscountRub: 0,
    totalPaidRub: 0,
    totalDueRub: 12500,
    taxDeductionEligibleRub: 12500,
    draftDocumentAmountRub: 0,
    openTreatmentItems: 1,
    unpaidDocuments: 1,
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

async function runOdontogramInquisition() {
  const artifactsDir = "C:/Users/Admin/.gemini/antigravity/brain/1bf10845-6db2-440d-8441-c66b02ce9b08";
  const docsDir = "C:/Clinic_MVP/dental-crm/docs/screenshots/odontogram_audit";

  for (const d of [artifactsDir, docsDir]) {
    if (!fs.existsSync(d)) fs.mkdirSync(d, { recursive: true });
  }

  const browser = await chromium.launch({
    headless: true,
    executablePath: "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });

  const registry = [];

  async function setupRoutes(page) {
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
          body: JSON.stringify({
            success: true,
            token: "live-inquisition-staff-token",
            user: { id: "doc-1", fullName: "Д-р Воронов Алексей Владимирович", role: "owner" },
          }),
        });
      }
      if (url.includes("/api/patients")) {
        return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(mockDashboard.patients) });
      }
      if (url.includes("/api/schedule")) {
        return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(mockDashboard.appointments) });
      }
      if (url.includes("/api/payments") || url.includes("/api/billing")) {
        return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(mockDashboard.payments) });
      }
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(url.includes("list") || url.includes("status") || url.includes("/scans") || url.includes("/xray") ? [] : {}),
      });
    });
  }

  function addInitStorage(context) {
    return context.addInitScript(() => {
      localStorage.setItem("dente_clinic_token", "odontogram-audit-token");
      localStorage.setItem("dente_staff_token", "odontogram-audit-staff-token");
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
            currentDoctor: { id: "doc-1", fullName: "Д-р Воронов А. В.", role: "owner" },
            flags: { disableTour: true, hasPediatricMode: true },
          },
        })
      );
    });
  }

  async function applyTheme(page, theme) {
    await page.evaluate((th) => {
      localStorage.setItem("dente_theme_mode", th);
      if (window.__useThemeStore) {
        window.__useThemeStore.getState().setThemeMode(th);
      }
      document.documentElement.setAttribute("data-theme", th);
      const isDark = ["dark", "night", "ocean", "emerald", "cyber_xray"].includes(th);
      document.documentElement.classList.toggle("dark", isDark);
      document.documentElement.classList.toggle("light", !isDark);
      document.documentElement.style.colorScheme = isDark ? "dark" : "light";
    }, theme);
    await page.waitForTimeout(600);
  }

  async function capture(page, fileName, description) {
    const filePath = path.join(docsDir, fileName);
    if (fs.existsSync(filePath)) {
      try { fs.unlinkSync(filePath); } catch {}
    }

    await page.screenshot({ path: filePath, fullPage: false, animations: "disabled" });

    // Copy to brain artifacts dir
    const artifactPath = path.join(artifactsDir, fileName);
    fs.copyFileSync(filePath, artifactPath);

    const stats = fs.statSync(filePath);
    const md5 = crypto.createHash("md5").update(fs.readFileSync(filePath)).digest("hex");

    registry.push({
      fileName,
      description,
      sizeBytes: stats.size,
      sizeKb: (stats.size / 1024).toFixed(1),
      md5,
      passSize: stats.size >= 40960,
    });

    console.log(`[Captured] ${fileName} (${stats.size} B / ${(stats.size / 1024).toFixed(1)} KB) - ${description}`);
  }

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

  // =========================================================================
  // 1. DESKTOP SUITE (1440x900)
  // =========================================================================
  console.log(">>> LAUNCHING DESKTOP VIEWPORT (1440x900) <<<");
  const desktopCtx = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    deviceScaleFactor: 2,
    isMobile: false,
    hasTouch: false,
  });
  await addInitStorage(desktopCtx);
  const dPage = await desktopCtx.newPage();
  await setupRoutes(dPage);

  await dPage.goto("http://127.0.0.1:5173/#schedule", { waitUntil: "domcontentloaded", timeout: 60000 });
  await dPage.waitForSelector(".boot-state", { state: "detached", timeout: 60000 }).catch(() => {});
  await dPage.waitForSelector(".app-shell", { state: "visible", timeout: 30000 });
  await dPage.waitForSelector(".schedule-filter-strip", { state: "visible", timeout: 30000 });
  await dPage.waitForTimeout(1500);

  // Navigate to Visit view
  console.log("Navigating to Visit view...");
  await navigateView(dPage, "visit", ".visit-monolithic-header, [data-testid=\"visit-header-monolith\"]");
  await dPage.waitForTimeout(1200);

  // Switch to Odontogram subtab
  console.log("Clicking [data-testid=\"visit-subtab-odontogram\"]...");
  await dPage.waitForSelector('[data-testid="visit-subtab-odontogram"]', { state: "visible", timeout: 15000 });
  await dPage.click('[data-testid="visit-subtab-odontogram"]');
  await dPage.waitForTimeout(1200);

  await dPage.waitForSelector('[data-testid="odontogram-view-container"]', { state: "visible", timeout: 15000 });
  await dPage.waitForTimeout(1500);

  // 1A. Anatomical Odontogram Desktop Light & Dark
  await applyTheme(dPage, "light");
  await capture(dPage, "01_odontogram_anatomical_desktop_light.png", "Desktop Light: Anatomical SVG Odontogram");

  await applyTheme(dPage, "dark");
  await capture(dPage, "02_odontogram_anatomical_desktop_dark.png", "Desktop Dark: Anatomical SVG Odontogram");

  // 1B. Switch to Classic GOST Mode
  console.log("Switching to Classic GOST mode...");
  const gostBtn = await dPage.$('[data-testid="odontogram-mode-btn-classic_gost"]');
  if (gostBtn) {
    await gostBtn.click();
    await dPage.waitForTimeout(1200);
    await applyTheme(dPage, "light");
    await capture(dPage, "03_odontogram_gost_grid_desktop_light.png", "Desktop Light: Classic GOST 043/u Table Grid");

    await applyTheme(dPage, "dark");
    await capture(dPage, "04_odontogram_gost_grid_desktop_dark.png", "Desktop Dark: Classic GOST 043/u Table Grid");
  }

  // Switch back to Anatomical for Radial Menu testing
  const anatBtn = await dPage.$('[data-testid="odontogram-mode-btn-anatomical_svg"]');
  if (anatBtn) {
    await anatBtn.click();
    await dPage.waitForTimeout(1000);
  }

  // 1C. Open ToothRadialMenu (click tooth 16)
  console.log("Opening ToothRadialMenu on Tooth 16...");
  const tooth16 = await dPage.$('[data-tooth-id="16"]');
  if (tooth16) {
    await tooth16.click();
    await dPage.waitForSelector('[data-testid="tooth-radial-menu-overlay"]', { state: "visible", timeout: 10000 });
    await dPage.waitForTimeout(800);

    await applyTheme(dPage, "light");
    await capture(dPage, "05_tooth_radial_menu_desktop_light.png", "Desktop Light: ToothRadialMenu Open on Tooth 16");

    await applyTheme(dPage, "dark");
    await capture(dPage, "06_tooth_radial_menu_desktop_dark.png", "Desktop Dark: ToothRadialMenu Open on Tooth 16");

    // Close radial menu via Escape
    await dPage.keyboard.press("Escape");
    await dPage.waitForTimeout(600);
  }

  // 1D. Open Live Invoice Modal (click "Смета" button)
  console.log("Opening Live Invoice Modal...");
  const estimatorBtn = await dPage.$('button:has-text("Смета")');
  if (estimatorBtn) {
    await estimatorBtn.click();
    await dPage.waitForSelector('[data-testid="odontogram-live-invoice"]', { state: "visible", timeout: 10000 });
    await dPage.waitForTimeout(800);

    await applyTheme(dPage, "light");
    await capture(dPage, "07_odontogram_live_invoice_modal_light.png", "Desktop Light: OdontogramLiveInvoice Modal (Order 804n)");

    await applyTheme(dPage, "dark");
    await capture(dPage, "08_odontogram_live_invoice_modal_dark.png", "Desktop Dark: OdontogramLiveInvoice Modal (Order 804n)");

    // Close live invoice
    const closeBtn = await dPage.$('[data-testid="odontogram-live-invoice"] button[aria-label="Закрыть"], [data-testid="odontogram-live-invoice"] button:has-text("✕"), [data-testid="odontogram-live-invoice"] button:has(svg)');
    if (closeBtn) await closeBtn.click();
    else await dPage.keyboard.press("Escape");
    await dPage.waitForTimeout(600);
  }

  // 1E. Open Pediatric Mixed Dentition Modal via More Menu
  console.log("Opening Pediatric Mixed Dentition Modal...");
  const moreMenuBtn = await dPage.$('[data-testid="odontogram-toolbar-more-menu-btn"]');
  if (moreMenuBtn) {
    await moreMenuBtn.click();
    await dPage.waitForTimeout(500);
    const pediatricBtn = await dPage.$('button:has-text("Сменный прикус")');
    if (pediatricBtn) {
      await pediatricBtn.click();
      await dPage.waitForSelector('#pediatric-modal-title', { state: "visible", timeout: 10000 });
      await dPage.waitForTimeout(800);

      await applyTheme(dPage, "light");
      await capture(dPage, "09_pediatric_mixed_dentition_modal_light.png", "Desktop Light: Pediatric Mixed Dentition Modal (Cariogram & Resorption)");

      await applyTheme(dPage, "dark");
      await capture(dPage, "10_pediatric_mixed_dentition_modal_dark.png", "Desktop Dark: Pediatric Mixed Dentition Modal (Cariogram & Resorption)");

      // Close pediatric modal
      await dPage.keyboard.press("Escape");
      await dPage.waitForTimeout(600);
    }
  }

  await desktopCtx.close();

  // =========================================================================
  // 2. MOBILE SUITE (390x844)
  // =========================================================================
  console.log("\n>>> LAUNCHING MOBILE VIEWPORT (390x844) <<<");
  const mobileCtx = await browser.newContext({
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 2,
    isMobile: true,
    hasTouch: true,
  });
  await addInitStorage(mobileCtx);
  const mPage = await mobileCtx.newPage();
  await setupRoutes(mPage);

  await mPage.goto("http://127.0.0.1:5173/#schedule", { waitUntil: "domcontentloaded", timeout: 60000 });
  await mPage.waitForSelector(".boot-state", { state: "detached", timeout: 60000 }).catch(() => {});
  await mPage.waitForSelector(".app-shell", { state: "visible", timeout: 30000 });
  await mPage.waitForSelector(".schedule-filter-strip", { state: "visible", timeout: 30000 });
  await mPage.waitForTimeout(1500);

  // Navigate to Visit view on mobile
  await navigateView(mPage, "visit", ".visit-monolithic-header, [data-testid=\"visit-header-monolith\"]");
  await mPage.waitForTimeout(1200);

  // Switch to Odontogram subtab on mobile
  await mPage.waitForSelector('[data-testid="visit-subtab-odontogram"]', { state: "visible", timeout: 15000 });
  await mPage.click('[data-testid="visit-subtab-odontogram"]');
  await mPage.waitForTimeout(1200);

  await mPage.waitForSelector('[data-testid="odontogram-view-container"]', { state: "visible", timeout: 15000 });
  await mPage.waitForTimeout(1200);

  // 2A. Mobile Odontogram Light & Dark
  await applyTheme(mPage, "light");
  await capture(mPage, "11_odontogram_mobile_light.png", "Mobile Light: Odontogram View");

  await applyTheme(mPage, "dark");
  await capture(mPage, "12_odontogram_mobile_dark.png", "Mobile Dark: Odontogram View");

  // 2B. Mobile Tooth Radial Menu (Bottom Sheet)
  console.log("Opening Tooth Bottom Sheet on mobile (Tooth 16)...");
  const mTooth16 = await mPage.$('[data-tooth-id="16"]');
  if (mTooth16) {
    await mTooth16.click();
    await mPage.waitForSelector('[data-testid="tooth-radial-menu-overlay"]', { state: "visible", timeout: 10000 });
    await mPage.waitForTimeout(800);

    await applyTheme(mPage, "light");
    await capture(mPage, "13_tooth_bottom_sheet_mobile_light.png", "Mobile Light: Tooth Radial Bottom Sheet Open");

    await applyTheme(mPage, "dark");
    await capture(mPage, "14_tooth_bottom_sheet_mobile_dark.png", "Mobile Dark: Tooth Radial Bottom Sheet Open");
  }

  await mobileCtx.close();
  await browser.close();

  console.log("\n==========================================");
  console.log("ODONTOGRAM INQUISITION SCREENSHOT AUDIT");
  console.log("==========================================");
  console.table(registry);
  console.log("All screenshots captured and mirrored to brain artifacts!");
}

runOdontogramInquisition().catch((err) => {
  console.error("Inquisition script failed:", err);
  process.exit(1);
});
