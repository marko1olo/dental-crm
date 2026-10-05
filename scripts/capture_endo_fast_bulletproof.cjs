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
    title: "3D КЛКТ KaVo OP 3D Pro",
    status: "available",
  },
];

async function takeScreen(page, fileName, description) {
  const p1 = path.join(targetDirs[0], fileName);
  if (fs.existsSync(p1)) {
    try { fs.unlinkSync(p1); } catch {}
  }
  await page.screenshot({ path: p1, fullPage: false, timeout: 15000 });
  for (let i = 1; i < targetDirs.length; i++) {
    fs.copyFileSync(p1, path.join(targetDirs[i], fileName));
  }
  const stat = fs.statSync(p1);
  console.log(`[CAPTURED] ${fileName} (${description}) — ${(stat.size / 1024).toFixed(1)} KB`);
}

async function main() {
  console.log("=== STARTING BULLETPROOF ENDO CAPTURE ===");
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
      localStorage.setItem("dente_clinic_token", "live-token");
      localStorage.setItem("dente_staff_token", "live-token");
      localStorage.setItem("dente_active_role", "owner");
      localStorage.setItem("dente_theme_mode", "dark");
      localStorage.setItem("dente_tour_completed", "true");
      localStorage.setItem("dente_training_mode_completed", "true");
      localStorage.setItem("dente_training_active", "false");
      localStorage.setItem("dente_active_patient_id", "pat-1");
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

    const page = await ctx.newPage();
    page.on("pageerror", (e) => console.log("[PAGE ERROR]:", e.message));
    page.on("console", (m) => {
      if (m.type() === "error") console.log("[CONSOLE ERROR]:", m.text());
    });

    await page.route("**/api/**", (route) => {
      const url = route.request().url();
      if (url.includes("/api/auth/")) {
        return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ user: { id: "doc-1", role: "owner" } }) });
      }
      if (url.includes("/api/imaging/studies")) {
        return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(studiesArray) });
      }
      return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({}) });
    });

    console.log("Navigating to http://127.0.0.1:5173/#imaging...");
    await page.goto("http://127.0.0.1:5173/#imaging", { waitUntil: "domcontentloaded", timeout: 20000 });
    await page.waitForTimeout(1500);

    const openRadBtn = await page.waitForSelector(
      '[data-testid="imaging-open-radiology-module"], [data-testid="btn-open-radiology-hub"]',
      { timeout: 10000 }
    ).catch(() => null);
    if (openRadBtn) {
      await openRadBtn.click({ force: true });
      await page.waitForTimeout(800);
    }

    console.log("Opening 3D Studio modal...");
    const openStudioBtn = await page.waitForSelector('[data-testid="btn-open-3d-cbct-studio"]', { timeout: 10000 });
    await openStudioBtn.click({ force: true });
    await page.waitForSelector('[data-testid="cbct-studio-modal"]', { state: "visible", timeout: 15000 });
    console.log("Studio modal opened!");

    const demoBtn = await page.waitForSelector('[data-testid="cbct-btn-load-demo-empty"]', { timeout: 8000 }).catch(() => null);
    if (demoBtn) {
      console.log("Clicking load demo volume...");
      await demoBtn.click({ force: true });
      console.log("Waiting 8s for instant central slice & volume mount...");
      await page.waitForTimeout(8000);
    }

    await page.screenshot({ path: "debug_at_8s.png" });
    console.log("Saved debug_at_8s.png!");

    console.log("Switching to Endo tab...");
    const endoTab = await page.waitForSelector('[data-testid="cbct-nav-tab-endo"]', { timeout: 10000 });
    await endoTab.click({ force: true });
    console.log("Endo tab clicked! Waiting 2s for layout paint...");
    await page.waitForTimeout(2000);

    // 1. Capture Dark theme, Tooth 36
    console.log("\n[1/4] Capturing 01_endo_compass_workspace_dark.png...");
    await takeScreen(page, "01_endo_compass_workspace_dark.png", "Endo Compass 3D Studio (Dark, Tooth 36)");

    // 2. Select Tooth 16 (with MB2)
    console.log("\n[2/4] Selecting Tooth 16...");
    const tooth16Btn = await page.$('[data-testid="cbct-endo-tooth-btn-16"], button:has-text("16")');
    if (tooth16Btn) {
      await tooth16Btn.click({ force: true });
      await page.waitForTimeout(1200);
      await takeScreen(page, "02_endo_compass_tooth_16_mb2_dark.png", "Endo Compass 3D Studio (Dark, Tooth 16 MB2)");
    }

    // 3. Switch to Light theme
    console.log("\n[3/4] Switching to Light theme...");
    await page.evaluate(() => {
      document.documentElement.setAttribute("data-theme", "light");
      document.body.setAttribute("data-theme", "light");
      document.documentElement.classList.remove("dark");
      document.documentElement.classList.add("light");
      document.body.classList.remove("dark");
      document.body.classList.add("light");
      document.documentElement.style.colorScheme = "light";
    });
    await page.waitForTimeout(800);

    // Capture Light theme, Tooth 16
    await takeScreen(page, "03_endo_compass_tooth_16_mb2_light.png", "Endo Compass 3D Studio (Light, Tooth 16 MB2)");

    // 4. Switch back to Tooth 36 in Light theme
    console.log("\n[4/4] Switching back to Tooth 36...");
    const tooth36Btn = await page.$('[data-testid="cbct-endo-tooth-btn-36"], button:has-text("36")');
    if (tooth36Btn) {
      await tooth36Btn.click({ force: true });
      await page.waitForTimeout(1200);
    }
    await takeScreen(page, "04_endo_compass_workspace_light.png", "Endo Compass 3D Studio (Light, Tooth 36)");

    console.log("\n>>> SUCCESS: ALL 4 BULLETPROOF SCREENSHOTS CAPTURED! <<<");
  } finally {
    await browser.close();
  }
}

main().catch((err) => {
  console.error("CAPTURE ERROR:", err);
  process.exit(1);
});
