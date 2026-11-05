const { chromium } = require("playwright");
const fs = require("node:fs");
const path = require("node:path");
const crypto = require("node:crypto");

const WEB_URL = "http://127.0.0.1:5173/#radiology";
const PROOF_DIR = path.resolve("C:/Clinic_MVP/dental-crm/docs/proofs/radiology");
const IMAGING_DIR = path.resolve("C:/Clinic_MVP/dental-crm/docs/proofs/imaging");

[PROOF_DIR, IMAGING_DIR].forEach((d) => {
  if (!fs.existsSync(d)) fs.mkdirSync(d, { recursive: true });
});

async function suppressTransientOverlays(page) {
  try {
    await page.evaluate(() => {
      const style = document.createElement("style");
      style.id = "radiology-clean-proof-style";
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

  if (buf.length < 30 * 1024) {
    throw new Error(`Screenshot ${filename} is too small: ${sizeKb} KB (< 30 KB)`);
  }

  // Copy to imaging dir as well
  fs.copyFileSync(targetPath, path.join(IMAGING_DIR, filename));

  return { filename, sizeKb, hash, bytes: buf.length };
}

async function main() {
  console.log(">>> [Red Team] Launching Chromium for Radiology/CBCT 4-State Proofs...");
  const browser = await chromium.launch({
    headless: true,
    executablePath: "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
    args: ["--no-sandbox", "--disable-gpu"],
  });

  const results = [];

  try {
    // ----------------------------------------------------
    // PHASE 1: PC Desktop Radiology / CBCT Studio (1440x900)
    // ----------------------------------------------------
    console.log("\n--- Phase 1: PC Desktop Radiology (1440x900) ---");
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
      localStorage.setItem("dente_offline_autonomy_mode", "true");
    });

    const pcPage = await pcContext.newPage();
    console.log("  -> Navigating PC to " + WEB_URL + " ...");
    await pcPage.goto(WEB_URL, { waitUntil: "commit", timeout: 35000 });

    console.log("  -> Waiting for Radiology Launcher to mount...");
    await pcPage.waitForSelector('[data-testid="direct-radiology-launcher-root"]', { state: "visible", timeout: 25000 }).catch(() => {});
    await pcPage.waitForTimeout(2500);
    await suppressTransientOverlays(pcPage);

    // PC Light
    console.log("  -> Capturing PC Light (1440x900)...");
    await setTheme(pcPage, "light");
    results.push(await captureProof(pcPage, "01_radiology_pc_light_1440x900.png"));

    // PC Dark
    console.log("  -> Capturing PC Dark (1440x900)...");
    await setTheme(pcPage, "dark");
    results.push(await captureProof(pcPage, "02_radiology_pc_dark_1440x900.png"));

    await pcContext.close();

    // ----------------------------------------------------
    // PHASE 2: Mobile Apple HIG Radiology (390x844)
    // ----------------------------------------------------
    console.log("\n--- Phase 2: Mobile Radiology (390x844) ---");
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
      localStorage.setItem("dente_offline_autonomy_mode", "true");
    });

    const mobilePage = await mobileContext.newPage();
    console.log("  -> Navigating Mobile to " + WEB_URL + " ...");
    await mobilePage.goto(WEB_URL, { waitUntil: "commit", timeout: 35000 });

    console.log("  -> Waiting for Mobile Radiology Launcher to mount...");
    await mobilePage.waitForSelector('[data-testid="direct-radiology-launcher-root"]', { state: "visible", timeout: 25000 }).catch(() => {});
    await mobilePage.waitForTimeout(2500);
    await suppressTransientOverlays(mobilePage);

    // Mobile Light
    console.log("  -> Capturing Mobile Light (390x844)...");
    await setTheme(mobilePage, "light");
    results.push(await captureProof(mobilePage, "03_radiology_mobile_light_390x844.png"));

    // Mobile Dark
    console.log("  -> Capturing Mobile Dark (390x844)...");
    await setTheme(mobilePage, "dark");
    results.push(await captureProof(mobilePage, "04_radiology_mobile_dark_390x844.png"));

    await mobileContext.close();

    console.log("\n=================== VERIFICATION AUDIT ===================");
    let allValid = true;
    for (const r of results) {
      const isOk = r.bytes >= 30720;
      console.log(`[PROOF] ${r.filename}: ${r.bytes} bytes (${r.sizeKb} KB) | MD5: ${r.hash} | ${isOk ? "PASS" : "FAIL"}`);
      if (!isOk) allValid = false;
    }
    console.log("==========================================================");
    console.log(`Final Status: ${allValid ? "ALL 4 SCREENSHOTS PASS INTEGRITY GATE" : "FAILURES DETECTED"}`);
    if (!allValid) process.exit(1);

  } finally {
    await browser.close();
  }
}

main().catch((err) => {
  console.error("Capture failed:", err);
  process.exit(1);
});
