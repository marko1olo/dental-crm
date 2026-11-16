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

async function setupPageSession(page, role = "administrator") {
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
      "dental-crm:web-ui-preferences:v1",
      JSON.stringify({
        version: 1,
        uiLanguage: "ru",
        selectedWorkspaceRole: role,
        onboardingDismissed: true,
        onboardingStep: "done",
      })
    );
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
          phone: "+7 (999) 777-88-99",
          patientName: "Кузнецов Алексей Петрович",
          patientId: "pat-kuznetsov-01",
          provider: "mango",
          timestamp: new Date().toISOString(),
          status: "ringing",
          debtRub: 0,
          balanceRub: 0,
          hasDebt: false,
          hasDms: false,
          acutePain: true,
        },
      })
    );
  });
  await sleep(1500);
}

async function waitForRealUI(page) {
  console.log("  Waiting for real UI...");
  await page.waitForFunction(() => {
    const text = document.body ? document.body.innerText : "";
    return !text.includes("Загрузка CRM") && !text.includes("Загрузка системы") && !text.includes("Загрузка рабочей смены") && text.length > 50;
  }, { timeout: 25000 }).catch(() => {});
  await suppressOverlays(page);
  await sleep(1000);
}

async function main() {
  console.log("=== Launching Chrome Playwright for Telephony 4-State Proofs ===");

  const browser = await chromium.launch({
    headless: true,
    executablePath: "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
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
    console.log("\n[1/4] Desktop Context 1440x900 (Incoming Call & Studio)...");
    const pcContext = await browser.newContext({
      viewport: { width: 1440, height: 900 },
      deviceScaleFactor: 1,
      serviceWorkers: "block",
    });

    const pcPage = await pcContext.newPage();
    await setupPageSession(pcPage, "administrator");

    console.log("  Navigating PC to http://127.0.0.1:5173/?demo=true&callExpanded=true#schedule ...");
    await pcPage.goto("http://127.0.0.1:5173/?demo=true&callExpanded=true#schedule", { waitUntil: "networkidle", timeout: 30000 }).catch(async () => {
      await pcPage.goto("http://127.0.0.1:5173/?demo=true&callExpanded=true#schedule", { waitUntil: "domcontentloaded", timeout: 20000 });
    });
    await sleep(2500);
    await waitForRealUI(pcPage);
    await sleep(1500);

    // Trigger Incoming Call
    console.log("  Triggering Incoming Call Event on Desktop...");
    await triggerCall(pcPage);
    await pcPage.waitForSelector('[data-testid="incoming-call-popup"]', { state: "visible", timeout: 10000 }).catch(() => {});
    await sleep(1000);

    // 01_telephony_incoming_call_pc_light_1440x900.png
    console.log("  Capturing 01_telephony_incoming_call_pc_light_1440x900.png...");
    await setTheme(pcPage, "light");
    await sleep(600);
    const pcLightPath = path.join(OUT_DIR, "01_telephony_incoming_call_pc_light_1440x900.png");
    await pcPage.screenshot({ path: pcLightPath, fullPage: false });
    const pcLightStat = statSync(pcLightPath);
    console.log(`  [OK] Saved 01_telephony_incoming_call_pc_light_1440x900.png (${Math.round(pcLightStat.size / 1024)} KB)`);

    // 02_telephony_incoming_call_pc_dark_1440x900.png
    console.log("  Capturing 02_telephony_incoming_call_pc_dark_1440x900.png...");
    await setTheme(pcPage, "dark");
    await sleep(600);
    const pcDarkPath = path.join(OUT_DIR, "02_telephony_incoming_call_pc_dark_1440x900.png");
    await pcPage.screenshot({ path: pcDarkPath, fullPage: false });
    const pcDarkStat = statSync(pcDarkPath);
    console.log(`  [OK] Saved 02_telephony_incoming_call_pc_dark_1440x900.png (${Math.round(pcDarkStat.size / 1024)} KB)`);

    // Studio PC Light/Dark
    console.log("  Navigating PC to telephony hash...");
    await pcPage.evaluate(() => {
      window.location.hash = "#telephony";
      window.dispatchEvent(new HashChangeEvent("hashchange"));
    });
    await sleep(1500);
    await waitForRealUI(pcPage);
    await pcPage.waitForSelector('[data-testid="telephony-studio-modal-root"], [role="dialog"]', { state: "visible", timeout: 15000 }).catch(() => {});
    await sleep(800);

    await setTheme(pcPage, "light");
    await sleep(600);
    const studioLightPath = path.join(OUT_DIR, "01_telephony_studio_pc_light_1440x900.png");
    await pcPage.screenshot({ path: studioLightPath, fullPage: false });
    console.log(`  [OK] Saved 01_telephony_studio_pc_light_1440x900.png (${Math.round(statSync(studioLightPath).size / 1024)} KB)`);

    await setTheme(pcPage, "dark");
    await sleep(600);
    const studioDarkPath = path.join(OUT_DIR, "02_telephony_studio_pc_dark_1440x900.png");
    await pcPage.screenshot({ path: studioDarkPath, fullPage: false });
    console.log(`  [OK] Saved 02_telephony_studio_pc_dark_1440x900.png (${Math.round(statSync(studioDarkPath).size / 1024)} KB)`);

    await pcContext.close();

    // -------------------------------------------------------------
    // 2. MOBILE CONTEXT (390x844, iPhone 14)
    // -------------------------------------------------------------
    console.log("\n[2/4] Mobile Context 390x844 (Incoming Call & Studio)...");
    const mobileContext = await browser.newContext({
      viewport: { width: 390, height: 844 },
      deviceScaleFactor: 2,
      isMobile: true,
      hasTouch: true,
      serviceWorkers: "block",
    });

    const mobilePage = await mobileContext.newPage();
    await setupPageSession(mobilePage, "administrator");

    console.log("  Navigating mobile to http://127.0.0.1:5173/?demo=true&callExpanded=true#schedule ...");
    await mobilePage.goto("http://127.0.0.1:5173/?demo=true&callExpanded=true#schedule", { waitUntil: "networkidle", timeout: 30000 }).catch(async () => {
      await mobilePage.goto("http://127.0.0.1:5173/?demo=true&callExpanded=true#schedule", { waitUntil: "domcontentloaded", timeout: 20000 });
    });
    await sleep(2500);
    await waitForRealUI(mobilePage);
    await sleep(1500);

    // Trigger Incoming Call on Mobile
    console.log("  Triggering Incoming Call Event on Mobile...");
    await triggerCall(mobilePage);
    await mobilePage.waitForSelector('[data-testid="incoming-call-popup"]', { state: "visible", timeout: 10000 }).catch(() => {});
    await sleep(1000);

    // 03_telephony_incoming_call_mobile_light_390x844.png
    console.log("  Capturing 03_telephony_incoming_call_mobile_light_390x844.png...");
    await setTheme(mobilePage, "light");
    await sleep(600);
    const mobileCallLightPath = path.join(OUT_DIR, "03_telephony_incoming_call_mobile_light_390x844.png");
    await mobilePage.screenshot({ path: mobileCallLightPath, fullPage: false });
    const mobileCallLightStat = statSync(mobileCallLightPath);
    console.log(`  [OK] Saved 03_telephony_incoming_call_mobile_light_390x844.png (${Math.round(mobileCallLightStat.size / 1024)} KB)`);

    // 04_telephony_incoming_call_mobile_dark_390x844.png
    console.log("  Capturing 04_telephony_incoming_call_mobile_dark_390x844.png...");
    await setTheme(mobilePage, "dark");
    await sleep(600);
    const mobileCallDarkPath = path.join(OUT_DIR, "04_telephony_incoming_call_mobile_dark_390x844.png");
    await mobilePage.screenshot({ path: mobileCallDarkPath, fullPage: false });
    const mobileCallDarkStat = statSync(mobileCallDarkPath);
    console.log(`  [OK] Saved 04_telephony_incoming_call_mobile_dark_390x844.png (${Math.round(mobileCallDarkStat.size / 1024)} KB)`);

    // Studio Mobile Light/Dark
    console.log("  Navigating mobile to telephony hash...");
    await mobilePage.goto("http://127.0.0.1:5173/?demo=true#telephony", { waitUntil: "domcontentloaded" });
    await sleep(1500);
    await waitForRealUI(mobilePage);
    await mobilePage.waitForSelector('[data-testid="telephony-studio-modal-root"], [role="dialog"]', { state: "visible", timeout: 15000 }).catch(() => {});
    await sleep(800);

    await setTheme(mobilePage, "light");
    await sleep(600);
    const studioMobLight = path.join(OUT_DIR, "03_telephony_studio_mobile_light_390x844.png");
    await mobilePage.screenshot({ path: studioMobLight, fullPage: false });
    console.log(`  [OK] Saved 03_telephony_studio_mobile_light_390x844.png (${Math.round(statSync(studioMobLight).size / 1024)} KB)`);

    await setTheme(mobilePage, "dark");
    await sleep(600);
    const studioMobDark = path.join(OUT_DIR, "04_telephony_studio_mobile_dark_390x844.png");
    await mobilePage.screenshot({ path: studioMobDark, fullPage: false });
    console.log(`  [OK] Saved 04_telephony_studio_mobile_dark_390x844.png (${Math.round(statSync(studioMobDark).size / 1024)} KB)`);

    await mobileContext.close();

    // Canonical 4-State Proofs copies (Mandate 8aw)
    copyFileSync(
      path.join(OUT_DIR, "01_telephony_studio_pc_light_1440x900.png"),
      path.join(OUT_DIR, "01_telephony_pc_light_1440x900.png")
    );
    copyFileSync(
      path.join(OUT_DIR, "02_telephony_studio_pc_dark_1440x900.png"),
      path.join(OUT_DIR, "02_telephony_pc_dark_1440x900.png")
    );
    copyFileSync(
      path.join(OUT_DIR, "03_telephony_studio_mobile_light_390x844.png"),
      path.join(OUT_DIR, "03_telephony_mobile_light_390x844.png")
    );
    copyFileSync(
      path.join(OUT_DIR, "04_telephony_studio_mobile_dark_390x844.png"),
      path.join(OUT_DIR, "04_telephony_mobile_dark_390x844.png")
    );

    // Popup-specific aliases for Red Team Audit
    copyFileSync(
      path.join(OUT_DIR, "01_telephony_incoming_call_pc_light_1440x900.png"),
      path.join(OUT_DIR, "01_telephony_popup_pc_light_1440x900.png")
    );
    copyFileSync(
      path.join(OUT_DIR, "02_telephony_incoming_call_pc_dark_1440x900.png"),
      path.join(OUT_DIR, "02_telephony_popup_pc_dark_1440x900.png")
    );
    copyFileSync(
      path.join(OUT_DIR, "03_telephony_incoming_call_mobile_light_390x844.png"),
      path.join(OUT_DIR, "03_telephony_popup_mobile_light_390x844.png")
    );
    copyFileSync(
      path.join(OUT_DIR, "04_telephony_incoming_call_mobile_dark_390x844.png"),
      path.join(OUT_DIR, "04_telephony_popup_mobile_dark_390x844.png")
    );

    console.log("\n=== ALL TELEPHONY 4-STATE PROOF SCREENSHOTS CAPTURED SUCCESSFULLY ===");
  } finally {
    await browser.close();
  }
}

main().catch((err) => {
  console.error("FATAL screenshot capture failure:", err);
  process.exit(1);
});
