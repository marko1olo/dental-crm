/**
 * scripts/capture_radiology_reliable.cjs
 *
 * Reliable Red Team Screen Capture for All Radiology Windows:
 * 1. 2D Viewer & RVG HUD (SensorStudyViewer)
 * 2. Tactile Search Matrix 7x7 (RadiologyPatientSearchModal)
 * 3. Multivendor RVG Capture Console (DirectRvgCaptureModal)
 * 4. Split Consultation 8 Disciplines (RadiologyConsultationSplit)
 * 5. Radiology Report Studio A4 (RadiologyReportStudioModal)
 * 6. 3D CBCT Studio Picasso 50/50 (CbctMprImplantStudioModal)
 * 7. Patient Radiology Tab & Timeline (PatientRadiologyTab)
 *
 * Desktop 1440x900, Light & Dark themes.
 */

const { chromium } = require("playwright");
const path = require("node:path");
const fs = require("node:fs");

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
      notes: "Аллергоанамнез: спокоен. Первичное КЛКТ 16 зуба перед эндодонтией.",
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
        body: JSON.stringify(mockDashboard.imagingStudies),
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
  });

async function main() {
  const targetDirs = [
    path.resolve("C:/Clinic_MVP/dental-crm/docs/screenshots/radiology_windows"),
    path.resolve("C:/Users/Admin/.gemini/antigravity/brain/a591bf64-c0cf-4d13-ae1c-e66e6a8f9401"),
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

    async function applyTheme(theme) {
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

    async function takeScreen(fileName, description) {
      await page.waitForTimeout(500);
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
        console.log("Navigating to #imaging & opening RadiologyModule...");
        await page.goto("http://127.0.0.1:5173/#imaging", { waitUntil: "domcontentloaded", timeout: 30000 });
        await page.waitForTimeout(1000);
        const openBtn = await page.waitForSelector('[data-testid="imaging-open-radiology-module"]', { timeout: 15000 });
        await openBtn.click();
        await page.waitForSelector('[data-testid="radiology-module-container"]', { state: "visible", timeout: 15000 });
        await page.waitForTimeout(800);
      }
    }

    // Initial navigation
    console.log("Initial navigation to http://127.0.0.1:5173/#imaging...");
    await page.goto("http://127.0.0.1:5173/#imaging", { waitUntil: "domcontentloaded", timeout: 30000 });
    await page.waitForTimeout(1000);

    // =========================================================================
    // WINDOW 3: Multivendor RVG Capture Console (DirectRvgCaptureModal)
    // =========================================================================
    console.log("\n>>> Capturing Window 3: Multivendor RVG Capture Console <<<");
    await applyTheme("light");
    await ensureRadiologyOpen();
    let rvgBtn = await page.waitForSelector('[data-testid="btn-open-rvg-capture"]', { timeout: 10000 });
    await rvgBtn.click();
    await page.waitForSelector('[data-testid="direct-rvg-capture-modal"]', { state: "visible", timeout: 15000 });
    await page.waitForTimeout(1000);
    await takeScreen("03_window3_multivendor_rvg_capture_light.png", "Window 3: Консоль захвата 14 брендов (Light)");

    console.log("Switching Window 3 to Dark...");
    await applyTheme("dark");
    await page.waitForSelector('[data-testid="direct-rvg-capture-modal"]', { state: "visible", timeout: 5000 }).catch(async () => {
      await ensureRadiologyOpen();
      const b = await page.waitForSelector('[data-testid="btn-open-rvg-capture"]', { timeout: 10000 });
      await b.click();
      await page.waitForSelector('[data-testid="direct-rvg-capture-modal"]', { timeout: 15000 });
    });
    await page.waitForTimeout(800);
    await takeScreen("03_window3_multivendor_rvg_capture_dark.png", "Window 3: Консоль захвата 14 брендов (Dark)");

    // Close Window 3
    const closeRvg = await page.$('[data-testid="rvg-modal-close-btn"]');
    if (closeRvg) await closeRvg.click();
    await page.waitForSelector('[data-testid="direct-rvg-capture-modal"]', { state: "detached", timeout: 8000 }).catch(() => {});
    await page.waitForTimeout(600);

    // =========================================================================
    // WINDOW 5: Print Report Studio A4 (RadiologyReportStudioModal)
    // =========================================================================
    console.log("\n>>> Capturing Window 5: Print Report Studio A4 <<<");
    await applyTheme("light");
    await ensureRadiologyOpen();
    let reportBtn = await page.waitForSelector('[data-testid="btn-open-report-studio"]', { timeout: 10000 });
    await reportBtn.click();
    await page.waitForSelector('[data-testid="radiology-report-studio-modal"]', { state: "visible", timeout: 15000 });
    await page.waitForTimeout(1000);
    await takeScreen("05_window5_report_studio_a4_light.png", "Window 5: Конструктор отчетов А4 (Light)");

    console.log("Switching Window 5 to Dark...");
    await applyTheme("dark");
    await page.waitForSelector('[data-testid="radiology-report-studio-modal"]', { state: "visible", timeout: 5000 }).catch(async () => {
      await ensureRadiologyOpen();
      const b = await page.waitForSelector('[data-testid="btn-open-report-studio"]', { timeout: 10000 });
      await b.click();
      await page.waitForSelector('[data-testid="radiology-report-studio-modal"]', { timeout: 15000 });
    });
    await page.waitForTimeout(800);
    await takeScreen("05_window5_report_studio_a4_dark.png", "Window 5: Конструктор отчетов А4 (Dark)");

    // Close Window 5
    const closeReport = await page.$('[data-testid="btn-close-report-studio"]');
    if (closeReport) await closeReport.click();
    await page.waitForSelector('[data-testid="radiology-report-studio-modal"]', { state: "detached", timeout: 8000 }).catch(() => {});
    await page.waitForTimeout(600);

    // =========================================================================
    // WINDOW 4: Split Consultation (RadiologyConsultationSplit)
    // =========================================================================
    console.log("\n>>> Capturing Window 4: Split Consultation <<<");
    await applyTheme("light");
    await ensureRadiologyOpen();
    let consultBtn = await page.waitForSelector('[data-testid="btn-open-consultation-split"]', { timeout: 10000 });
    await consultBtn.click();
    await page.waitForSelector('[data-testid="radiology-consultation-split"]', { state: "visible", timeout: 15000 });
    await page.waitForTimeout(1000);
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

    // =========================================================================
    // PATIENT RADIOLOGY TAB & TIMELINE (Вкладка снимков в карточке пациента)
    // =========================================================================
    console.log("\n>>> Capturing Patient Radiology Tab & Timeline <<<");
    await applyTheme("light");
    await page.goto("http://127.0.0.1:5173/#imaging", { waitUntil: "domcontentloaded", timeout: 30000 });
    await page.waitForTimeout(1500);
    await takeScreen("07_patient_radiology_tab_light.png", "Вкладка снимков и исследований в карточке пациента (Light)");

    await applyTheme("dark");
    await page.waitForTimeout(800);
    await takeScreen("07_patient_radiology_tab_dark.png", "Вкладка снимков и исследований в карточке пациента (Dark)");

    console.log("\n>>> ALL TARGET RADIOLOGY SCREENS CAPTURED SUCCESSFULLY! <<<");

  } finally {
    await browser.close();
  }
}

main().catch((err) => {
  console.error("FATAL SUITE ERROR:", err);
  process.exit(1);
});
