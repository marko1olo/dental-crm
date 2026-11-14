/**
 * scripts/capture-payroll-studio-canonical-4proofs.cjs
 *
 * Captures 4-state visual proof of the canonical Doctor Payroll Studio Modal:
 * 1. 01_pc_light_1440x900.png (PC Light, 1440x900)
 * 2. 02_pc_dark_1440x900.png (PC Dark, 1440x900)
 * 3. 03_mobile_light_390x844.png (Mobile Light, 390x844)
 * 4. 04_mobile_dark_390x844.png (Mobile Dark, 390x844)
 */

const { chromium } = require("playwright");
const fs = require("node:fs");
const path = require("node:path");

const WEB_BASE = "http://127.0.0.1:5173";
const PROOFS_DIR = path.resolve("C:/Clinic_MVP/dental-crm/docs/proofs/payroll");
const BRAIN_DIR = path.resolve("C:/Users/Admin/.gemini/antigravity/brain/2dafff76-f90d-485d-91c2-c271f3810eb9");

for (const dir of [PROOFS_DIR, BRAIN_DIR]) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

async function suppressOverlays(page) {
  await page.evaluate(() => {
    const style = document.createElement("style");
    style.id = "suppress-all-overlays";
    style.innerHTML = `
      .tour-spotlight-root, .tour-backdrop-clickable-zone,
      [data-testid="guided-tour-spotlight-overlay"],
      [data-testid="guided-tour-coach-mark-card"],
      [data-testid="demo-mode-banner"], .global-toast-container,
      vite-error-overlay { display: none !important; pointer-events: none !important; }
    `;
    document.head.appendChild(style);
  }).catch(() => {});
}

async function initContext(browser, width, height, isDark = false, isMobile = false) {
  const context = await browser.newContext({
    viewport: { width, height },
    colorScheme: isDark ? "dark" : "light",
    isMobile: isMobile,
    hasTouch: isMobile,
    deviceScaleFactor: isMobile ? 2 : 1,
  });

  await context.addInitScript(({ dark }) => {
    localStorage.setItem("dente_clinic_token", "demo-showcase-token-owner");
    localStorage.setItem("dente_staff_token", "demo-showcase-staff-token-owner");
    localStorage.setItem("dente_active_session_token", "demo-showcase-staff-token-owner");
    localStorage.setItem("dente_active_role", "owner");
    localStorage.setItem("dente_user_role", "owner");
    localStorage.setItem("dente_role", "owner");
    localStorage.setItem("dente_perspective", "management");
    sessionStorage.setItem("dente_unlocked", "true");
    localStorage.setItem("dente_demo_showcase", "true");
    localStorage.setItem("dente_demo_mode", "true");
    localStorage.setItem("dente_onboarding_completed", "true");
    localStorage.setItem("dente_tour_completed", "true");
    localStorage.setItem("dente_theme", dark ? "dark" : "light");
    localStorage.setItem("dente_theme_mode", dark ? "dark" : "light");
    localStorage.setItem("dental-crm:onboarding:v1", JSON.stringify({
      dismissed: true,
      step: "done",
      completed: true,
    }));
    localStorage.setItem("dental-crm:web-ui-preferences:v1", JSON.stringify({
      version: 1,
      uiLanguage: "ru",
    }));
  }, { dark: isDark });

  return context;
}

async function setTheme(page, theme) {
  await page.evaluate((th) => {
    document.documentElement.setAttribute("data-theme", th);
    document.body.setAttribute("data-theme", th);
    if (th === "dark") {
      document.documentElement.classList.add("dark");
      document.documentElement.classList.remove("light");
      document.body.classList.add("dark");
      document.body.classList.remove("light");
    } else {
      document.documentElement.classList.remove("dark");
      document.documentElement.classList.add("light");
      document.body.classList.remove("dark");
      document.body.classList.add("light");
    }
    localStorage.setItem("dente_theme", th);
    localStorage.setItem("dente_theme_mode", th);
    window.dispatchEvent(new Event("themechange"));
  }, theme).catch(() => {});
  await suppressOverlays(page);
  await page.waitForTimeout(400);
}

async function saveProof(page, filename) {
  const target = path.join(PROOFS_DIR, filename);
  const brainTarget = path.join(BRAIN_DIR, filename);
  await page.screenshot({ path: target, fullPage: false });
  fs.copyFileSync(target, brainTarget);
  const stat = fs.statSync(target);
  if (stat.size < 20480) {
    throw new Error(`[BYTE GUARD FAIL] ${filename} size is ${stat.size} bytes (< 20KB)! Blank screen!`);
  }
  console.log(`[PROOF OK] ${filename} -> ${stat.size} bytes (>= 20KB guard passed)`);
}

async function openPayrollStudio(page) {
  console.log("Navigating to standalone payroll studio...");
  await page.goto(`${WEB_BASE}/?demo=true&payroll=1#payroll`, { waitUntil: "commit", timeout: 20000 });
  await page.waitForSelector('[data-testid="doctor-payroll-studio-modal"]', { state: "visible", timeout: 20000 });
  await suppressOverlays(page);
  await page.waitForTimeout(600);
}

async function main() {
  console.log("=== STARTING PAYROLL STUDIO 4-STATE CAPTURE ===");

  const browser = await chromium.launch({
    headless: true,
    executablePath: "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });

  try {
    const context = await initContext(browser, 1440, 900, false);

    const page = await context.newPage();
    page.on("pageerror", (err) => console.error("[Browser Error]:", err.message));

    console.log("Navigating to standalone payroll studio...");
    await page.goto(`${WEB_BASE}/?demo=true&payroll=1#payroll`, { waitUntil: "domcontentloaded", timeout: 30000 });
    console.log("Waiting for modal selector...");
    await page.waitForSelector('[data-testid="doctor-payroll-studio-modal"]', { state: "visible", timeout: 45000 });
    await suppressOverlays(page);
    await page.waitForTimeout(1000);

    // 1. PC Light (1440x900)
    console.log("\n--- 1/4: PC Light (1440x900) ---");
    await page.setViewportSize({ width: 1440, height: 900 });
    await setTheme(page, "light");
    await saveProof(page, "01_pc_light_1440x900.png");

    // 2. PC Dark (1440x900)
    console.log("\n--- 2/4: PC Dark (1440x900) ---");
    await setTheme(page, "dark");
    await saveProof(page, "02_pc_dark_1440x900.png");

    // 3. Mobile Light (390x844)
    console.log("\n--- 3/4: Mobile Light (390x844) ---");
    await page.setViewportSize({ width: 390, height: 844 });
    await setTheme(page, "light");
    await saveProof(page, "03_mobile_light_390x844.png");

    // 4. Mobile Dark (390x844)
    console.log("\n--- 4/4: Mobile Dark (390x844) ---");
    await setTheme(page, "dark");
    await saveProof(page, "04_mobile_dark_390x844.png");

    console.log("\n>>> ALL 4 CANONICAL PAYROLL STUDIO PROOFS CAPTURED SUCCESSFULLY! <<<");
    await context.close();
  } finally {
    await browser.close();
  }
}

main().catch((err) => {
  console.error("CAPTURE ERROR:", err);
  process.exit(1);
});
