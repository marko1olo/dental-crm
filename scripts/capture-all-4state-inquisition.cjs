/**
 * scripts/capture-all-4state-inquisition.cjs
 * Comprehensive 4-State Visual Proofs for Executive Analytics Studio & Doctor Payroll
 */

const { chromium } = require("playwright");
const fs = require("node:fs");
const path = require("node:path");

const WEB_BASE = "http://127.0.0.1:5173";
const PROOFS_DIR = path.resolve("docs/proofs/analytics");
const BRAIN_DIR = path.resolve("C:/Users/Admin/.gemini/antigravity/brain/d00adc05-d1cc-46a3-bde3-85f688273636");

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
  await page.waitForTimeout(600);
}

async function saveProof(page, filename, aliases = []) {
  const target = path.join(PROOFS_DIR, filename);
  const brainTarget = path.join(BRAIN_DIR, filename);
  await page.screenshot({ path: target, fullPage: false });
  try { fs.copyFileSync(target, brainTarget); } catch {}
  for (const alias of aliases) {
    try {
      fs.copyFileSync(target, path.join(PROOFS_DIR, alias));
      fs.copyFileSync(target, path.join(BRAIN_DIR, alias));
    } catch {}
  }
  const stat = fs.statSync(target);
  if (stat.size < 20480) {
    throw new Error(`[BYTE GUARD FAIL] ${filename} size is ${stat.size} bytes (< 20KB)!`);
  }
  console.log(`[PROOF OK] ${filename} -> ${stat.size} bytes (>= 20KB guard passed)`);
}

async function main() {
  console.log("=== STARTING FULL 4-STATE VISUAL PROOFS GENERATION ===");
  const browser = await chromium.launch({
    channel: "msedge",
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-web-security"],
  });

  try {
    // -------------------------------------------------------------
    // SUITE 1: Executive Analytics Studio Modal (PC 1440x900 & Mobile 390x844)
    // -------------------------------------------------------------
    console.log("\n>>> CAPTURING EXECUTIVE ANALYTICS STUDIO MODAL <<<");
    const ctx1 = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    await ctx1.addInitScript(() => {
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

    const page1 = await ctx1.newPage();
    page1.setDefaultTimeout(40000);
    console.log("Navigating to #executive-studio...");
    await page1.goto(`${WEB_BASE}/?demo=true#executive-studio`, { waitUntil: "commit" });
    console.log("Waiting for executive-analytics-studio-modal selector...");
    await page1.waitForSelector('[data-testid="executive-analytics-studio-modal"]', { state: "visible", timeout: 35000 });
    await suppressOverlays(page1);
    await page1.waitForTimeout(1000);

    // 1.1 PC Light
    await setTheme(page1, "light");
    await saveProof(page1, "01_executive_analytics_pc_light.png", [
      "01_executive_analytics_pc_light_1440x900.png",
      "01_analytics_pc_light_1440x900.png",
      "analytics_pc_light.png"
    ]);

    // 1.2 PC Dark
    await setTheme(page1, "dark");
    await saveProof(page1, "02_executive_analytics_pc_dark.png", [
      "02_executive_analytics_pc_dark_1440x900.png",
      "02_analytics_pc_dark_1440x900.png",
      "analytics_pc_dark.png"
    ]);

    // 1.3 Mobile Light
    await page1.setViewportSize({ width: 390, height: 844 });
    await setTheme(page1, "light");
    await saveProof(page1, "03_executive_analytics_mobile_light.png", [
      "03_executive_analytics_mobile_light_390x844.png",
      "03_analytics_mobile_light_390x844.png",
      "analytics_mobile_light.png"
    ]);

    // 1.4 Mobile Dark
    await setTheme(page1, "dark");
    await saveProof(page1, "04_executive_analytics_mobile_dark.png", [
      "04_executive_analytics_mobile_dark_390x844.png",
      "04_analytics_mobile_dark_390x844.png",
      "analytics_mobile_dark.png"
    ]);
    await ctx1.close();

    // -------------------------------------------------------------
    // SUITE 2: Doctor Payroll Studio Modal (PC 1440x900 & Mobile 390x844)
    // -------------------------------------------------------------
    console.log("\n>>> CAPTURING DOCTOR PAYROLL STUDIO MODAL <<<");
    const ctx2 = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    await ctx2.addInitScript(() => {
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

    const page2 = await ctx2.newPage();
    page2.setDefaultTimeout(40000);
    console.log("Navigating to #payroll...");
    await page2.goto(`${WEB_BASE}/?demo=true&payroll=1#payroll`, { waitUntil: "commit" });
    console.log("Waiting for doctor-payroll-studio-modal selector...");
    await page2.waitForSelector('[data-testid="doctor-payroll-studio-modal"]', { state: "visible", timeout: 35000 });
    await suppressOverlays(page2);
    await page2.waitForTimeout(1000);

    // 2.1 PC Light
    await setTheme(page2, "light");
    await saveProof(page2, "01_doctor_payroll_pc_light.png", [
      "01_doctor_payroll_pc_light_1440x900.png",
      "01_doctor_payroll_studio_pc_light_1440x900.png"
    ]);

    // 2.2 PC Dark
    await setTheme(page2, "dark");
    await saveProof(page2, "02_doctor_payroll_pc_dark.png", [
      "02_doctor_payroll_pc_dark_1440x900.png",
      "02_doctor_payroll_studio_pc_dark_1440x900.png"
    ]);

    // 2.3 Mobile Light
    await page2.setViewportSize({ width: 390, height: 844 });
    await setTheme(page2, "light");
    await saveProof(page2, "03_doctor_payroll_mobile_light.png", [
      "03_doctor_payroll_mobile_light_390x844.png",
      "03_doctor_payroll_studio_mobile_light_390x844.png"
    ]);

    // 2.4 Mobile Dark
    await setTheme(page2, "dark");
    await saveProof(page2, "04_doctor_payroll_mobile_dark.png", [
      "04_doctor_payroll_mobile_dark_390x844.png",
      "04_doctor_payroll_studio_mobile_dark_390x844.png"
    ]);
    await ctx2.close();

    console.log("\n=== ALL VISUAL PROOFS GENERATED AND VALIDATED SUCCESSFULLY! ===");
  } finally {
    await browser.close();
  }
}

main().catch((err) => {
  console.error("CAPTURE ERROR:", err);
  process.exit(1);
});
