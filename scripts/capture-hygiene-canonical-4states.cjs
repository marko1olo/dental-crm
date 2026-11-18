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
const net = require("node:net");

async function detectAppPort() {
  for (const port of [5173, 5174, 5175, 3000]) {
    const isOpen = await new Promise((resolve) => {
      const socket = new net.Socket();
      socket.setTimeout(500);
      socket.on("connect", () => { socket.destroy(); resolve(true); });
      socket.on("timeout", () => { socket.destroy(); resolve(false); });
      socket.on("error", () => { socket.destroy(); resolve(false); });
      socket.connect(port, "127.0.0.1");
    });
    if (isOpen) return port;
  }
  return 5173;
}

const PROOFS_DIR = path.join(__dirname, "../docs/proofs/hygiene");
const BRAIN_DIR = "C:/Users/Admin/.gemini/antigravity/brain/3f8dfe53-7fb4-4dda-afae-135e48876e09";
const ORCH_DIR = "C:/Users/Admin/.gemini/antigravity/brain/0b7866b2-4ebf-443b-8f35-0fa3ff22cb58";

const ALL_DIRS = [PROOFS_DIR, BRAIN_DIR, ORCH_DIR];
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
  try {
    await page.waitForSelector('[data-testid="hygiene-studio-modal"]', { state: "visible", timeout: 8000 });
  } catch (err) {
    console.warn(`[WARN] waitForSelector timeout for ${fileName}:`, err.message);
  }
  await wait(800);

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
  const activePort = await detectAppPort();
  const APP_BASE = `http://127.0.0.1:${activePort}`;
  console.log(`Using base URL: ${APP_BASE}`);

  const browser = await chromium.launch({
    headless: true,
    executablePath: "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
    args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-gpu"],
  });

  const setupInit = async (ctx) => {
    await ctx.addInitScript(() => {
      localStorage.setItem("dente_clinic_token", "demo-showcase-token-owner");
      localStorage.setItem("dente_staff_token", "demo-showcase-staff-token-owner");
      localStorage.setItem("dente_active_session_token", "demo-showcase-staff-token-owner");
      localStorage.setItem("dente_active_role", "doctor");
      localStorage.setItem("dente_active_mode", "clinic");
      localStorage.setItem("dente_onboarding_completed", "true");
      localStorage.setItem("dente_tour_completed", "true");
      localStorage.setItem("dente_demo_banner_dismissed", "true");
    });
  };

  const targetUrl = `${APP_BASE}/?hygiene=1#hygiene`;

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
    desktopPage.on("console", (msg) => console.log(`[BROWSER CONSOLE ${msg.type()}]:`, msg.text()));
    desktopPage.on("pageerror", (err) => console.log("[PAGEERROR]:", err.stack || err.message));
    console.log(`[NAV] Navigating to ${targetUrl}...`);
    await desktopPage.goto(targetUrl, { waitUntil: "domcontentloaded", timeout: 30000 });
    await wait(2000);
    await suppressOverlays(desktopPage);

    await desktopPage.evaluate(() => {
      window.dispatchEvent(new CustomEvent("dente:open-hygiene", { detail: { patientName: "Смирнов Алексей (34 года)" } }));
    });
    await wait(1500);

    // Switch to newly implemented Silness-Löe hygiene tab
    await desktopPage.evaluate(() => {
      const btns = Array.from(document.querySelectorAll("button"));
      const silnessBtn = btns.find((b) => b.textContent && b.textContent.includes("Silness-Löe"));
      if (silnessBtn) silnessBtn.click();
    });
    await wait(800);

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
      deviceScaleFactor: 2,
      isMobile: true,
      hasTouch: true,
      colorScheme: "light",
      locale: "ru-RU",
    });
    await setupInit(mobileContext);

    const mobilePage = await mobileContext.newPage();
    mobilePage.on("pageerror", (err) => console.log("[PAGEERROR]:", err.message));
    console.log(`[NAV] Navigating mobile to ${targetUrl}...`);
    await mobilePage.goto(targetUrl, { waitUntil: "domcontentloaded", timeout: 30000 });
    await wait(2000);
    await suppressOverlays(mobilePage);

    await mobilePage.evaluate(() => {
      window.dispatchEvent(new CustomEvent("dente:open-hygiene", { detail: { patientName: "Смирнов Алексей (34 года)" } }));
    });
    await wait(1500);

    // Switch to newly implemented Silness-Löe hygiene tab
    await mobilePage.evaluate(() => {
      const btns = Array.from(document.querySelectorAll("button"));
      const silnessBtn = btns.find((b) => b.textContent && b.textContent.includes("Silness-Löe"));
      if (silnessBtn) silnessBtn.click();
    });
    await wait(800);

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
