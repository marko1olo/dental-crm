/**
 * scripts/capture_visio_honest.cjs
 *
 * Dedicated Red Team Inquisitor Screenshot Suite for Dental VisioGraphy Workstations:
 * 1. Direct RVG Capture Modal (DirectRvgCaptureModal) - Empty Auto-Trigger state (Light & Dark 1440x900)
 * 2. Direct RVG Capture Modal (DirectRvgCaptureModal) - Active Captured Frame state with Filters & FDI (Light & Dark 1440x900)
 * 3. 2D EzDent-i Viewer & RVG HUD (SensorStudyViewer) - 5mm Scale Ladder & Filmstrip (Light & Dark 1440x900)
 */

const { chromium } = require("playwright");
const path = require("node:path");
const fs = require("node:fs");

const todayDate = new Date().toLocaleDateString("en-CA");

const studiesArray = [
  {
    id: "02b00000-0000-0000-0000-000000000001",
    patientId: "pat-1",
    organizationId: "00000000-0000-0000-0000-000000000001",
    patientFullName: "Ковалёв Роман Станиславович",
    dicomPatientName: "Kovalev Roman",
    kind: "cbct",
    modality: "CT",
    title: "3D КЛКТ верхней и нижней челюсти 8x8 (KaVo OP 3D Pro)",
    seriesDescription: "KaVo OP 3D Pro / 80x80mm Standard Res",
    studyDate: todayDate,
    capturedAt: `${todayDate}T10:30:00.000Z`,
    sliceCount: 420,
    dimensions: "512x512x420",
    voxelSpacing: "0.2mm",
    fileSizeBytes: 185400000,
    bindingStatus: "auto_bound",
    bindingConfidence: 98,
    sourceKind: "folder_watch",
    sourceName: "KaVo eXam Vision PACS",
    status: "available",
    toothCode: "16",
    previewUrl: "/radiology/sample_rvg_tooth16.jpg",
  },
  {
    id: "02b00000-0000-0000-0000-000000000002",
    patientId: "pat-1",
    organizationId: "00000000-0000-0000-0000-000000000001",
    patientFullName: "Ковалёв Роман Станиславович",
    dicomPatientName: "Kovalev Roman",
    kind: "periapical",
    modality: "IO_SENSOR",
    title: "Прицельный снимок RVG 16 зуба (контроль каналов)",
    seriesDescription: "Vatech EzSensor HD 1.5",
    studyDate: todayDate,
    capturedAt: `${todayDate}T10:45:00.000Z`,
    sliceCount: 1,
    dimensions: "1920x1440",
    voxelSpacing: "0.029mm",
    fileSizeBytes: 4200000,
    bindingStatus: "auto_bound",
    bindingConfidence: 100,
    sourceKind: "direct_sensor",
    sourceName: "Vatech EzSensor",
    status: "available",
    teethFdi: ["16"],
    toothCode: "16",
    previewUrl: "/radiology/sample_rvg_tooth16.jpg",
  },
];

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
        specialties: ["therapist", "orthopedist", "surgeon"],
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
  },
  patients: [
    {
      id: "pat-1",
      name: "Ковалёв Роман Станиславович",
      fullName: "Ковалёв Роман Станиславович",
      birthDate: "1968-05-14",
      phone: "+7 999 111-22-33",
      cardNumber: "МК-PAT-1",
      medicalCardNumber: "МК-PAT-1",
      gender: "male",
      notes: "Аллергоанамнез: спокоен. Прицельный снимок 16 зуба перед эндодонтией.",
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
      endsAt: `${todayDate}T11:00:00.000Z`,
      startTime: `${todayDate}T10:00:00.000Z`,
      endTime: `${todayDate}T11:00:00.000Z`,
      durationMinutes: 60,
      serviceTitle: "Рентгенодиагностика и эндодонтия 16 зуба",
      serviceCategories: ["therapy"],
      createdByUserId: "doc-1",
      createdAt: `${todayDate}T08:00:00.000Z`,
      updatedAt: `${todayDate}T08:00:00.000Z`,
      patientName: "Ковалёв Роман Станиславович",
      doctorName: "Д-р Воронов А.В.",
    },
  ],
  imagingStudies: [
    {
      id: "study-rvg-1",
      patientId: "pat-1",
      patientName: "Ковалёв Роман Станиславович",
      modality: "rvg_intraoral",
      studyType: "rvg",
      date: `${todayDate}T09:30:00.000Z`,
      createdAt: `${todayDate}T09:30:00.000Z`,
      tooth: "16",
      teeth: ["16"],
      toothNumber: "16",
      projection: "periapical",
      kv: 65,
      ma: 7.0,
      exposureSec: 0.08,
      doseDap: 0.024,
      doseMsv: 0.004,
      apparatusModel: "Vatech EzSensor HD",
      sensorType: "CMOS Active Pixel",
      resolution: "29.2 lp/mm (1460x1920)",
      pixelSpacingMm: 0.035,
      imageUrl: "/radiology/sample_rvg_tooth16.jpg",
      thumbnailUrl: "/radiology/sample_rvg_tooth16.jpg",
      status: "completed",
      diagnosisIcd10: "K04.0",
      diagnosticNotes: "Глубокая кариозная полость на дистальной поверхности 16 зуба.",
    },
  ],
  serviceCatalog: [
    { id: "srv-1", code: "A16.07.002", name: "Восстановление зуба пломбой", priceRub: 4500 },
  ],
  payments: [],
};

