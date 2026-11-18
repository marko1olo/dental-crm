const { chromium } = require("playwright");
const fs = require("node:fs");
const path = require("node:path");

const WEB_BASE = process.env.WEB_BASE || "http://127.0.0.1:5173";
const PROOFS_DIR = path.resolve("docs/proofs/schedule");
const SCREEN_DIR = path.resolve("docs/screenshots/schedule");

for (const dir of [PROOFS_DIR, SCREEN_DIR]) {
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
    document.querySelectorAll("vite-error-overlay, .tour-spotlight-root, [data-testid='guided-tour-spotlight-overlay']").forEach((el) => el.remove());
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
  await suppressOverlays(page);
  await page.waitForTimeout(500);

  const target = path.join(PROOFS_DIR, filename);
  await page.screenshot({ path: target, fullPage: false, animations: "disabled" });

  const stat = fs.statSync(target);
  if (stat.size < 20480) {
    throw new Error(`[BYTE GUARD FAIL] ${filename} size is ${stat.size} bytes (< 20KB)!`);
  }
  console.log(`[PROOF OK] ${filename} -> ${(stat.size / 1024).toFixed(1)} KB (>= 20KB guard passed)`);

  // Copy to aliases and screenshots dir
  fs.copyFileSync(target, path.join(SCREEN_DIR, filename));
  for (const alias of aliases) {
    fs.copyFileSync(target, path.join(PROOFS_DIR, alias));
    fs.copyFileSync(target, path.join(SCREEN_DIR, alias));
  }
}

async function main() {
  console.log("=== STARTING CANONICAL SCHEDULE 4-STATE VISUAL PROOF CAPTURE ===");
  const browser = await chromium.launch({
    headless: true,
    executablePath: "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });

  try {
    // ----------------------------------------------------
    // 1. PC DESKTOP SCHEDULE (1440x900)
    // ----------------------------------------------------
    console.log("\n>>> CAPTURING PC DESKTOP SCHEDULE (1440x900) <<<");
    const pcContext = await browser.newContext({
      viewport: { width: 1440, height: 900 },
      deviceScaleFactor: 1,
    });

    await pcContext.addInitScript(() => {
      localStorage.setItem("dente_clinic_token", "demo-token");
      localStorage.setItem("dente_staff_token", "demo-token");
      localStorage.setItem("dente_active_session_token", "demo-token");
      localStorage.setItem("dente_demo_mode", "true");
      localStorage.setItem("dente_demo_showcase", "true");
      localStorage.setItem("dente_active_role", "doctor");
      localStorage.setItem("dente_user_role", "doctor");
      localStorage.setItem("dente_role", "doctor");
      localStorage.setItem("dente_perspective", "doctor");
      localStorage.setItem("dente_active_nav", "schedule");
      localStorage.setItem("dente_active_view", "schedule");
      sessionStorage.setItem("dente_unlocked", "true");
      localStorage.setItem("dente_onboarding_completed", "true");
      localStorage.setItem("dente_tour_completed", "true");
      localStorage.setItem("dente_tour_dismissed", "true");
      localStorage.setItem("dental-crm:onboarding:v1", JSON.stringify({
        dismissed: true,
        step: "done",
        completed: true,
      }));
    });

    const pcPage = await pcContext.newPage();
    pcPage.setDefaultTimeout(45000);

    console.log("  Navigating PC to " + WEB_BASE + "/?demo=true#schedule ...");
    await pcPage.goto(`${WEB_BASE}/?demo=true#schedule`, { waitUntil: "commit" });

    // Wait for schedule view
    await pcPage.waitForSelector('[data-testid="schedule-view"], [data-testid="schedule-grid-view"], .schedule-grid-container', {
      state: "visible",
      timeout: 30000,
    });
    await suppressOverlays(pcPage);
    await pcPage.waitForTimeout(1500);

    // 1.1 PC Light
    await setTheme(pcPage, "light");
    await saveProof(pcPage, "01_schedule_pc_light_1440x900.png", ["01_schedule_grid_pc_light_1440x900.png", "pc_light.png"]);

    // 1.2 PC Dark
    await setTheme(pcPage, "dark");
    await saveProof(pcPage, "02_schedule_pc_dark_1440x900.png", ["02_schedule_grid_pc_dark_1440x900.png", "pc_dark.png"]);

    await pcContext.close();

    // ----------------------------------------------------
    // 2. MOBILE APPLE HIG AGENDA (390x844)
    // ----------------------------------------------------
    console.log("\n>>> CAPTURING MOBILE APPLE HIG AGENDA (390x844) <<<");
    const mobileContext = await browser.newContext({
      viewport: { width: 390, height: 844 },
      deviceScaleFactor: 2,
      isMobile: true,
      hasTouch: true,
    });

    await mobileContext.addInitScript(() => {
      localStorage.setItem("dente_clinic_token", "demo-token");
      localStorage.setItem("dente_staff_token", "demo-token");
      localStorage.setItem("dente_active_session_token", "demo-token");
      localStorage.setItem("dente_demo_mode", "true");
      localStorage.setItem("dente_demo_showcase", "true");
      localStorage.setItem("dente_active_role", "doctor");
      localStorage.setItem("dente_user_role", "doctor");
      localStorage.setItem("dente_role", "doctor");
      localStorage.setItem("dente_perspective", "doctor");
      localStorage.setItem("dente_active_nav", "schedule");
      localStorage.setItem("dente_active_view", "schedule");
      sessionStorage.setItem("dente_unlocked", "true");
      localStorage.setItem("dente_onboarding_completed", "true");
      localStorage.setItem("dente_tour_completed", "true");
      localStorage.setItem("dente_tour_dismissed", "true");
      localStorage.setItem("dental-crm:onboarding:v1", JSON.stringify({
        dismissed: true,
        step: "done",
        completed: true,
      }));
    });

    const mobilePage = await mobileContext.newPage();
    mobilePage.setDefaultTimeout(45000);

    console.log("  Navigating Mobile to " + WEB_BASE + "/?demo=true#schedule ...");
    await mobilePage.goto(`${WEB_BASE}/?demo=true#schedule`, { waitUntil: "commit" });

    // Wait for mobile agenda view
    await mobilePage.waitForSelector('[data-testid="schedule-mobile-agenda-view"], .schedule-mobile-agenda', {
      state: "visible",
      timeout: 30000,
    });
    await suppressOverlays(mobilePage);
    await mobilePage.waitForTimeout(1500);

    // 2.1 Mobile Light
    await setTheme(mobilePage, "light");
    await saveProof(mobilePage, "03_schedule_mobile_light_390x844.png", ["03_schedule_agenda_mobile_light_390x844.png", "mobile_light.png"]);

    // 2.2 Mobile Dark
    await setTheme(mobilePage, "dark");
    await saveProof(mobilePage, "04_schedule_mobile_dark_390x844.png", ["04_schedule_agenda_mobile_dark_390x844.png", "mobile_dark.png"]);

    await mobileContext.close();

    console.log("\n=======================================================");
    console.log(">>> [VICTORY] ALL 4 SCHEDULE PROOFS CAPTURED SUCCESSFULLY! <<<");
    console.log("=======================================================");
  } finally {
    await browser.close();
  }
}

main().catch((err) => {
  console.error("[FATAL ERROR]:", err);
  process.exit(1);
});
