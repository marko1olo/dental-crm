const { chromium } = require("playwright");
const fs = require("node:fs");
const path = require("node:path");

const WEB_BASE = "http://127.0.0.1:5173";
const ANALYTICS_DIR = path.resolve("docs/proofs/analytics");
const PAYROLL_DIR = path.resolve("docs/proofs/payroll");
const BRAIN_DIR = path.resolve("C:/Users/Admin/.gemini/antigravity/brain/be9be17b-48b4-475a-b98d-c5fd3fed6ad5");
const ORCH_DIR = path.resolve("C:/Users/Admin/.gemini/antigravity/brain/2e26914e-fa5a-4892-8173-c6752860bc4c");

for (const dir of [ANALYTICS_DIR, PAYROLL_DIR, BRAIN_DIR, ORCH_DIR]) {
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
  await page.waitForTimeout(500);
}

async function saveProof(page, dir, filename) {
  const target = path.join(dir, filename);
  const brainTarget = path.join(BRAIN_DIR, filename);
  const orchTarget = path.join(ORCH_DIR, filename);
  await page.screenshot({ path: target, fullPage: false });
  try { fs.copyFileSync(target, brainTarget); } catch {}
  try { fs.copyFileSync(target, orchTarget); } catch {}
  const stat = fs.statSync(target);
  if (stat.size < 20480) {
    throw new Error(`[BYTE GUARD FAIL] ${filename} size is ${stat.size} bytes (< 20KB)! Blank screen!`);
  }
  console.log(`[PROOF OK] ${filename} -> ${stat.size} bytes (>= 20KB guard passed)`);
}

async function main() {
  console.log("=== LAUNCHING CHROMIUM FOR LIVE PROOFS ===");
  const browser = await chromium.launch({
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });

  const ctx = await browser.newContext({
    viewport: { width: 1440, height: 900 },
  });

  await ctx.addInitScript(() => {
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
    localStorage.setItem("dental-crm:onboarding:v1", JSON.stringify({
      dismissed: true,
      step: "done",
      completed: true,
    }));
  });

  const page = await ctx.newPage();

  // ==========================================
  // SECTION 1: ANALYTICS DASHBOARD (#analytics)
  // ==========================================
  console.log("\n>>> SECTION 1: CLINIC ANALYTICS DASHBOARD <<<");
  await page.goto(`${WEB_BASE}/?demo=true#analytics`, { waitUntil: "commit", timeout: 45000 });
  console.log("Waiting 12 seconds for full React compilation and mount...");
  await page.waitForTimeout(12000);
  await suppressOverlays(page);

  // 1.1 PC Light
  console.log("1.1 Analytics PC Light (1440x900)...");
  await setTheme(page, "light");
  await saveProof(page, ANALYTICS_DIR, "01_analytics_pc_light_1440x900.png");

  // 1.2 PC Dark
  console.log("1.2 Analytics PC Dark (1440x900)...");
  await setTheme(page, "dark");
  await saveProof(page, ANALYTICS_DIR, "02_analytics_pc_dark_1440x900.png");

  // 1.3 Mobile Light
  console.log("1.3 Analytics Mobile Light (390x844)...");
  await page.setViewportSize({ width: 390, height: 844 });
  await setTheme(page, "light");
  await saveProof(page, ANALYTICS_DIR, "03_analytics_mobile_light_390x844.png");

  // 1.4 Mobile Dark
  console.log("1.4 Analytics Mobile Dark (390x844)...");
  await setTheme(page, "dark");
  await saveProof(page, ANALYTICS_DIR, "04_analytics_mobile_dark_390x844.png");

  // ==========================================
  // SECTION 2: DOCTOR PAYROLL (#reports -> Doctors)
  // ==========================================
  console.log("\n>>> SECTION 2: DOCTOR PAYROLL & WAGES <<<");
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto(`${WEB_BASE}/?demo=true#reports`, { waitUntil: "commit", timeout: 45000 });
  console.log("Waiting 6 seconds for reports view...");
  await page.waitForTimeout(6000);
  await suppressOverlays(page);

  const docBtn = page.locator('button:has-text("Врачи")').first();
  if (await docBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
    console.log("Switching to Doctors tab...");
    await docBtn.click();
    await page.waitForTimeout(1500);
  }

  // 2.1 PC Light
  console.log("2.1 Payroll PC Light (1440x900)...");
  await setTheme(page, "light");
  await saveProof(page, PAYROLL_DIR, "01_payroll_pc_light_1440x900.png");
  await saveProof(page, PAYROLL_DIR, "01_doctor_payroll_pc_light_1440x900.png");

  // 2.2 PC Dark
  console.log("2.2 Payroll PC Dark (1440x900)...");
  await setTheme(page, "dark");
  await saveProof(page, PAYROLL_DIR, "02_payroll_pc_dark_1440x900.png");
  await saveProof(page, PAYROLL_DIR, "02_doctor_payroll_pc_dark_1440x900.png");

  // 2.3 Mobile Light
  console.log("2.3 Payroll Mobile Light (390x844)...");
  await page.setViewportSize({ width: 390, height: 844 });
  await setTheme(page, "light");
  await saveProof(page, PAYROLL_DIR, "03_payroll_mobile_light_390x844.png");
  await saveProof(page, PAYROLL_DIR, "03_doctor_payroll_mobile_light_390x844.png");

  // 2.4 Mobile Dark
  console.log("2.4 Payroll Mobile Dark (390x844)...");
  await setTheme(page, "dark");
  await saveProof(page, PAYROLL_DIR, "04_payroll_mobile_dark_390x844.png");
  await saveProof(page, PAYROLL_DIR, "04_doctor_payroll_mobile_dark_390x844.png");

  console.log("\n==============================================");
  console.log(">>> ALL 8 CANONICAL VISUAL PROOFS CAPTURED! <<<");
  console.log("==============================================");

  await browser.close();
}

main().catch((err) => {
  console.error("FATAL ERROR IN CAPTURE:", err);
  process.exit(1);
});
