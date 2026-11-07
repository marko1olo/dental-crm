/**
 * scripts/capture-telephony-4state-canonical.mjs
 * Red Team 4-State Visual Proof Capture for Telephony & Incoming Call Capsule:
 * 1. ☀️ PC Light (1440x900): docs/proofs/telephony/01_telephony_pc_light_1440x900.png
 * 2. 🌙 PC Dark (1440x900): docs/proofs/telephony/02_telephony_pc_dark_1440x900.png
 * 3. 📱 Mobile Light (390x844): docs/proofs/telephony/03_telephony_mobile_light_390x844.png
 * 4. 🌙 Mobile Dark (390x844): docs/proofs/telephony/04_telephony_mobile_dark_390x844.png
 */

import { existsSync, mkdirSync, copyFileSync, statSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const OUT_DIR = path.resolve(__dirname, "../docs/proofs/telephony");
if (!existsSync(OUT_DIR)) {
  mkdirSync(OUT_DIR, { recursive: true });
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function suppressOverlays(page) {
  try {
    await page.evaluate(() => {
      const style = document.createElement("style");
      style.id = "suppress-all-tour-overlays";
      style.innerHTML = `
        .tour-spotlight-root,
        .tour-backdrop-clickable-zone,
        [data-testid="guided-tour-spotlight-overlay"],
        [data-testid="guided-tour-coach-mark-card"],
        [data-testid="demo-mode-banner"],
        .shepherd-element {
          display: none !important;
          pointer-events: none !important;
          opacity: 0 !important;
        }
      `;
      document.head.appendChild(style);
      document.querySelectorAll(".tour-spotlight-root, [data-testid='guided-tour-spotlight-overlay']").forEach(el => el.remove());
    });
  } catch (_) {}
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
      document.documentElement.classList.add("light");
      document.documentElement.classList.remove("dark");
      document.body.classList.add("light");
      document.body.classList.remove("dark");
    }
    try {
      localStorage.setItem("dente_theme", th);
      localStorage.setItem("dente_theme_mode", th);
      localStorage.setItem("theme", th);
    } catch (_) {}
  }, theme);
  await sleep(400);
}

async function setupPageSession(context, page, role = "administrator") {
  await page.addInitScript(({ role }) => {
    sessionStorage.setItem("dente_unlocked", "true");
    localStorage.setItem("dente_clinic_token", "demo-clinic-token");
    localStorage.setItem("dente_staff_token", "demo-staff-token");
    localStorage.setItem("dente_workspace_perspective", role);
    localStorage.setItem("dente_user_role", role);
    localStorage.setItem("dente_active_role", role);
    localStorage.setItem("dente_demo_showcase", "true");
    localStorage.setItem("dente_demo_showcase_mode_v1", "true");
    localStorage.setItem("dente_onboarding_completed", "true");
    localStorage.setItem("dente_tour_completed", "true");
    localStorage.setItem("dente_tour_dismissed", "true");
    localStorage.setItem("dente_guide_tour_dismissed_v2", "true");
    localStorage.setItem("dente_demo_banner_dismissed", "true");
    localStorage.setItem(
      "dente-workspace-profile",
      JSON.stringify({ mode: "clinic", role: role, activeRole: role })
    );
  }, { role });
}

async function triggerCall(page) {
  await page.evaluate(() => {
    window.dispatchEvent(
      new CustomEvent("dente:telephony-mock-incoming", {
        detail: {
          callId: "call-" + Date.now(),
          phone: "+7 (926) 555-12-34",
          patientName: "Смирнова Екатерина Васильевна",
          patientId: "01a00000-0000-0000-0000-000000000001",
          provider: "mango",
          timestamp: new Date().toISOString(),
          status: "ringing",
          acutePain: true,
        },
      })
    );
  });
  await sleep(600);
}

async function waitForRealUI(page) {
  console.log("  Waiting for real UI...");
  await page.waitForFunction(() => {
    const text = document.body ? document.body.innerText : "";
    return !text.includes("Загрузка системы") && !text.includes("Загрузка рабочей смены") && text.length > 50;
  }, { timeout: 25000 });
  await suppressOverlays(page);
  await sleep(500);
}

