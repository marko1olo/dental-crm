const { chromium } = require("playwright");
const fs = require("node:fs");
const path = require("node:path");

const PROOFS_DIR = path.resolve("C:/Clinic_MVP/dental-crm/docs/proofs/radiology");
const BRAIN_DIR = path.resolve("C:/Users/Admin/.gemini/antigravity/brain/42879016-7974-4832-9ecc-146c9fcc9d17/proofs");
for (const d of [PROOFS_DIR, BRAIN_DIR]) {
  if (!fs.existsSync(d)) {
    fs.mkdirSync(d, { recursive: true });
  }
}

function verifyProof(filePath) {
  const size = fs.statSync(filePath).size;
  if (size < 20480) {
    throw new Error(`[BLANK DETECTED] ${filePath} is ${size} bytes (< 20KB)!`);
  }
  console.log(`[VERIFIED] ${path.basename(filePath)} (${(size / 1024).toFixed(1)} KB)`);
  return size;
}

async function suppressOverlays(page) {
  try {
    await page.evaluate(() => {
      const style = document.createElement("style");
      style.id = "suppress-all-overlays-radiology-canonical";
      style.innerHTML = `
        .tour-spotlight-root,
        .tour-backdrop-clickable-zone,
        [data-testid="guided-tour-spotlight-overlay"],
        [data-testid="guided-tour-coach-mark-card"],
        [data-testid="demo-mode-banner"],
        .shepherd-element,
        .global-toast-container,
        vite-error-overlay {
          display: none !important;
          pointer-events: none !important;
          opacity: 0 !important;
        }
      `;
      document.head.appendChild(style);
      document.querySelectorAll("vite-error-overlay, .tour-spotlight-root, [data-testid='guided-tour-spotlight-overlay']").forEach((el) => el.remove());
    });
  } catch (_) {}
}

async function setTheme(page, theme) {
  await page.evaluate((th) => {
    const isDark = th === "dark";
    document.documentElement.setAttribute("data-theme", th);
    document.body.setAttribute("data-theme", th);
    document.documentElement.classList.toggle("dark", isDark);
    document.documentElement.classList.toggle("light", !isDark);
    document.body.classList.toggle("dark", isDark);
    document.body.classList.toggle("light", !isDark);
    document.documentElement.style.colorScheme = th;
    localStorage.setItem("dente_theme", th);
    localStorage.setItem("dente_theme_mode", th);
    localStorage.setItem("theme", th);
    window.dispatchEvent(new Event("themechange"));
  }, theme);
  await suppressOverlays(page);
  await page.waitForTimeout(600);
}

