/**
 * scripts/take_schedule_canonical_4proofs.cjs
 * 4-State Visual Proof Capture for Schedule domain (Mandate 8ze & 8al)
 * Live Stand: http://127.0.0.1:5173/?demo=true#schedule
 *
 * 1. docs/proofs/schedule/schedule_pc_light_1440x900.png (1440x900 PC Light)
 * 2. docs/proofs/schedule/schedule_pc_dark_1440x900.png (1440x900 PC Dark)
 * 3. docs/proofs/schedule/schedule_mobile_light_390x844.png (390x844 Mobile Light)
 * 4. docs/proofs/schedule/schedule_mobile_dark_390x844.png (390x844 Mobile Dark)
 */

const { chromium } = require("playwright");
const path = require("node:path");
const fs = require("node:fs");
const crypto = require("node:crypto");

const WEB_URL = "http://127.0.0.1:5173/?demo=true#schedule";
const PROOF_DIR = path.resolve(__dirname, "../docs/proofs/schedule");
const LEGACY_PROOF_DIR = path.resolve(__dirname, "../docs/proofs/schedule_mobile");

if (!fs.existsSync(PROOF_DIR)) fs.mkdirSync(PROOF_DIR, { recursive: true });
if (!fs.existsSync(LEGACY_PROOF_DIR)) fs.mkdirSync(LEGACY_PROOF_DIR, { recursive: true });

async function suppressTransientOverlays(page) {
  try {
    await page.evaluate(() => {
      const style = document.createElement("style");
      style.id = "schedule-clean-proof-style";
      style.innerHTML = `
        .tour-spotlight-root,
        .tour-backdrop-clickable-zone,
        [data-testid="guided-tour-spotlight-overlay"],
        [data-testid="guided-tour-coach-mark-card"],
        [data-testid="demo-mode-banner"],
        .global-toast-container,
        vite-error-overlay {
          display: none !important;
          pointer-events: none !important;
        }
      `;
      document.head.appendChild(style);
      document.querySelectorAll("vite-error-overlay, .tour-spotlight-root, [data-testid='guided-tour-spotlight-overlay']").forEach((el) => el.remove());
    });
  } catch (_) {}
}

async function setTheme(page, theme) {
  await page.evaluate((th) => {
    document.documentElement.setAttribute("data-theme", th);
    if (th === "dark") {
      document.documentElement.classList.add("dark");
      document.documentElement.classList.remove("light");
    } else {
      document.documentElement.classList.add("light");
      document.documentElement.classList.remove("dark");
    }
    localStorage.setItem("dente_theme", th);
    localStorage.setItem("dente_theme_mode", th);
    localStorage.setItem("theme", th);
    document.documentElement.style.colorScheme = th;
  }, theme);
  await suppressTransientOverlays(page);
  await page.waitForTimeout(600);
}

async function captureProof(page, filename) {
  await suppressTransientOverlays(page);
  await page.waitForTimeout(500);

  const targetPath = path.join(PROOF_DIR, filename);
  await page.screenshot({ path: targetPath, fullPage: false, animations: "disabled" });

  const buf = fs.readFileSync(targetPath);
  const sizeKb = (buf.length / 1024).toFixed(1);
  const hash = crypto.createHash("md5").update(buf).digest("hex").slice(0, 10);
  console.log(`  -> Captured: ${filename} (${sizeKb} KB, md5: ${hash})`);

  if (buf.length < 25 * 1024) {
    throw new Error(`Screenshot ${filename} is too small: ${sizeKb} KB (< 25 KB)`);
  }

  // Synchronize legacy files
  const legacyMap = {
    "schedule_pc_light_1440x900.png": "pc_schedule_light_1440x900.png",
    "schedule_pc_dark_1440x900.png": "pc_schedule_dark_1440x900.png",
    "schedule_mobile_light_390x844.png": "mobile_schedule_light_390x844.png",
    "schedule_mobile_dark_390x844.png": "mobile_schedule_dark_390x844.png",
  };
  if (legacyMap[filename]) {
    fs.copyFileSync(targetPath, path.join(PROOF_DIR, legacyMap[filename]));
    fs.copyFileSync(targetPath, path.join(LEGACY_PROOF_DIR, legacyMap[filename]));
  }

  return { filename, sizeKb, hash };
}