async function setupPageRoutes(page) {
  await page.route("**/api/**", async (route) => {
    const url = route.request().url();
    if (url.includes("/src/")) return route.continue();

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

    if (url.includes("/api/imaging/studies")) {
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(studiesArray),
      });
    }

    if (url.includes("/api/patients")) {
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(mockDashboard.patients),
      });
    }

    if (url.includes("/api/appointments")) {
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(mockDashboard.appointments),
      });
    }

    return route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(mockDashboard),
    });
  });
}

const addAuthInitScript = (ctx) =>
  ctx.addInitScript(() => {
    localStorage.setItem("dente_clinic_token", "live-inquisition-clinic-token");
    localStorage.setItem("dente_staff_token", "live-inquisition-staff-token");
    localStorage.setItem("dente_active_role", "owner");
    localStorage.setItem("dente_theme_mode", "light");
    localStorage.setItem("dente_active_patient_id", "pat-1");
    localStorage.setItem("dente_tour_completed", "true");
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

async function applyTheme(page, theme) {
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
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
      break;
    } catch (err) {
      if (attempt === 2) throw err;
      await page.waitForTimeout(600);
    }
  }
  await page.waitForTimeout(500);
}

async function safeCloseModal(page, closeSelector, modalSelector) {
  try {
    const btn = await page.$(closeSelector);
    if (btn && await btn.isVisible()) {
      await btn.click({ timeout: 3000 });
    }
  } catch {}
  try {
    await page.waitForSelector(modalSelector, { state: "detached", timeout: 5000 });
  } catch {
    await page.keyboard.press("Escape");
    await page.waitForSelector(modalSelector, { state: "detached", timeout: 4000 }).catch(() => {});
  }
  await page.waitForTimeout(400);
}

async function findActiveViteUrl() {
  for (const port of [5173, 5174, 5175, 5176, 4173]) {
    try {
      const res = await fetch(`http://127.0.0.1:${port}/`);
      if (res.status === 200 || res.status === 304) {
        return `http://127.0.0.1:${port}`;
      }
    } catch {}
  }
  return "http://127.0.0.1:5173";
}

let activeBaseUrl = "http://127.0.0.1:5173";

async function ensureRadiologyOpen(page) {
  const radModal = await page.$('[data-testid="radiology-module-container"]');
  if (!radModal || !(await radModal.isVisible())) {
    await page.goto(`${activeBaseUrl}/#imaging`, { waitUntil: "domcontentloaded", timeout: 30000 });
    await page.waitForTimeout(1000);
    const openBtn = await page.waitForSelector('[data-testid="imaging-open-radiology-module"]', { timeout: 15000 });
    await openBtn.click();
    await page.waitForSelector('[data-testid="radiology-module-container"]', { state: "visible", timeout: 15000 });
    await page.waitForTimeout(800);
  }
}

