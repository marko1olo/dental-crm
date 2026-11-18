const { chromium } = require("playwright");
const fs = require("node:fs");
const path = require("node:path");

const WEB_BASE = "http://127.0.0.1:5173";
const PROOFS_DIR = path.resolve("C:/Clinic_MVP/dental-crm/docs/proofs/payroll");
const BRAIN_DIR = path.resolve("C:/Users/Admin/.gemini/antigravity/brain/f9b584c6-78e1-4bfe-be01-d4710bbb5030");

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

async function initContext(browser, width, height, isDark = false) {
  const context = await browser.newContext({
    viewport: { width, height },
    colorScheme: isDark ? "dark" : "light",
  });

  await context.addInitScript(({ dark }) => {
    localStorage.setItem("dente_demo_mode", "true");
    localStorage.setItem("dente_demo_showcase", "true");
    localStorage.setItem("dente_active_role", "owner");
    localStorage.setItem("dente_user_role", "owner");
    localStorage.setItem("dente_active_mode", "clinic");
    sessionStorage.setItem("dente_unlocked", "true");
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
    } else {
      document.documentElement.classList.remove("dark");
      document.documentElement.classList.add("light");
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
  console.log(`[PROOF OK] ${filename} -> ${stat.size} bytes`);
}

async function captureDoctorSection(page, isDark = false) {
  await suppressOverlays(page);
  if (isDark) await setTheme(page, "dark");

  // Wait for header
  await page.waitForSelector('text=Отчёты руководителю', { timeout: 20000 });
  await page.waitForTimeout(1000);

  // Click tab "Врачи"
  const doctorsBtn = page.locator('button:has-text("Врачи")').first();
  await doctorsBtn.waitFor({ state: "visible", timeout: 10000 });
  await doctorsBtn.click();
  await page.waitForTimeout(1200);

  // Wait for table
  await page.waitForSelector('.ops-table, table', { timeout: 10000 });
  await page.waitForTimeout(800);
}

async function main() {
  console.log("Launching browser for Manager Reports Doctor Payroll Proofs...");
  const browser = await chromium.launch({
    headless: true,
    executablePath: "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });

  try {
    // 1. PC Light (1440x900)
    console.log("Capturing 1/4: PC Light (1440x900)...");
    const ctx1 = await initContext(browser, 1440, 900, false);
    const p1 = await ctx1.newPage();
    await p1.goto(`${WEB_BASE}/#reports`, { waitUntil: "domcontentloaded", timeout: 35000 });
    await captureDoctorSection(p1, false);
    await saveProof(p1, "01_doctor_payroll_pc_light_1440x900.png");
    await ctx1.close();

    // 2. PC Dark (1440x900)
    console.log("Capturing 2/4: PC Dark (1440x900)...");
    const ctx2 = await initContext(browser, 1440, 900, true);
    const p2 = await ctx2.newPage();
    await p2.goto(`${WEB_BASE}/#reports`, { waitUntil: "domcontentloaded", timeout: 35000 });
    await captureDoctorSection(p2, true);
    await saveProof(p2, "02_doctor_payroll_pc_dark_1440x900.png");
    await ctx2.close();

    // 3. Mobile Light (390x844)
    console.log("Capturing 3/4: Mobile Light (390x844)...");
    const ctx3 = await initContext(browser, 390, 844, false);
    const p3 = await ctx3.newPage();
    await p3.goto(`${WEB_BASE}/#reports`, { waitUntil: "domcontentloaded", timeout: 35000 });
    await captureDoctorSection(p3, false);
    await saveProof(p3, "03_doctor_payroll_mobile_light_390x844.png");
    await ctx3.close();

    // 4. Mobile Dark (390x844)
    console.log("Capturing 4/4: Mobile Dark (390x844)...");
    const ctx4 = await initContext(browser, 390, 844, true);
    const p4 = await ctx4.newPage();
    await p4.goto(`${WEB_BASE}/#reports`, { waitUntil: "domcontentloaded", timeout: 35000 });
    await captureDoctorSection(p4, true);
    await saveProof(p4, "04_doctor_payroll_mobile_dark_390x844.png");
    await ctx4.close();

    console.log("SUCCESS: All 4 doctor payroll proofs captured!");
  } finally {
    await browser.close();
  }
}

main().catch((err) => {
  console.error("FATAL ERROR:", err);
  process.exit(1);
});
