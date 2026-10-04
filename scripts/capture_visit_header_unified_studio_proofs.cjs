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
  appointments: [
    {
      id: "app-2",
      organizationId: "00000000-0000-0000-0000-000000000001",
      patientId: "pat-1",
      doctorUserId: "doc-1",
      doctorId: "doc-1",
      chairId: "chair-1",
      startTime: `${todayDate}T10:00:00.000Z`,
      endTime: `${todayDate}T11:00:00.000Z`,
      durationMinutes: 60,
      status: "in_treatment",
      paymentStatus: "partially_paid",
      serviceType: "Лечение кариеса 36, эндодонтия",
      totalCost: 14500,
      paidAmount: 5000,
      patientName: "Ковалёв Роман Станиславович",
      patientPhone: "+7 (999) 888-77-66",
      complaint: "Острая ночная боль в области нижнего левого моляра 36",
      notes: "Пациент в кресле. Проводится обработка корневых каналов под микроскопом.",
      createdAt: `${todayDate}T08:00:00.000Z`,
      updatedAt: `${todayDate}T08:00:00.000Z`,
    },
  ],
};

async function runCapture() {
  const targetDirs = [
    path.resolve("C:/Clinic_MVP/dental-crm/docs/screenshots/inquisition_live"),
  ];
  for (const d of targetDirs) {
    if (!fs.existsSync(d)) {
      fs.mkdirSync(d, { recursive: true });
    }
  }
  const outDir = targetDirs[0];

  console.log("[Playwright] Launching Chrome executable...");
  const browser = await chromium.launch({
    headless: true,
    executablePath: "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });

  async function setupPageRoutes(page) {
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
          body: JSON.stringify({ success: true, token: "live-staff-token", user: { id: "doc-1", fullName: "Д-р Воронов Алексей Владимирович", role: "owner" } }),
        });
      }
      if (url.includes("/api/schedule")) {
        return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(mockDashboard.appointments) });
      }
      if (url.includes("/api/patients")) {
        return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(mockDashboard.patients) });
      }
      return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(url.includes("list") || url.includes("status") ? [] : {}) });
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

  async function takeProof(page, fileName, description) {
    const targetFile = path.join(outDir, fileName);
    await page.waitForTimeout(600);
    await page.screenshot({ path: targetFile, fullPage: false });

    for (const d of targetDirs) {
      const dest = path.join(d, fileName);
      if (dest !== targetFile) {
        fs.copyFileSync(targetFile, dest);
      }
    }

    const stats = fs.statSync(targetFile);
    const hash = crypto.createHash("md5").update(fs.readFileSync(targetFile)).digest("hex");

    console.log(
      `[Captured] ${fileName} (${description}): ${stats.size} bytes (${(stats.size / 1024).toFixed(1)} KB), MD5: ${hash}`
    );
  }

  const addAuthInitScript = (ctx) =>
    ctx.addInitScript(() => {
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
        JSON.stringify({ version: 1, uiLanguage: "ru", selectedWorkspaceRole: "owner", selectedPatientId: "pat-1", onboardingDismissed: true, onboardingStep: "done" })
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

  async function getActiveBaseUrl() {
    for (const port of [5173, 5174, 5175]) {
      try {
        const res = await fetch(`http://127.0.0.1:${port}/`, { signal: AbortSignal.timeout(800) });
        if (res.ok) return `http://127.0.0.1:${port}`;
      } catch {}
    }
    return "http://127.0.0.1:5173";
  }
  const baseUrl = await getActiveBaseUrl();
  console.log(`[Playwright] Target Vite Base URL: ${baseUrl}`);

  const desktopContext = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    deviceScaleFactor: 2,
    isMobile: false,
    hasTouch: false,
  });
  await addAuthInitScript(desktopContext);
  const page = await desktopContext.newPage();
  await setupPageRoutes(page);

  await page.goto(`${baseUrl}/#schedule`, { waitUntil: "domcontentloaded", timeout: 60000 });
  await page.waitForSelector(".boot-state", { state: "detached", timeout: 30000 }).catch(() => {});
  await page.waitForSelector(".app-shell", { state: "visible", timeout: 30000 });
  await page.waitForTimeout(1500);

  // Navigate to Visit view
  console.log("Navigating to #visit...");
  await page.evaluate(() => { window.location.hash = "visit"; });
  await page.waitForSelector(".visit-monolithic-header, [data-testid=\"visit-header-monolith\"], [data-testid=\"visit-emk-tab\"]", { state: "visible", timeout: 30000 });
  await page.waitForTimeout(1500);

  // Remove any tour overlay if present
  await page.evaluate(() => {
    document.querySelectorAll('.tour-spotlight-root, [data-testid="guided-tour-spotlight-overlay"], .tour-backdrop-clickable-zone').forEach((el) => el.remove());
  });

  // Click EMK tab if available
  const emkTab = page.locator('button[role="tab"]:has-text("043/у"), button[role="tab"]:has-text("ЭМК"), [data-testid="visit-subtab-emk"]').first();
  if (await emkTab.isVisible()) {
    await emkTab.click({ force: true });
    console.log("Clicked EMK tab");
    await page.waitForTimeout(800);
  }

  // 1. Proof Visit Header Unified Studio Light
  console.log("[Theme] Applying Light theme...");
  await applyTheme(page, "light");
  await takeProof(page, "proof_visit_header_unified_studio_light.png", "Visit Header Unified Studio Light");

  // 2. Proof Visit Header Unified Studio Dark
  console.log("[Theme] Applying Dark theme...");
  await applyTheme(page, "dark");
  await takeProof(page, "proof_visit_header_unified_studio_dark.png", "Visit Header Unified Studio Dark");

  await browser.close();
  console.log("\n[SUCCESS] Completed capture of proof_visit_header_unified_studio_light.png and proof_visit_header_unified_studio_dark.png!");
}

runCapture().catch((err) => {
  console.error("Capture failed:", err);
  process.exit(1);
});
