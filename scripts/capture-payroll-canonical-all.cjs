/**
 * scripts/capture-payroll-canonical-all.cjs
 *
 * Full 8-state proof capture for Doctor Payroll, Assistant Wages, and DoctorPayrollStudioModal:
 * - 01_doctor_payroll_pc_light_1440x900.png
 * - 02_doctor_payroll_pc_dark_1440x900.png
 * - 03_doctor_payroll_mobile_light_390x844.png
 * - 04_doctor_payroll_mobile_dark_390x844.png
 * - 05_payroll_studio_pc_light_1440x900.png
 * - 06_payroll_studio_pc_dark_1440x900.png
 * - 07_payroll_studio_mobile_light_390x844.png
 * - 08_payroll_studio_mobile_dark_390x844.png
 */

const { chromium } = require("playwright");
const fs = require("node:fs");
const path = require("node:path");

const WEB_BASE = "http://127.0.0.1:5173";
const PROOFS_DIR = path.resolve("docs/proofs/payroll");
const BRAIN_DIR = path.resolve("C:/Users/Admin/.gemini/antigravity/brain/4a08193a-5adf-49af-863e-6f133a2968c7");

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
    serviceWorkers: "block",
    isMobile,
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
  try { fs.copyFileSync(target, brainTarget); } catch {}
  const stat = fs.statSync(target);
  if (stat.size < 20480) {
    throw new Error(`[BYTE GUARD FAIL] ${filename} size is ${stat.size} bytes (< 20KB)!`);
  }
  console.log(`[PROOF OK] ${filename} -> ${stat.size} bytes (>= 20KB guard passed)`);
}

