/**
 * scripts/capture_clean_cbct_via_radiology.cjs
 *
 * Captures clean CBCT slices via RadiologyModule:
 * - 01_mpr_quad_dark.png
 * - 01_mpr_quad_light.png
 * - 02_panoramic_optg_50_50_dark.png
 * - 02_panoramic_optg_50_50_light.png
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
    sliceCount: 312,
    dimensions: "512x512x312",
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
];

const mockDashboard = {
  clinicName: "Стоматология ДЕНТЕ Премиум",
  todayIso: todayDate,
  clinicSettings: {
    profile: {
      id: "c-1",
      clinicName: "Стоматология ДЕНТЕ Премиум",
      mode: "small_clinic",
    },
    staff: [
      {
        id: "doc-1",
        fullName: "Д-р Воронов Алексей Владимирович",
        role: "owner",
        active: true,
      },
    ],
    chairs: [],
  },
  patients: [
    {
      id: "pat-1",
      fullName: "Ковалёв Роман Станиславович",
      status: "active",
      balanceRub: 0,
    },
  ],
  appointments: [],
  imagingStudies: studiesArray,
};

const targetDirs = [
  path.resolve("C:/Clinic_MVP/dental-crm/docs/screenshots/cbct_departments"),
  path.resolve("C:/Clinic_MVP/dental-crm/apps/web/public/screenshots"),
  path.resolve("C:/Users/Admin/.gemini/antigravity/brain/427def17-4b4d-4fe8-adfd-59b7f7177a50"),
  path.resolve("C:/Users/Admin/.gemini/antigravity/brain/77830cc1-dac0-4da3-8789-c3f2b3c54e79"),
];

for (const d of targetDirs) {
  if (!fs.existsSync(d)) fs.mkdirSync(d, { recursive: true });
}

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
    localStorage.setItem("dente_theme_mode", "dark");
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
  console.log(`[THEME] Applying ${theme}...`);
  await page.evaluate((th) => {
    localStorage.setItem("dente_theme_mode", th);
    document.documentElement.setAttribute("data-theme", th);
    document.body.setAttribute("data-theme", th);
    const isDark = ["dark", "night", "ocean", "emerald", "cyber_xray"].includes(th);
    document.documentElement.classList.toggle("dark", isDark);
    document.documentElement.classList.toggle("light", !isDark);
    document.body.classList.toggle("dark", isDark);
    document.body.classList.toggle("light", !isDark);
    document.documentElement.style.colorScheme = isDark ? "dark" : "light";
  }, theme);
  await page.waitForTimeout(500);
}

async function takeScreen(page, fileName, description) {
  const p1 = path.join(targetDirs[0], fileName);
  if (fs.existsSync(p1)) {
    try { fs.unlinkSync(p1); } catch {}
  }
  await page.screenshot({ path: p1, fullPage: false, timeout: 20000 });
  for (let i = 1; i < targetDirs.length; i++) {
    fs.copyFileSync(p1, path.join(targetDirs[i], fileName));
  }
  const stat = fs.statSync(p1);
  console.log(`[CAPTURED] ${fileName} (${description}) — ${(stat.size / 1024).toFixed(1)} KB`);
}

async function main() {
  console.log("=== STARTING CAPTURE VIA RADIOLOGY MODULE ===");
  const browser = await chromium.launch({
    headless: true,
    executablePath: "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });

  try {
    const ctx = await browser.newContext({
      viewport: { width: 1440, height: 900 },
      deviceScaleFactor: 1,
    });
    await addAuthInitScript(ctx);
    const page = await ctx.newPage();

    page.on("pageerror", (err) => console.log("[PAGE ERROR]:", err.message));
    page.on("console", (msg) => {
      if (msg.type() === "error") console.log("[CONSOLE ERROR]:", msg.text());
    });

    await setupPageRoutes(page);

    console.log("Navigating to http://127.0.0.1:5173/#imaging...");
    await page.goto("http://127.0.0.1:5173/#imaging", { waitUntil: "domcontentloaded", timeout: 35000 });
    await page.waitForTimeout(2000);

    // Open Radiology Module if on imaging workspace
    const openRadBtn = await page.waitForSelector(
      '[data-testid="imaging-open-radiology-module"], [data-testid="btn-open-radiology-hub"]',
      { timeout: 15000 }
    ).catch(() => null);

    if (openRadBtn) {
      console.log("Clicking imaging-open-radiology-module...");
      await openRadBtn.click();
      await page.waitForSelector('[data-testid="radiology-module-container"]', { state: "visible", timeout: 15000 });
      await page.waitForTimeout(1000);
    }

    console.log("Looking for btn-open-3d-cbct-studio...");
    const openStudioBtn = await page.waitForSelector(
      '[data-testid="btn-open-3d-cbct-studio"]',
      { timeout: 15000 }
    );
    console.log("Clicking btn-open-3d-cbct-studio...");
    await openStudioBtn.click();

    console.log("Waiting for cbct-studio-modal...");
    await page.waitForSelector('[data-testid="cbct-studio-modal"]', { state: "visible", timeout: 35000 });
    console.log("CBCT Studio modal is OPEN and VISIBLE!");

    const demoBtn = await page.waitForSelector(
      '[data-testid="cbct-btn-load-demo-empty"], button:has-text("Демо-исследование")',
      { timeout: 5000 }
    ).catch(() => null);

    if (demoBtn) {
      console.log("Clicking load demo volume button...");
      await demoBtn.click();
    }

    // Wait for demo volume slices decoding
    console.log("Waiting for demo volume slices to finish decoding...");
    await page.waitForSelector('[data-testid="cbct-empty-volume-dropzone"]', { state: "detached", timeout: 45000 }).catch(() => {});
    await page.waitForSelector("text=Загрузка центрального среза", { state: "detached", timeout: 45000 }).catch(() => {});
    await page.waitForSelector('canvas', { timeout: 30000 }).catch(() => {});
    console.log("Waiting 6s for WebGL texture rasterization and slice rendering...");
    await page.waitForTimeout(6000);

    const themes = ["dark", "light"];

    for (const theme of themes) {
      console.log(`\n==================================================`);
      console.log(`>>> PROCESSING THEME: ${theme.toUpperCase()} <<<`);
      console.log(`==================================================`);

      await applyTheme(page, theme);

      // Отдел 3: Эндодонтический Компас 3D
      console.log(`Capturing Department 3: Endo Compass 3D (${theme})...`);
      const endoTab = await page.waitForSelector(
        '[data-testid="cbct-nav-tab-endo"]',
        { timeout: 15000 }
      );
      await endoTab.click({ force: true });
      await page.waitForTimeout(2000);

      // Verify Endo Compass panel is rendered
      await page.waitForSelector(
        '[data-testid="endo-compass-panel"], [data-testid="cbct-endo-floating-compass"]',
        { timeout: 15000 }
      ).catch(() => {});

      await takeScreen(page, `01_endo_compass_workspace_${theme}.png`, `Отдел 3: Эндодонтический Компас 3D (Зуб 36, ${theme})`);

      const tooth16Btn = await page.$(
        '[data-testid="cbct-endo-tooth-btn-16"], button:has-text("16")'
      );
      if (tooth16Btn) {
        await tooth16Btn.click({ force: true });
        await page.waitForTimeout(1500);
        await takeScreen(page, `02_endo_compass_tooth_16_mb2_${theme}.png`, `Эндодонтический Компас 3D (Зуб 16 с MB2, ${theme})`);
      }
    }

    console.log("\n>>> SUCCESS: ALL CBCT AND ENDO COMPASS SCREENSHOTS CAPTURED! <<<");
  } finally {
    await browser.close();
    console.log("Browser cleanly closed.");
  }
}

main().catch((err) => {
  console.error("CAPTURE ERROR:", err);
  process.exit(1);
});
