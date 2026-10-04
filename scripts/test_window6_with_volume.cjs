/**
 * scripts/test_window6_with_volume.cjs
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
    modeHints: [],
    soloDoctorMode: false,
  },
  shiftIntelligence: {
    modeFit: { mode: "small_clinic", title: "Оптимальный режим", fitScore: 100, blockers: [], upgrades: [], lowFrictionNextStep: "ready" },
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
        body: JSON.stringify(mockDashboard.imagingStudies),
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
    path.resolve("C:/Users/Admin/.gemini/antigravity/brain/a591bf64-c0cf-4d13-ae1c-e66e6a8f9401"),
    path.resolve("C:/Clinic_MVP/dental-crm/docs/screenshots/radiology_windows"),
  ];

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

    console.log("Navigating to http://127.0.0.1:5173/#imaging...");
    await page.goto("http://127.0.0.1:5173/#imaging", { waitUntil: "domcontentloaded", timeout: 45000 });
    await page.waitForSelector(".app-shell", { timeout: 30000 });

    console.log("Injecting synthetic CBCT volume into window.__cbctDemoVolume...");
    await page.evaluate(() => {
      const width = 64;
      const height = 64;
      const depth = 64;
      const spX = 0.5;
      const spY = 0.5;
      const spZ = 0.5;
      const totalVoxels = width * height * depth;
      const data = new Int16Array(totalVoxels);

      // Model mandible/teeth arch in 3D:
      for (let z = 0; z < depth; z++) {
        for (let y = 0; y < height; y++) {
          for (let x = 0; x < width; x++) {
            const idx = z * (width * height) + y * width + x;
            // Arch curve: y approx 0.02 * (x - 32)^2 + 18
            const archY = 0.025 * Math.pow(x - 32, 2) + 16;
            const distToArch = Math.abs(y - archY);
            if (distToArch < 4 && z >= 16 && z <= 48) {
              data[idx] = 1600; // Cortical bone & teeth
            } else if (distToArch < 7 && z >= 12 && z <= 52) {
              data[idx] = 350; // Trabecular bone
            } else if (distToArch < 12 && z >= 8 && z <= 56) {
              data[idx] = 40; // Soft tissue
            } else {
              data[idx] = -1000; // Air
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
      console.log("[INJECTED] window.__cbctDemoVolume set successfully!");
    });

    console.log("Opening RadiologyModule modal...");
    const openRadBtn = await page.waitForSelector('[data-testid="imaging-open-radiology-module"]', { timeout: 15000 });
    await openRadBtn.click();
    await page.waitForSelector('[data-testid="radiology-module-container"]', { timeout: 15000 });

    console.log("Opening 3D CBCT Studio...");
    const openCbctBtn = await page.waitForSelector('[data-testid="btn-open-3d-cbct-studio"]', { timeout: 10000 });
    await openCbctBtn.click();
    await page.waitForSelector('[data-testid="cbct-studio-modal"]', { timeout: 20000 });
    console.log("CBCT Studio modal is visible!");

    // Check if volume is loaded or if custom load needs dispatch
    await page.evaluate(() => {
      if (window.__cbctDemoVolume) {
        window.dispatchEvent(new CustomEvent("dente-load-cbct-volume", { detail: window.__cbctDemoVolume }));
      }
    });
    await page.waitForTimeout(1500);

    // Click Panoramic tab inside CBCT Studio modal
    console.log("Switching to Panoramic (ОПТГ) / 50-50 layout...");
    const panoTab = await page.waitForSelector(
      '[data-testid="cbct-studio-modal"] [data-testid="cbct-nav-tab-panorama"]',
      { timeout: 15000 }
    );
    await panoTab.click();
    console.log("Clicked Panoramic tab!");

    // Wait for panoramic workspace containers
    await page.waitForSelector(
      '[data-testid="cbct-panoramic-dominant-container"], [data-testid="cbct-workspace-panoramic-root"], [data-testid="btn-viewport-expand-panoramic"]',
      { timeout: 20000 }
    );
    await page.waitForTimeout(2000);

    async function applyTheme(th) {
      await page.evaluate((theme) => {
        localStorage.setItem("dente_theme_mode", theme);
        if (window.__useThemeStore) {
          window.__useThemeStore.getState().setThemeMode(theme);
        }
        document.documentElement.setAttribute("data-theme", theme);
        const isDark = ["dark", "night", "ocean", "emerald", "cyber_xray"].includes(theme);
        document.documentElement.classList.toggle("dark", isDark);
        document.documentElement.classList.toggle("light", !isDark);
        document.documentElement.style.colorScheme = isDark ? "dark" : "light";
      }, th);
      await page.waitForTimeout(600);
    }

    async function takeScreen(fileName, description) {
      const p1 = path.join(targetDirs[0], fileName);
      if (fs.existsSync(p1)) {
        try { fs.unlinkSync(p1); } catch {}
      }
      await page.screenshot({ path: p1, fullPage: false, animations: "disabled", timeout: 30000 });
      for (let i = 1; i < targetDirs.length; i++) {
        fs.copyFileSync(p1, path.join(targetDirs[i], fileName));
      }
      const stat = fs.statSync(p1);
      console.log(`[CAPTURED] ${fileName} (${description}) — ${(stat.size / 1024).toFixed(1)} KB`);
    }

    console.log("Capturing Window 6 Light Theme...");
    await applyTheme("light");
    await page.waitForTimeout(1000);
    await takeScreen("06_window6_cbct_picasso_50_50_light.png", "Window 6: 3D КЛКТ Studio Picasso 50/50 (Light)");

    console.log("Capturing Window 6 Dark Theme...");
    await applyTheme("dark");
    await page.waitForTimeout(1000);
    await takeScreen("06_window6_cbct_picasso_50_50_dark.png", "Window 6: 3D КЛКТ Studio Picasso 50/50 (Dark)");

    console.log("\n>>> WINDOW 6 SCREENSHOTS COMPLETED SUCCESSFULLY! <<<");

  } finally {
    await browser.close();
  }
}

main().catch((err) => {
  console.error("FATAL SUITE ERROR:", err);
  process.exit(1);
});
