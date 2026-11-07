const { chromium } = require("playwright");
const fs = require("node:fs");
const path = require("node:path");

const WEB_BASE = "http://127.0.0.1:5173";
const OUT_DOCS = path.resolve(process.cwd(), "docs/proofs/dsd");
const OUT_PHOTO = path.resolve(process.cwd(), "docs/proofs/photography");

if (!fs.existsSync(OUT_DOCS)) {
  fs.mkdirSync(OUT_DOCS, { recursive: true });
}
if (!fs.existsSync(OUT_PHOTO)) {
  fs.mkdirSync(OUT_PHOTO, { recursive: true });
}

async function saveProof(page, filename) {
  await page.waitForTimeout(800);
  const pDocs = path.join(OUT_DOCS, filename);
  const pPhoto = path.join(OUT_PHOTO, filename);
  await page.screenshot({ path: pDocs, fullPage: false, animations: "disabled" });
  fs.copyFileSync(pDocs, pPhoto);
  const size = fs.statSync(pDocs).size;
  console.log(`[Captured] ${filename} (${size} bytes) -> OK: ${size >= 20000}`);
  if (size < 20000) {
    throw new Error(`Screenshot ${filename} is too small (${size} bytes < 20KB)`);
  }
}

async function setTheme(page, theme) {
  try {
    await page.evaluate((th) => {
      const isDark = th === "dark";
      document.documentElement.setAttribute("data-theme", th);
      document.body.setAttribute("data-theme", th);
      document.documentElement.classList.toggle("dark", isDark);
      document.documentElement.classList.toggle("light", !isDark);
      document.body.classList.toggle("dark", isDark);
      document.body.classList.toggle("light", !isDark);
      document.documentElement.style.colorScheme = isDark ? "dark" : "light";
      try {
        localStorage.setItem("dente_theme_mode", th);
        localStorage.setItem("dente_theme", th);
      } catch (_) {}
    }, theme);
  } catch (_) {}
  await page.waitForTimeout(600);
}

async function run() {
  console.log("=== DIGITAL SMILE DESIGN (DSD) 4-STATE PROOFS ===");

  const browser = await chromium.launch({
    headless: true,
    executablePath: "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
    args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-gpu", "--disable-dev-shm-usage"],
  });

  try {
    // ----------------------------------------------------
    // 1 & 2: PC 1440x900 (Digital Smile Design Studio Modal)
    // ----------------------------------------------------
    console.log("\n--- 1. PC 1440x900 Context ---");
    const pcContext = await browser.newContext({
      viewport: { width: 1440, height: 900 },
      deviceScaleFactor: 1,
    });

    await pcContext.addInitScript(() => {
      sessionStorage.setItem("dente_unlocked", "true");
      localStorage.setItem("dente_onboarding_completed", "true");
      localStorage.setItem("dente_tour_completed", "true");
      localStorage.setItem("dente_tour_dismissed", "true");
      localStorage.setItem("dente_active_mode", "clinic");
    });

    const pcPage = await pcContext.newPage();
    pcPage.on("console", (msg) => {
      if (msg.type() === "error") console.log("[PC LOG ERR]:", msg.text());
    });

    const pcUrl = `${WEB_BASE}/#dsd`;
    console.log(`Navigating to ${pcUrl} ...`);
    await pcPage.goto(pcUrl, { waitUntil: "commit" });
    await pcPage.waitForTimeout(3000);

    console.log("Waiting for modal selector [data-testid='digital-smile-design-modal']...");
    await pcPage.waitForSelector('[data-testid="digital-smile-design-modal"]', { state: "visible", timeout: 30000 });
    console.log("Modal found! Waiting for canvas overlay...");
    await pcPage.waitForSelector('[data-testid="dsd-canvas-container"]', { state: "visible", timeout: 15000 });

    console.log(">>> 01_dsd_modal_pc_light_1440x900.png");
    await setTheme(pcPage, "light");
    await saveProof(pcPage, "01_dsd_modal_pc_light_1440x900.png");

    console.log(">>> 02_dsd_modal_pc_dark_1440x900.png");
    await setTheme(pcPage, "dark");
    await saveProof(pcPage, "02_dsd_modal_pc_dark_1440x900.png");

    // ----------------------------------------------------
    // 3 & 4: Mobile 390x844 (Doctor Smartphone View)
    // ----------------------------------------------------
    console.log("\n--- 2. Mobile 390x844 Context ---");
    const mobileContext = await browser.newContext({
      viewport: { width: 390, height: 844 },
      deviceScaleFactor: 2,
      isMobile: true,
      hasTouch: true,
    });

    await mobileContext.addInitScript(() => {
      sessionStorage.setItem("dente_unlocked", "true");
      localStorage.setItem("dente_onboarding_completed", "true");
      localStorage.setItem("dente_tour_completed", "true");
      localStorage.setItem("dente_tour_dismissed", "true");
      localStorage.setItem("dente_active_mode", "clinic");
    });

    const mobPage = await mobileContext.newPage();
    const mobUrl = `${WEB_BASE}/#dsd`;
    console.log(`Navigating to ${mobUrl} ...`);
    await mobPage.goto(mobUrl, { waitUntil: "commit" });
    await mobPage.waitForTimeout(3000);

    console.log("Waiting for mobile modal...");
    await mobPage.waitForSelector('[data-testid="digital-smile-design-modal"]', { state: "visible", timeout: 30000 });

    console.log(">>> 03_dsd_modal_mobile_light_390x844.png");
    await setTheme(mobPage, "light");
    await saveProof(mobPage, "03_dsd_modal_mobile_light_390x844.png");

    console.log("Switching to metrics tab on mobile for state 04...");
    const metricsTabBtn = await mobPage.waitForSelector("text='Замеры и ЗТЛ'");
    await metricsTabBtn.click();
    await mobPage.waitForTimeout(600);

    console.log(">>> 04_dsd_modal_mobile_dark_390x844.png");
    await setTheme(mobPage, "dark");
    await saveProof(mobPage, "04_dsd_modal_mobile_dark_390x844.png");

    console.log("\n==========================================");
    console.log("DIGITAL SMILE DESIGN 4-STATE PROOFS CAPTURED SUCCESSFULLY!");
    console.log("==========================================");
  } finally {
    await browser.close();
  }
}

run().catch((err) => {
  console.error("FATAL proof script error:", err);
  process.exit(1);
});
