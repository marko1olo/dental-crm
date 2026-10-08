/**
 * scripts/capture_visit_emk_inquisition.cjs
 *
 * Dedicated Playwright screenshot script for Red Team Inquisitor Epsilon:
 * Captures 5 required screenshots:
 * 1. visit_emk_tab_pc_light.png (1440x900 Desktop Light)
 * 2. visit_emk_tab_pc_dark.png (1440x900 Desktop Dark)
 * 3. visit_summary_modal_pc_light.png (1440x900 Modal Light)
 * 4. visit_summary_modal_pc_dark.png (1440x900 Modal Dark)
 * 5. visit_mobile_chairside_light.png (390x844 Mobile Light)
 *
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
    totalPlannedRub: 0,
    totalInvoicedRub: 0,
    totalPaidRub: 0,
    balanceRub: 0,
  },
};

async function main() {
  const primaryDir = path.resolve("C:/Clinic_MVP/dental-crm/docs/screenshots/visit_emk");
  const brainDir = path.resolve("C:/Users/Admin/.gemini/antigravity/brain/16ec73bb-a171-4b2a-af11-1186dc509b75");

  for (const dir of [primaryDir, brainDir]) {
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  }

  console.log("[Playwright] Launching Chrome executable...");
  const browser = await chromium.launch({
    headless: true,
    executablePath: "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
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
      localStorage.setItem("dente_clinic_token", "live-inquisition-clinic-token");
      localStorage.setItem("dente_staff_token", "live-inquisition-staff-token");
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
            currentDoctor: { id: "doc-1", fullName: "Д-р Воронов Алексей Владимирович", role: "owner" },
            flags: { disableTour: true },
          },
        })
      );
    });
  };

  const applyTheme = async (page, theme) => {
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

    // Copy to brain artifact dir
    const destBrain = path.join(brainDir, filename);
    fs.copyFileSync(destPrimary, destBrain);

    const stats = fs.statSync(destPrimary);
    const hash = crypto.createHash("md5").update(fs.readFileSync(destPrimary)).digest("hex");
    console.log(`[PROOF CAPTURED] ${filename}: ${stats.size} bytes (${(stats.size / 1024).toFixed(1)} KB), MD5=${hash}`);
  };

  // ==========================================
  // DESKTOP SUITE (1440x900)
  // ==========================================
  console.log("\n>>> STARTING DESKTOP CAPTURE (1440x900) <<<");
  const pcContext = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    deviceScaleFactor: 2,
    isMobile: false,
    hasTouch: false,
  });
  addAuthInitScript(pcContext);

  const pcPage = await pcContext.newPage();
  await setupPageRoutes(pcPage);

  // 1. First load schedule to seed stores
  await pcPage.goto("http://127.0.0.1:5173/#schedule", { waitUntil: "domcontentloaded", timeout: 60000 });
  await pcPage.waitForSelector(".boot-state", { state: "detached", timeout: 60000 });
  await pcPage.waitForSelector(".app-shell", { state: "visible", timeout: 30000 });
  await pcPage.waitForSelector(".schedule-filter-strip", { state: "visible", timeout: 30000 });
  await pcPage.waitForTimeout(1500);

  // 2. Navigate to visit view
  console.log("Navigating to Visit view...");
  await navigateView(pcPage, "visit", ".visit-monolithic-header, [data-testid=\"visit-header-monolith\"]");
  await pcPage.waitForTimeout(1200);

  // Ensure EMK subtab is active
  const emkSubtab = await pcPage.$('[data-testid="visit-subtab-emk"]');
  if (emkSubtab) {
    console.log("Activating EMK subtab...");
    await emkSubtab.click();
    await pcPage.waitForTimeout(800);
  }

  const inspectBtn = await pcPage.evaluate(() => {
    const btn = document.querySelector('[data-testid="btn-emk-complaints-norm"]');
    if (!btn) return { found: false, allBtns: Array.from(document.querySelectorAll("button")).slice(0, 20).map(b => b.outerHTML) };
    const cs = window.getComputedStyle(btn);
    return {
      found: true,
      className: btn.className,
      bg: cs.backgroundColor,
      border: cs.border,
      boxShadow: cs.boxShadow,
      color: cs.color,
      html: btn.outerHTML
    };
  });
  console.log(">>> INSPECT BTN RESULT:", JSON.stringify(inspectBtn, null, 2));

  // 1. visit_emk_tab_pc_light.png
  await applyTheme(pcPage, "light");
  await saveProof(pcPage, "visit_emk_tab_pc_light.png");

  // 2. visit_emk_tab_pc_dark.png
  console.log("Switching to Dark mode for Visit EMK tab...");
  await applyTheme(pcPage, "dark");
  await saveProof(pcPage, "visit_emk_tab_pc_dark.png");

  // 3. visit_summary_modal_pc_dark.png
  console.log("Navigating to Chairside POS VisitSummaryModal in Dark mode...");
  await pcPage.goto("http://127.0.0.1:5173/chairside_pos_preview.html?theme=dark", { waitUntil: "domcontentloaded", timeout: 30000 });
  await pcPage.waitForSelector('[data-testid="visit-summary-modal"], .visit-summary-modal, [role="dialog"]', { state: "visible", timeout: 15000 });
  await pcPage.waitForTimeout(1000);
  await saveProof(pcPage, "visit_summary_modal_pc_dark.png");

  // 4. visit_summary_modal_pc_light.png
  console.log("Switching to Light mode for Chairside POS VisitSummaryModal...");
  await pcPage.goto("http://127.0.0.1:5173/chairside_pos_preview.html?theme=light", { waitUntil: "domcontentloaded", timeout: 30000 });
  await pcPage.waitForSelector('[data-testid="visit-summary-modal"], .visit-summary-modal, [role="dialog"]', { state: "visible", timeout: 15000 });
  await pcPage.waitForTimeout(1000);
  await saveProof(pcPage, "visit_summary_modal_pc_light.png");
  await pcContext.close();

  // ==========================================
  // MOBILE SUITE (390x844)
  // ==========================================
  console.log("\n>>> STARTING MOBILE CAPTURE (390x844) <<<");
  const mobileContext = await browser.newContext({
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 2,
    isMobile: true,
    hasTouch: true,
  });
  addAuthInitScript(mobileContext);

  const mobPage = await mobileContext.newPage();
  await setupPageRoutes(mobPage);

  // 1. First load schedule
  await mobPage.goto("http://127.0.0.1:5173/#schedule", { waitUntil: "domcontentloaded", timeout: 60000 });
  await mobPage.waitForSelector(".boot-state", { state: "detached", timeout: 60000 });
  await mobPage.waitForSelector(".app-shell", { state: "visible", timeout: 30000 });
  await mobPage.waitForTimeout(1500);

  // 2. Navigate to visit view
  console.log("Navigating to Mobile Visit view...");
  await navigateView(mobPage, "visit", ".mobile-chairside-container, [data-testid=\"mobile-chairside-visit-workspace\"], .visit-monolithic-header");
  await applyTheme(mobPage, "light");
  await mobPage.waitForTimeout(1000);

  // 5. visit_mobile_chairside_light.png
  await saveProof(mobPage, "visit_mobile_chairside_light.png");

  await mobileContext.close();
  await browser.close();

  console.log("\n>>> ALL 5 SCREENSHOTS CAPTURED SUCCESSFULLY! <<<");
}

main().catch((err) => {
  console.error("FATAL ERROR in capture_visit_emk_inquisition:", err);
  process.exit(1);
});
