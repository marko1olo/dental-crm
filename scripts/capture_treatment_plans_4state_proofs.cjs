const { chromium } = require("playwright");
const fs = require("node:fs");
const path = require("node:path");

const APP_BASE = "http://127.0.0.1:5173";
const PROOFS_DIRS = [
  path.resolve("docs/proofs/treatment_plans"),
  path.resolve("docs/proofs/treatment-plans"),
  path.resolve("screenshots"),
];
const BRAIN_DIRS = [
  path.resolve("C:/Users/Admin/.gemini/antigravity/brain/f589deae-b3b1-46e5-8d98-49c220f6b2c3"),
  path.resolve("C:/Users/Admin/.gemini/antigravity/brain/ed33c0b8-da67-4baa-88ce-eb2ebebb784d"),
  path.resolve("C:/Users/Admin/.gemini/antigravity/brain/1ed16d3a-ec26-452a-9e7e-eff809219bc3"),
];

for (const dir of PROOFS_DIRS) {
  fs.mkdirSync(dir, { recursive: true });
}
for (const dir of BRAIN_DIRS) {
  fs.mkdirSync(dir, { recursive: true });
}

async function suppressOverlays(page) {
  await page.evaluate(() => {
    const style = document.createElement("style");
    style.id = "suppress-all-tour-overlays";
    style.innerHTML = `
      .tour-spotlight-root,
      .tour-backdrop-clickable-zone,
      [data-testid="guided-tour-spotlight-overlay"],
      [data-testid="guided-tour-coach-mark-card"],
      .shepherd-element {
        display: none !important;
        pointer-events: none !important;
        opacity: 0 !important;
      }
    `;
    document.head.appendChild(style);
  });
}

async function setTheme(page, theme) {
  await page.evaluate((th) => {
    if (window.__useThemeStore) {
      window.__useThemeStore.getState().setThemeMode(th);
    }
    document.documentElement.setAttribute("data-theme", th);
    const isDark = ["dark", "night", "ocean", "emerald", "cyber_xray"].includes(th);
    document.documentElement.classList.toggle("dark", isDark);
    document.documentElement.classList.toggle("light", !isDark);
    document.body.classList.toggle("dark", isDark);
    document.body.classList.toggle("light", !isDark);
    document.documentElement.style.colorScheme = isDark ? "dark" : "light";
    try {
      localStorage.setItem("dente_theme_mode", th);
      localStorage.setItem("dente_theme", th);
    } catch (_) {}
  }, theme);
  await page.waitForTimeout(600);
}

function saveProofCopies(sourcePath, baseNames) {
  const stats = fs.statSync(sourcePath);
  console.log(`[PROOF CAPTURED] ${baseNames[0]} (${stats.size} bytes)`);
  if (stats.size < 20480) {
    throw new Error(`Screenshot ${baseNames[0]} is too small (${stats.size} bytes < 20KB)`);
  }
  for (const dir of PROOFS_DIRS) {
    for (const base of baseNames) {
      const targetPath = path.join(dir, base);
      if (targetPath !== sourcePath) {
        fs.copyFileSync(sourcePath, targetPath);
      }
    }
  }
  for (const brainDir of BRAIN_DIRS) {
    for (const base of baseNames) {
      const targetPath = path.join(brainDir, base);
      if (targetPath !== sourcePath) {
        fs.copyFileSync(sourcePath, targetPath);
      }
    }
  }
}

