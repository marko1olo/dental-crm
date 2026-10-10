/**
 * scripts/capture_visit_diagnostics_live.cjs
 * Captures clean high-resolution live screenshots of VisitDiagnosticsTab
 * at 1440x900 (PC Light and Dark) via Playwright Edge/Chrome.
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
      notes: "Аллергия на латекс",
      administrativeProfile: "normal",
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
  activeVisit: {
    id: "app-2",
    patientId: "pat-1",
    doctorId: "doc-1",
    status: "in_treatment",
    diagnosisTooth: 16,
    anamnesis: "Жалобы на кратковременные боли от холодного и сладкого в области зуба 1.6",
    examination: "Зуб 16: глубокая кариозная полость на окклюзионно-дистальной поверхности. Зондирование болезненно по дну.",
    diagnosisIcd: "K02.1",
    treatmentPlan: "Диагностика, прицельный RVG-снимок, препарирование, медикаментозная обработка, пломбирование.",
  },
  visitCloseChecklist: {
    visitId: "app-2",
    readyToSign: false,
    score: 0,
    nextAction: "none",
    blockingItems: 0,
    items: [],
  },
  documents: [],
  imagingStudies: [
    {
      id: "study-rvg-16",
      patientId: "pat-1",
      title: "Прицельный снимок зуба 1.6",
      kind: "periapical",
      modality: "rvg",
      toothCode: "16",
      effectiveDoseMicrosv: 2,
      capturedAt: new Date().toISOString(),
      previewUrl: "/radiology/sample_rvg_tooth16.jpg",
      viewerUrl: "/radiology/sample_rvg_tooth16.jpg",
      status: "available",
    },
    {
      id: "study-rvg-36",
      patientId: "pat-1",
      title: "Периапикальный снимок 3.6",
      kind: "periapical",
      modality: "rvg",
      toothCode: "36",
      effectiveDoseMicrosv: 3,
      capturedAt: new Date(Date.now() - 86400000).toISOString(),
      previewUrl: "/radiology/sample_rvg_tooth36_periapical.jpg",
      viewerUrl: "/radiology/sample_rvg_tooth36_periapical.jpg",
      status: "available",
    },
    {
      id: "study-cbct-maxilla",
      patientId: "pat-1",
      title: "3D КЛКТ верхней челюсти",
      kind: "cbct",
      modality: "cbct_3d",
      toothCode: "16",
      effectiveDoseMicrosv: 42,
      capturedAt: new Date().toISOString(),
      previewUrl: "/radiology/sample_rvg_pathology.jpg",
      viewerUrl: "/radiology/sample_rvg_pathology.jpg",
      status: "available",
    },
    {
      id: "study-ceph-telerg",
      patientId: "pat-1",
      title: "ТРГ в боковой проекции",
      kind: "cephalometric",
      modality: "ceph",
      effectiveDoseMicrosv: 12,
      capturedAt: new Date(Date.now() - 172800000).toISOString(),
      previewUrl: "/radiology/sample_trg_cephalogram.jpg",
      viewerUrl: "/radiology/sample_trg_cephalogram.jpg",
      status: "available",
    },
  ],
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
    totalDiscountRub: 0,
    totalPaidRub: 0,
    totalDueRub: 0,
    taxDeductionEligibleRub: 0,
    draftDocumentAmountRub: 0,
    openTreatmentItems: 0,
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

async function main() {
  const targetDirs = [
    path.resolve("C:/Clinic_MVP/dental-crm/docs/screenshots/visit_tabs"),
    path.resolve("C:/Users/Admin/.gemini/antigravity/brain/9d29680f-5f92-41b2-8075-fb545edb680b"),
    path.resolve("C:/Clinic_MVP/dental-crm/docs/screenshots/inquisition_live"),
    path.resolve("C:/Clinic_MVP/dental-crm/apps/web/public/screenshots"),
  ];

  for (const d of targetDirs) {
    if (!fs.existsSync(d)) {
      fs.mkdirSync(d, { recursive: true });
    }
  }

  // Look for edge or chrome
  const edgePath = "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe";
  const chromePath = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
  const executablePath = fs.existsSync(edgePath) ? edgePath : chromePath;

  console.log(`[BROWSER] Launching browser: ${executablePath}`);
  const browser = await chromium.launch({
    headless: true,
    executablePath,
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });

  try {
    const ctx = await browser.newContext({
      viewport: { width: 1440, height: 900 },
      deviceScaleFactor: 2,
      isMobile: false,
      hasTouch: false,
    });

    await ctx.addInitScript(() => {
      localStorage.setItem("dente_clinic_token", "live-inquisition-clinic-token");
      localStorage.setItem("dente_staff_token", "live-inquisition-staff-token");
      localStorage.setItem("dente_active_role", "owner");
      localStorage.setItem("dente_tour_completed", "true");
      localStorage.setItem("dente_active_patient_id", "pat-1");
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
    });

    const page = await ctx.newPage();

    // Mock API
    await page.route("**/api/**", async (route) => {
      const url = route.request().url();
      if (url.includes("/src/")) return route.continue();
      if (url.includes("/api/dashboard")) {
        return route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify(mockDashboard),
        });
      }
      if (url.includes("/api/auth/session") || url.includes("/api/auth/user/me")) {
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
      if (url.includes("/api/patients")) {
        return route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify(mockDashboard.patients),
        });
      }
      if (url.includes("/api/schedule")) {
        return route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify(mockDashboard.appointments),
        });
      }
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(url.includes("list") || url.includes("status") || url.includes("/scans") || url.includes("/xray") ? [] : {}),
      });
    });

    console.log("[NAVIGATE] Opening http://127.0.0.1:5173/#visit");
    await page.goto("http://127.0.0.1:5173/#visit", { waitUntil: "domcontentloaded", timeout: 45000 });
    await page.waitForSelector(".boot-state", { state: "detached", timeout: 30000 }).catch(() => {});
    await page.waitForSelector(".app-shell", { state: "visible", timeout: 30000 });

    // Wait for visit header or visit panel
    console.log("[VISIT] Waiting for visit elements...");
    await page.waitForSelector(".visit-monolithic-header, [data-testid=\"visit-header-monolith\"], [data-testid=\"visit-subtab-diagnostics\"]", { state: "visible", timeout: 30000 }).catch(() => {});
    await page.waitForTimeout(1500);

    const bodyHtml = await page.evaluate(() => {
      const header = document.querySelector(".visit-monolithic-header, [data-testid=\"visit-header-monolith\"]");
      const emptyState = document.querySelector(".empty-state");
      const subtabs = document.querySelectorAll(".visit-subtab-btn");
      const buttons = Array.from(document.querySelectorAll("button")).map(b => b.textContent?.trim() || b.getAttribute("data-testid") || "").slice(0, 15);
      return {
        hasHeader: Boolean(header),
        hasEmptyState: Boolean(emptyState),
        emptyText: emptyState ? emptyState.textContent?.trim() : null,
        subtabCount: subtabs.length,
        subtabTexts: Array.from(subtabs).map(s => s.textContent?.trim()),
        firstButtons: buttons,
        currentHash: window.location.hash,
        title: document.title,
      };
    });
    console.log("[DEBUG INFO]", JSON.stringify(bodyHtml, null, 2));

    // Try finding Diagnostics button
    const diagBtn = await page.$('[data-testid="visit-subtab-diagnostics"]');
    if (!diagBtn) {
      console.log("[WARNING] diagBtn not found by data-testid. Looking for button with text 'Диагностика'...");
      const textBtn = await page.getByRole("button", { name: "Диагностика" }).first();
      if (await textBtn.count() > 0) {
        console.log("[FOUND] Found by text 'Диагностика'!");
        await textBtn.click();
      } else {
        await page.screenshot({ path: "C:/Clinic_MVP/dental-crm/scripts/debug_failed_visit.png" });
        throw new Error("Cannot find diagnostics tab button");
      }
    } else {
      console.log("[TAB] Clicking Diagnostics subtab...");
      await diagBtn.click();
    }
    await page.waitForTimeout(1000);

    // Wait for diagnostics tab contents
    await page.waitForSelector('[data-testid="visit-diagnostics-tab"]', { state: "visible", timeout: 20000 });
    console.log("[DIAGNOSTICS] Diagnostics tab loaded.");

    // Ensure attached scans gallery is present
    await page.waitForSelector('[data-testid="visit-diagnostics-attached-scans-gallery"]', {
      state: "visible",
      timeout: 10000,
    });
    await page.waitForTimeout(1500);

    // Apply Light Theme
    async function applyTheme(th) {
      console.log(`[THEME] Applying ${th}...`);
      await page.evaluate((theme) => {
        localStorage.setItem("dente_theme_mode", theme);
        if (window.__useThemeStore) {
          window.__useThemeStore.getState().setThemeMode(theme);
        }
        document.documentElement.setAttribute("data-theme", theme);
        const isDark = theme === "dark";
        document.documentElement.classList.toggle("dark", isDark);
        document.documentElement.classList.toggle("light", !isDark);
        document.body.classList.toggle("dark", isDark);
        document.body.classList.toggle("light", !isDark);
        document.documentElement.style.colorScheme = isDark ? "dark" : "light";
      }, th);
      await page.waitForTimeout(1200);
    }

    async function takeScreenshot(fileName, label) {
      const primaryPath = path.join(targetDirs[0], fileName);
      if (fs.existsSync(primaryPath)) {
        try { fs.unlinkSync(primaryPath); } catch {}
      }

      await page.screenshot({
        path: primaryPath,
        fullPage: false,
        animations: "disabled",
        timeout: 20000,
      });

      for (let i = 1; i < targetDirs.length; i++) {
        fs.copyFileSync(primaryPath, path.join(targetDirs[i], fileName));
      }

      const stat = fs.statSync(primaryPath);
      const hash = crypto.createHash("md5").update(fs.readFileSync(primaryPath)).digest("hex");
      console.log(`[CAPTURED] ${fileName} (${label}) — ${(stat.size / 1024).toFixed(1)} KB, MD5: ${hash}`);
      return { fileName, size: stat.size, hash };
    }

    // 1. Light Mode
    await applyTheme("light");
    const lightResult = await takeScreenshot("diagnostics_pc_light.png", "Visit Diagnostics PC Light");
    await takeScreenshot("visit_diagnostics_pc_light.png", "Visit Diagnostics PC Light (alias)");

    // 2. Dark Mode
    await applyTheme("dark");
    const darkResult = await takeScreenshot("diagnostics_pc_dark.png", "Visit Diagnostics PC Dark");
    await takeScreenshot("visit_diagnostics_pc_dark.png", "Visit Diagnostics PC Dark (alias)");

    // 3. Cockpit with Scan Loaded (Light & Dark)
    console.log("[SCAN LOAD] Clicking 'Показать демо-снимок'...");
    const demoBtn = await page.$('[data-testid="btn-load-demo-scan"]');
    if (demoBtn) {
      await demoBtn.click();
      await page.waitForTimeout(1000);
      await applyTheme("light");
      await takeScreenshot("diagnostics_cockpit_scan_light.png", "Visiograph Cockpit Scan Light");
      await applyTheme("dark");
      await takeScreenshot("diagnostics_cockpit_scan_dark.png", "Visiograph Cockpit Scan Dark");
    }

    console.log("=== CAPTURE COMPLETE ===");
    console.log(JSON.stringify({ lightResult, darkResult }, null, 2));
  } finally {
    await browser.close();
  }
}

main().catch((err) => {
  console.error("FATAL ERROR:", err);
  process.exit(1);
});
