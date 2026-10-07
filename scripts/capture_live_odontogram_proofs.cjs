const { chromium } = require("playwright");
const path = require("node:path");
const fs = require("node:fs");
const crypto = require("node:crypto");

(async () => {
  console.log("=== Launching Playwright with Edge (channel: msedge) at 1440x900 ===");
  const browser = await chromium.launch({
    channel: "msedge",
    headless: true,
    args: ["--no-sandbox", "--disable-gpu", "--force-device-scale-factor=1"],
  });

  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    deviceScaleFactor: 1,
  });

  await context.addInitScript(() => {
    localStorage.setItem("dente_demo_showcase", "true");
    localStorage.setItem("dente_clinic_token", "demo-showcase-token-therapist");
    localStorage.setItem("dente_staff_token", "demo-showcase-staff-token-therapist");
    localStorage.setItem("dente_theme_mode", "light");
    localStorage.setItem("dente_theme", "light");
    localStorage.setItem("dente_active_role", "doctor");
    localStorage.setItem(
      "dente_cached_active_staff_user",
      JSON.stringify({
        id: "demo-therapist-user",
        fullName: "Д-р Соколов А. В.",
        role: "doctor",
        organizationId: "demo-showcase-org",
        specialization: "Терапевт",
      })
    );
    localStorage.setItem("dental-crm:active-user:v1", JSON.stringify({
      id: "demo-therapist-user",
      fullName: "Д-р Соколов А. В.",
      role: "doctor",
      organizationId: "demo-showcase-org",
    }));
    localStorage.setItem("dental-crm:onboarding:v1", JSON.stringify({ completed: true, dismissed: true }));
    localStorage.setItem("dente_tour_completed", "true");
    localStorage.setItem("dente_quest_progress_v2", JSON.stringify({ isDismissedPermanently: true, activeTrack: null, tracksProgress: {} }));
    localStorage.setItem("dental-crm:web-ui-preferences:v1", JSON.stringify({
      version: 1,
      uiLanguage: "ru",
      selectedWorkspaceRole: "doctor",
      onboardingDismissed: true,
      onboardingStep: "done",
    }));
  });

  const page = await context.newPage();
  console.log("Navigating to http://127.0.0.1:5173/#visit ...");
  await page.goto("http://127.0.0.1:5173/#visit", { waitUntil: "domcontentloaded", timeout: 45000 });
  await page.waitForTimeout(4000);

  // Remove tour overlays
  await page.evaluate(() => {
    document.querySelectorAll(".tour-spotlight-root, [data-testid=\"guided-tour-spotlight-overlay\"], .tour-backdrop-clickable-zone, .global-toast-container").forEach((el) => el.remove());
  });

  const targetDirs = [
    path.resolve(__dirname, "../docs/screenshots/inquisition_live"),
    "C:/Users/Admin/.gemini/antigravity/brain/f98310aa-e58e-48b4-be74-72280e81058f",
  ];
  for (const d of targetDirs) {
    if (!fs.existsSync(d)) fs.mkdirSync(d, { recursive: true });
  }

  async function applyTheme(mode) {
    console.log(`Setting theme: ${mode}`);
    await page.evaluate((th) => {
      localStorage.setItem("dente_theme_mode", th);
      localStorage.setItem("dente_theme", th);
      document.documentElement.setAttribute("data-theme", th);
      const isDark = th === "dark";
      document.documentElement.classList.toggle("dark", isDark);
      document.documentElement.classList.toggle("light", !isDark);
      document.body.classList.toggle("dark", isDark);
      document.body.classList.toggle("light", !isDark);
      document.documentElement.style.colorScheme = isDark ? "dark" : "light";
      if (window.__denteThemeStore) window.__denteThemeStore.getState().setTheme(th);
    }, mode);
    await page.waitForTimeout(1000);
  }

  async function saveScreenshot(fileName) {
    const primary = path.join(targetDirs[0], fileName);
    if (fs.existsSync(primary)) {
      try { fs.unlinkSync(primary); } catch {}
    }
    await page.screenshot({ path: primary, fullPage: false, animations: "disabled" });
    for (let i = 1; i < targetDirs.length; i++) {
      fs.copyFileSync(primary, path.join(targetDirs[i], fileName));
    }
    const stat = fs.statSync(primary);
    const hash = crypto.createHash("md5").update(fs.readFileSync(primary)).digest("hex");
    console.log(`[CAPTURED] ${fileName} — ${(stat.size / 1024).toFixed(1)} KB, MD5: ${hash}`);
  }

  async function saveElementScreenshot(locator, fileName) {
    const primary = path.join(targetDirs[0], fileName);
    if (fs.existsSync(primary)) {
      try { fs.unlinkSync(primary); } catch {}
    }
    await locator.screenshot({ path: primary, animations: "disabled" });
    for (let i = 1; i < targetDirs.length; i++) {
      fs.copyFileSync(primary, path.join(targetDirs[i], fileName));
    }
    const stat = fs.statSync(primary);
    const hash = crypto.createHash("md5").update(fs.readFileSync(primary)).digest("hex");
    console.log(`[CAPTURED ELEMENT] ${fileName} — ${(stat.size / 1024).toFixed(1)} KB, MD5: ${hash}`);
  }

  // ==========================================
  // PART 1: "Зубная формула" Tab (OdontogramModule / ToothChart)
  // ==========================================
  console.log("Locating 'Зубная формула' subtab...");
  await page.waitForSelector(".visit-subtab-btn", { timeout: 15000 });
  const odontogramBtn = page.locator("[data-testid='visit-subtab-odontogram'], .visit-subtab-btn:has-text('Зубная формула')").first();
  await odontogramBtn.click();
  await page.waitForTimeout(2000);

  await page.evaluate(() => window.scrollTo(0, 0));
  await page.waitForTimeout(500);

  // 1. Capture ToothChart Light (16 teeth in row, 32 teeth total)
  await applyTheme("light");
  await saveScreenshot("proof_live_odontogram_all16_teeth_light.png");

  // 2. Capture ToothChart Dark
  await applyTheme("dark");
  await saveScreenshot("proof_live_odontogram_all16_teeth_dark.png");

  // ==========================================
  // PART 2: "Дневник приёма" Tab (Embedded Odontogram)
  // ==========================================
  console.log("Navigating back to 'Дневник приёма' subtab...");
  const emkBtn = page.locator("[data-testid='visit-subtab-emk'], .visit-subtab-btn:has-text('Дневник приёма')").first();
  await emkBtn.click();
  await page.waitForTimeout(2000);

  await page.evaluate(() => window.scrollTo(0, 0));
  await page.waitForTimeout(500);

  // 3. Capture Embedded Odontogram Light (1440x900 viewport)
  await applyTheme("light");
  await saveScreenshot("proof_live_visit_embedded_odontogram_light.png");

  // 4. Capture Embedded Odontogram Dark (1440x900 viewport)
  await applyTheme("dark");
  await saveScreenshot("proof_live_visit_embedded_odontogram_dark.png");

  // 5. Also capture dedicated element screenshots of the embedded odontogram
  const embeddedFormula = page.locator("[data-testid='odontogram-formula']");
  if (await embeddedFormula.count() > 0) {
    await saveElementScreenshot(embeddedFormula, "proof_live_visit_embedded_odontogram_element_dark.png");
    await applyTheme("light");
    await saveElementScreenshot(embeddedFormula, "proof_live_visit_embedded_odontogram_element_light.png");
  }

  console.log("=== All screenshots captured successfully! ===");
  await browser.close();
})().catch((err) => {
  console.error("FATAL ERROR capturing screenshots:", err);
  process.exit(1);
});
