/**
 * scripts/capture-staff-payroll-wallet-4state.cjs
 * 4-State Visual Proof: Staff Management, Rosters, Shifts, Doctor Commission Rates & Payroll
 * Mandates 8al, 8am, 8e, 8n (PC Light/Dark 1440x900, Mobile Light/Dark 390x844).
 */

const { chromium } = require("playwright");
const fs = require("node:fs");
const path = require("node:path");

const WEB_BASE = "http://127.0.0.1:5173";
const PROOFS_DIR = path.resolve("C:/Clinic_MVP/dental-crm/docs/proofs/staff_payroll_shifts");

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
      [data-testid="global-toast"], .sa-toast,
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
    localStorage.setItem("dental-crm:onboarding:v1", JSON.stringify({
      dismissed: true,
      step: "done",
      completed: true,
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
  await page.screenshot({ path: target, fullPage: false });
  const stat = fs.statSync(target);
  if (stat.size < 20480) {
    throw new Error(`[BYTE GUARD FAIL] ${filename} size is ${stat.size} bytes (< 20KB)!`);
  }
  console.log(`[PROOF OK] ${filename} -> ${stat.size} bytes (>= 20KB guard passed)`);
}

async function main() {
  console.log("=== STARTING 4-STATE VISUAL PROOFS CAPTURE ===");

  const browser = await chromium.launch({
    headless: true,
    executablePath: "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });

  try {
    // ----------------------------------------------------
    // 1. PC Light (1440x900) - Ведомость начисления зарплаты
    // ----------------------------------------------------
    console.log("\n--- 1/4: PC Light (1440x900) Payroll Studio ---");
    const ctx1 = await initContext(browser, 1440, 900, false);
    const p1 = await ctx1.newPage();
    await p1.goto(`${WEB_BASE}/?stand=payroll&demo=true#payroll`, { waitUntil: "domcontentloaded", timeout: 35000 });
    await p1.waitForSelector('[data-testid="doctor-payroll-studio-modal"]', { state: "visible", timeout: 25000 });
    await setTheme(p1, "light");
    await suppressOverlays(p1);
    await p1.waitForTimeout(600);
    await saveProof(p1, "01_staff_payroll_pc_light_1440x900.png");
    await ctx1.close();

    // ----------------------------------------------------
    // 2. PC Dark (1440x900) - Ведомость в темной теме
    // ----------------------------------------------------
    console.log("\n--- 2/4: PC Dark (1440x900) Payroll Studio ---");
    const ctx2 = await initContext(browser, 1440, 900, true);
    const p2 = await ctx2.newPage();
    await p2.goto(`${WEB_BASE}/?stand=payroll&demo=true#payroll`, { waitUntil: "domcontentloaded", timeout: 35000 });
    await p2.waitForSelector('[data-testid="doctor-payroll-studio-modal"]', { state: "visible", timeout: 25000 });
    await setTheme(p2, "dark");
    await suppressOverlays(p2);
    await p2.waitForTimeout(600);
    await saveProof(p2, "02_staff_payroll_pc_dark_1440x900.png");
    await ctx2.close();

    // ----------------------------------------------------
    // 3. Mobile Light (390x844) - Мобильный кошелек врача
    // ----------------------------------------------------
    console.log("\n--- 3/4: Mobile Light (390x844) Doctor Wallet ---");
    const ctx3 = await initContext(browser, 390, 844, false, true);
    const p3 = await ctx3.newPage();
    await p3.goto(`${WEB_BASE}/?stand=wallet&demo=true#wallet`, { waitUntil: "domcontentloaded", timeout: 35000 });
    await p3.waitForSelector('[data-testid="doctor-wallet-standalone-workspace"]', { state: "visible", timeout: 25000 });
    await setTheme(p3, "light");
    await suppressOverlays(p3);
    await p3.waitForTimeout(600);
    await saveProof(p3, "03_doctor_wallet_mobile_light_390x844.png");
    await ctx3.close();

    // ----------------------------------------------------
    // 4. Mobile Dark (390x844) - Мобильный кошелек в темной теме
    // ----------------------------------------------------
    console.log("\n--- 4/4: Mobile Dark (390x844) Doctor Wallet ---");
    const ctx4 = await initContext(browser, 390, 844, true, true);
    const p4 = await ctx4.newPage();
    await p4.goto(`${WEB_BASE}/?stand=wallet&demo=true#wallet`, { waitUntil: "domcontentloaded", timeout: 35000 });
    await p4.waitForSelector('[data-testid="doctor-wallet-standalone-workspace"]', { state: "visible", timeout: 25000 });
    await setTheme(p4, "dark");
    await suppressOverlays(p4);
    await p4.waitForTimeout(600);
    await saveProof(p4, "04_doctor_wallet_mobile_dark_390x844.png");
    await ctx4.close();

    console.log("\n>>> ALL 4 CANONICAL PROOFS CAPTURED SUCCESSFULLY! <<<");
  } finally {
    await browser.close();
  }
}

main().catch((err) => {
  console.error("CAPTURE ERROR:", err);
  process.exit(1);
});
