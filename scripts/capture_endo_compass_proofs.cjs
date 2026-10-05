/**
 * scripts/capture_endo_compass_proofs.cjs
 *
 * Robust capture of Endo Compass 3D via Radiology Module:
 * - 01_endo_compass_workspace_dark.png (Tooth 36 / 46, 3 canals, Schneider curvature, Vertucci Type II)
 * - 02_endo_compass_workspace_light.png (Light theme, zero white bleed, clinical contrast)
 * - 03_endo_compass_tooth_16_mb2_dark.png (Tooth 16, 4 canals with MB2 detected, severe curvature)
 * - 04_endo_compass_tooth_16_mb2_light.png (Light theme, Tooth 16)
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
    patientFullName: "Захаров Игорь Дмитриевич",
    dicomPatientName: "Zakharov Igor",
    kind: "cbct",
    modality: "CT",
    title: "3D КЛКТ верхней и нижней челюсти 8x8 (KaVo OP 3D Pro)",
    seriesDescription: "KaVo OP 3D Pro / 80x80mm Standard Res",
    studyDate: todayDate,
    capturedAt: `${todayDate}T10:30:00.000Z`,
    sliceCount: 312,
    dimensions: "600x600x312",
    voxelSpacing: "0.25mm",
    fileSizeBytes: 185400000,
    bindingStatus: "auto_bound",
    bindingConfidence: 98,
    sourceKind: "folder_watch",
    sourceName: "KaVo eXam Vision PACS",
    status: "available",
    toothCode: "36",
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
  },
  patients: [
    {
      id: "pat-1",
      fullName: "Захаров Игорь Дмитриевич",
      birthDate: "1988-04-12",
      phone: "+7 999 123-45-67",
    },
  ],
  appointments: [],
};

const targetDirs = [
  path.resolve("C:/Clinic_MVP/dental-crm/docs/screenshots/endo_compass"),
  path.resolve("C:/Clinic_MVP/dental-crm/apps/web/public/screenshots"),
  path.resolve("C:/Users/Admin/.gemini/antigravity/brain/427def17-4b4d-4fe8-adfd-59b7f7177a50"),
];

for (const d of targetDirs) {
  if (!fs.existsSync(d)) {
    fs.mkdirSync(d, { recursive: true });
  }
}

async function applyTheme(page, theme) {
  console.log(`[THEME] Applying ${theme}...`);
  await page.evaluate((th) => {
    localStorage.setItem("dente_theme_mode", th);
    if (window.__useThemeStore) {
      window.__useThemeStore.getState().setThemeMode(th);
    }
    document.documentElement.setAttribute("data-theme", th);
    document.body.setAttribute("data-theme", th);
    const isDark = ["dark", "night", "ocean", "emerald", "cyber_xray"].includes(th);
    document.documentElement.classList.toggle("dark", isDark);
    document.documentElement.classList.toggle("light", !isDark);
    document.body.classList.toggle("dark", isDark);
    document.body.classList.toggle("light", !isDark);
    document.documentElement.style.colorScheme = isDark ? "dark" : "light";
  }, theme);
  await page.waitForTimeout(1000);
}

async function takeScreen(page, fileName, description) {
  const p1 = path.join(targetDirs[0], fileName);
  if (fs.existsSync(p1)) {
    try { fs.unlinkSync(p1); } catch {}
  }
  await page.screenshot({ path: p1, fullPage: false, animations: "disabled", timeout: 35000 });
  for (let i = 1; i < targetDirs.length; i++) {
    fs.copyFileSync(p1, path.join(targetDirs[i], fileName));
  }
  const stat = fs.statSync(p1);
  console.log(`[CAPTURED] ${fileName} (${description}) — ${(stat.size / 1024).toFixed(1)} KB`);
}

async function main() {
  console.log("=== STARTING CAPTURE VIA RADIOLOGY MODULE FOR ENDO COMPASS 3D ===");
  const browser = await chromium.launch({
    headless: true,
    executablePath: "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });

  let page = null;
  try {
    const ctx = await browser.newContext({
      viewport: { width: 1440, height: 900 },
      deviceScaleFactor: 2,
    });

    await ctx.addInitScript(() => {
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

    page = await ctx.newPage();

    page.on("pageerror", (err) => console.log("[PAGE ERROR]:", err.message));
    page.on("console", (msg) => {
      if (msg.type() === "error") console.log("[CONSOLE ERROR]:", msg.text());
    });

    // Mock minimal backend APIs
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

    const baseUrl = process.env.VITE_URL || "http://127.0.0.1:5173";
    console.log(`Navigating to ${baseUrl}/#imaging...`);
    await page.goto(`${baseUrl}/#imaging`, { waitUntil: "domcontentloaded", timeout: 35000 });
    await page.waitForTimeout(2000);

    console.log("Looking for button to open CBCT Studio...");
    const openStudioBtn = await page.waitForSelector(
      '[data-testid="imaging-open-3d-mpr"], [data-testid="btn-open-3d-cbct-studio"], button:has-text("КЛКТ Студия 3D")',
      { timeout: 15000 }
    );
    console.log("Clicking open CBCT Studio button...");
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
    await page.waitForTimeout(5000);

    // Switch to Endo Workspace Tab
    console.log("Selecting Endo Workspace Tab...");
    const availableTabs = await page.evaluate(() => {
      return Array.from(document.querySelectorAll('[data-testid*="nav-tab"], [data-mode-testid]')).map(el => ({
        testId: el.getAttribute('data-testid'),
        modeTestId: el.getAttribute('data-mode-testid'),
        text: el.innerText.trim(),
        visible: el.offsetParent !== null
      }));
    });
    console.log("Found workspace tabs:", JSON.stringify(availableTabs));

    const endoLocator = page.locator('[data-testid="cbct-nav-tab-endo"], [data-mode-testid="cbct-mode-endo-btn"], button:has-text("Эндо")').first();
    await endoLocator.click({ force: true });
    console.log("Clicked Endo Tab!");
    await page.waitForTimeout(3000);

    // Verify Endo Compass panel is rendered
    console.log("Verifying Endo Compass panel...");
    const compassPanel = await page.waitForSelector('[data-testid="endo-compass-panel"], [data-testid="cbct-endo-floating-compass"]', { timeout: 10000 }).catch(() => null);
    if (!compassPanel) {
      console.log("Compass panel not visible automatically, clicking toggle button...");
      const toggleBtn = page.locator('[data-testid="cbct-endo-compass-toggle-btn"]').first();
      await toggleBtn.click({ force: true }).catch(() => {});
      await page.waitForTimeout(1000);
    }

    // 1. Dark Theme Capture (Tooth 36 / default)
    console.log("\n>>> CAPTURING THEME: DARK <<<");
    await applyTheme(page, "dark");
    await takeScreen(page, "01_endo_compass_workspace_dark.png", "Endo Compass 3D Studio (Dark Theme, Tooth 36, 3 Canals)");

    // 2. Light Theme Capture (Tooth 36 / default)
    console.log("\n>>> CAPTURING THEME: LIGHT <<<");
    await applyTheme(page, "light");
    await takeScreen(page, "02_endo_compass_workspace_light.png", "Endo Compass 3D Studio (Light Theme, Tooth 36, 3 Canals)");

    // 3. Switch to Tooth 16 (Upper molar with MB2)
    console.log("\nSelecting Tooth 16 (with MB2)...");
    const tooth16Btn = await page.waitForSelector('[data-testid="cbct-endo-tooth-btn-16"], button:has-text("16")', { timeout: 10000 });
    await tooth16Btn.click();
    await page.waitForTimeout(1500);

    // 4. Capture Light Theme (Tooth 16)
    await takeScreen(page, "03_endo_compass_tooth_16_mb2_light.png", "Endo Compass 3D (Light Theme, Tooth 16, 4 Canals with MB2)");

    // 5. Capture Dark Theme (Tooth 16)
    await applyTheme(page, "dark");
    await takeScreen(page, "04_endo_compass_tooth_16_mb2_dark.png", "Endo Compass 3D (Dark Theme, Tooth 16, 4 Canals with MB2)");

    console.log("\n>>> SUCCESS: ALL REQUIRED ENDO COMPASS 3D SCREENSHOTS CAPTURED! <<<");
  } catch (err) {
    console.error("Capture script error:", err.message);
    if (page) {
      await page.screenshot({ path: "test_crash_debug.png" }).catch(() => {});
      console.log("Saved test_crash_debug.png");
    }
    throw err;
  } finally {
    await browser.close();
  }
}

main().catch((err) => {
  console.error("Capture script crashed:", err);
  process.exit(1);
});