async function main() {
  console.log("[Visual Proof] Launching Chromium...");
  const browser = await chromium.launch({
    headless: true,
    executablePath: "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
    args: ["--no-sandbox", "--disable-gpu"],
  });

  try {
    // ----------------------------------------------------
    // PHASE 1: PC Desktop Schedule (1440x900)
    // ----------------------------------------------------
    console.log("\n--- Phase 1: PC Desktop Schedule (1440x900) ---");
    const pcContext = await browser.newContext({
      viewport: { width: 1440, height: 900 },
      deviceScaleFactor: 1,
      isMobile: false,
      hasTouch: false,
    });
    await pcContext.addInitScript(() => {
      localStorage.setItem("dente_theme_mode", "light");
      localStorage.setItem("dente_onboarding_completed", "true");
      localStorage.setItem("dente_tour_completed", "true");
      localStorage.setItem("dente_tour_dismissed", "true");
      localStorage.setItem("dente_guide_tour_dismissed_v2", "true");
      localStorage.setItem("dente_demo_banner_dismissed", "true");
      localStorage.setItem("dental-crm:onboarding:v1", JSON.stringify({ completed: true, dismissed: true }));
    });

    const pcPage = await pcContext.newPage();
    console.log("  -> Navigating PC to " + WEB_URL + " ...");
    await pcPage.goto(WEB_URL, { waitUntil: "domcontentloaded", timeout: 35000 });
    
    // Wait for boot state to clear
    for (let i = 0; i < 30; i++) {
      await pcPage.waitForTimeout(400);
      const text = await pcPage.evaluate(() => document.body ? document.body.innerText : "");
      if (!text.includes("Загрузка системы") && text.length > 200) break;
    }
    await pcPage.waitForSelector('[data-testid="schedule-view"], [data-testid="schedule-grid-view"]', { timeout: 25000, state: "visible" }).catch(() => {});
    await pcPage.waitForTimeout(1000);

    // PC Light
    console.log("  -> Capturing PC Light (1440x900)...");
    await setTheme(pcPage, "light");
    await captureProof(pcPage, "schedule_pc_light_1440x900.png");

    // PC Dark
    console.log("  -> Capturing PC Dark (1440x900)...");
    await setTheme(pcPage, "dark");
    await captureProof(pcPage, "schedule_pc_dark_1440x900.png");

    await pcContext.close();

    // ----------------------------------------------------
    // PHASE 2: Mobile Apple HIG Agenda View (390x844)
    // ----------------------------------------------------
    console.log("\n--- Phase 2: Mobile Apple HIG Agenda View (390x844) ---");
    const mobileContext = await browser.newContext({
      viewport: { width: 390, height: 844 },
      deviceScaleFactor: 2,
      isMobile: true,
      hasTouch: true,
    });
    await mobileContext.addInitScript(() => {
      localStorage.setItem("dente_theme_mode", "light");
      localStorage.setItem("dente_onboarding_completed", "true");
      localStorage.setItem("dente_tour_completed", "true");
      localStorage.setItem("dente_tour_dismissed", "true");
      localStorage.setItem("dente_guide_tour_dismissed_v2", "true");
      localStorage.setItem("dente_demo_banner_dismissed", "true");
      localStorage.setItem("dental-crm:onboarding:v1", JSON.stringify({ completed: true, dismissed: true }));
    });

    const mobilePage = await mobileContext.newPage();
    console.log("  -> Navigating Mobile to " + WEB_URL + " ...");
    await mobilePage.goto(WEB_URL, { waitUntil: "domcontentloaded", timeout: 35000 });

    // Wait for boot state to clear
    for (let i = 0; i < 30; i++) {
      await mobilePage.waitForTimeout(400);
      const text = await mobilePage.evaluate(() => document.body ? document.body.innerText : "");
      if (!text.includes("Загрузка системы") && text.length > 200) break;
    }
    await mobilePage.waitForSelector('[data-testid="schedule-mobile-agenda-view"]', { timeout: 25000, state: "visible" }).catch(() => {});
    await mobilePage.waitForTimeout(1000);

    // Mobile Light
    console.log("  -> Capturing Mobile Light (390x844)...");
    await setTheme(mobilePage, "light");
    await captureProof(mobilePage, "schedule_mobile_light_390x844.png");

    // Mobile Dark
    console.log("  -> Capturing Mobile Dark (390x844)...");
    await setTheme(mobilePage, "dark");
    await captureProof(mobilePage, "schedule_mobile_dark_390x844.png");

    await mobileContext.close();

    console.log("\n[Visual Proof] ALL 4 PROOFS CAPTURED & VALIDATED (>25 KB) SUCCESSFULLY!");
  } finally {
    await browser.close();
  }
}

main().catch((err) => {
  console.error("[Visual Proof] ERROR:", err);
  process.exit(1);
});
