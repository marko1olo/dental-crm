/**
 * scripts/capture_radiology_6_windows.cjs
 *
 * Dedicated Red Team Inquisitor Screenshot Suite for 6 Radiology Windows:
 * Window 1: 2D Viewer & RVG HUD (SensorStudyViewer with 5mm scale and bottom filmstrip)
 * Window 2: Tactile search matrix 7x7 (RadiologyPatientSearchModal) & Chronological timeline (PatientTimeline)
 * Window 3: Multivendor capture console (DirectRvgCaptureModal with 14 global brands, auto-detect, connection test)
 * Window 4: Split consultation (RadiologyConsultationSplit with 8 disciplines catalog)
 * Window 5: Print report studio (RadiologyReportStudioModal on virtual A4)
 * Window 6: 3D CBCT Studio Picasso (CbctMprImplantStudioModal with 50/50 layout and fullscreen expand [ ⛶ ] buttons)
 *
 * Captures all 6 windows in Desktop 1440x900 resolution across 2 themes: Light & Dark.
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

    // Default API response returning full dashboard object
    return route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(mockDashboard),
    });
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

async function safeCloseModal(page, closeSelector, modalSelector) {
  console.log(`Closing modal ${modalSelector} (using trigger: ${closeSelector})...`);
  try {
    const btn = await page.$(closeSelector);
    if (btn && await btn.isVisible()) {
      await btn.click({ timeout: 3000 });
    } else {
      await page.keyboard.press("Escape");
    }
  } catch (err) {
    console.warn(`Click failed on ${closeSelector}, pressing Escape...`);
    await page.keyboard.press("Escape");
  }

  // Check if still visible, press Escape if so
  try {
    await page.waitForSelector(modalSelector, { state: "detached", timeout: 4000 });
  } catch {
    console.warn(`Modal ${modalSelector} still in DOM, pressing Escape to force close...`);
    await page.keyboard.press("Escape");
    await page.waitForSelector(modalSelector, { state: "detached", timeout: 5000 });
  }
  console.log(`Modal ${modalSelector} successfully closed!`);
  await page.waitForTimeout(400);
}

async function main() {
  const targetDirs = [
    path.resolve("C:/Users/Admin/.gemini/antigravity/brain/d3922db3-3533-4e1a-90f7-6afb69d7deb5/screenshots"),
    path.resolve("C:/Clinic_MVP/dental-crm/docs/screenshots/radiology_windows"),
  ];
  for (const d of targetDirs) {
    if (!fs.existsSync(d)) fs.mkdirSync(d, { recursive: true });
  }

  const browser = await chromium.launch({
    headless: true,
    executablePath: "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });

  const capturedRegistry = [];

  async function takeScreen(page, fileName, description) {
    // Zero-tolerance check: Ensure .boot-state is NOT visible
    const hasBoot = await page.$(".boot-state");
    if (hasBoot && await hasBoot.isVisible()) {
      throw new Error(`CRITICAL DEFECT: Page reverted to .boot-state before capture of ${fileName}!`);
    }

    await page.waitForTimeout(600);
    const primaryPath = path.join(targetDirs[0], fileName);
    if (fs.existsSync(primaryPath)) {
      try { fs.unlinkSync(primaryPath); } catch {}
    }
    await page.screenshot({ path: primaryPath, fullPage: false, animations: "disabled", timeout: 30000 });
    for (let i = 1; i < targetDirs.length; i++) {
      fs.copyFileSync(primaryPath, path.join(targetDirs[i], fileName));
    }
    const stat = fs.statSync(primaryPath);
    capturedRegistry.push({ fileName, description, sizeBytes: stat.size, path: primaryPath });
    console.log(`[CAPTURED] ${fileName} (${description}) — ${(stat.size / 1024).toFixed(1)} KB`);
  }

  try {
    const ctx = await browser.newContext({
      viewport: { width: 1440, height: 900 },
      deviceScaleFactor: 2,
    });
    await addAuthInitScript(ctx);
    const page = await ctx.newPage();

    // Attach loggers to observe any frontend issues
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

    // Open RadiologyModule via [data-testid="imaging-open-radiology-module"]
    console.log("Opening RadiologyModule modal...");
    const openRadBtn = await page.waitForSelector('[data-testid="imaging-open-radiology-module"]', { timeout: 15000 });
    await openRadBtn.click();
    await page.waitForSelector('[data-testid="radiology-module-container"]', { timeout: 15000 });
    console.log("RadiologyModule open!");

    // =========================================================================
    // WINDOW 1: 2D Viewer & RVG HUD (SensorStudyViewer)
    // =========================================================================
    console.log("\n--- Window 1: 2D Viewer & RVG HUD (SensorStudyViewer) ---");
    const openSensorBtn = await page.waitForSelector(
      '[data-testid="btn-open-sensor-02b00000-0000-0000-0000-000000000002"], [data-testid^="btn-open-sensor-"]',
      { timeout: 10000 }
    );
    await openSensorBtn.click();
    await page.waitForSelector('[data-testid="sensor-study-viewer"]', { timeout: 15000 });
    await page.waitForTimeout(2000);

    await applyTheme(page, "light");
    await page.waitForTimeout(800);
    await takeScreen(page, "01_window1_sensor_study_viewer_light.png", "Window 1: 2D Viewer & RVG HUD (Light)");

    await applyTheme(page, "dark");
    await page.waitForTimeout(800);
    await takeScreen(page, "01_window1_sensor_study_viewer_dark.png", "Window 1: 2D Viewer & RVG HUD (Dark)");

    await safeCloseModal(page, '[data-testid="btn-sensor-close"]', '[data-testid="sensor-study-viewer"]');

    // =========================================================================
    // WINDOW 2: Tactile search matrix 7x7 (RadiologyPatientSearchModal)
    // =========================================================================
    console.log("\n--- Window 2: Tactile search matrix 7x7 ---");
    const openTactileBtn = await page.waitForSelector('[data-testid="btn-open-tactile-matrix-modal"]', { timeout: 10000 });
    await openTactileBtn.click();
    await page.waitForSelector('[data-testid="radiology-search-modal"], [data-testid="tactile-search-modal-dialog"]', { timeout: 15000 });

    await applyTheme(page, "light");
    await takeScreen(page, "02_window2_tactile_search_matrix_light.png", "Window 2: Тактильная матрица поиска 7x7 (Light)");

    await applyTheme(page, "dark");
    await takeScreen(page, "02_window2_tactile_search_matrix_dark.png", "Window 2: Тактильная матрица поиска 7x7 (Dark)");

    await safeCloseModal(page, '[data-testid="btn-close-tactile-search"]', '[data-testid="radiology-search-modal"]');

    // =========================================================================
    // WINDOW 3: Multivendor capture console (DirectRvgCaptureModal)
    // =========================================================================
    console.log("\n--- Window 3: Multivendor capture console (DirectRvgCaptureModal) ---");
    const openRvgBtn = await page.waitForSelector('[data-testid="btn-open-rvg-capture"]', { timeout: 10000 });
    await openRvgBtn.click();
    await page.waitForSelector('[data-testid="direct-rvg-capture-modal"]', { timeout: 15000 });

    await applyTheme(page, "light");
    await takeScreen(page, "03_window3_multivendor_rvg_capture_light.png", "Window 3: Консоль захвата 14 брендов (Light)");

    await applyTheme(page, "dark");
    await takeScreen(page, "03_window3_multivendor_rvg_capture_dark.png", "Window 3: Консоль захвата 14 брендов (Dark)");

    await safeCloseModal(page, '[data-testid="rvg-modal-close-btn"]', '[data-testid="direct-rvg-capture-modal"]');

    // =========================================================================
    // WINDOW 4: Split consultation (RadiologyConsultationSplit)
    // =========================================================================
    console.log("\n--- Window 4: Split consultation (RadiologyConsultationSplit) ---");
    const openConsultBtn = await page.waitForSelector('[data-testid="btn-open-consultation-split"]', { timeout: 10000 });
    await openConsultBtn.click();
    await page.waitForSelector('[data-testid="radiology-consultation-split"]', { timeout: 15000 });

    await applyTheme(page, "light");
    await takeScreen(page, "04_window4_consultation_split_light.png", "Window 4: Сплит-консультация 8 дисциплин (Light)");

    await applyTheme(page, "dark");
    await takeScreen(page, "04_window4_consultation_split_dark.png", "Window 4: Сплит-консультация 8 дисциплин (Dark)");

    await safeCloseModal(page, '[data-testid="btn-consultation-close"]', '[data-testid="radiology-consultation-split"]');

    // =========================================================================
    // WINDOW 5: Print report studio (RadiologyReportStudioModal)
    // =========================================================================
    console.log("\n--- Window 5: Print report studio (RadiologyReportStudioModal) ---");
    const openReportBtn = await page.waitForSelector('[data-testid="btn-open-report-studio"]', { timeout: 10000 });
    await openReportBtn.click();
    await page.waitForSelector('[data-testid="radiology-report-studio-modal"]', { timeout: 15000 });

    await applyTheme(page, "light");
    await takeScreen(page, "05_window5_report_studio_a4_light.png", "Window 5: Конструктор отчетов А4 (Light)");

    await applyTheme(page, "dark");
    await takeScreen(page, "05_window5_report_studio_a4_dark.png", "Window 5: Конструктор отчетов А4 (Dark)");

    await safeCloseModal(page, '[data-testid="btn-close-report-studio"]', '[data-testid="radiology-report-studio-modal"]');

    // =========================================================================
    // WINDOW 6: 3D CBCT Studio Picasso (CbctMprImplantStudioModal) with 50/50 layout
    // =========================================================================
    console.log("\n--- Window 6: 3D CBCT Studio Picasso (CbctMprImplantStudioModal) ---");
    const openCbctBtn = await page.waitForSelector('[data-testid="btn-open-3d-cbct-studio"]', { timeout: 10000 });
    await openCbctBtn.click();
    await page.waitForSelector('[data-testid="cbct-studio-modal"]', { timeout: 20000 });

    // Check if demo volume needs to be loaded
    await page.waitForTimeout(1000);
    const loadDemoBtn = await page.$('[data-testid="cbct-btn-load-demo-empty"]');
    if (loadDemoBtn && await loadDemoBtn.isVisible()) {
      console.log("Loading CBCT demo volume...");
      await loadDemoBtn.click();
      await page.waitForSelector('[data-testid="cbct-empty-volume-dropzone"]', { state: "detached", timeout: 25000 }).catch(() => {
        console.warn("Dropzone still attached or taking longer to decode slices...");
      });
      await page.waitForTimeout(3000);
    }

    // Switch to Panoramic / 50-50 layout
    console.log("Switching to Panoramic / 50-50 layout...");
    const panoTabBtn = await page.waitForSelector('[data-testid="cbct-nav-tab-panorama"]', { timeout: 15000 });
    await panoTabBtn.click();
    await page.waitForSelector('[data-testid="cbct-panoramic-dominant-container"], [data-testid="btn-viewport-expand-panoramic"], [data-testid="cbct-workspace-panoramic-root"]', { timeout: 20000 });
    await page.waitForTimeout(2500);

    await applyTheme(page, "light");
    await page.waitForTimeout(800);
    await takeScreen(page, "06_window6_cbct_picasso_50_50_light.png", "Window 6: 3D КЛКТ Studio Picasso 50/50 (Light)");

    await applyTheme(page, "dark");
    await page.waitForTimeout(800);
    await takeScreen(page, "06_window6_cbct_picasso_50_50_dark.png", "Window 6: 3D КЛКТ Studio Picasso 50/50 (Dark)");

    await safeCloseModal(page, '[data-testid="close-cbct-mpr-3d-studio-btn"]', '[data-testid="cbct-studio-modal"]');

    // =========================================================================
    // EXTRA EVIDENCE: PatientTimeline in PatientRadiologyTab
    // =========================================================================
    console.log("\n--- Extra Evidence: PatientTimeline ---");
    // Close RadiologyModule if open (via Escape)
    await page.keyboard.press("Escape");
    await page.waitForTimeout(600);
    await page.waitForSelector('[data-testid="radiology-module-container"]', { state: "detached", timeout: 5000 }).catch(async () => {
      await page.keyboard.press("Escape");
    });

    // Navigate to patients
    console.log("Navigating to #patients...");
    await page.click('a[href="#patients"]');
    await page.waitForTimeout(1500);

    const patientRow = await page.waitForSelector(
      '[data-testid="patient-row-pat-1"], [data-testid="patient-row-open-btn-pat-1"], tr:has-text("Ковалёв")',
      { timeout: 15000 }
    ).catch(() => null);

    if (patientRow) {
      await patientRow.click();
      await page.waitForTimeout(800);

      console.log("Opening patient card modal via actions dropdown...");
      const moreBtn = await page.waitForSelector('[data-testid="patient-card-more-actions-btn"]', { timeout: 10000 }).catch(() => null);
      if (moreBtn) {
        await moreBtn.click();
        await page.waitForTimeout(500);
        const openCardBtn = await page.waitForSelector('[data-testid="open-patient-card-modal-btn"]', { timeout: 5000 });
        await openCardBtn.click();
      } else {
        const rowMoreBtn = await page.waitForSelector('[data-testid="patient-row-more-btn-pat-1"]', { timeout: 5000 });
        await rowMoreBtn.click();
        await page.waitForTimeout(500);
        const cardMenuItem = await page.waitForSelector('text=Паспортная карточка', { timeout: 5000 });
        await cardMenuItem.click();
      }

      await page.waitForSelector('[data-testid="tab-patient-radiology"]', { timeout: 15000 });
      console.log("Switching to 'Снимки и КТ' tab...");
      const radTab = await page.waitForSelector('[data-testid="tab-patient-radiology"]', { timeout: 10000 });
      await radTab.click();
      await page.waitForSelector('[data-testid="patient-timeline-container"]', { timeout: 15000 });
      await page.waitForTimeout(1500);

      await applyTheme(page, "light");
      await page.waitForTimeout(800);
      await takeScreen(page, "02_window2_patient_timeline_light.png", "Window 2 Extra: Таймлайн исследований пациента (Light)");

      await applyTheme(page, "dark");
      await page.waitForTimeout(800);
      await takeScreen(page, "02_window2_patient_timeline_dark.png", "Window 2 Extra: Таймлайн исследований пациента (Dark)");
      console.log("PatientTimeline captured successfully!");
    } else {
      console.warn("Could not find patient row button, skipping PatientTimeline screen");
    }

    console.log("\n=================== ALL TARGET WINDOWS CAPTURED SUCCESSFULLY ===================");
    console.log(JSON.stringify(capturedRegistry, null, 2));

  } finally {
    await browser.close();
  }
}

main().catch((err) => {
  console.error("FATAL SUITE ERROR:", err);
  process.exit(1);
});
