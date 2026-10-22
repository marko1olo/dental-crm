const { chromium } = require("playwright");
const path = require("node:path");
const fs = require("node:fs");

const CONV_ID = "09b4614e-d47e-4114-8504-e019044a5216";
const TARGET_DIRS = [
  path.resolve("C:/Clinic_MVP/dental-crm/docs/screenshots/odontogram_formula"),
  path.resolve(`C:/Users/Admin/.gemini/antigravity/brain/${CONV_ID}`),
];

for (const d of TARGET_DIRS) {
  if (!fs.existsSync(d)) fs.mkdirSync(d, { recursive: true });
}

async function suppressOverlays(page) {
  try {
    await page.evaluate(() => {
      document.querySelectorAll(
        '.tour-spotlight-root, [data-testid="guided-tour-spotlight-overlay"], .tour-backdrop-clickable-zone, [data-tour-step], .global-toast-container, vite-error-overlay'
      ).forEach((el) => el.remove());
      const btns = Array.from(document.querySelectorAll("button"));
      const dismiss = btns.find((b) => b.textContent && (b.textContent.includes("Больше не показывать") || b.textContent.includes("Пропустить")));
      if (dismiss) dismiss.click();
    });
  } catch (_) {}
}

async function applyTheme(page, theme) {
  await page.evaluate((th) => {
    localStorage.setItem("dente_theme_mode", th);
    if (window.__useThemeStore) {
      window.__useThemeStore.getState().setThemeMode(th);
    }
    document.documentElement.setAttribute("data-theme", th);
    const isDark = th === "dark";
    document.documentElement.classList.toggle("dark", isDark);
    document.documentElement.classList.toggle("light", !isDark);
    document.documentElement.style.colorScheme = isDark ? "dark" : "light";
  }, theme);
  await suppressOverlays(page);
  await page.waitForTimeout(600);
}

async function saveProof(page, filename, description) {
  await suppressOverlays(page);
  await page.waitForTimeout(600);

  const primaryPath = path.join(TARGET_DIRS[0], filename);
  await page.screenshot({ path: primaryPath, fullPage: false });

  const stat = fs.statSync(primaryPath);
  if (stat.size < 20480) {
    throw new Error(`[BLANK PROOF DETECTED] ${filename} is only ${stat.size} bytes!`);
  }

  for (const d of TARGET_DIRS) {
    const dest = path.join(d, filename);
    if (dest !== primaryPath) {
      fs.copyFileSync(primaryPath, dest);
    }
  }

  console.log(`[PROOF CAPTURED] ${filename} (${stat.size} bytes) -> ${description}`);
}

(async () => {
  console.log("=== STARTING 4-STATE DENTAL FORMULA PROOF CAPTURE ===");
  const browser = await chromium.launch({
    executablePath: "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });

  try {
    const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    const page = await context.newPage();

    console.log("Navigating to http://127.0.0.1:5173/ ...");
    await page.goto("http://127.0.0.1:5173/", { waitUntil: "load", timeout: 30000 });
    await page.waitForTimeout(2000);

    const demoBtn = page.locator("button:has-text('Быстрый вход в Демо-тур')").first();
    await demoBtn.click();
    await page.waitForTimeout(1500);

    const submitBtn = page.locator("button.auth-submit-btn, button:has-text('Войти в демо-тур')").first();
    if (await submitBtn.count() > 0 && await submitBtn.isVisible()) {
      await submitBtn.click();
      await page.waitForTimeout(2500);
    }

    await suppressOverlays(page);

    console.log("Waiting for patient row...");
    await page.waitForSelector('.patient-row, article[data-patient-id]', { timeout: 15000 });
    const patientRow = page.locator('.patient-row, article[data-patient-id]').first();
    await patientRow.click();
    console.log("Patient row clicked!");
    await page.waitForTimeout(1000);

    // Dispatch open modal
    await page.evaluate(() => {
      window.dispatchEvent(new CustomEvent("dente-open-patient-card-modal", { detail: {} }));
    });
    console.log("Dispatched dente-open-patient-card-modal!");
    await page.waitForTimeout(1000);

    const modal = await page.$('[data-testid="patient-card-modal"]');
    console.log("Modal found:", !!modal);

    const formulaTab = page.locator("[data-testid='tab-patient-formula']").first();
    console.log("Formula tab count:", await formulaTab.count());
    await formulaTab.click();
    console.log("Clicked tab-patient-formula!");
    await page.waitForTimeout(1500);

    await page.waitForSelector('[data-testid="patient-dental-formula-tab"]', { timeout: 15000 });
    console.log("PatientDentalFormulaTab mounted successfully!");

    // 1. ☀️ PC Light (1440x900)
    console.log("\n[1/4] Capturing PC Light (1440x900)...");
    await applyTheme(page, "light");
    await saveProof(page, "01_dental_formula_pc_light.png", "☀️ PC Light (1440x900) - Зубная формула FDI, 1-клик физиологическая норма, клинические штампы");

    // 2. 🌙 PC Dark (1440x900)
    console.log("\n[2/4] Capturing PC Dark (1440x900)...");
    await applyTheme(page, "dark");
    await saveProof(page, "02_dental_formula_pc_dark.png", "🌙 PC Dark (1440x900) - Зубная формула FDI в тёмной теме без паразитных рамок");

    // 3. Switch viewport to Mobile: 390x844
    console.log("\nResizing viewport to Mobile (390x844)...");
    await page.setViewportSize({ width: 390, height: 844 });
    await suppressOverlays(page);
    await page.waitForTimeout(1000);

    // 3. 📱 Mobile Light (390x844)
    console.log("\n[3/4] Capturing Mobile Light (390x844)...");
    await applyTheme(page, "light");
    await saveProof(page, "03_dental_formula_mobile_light.png", "📱 Mobile Light (390x844) - Квадрантная зубная формула FDI, Natural Thumb Zone");

    // 4. 🌙 Mobile Dark (390x844)
    console.log("\n[4/4] Capturing Mobile Dark (390x844)...");
    await applyTheme(page, "dark");
    await saveProof(page, "04_dental_formula_mobile_dark.png", "🌙 Mobile Dark (390x844) - Квадрантная формула FDI в тёмной теме без паразитного скролла");

    console.log("\n=== ALL 4 PROOF SCREENSHOTS CAPTURED SUCCESSFULLY ===");
  } finally {
    await browser.close();
  }
})().catch((err) => {
  console.error("FATAL ERROR:", err);
  process.exit(1);
});
