/**
 * scripts/capture_2d_viewer_audit.cjs
 *
 * Dedicated Red Team Inquisitor Screenshot Engine for:
 * 1. 2D Viewer Light Theme (VisiographAnalyzer / SensorStudyViewer)
 * 2. 2D Viewer Dark Theme
 * 3. 2D HUD EzDent-i fullscreen with 5 mm calibration scale on the left
 * 4. RadiologyFilmstripDock (bottom persistent patient x-ray timeline)
 */

const { chromium } = require("playwright");
const path = require("node:path");
const fs = require("node:fs");

const todayDate = new Date().toLocaleDateString("en-CA");

const mockScans = [
  {
    id: "sample_rvg_16",
    patientId: "pat-1",
    toothCode: "16",
    kind: "periapical",
    status: "done",
    hasImage: true,
    imageDataUri: "/radiology/sample_rvg_tooth16.jpg",
    thumbnailUrl: "/radiology/sample_rvg_tooth16.jpg",
    originalFilename: "RVG_16_periapical.dcm",
    capturedAt: "2026-10-01T10:14:20.000Z",
    createdAt: "2026-10-01T10:14:20.000Z",
    aiReport: "Область 16 зуба: кариозное поражение эмали и дентина. Кортикальная пластинка альвеолы сохранена.",
    aiSummary: "Зуб 16: кариес дентина K02.1, периодонт интактен.",
    aiToothStates: { "16": "treatment" },
  },
  {
    id: "sample_rvg_36",
    patientId: "pat-1",
    toothCode: "36",
    kind: "periapical",
    status: "done",
    hasImage: true,
    imageDataUri: "/radiology/sample_rvg_tooth36_periapical.jpg",
    thumbnailUrl: "/radiology/sample_rvg_tooth36_periapical.jpg",
    originalFilename: "RVG_36_control.dcm",
    capturedAt: "2026-09-20T09:14:20.000Z",
    createdAt: "2026-09-20T09:14:20.000Z",
  },
  {
    id: "sample_optg_pano",
    patientId: "pat-1",
    kind: "panoramic",
    status: "done",
    hasImage: true,
    imageDataUri: "/radiology/sample_rvg_tooth16.jpg",
    thumbnailUrl: "/radiology/sample_rvg_tooth16.jpg",
    originalFilename: "PANO_all_teeth.dcm",
    capturedAt: "2026-03-24T14:30:10.000Z",
    createdAt: "2026-03-24T14:30:10.000Z",
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
      fullName: "Чухрова Лариса Ивановна",
      status: "active",
      birthDate: "1968-01-01",
      phone: "+7 (999) 888-77-66",
      email: "chukhrova@example.ru",
      notes: "Бронхиальная астма, аллергия на латекс",
      administrativeProfile: "normal",
      balanceRub: 0,
      createdAt: `${todayDate}T08:00:00.000Z`,
      updatedAt: `${todayDate}T08:00:00.000Z`,
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
      startsAt: `${todayDate}T10:00:00.000Z`,
      endsAt: `${todayDate}T11:00:00.000Z`,
      startTime: `${todayDate}T10:00:00.000Z`,
      endTime: `${todayDate}T11:00:00.000Z`,
      durationMinutes: 60,
      serviceTitle: "Прицельная визиография 16 зуба + лечение кариеса",
      serviceCategories: ["therapy", "radiology"],
      createdByUserId: "doc-1",
      createdAt: `${todayDate}T08:00:00.000Z`,
      updatedAt: `${todayDate}T08:00:00.000Z`,
      patientName: "Чухрова Лариса Ивановна",
      doctorName: "Д-р Воронов А.В.",
    },
  ],
  activeVisit: {
    id: "visit-chukhrova-1",
    organizationId: "00000000-0000-0000-0000-000000000001",
    patientId: "pat-1",
    doctorId: "doc-1",
    appointmentId: "app-1",
    status: "in_progress",
    complaint: "Ноющие боли в области 16 зуба при приёме сладкого.",
    anamnesis: "Ранее зуб не лечен. Соматически здорова.",
    objectiveStatus: "Зуб 16: глубокая кариозная полость на жевательной поверхности. Зондирование дна слабо болезненно. Перкуссия безболезненна.",
    diagnosis: "K02.1 Кариес дентина (глубокий кариес 16 зуба)",
    treatmentPlan: "Прицельный снимок визиографа 16 зуба, препарирование, лечебная прокладка, пломбирование светоотверждаемым композитом.",
    createdAt: `${todayDate}T10:00:00.000Z`,
    updatedAt: `${todayDate}T10:05:00.000Z`,
  },
  documents: [],
  imagingStudies: [
    {
      id: "study-rvg-16",
      title: "Прицельный снимок зуба #16",
      patientId: "pat-1",
      patientName: "Чухрова Лариса Ивановна",
      modality: "RVG",
      manufacturer: "Vatech",
      dimensions: "1200x900",
      capturedAt: `${todayDate}T10:14:20.000Z`,
      storagePath: "/radiology/sample_rvg_tooth16.jpg",
      bindingStatus: "auto_bound",
      bindingConfidence: 100,
    },
  ],
  serviceCatalog: [
    { id: "srv-1", code: "A06.07.001", name: "Прицельная внутриротовая контактная рентгенография", priceRub: 450 },
    { id: "srv-2", code: "A16.07.002", name: "Восстановление зуба пломбой (светоотверждаемый композит)", priceRub: 4500 },
  ],
  payments: [],
  billingSummary: {
    totalPlannedRub: 4950,
    totalDiscountRub: 0,
    totalPaidRub: 0,
    totalDueRub: 4950,
    taxDeductionEligibleRub: 4950,
    draftDocumentAmountRub: 0,
    openTreatmentItems: 1,
    unpaidDocuments: 0,
  },
};

