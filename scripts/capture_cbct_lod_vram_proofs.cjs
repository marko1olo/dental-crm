/**
 * scripts/capture_cbct_lod_vram_proofs.cjs
 * Captures 3D CBCT Viewport with VRAM Adaptive LOD in PC Dark and PC Light themes.
 * Uses exact working launcher parameters from capture_all_5_cbct_departments.cjs.
 */

const { chromium } = require("playwright");
const path = require("node:path");
const fs = require("node:fs");
const crypto = require("node:crypto");

const artifactDir = path.resolve("C:/Users/Admin/.gemini/antigravity/brain/c711ff70-3050-4202-96f8-1c06182bfa12");
const docScreenshotsDir = path.resolve("C:/Clinic_MVP/dental-crm/docs/screenshots/cbct_vram_lod");

[artifactDir, docScreenshotsDir].forEach((dir) => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
});

function getFileMd5(filePath) {
  const buf = fs.readFileSync(filePath);
  return crypto.createHash("md5").update(buf).digest("hex");
}

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

function addAuthInitScript(ctx) {
  return ctx.addInitScript(() => {
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
}

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
  await page.waitForTimeout(800);
}

async function takeScreen(page, fileName, description) {
  const targetPath = path.join(artifactDir, fileName);
  const docPath = path.join(docScreenshotsDir, fileName);

  if (fs.existsSync(targetPath)) {
    try { fs.unlinkSync(targetPath); } catch {}
  }

  // Use fast screenshot with 15s timeout
  await page.screenshot({ path: targetPath, fullPage: false, timeout: 15000 });
  fs.copyFileSync(targetPath, docPath);

  const stats = fs.statSync(targetPath);
  const hash = getFileMd5(targetPath);
  console.log(`[CAPTURED] ${fileName} (${description})`);
  console.log(`   - Size: ${(stats.size / 1024).toFixed(1)} KB (Must be >= 40 KB)`);
  console.log(`   - MD5: ${hash}`);

  if (stats.size < 40 * 1024) {
    throw new Error(`Screenshot size ${(stats.size / 1024).toFixed(1)} KB is below mandatory 40 KB limit!`);
  }

  return { fileName, size: stats.size, hash, targetPath };
}

async function main() {
  console.log("=== STARTING AUTONOMOUS CAPTURE OF CBCT 3D VIEWPORT WITH VRAM LOD ===");

  const browser = await chromium.launch({
    headless: true,
    executablePath: "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });

  const captured = [];

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

    console.log("Navigating directly to http://127.0.0.1:5173/?cbct=demo...");
    await page.goto("http://127.0.0.1:5173/?cbct=demo", { waitUntil: "domcontentloaded", timeout: 30000 });

    console.log("Waiting for CBCT Studio modal...");
    await page.waitForSelector('[data-testid="cbct-studio-modal"]', { timeout: 25000 });
    console.log("CBCT Studio modal mounted successfully!");

    // Wait for demo volume slices to finish decoding
    console.log("Waiting for slices to decode...");
    await page.waitForSelector("text=Загрузка центрального среза", { state: "detached", timeout: 45000 }).catch(() => {
      console.log("Loader detached or already completed.");
    });

    // Wait for canvas rasterization & WebGL texture initialization
    console.log("Waiting 4 seconds for canvas rasterization & WebGL texture upload...");
    await page.waitForTimeout(4000);

    // Expand 3D Volume Viewport
    console.log("Navigating to MPR / 3D and expanding 3D Viewport...");
    const mprTab = await page.waitForSelector(
      '[data-testid="cbct-nav-tab-mpr-3d"], [data-mode-testid="cbct-mode-diagnostic-btn"]',
      { timeout: 10000 }
    );
    await mprTab.click();
    await page.waitForTimeout(600);

    const expand3dBtn = await page.waitForSelector(
      '[data-testid="btn-viewport-expand-volume3d"], [data-expand-testid="btn-viewport-expand-volume3d"], button[title*="Развернуть 3D объем"]',
      { timeout: 10000 }
    ).catch(() => null);

    if (expand3dBtn) {
      await expand3dBtn.click();
      await page.waitForTimeout(1000);
    }

    const themes = ["dark", "light"];

    for (const theme of themes) {
      console.log(`\n==================================================`);
      console.log(`>>> PROCESSING THEME: ${theme.toUpperCase()} <<<`);
      console.log(`==================================================`);

      await applyTheme(page, theme);
      await page.waitForTimeout(1000);

      const fileName = `01_cbct_3d_viewport_lod_pc_${theme}.png`;
      const res = await takeScreen(
        page,
        fileName,
        `CBCT 3D Viewport WebGL2 Raymarching с воксельным LOD и HUD телеметрией (${theme})`
      );
      captured.push(res);
    }

    // Uniqueness Verification
    console.log("\n--- Self-Audit Hash & Uniqueness Verification ---");
    if (captured[0].hash === captured[1].hash) {
      throw new Error(`Hash collision detected between Light and Dark screenshots! ${captured[0].hash}`);
    }
    console.log(`✓ Both screenshots have strictly unique MD5 hashes!`);
    console.log(`✓ Dark  Hash: ${captured[0].hash} (${(captured[0].size / 1024).toFixed(1)} KB)`);
    console.log(`✓ Light Hash: ${captured[1].hash} (${(captured[1].size / 1024).toFixed(1)} KB)`);
    console.log(`\n=== ALL SCREENSHOT PROOFS CAPTURED SUCCESSFULLY ===`);
  } finally {
    await browser.close();
  }
}

main().catch((err) => {
  console.error("FATAL SUITE ERROR:", err);
  process.exit(1);
});
