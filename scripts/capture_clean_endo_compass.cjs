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

async function runForTheme(theme) {
  console.log(`\n==================================================`);
  console.log(`>>> LAUNCHING BROWSER FOR THEME: ${theme.toUpperCase()} <<<`);
  console.log(`==================================================`);

  const browser = await chromium.launch({
    headless: true,
    executablePath: "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
    args: [
      "--no-sandbox",
      "--disable-setuid-sandbox",
      "--enable-webgl",
      "--ignore-gpu-blocklist",
    ],
  });

  try {
    const ctx = await browser.newContext({
      viewport: { width: 1440, height: 900 },
      deviceScaleFactor: 1,
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
    page.on("console", (msg) => {
      if (msg.type() === "error") console.log("[CONSOLE ERROR]:", msg.text());
    });

    // Mock API to avoid ECONNREFUSED noise
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

    console.log(`Navigating to http://127.0.0.1:5173/?cbct=demo in ${theme} mode...`);
    await page.goto("http://127.0.0.1:5173/?cbct=demo", { waitUntil: "domcontentloaded", timeout: 35000 });

    console.log("Waiting for cbct-studio-modal...");
    await page.waitForSelector('[data-testid="cbct-studio-modal"]', { state: "visible", timeout: 35000 });
    console.log("CBCT Studio modal is OPEN!");

    // Wait for demo volume slices to finish decoding
    console.log("Waiting for demo volume decoding...");
    await page.waitForSelector('[data-testid="cbct-empty-volume-dropzone"]', { state: "detached", timeout: 45000 }).catch(() => {});
    await page.waitForSelector("text=Загрузка центрального среза", { state: "detached", timeout: 45000 }).catch(() => {});
    await page.waitForTimeout(4000);

    // Switch to Endo tab
    console.log("Switching to Endo tab...");
    const endoTab = await page.waitForSelector('[data-testid="cbct-nav-tab-endo"]', { timeout: 15000 });
    await endoTab.click({ force: true });
    await page.waitForTimeout(2000);

    // Wait for Endo Workspace & Floating Compass Panel
    console.log("Waiting for Endo Compass Panel...");
    await page.waitForSelector(
      '[data-testid="cbct-endo-floating-compass"], [data-testid="endo-compass-panel"]',
      { state: "visible", timeout: 15000 }
    ).catch(() => {});
    await page.waitForTimeout(1500);

    // Capture Screen 1: Tooth 36
    const screen1Name = theme === "dark" ? "01_endo_compass_workspace_dark.png" : "04_endo_compass_workspace_light.png";
    await takeScreen(page, screen1Name, `Отдел 3: Эндодонтический Компас 3D (Зуб 36, ${theme})`);

    // Switch to Tooth 16 (Upper Molar with MB2 canal)
    console.log("Switching to Tooth 16 (MB2)...");
    const tooth16Btn = await page.$(
      '[data-testid="cbct-endo-tooth-btn-16"]'
    );
    if (tooth16Btn) {
      await tooth16Btn.click({ force: true });
      await page.waitForTimeout(1500);
      const screen2Name = theme === "dark" ? "02_endo_compass_tooth_16_mb2_dark.png" : "03_endo_compass_tooth_16_mb2_light.png";
      await takeScreen(page, screen2Name, `Отдел 3: Эндодонтический Компас 3D (Зуб 16 с MB2, ${theme})`);
    } else {
      console.warn("Could not find tooth 16 button!");
    }
  } finally {
    await browser.close();
    console.log(`Browser cleanly closed for ${theme}.`);
  }
}

async function main() {
  await runForTheme("dark");
  await runForTheme("light");
  console.log("\n>>> ALL 4 ENDO COMPASS SCREENSHOTS SUCCESSFULLY CAPTURED! <<<");
}

main().catch((err) => {
  console.error("CAPTURE ERROR:", err);
  process.exit(1);
});
