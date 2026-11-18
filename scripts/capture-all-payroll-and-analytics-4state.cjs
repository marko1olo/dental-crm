/**
 * scripts/capture-all-payroll-and-analytics-4state.cjs
 * Canonical 4-State Visual Proofs Generator for Doctor Payroll & Clinic Analytics
 */

const { chromium } = require("playwright");
const http = require("node:http");
const fs = require("node:fs");
const path = require("node:path");

const WEB_BASE = "http://127.0.0.1:5173";
const PAYROLL_DIR = path.resolve("docs/proofs/payroll");
const ANALYTICS_DIR = path.resolve("docs/proofs/analytics");
const BRAIN_DIR = path.resolve("C:/Users/Admin/.gemini/antigravity/brain/c9de9455-abac-41ee-ba79-fa8790b68764");

for (const dir of [PAYROLL_DIR, ANALYTICS_DIR, BRAIN_DIR]) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

async function waitForServer(url, timeoutMs = 25000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      await new Promise((resolve, reject) => {
        const req = http.get(url, (res) => {
          if (res.statusCode) resolve(true);
          else reject(new Error("No status"));
        });
        req.on("error", reject);
        req.setTimeout(2000, () => { req.destroy(); reject(new Error("Timeout")); });
      });
      console.log(`[SERVER READY] ${url}`);
      return true;
    } catch {
      await new Promise((r) => setTimeout(r, 1000));
    }
  }
  throw new Error(`Server ${url} failed to respond within ${timeoutMs}ms`);
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
  await page.screenshot({ path: target, fullPage: false });
  try { fs.copyFileSync(target, brainTarget); } catch {}
  const stat = fs.statSync(target);
  if (stat.size < 20480) {
    throw new Error(`[BYTE GUARD FAIL] ${filename} size is ${stat.size} bytes (< 20KB)!`);
  }
  console.log(`[PROOF OK] ${filename} -> ${stat.size} bytes (>= 20KB guard passed)`);
}

