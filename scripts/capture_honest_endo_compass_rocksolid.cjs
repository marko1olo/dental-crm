/**
 * scripts/capture_honest_endo_compass_rocksolid.cjs
 * 
 * Rock-solid capture script for Endo Compass 3D screenshots:
 * - 01_endo_compass_workspace_dark.png (Tooth 36, Dark)
 * - 02_endo_compass_tooth_16_mb2_dark.png (Tooth 16 with MB2, Dark)
 * - 03_endo_compass_tooth_16_mb2_light.png (Tooth 16 with MB2, Light)
 * - 04_endo_compass_workspace_light.png (Tooth 36, Light)
 */
const { chromium } = require("playwright");
const path = require("node:path");
const fs = require("node:fs");

const todayDate = new Date().toLocaleDateString("en-CA");

const targetDirs = [
  path.resolve("C:/Clinic_MVP/dental-crm/docs/screenshots/cbct_departments"),
  path.resolve("C:/Clinic_MVP/dental-crm/apps/web/public/screenshots"),
  path.resolve("C:/Users/Admin/.gemini/antigravity/brain/427def17-4b4d-4fe8-adfd-59b7f7177a50"),
];

for (const d of targetDirs) {
  if (!fs.existsSync(d)) fs.mkdirSync(d, { recursive: true });
}

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
      organizationId: "00000000-0000-0000-0000-000000000001",
      fullName: "Ковалёв Роман Станиславович",
      birthDate: "1988-04-12",
      gender: "male",
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
  appointments: [],
  imagingStudies: [
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
  ],
  serviceCatalog: [],
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
        body: JSON.stringify({ studies: mockDashboard.imagingStudies }),
      });
    }
    return route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(mockDashboard),
    });
  });
}

