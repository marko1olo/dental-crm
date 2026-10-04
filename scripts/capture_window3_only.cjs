/**
 * scripts/capture_window3_only.cjs
 *
 * Dedicated script to capture Window 3 (DirectRvgCaptureModal) in Light & Dark modes
 * at 1440x900 resolution (deviceScaleFactor: 2).
 */

const { chromium } = require("playwright");
const path = require("node:path");
const fs = require("node:fs");

const todayDate = new Date().toLocaleDateString("en-CA");

const studiesArray = [
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

async function applyTheme(page, theme) {
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      await page.waitForLoadState("domcontentloaded").catch(() => {});
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
      console.warn(`applyTheme retry (${attempt + 1}/3):`, err.message);
      await page.waitForTimeout(800);
    }
  }
  await page.waitForTimeout(600);
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
    path.resolve("C:/Users/Admin/.gemini/antigravity/brain/190e3c0b-03be-4d33-87ce-8de3ddd34ee9"),
  ];
  for (const d of targetDirs) {
    if (!fs.existsSync(d)) fs.mkdirSync(d, { recursive: true });
  }

  const browser = await chromium.launch({
    headless: true,
    executablePath: "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
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

    console.log("Navigating to http://127.0.0.1:5173/#schedule...");
    await page.goto("http://127.0.0.1:5173/#schedule", { waitUntil: "domcontentloaded", timeout: 45000 });
    await page.waitForSelector(".boot-state", { state: "detached", timeout: 45000 }).catch(() => {});
    await page.waitForSelector(".app-shell", { state: "visible", timeout: 30000 });
    console.log("App shell ready! Switching to #imaging...");

    await page.click('a[href="#imaging"]');
    await page.waitForTimeout(1500);

    console.log("Opening RadiologyModule modal...");
    const openRadBtn = await page.waitForSelector('[data-testid="imaging-open-radiology-module"]', { timeout: 15000 });
    await openRadBtn.click();
    await page.waitForSelector('[data-testid="radiology-module-container"]', { timeout: 15000 });
    console.log("RadiologyModule open!");

    console.log("Opening Window 3: Direct RVG Capture Modal...");
    const openRvgBtn = await page.waitForSelector('[data-testid="btn-open-rvg-capture"]', { timeout: 10000 });
    await openRvgBtn.click();
    await page.waitForSelector('[data-testid="direct-rvg-capture-modal"]', { timeout: 15000 });
    await page.waitForTimeout(1500);

    // Capture Light Theme
    console.log("Capturing Light Theme...");
    await applyTheme(page, "light");
    await page.waitForTimeout(1000);

    const lightPath = path.join(targetDirs[0], "03_window3_multivendor_rvg_capture_light.png");
    await page.screenshot({ path: lightPath, fullPage: false, animations: "allow" });
    for (let i = 1; i < targetDirs.length; i++) {
      fs.copyFileSync(lightPath, path.join(targetDirs[i], "03_window3_multivendor_rvg_capture_light.png"));
    }
    console.log("[CAPTURED] 03_window3_multivendor_rvg_capture_light.png");

    // Capture Dark Theme
    console.log("Capturing Dark Theme...");
    await applyTheme(page, "dark");
    await page.waitForTimeout(1000);

    const darkPath = path.join(targetDirs[0], "03_window3_multivendor_rvg_capture_dark.png");
    await page.screenshot({ path: darkPath, fullPage: false, animations: "allow" });
    for (let i = 1; i < targetDirs.length; i++) {
      fs.copyFileSync(darkPath, path.join(targetDirs[i], "03_window3_multivendor_rvg_capture_dark.png"));
    }
    console.log("[CAPTURED] 03_window3_multivendor_rvg_capture_dark.png");

    console.log("ALL SCREENSHOTS CAPTURED SUCCESSFULLY!");
  } finally {
    await browser.close();
  }
}

main().catch((err) => {
  console.error("FATAL ERROR in capture_window3_only:", err);
  process.exit(1);
});
