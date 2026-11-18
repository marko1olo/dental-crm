/**
 * scripts/capture-fixer-ana-4state.cjs
 * Visual proof capture for Executive Analytics Studio & Doctor Payroll
 */

const { chromium } = require("playwright");
const fs = require("node:fs");
const path = require("node:path");

const WEB_BASE = process.env.WEB_BASE || "http://127.0.0.1:5173";
const PROOFS_DIR = path.resolve("docs/proofs/analytics");
const ORCHESTRATOR_BRAIN_DIR = path.resolve("C:/Users/Admin/.gemini/antigravity/brain/07663fdc-eba5-48a1-bbb4-3c4b8f181006");
const SUBAGENT_BRAIN_DIR = path.resolve("C:/Users/Admin/.gemini/antigravity/brain/bc1746ce-c0ab-491b-8462-d27c7dd49401");

for (const dir of [PROOFS_DIR, ORCHESTRATOR_BRAIN_DIR, SUBAGENT_BRAIN_DIR]) {
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
      [data-testid="global-toast"], .sa-toast,
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

async function saveProof(page, filename, alias) {
  const target = path.join(PROOFS_DIR, filename);
  await page.screenshot({ path: target, fullPage: false });
  for (const bDir of [ORCHESTRATOR_BRAIN_DIR, SUBAGENT_BRAIN_DIR]) {
    try { fs.copyFileSync(target, path.join(bDir, filename)); } catch {}
  }
  if (alias) {
    try {
      fs.copyFileSync(target, path.join(PROOFS_DIR, alias));
      for (const bDir of [ORCHESTRATOR_BRAIN_DIR, SUBAGENT_BRAIN_DIR]) {
        fs.copyFileSync(target, path.join(bDir, alias));
      }
    } catch {}
  }
  const stat = fs.statSync(target);
  if (stat.size < 20480) {
    throw new Error(`[BYTE GUARD FAIL] ${filename} size is ${stat.size} bytes (< 20KB)!`);
  }
  console.log(`[PROOF OK] ${filename} -> ${stat.size} bytes (>= 20KB guard passed)`);
}

async function main() {
  console.log("=== STARTING FIXER-ANA-01 VISUAL PROOFS GENERATOR ===");
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
    page.setDefaultTimeout(30000);
    page.on("console", (msg) => {
      if (msg.type() === "error") console.log("[BROWSER ERR]", msg.text().slice(0, 150));
    });

    // 1. Executive Analytics Studio Modal
    console.log("\n>>> Capturing Executive Analytics Studio Modal <<<");
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto(`${WEB_BASE}/?demo=true#executive-studio`, { waitUntil: "domcontentloaded" });
    console.log("Page domcontentloaded, waiting for selector...");
    await page.waitForSelector('[data-testid="executive-analytics-studio-modal"]', { state: "visible", timeout: 25000 });
    await suppressOverlays(page);
    await page.waitForTimeout(1000);

    // 1.1 PC Light
    await setTheme(page, "light");
    await saveProof(page, "01_executive_analytics_pc_light.png", "01_executive_analytics_pc_light_1440x900.png");

    // 1.2 PC Dark
    await setTheme(page, "dark");
    await saveProof(page, "02_executive_analytics_pc_dark.png", "02_executive_analytics_pc_dark_1440x900.png");

    // 1.3 Mobile Light
    await page.setViewportSize({ width: 390, height: 844 });
    await setTheme(page, "light");
    await saveProof(page, "03_executive_analytics_mobile_light.png", "03_executive_analytics_mobile_light_390x844.png");

    // 1.4 Mobile Dark
    await setTheme(page, "dark");
    await saveProof(page, "04_executive_analytics_mobile_dark.png", "04_executive_analytics_mobile_dark_390x844.png");

    // 2. Doctor Payroll Studio Modal
    console.log("\n>>> Capturing Doctor Payroll Studio Modal <<<");
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto(`${WEB_BASE}/?demo=true&payroll=1#payroll`, { waitUntil: "domcontentloaded" });
    await page.waitForSelector('[data-testid="doctor-payroll-studio-modal"]', { state: "visible", timeout: 25000 });
    await suppressOverlays(page);
    await page.waitForTimeout(1000);

    // 2.1 PC Light
    await setTheme(page, "light");
    await saveProof(page, "01_doctor_payroll_pc_light.png", "01_doctor_payroll_pc_light_1440x900.png");

    // 2.2 PC Dark
    await setTheme(page, "dark");
    await saveProof(page, "02_doctor_payroll_pc_dark.png", "02_doctor_payroll_pc_dark_1440x900.png");

    // 2.3 Mobile Light
    await page.setViewportSize({ width: 390, height: 844 });
    await setTheme(page, "light");
    await saveProof(page, "03_doctor_payroll_mobile_light.png", "03_doctor_payroll_mobile_light_390x844.png");

    // 2.4 Mobile Dark
    await setTheme(page, "dark");
    await saveProof(page, "04_doctor_payroll_mobile_dark.png", "04_doctor_payroll_mobile_dark_390x844.png");

    // 3. Analytics Dashboard View (Canonical 4-State)
    console.log("\n>>> Capturing Analytics Dashboard View <<<");
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto(`${WEB_BASE}/?demo=true#analytics`, { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(4000);
    await suppressOverlays(page);

    await setTheme(page, "light");
    await saveProof(page, "01_analytics_pc_light_1440x900.png");

    await setTheme(page, "dark");
    await saveProof(page, "02_analytics_pc_dark_1440x900.png");

    await page.setViewportSize({ width: 390, height: 844 });
    await setTheme(page, "light");
    await saveProof(page, "03_analytics_mobile_light_390x844.png");

    await setTheme(page, "dark");
    await saveProof(page, "04_analytics_mobile_dark_390x844.png");

    console.log("\n=== ALL VISUAL PROOFS CAPTURED SUCCESSFULLY ===");
    await context.close();
  } finally {
    await browser.close();
  }
}

main().catch((err) => {
  console.error("CAPTURE ERROR:", err);
  process.exit(1);
});
