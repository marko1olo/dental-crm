/**
 * scripts/capture-payroll-fixer-4state.cjs
 * Снятие 4-State Proofs для расчета заработной платы и расчетных ведомостей
 * Mandate 8al (4-State Visual Proof: PC Light/Dark 1440x900, Mobile Light/Dark 390x844).
 */

const { chromium } = require("playwright");
const fs = require("node:fs");
const path = require("node:path");

const WEB_BASE = "http://127.0.0.1:5173";
const PROOFS_DIR = path.resolve("C:/Clinic_MVP/dental-crm/docs/proofs/payroll");

if (!fs.existsSync(PROOFS_DIR)) {
  fs.mkdirSync(PROOFS_DIR, { recursive: true });
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

async function saveProof(page, filename, aliasFilename) {
  const target = path.join(PROOFS_DIR, filename);
  await page.screenshot({ path: target, fullPage: false });
  if (aliasFilename) {
    const aliasTarget = path.join(PROOFS_DIR, aliasFilename);
    try { fs.copyFileSync(target, aliasTarget); } catch {}
  }
  const stat = fs.statSync(target);
  if (stat.size < 20480) {
    throw new Error(`[BYTE GUARD FAIL] ${filename} size is ${stat.size} bytes (< 20KB)! Blank screen!`);
  }
  console.log(`[PROOF OK] ${filename} -> ${stat.size} bytes`);
}

async function main() {
  console.log("=== STARTING 4-STATE VISUAL PROOFS CAPTURE FOR PAYROLL ===");

  const browser = await chromium.launch({
    headless: true,
    executablePath: "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });

  try {
    const context = await initContext(browser, 1440, 900, false);
    const page = await context.newPage();
    page.on("pageerror", (err) => console.error("[Browser Error]:", err.message));

    console.log("Navigating to payroll studio...");
    await page.goto(`${WEB_BASE}/?demo=true&payroll=1#payroll`, { waitUntil: "domcontentloaded", timeout: 25000 });
    await page.waitForTimeout(1000);
    await page.evaluate(() => {
      window.dispatchEvent(new CustomEvent("dente:open-payroll"));
      window.dispatchEvent(new CustomEvent("dente-open-payroll"));
      window.dispatchEvent(new CustomEvent("dente:open-doctor-payroll-report"));
    });
    await page.waitForSelector('[data-testid="doctor-payroll-studio-modal"], .payroll-studio-overlay', { state: "visible", timeout: 15000 });
    await suppressOverlays(page);
    await page.waitForTimeout(1000);

    // 1. PC Light (1440x900)
    console.log("1. PC Light 1440x900...");
    await page.setViewportSize({ width: 1440, height: 900 });
    await setTheme(page, "light");
    await saveProof(page, "01_payroll_pc_light.png", "01_doctor_payroll_pc_light_1440x900.png");

    // 2. PC Dark (1440x900)
    console.log("2. PC Dark 1440x900...");
    await setTheme(page, "dark");
    await saveProof(page, "02_payroll_pc_dark.png", "02_doctor_payroll_pc_dark_1440x900.png");

    // 3. Mobile Light (390x844)
    console.log("3. Mobile Light 390x844...");
    await page.setViewportSize({ width: 390, height: 844 });
    await setTheme(page, "light");
    await saveProof(page, "03_payroll_mobile_light.png", "03_doctor_payroll_mobile_light_390x844.png");

    // 4. Mobile Dark (390x844)
    console.log("4. Mobile Dark 390x844...");
    await setTheme(page, "dark");
    await saveProof(page, "04_payroll_mobile_dark.png", "04_doctor_payroll_mobile_dark_390x844.png");

    console.log("=== ALL 4-STATE PROOFS CAPTURED SUCCESSFULLY ===");
    await context.close();
  } finally {
    await browser.close();
  }
}

main().catch((err) => {
  console.error("CAPTURE ERROR:", err);
  process.exit(1);
});
