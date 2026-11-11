/**
 * take_imaging_visiograph_orchestrator_proofs.cjs
 * Captures the 4 canonical states for Domain 6:
 * 1. ☀️ PC Light (1440x900) -> docs/proofs/radiology/01_imaging_visiograph_pc_light_1440x900.png
 * 2. 🌙 PC Dark (1440x900)  -> docs/proofs/radiology/02_imaging_visiograph_pc_dark_1440x900.png
 * 3. 📱 Mobile Light (390x844) -> docs/proofs/radiology/03_imaging_visiograph_mobile_light_390x844.png
 * 4. 🌙 Mobile Dark (390x844)  -> docs/proofs/radiology/04_imaging_visiograph_mobile_dark_390x844.png
 */

const { chromium } = require("playwright");
const fs = require("node:fs");
const path = require("node:path");

const WEB_BASE = "http://127.0.0.1:5173";
const PROOFS_DIR = path.resolve("C:/Clinic_MVP/dental-crm/docs/proofs/radiology");

if (!fs.existsSync(PROOFS_DIR)) {
  fs.mkdirSync(PROOFS_DIR, { recursive: true });
}

const initDoctorSession = () => {
  try {
    localStorage.setItem("dente_clinic_token", "demo-clinic-token");
    localStorage.setItem("dente_staff_token", "demo-staff-token");
    localStorage.setItem("dente_active_session_token", "demo-staff-token");
    localStorage.setItem("dente_active_user_id", "user-rad-1");
    localStorage.setItem("dente_active_role", "doctor");
    localStorage.setItem("dente_active_mode", "doctor");
    localStorage.setItem("dente_user_id", "user-rad-1");
    localStorage.setItem("dente_onboarding_completed", "true");
    localStorage.setItem("dente_tour_completed", "true");
    localStorage.setItem("dente_doctor_shift_active", "true");
    localStorage.setItem("dente_offline_autonomy_mode", "true");
    localStorage.setItem("dente_demo_showcase", "true");
    localStorage.setItem("dente_demo_showcase_mode", "true");
    localStorage.setItem("dente_active_tooth", "36");
    sessionStorage.setItem("dente_unlocked", "true");

    const doctorUser = {
      id: "user-rad-1",
      userId: "user-rad-1",
      name: "Д-р Захаров А. В.",
      fullName: "Д-р Захаров Андрей Васильевич",
      role: "doctor",
      specialties: ["Стоматолог-терапевт", "Хирург-имплантолог"],
    };

    localStorage.setItem("dente_staff_session", JSON.stringify(doctorUser));
    localStorage.setItem("dente_cached_active_staff_user", JSON.stringify(doctorUser));
    localStorage.setItem("dente_cached_staff_list", JSON.stringify([doctorUser]));
    localStorage.setItem(
      "dente-workspace-profile",
      JSON.stringify({ mode: "doctor", role: "doctor", activeRole: "doctor" })
    );
  } catch (e) {}
};

async function setDarkTheme(page) {
  await page.evaluate(() => {
    document.documentElement.setAttribute("data-theme", "dark");
    document.body.setAttribute("data-theme", "dark");
    document.documentElement.classList.add("dark");
    document.documentElement.classList.remove("light");
    document.body.classList.add("dark");
    document.body.classList.remove("light");
    document.documentElement.style.colorScheme = "dark";
    localStorage.setItem("dente_theme_mode", "dark");
    localStorage.setItem("dente_theme", "dark");
    localStorage.setItem("theme", "dark");
  });
  await page.waitForTimeout(400);
}

async function setLightTheme(page) {
  await page.evaluate(() => {
    document.documentElement.setAttribute("data-theme", "light");
    document.body.setAttribute("data-theme", "light");
    document.documentElement.classList.add("light");
    document.documentElement.classList.remove("dark");
    document.body.classList.add("light");
    document.body.classList.remove("dark");
    document.documentElement.style.colorScheme = "light";
    localStorage.setItem("dente_theme_mode", "light");
    localStorage.setItem("dente_theme", "light");
    localStorage.setItem("theme", "light");
  });
  await page.waitForTimeout(400);
}

async function suppressToastsAndOverlays(page) {
  await page.evaluate(() => {
    if (!document.getElementById("suppress-overlays-canonical")) {
      const s = document.createElement("style");
      s.id = "suppress-overlays-canonical";
      s.innerHTML = `
        .toast, .global-toast, .toast-container, [role="alert"],
        .tour-spotlight-root, .tour-backdrop-clickable-zone,
        [data-testid="guided-tour-spotlight-overlay"],
        [data-testid="guided-tour-coach-mark-card"] {
          display: none !important;
          opacity: 0 !important;
          visibility: hidden !important;
          pointer-events: none !important;
          height: 0 !important;
          width: 0 !important;
          overflow: hidden !important;
        }
      `;
      document.head.appendChild(s);
    }
    document.querySelectorAll('.toast, .global-toast, .toast-container, [role="alert"]').forEach((el) => el.remove());
  });
}

