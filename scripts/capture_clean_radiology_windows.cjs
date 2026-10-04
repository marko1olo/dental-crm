/**
 * scripts/capture_clean_radiology_windows.cjs
 *
 * Reliable Red Team Screen Capture for Clean Radiology Windows:
 * - 01_window1_sensor_study_viewer_light.png
 * - 01_window1_sensor_study_viewer_dark.png
 * - 04_window4_consultation_split_light.png
 * - 04_window4_consultation_split_dark.png
 *
 * Desktop 1440x900 resolution without EzDent-i branding.
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
    kind: "opg",
    modality: "PAN",
    title: "Ортопантомограмма цифровая (ОПТГ панорама)",
    seriesDescription: "Planmeca ProMax HD Panoramic",
    studyDate: todayDate,
    capturedAt: `${todayDate}T10:15:00.000Z`,
    sliceCount: 1,
    dimensions: "2840x1420",
    voxelSpacing: "0.08mm",
    fileSizeBytes: 14200000,
    bindingStatus: "manual_bound",
    bindingConfidence: 100,
    sourceKind: "twain",
    sourceName: "Planmeca Romexis",
    status: "available",
    toothCode: "16",
    previewUrl: "/radiology/sample_rvg_tooth16.jpg",
  },
  {
    id: "02b00000-0000-0000-0000-000000000003",
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
        name: "Кресло 1 (Терапия/Хирургия)",
        room: "Кабинет 1",
        active: true,
        sortOrder: 1,
      },
    ],
  },
  dayStatus: {
    status: "open",
    openedAt: `${todayDate}T08:00:00.000Z`,
    totalRevenueRub: 145000,
    appointmentsCount: 6,
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
      balanceRub: 0,
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
  imagingStudies: studiesArray,
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

async function main() {
  const targetDirs = [
    path.resolve("C:/Clinic_MVP/dental-crm/docs/screenshots/radiology_windows"),
    path.resolve("C:/Users/Admin/.gemini/antigravity/brain/94eb63dc-676d-4bf6-b5a4-c5bc8ab779d8"),
  ];
  for (const d of targetDirs) {
    if (!fs.existsSync(d)) fs.mkdirSync(d, { recursive: true });
  }

  const browser = await chromium.launch({
    headless: true,
    executablePath: "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
    args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-gpu", "--disable-dev-shm-usage"],
  });

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

    async function applyTheme(theme) {
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
        } catch (e) {
          await page.waitForTimeout(500);
        }
      }
      await page.waitForTimeout(600);
    }

    async function takeScreen(fileName, description) {
      await page.waitForTimeout(600);
      const p1 = path.join(targetDirs[0], fileName);
      if (fs.existsSync(p1)) {
        try { fs.unlinkSync(p1); } catch {}
      }
      await page.screenshot({ path: p1, fullPage: false, animations: "allow", timeout: 15000 });
      for (let i = 1; i < targetDirs.length; i++) {
        fs.copyFileSync(p1, path.join(targetDirs[i], fileName));
      }
      const stat = fs.statSync(p1);
      console.log(`[CAPTURED] ${fileName} (${description}) — ${(stat.size / 1024).toFixed(1)} KB`);
    }

    async function ensureRadiologyOpen() {
      let radModal = await page.$('[data-testid="radiology-module-container"]');
      if (!radModal || !(await radModal.isVisible())) {
        console.log("Navigating directly to #imaging and opening RadiologyModule...");
        await page.goto("http://127.0.0.1:5173/#imaging", { waitUntil: "domcontentloaded", timeout: 30000 });
        await page.waitForTimeout(1500);
        const openBtn = await page.waitForSelector('[data-testid="imaging-open-radiology-module"]', { timeout: 15000 });
        await openBtn.click();
        await page.waitForSelector('[data-testid="radiology-module-container"]', { state: "visible", timeout: 15000 });
        await page.waitForTimeout(800);
      }
    }

    // Initial navigation
    console.log("Navigating to http://127.0.0.1:5173/#imaging...");
    await ensureRadiologyOpen();

    // =========================================================================
    // WINDOW 1: 2D Viewer & RVG HUD (SensorStudyViewer)
    // =========================================================================
    console.log("\n>>> Capturing Window 1: 2D Viewer & RVG HUD (SensorStudyViewer) <<<");
    await applyTheme("light");

    let openSensorBtn = await page.waitForSelector(
      '[data-testid="btn-open-sensor-study-viewer"], [data-testid^="btn-open-sensor-"]',
      { timeout: 10000 }
    );
    await openSensorBtn.click();
    await page.waitForSelector('[data-testid="sensor-study-viewer"]', { state: "visible", timeout: 15000 });
    await page.waitForTimeout(1500);

    await takeScreen("01_window1_sensor_study_viewer_light.png", "Window 1: 2D Viewer & RVG HUD (Light)");

    console.log("Switching Window 1 to Dark...");
    await applyTheme("dark");
    await page.waitForTimeout(800);
    await takeScreen("01_window1_sensor_study_viewer_dark.png", "Window 1: 2D Viewer & RVG HUD (Dark)");

    // Close Window 1
    const closeSensor = await page.$('[data-testid="btn-sensor-close"]');
    if (closeSensor) await closeSensor.click();
    await page.waitForSelector('[data-testid="sensor-study-viewer"]', { state: "detached", timeout: 8000 }).catch(() => {});
    await page.waitForTimeout(600);

    // =========================================================================
    // WINDOW 4: Split Consultation (RadiologyConsultationSplit)
    // =========================================================================
    console.log("\n>>> Capturing Window 4: Split Consultation (RadiologyConsultationSplit) <<<");
    await applyTheme("light");
    await ensureRadiologyOpen();

    let consultBtn = await page.waitForSelector('[data-testid="btn-open-consultation-split"]', { timeout: 10000 });
    await consultBtn.click();
    await page.waitForSelector('[data-testid="radiology-consultation-split"]', { state: "visible", timeout: 15000 });
    await page.waitForTimeout(1500);

    await takeScreen("04_window4_consultation_split_light.png", "Window 4: Сплит-консультация 8 дисциплин (Light)");

    console.log("Switching Window 4 to Dark...");
    await applyTheme("dark");
    await page.waitForTimeout(800);
    await takeScreen("04_window4_consultation_split_dark.png", "Window 4: Сплит-консультация 8 дисциплин (Dark)");

    // Close Window 4
    const closeConsult = await page.$('[data-testid="btn-consultation-close"]');
    if (closeConsult) await closeConsult.click();
    await page.waitForSelector('[data-testid="radiology-consultation-split"]', { state: "detached", timeout: 8000 }).catch(() => {});
    await page.waitForTimeout(600);

    console.log("\n>>> ALL 4 TARGET SCREENS CAPTURED SUCCESSFULLY! <<<");

  } finally {
    await browser.close();
  }
}

main().catch((err) => {
  console.error("FATAL SUITE ERROR:", err);
  process.exit(1);
});