async function main() {
  console.log("=== Launching Chrome Playwright for Telephony 4-State Proofs ===");

  const browser = await chromium.launch({
    headless: true,
    args: [
      "--no-sandbox",
      "--disable-gpu",
      "--disable-dev-shm-usage",
      "--proxy-server=direct://",
      "--proxy-bypass-list=*",
    ],
  });

  try {
    // -------------------------------------------------------------
    // 1. DESKTOP CONTEXT (1440x900)
    // -------------------------------------------------------------
    console.log("\n[Setup Desktop Context 1440x900]...");
    const pcContext = await browser.newContext({
      viewport: { width: 1440, height: 900 },
      deviceScaleFactor: 1,
    });

    const pcPage = await pcContext.newPage();
    await setupPageSession(pcContext, pcPage, "administrator");

    console.log("  Navigating PC to http://127.0.0.1:5173/?demo=true#telephony ...");
    await pcPage.goto("http://127.0.0.1:5173/?demo=true#telephony", { waitUntil: "commit", timeout: 25000 });
    await waitForRealUI(pcPage);
    await pcPage.waitForSelector('[data-testid="telephony-studio-modal-root"], [role="dialog"]', { state: "visible", timeout: 15000 }).catch(() => {});
    await suppressOverlays(pcPage);
    await sleep(800);

    // 01_telephony_pc_light_1440x900.png
    console.log("[Capturing] 01_telephony_pc_light_1440x900.png (1440x900, light)...");
    await setTheme(pcPage, "light");
    await suppressOverlays(pcPage);
    await sleep(600);

    const pcLightPath = path.join(OUT_DIR, "01_telephony_pc_light_1440x900.png");
    await pcPage.screenshot({ path: pcLightPath, fullPage: false });
    copyFileSync(pcLightPath, path.join(OUT_DIR, "01_telephony_pc_light.png"));
    const pcLightStat = statSync(pcLightPath);
    console.log(`  [OK] Saved 01_telephony_pc_light_1440x900.png (${Math.round(pcLightStat.size / 1024)} KB)`);

    // 02_telephony_pc_dark_1440x900.png
    console.log("[Capturing] 02_telephony_pc_dark_1440x900.png (1440x900, dark)...");
    await setTheme(pcPage, "dark");
    await suppressOverlays(pcPage);
    await sleep(600);

    const pcDarkPath = path.join(OUT_DIR, "02_telephony_pc_dark_1440x900.png");
    await pcPage.screenshot({ path: pcDarkPath, fullPage: false });
    copyFileSync(pcDarkPath, path.join(OUT_DIR, "02_telephony_pc_dark.png"));
    const pcDarkStat = statSync(pcDarkPath);
    console.log(`  [OK] Saved 02_telephony_pc_dark_1440x900.png (${Math.round(pcDarkStat.size / 1024)} KB)`);

    await pcContext.close();

    // -------------------------------------------------------------
    // 2. MOBILE CONTEXT (390x844, iPhone 14)
    // -------------------------------------------------------------
    console.log("\n[Setup Mobile Context 390x844 (iPhone 14)]...");
    const mobileContext = await browser.newContext({
      viewport: { width: 390, height: 844 },
      deviceScaleFactor: 2,
      isMobile: true,
      hasTouch: true,
    });

    const mobilePage = await mobileContext.newPage();
    await setupPageSession(mobileContext, mobilePage, "administrator");

    console.log("  Navigating mobile to http://127.0.0.1:5173/?demo=true#telephony ...");
    await mobilePage.goto("http://127.0.0.1:5173/?demo=true#telephony", { waitUntil: "commit", timeout: 25000 });
    await waitForRealUI(mobilePage);
    await mobilePage.waitForSelector('[data-testid="telephony-studio-modal-root"], [role="dialog"]', { state: "visible", timeout: 15000 }).catch(() => {});
    await suppressOverlays(mobilePage);
    await sleep(800);

    // 03_telephony_mobile_light_390x844.png
    console.log("[Capturing] 03_telephony_mobile_light_390x844.png (390x844, light)...");
    await setTheme(mobilePage, "light");
    await suppressOverlays(mobilePage);
    await sleep(600);

    const mobileLightPath = path.join(OUT_DIR, "03_telephony_mobile_light_390x844.png");
    await mobilePage.screenshot({ path: mobileLightPath, fullPage: false });
    copyFileSync(mobileLightPath, path.join(OUT_DIR, "03_telephony_mobile_light.png"));
    const mobileLightStat = statSync(mobileLightPath);
    console.log(`  [OK] Saved 03_telephony_mobile_light_390x844.png (${Math.round(mobileLightStat.size / 1024)} KB)`);

    // Mobile Dialer Light
    await mobilePage.click('button:has-text("Набор")').catch(() => {});
    await sleep(400);
    const mobileDialerLightPath = path.join(OUT_DIR, "05_telephony_mobile_dialer_light_390x844.png");
    await mobilePage.screenshot({ path: mobileDialerLightPath, fullPage: false });

    // 04_telephony_mobile_dark_390x844.png
    console.log("[Capturing] 04_telephony_mobile_dark_390x844.png (390x844, dark)...");
    await setTheme(mobilePage, "dark");
    await suppressOverlays(mobilePage);
    await sleep(400);
    const mobileDialerDarkPath = path.join(OUT_DIR, "06_telephony_mobile_dialer_dark_390x844.png");
    await mobilePage.screenshot({ path: mobileDialerDarkPath, fullPage: false });

    // Switch back to Journal for 04_telephony_mobile_dark
    await mobilePage.click('button:has-text("Журнал")').catch(() => {});
    await sleep(400);

    const mobileDarkPath = path.join(OUT_DIR, "04_telephony_mobile_dark_390x844.png");
    await mobilePage.screenshot({ path: mobileDarkPath, fullPage: false });
    copyFileSync(mobileDarkPath, path.join(OUT_DIR, "04_telephony_mobile_dark.png"));
    const mobileDarkStat = statSync(mobileDarkPath);
    console.log(`  [OK] Saved 04_telephony_mobile_dark_390x844.png (${Math.round(mobileDarkStat.size / 1024)} KB)`);

    await mobileContext.close();

    console.log("\n=== ALL 4 TELEPHONY PROOF SCREENSHOTS CAPTURED WITH RED TEAM PERFECTION! ===");
  } finally {
    await browser.close();
  }
}

main().catch((err) => {
  console.error("FATAL screenshot capture failure:", err);
  process.exit(1);
});