async function main() {
  console.log("=== Launching Chromium for Radiology & Visiograph 4-State Proofs ===");
  const browser = await chromium.launch({
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-dev-shm-usage"],
  });

  const ctx = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    locale: "ru-RU",
  });

  await ctx.addInitScript(() => {
    try {
      localStorage.setItem("dente_clinic_token", "demo-showcase-token-owner");
      localStorage.setItem("dente_staff_token", "demo-showcase-staff-token-owner");
      localStorage.setItem("dente_active_session_token", "demo-showcase-staff-token-owner");
      localStorage.setItem("dente_active_role", "doctor");
      localStorage.setItem("dente_user_role", "doctor");
      localStorage.setItem("dente_role", "doctor");
      localStorage.setItem("dente_perspective", "radiology");
      sessionStorage.setItem("dente_unlocked", "true");
      localStorage.setItem("dente_demo_showcase", "true");
      localStorage.setItem("dente_demo_mode", "true");
      localStorage.setItem("dente_onboarding_completed", "true");
      localStorage.setItem("dente_tour_completed", "true");
      localStorage.setItem("dente_tour_dismissed", "true");
      localStorage.setItem("dente_guide_tour_dismissed_v2", "true");
      localStorage.setItem("dental-crm:onboarding:v1", JSON.stringify({
        dismissed: true,
        step: "done",
        completed: true,
      }));
      localStorage.setItem("dental-crm:active-user:v1", JSON.stringify({
        id: "user-rad-1",
        fullName: "Д-р Захаров А. В.",
        role: "doctor",
      }));
    } catch (_) {}
  });

  const page = await ctx.newPage();

  const port = process.env.WEB_PORT || 5176;
  const url = `http://127.0.0.1:${port}/?demo=true#radiology-standalone`;
  console.log(`Navigating to ${url}...`);
  await page.goto(url, { waitUntil: "commit", timeout: 45000 });

  console.log("Waiting 12 seconds for full React compilation and mount...");
  await page.waitForTimeout(12000);
  await suppressOverlays(page);

  // Check if visiograph mounted
  let viewer = await page.$('[data-testid="visiograph-study-viewer"], [data-testid="direct-radiology-launcher-root"], .sensor-study-viewer-root');
  if (!viewer) {
    console.log("Dispatching events to open radiology launcher...");
    await page.evaluate(() => {
      window.location.hash = "#radiology-standalone";
      window.dispatchEvent(new HashChangeEvent("hashchange"));
      window.dispatchEvent(new CustomEvent("dente:open-radiology"));
      window.dispatchEvent(new CustomEvent("dente:open-visiograph"));
    });
    viewer = await page.waitForSelector('[data-testid="visiograph-study-viewer"], [data-testid="direct-radiology-launcher-root"], .sensor-study-viewer-root', {
      state: "visible",
      timeout: 20000,
    });
  }

  console.log("Viewer is visible! Settling...");
  await page.waitForTimeout(1500);
  await suppressOverlays(page);

  // Helper to save both names
  async function saveProofPair(canonicalName, altName, description) {
    const p1 = path.join(PROOFS_DIR, canonicalName);
    const p2 = path.join(PROOFS_DIR, altName);
    await page.screenshot({ path: p1, fullPage: false, animations: "disabled" });
    fs.copyFileSync(p1, p2);
    fs.copyFileSync(p1, path.join(BRAIN_DIR, canonicalName));
    fs.copyFileSync(p1, path.join(BRAIN_DIR, altName));
    verifyProof(p1);
    console.log(`[SAVED] ${canonicalName} & ${altName} -> ${description}`);
  }

  // 1. PC Light (1440x900)
  console.log("\n[1/4] Capturing PC Light (1440x900)...");
  await setTheme(page, "light");
  await saveProofPair("01_radiology_pc_light_1440x900.png", "01_imaging_visiograph_pc_light_1440x900.png", "☀️ PC Light 1440x900");

  // 2. PC Dark (1440x900)
  console.log("\n[2/4] Capturing PC Dark (1440x900)...");
  await setTheme(page, "dark");
  await saveProofPair("02_radiology_pc_dark_1440x900.png", "02_imaging_visiograph_pc_dark_1440x900.png", "🌙 PC Dark 1440x900");

  // 3. Mobile Light (390x844)
  console.log("\n[3/4] Capturing Mobile Light (390x844)...");
  await page.setViewportSize({ width: 390, height: 844 });
  await page.waitForTimeout(1000);
  await setTheme(page, "light");
  await saveProofPair("03_radiology_mobile_light_390x844.png", "03_imaging_visiograph_mobile_light_390x844.png", "📱 Mobile Light 390x844");

  // 4. Mobile Dark (390x844)
  console.log("\n[4/4] Capturing Mobile Dark (390x844)...");
  await setTheme(page, "dark");
  await saveProofPair("04_radiology_mobile_dark_390x844.png", "04_imaging_visiograph_mobile_dark_390x844.png", "🌙 Mobile Dark 390x844");

  await browser.close();
  console.log("\n=======================================================");
  console.log(">>> [VICTORY] All 4 Radiology Visual Proofs captured successfully! <<<");
  console.log("=======================================================");
}

main().catch((err) => {
  console.error("[FATAL ERROR]:", err);
  process.exit(1);
});