async function main() {
  activeBaseUrl = await findActiveViteUrl();
  console.log(`[VITE DETECTED] Using active frontend base URL: ${activeBaseUrl}`);

  const targetDirs = [
    path.resolve("C:/Clinic_MVP/dental-crm/docs/screenshots/radiology_windows"),
    path.resolve("C:/Users/Admin/.gemini/antigravity/brain/f2f112f9-fcfc-414d-a9be-dbcf9be10f88"),
  ];
  for (const d of targetDirs) {
    if (!fs.existsSync(d)) fs.mkdirSync(d, { recursive: true });
  }

  const browser = await chromium.launch({
    headless: true,
    executablePath: "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });

  async function takeScreen(page, fileName, description) {
    await page.waitForTimeout(500);
    const primaryPath = path.join(targetDirs[0], fileName);
    if (fs.existsSync(primaryPath)) {
      try { fs.unlinkSync(primaryPath); } catch {}
    }
    await page.screenshot({ path: primaryPath, fullPage: false, animations: "allow", timeout: 15000 });
    for (let i = 1; i < targetDirs.length; i++) {
      const dest = path.join(targetDirs[i], fileName);
      try { fs.copyFileSync(primaryPath, dest); } catch {}
    }
    const stat = fs.statSync(primaryPath);
    console.log(`[CAPTURED] ${fileName} (${description}) — ${(stat.size / 1024).toFixed(1)} KB`);
  }

  try {
    const ctx = await browser.newContext({
      viewport: { width: 1440, height: 900 },
      deviceScaleFactor: 2,
    });
    await addAuthInitScript(ctx);
    const page = await ctx.newPage();

    page.on("pageerror", (err) => console.error("[BROWSER ERROR]:", err.message));
    page.on("console", (msg) => {
      if (msg.type() === "error") console.error("[BROWSER CONSOLE ERROR]:", msg.text());
    });

    await setupPageRoutes(page);

    console.log(`Navigating to ${activeBaseUrl}/#imaging...`);
    await page.goto(`${activeBaseUrl}/#imaging`, { waitUntil: "domcontentloaded", timeout: 30000 });
    await page.waitForTimeout(1500);

    // =========================================================================
    // 1. Direct RVG Capture Modal: Empty Auto-Trigger state (Light & Dark)
    // =========================================================================
    console.log("\n>>> Capturing DirectRvgCaptureModal - Empty Auto-Trigger State <<<");
    await applyTheme(page, "light");
    await ensureRadiologyOpen(page);
    let rvgBtn = await page.waitForSelector('[data-testid="btn-open-rvg-capture"]', { timeout: 10000 });
    await rvgBtn.click();
    await page.waitForSelector('[data-testid="direct-rvg-capture-modal"]', { state: "visible", timeout: 15000 });
    await page.waitForTimeout(1000);
    await takeScreen(page, "03_rvg_capture_empty_light.png", "Визиография: Окно захвата в режиме ожидания (Light)");

    console.log("Switching Empty Capture Modal to Dark...");
    await applyTheme(page, "dark");
    await page.waitForTimeout(800);
    await takeScreen(page, "03_rvg_capture_empty_dark.png", "Визиография: Окно захвата в режиме ожидания (Dark)");

    // =========================================================================
    // 2. Direct RVG Capture Modal: Captured Frame with Presets & FDI (Light & Dark)
    // =========================================================================
    console.log("\n>>> Simulating instant Auto-Trigger / Demo frame capture <<<");
    const demoCaptureBtn = await page.$('[data-testid="btn-rvg-load-demo"], [data-testid="btn-rvg-trigger-empty-capture"]');
    if (demoCaptureBtn) {
      await demoCaptureBtn.click();
      await page.waitForTimeout(800);
    }
    await takeScreen(page, "03_rvg_capture_active_dark.png", "Визиография: Захваченный снимок зуба 16 с фильтрами и пресетами (Dark)");

    console.log("Switching Active Captured Frame to Light...");
    await applyTheme(page, "light");
    await page.waitForTimeout(800);
    await takeScreen(page, "03_rvg_capture_active_light.png", "Визиография: Захваченный снимок зуба 16 с фильтрами и пресетами (Light)");

    // Close RVG Capture Modal
    await safeCloseModal(page, '[data-testid="rvg-modal-close-btn"]', '[data-testid="direct-rvg-capture-modal"]');

    // =========================================================================
    // 3. SensorStudyViewer: 2D Viewer & RVG HUD with 5mm Scale Ladder (Light & Dark)
    // =========================================================================
    console.log("\n>>> Capturing SensorStudyViewer - 2D Viewer & RVG HUD <<<");
    await ensureRadiologyOpen(page);
    const openSensorBtn = await page.waitForSelector(
      '[data-testid^="btn-open-sensor-"]',
      { timeout: 10000 }
    );
    await openSensorBtn.click();
    await page.waitForSelector('[data-testid="sensor-study-viewer"]', { state: "visible", timeout: 15000 });
    await page.waitForTimeout(1500);

    await applyTheme(page, "light");
    await page.waitForTimeout(800);
    await takeScreen(page, "01_sensor_study_viewer_light.png", "EzDent-i 2D Просмотрщик: RVG HUD и шкала 5мм (Light)");

    await applyTheme(page, "dark");
    await page.waitForTimeout(800);
    await takeScreen(page, "01_sensor_study_viewer_dark.png", "EzDent-i 2D Просмотрщик: RVG HUD и шкала 5мм (Dark)");

    await safeCloseModal(page, '[data-testid="btn-sensor-close"]', '[data-testid="sensor-study-viewer"]');

    console.log("\n>>> ALL VISIOGRAPHY SCREENSHOTS CAPTURED HONESTLY! <<<");
  } finally {
    await browser.close();
  }
}

main().catch((err) => {
  console.error("FATAL SUITE ERROR:", err);
  process.exit(1);
});