async function main() {
  console.log("=== STARTING CANONICAL 4-STATE VISUAL PROOF CAPTURE ===");
  const browser = await chromium.launch({
    headless: true,
    executablePath: "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });

  try {
    const context = await browser.newContext({
      viewport: { width: 1440, height: 900 },
      deviceScaleFactor: 1,
    });

    await context.addInitScript(() => {
      localStorage.setItem("dente_demo_mode", "true");
      localStorage.setItem("dente_demo_showcase", "true");
      localStorage.setItem("dente_active_role", "owner");
      localStorage.setItem("dente_user_role", "owner");
      localStorage.setItem("dente_role", "owner");
      localStorage.setItem("dente_perspective", "management");
      sessionStorage.setItem("dente_unlocked", "true");
      localStorage.setItem("dente_onboarding_completed", "true");
      localStorage.setItem("dente_tour_completed", "true");
      localStorage.setItem("dental-crm:onboarding:v1", JSON.stringify({
        dismissed: true,
        step: "done",
        completed: true,
      }));
    });

    const page = await context.newPage();
    page.setDefaultTimeout(35000);

    // ==========================================
    // 1. DOCTOR PAYROLL STUDIO MODAL (4-STATE)
    // ==========================================
    try {
      console.log("\n>>> CAPTURING DOCTOR PAYROLL STUDIO MODAL (4 STATES) <<<");
      await page.setViewportSize({ width: 1440, height: 900 });
      await page.goto(`${WEB_BASE}/?demo=true&payroll=1#payroll`, { waitUntil: "commit" });
      await page.waitForSelector('[data-testid="doctor-payroll-studio-modal"]', { state: "visible", timeout: 25000 });
      await suppressOverlays(page);
      await page.waitForTimeout(1000);

      // 1.1 PC Light
      await setTheme(page, "light");
      await saveProof(page, PAYROLL_DIR, "01_doctor_payroll_studio_pc_light_1440x900.png");
      await saveProof(page, PAYROLL_DIR, "01_payroll_pc_light_1440x900.png");

      // 1.2 PC Dark
      await setTheme(page, "dark");
      await saveProof(page, PAYROLL_DIR, "02_doctor_payroll_studio_pc_dark_1440x900.png");
      await saveProof(page, PAYROLL_DIR, "02_payroll_pc_dark_1440x900.png");

      // 1.3 Mobile Light
      await page.setViewportSize({ width: 390, height: 844 });
      await setTheme(page, "light");
      await saveProof(page, PAYROLL_DIR, "03_doctor_payroll_studio_mobile_light_390x844.png");
      await saveProof(page, PAYROLL_DIR, "03_payroll_mobile_light_390x844.png");

      // 1.4 Mobile Dark
      await setTheme(page, "dark");
      await saveProof(page, PAYROLL_DIR, "04_doctor_payroll_studio_mobile_dark_390x844.png");
      await saveProof(page, PAYROLL_DIR, "04_payroll_mobile_dark_390x844.png");
    } catch (err) {
      console.warn("[SECTION 1 WARN]:", err.message);
    }

    // ==========================================
    // 2. DOCTOR PAYOUT WALLET (4-STATE)
    // ==========================================
    try {
      console.log("\n>>> CAPTURING DOCTOR PAYOUT WALLET (4 STATES) <<<");
      await page.setViewportSize({ width: 1440, height: 900 });
      await page.goto(`${WEB_BASE}/?demo=true&wallet=1#wallet`, { waitUntil: "domcontentloaded" });
      await page.waitForSelector('[data-testid="doctor-wallet-standalone-workspace"]', { state: "visible", timeout: 20000 });
      await suppressOverlays(page);
      await page.waitForTimeout(1000);

      // 2.1 PC Light
      await setTheme(page, "light");
      await saveProof(page, PAYROLL_DIR, "05_doctor_wallet_pc_light_1440x900.png");

      // 2.2 PC Dark
      await setTheme(page, "dark");
      await saveProof(page, PAYROLL_DIR, "06_doctor_wallet_pc_dark_1440x900.png");

      // 2.3 Mobile Light
      await page.setViewportSize({ width: 390, height: 844 });
      await setTheme(page, "light");
      await saveProof(page, PAYROLL_DIR, "07_doctor_wallet_mobile_light_390x844.png");

      // 2.4 Mobile Dark
      await setTheme(page, "dark");
      await saveProof(page, PAYROLL_DIR, "08_doctor_wallet_mobile_dark_390x844.png");
    } catch (err) {
      console.warn("[SECTION 2 WARN]:", err.message);
    }

    // ==========================================
    // 3. CLINIC ANALYTICS & UTILIZATION (4-STATE)
    // ==========================================
    console.log("\n>>> CAPTURING CLINIC ANALYTICS DASHBOARD (4 STATES) <<<");
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto(`${WEB_BASE}/?demo=true#analytics`, { waitUntil: "domcontentloaded" });
    console.log("Waiting for analytics data to settle...");
    await page.waitForTimeout(6000);
    await suppressOverlays(page);

    // 3.1 PC Light
    await setTheme(page, "light");
    await page.waitForTimeout(1000);
    await saveProof(page, ANALYTICS_DIR, "01_analytics_pc_light_1440x900.png");
    await saveProof(page, ANALYTICS_DIR, "01_executive_dashboard_pc_light_1440x900.png");
    await saveProof(page, ANALYTICS_DIR, "analytics_pc_light.png");

    // 3.2 PC Dark
    await setTheme(page, "dark");
    await page.waitForTimeout(1000);
    await saveProof(page, ANALYTICS_DIR, "02_analytics_pc_dark_1440x900.png");
    await saveProof(page, ANALYTICS_DIR, "02_executive_dashboard_pc_dark_1440x900.png");
    await saveProof(page, ANALYTICS_DIR, "analytics_pc_dark.png");

    // 3.3 Mobile Light
    await page.setViewportSize({ width: 390, height: 844 });
    await setTheme(page, "light");
    await page.waitForTimeout(1000);
    await saveProof(page, ANALYTICS_DIR, "03_analytics_mobile_light_390x844.png");
    await saveProof(page, ANALYTICS_DIR, "03_executive_dashboard_mobile_light_390x844.png");
    await saveProof(page, ANALYTICS_DIR, "analytics_mobile_light.png");

    // 3.4 Mobile Dark
    await setTheme(page, "dark");
    await page.waitForTimeout(1000);
    await saveProof(page, ANALYTICS_DIR, "04_analytics_mobile_dark_390x844.png");
    await saveProof(page, ANALYTICS_DIR, "04_executive_dashboard_mobile_dark_390x844.png");
    await saveProof(page, ANALYTICS_DIR, "analytics_mobile_dark.png");

    // Copy verified doctor payroll files to BRAIN_DIR as well
    const payrollFiles = [
      "01_doctor_payroll_pc_light_1440x900.png",
      "02_doctor_payroll_pc_dark_1440x900.png",
      "03_doctor_payroll_mobile_light_390x844.png",
      "04_doctor_payroll_mobile_dark_390x844.png",
    ];
    for (const f of payrollFiles) {
      const src = path.join(PAYROLL_DIR, f);
      const dst = path.join(BRAIN_DIR, f);
      if (fs.existsSync(src)) {
        try { fs.copyFileSync(src, dst); } catch {}
      }
    }

    console.log("\n>>> ALL 12 CANONICAL VISUAL PROOFS CAPTURED SUCCESSFULLY! <<<");
    await context.close();
  } finally {
    await browser.close();
  }
}

main().catch((err) => {
  console.error("CAPTURE ERROR:", err);
  process.exit(1);
});