async function main() {
  console.log("=== STARTING 4-STATE TREATMENT PLANS PROOF CAPTURE ===");
  const browser = await chromium.launch({
    headless: true,
    executablePath: "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });

  try {
    // 1. PC CONTEXT (1440x900)
    console.log("\n--- 1. PC 1440x900 Context ---");
    const pcCtx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    await pcCtx.addInitScript(() => {
      localStorage.setItem("dente_clinic_token", "demo-showcase-token-owner");
      localStorage.setItem("dente_staff_token", "demo-showcase-staff-token-owner");
      localStorage.setItem("dente_active_session_token", "demo-showcase-staff-token-owner");
      localStorage.setItem("dente_active_role", "owner");
      localStorage.setItem("dente_active_mode", "clinic");
      sessionStorage.setItem("dente_unlocked", "true");
      localStorage.setItem("dente_demo_showcase", "true");
      localStorage.setItem("dente_theme", "light");
      localStorage.setItem("dente_onboarding_completed", "true");
      localStorage.setItem("dente_tour_completed", "true");
      localStorage.setItem("dente_last_view", "pipeline");
    });

    const pcPage = await pcCtx.newPage();
    console.log("Navigating PC to http://127.0.0.1:5173/?demo=true&treatment_plans=1&patientId=pat-1 ...");
    await pcPage.goto(`${APP_BASE}/?demo=true&treatment_plans=1&patientId=pat-1`, { waitUntil: "domcontentloaded", timeout: 35000 });
    
    for (let i = 0; i < 30; i++) {
      await pcPage.waitForTimeout(400);
      const text = await pcPage.evaluate(() => document.body ? document.body.innerText : "");
      if (!text.includes("Загрузка CRM") && !text.includes("Загрузка системы") && text.length > 100) break;
    }
    console.log("Waiting for TreatmentPlanModule workspace in DOM...");
    await pcPage.waitForSelector('[data-testid="treatment-plans-standalone-workspace"]', { timeout: 30000 });
    await pcPage.waitForTimeout(1000);
    await suppressOverlays(pcPage);

    // PC Light
    console.log("Capturing PC Light...");
    await setTheme(pcPage, "light");
    const pcLightPath = path.join(PROOFS_DIRS[0], "treatment_plans_pc_light_1440x900.png");
    await pcPage.screenshot({ path: pcLightPath, fullPage: false });
    saveProofCopies(pcLightPath, [
      "treatment_plans_pc_light_1440x900.png",
      "treatment_plan_pc_light_1440x900.png",
      "proof_treatment_presenter_pc_light.png"
    ]);

    // PC Dark
    console.log("Capturing PC Dark...");
    await setTheme(pcPage, "dark");
    const pcDarkPath = path.join(PROOFS_DIRS[0], "treatment_plans_pc_dark_1440x900.png");
    await pcPage.screenshot({ path: pcDarkPath, fullPage: false });
    saveProofCopies(pcDarkPath, [
      "treatment_plans_pc_dark_1440x900.png",
      "treatment_plan_pc_dark_1440x900.png",
      "proof_treatment_presenter_pc_dark.png"
    ]);

    await pcCtx.close();

    // 2. MOBILE CONTEXT (390x844)
    console.log("\n--- 2. Mobile 390x844 Context ---");
    const mobCtx = await browser.newContext({
      viewport: { width: 390, height: 844 },
      deviceScaleFactor: 2,
      isMobile: true,
      hasTouch: true,
    });
    await mobCtx.addInitScript(() => {
      localStorage.setItem("dente_clinic_token", "demo-showcase-token-owner");
      localStorage.setItem("dente_staff_token", "demo-showcase-staff-token-owner");
      localStorage.setItem("dente_active_session_token", "demo-showcase-staff-token-owner");
      localStorage.setItem("dente_active_role", "owner");
      localStorage.setItem("dente_active_mode", "clinic");
      sessionStorage.setItem("dente_unlocked", "true");
      localStorage.setItem("dente_demo_showcase", "true");
      localStorage.setItem("dente_theme", "light");
      localStorage.setItem("dente_onboarding_completed", "true");
      localStorage.setItem("dente_tour_completed", "true");
      localStorage.setItem("dente_last_view", "pipeline");
    });

    const mobPage = await mobCtx.newPage();
    console.log("Navigating Mobile to http://127.0.0.1:5173/?demo=true&treatment_plans=1&patientId=pat-1 ...");
    await mobPage.goto(`${APP_BASE}/?demo=true&treatment_plans=1&patientId=pat-1`, { waitUntil: "domcontentloaded", timeout: 35000 });
    
    for (let i = 0; i < 30; i++) {
      await mobPage.waitForTimeout(400);
      const text = await mobPage.evaluate(() => document.body ? document.body.innerText : "");
      if (!text.includes("Загрузка CRM") && !text.includes("Загрузка системы") && text.length > 100) break;
    }
    console.log("Waiting for Mobile TreatmentPlanModule workspace in DOM...");
    await mobPage.waitForSelector('[data-testid="treatment-plans-standalone-workspace"]', { timeout: 30000 });
    await mobPage.waitForTimeout(1000);
    await suppressOverlays(mobPage);

    // Mobile Light
    console.log("Capturing Mobile Light...");
    await setTheme(mobPage, "light");
    const mobLightPath = path.join(PROOFS_DIRS[0], "treatment_plans_mobile_light_390x844.png");
    await mobPage.screenshot({ path: mobLightPath, fullPage: false });
    saveProofCopies(mobLightPath, [
      "treatment_plans_mobile_light_390x844.png",
      "treatment_plan_mobile_light_390x844.png"
    ]);

    // Mobile Dark
    console.log("Capturing Mobile Dark...");
    await setTheme(mobPage, "dark");
    const mobDarkPath = path.join(PROOFS_DIRS[0], "treatment_plans_mobile_dark_390x844.png");
    await mobPage.screenshot({ path: mobDarkPath, fullPage: false });
    saveProofCopies(mobDarkPath, [
      "treatment_plans_mobile_dark_390x844.png",
      "treatment_plan_mobile_dark_390x844.png"
    ]);

    await mobCtx.close();
    console.log("\n=== ALL 4-STATE PROOFS CAPTURED SUCCESSFULLY ===");
  } finally {
    await browser.close();
  }
}

main().catch((err) => {
  console.error("FATAL ERROR:", err);
  process.exit(1);
});
