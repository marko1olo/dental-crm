const { chromium } = require("playwright");
const path = require("node:path");
const fs = require("node:fs");

const targetDirs = [
  path.resolve("C:/Clinic_MVP/dental-crm/docs/screenshots/cbct_departments"),
  path.resolve("C:/Clinic_MVP/dental-crm/apps/web/public/screenshots"),
  path.resolve("C:/Users/Admin/.gemini/antigravity/brain/427def17-4b4d-4fe8-adfd-59b7f7177a50"),
];

for (const d of targetDirs) {
  if (!fs.existsSync(d)) fs.mkdirSync(d, { recursive: true });
}

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
    profile: { id: "c-1", clinicName: "Стоматология ДЕНТЕ Премиум", mode: "small_clinic" },
    staff: [{ id: "doc-1", fullName: "Д-р Воронов Алексей Владимирович", role: "owner", active: true }],
    chairs: [],
  },
  patients: [{ id: "pat-1", fullName: "Захаров Игорь Дмитриевич", status: "active", balanceRub: 0 }],
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
      return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(studiesArray) });
    }
    if (url.includes("/api/patients")) {
      return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(mockDashboard.patients) });
    }
    return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(mockDashboard) });
  });
}

async function takeScreen(page, fileName, description) {
  const p1 = path.join(targetDirs[0], fileName);
  if (fs.existsSync(p1)) {
    try { fs.unlinkSync(p1); } catch {}
  }
  await page.screenshot({ path: p1, fullPage: false, timeout: 30000 });
  for (let i = 1; i < targetDirs.length; i++) {
    fs.copyFileSync(p1, path.join(targetDirs[i], fileName));
  }
  const stat = fs.statSync(p1);
  console.log(`[CAPTURED] ${fileName} (${description}) — ${(stat.size / 1024).toFixed(1)} KB`);
}

async function main() {
  console.log("=== STEP 1: OPENING BROWSER ===");
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

    await ctx.addInitScript(() => {
      localStorage.setItem("dente_clinic_token", "live-inquisition-clinic-token");
      localStorage.setItem("dente_staff_token", "live-inquisition-staff-token");
      localStorage.setItem("dente_active_role", "owner");
      localStorage.setItem("dente_theme_mode", "dark");
      localStorage.setItem("dente_active_patient_id", "pat-1");
      localStorage.setItem("dente_tour_completed", "true");
    });

    const page = await ctx.newPage();
    await setupPageRoutes(page);

    console.log("Navigating to http://127.0.0.1:5173/#imaging...");
    await page.goto("http://127.0.0.1:5173/#imaging", { waitUntil: "domcontentloaded", timeout: 35000 });
    await page.waitForTimeout(2000);

    const openRadBtn = await page.waitForSelector(
      '[data-testid="imaging-open-radiology-module"], [data-testid="btn-open-radiology-hub"]',
      { timeout: 15000 }
    ).catch(() => null);
    if (openRadBtn) {
      await openRadBtn.click();
      await page.waitForTimeout(1000);
    }

    const openStudioBtn = await page.waitForSelector('[data-testid="btn-open-3d-cbct-studio"]', { timeout: 15000 });
    await openStudioBtn.click();
    await page.waitForSelector('[data-testid="cbct-studio-modal"]', { state: "visible", timeout: 35000 });
    console.log("Studio modal opened!");
    await page.waitForTimeout(1000);

    // Click "Эндодонтия" BEFORE loading demo volume
    console.log("Clicking Эндодонтия tab in header...");
    await page.click('button:has-text("Эндодонтия")');
    await page.waitForTimeout(1000);

    // Now click load demo
    const demoBtn = await page.$('[data-testid="cbct-btn-load-demo-empty"], button:has-text("Демо-исследование")');
    if (demoBtn) {
      console.log("Clicking load demo volume button...");
      await demoBtn.click();
      console.log("Waiting 15s for volume to unpack and load into EndoWorkspace...");
      await page.waitForTimeout(15000);
    }

    // Capture Dark Theme
    console.log("Taking dark screenshots...");
    await takeScreen(page, "01_endo_compass_workspace_dark.png", "Endo Compass 3D Studio (Dark Theme, Tooth 36)");

    const tooth16Btn = await page.$('[data-testid="cbct-endo-tooth-btn-16"], button:has-text("16")');
    if (tooth16Btn) {
      await tooth16Btn.click();
      await page.waitForTimeout(1000);
      await takeScreen(page, "02_endo_compass_tooth_16_mb2_dark.png", "Endo Compass 3D (Dark Theme, Tooth 16 MB2)");
    }

    // Switch to Light Theme
    console.log("Switching to light theme...");
    await page.evaluate(() => {
      document.documentElement.setAttribute("data-theme", "light");
      document.body.setAttribute("data-theme", "light");
      document.documentElement.classList.remove("dark");
      document.documentElement.classList.add("light");
      document.body.classList.remove("dark");
      document.body.classList.add("light");
      document.documentElement.style.colorScheme = "light";
    });
    await page.waitForTimeout(1000);

    await takeScreen(page, "03_endo_compass_tooth_16_mb2_light.png", "Endo Compass 3D (Light Theme, Tooth 16 MB2)");

    const tooth36Btn = await page.$('[data-testid="cbct-endo-tooth-btn-36"], button:has-text("36")');
    if (tooth36Btn) {
      await tooth36Btn.click();
      await page.waitForTimeout(1000);
    }
    await takeScreen(page, "04_endo_compass_workspace_light.png", "Endo Compass 3D Studio (Light Theme, Tooth 36)");

    console.log("ALL DONE SUCCESSFULLY!");
  } finally {
    await browser.close();
  }
}

main().catch((err) => {
  console.error("Script error:", err);
  process.exit(1);
});