async function addAuthInitScript(ctx) {
  await ctx.addInitScript(() => {
    localStorage.setItem("dente_clinic_token", "live-inquisition-clinic-token");
    localStorage.setItem("dente_staff_token", "live-inquisition-staff-token");
    localStorage.setItem("dente_active_role", "owner");
    localStorage.setItem("dente_theme_mode", "dark");
    localStorage.setItem("dente_active_patient_id", "pat-1");
    localStorage.setItem("dente_tour_completed", "true");
    localStorage.setItem("dente_training_mode_completed", "true");
    localStorage.setItem("dente_training_active", "false");
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
}

async function runCaptureSession(theme) {
  console.log("==================================================");
  console.log(`>>> LAUNCHING HONEST ENDO COMPASS: ${theme.toUpperCase()} <<<`);
  console.log("==================================================");

  const browser = await chromium.launch({
    headless: true,
    executablePath: "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
    args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-dev-shm-usage"],
  });

  try {
    const ctx = await browser.newContext({
      viewport: { width: 1440, height: 900 },
      deviceScaleFactor: 2,
    });
    await addAuthInitScript(ctx);
    const page = await ctx.newPage();

    page.on("pageerror", (err) => console.error("[BROWSER ERROR]:", err.message));

    await setupPageRoutes(page);

    console.log(`1. Navigating to http://127.0.0.1:5173/#imaging (${theme})...`);
    await page.goto("http://127.0.0.1:5173/#imaging", { waitUntil: "domcontentloaded", timeout: 45000 });
    await page.waitForSelector(".app-shell", { timeout: 30000 });

    console.log("2. Injecting synthetic CBCT volume into window.__cbctDemoVolume...");
    await page.evaluate(() => {
      const width = 64;
      const height = 64;
      const depth = 64;
      const spX = 0.5;
      const spY = 0.5;
      const spZ = 0.5;
      const totalVoxels = width * height * depth;
      const data = new Int16Array(totalVoxels);

      for (let z = 0; z < depth; z++) {
        for (let y = 0; y < height; y++) {
          for (let x = 0; x < width; x++) {
            const idx = z * width * height + y * width + x;
            const distFromCenter = Math.hypot(x - width / 2, y - height / 2, z - depth / 2);
            if (distFromCenter < 12) {
              data[idx] = 1450;
            } else if (distFromCenter < 22) {
              data[idx] = 850;
            } else if (distFromCenter < 28) {
              data[idx] = 40;
            } else {
              data[idx] = -1000;
            }
          }
        }
      }

      const vol = {
        id: "cbct-vol-synthetic-kavo-3d",
        dimensions: { width, height, depth },
        spacingMm: { x: spX, y: spY, z: spZ },
        originMm: {
          x: -(width * spX) / 2,
          y: -(height * spY) / 2,
          z: -(depth * spZ) / 2,
        },
        physicalSizeMm: {
          x: width * spX,
          y: height * spY,
          z: depth * spZ,
        },
        data: data,
        minHU: -1000,
        maxHU: 1600,
        defaultWindowWidth: 4025,
        defaultWindowLevel: 525,
        isDisposed: false,
      };

      window.__cbctDemoVolume = vol;
      window.dispatchEvent(new CustomEvent("dente-load-cbct-volume", { detail: vol }));
    });

    console.log("3. Opening RadiologyModule modal...");
    const openRadBtn = await page.waitForSelector('[data-testid="imaging-open-radiology-module"]', { timeout: 15000 });
    await openRadBtn.click();
    await page.waitForSelector('[data-testid="radiology-module-container"]', { timeout: 15000 });

    console.log("4. Opening 3D CBCT Studio...");
    const openCbctBtn = await page.waitForSelector('[data-testid="btn-open-3d-cbct-studio"]', { timeout: 20000 });
    await openCbctBtn.click();
    await page.waitForSelector('[data-testid="cbct-studio-modal"]', { timeout: 60000 });
    console.log("CBCT Studio modal is visible!");

    await page.evaluate(() => {
      if (window.__cbctDemoVolume) {
        window.dispatchEvent(new CustomEvent("dente-load-cbct-volume", { detail: window.__cbctDemoVolume }));
      }
    });
    await page.waitForTimeout(1500);

    // Switch to Endo tab
    console.log("5. Switching to Endo Tab...");
    const endoTab = await page.waitForSelector(
      '[data-testid="cbct-studio-modal"] [data-testid="cbct-nav-tab-endo"]',
      { timeout: 15000 }
    );
    await endoTab.click();

    // Wait for Endo Workspace root & Floating Compass
    console.log("6. Waiting for Endo Workspace & Floating Compass...");
    await page.waitForSelector('[data-testid="cbct-workspace-endo-root"]', { timeout: 20000 });
    await page.waitForSelector('[data-testid="cbct-endo-floating-compass"]', { timeout: 20000 });
    console.log("Endo Workspace & Floating Compass are visible!");

    // Apply theme
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

    // Suppress toasts to prevent Playwright screenshot animation lock
    await page.addStyleTag({ content: '.toast-container, [role="alert"], .global-toast { display: none !important; }' });

    async function takeScreen(fileName, description) {
      const p1 = path.join(targetDirs[0], fileName);
      if (fs.existsSync(p1)) {
        try { fs.unlinkSync(p1); } catch {}
      }
      await page.screenshot({ path: p1, fullPage: false, timeout: 60000 });
      for (let i = 1; i < targetDirs.length; i++) {
        fs.copyFileSync(p1, path.join(targetDirs[i], fileName));
      }
      const stat = fs.statSync(p1);
      console.log(`[CAPTURED] ${fileName} (${description}) — ${(stat.size / 1024).toFixed(1)} KB`);
    }

    if (theme === "dark") {
      // 1. Tooth 36 (Dark)
      console.log("\n--- Capturing 01: Tooth 36 (Dark) ---");
      const tooth36Btn = await page.waitForSelector('[data-testid="cbct-endo-tooth-btn-36"]', { timeout: 10000 });
      await tooth36Btn.click({ force: true });
      await page.waitForTimeout(2000);
      await takeScreen("01_endo_compass_workspace_dark.png", "Отдел 3: Эндодонтический Компас 3D (Зуб 36, Dark)");

      // 2. Tooth 16 with MB2 (Dark)
      console.log("\n--- Switching to Tooth 16 (Upper Molar with MB2)... ---");
      const tooth16Btn = await page.waitForSelector('[data-testid="cbct-endo-tooth-btn-16"]', { timeout: 10000 });
      await tooth16Btn.click({ force: true });
      await page.waitForTimeout(2000);
      await takeScreen("02_endo_compass_tooth_16_mb2_dark.png", "Эндодонтический Компас 3D (Зуб 16 с MB2, Dark)");
    } else {
      // 4. Tooth 36 (Light) - captured first since it is the default selection!
      console.log("\n--- Capturing 04: Tooth 36 (Light)... ---");
      const tooth36Btn = await page.waitForSelector('[data-testid="cbct-endo-tooth-btn-36"]', { timeout: 10000 });
      await tooth36Btn.click({ force: true });
      await page.waitForTimeout(2000);
      await takeScreen("04_endo_compass_workspace_light.png", "Отдел 3: Эндодонтический Компас 3D (Зуб 36, Light)");

      // 3. Tooth 16 with MB2 (Light)
      console.log("\n--- Capturing 03: Tooth 16 with MB2 (Light)... ---");
      const tooth16Btn = await page.waitForSelector('[data-testid="cbct-endo-tooth-btn-16"]', { timeout: 10000 });
      await tooth16Btn.click({ force: true });
      await page.waitForTimeout(2000);
      await takeScreen("03_endo_compass_tooth_16_mb2_light.png", "Эндодонтический Компас 3D (Зуб 16 с MB2, Light)");
    }

    console.log(`>>> ${theme.toUpperCase()} SESSION FINISHED! <<<`);

  } finally {
    await browser.close();
  }
}

async function main() {
  await runCaptureSession("dark");
  await runCaptureSession("light");
  console.log("\n>>> ALL 4 HONEST ENDO COMPASS SCREENSHOTS SUCCESSFULLY CAPTURED! <<<");
}

main().catch((err) => {
  console.error("FATAL SUITE ERROR:", err);
  process.exit(1);
});
