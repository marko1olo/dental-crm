/**
 * scripts/capture-hygiene-canonical-4states.cjs
 * Canonical 4-State Proofs capture for Professional Hygiene & OHI-S Studio:
 * 1. PC Light (1440x900)
 * 2. PC Dark (1440x900)
 * 3. Mobile Light (390x844)
 * 4. Mobile Dark (390x844)
 */

const { chromium } = require("playwright");
const fs = require("node:fs");
const path = require("node:path");

const APP_BASE = "http://127.0.0.1:5173";
const PROOFS_DIR = path.join(__dirname, "../docs/proofs/hygiene");
const BRAIN_DIR = "C:/Users/Admin/.gemini/antigravity/brain/2294cf44-f989-42ca-a6cd-2f862a1894f4";

const ALL_DIRS = [PROOFS_DIR, BRAIN_DIR];
for (const dir of ALL_DIRS) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function applyTheme(page, theme) {
  const isDark = theme === "dark";
  await page.evaluate(({ dark, th }) => {
    document.documentElement.setAttribute("data-theme", th);
    document.body.setAttribute("data-theme", th);
    document.documentElement.classList.toggle("dark", dark);
    document.documentElement.classList.toggle("light", !dark);
    document.body.classList.toggle("dark", dark);
    document.body.classList.toggle("light", !dark);
    document.documentElement.style.colorScheme = th;
    localStorage.setItem("dente_theme", th);
    localStorage.setItem("dente_theme_mode", th);
    localStorage.setItem("theme", th);
  }, { dark: isDark, th: theme });
  await wait(800);
}

async function suppressOverlays(page) {
  try {
    await page.evaluate(() => {
      const style = document.createElement("style");
      style.id = "suppress-all-overlays-hygiene";
      style.innerHTML = `
        .tour-spotlight-root,
        .tour-backdrop-clickable-zone,
        [data-testid="guided-tour-spotlight-overlay"],
        [data-testid="guided-tour-coach-mark-card"],
        [data-testid="demo-mode-banner"],
        .shepherd-element,
        .global-toast-container,
        .boot-state,
        .boot-screen,
        #boot-screen,
        vite-error-overlay {
          display: none !important;
          pointer-events: none !important;
          opacity: 0 !important;
        }
      `;
      document.head.appendChild(style);
    });
  } catch (_) {}
}

async function saveProof(page, fileName) {
  // Guarantee modal is visible before snapping
  await page.waitForSelector('[data-testid="hygiene-studio-modal"]', { state: "visible", timeout: 20000 });
  await wait(500);

  const proofPath = path.join(PROOFS_DIR, fileName);
  await page.screenshot({ path: proofPath, fullPage: false, animations: "disabled" });
  const size = fs.statSync(proofPath).size;
  for (const d of ALL_DIRS) {
    const dest = path.join(d, fileName);
    if (dest !== proofPath) {
      fs.copyFileSync(proofPath, dest);
    }
  }
  const sizeKB = (size / 1024).toFixed(1);
  console.log(`[SAVED] ${fileName} (${sizeKB} KB) -> ${proofPath}`);
  if (size < 20000) {
    throw new Error(`Screenshot ${fileName} is too small: ${sizeKB} KB < 20 KB!`);
  }
}

async function main() {
  console.log("=== STARTING CANONICAL 4-STATE HYGIENE PROOFS CAPTURE ===");

  const browser = await chromium.launch({
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-gpu"],
  });

  const setupInit = async (ctx) => {
    await ctx.addInitScript(() => {
      try {
        localStorage.setItem("dente_demo_showcase", "true");
        localStorage.setItem("dente_onboarding_completed", "true");
        localStorage.setItem("dente_tour_completed", "true");
        localStorage.setItem("dente_tour_dismissed", "true");
        localStorage.setItem("dente_guide_tour_dismissed_v2", "true");
        localStorage.setItem("dente_active_role", "doctor");
        localStorage.setItem("dente_role", "doctor");
        localStorage.setItem("dente_user_role", "doctor");
        localStorage.setItem("dente_workspace_perspective", "doctor");
        localStorage.setItem("dente_theme", "light");
        localStorage.setItem("dente_theme_mode", "light");
        sessionStorage.setItem("dente_unlocked", "true");
        sessionStorage.setItem("dente:sw-controller-reload", "1");
        localStorage.setItem("dental-crm:demo-mode:v1", "true");
        localStorage.setItem("dente_clinic_token", "demo-clinic-token");
        localStorage.setItem("dente_staff_token", "demo-staff-token");
      } catch (_) {}
    });
  };

  const targetUrl = `${APP_BASE}/?standalone=hygiene&patientName=%D0%A1%D0%BC%D0%B8%D1%80%D0%BD%D0%BE%D0%B2%20%D0%90%D0%BB%D0%B5%D0%BA%D1%81%D0%B5%D0%B9#hygiene`;

  try {
    // 1. DESKTOP CONTEXT
    console.log("[DESKTOP] Launching Desktop context (1440x900)...");
    const desktopContext = await browser.newContext({
      viewport: { width: 1440, height: 900 },
      colorScheme: "light",
      locale: "ru-RU",
    });
    await setupInit(desktopContext);

    const desktopPage = await desktopContext.newPage();
    desktopPage.on("pageerror", (err) => console.log("[PAGEERROR]:", err.message));
    console.log(`[NAV] Navigating to ${targetUrl}...`);
    await desktopPage.goto(targetUrl, { waitUntil: "networkidle", timeout: 60000 });
    await suppressOverlays(desktopPage);

    // 1. PC Light (1440x900)
    console.log("1. Capturing 01_hygiene_studio_pc_light_1440x900.png...");
    await applyTheme(desktopPage, "light");
    await saveProof(desktopPage, "01_hygiene_studio_pc_light_1440x900.png");

    // 2. PC Dark (1440x900)
    console.log("2. Capturing 02_hygiene_studio_pc_dark_1440x900.png...");
    await applyTheme(desktopPage, "dark");
    await saveProof(desktopPage, "02_hygiene_studio_pc_dark_1440x900.png");

    await desktopContext.close();

    // 2. MOBILE CONTEXT
    console.log("[MOBILE] Launching Mobile context (390x844)...");
    const mobileContext = await browser.newContext({
      viewport: { width: 390, height: 844 },
      colorScheme: "light",
      locale: "ru-RU",
    });
    await setupInit(mobileContext);

    const mobilePage = await mobileContext.newPage();
    mobilePage.on("pageerror", (err) => console.log("[PAGEERROR]:", err.message));
    console.log(`[NAV] Navigating mobile to ${targetUrl}...`);
    await mobilePage.goto(targetUrl, { waitUntil: "networkidle", timeout: 60000 });
    await suppressOverlays(mobilePage);

    // 3. Mobile Light (390x844)
    console.log("3. Capturing 03_hygiene_studio_mobile_light_390x844.png...");
    await applyTheme(mobilePage, "light");
    await saveProof(mobilePage, "03_hygiene_studio_mobile_light_390x844.png");

    // 4. Mobile Dark (390x844)
    console.log("4. Capturing 04_hygiene_studio_mobile_dark_390x844.png...");
    await applyTheme(mobilePage, "dark");
    await saveProof(mobilePage, "04_hygiene_studio_mobile_dark_390x844.png");

    await mobileContext.close();
    console.log("=== ALL 4 RED TEAM HYGIENE STUDIO PROOFS CAPTURED SUCCESSFULLY ===");
  } finally {
    await browser.close();
  }
}

main().catch((err) => {
  console.error("[FATAL] Capture failed:", err);
  process.exit(1);
});
