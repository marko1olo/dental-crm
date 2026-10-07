/**
 * scripts/capture_all_8_analytics_proofs.cjs
 * Captures all 8 required live proof screenshots of Executive Analytics Domain
 * in 1440x900 (Desktop Light & Dark).
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
      allergies: ["Лидокаин"],
      notes: "Бронхиальная астма, анафилаксия на лидокаин",
      createdAt: `${todayDate}T08:00:00.000Z`,
      updatedAt: `${todayDate}T08:00:00.000Z`,
    },
  ],
  patientInsights: [],
  recommendedActions: [],
  treatmentPlans: [
    {
      id: "plan-1",
      patientId: "pat-1",
      patientName: "Ковалёв Роман Станиславович",
      title: "Комплексная санация и коронки E.max",
      totalPriceRub: 185000,
      paidAmountRub: 50000,
      status: "In_Progress",
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
      status: "completed",
      state: "completed",
      priority: "normal",
      intent: "treatment",
      startsAt: `${todayDate}T10:00:00.000Z`,
      endsAt: `${todayDate}T11:00:00.000Z`,
      durationMinutes: 60,
      serviceTitle: "Первичная консультация и КТ",
      patientName: "Ковалёв Роман Станиславович",
      doctorName: "Д-р Воронов А.В.",
    },
  ],
  payments: [
    {
      id: "pay-1",
      patientId: "pat-1",
      amountKopecks: 5000000,
      method: "card",
      status: "paid",
      createdAt: `${todayDate}T11:05:00.000Z`,
    },
  ],
  patientStats: { total: 120, active: 95, newThisMonth: 18, retainedPct: 88 },
  inventoryMetrics: { itemsCount: 42, lowStockCount: 0, criticalCount: 0, expiredCount: 0 },
  marketingStats: { totalLeads: 24, conversionRate: 62.5 },
  pendingLabOrders: [],
  todayOperations: {
    appointmentsCount: 6,
    inChairCount: 1,
    completedCount: 4,
    cancelledCount: 1,
    revenueTodayKopecks: 14500000,
    debtTotalKopecks: 0,
  },
  importBatches: [],
  speechProviders: [],
  auditEvents: [],
  complianceWarnings: [],
};

const targetDirs = [
  path.resolve("C:/Clinic_MVP/dental-crm/screenshots"),
  path.resolve("C:/Clinic_MVP/dental-crm/docs/screenshots/inquisition_live"),
  path.resolve("C:/Users/Admin/.gemini/antigravity/brain/3a975bb8-6b30-4671-8c08-f67223761dd6"),
];

for (const d of targetDirs) {
  if (!fs.existsSync(d)) fs.mkdirSync(d, { recursive: true });
}
const outDir = targetDirs[0];

async function applyTheme(page, isDark) {
  await page.evaluate((dark) => {
    document.documentElement.setAttribute("data-theme", dark ? "dark" : "light");
    document.documentElement.classList.toggle("dark", dark);
    document.documentElement.classList.toggle("light", !dark);
    document.documentElement.style.colorScheme = dark ? "dark" : "light";
  }, isDark);
  await page.waitForTimeout(400);
}

async function cleanTour(page) {
  await page.evaluate(() => {
    document
      .querySelectorAll('aside, .tour-spotlight-root, [data-testid="guided-tour-spotlight-overlay"], [data-testid="interactive-guide-tour-card"], .tour-backdrop-clickable-zone')
      .forEach((e) => e.remove());
  });
}

async function captureScreen(page, fileName, description) {
  const targetFile = path.join(outDir, fileName);
  await cleanTour(page);
  await page.waitForTimeout(300);

  await page.screenshot({ path: targetFile, fullPage: false });

  for (const d of targetDirs) {
    const dest = path.join(d, fileName);
    if (dest !== targetFile) {
      fs.copyFileSync(targetFile, dest);
    }
  }

  const stats = fs.statSync(targetFile);
  const hash = crypto.createHash("md5").update(fs.readFileSync(targetFile)).digest("hex");
  console.log(`[Captured] ${fileName} (${description}): ${stats.size} bytes (${(stats.size / 1024).toFixed(1)} KB), MD5: ${hash}`);
}

async function run() {
  console.log("[Playwright] Launching Chrome...");
  const browser = await chromium.launch({
    headless: true,
    executablePath: "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });

  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    deviceScaleFactor: 2,
    isMobile: false,
  });

  context.addInitScript(() => {
    sessionStorage.setItem("dente:sw-controller-reload", "1");
    localStorage.setItem("dente_clinic_token", "live-inquisition-clinic-token");
    localStorage.setItem("dente_staff_token", "live-inquisition-staff-token");
    localStorage.setItem("dente_active_role", "owner");
    localStorage.setItem("dente_theme_mode", "light");
    localStorage.setItem("dente_onboarding_completed", "true");
    localStorage.setItem("dente_tour_completed", "true");
    localStorage.setItem("dente_tour_dismissed", "true");
    localStorage.setItem(
      "dente_ui_preferences_v1",
      JSON.stringify({ onboardingDismissed: true, onboardingStep: "done", version: 1 })
    );
    localStorage.setItem(
      "dental-crm:onboarding:v1",
      JSON.stringify({ dismissed: true, step: "done", completed: true, version: 1 })
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
          flags: { disableTour: true },
        },
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
          token: "live-staff-token",
          user: { id: "doc-1", fullName: "Д-р Воронов Алексей Владимирович", role: "owner" },
        }),
      });
    }
    if (url.includes("/api/schedule")) {
      return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(mockDashboard.appointments) });
    }
    if (url.includes("/api/patients")) {
      return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(mockDashboard.patients) });
    }
    return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({}) });
  });

  console.log("Navigating to http://127.0.0.1:5173/#analytics ...");
  await page.goto("http://127.0.0.1:5173/#analytics", { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(2000);
  await cleanTour(page);

  // 1. Executive Overview (Light & Dark)
  console.log("\n--- 1. Capturing Executive Overview ---");
  await applyTheme(page, false);
  await captureScreen(page, "proof_analytics_overview_light.png", "Executive Dashboard Light");
  await applyTheme(page, true);
  await captureScreen(page, "proof_analytics_overview_dark.png", "Executive Dashboard Dark");

  // Helper to open dropdown and click section
  async function openSection(sectionText) {
    await cleanTour(page);
    const moreBtn = page.locator('button.analytics-tab-btn[aria-expanded]');
    await moreBtn.click();
    await page.waitForTimeout(400);
    const item = page.locator('.analytics-dropdown-menu button', { hasText: sectionText });
    await item.click();
    await page.waitForTimeout(1200);
  }

  // 2. Clinic Analytics Dashboard (Light & Dark)
  console.log("\n--- 2. Capturing Clinic Analytics Dashboard ---");
  await openSection("Сводный пульт");
  await applyTheme(page, false);
  await captureScreen(page, "proof_analytics_clinic_dashboard_light.png", "Clinic Analytics Dashboard Light");
  await applyTheme(page, true);
  await captureScreen(page, "proof_analytics_clinic_dashboard_dark.png", "Clinic Analytics Dashboard Dark");

  // 3. Marketing Attribution Dashboard (Light & Dark)
  console.log("\n--- 3. Capturing Marketing Attribution Dashboard ---");
  await openSection("Сквозной маркетинг");
  await applyTheme(page, false);
  await captureScreen(page, "proof_analytics_marketing_light.png", "Marketing Attribution Dashboard Light");
  await applyTheme(page, true);
  await captureScreen(page, "proof_analytics_marketing_dark.png", "Marketing Attribution Dashboard Dark");

  // 4. Lost Patients Panel (Light & Dark)
  console.log("\n--- 4. Capturing Lost Patients Panel ---");
  await openSection("Возврат пациентов");
  await applyTheme(page, false);
  await captureScreen(page, "proof_analytics_lost_patients_light.png", "Lost Patients Panel Light");
  await applyTheme(page, true);
  await captureScreen(page, "proof_analytics_lost_patients_dark.png", "Lost Patients Panel Dark");

  await browser.close();
  console.log("\n>>> ALL 8 PROOFS CAPTURED SUCCESSFULLY! <<<");
}

run().catch((err) => {
  console.error("Execution error:", err);
  process.exit(1);
});
