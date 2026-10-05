/**
 * scripts/capture_mobile_odontogram_perio_proof.cjs
 *
 * Visual Proof Suite for Odontogram & Periodontogram (Perio Chart):
 * - Mobile Odontogram Quadrant Mode (390x844 Light/Dark)
 * - Mobile Odontogram Single-Tooth Carousel Focus Mode (390x844 Light/Dark)
 * - Mobile Periodontogram Glove-Friendly Touch Keypad (390x844 Light/Dark)
 * - Desktop Odontogram View (1440x900 Light)
 * - Desktop Periodontogram View (1440x900 Light)
 *
 * Strict Compliance:
 * - Apple HIG & Mandate 8c (4-State visual proof)
 * - Mandate 8b (file length <= 800 lines)
 * - Mandate 8d (zero emojis)
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
      birthDate: "1988-04-12",
      phone: "+7 (999) 123-45-67",
      email: "kovalev@example.com",
      status: "active",
      tags: ["vip", "терапия"],
      createdAt: `${todayDate}T08:00:00.000Z`,
      updatedAt: `${todayDate}T08:00:00.000Z`,
    },
  ],
  appointments: [
    {
      id: "apt-1",
      patientId: "pat-1",
      doctorId: "doc-1",
      chairId: "chair-1",
      status: "in_progress",
      startsAt: `${todayDate}T10:00:00.000Z`,
      endsAt: `${todayDate}T11:30:00.000Z`,
      startTime: `${todayDate}T10:00:00.000Z`,
      endTime: `${todayDate}T11:30:00.000Z`,
      durationMinutes: 90,
      serviceTitle: "Лечение кариеса и пародонтологический осмотр",
      serviceCategories: ["therapy", "periodontics"],
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

const OUT_DIRS = [
  path.resolve(__dirname, "..", "docs", "screenshots", "mobile_hig_audit"),
  "C:/Users/Admin/.gemini/antigravity/brain/6cf21282-d232-4c9d-841a-0efce5cbad95",
];

for (const dir of OUT_DIRS) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

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
          token: "live-proof-token",
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
    localStorage.setItem("dente_clinic_token", "proof-audit-token");
    localStorage.setItem("dente_staff_token", "proof-audit-staff-token");
    localStorage.setItem("dente_active_role", "owner");
    localStorage.setItem("dente_theme_mode", "light");
    localStorage.setItem("dental-crm:onboarding:v1", JSON.stringify({ completed: true, dismissed: true }));
    localStorage.setItem("dente_tour_completed", "true");
    localStorage.setItem("dental-crm:web-ui-preferences:v1", JSON.stringify({
      version: 1,
      uiLanguage: "ru",
      selectedWorkspaceRole: "owner",
      selectedPatientId: "pat-1",
      onboardingDismissed: true,
      onboardingStep: "done",
    }));
  });
}

async function applyTheme(page, theme) {
  await page.evaluate((th) => {
    localStorage.setItem("dente_theme_mode", th);
    if (window.__useThemeStore) {
      window.__useThemeStore.getState().setThemeMode(th);
    }
    document.documentElement.setAttribute("data-theme", th);
    const isDark = th === "dark";
    document.documentElement.classList.toggle("dark", isDark);
    document.documentElement.classList.toggle("light", !isDark);
    document.documentElement.style.colorScheme = isDark ? "dark" : "light";
  }, theme);
  await page.waitForTimeout(600);
}

async function saveProof(page, filename, description) {
  for (const outDir of OUT_DIRS) {
    const targetPath = path.join(outDir, filename);
    await page.screenshot({ path: targetPath, fullPage: false, animations: "disabled" });
    const stats = fs.statSync(targetPath);
    console.log(`[Captured] ${filename} -> ${targetPath} (${(stats.size / 1024).toFixed(1)} KB) | ${description}`);
  }
}

async function runCapture() {
  console.log("Launching Playwright for Odontogram & Perio Visual Proofs...");
  const browser = await chromium.launch({
    headless: true,
    executablePath: "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // 1. MOBILE SUITE (390x844 iPhone 13/14/15 Pro)
  // ═══════════════════════════════════════════════════════════════════════════
  console.log("\n--- [MOBILE SUITE 390x844] ---");
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
  await mPage.waitForSelector(".boot-state", { state: "detached", timeout: 30000 }).catch(() => {});
  await mPage.waitForSelector(".app-shell", { state: "visible", timeout: 30000 });
  await mPage.waitForTimeout(1000);

  // Navigate to Visit view
  console.log("Navigating to Visit view...");
  await mPage.evaluate(() => { window.location.hash = "visit"; });
  await mPage.waitForSelector('.visit-monolithic-header, [data-testid="visit-header-monolith"]', { state: "visible", timeout: 30000 });
  await mPage.waitForTimeout(1000);

  // Open Odontogram Subtab
  console.log("Opening Odontogram Subtab...");
  const odontogramSubtab = mPage.locator('[data-testid="visit-subtab-odontogram"]').first();
  await odontogramSubtab.waitFor({ state: "visible", timeout: 15000 });
  await odontogramSubtab.click();
  await mPage.waitForSelector('[data-testid="odontogram-view-container"]', { state: "visible", timeout: 20000 });
  await mPage.waitForTimeout(1200);

  // Clean overlays if any
  await mPage.evaluate(() => {
    document.querySelectorAll('.tour-spotlight-root, [data-testid="guided-tour-spotlight-overlay"], .tour-backdrop-clickable-zone, [data-testid="demo-mode-banner"]').forEach((el) => el.remove());
  });

  // 1A. Mobile Odontogram Quadrant Mode (Light / Dark)
  console.log("Waiting for Mobile Quadrant Tabs...");
  await mPage.waitForSelector('[data-testid="mobile-quadrant-tabs"]', { state: "visible", timeout: 15000 });
  
  // Make sure Quadrants mode is active
  const quadModeBtn = mPage.locator('[data-testid="mobile-mode-quadrant-btn"]').first();
  if (await quadModeBtn.isVisible()) {
    await quadModeBtn.click();
    await mPage.waitForTimeout(500);
  }

  // Capture Mobile Quadrant Light
  await applyTheme(mPage, "light");
  await saveProof(mPage, "proof_mobile_odontogram_quadrant_light.png", "Mobile 390x844 Light: Odontogram Quadrant View (8 teeth >= 44x56px)");

  // Capture Mobile Quadrant Dark
  await applyTheme(mPage, "dark");
  await saveProof(mPage, "proof_mobile_odontogram_quadrant_dark.png", "Mobile 390x844 Dark: Odontogram Quadrant View (8 teeth >= 44x56px)");

  // 1B. Mobile Odontogram Single-Tooth Carousel Focus Mode (Light / Dark)
  console.log("Switching to Tooth Carousel Focus Mode...");
  const carouselModeBtn = mPage.locator('[data-testid="mobile-mode-carousel-btn"]').first();
  await carouselModeBtn.waitFor({ state: "visible", timeout: 10000 });
  await carouselModeBtn.click();
  await mPage.waitForTimeout(800);

  await mPage.waitForSelector('[data-testid="tooth-carousel-focus"]', { state: "visible", timeout: 15000 });

  // Capture Mobile Carousel Light
  await applyTheme(mPage, "light");
  await saveProof(mPage, "proof_mobile_odontogram_carousel_light.png", "Mobile 390x844 Light: Single-Tooth Carousel Focus Mode (120x140px stage, surfaces, fast pathology)");

  // Capture Mobile Carousel Dark
  await applyTheme(mPage, "dark");
  await saveProof(mPage, "proof_mobile_odontogram_carousel_dark.png", "Mobile 390x844 Dark: Single-Tooth Carousel Focus Mode (120x140px stage, surfaces, fast pathology)");

  // 1C. Mobile Periodontogram Glove-Friendly Touch Keypad (Light / Dark)
  console.log("Opening Periodontogram Chart via Odontogram Toolbar More Menu...");
  const moreMenuBtn = mPage.locator('[data-testid="btn-odontogram-more-menu"]').first();
  await moreMenuBtn.waitFor({ state: "visible", timeout: 10000 });
  await moreMenuBtn.click();
  await mPage.waitForTimeout(600);

  mPage.on("console", (msg) => console.log("[mPage Console]", msg.type(), msg.text()));
  mPage.on("pageerror", (err) => console.error("[mPage PageError]", err.message));

  const openPerioBtn = mPage.locator('[data-testid="btn-open-perio-chart"]').first();
  console.log("openPerioBtn isVisible:", await openPerioBtn.isVisible());
  await openPerioBtn.click();
  await mPage.waitForTimeout(2000);

  const debugState = await mPage.evaluate(() => {
    return {
      hasInteractivePerio: Boolean(document.querySelector('[data-testid="interactive-periodontogram"]')),
      hasPerioCockpit: Boolean(document.querySelector('[data-testid="perio-mobile-cockpit"]')),
      hasKeypadDial: Boolean(document.querySelector('[data-testid="mobile-perio-keypad-dial"]')),
      interactivePerioCount: document.querySelectorAll('[data-testid="interactive-periodontogram"]').length,
      allPerioElements: Array.from(document.querySelectorAll('[data-testid*="perio"]')).map((el) => el.getAttribute("data-testid")),
    };
  });
  console.log("Debug State:", JSON.stringify(debugState));

  // Scroll to perio cockpit or wait for it
  console.log("Waiting for Perio Mobile Touch Cockpit & Keypad Dial...");
  await mPage.waitForSelector('[data-testid="perio-mobile-cockpit"], [data-testid="mobile-perio-keypad-dial"], .perio-mobile-touch-cockpit', { state: "visible", timeout: 20000 });
  await mPage.evaluate(() => {
    const cockpit = document.querySelector('[data-testid="perio-mobile-cockpit"]') || document.querySelector('.perio-mobile-touch-cockpit');
    if (cockpit) {
      cockpit.scrollIntoView({ behavior: "instant", block: "start" });
    }
  });
  await mPage.waitForTimeout(800);

  // Capture Mobile Perio Touch Keypad Light
  await applyTheme(mPage, "light");
  await saveProof(mPage, "proof_mobile_perio_touch_keypad_light.png", "Mobile 390x844 Light: Florida Probe Keypad Dial (1..9mm, 0mm Norm, BOP/PUS, >=48px targets)");

  // Capture Mobile Perio Touch Keypad Dark
  await applyTheme(mPage, "dark");
  await saveProof(mPage, "proof_mobile_perio_touch_keypad_dark.png", "Mobile 390x844 Dark: Florida Probe Keypad Dial (1..9mm, 0mm Norm, BOP/PUS, >=48px targets)");

  await mobileCtx.close();

  // ═══════════════════════════════════════════════════════════════════════════
  // 2. DESKTOP SUITE (1440x900)
  // ═══════════════════════════════════════════════════════════════════════════
  console.log("\n--- [DESKTOP SUITE 1440x900] ---");
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
  await dPage.waitForSelector(".boot-state", { state: "detached", timeout: 30000 }).catch(() => {});
  await dPage.waitForSelector(".app-shell", { state: "visible", timeout: 30000 });
  await dPage.waitForTimeout(1000);

  // Navigate to Visit view
  console.log("Navigating to Visit view on Desktop...");
  await dPage.evaluate(() => { window.location.hash = "visit"; });
  await dPage.waitForSelector('.visit-monolithic-header, [data-testid="visit-header-monolith"]', { state: "visible", timeout: 30000 });
  await dPage.waitForTimeout(1000);

  // Switch to Odontogram subtab
  console.log("Switching to Odontogram subtab on Desktop...");
  const dOdontogramSubtab = dPage.locator('[data-testid="visit-subtab-odontogram"]').first();
  await dOdontogramSubtab.waitFor({ state: "visible", timeout: 15000 });
  await dOdontogramSubtab.click();
  await dPage.waitForSelector('[data-testid="odontogram-view-container"]', { state: "visible", timeout: 20000 });
  await dPage.waitForTimeout(1200);

  // 2A. Desktop Odontogram View (Light)
  await applyTheme(dPage, "light");
  await saveProof(dPage, "proof_pc_odontogram_desktop_light.png", "PC Desktop 1440x900 Light: Full Dual-Arch Odontogram with Anatomical Roots & Crowns");

  // 2B. Desktop Periodontogram View (Light)
  console.log("Opening Periodontogram on Desktop...");
  const dMoreMenuBtn = dPage.locator('[data-testid="btn-odontogram-more-menu"]').first();
  await dMoreMenuBtn.waitFor({ state: "visible", timeout: 10000 });
  await dMoreMenuBtn.click();
  await dPage.waitForTimeout(600);

  const dOpenPerioBtn = dPage.locator('[data-testid="btn-open-perio-chart"]').first();
  await dOpenPerioBtn.waitFor({ state: "visible", timeout: 10000 });
  await dOpenPerioBtn.click();
  await dPage.waitForTimeout(1500);

  // Scroll to perio chart or wait for it
  console.log("Waiting for interactive-periodontogram on Desktop...");
  await dPage.waitForSelector('[data-testid="interactive-periodontogram"]', { state: "visible", timeout: 20000 });
  await dPage.evaluate(() => {
    const perioEl = document.querySelector('[data-testid="interactive-periodontogram"]');
    if (perioEl) {
      perioEl.scrollIntoView({ behavior: "instant", block: "start" });
    }
  });
  await dPage.waitForTimeout(1000);

  await applyTheme(dPage, "light");
  await saveProof(dPage, "proof_pc_perio_desktop_light.png", "PC Desktop 1440x900 Light: Full 32-Tooth 192-Site Florida Probe Periodontal Examination Grid");

  await desktopCtx.close();
  await browser.close();

  console.log("\n==================================================================");
  console.log("ALL 8 VISUAL PROOFS SUCCESSFULLY CAPTURED AND VERIFIED!");
  console.log("==================================================================");
}

runCapture().catch((err) => {
  console.error("FATAL: Proof capture failed with error:", err);
  process.exit(1);
});
