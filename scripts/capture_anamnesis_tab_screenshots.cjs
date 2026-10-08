/**
 * scripts/capture_anamnesis_tab_screenshots.cjs
 *
 * Dedicated Red Team Inquisitor Screenshot Capture for Clinical Anamnesis Tab:
 * - Order 834n / Form 043/u & Chairside Dentist Safety
 * - Captures:
 *   1. docs/screenshots/visit_tabs/anamnesis_pc_light.png (1440x900)
 *   2. docs/screenshots/visit_tabs/anamnesis_pc_dark.png (1440x900)
 * - Also mirrors to tab5_anamnesis_pc_light.png and tab5_anamnesis_pc_dark.png
 * - Enforces Anti-Blank Byte Guard (>= 20 KB floor).
 * - Single-purpose, autonomous (spawns Vite if not listening).
 */

const { chromium } = require("playwright");
const { spawn } = require("node:child_process");
const http = require("node:http");
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
      allergies: "Артикаин (Отёк Квинке), Пенициллины",
      somaticNotes: "Сахарный диабет 2 типа, компенсированный. Прием антикоагулянтов (Ксарелто).",
      concomitantDiseases: "ИБС, стенокардия напряжения I ФК",
      balanceRub: 0,
      balanceKopecks: 0,
      totalSpentRub: 45000,
      totalSpentKopecks: 4500000,
      gender: "male",
      createdAt: `${todayDate}T08:00:00.000Z`,
      updatedAt: `${todayDate}T08:00:00.000Z`,
    },
  ],
  appointments: [
    {
      id: "app-1",
      organizationId: "00000000-0000-0000-0000-000000000001",
      patientId: "pat-1",
      doctorId: "doc-1",
      chairId: "chair-1",
      status: "in_progress",
      priority: "normal",
      intent: "treatment",
      startsAt: `${todayDate}T09:00:00.000Z`,
      endsAt: `${todayDate}T10:00:00.000Z`,
      startTime: `${todayDate}T09:00:00.000Z`,
      endTime: `${todayDate}T10:00:00.000Z`,
      durationMinutes: 60,
      serviceTitle: "Лечение кариеса 4.6 • Форма 043/у",
      serviceCategories: ["therapy"],
      createdByUserId: "doc-1",
      createdAt: `${todayDate}T08:00:00.000Z`,
      updatedAt: `${todayDate}T08:00:00.000Z`,
      doctorUserId: "doc-1",
      patientName: "Ковалёв Роман Станиславович",
      doctorName: "Д-р Воронов Алексей Владимирович",
    },
  ],
  imagingStudies: [],
  appointmentReadiness: [],
  scheduleSuggestions: [],
  activeVisit: {
    id: "00000000-0000-0000-0000-000000000001",
    appointmentId: "app-1",
    patientId: "pat-1",
    doctorId: "doc-1",
    doctorUserId: "doc-1",
    status: "in_treatment",
  },
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

function checkPort(port, host = "127.0.0.1") {
  return new Promise((resolve) => {
    const req = http.get(`http://${host}:${port}/`, () => resolve(true));
    req.on("error", () => resolve(false));
    req.setTimeout(1000, () => {
      req.destroy();
      resolve(false);
    });
  });
}

async function waitForServer(url, timeoutMs = 25000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      const ok = await new Promise((res) => {
        const req = http.get(url, (response) => {
          res(response.statusCode >= 200 && response.statusCode < 400);
        });
        req.on("error", () => res(false));
        req.setTimeout(1000, () => {
          req.destroy();
          res(false);
        });
      });
      if (ok) return true;
    } catch {
      // retry
    }
    await new Promise((r) => setTimeout(r, 600));
  }
  throw new Error(`Server at ${url} did not become ready within ${timeoutMs}ms`);
}