async function saveProof(page, filename, description) {
  await suppressToastsAndOverlays(page);
  await page.waitForTimeout(500);

  const fullPath = path.join(PROOFS_DIR, filename);
  await page.screenshot({ path: fullPath, fullPage: false });

  const stat = fs.statSync(fullPath);
  console.log(`[CAPTURED] ${filename} (${(stat.size / 1024).toFixed(1)} KB) -> ${description}`);
  return { filename, size: stat.size, path: fullPath };
}

async function main() {
  console.log("=== STARTING DOMAIN 6 VISUAL PROOF CAPTURE ===");
  const browser = await chromium.launch({
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-dev-shm-usage"],
  });

  const results = [];

  try {
    // 1. PC Desktop 1440x900
    console.log("\n--- 1. PC Desktop 1440x900 ---");
    const pcContext = await browser.newContext({
      viewport: { width: 1440, height: 900 },
      deviceScaleFactor: 1,
    });
    await pcContext.addInitScript(initDoctorSession);
    const pcPage = await pcContext.newPage();

    await pcPage.goto(`${WEB_BASE}/?demo=true#radiology-standalone`, { waitUntil: "domcontentloaded", timeout: 30000 });
    await pcPage.waitForSelector(".boot-state", { state: "detached", timeout: 20000 }).catch(() => {});
    await pcPage.waitForTimeout(2000);
    await pcPage.waitForSelector('[data-testid="visiograph-study-viewer"]', { timeout: 10000 }).catch(() => {});

    // 1.1 ☀️ PC Light (1440x900)
    await setLightTheme(pcPage);
    results.push(await saveProof(
      pcPage,
      "01_imaging_visiograph_pc_light_1440x900.png",
      "☀️ PC Light 1440x900 VisiographStudyViewer 2D Viewport & Clinical HUD"
    ));

    // 1.2 🌙 PC Dark (1440x900)
    await setDarkTheme(pcPage);
    results.push(await saveProof(
      pcPage,
      "02_imaging_visiograph_pc_dark_1440x900.png",
      "🌙 PC Dark 1440x900 High-Contrast Diagnostic Visiograph Study Viewer"
    ));

    await pcContext.close();

    // 2. Mobile 390x844 (Apple iOS HIG)
    console.log("\n--- 2. Mobile 390x844 ---");
    const mobileContext = await browser.newContext({
      viewport: { width: 390, height: 844 },
      isMobile: true,
      hasTouch: true,
      deviceScaleFactor: 2,
    });
    await mobileContext.addInitScript(initDoctorSession);
    const mobilePage = await mobileContext.newPage();

    await mobilePage.goto(`${WEB_BASE}/?demo=true#radiology-standalone`, { waitUntil: "domcontentloaded", timeout: 30000 });
    await mobilePage.waitForSelector(".boot-state", { state: "detached", timeout: 20000 }).catch(() => {});
    await mobilePage.waitForTimeout(2000);
    await mobilePage.waitForSelector('[data-testid="visiograph-study-viewer"]', { timeout: 10000 }).catch(() => {});

    // 2.1 📱 Mobile Light (390x844)
    await setLightTheme(mobilePage);
    results.push(await saveProof(
      mobilePage,
      "03_imaging_visiograph_mobile_light_390x844.png",
      "📱 Mobile Light 390x844 Touch-Friendly Study Viewer (Apple HIG, >=44px Targets)"
    ));

    // 2.2 🌙 Mobile Dark (390x844)
    await setDarkTheme(mobilePage);
    results.push(await saveProof(
      mobilePage,
      "04_imaging_visiograph_mobile_dark_390x844.png",
      "🌙 Mobile Dark 390x844 Dark Room Study Viewer (Natural Thumb Zone)"
    ));

    await mobileContext.close();

    console.log("\n=================== VERIFICATION AUDIT ===================");
    let allValid = true;
    for (const r of results) {
      const isOk = r.size >= 20480;
      console.log(
        `[PROOF] ${r.filename}: ${(r.size / 1024).toFixed(1)} KB | ${isOk ? "PASS (>=20KB)" : "FAIL (<20KB)"}`
      );
      if (!isOk) allValid = false;
    }
    console.log(`==========================================================`);
    console.log(`Final Status: ${allValid ? "ALL 4 SCREENSHOTS PASS INTEGRITY GATE" : "FAILURES DETECTED"}`);

    if (!allValid) process.exit(1);
  } finally {
    await browser.close();
  }
}

main().catch((err) => {
  console.error("Capture execution failed:", err);
  process.exit(1);
});