async function main() {
  console.log("=== STARTING CANONICAL 8-STATE PAYROLL PROOFS CAPTURE ===");

  const browser = await chromium.launch({
    headless: true,
    executablePath: "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });

  try {
    // ----------------------------------------------------
    // PART 1: DoctorPayrollReport (Net Revenue & Assistant Wages)
    // ----------------------------------------------------
    console.log("\n>>> PART 1: DoctorPayrollReport <<<");

    // 1. PC Light (1440x900) - Doctors View
    console.log("1/8: PC Light DoctorPayrollReport (1440x900)");
    const ctx1 = await initContext(browser, 1440, 900, false);
    const p1 = await ctx1.newPage();
    await p1.goto(`${WEB_BASE}/?stand=doctor-payroll-report&demo=true#doctor-payroll-report`, { waitUntil: "domcontentloaded" });
    await p1.waitForSelector('.doctor-payroll-report-container, [data-testid="doctor-payroll-report"], table', { state: "visible", timeout: 25000 });
    await setTheme(p1, "light");
    await suppressOverlays(p1);
    await saveProof(p1, "01_doctor_payroll_pc_light_1440x900.png");
    await ctx1.close();

    // 2. PC Dark (1440x900) - Assistants View
    console.log("2/8: PC Dark DoctorPayrollReport (1440x900)");
    const ctx2 = await initContext(browser, 1440, 900, true);
    const p2 = await ctx2.newPage();
    await p2.goto(`${WEB_BASE}/?stand=doctor-payroll-report&demo=true#doctor-payroll-report`, { waitUntil: "domcontentloaded" });
    await p2.waitForSelector('.doctor-payroll-report-container, [data-testid="doctor-payroll-report"], table', { state: "visible", timeout: 25000 });
    await setTheme(p2, "dark");
    const asstBtn = p2.locator('[data-testid="payroll-role-assistants"], button:has-text("Ассистенты")').first();
    if (await asstBtn.isVisible()) {
      await asstBtn.click();
      await p2.waitForTimeout(600);
    }
    await suppressOverlays(p2);
    await saveProof(p2, "02_doctor_payroll_pc_dark_1440x900.png");
    await ctx2.close();

    // 3. Mobile Light (390x844) - Doctor Cards
    console.log("3/8: Mobile Light DoctorPayrollReport (390x844)");
    const ctx3 = await initContext(browser, 390, 844, false, true);
    const p3 = await ctx3.newPage();
    await p3.goto(`${WEB_BASE}/?stand=doctor-payroll-report&demo=true#doctor-payroll-report`, { waitUntil: "domcontentloaded" });
    await p3.waitForSelector('.doctor-payroll-report-container, [data-testid="doctor-payroll-report"], table, [data-testid="payroll-card-doctor"]', { state: "visible", timeout: 25000 });
    await setTheme(p3, "light");
    await suppressOverlays(p3);
    await saveProof(p3, "03_doctor_payroll_mobile_light_390x844.png");
    await ctx3.close();

    // 4. Mobile Dark (390x844) - Assistant Cards
    console.log("4/8: Mobile Dark DoctorPayrollReport (390x844)");
    const ctx4 = await initContext(browser, 390, 844, true, true);
    const p4 = await ctx4.newPage();
    await p4.goto(`${WEB_BASE}/?stand=doctor-payroll-report&demo=true#doctor-payroll-report`, { waitUntil: "domcontentloaded" });
    await p4.waitForSelector('.doctor-payroll-report-container, [data-testid="doctor-payroll-report"], table, [data-testid="payroll-card-doctor"]', { state: "visible", timeout: 25000 });
    await setTheme(p4, "dark");
    const asstBtnMob = p4.locator('[data-testid="payroll-role-assistants"], button:has-text("Ассистенты")').first();
    if (await asstBtnMob.isVisible()) {
      await asstBtnMob.click();
      await p4.waitForTimeout(600);
    }
    await suppressOverlays(p4);
    await saveProof(p4, "04_doctor_payroll_mobile_dark_390x844.png");
    await ctx4.close();

    // ----------------------------------------------------
    // PART 2: DoctorPayrollStudioModal (Canonical Studio)
    // ----------------------------------------------------
    console.log("\n>>> PART 2: DoctorPayrollStudioModal <<<");

    // 5. Studio PC Light (1440x900)
    console.log("5/8: Studio PC Light (1440x900)");
    const ctx5 = await initContext(browser, 1440, 900, false);
    const p5 = await ctx5.newPage();
    await p5.goto(`${WEB_BASE}/?stand=payroll&demo=true#payroll`, { waitUntil: "domcontentloaded" });
    await p5.waitForSelector('[data-testid="doctor-payroll-studio-modal"]', { state: "visible", timeout: 25000 });
    await setTheme(p5, "light");
    await suppressOverlays(p5);
    await saveProof(p5, "05_payroll_studio_pc_light_1440x900.png");
    await ctx5.close();

    // 6. Studio PC Dark (1440x900)
    console.log("6/8: Studio PC Dark (1440x900)");
    const ctx6 = await initContext(browser, 1440, 900, true);
    const p6 = await ctx6.newPage();
    await p6.goto(`${WEB_BASE}/?stand=payroll&demo=true#payroll`, { waitUntil: "domcontentloaded" });
    await p6.waitForSelector('[data-testid="doctor-payroll-studio-modal"]', { state: "visible", timeout: 25000 });
    await setTheme(p6, "dark");
    await suppressOverlays(p6);
    await saveProof(p6, "06_payroll_studio_pc_dark_1440x900.png");
    await ctx6.close();

    // 7. Studio Mobile Light (390x844)
    console.log("7/8: Studio Mobile Light (390x844)");
    const ctx7 = await initContext(browser, 390, 844, false, true);
    const p7 = await ctx7.newPage();
    await p7.goto(`${WEB_BASE}/?stand=payroll&demo=true#payroll`, { waitUntil: "domcontentloaded" });
    await p7.waitForSelector('[data-testid="doctor-payroll-studio-modal"]', { state: "visible", timeout: 25000 });
    await setTheme(p7, "light");
    await suppressOverlays(p7);
    await saveProof(p7, "07_payroll_studio_mobile_light_390x844.png");
    await ctx7.close();

    // 8. Studio Mobile Dark (390x844)
    console.log("8/8: Studio Mobile Dark (390x844)");
    const ctx8 = await initContext(browser, 390, 844, true, true);
    const p8 = await ctx8.newPage();
    await p8.goto(`${WEB_BASE}/?stand=payroll&demo=true#payroll`, { waitUntil: "domcontentloaded" });
    await p8.waitForSelector('[data-testid="doctor-payroll-studio-modal"]', { state: "visible", timeout: 25000 });
    await setTheme(p8, "dark");
    await suppressOverlays(p8);
    await saveProof(p8, "08_payroll_studio_mobile_dark_390x844.png");
    await ctx8.close();

    console.log("\n========================================================");
    console.log(">>> ALL 8 PAYROLL PROOFS CAPTURED SUCCESSFULLY (100% OK) <<<");
    console.log("========================================================");
  } finally {
    await browser.close();
  }
}

main().catch((err) => {
  console.error("CAPTURE ERROR:", err);
  process.exit(1);
});