async function main() {
  console.log("=== STARTING CLINICAL ANAMNESIS TAB SCREENSHOT PIPELINE ===");

  let viteProcess = null;
  const isViteLive = await checkPort(5173);

  if (!isViteLive) {
    console.log(">>> Vite server is not running on 5173. Spawning Vite dev server...");
    const viteBin = path.resolve(__dirname, "../node_modules/vite/bin/vite.js");
    const webDir = path.resolve(__dirname, "../apps/web");

    viteProcess = spawn("node", [viteBin, "--host", "127.0.0.1", "--port", "5173"], {
      cwd: webDir,
      stdio: "pipe",
      shell: true,
    });

    await waitForServer("http://127.0.0.1:5173/");
    console.log(">>> Vite dev server ready on http://127.0.0.1:5173/");
  } else {
    console.log(">>> Detected existing Vite server on port 5173.");
  }

  const primaryDir = path.resolve(__dirname, "../docs/screenshots/visit_tabs");
  const brainDir = path.resolve("C:/Users/Admin/.gemini/antigravity/brain/1e9f9e2c-56ab-4722-8c0e-7ca657fcadcb");
  const parentBrainDir = path.resolve("C:/Users/Admin/.gemini/antigravity/brain/f64e7778-5470-452e-8804-8aebe88a7027");

  for (const dir of [primaryDir, brainDir, parentBrainDir]) {
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  }

  const browser = await chromium.launch({
    channel: "msedge",
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-gpu", "--force-device-scale-factor=1"],
  }).catch(async () => {
    // Fallback to Chrome or default chromium
    const chromePath = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
    return chromium.launch({
      headless: true,
      executablePath: fs.existsSync(chromePath) ? chromePath : undefined,
      args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-gpu", "--force-device-scale-factor=1"],
    });
  });

  try {
    const pcContext = await browser.newContext({
      viewport: { width: 1440, height: 900 },
      deviceScaleFactor: 1,
      isMobile: false,
      hasTouch: false,
    });

    // Seed auth state
    await pcContext.addInitScript(() => {
      document.cookie = "dente_clinic_token=live-inquisition-clinic-token; path=/";
      document.cookie = "dente_staff_token=live-inquisition-staff-token; path=/";
      localStorage.setItem("dente_demo_showcase", "true");
      localStorage.setItem("dente_clinic_token", "live-inquisition-clinic-token");
      localStorage.setItem("dente_staff_token", "live-inquisition-staff-token");
      localStorage.setItem("dente_active_role", "owner");
      localStorage.setItem("dente_theme_mode", "light");
      localStorage.setItem("dente_onboarding_completed", "true");
      localStorage.setItem("dente_active_visit_id", "00000000-0000-0000-0000-000000000001");
      localStorage.setItem("dente_active_patient_id", "pat-1");
      localStorage.setItem("dente_active_appointment_id", "app-1");
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

    const pcPage = await pcContext.newPage();

    // Mock API requests
    await pcPage.route("**/api/**", async (route) => {
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

    console.log("Loading application schedule to seed stores...");
    await pcPage.goto("http://127.0.0.1:5173/#schedule", { waitUntil: "domcontentloaded", timeout: 60000 });
    await pcPage.waitForSelector(".boot-state", { state: "detached", timeout: 60000 }).catch(() => {});
    await pcPage.waitForSelector(".app-shell", { state: "visible", timeout: 30000 }).catch(() => {});
    await pcPage.waitForTimeout(1500);

    // Remove overlays
    await pcPage.evaluate(() => {
      document.querySelectorAll(".tour-spotlight-root, [data-testid=\"guided-tour-spotlight-overlay\"], .tour-backdrop-clickable-zone, .global-toast-container").forEach((el) => el.remove());
    });

    // Navigate to Visit view
    console.log("Navigating to Visit view...");
    await pcPage.evaluate(() => { window.location.hash = "visit"; });
    await pcPage.waitForTimeout(1500);

    // Check if visit header visible; if not, navigate directly to #visit
    let hasHeader = await pcPage.$(".visit-monolithic-header, [data-testid=\"visit-header-monolith\"]");
    if (!hasHeader) {
      console.log("Visit header not detected immediately. Trying #visit direct navigation...");
      await pcPage.goto("http://127.0.0.1:5173/#visit", { waitUntil: "domcontentloaded", timeout: 30000 });
      await pcPage.waitForTimeout(2000);
    }

    await pcPage.waitForSelector(".visit-monolithic-header, [data-testid=\"visit-header-monolith\"]", { state: "visible", timeout: 30000 });
    await pcPage.waitForTimeout(1000);

    // Switch to Anamnesis subtab
    console.log("Switching to Anamnesis tab...");
    const subtabBtn = await pcPage.waitForSelector('[data-testid="visit-subtab-anamnesis"]', { timeout: 10000 });
    await subtabBtn.click();
    await pcPage.waitForTimeout(1000);

    // Wait for anamnesis tab container
    await pcPage.waitForSelector('[data-testid="visit-anamnesis-tab"], .visit-anamnesis-tab', { state: "visible", timeout: 15000 });
    await pcPage.waitForTimeout(800);

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

    const saveProof = async (page, baseFilename, mirrorFilename) => {
      const primaryPath = path.join(primaryDir, baseFilename);
      await page.screenshot({ path: primaryPath, fullPage: false, animations: "disabled" });

      const stats = fs.statSync(primaryPath);
      if (stats.size < 20480) {
        throw new Error(`[ANTI-BLANK REJECTED] File ${baseFilename} is only ${stats.size} bytes (< 20 KB)!`);
      }

      // Mirror to mirrorFilename in primaryDir
      if (mirrorFilename) {
        fs.copyFileSync(primaryPath, path.join(primaryDir, mirrorFilename));
      }

      // Copy to brain artifact dirs
      for (const bDir of [brainDir, parentBrainDir]) {
        fs.copyFileSync(primaryPath, path.join(bDir, baseFilename));
        if (mirrorFilename) {
          fs.copyFileSync(primaryPath, path.join(bDir, mirrorFilename));
        }
      }

      const hash = crypto.createHash("md5").update(fs.readFileSync(primaryPath)).digest("hex");
      console.log(`[PROOF CAPTURED] ${baseFilename}: ${stats.size} bytes (${(stats.size / 1024).toFixed(1)} KB), MD5=${hash}`);
      return { filename: baseFilename, size: stats.size, md5: hash };
    };

    // 1. Capture Light Mode
    await applyTheme(pcPage, "light");
    await pcPage.waitForTimeout(500);
    const lightResult = await saveProof(pcPage, "anamnesis_pc_light.png", "tab5_anamnesis_pc_light.png");

    // 2. Capture Dark Mode
    await applyTheme(pcPage, "dark");
    await pcPage.waitForTimeout(500);
    const darkResult = await saveProof(pcPage, "anamnesis_pc_dark.png", "tab5_anamnesis_pc_dark.png");

    await pcContext.close();

    console.log("\n======================================================");
    console.log(">>> ANAMNESIS PROOFS CAPTURED SUCCESSFULLY (>= 20 KB)! <<<");
    console.log("======================================================");
    console.log(JSON.stringify([lightResult, darkResult], null, 2));
  } finally {
    await browser.close();
    if (viteProcess) {
      console.log(">>> Shutting down spawned Vite dev server...");
      viteProcess.kill();
    }
  }
}

main().catch((err) => {
  console.error("FATAL ERROR in capture_anamnesis_tab_screenshots:", err);
  process.exit(1);
});
