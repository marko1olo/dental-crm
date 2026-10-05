const { chromium } = require("playwright");
const path = require("path");
const fs = require("fs");

const targetDirs = [
  path.resolve("C:/Clinic_MVP/dental-crm/docs/screenshots/cbct_departments"),
  path.resolve("C:/Clinic_MVP/dental-crm/apps/web/public/screenshots"),
  path.resolve("C:/Users/Admin/.gemini/antigravity/brain/427def17-4b4d-4fe8-adfd-59b7f7177a50"),
];

for (const d of targetDirs) {
  if (!fs.existsSync(d)) fs.mkdirSync(d, { recursive: true });
}

async function takeScreen(page, fileName, description) {
  const p1 = path.join(targetDirs[0], fileName);
  if (fs.existsSync(p1)) {
    try { fs.unlinkSync(p1); } catch {}
  }
  await page.screenshot({ path: p1, fullPage: false, timeout: 25000 });
  for (let i = 1; i < targetDirs.length; i++) {
    fs.copyFileSync(p1, path.join(targetDirs[i], fileName));
  }
  const stat = fs.statSync(p1);
  console.log(`[CAPTURED] ${fileName} (${description}) — ${(stat.size / 1024).toFixed(1)} KB`);
}

async function captureThemeSession(theme) {
  console.log(`\n==================================================`);
  console.log(`>>> STARTING HONEST CAPTURE: ${theme.toUpperCase()} <<<`);
  console.log(`==================================================`);

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

    await ctx.addInitScript((th) => {
      localStorage.setItem("dente_clinic_token", "live-inquisition-clinic-token");
      localStorage.setItem("dente_staff_token", "live-inquisition-staff-token");
      localStorage.setItem("dente_active_role", "owner");
      localStorage.setItem("dente_theme_mode", th);
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
    }, theme);

    const page = await ctx.newPage();

    page.on("pageerror", (err) => console.log("[PAGE ERROR]:", err.message));

    // Mock minimal API to prevent ECONNREFUSED console spam
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
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          clinicSettings: { profile: { id: "c-1", clinicName: "Стоматология ДЕНТЕ Премиум" } },
          patients: [{ id: "pat-1", fullName: "Захаров Иван Дмитриевич" }],
          appointments: [],
        }),
      });
    });

    console.log("Navigating to http://127.0.0.1:5173/#schedule...");
    await page.goto("http://127.0.0.1:5173/#schedule", { waitUntil: "networkidle", timeout: 35000 });
    await page.waitForTimeout(1000);

    console.log("Triggering dente:open-cbct-demo event...");
    await page.evaluate(() => {
      window.dispatchEvent(new CustomEvent("dente:open-cbct-demo"));
    });

    console.log("Waiting for cbct-studio-modal...");
    await page.waitForSelector('[data-testid="cbct-studio-modal"]', { timeout: 35000 });
    console.log("CBCT Studio modal opened!");

    // Switch to Endo tab
    console.log(`Selecting Endo Tab (${theme})...`);
    const endoTab = await page.waitForSelector('[data-testid="cbct-nav-tab-endo"]', { timeout: 45000 });
    await endoTab.click({ force: true });
    await page.waitForTimeout(2500);

    // Ensure Endo Workspace and Floating Compass are mounted
    await page.waitForSelector('[data-testid="cbct-workspace-endo-root"]', { timeout: 25000 });
    await page.waitForSelector('[data-testid="cbct-endo-floating-compass"]', { timeout: 25000 });
    console.log("Endo Workspace & Floating Compass are visible!");

    if (theme === "dark") {
      // 1. Tooth 36 (Dark)
      await takeScreen(page, "01_endo_compass_workspace_dark.png", "Отдел 3: Эндодонтический Компас 3D (Зуб 36, Dark)");

      // 2. Tooth 16 with MB2 (Dark)
      console.log("Switching to Tooth 16 (Upper Molar with MB2)...");
      const tooth16Btn = await page.waitForSelector('[data-testid="cbct-endo-tooth-btn-16"]', { timeout: 10000 });
      await tooth16Btn.click({ force: true });
      await page.waitForTimeout(1500);

      await takeScreen(page, "02_endo_compass_tooth_16_mb2_dark.png", "Эндодонтический Компас 3D (Зуб 16 с MB2, Dark)");
    } else {
      // 3. Tooth 16 with MB2 (Light)
      console.log("Switching to Tooth 16 (Upper Molar with MB2)...");
      const tooth16Btn = await page.waitForSelector('[data-testid="cbct-endo-tooth-btn-16"]', { timeout: 10000 });
      await tooth16Btn.click({ force: true });
      await page.waitForTimeout(1500);

      await takeScreen(page, "03_endo_compass_tooth_16_mb2_light.png", "Эндодонтический Компас 3D (Зуб 16 с MB2, Light)");

      // 4. Tooth 36 (Light)
      console.log("Switching to Tooth 36 (Lower Molar MB1/ML/D)...");
      const tooth36Btn = await page.waitForSelector('[data-testid="cbct-endo-tooth-btn-36"]', { timeout: 10000 });
      await tooth36Btn.click({ force: true });
      await page.waitForTimeout(1500);

      await takeScreen(page, "04_endo_compass_workspace_light.png", "Отдел 3: Эндодонтический Компас 3D (Зуб 36, Light)");
    }
  } finally {
    await browser.close();
    console.log(`Browser cleanly closed for ${theme}.`);
  }
}

async function main() {
  await captureThemeSession("dark");
  await captureThemeSession("light");
  console.log("\n>>> ALL 4 HONEST ENDO COMPASS SCREENSHOTS SUCCESSFULLY CAPTURED! <<<");
}

main().catch((err) => {
  console.error("CAPTURE ERROR:", err);
  process.exit(1);
});