async function setupPageRoutes(page) {
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
    if (url.includes("/api/xray/scans")) {
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(mockScans),
      });
    }
    if (url.includes("/api/imaging/visiograph-ai")) {
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          report: "Рентгенодиагностика: прицельный снимок зуба 16.\nКоронковая часть: дефект твердых тканей окклюзионно (К02.1 Кариес дентина).\nКорневые каналы: прослеживаются, периодонтальная щель равномерная, без очагов деструкции костной ткани.",
          toothStates: { "16": "treatment" },
          warnings: [],
        }),
      });
    }
    return route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(url.includes("list") || url.includes("status") ? [] : {}),
    });
  });
}

async function applyTheme(page, theme) {
  await page.waitForFunction(() => typeof window !== "undefined" && Boolean(window.__useThemeStore), { timeout: 15000 }).catch(() => {});
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
  const isDark = ["dark", "night", "ocean", "emerald", "cyber_xray"].includes(theme);
  await page.waitForFunction((dark) => {
    const hasDark = document.documentElement.classList.contains("dark");
    return dark ? hasDark : !hasDark;
  }, isDark, { timeout: 8000 }).catch(() => {});
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
      "dente_quest_progress_v2",
      JSON.stringify({
        activeTrackId: "solo_doctor",
        currentStepIndex: 4,
        completedStepIds: ["schedule_overview", "tooth_formula", "diary_043u", "reception_receipt"],
        isTourActive: false,
        isDismissedPermanently: true,
        tracksProgress: {
          solo_doctor: { completed: true, completedStepIds: ["schedule_overview", "tooth_formula", "diary_043u", "reception_receipt"] },
          reception_admin: { completed: true, completedStepIds: [] },
          imaging_diagnostics: { completed: true, completedStepIds: [] },
        },
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

    // Suppress coachmarks/spotlights
    const style = document.createElement("style");
    style.innerHTML = `
      [data-testid="doctor-training-coach-mark-card"],
      [data-testid="guided-tour-spotlight-overlay"],
      .tour-spotlight-root,
      .tour-backdrop-clickable-zone {
        display: none !important;
        pointer-events: none !important;
      }
    `;
    document.head?.appendChild(style);
  });

async function main() {
  const targetDirs = [
    path.resolve("C:/Clinic_MVP/dental-crm/docs/screenshots/2d_viewer"),
    path.resolve("C:/Users/Admin/.gemini/antigravity/brain/d9979b23-6d2a-4028-91f3-6cdbf7ad7ba3/screenshots"),
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

  async function takeScreen(page, fileName, description, clipOrNull = null) {
    await page.waitForTimeout(600);
    const primaryPath = path.join(targetDirs[0], fileName);
    if (fs.existsSync(primaryPath)) {
      try { fs.unlinkSync(primaryPath); } catch {}
    }
    const options = { path: primaryPath, fullPage: false, animations: "disabled", timeout: 30000 };
    if (clipOrNull) {
      options.clip = clipOrNull;
    }
    await page.screenshot(options);
    for (let i = 1; i < targetDirs.length; i++) {
      fs.copyFileSync(primaryPath, path.join(targetDirs[i], fileName));
    }
    const stat = fs.statSync(primaryPath);
    capturedRegistry.push({ fileName, description, sizeBytes: stat.size, path: primaryPath });
    console.log(`[CAPTURED] ${fileName} (${description}) — ${(stat.size / 1024).toFixed(1)} KB`);
  }

  async function takeElementScreen(locator, fileName, description) {
    await locator.waitFor({ state: "visible", timeout: 15000 });
    await locator.scrollIntoViewIfNeeded().catch(() => {});
    const primaryPath = path.join(targetDirs[0], fileName);
    if (fs.existsSync(primaryPath)) {
      try { fs.unlinkSync(primaryPath); } catch {}
    }
    await locator.screenshot({ path: primaryPath, timeout: 30000 });
    for (let i = 1; i < targetDirs.length; i++) {
      fs.copyFileSync(primaryPath, path.join(targetDirs[i], fileName));
    }
    const stat = fs.statSync(primaryPath);
    capturedRegistry.push({ fileName, description, sizeBytes: stat.size, path: primaryPath });
    console.log(`[CAPTURED ELEMENT] ${fileName} (${description}) — ${(stat.size / 1024).toFixed(1)} KB`);
  }

  try {
    const context = await browser.newContext({
      viewport: { width: 1440, height: 900 },
      deviceScaleFactor: 2,
    });
    await addAuthInitScript(context);
    const page = await context.newPage();
    await setupPageRoutes(page);

    console.log("[NAV] Navigating to #schedule first to hydrate app state...");
    await page.goto("http://127.0.0.1:5173/#schedule", { waitUntil: "domcontentloaded", timeout: 45000 });
    await page.waitForSelector(".boot-state", { state: "detached", timeout: 45000 }).catch(() => {});
    await page.waitForSelector(".app-shell", { state: "visible", timeout: 30000 });
    await page.waitForSelector(".schedule-panel, .schedule-filter-strip", { timeout: 25000 });
    await page.waitForTimeout(1000);

    console.log("[NAV] Navigating to #visit...");
    await page.evaluate(() => {
      const link = document.querySelector('a[href="#visit"]');
      if (link) link.click();
      else window.location.hash = "#visit";
    });
    await page.waitForSelector('[data-testid="visit-subtab-emk"], .visit-monolithic-header, [data-testid="visit-view"]', { timeout: 35000 });
    await page.waitForTimeout(1000);

    console.log("[NAV] Opening subtab diagnostics (VisiographAnalyzer)...");
    await page.evaluate(() => {
      const diagBtn = document.querySelector('[data-testid="visit-subtab-diagnostics"]');
      if (diagBtn) diagBtn.click();
    });
    await page.waitForTimeout(1000);

    // If demo scan button exists, click it to load the image immediately
    const demoBtn = await page.$('[data-testid="btn-load-demo-scan"]');
    if (demoBtn) {
      console.log("[ACTION] Clicking load demo scan button...");
      await demoBtn.click();
      await page.waitForTimeout(1200);
    }

    await page.waitForSelector('.visiograph-dominant-canvas, [data-testid="visiograph-dominant-canvas"]', { timeout: 20000 });
    await page.waitForTimeout(1000);

    // =========================================================================
    // 1. 2D Viewer Light Theme (01_2d_viewer_light.png & 01b card)
    // =========================================================================
    console.log("\n--- Capturing 01: 2D Viewer Light Theme ---");
    await applyTheme(page, "light");
    const analyzerCard = page.locator('[data-testid="visiograph-analyzer-container"]');
    await analyzerCard.scrollIntoViewIfNeeded().catch(() => {});
    await page.waitForTimeout(600);
    await takeScreen(page, "01_2d_viewer_light.png", "2D Просмотрщик (Светлая тема: VisiographAnalyzer, шкала 5мм слева, зеленая Норма)");
    await takeElementScreen(analyzerCard, "01b_visiograph_analyzer_card_light.png", "2D Карточка VisiographAnalyzer (Светлая)");

    // =========================================================================
    // 2. 2D Viewer Dark Theme (02_2d_viewer_dark.png & 02b card)
    // =========================================================================
    console.log("\n--- Capturing 02: 2D Viewer Dark Theme ---");
    await applyTheme(page, "dark");
    await analyzerCard.scrollIntoViewIfNeeded().catch(() => {});
    await page.waitForTimeout(600);
    await takeScreen(page, "02_2d_viewer_dark.png", "2D Просмотрщик (Тёмная тема: без белых пятен, шкала 5мм слева, лента снимков)");
    await takeElementScreen(analyzerCard, "02b_visiograph_analyzer_card_dark.png", "2D Карточка VisiographAnalyzer (Тёмная)");

    // =========================================================================
    // 3. 2D HUD EzDent-i Fullscreen (SensorStudyViewer)
    // =========================================================================
    console.log("\n--- Opening EzDent-i 2D HUD (SensorStudyViewer) ---");
    const openSensorBtn = await page.$('[data-testid="btn-open-ezdent-sensor-viewer"]');
    if (openSensorBtn) {
      await openSensorBtn.click();
      await page.waitForSelector('[data-testid="sensor-study-viewer"]', { timeout: 15000 });
      await page.waitForTimeout(1500);

      // Dark Theme HUD
      console.log("--- Capturing 03: 2D HUD EzDent-i Fullscreen Dark ---");
      await applyTheme(page, "dark");
      await takeScreen(page, "03_2d_hud_ezdent_fullscreen_dark.png", "2D HUD EzDent-i Fullscreen Dark (Шкала 5мм слева, HUD телеметрия, фильтры, Норма)");

      // Light Theme HUD
      console.log("--- Capturing 03b: 2D HUD EzDent-i Fullscreen Light ---");
      await applyTheme(page, "light");
      await takeScreen(page, "03_2d_hud_ezdent_fullscreen_light.png", "2D HUD EzDent-i Fullscreen Light (Шкала 5мм слева, HUD телеметрия, фильтры, Норма)");

      // =========================================================================
      // 4. RadiologyFilmstripDock Focus (04_2d_filmstrip_dock_focus.png)
      // =========================================================================
      console.log("\n--- Capturing 04: RadiologyFilmstripDock Focus ---");
      const dockInModal = page.locator('[data-testid="sensor-study-viewer"] [data-testid="radiology-filmstrip-dock"]');
      await takeElementScreen(dockInModal, "04_2d_filmstrip_dock_focus.png", "Нижний док ленты снимков пациента (RadiologyFilmstripDock)");

      // Close sensor viewer
      const closeBtn = await page.$('[data-testid="btn-sensor-close"]');
      if (closeBtn) await closeBtn.click();
      else await page.keyboard.press("Escape");
      await page.waitForTimeout(800);
    } else {
      console.warn("[WARN] btn-open-ezdent-sensor-viewer not found on page!");
    }

    console.log("\n=== ALL 2D VIEWER SCREENSHOTS CAPTURED SUCCESSFULLY ===");
    console.log(JSON.stringify(capturedRegistry, null, 2));

  } catch (err) {
    console.error("[CRITICAL FAILURE]", err);
    process.exitCode = 1;
  } finally {
    await browser.close();
  }
}

main();
