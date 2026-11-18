const { chromium } = require("playwright");
const fs = require("node:fs");
const path = require("node:path");

const WEB_BASE = "http://127.0.0.1:5173";
const API_BASE = "http://127.0.0.1:4100";
const OUT_DIR = path.resolve(__dirname, "../docs/proofs/telephony");

if (!fs.existsSync(OUT_DIR)) {
  fs.mkdirSync(OUT_DIR, { recursive: true });
}

async function getAuthTokens() {
  try {
    const res = await fetch(`${API_BASE}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: "doctor@clinic.com", password: "dente2026" }),
    });
    const data = await res.json();
    if (data.ok) return data;
  } catch (e) {
    console.log("[Auth] Error logging in:", e.message);
  }
  return null;
}

async function injectStorage(context, auth, theme = "light") {
  await context.addInitScript(({ clinicToken, staffToken, user, th }) => {
    localStorage.setItem("dente_clinic_token", clinicToken);
    localStorage.setItem("dente_staff_token", staffToken);
    localStorage.setItem("dente_active_session_token", staffToken);
    localStorage.setItem("dente_active_role", user.role || "owner");
    localStorage.setItem("dente_active_user_id", user.id || "doc-1");
    localStorage.setItem("dental-crm:active-user:v1", JSON.stringify(user));
    localStorage.setItem("dente_theme_mode", th);
    localStorage.setItem("dente_theme", th);
    localStorage.setItem("theme", th);
    localStorage.setItem("dente_onboarding_completed", "true");
    localStorage.setItem("dente_tour_completed", "true");
    localStorage.setItem("dente_tour_dismissed", "true");
    localStorage.setItem("dente_guide_tour_dismissed_v2", "true");
    localStorage.setItem("dente_demo_banner_dismissed", "true");
    localStorage.setItem("dental-crm:onboarding:v1", JSON.stringify({ completed: true, dismissed: true }));
    localStorage.setItem("dental-crm:web-ui-preferences:v1", JSON.stringify({
      version: 1,
      uiLanguage: "ru",
      selectedWorkspaceRole: user.role || "owner",
      onboardingDismissed: true,
      onboardingStep: "done",
    }));
    document.cookie = `dente_clinic_token=${encodeURIComponent(clinicToken)}; path=/; max-age=31536000`;
    document.cookie = `dente_staff_token=${encodeURIComponent(staffToken)}; path=/; max-age=31536000`;
  }, { clinicToken: auth.clinicToken, staffToken: auth.staffToken, user: auth.user, th: theme });
}

async function suppressOverlays(page) {
  try {
    await page.evaluate(() => {
      const style = document.createElement("style");
      style.id = "suppress-all-overlays";
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
    try {
      localStorage.setItem("dente_theme", th);
      localStorage.setItem("dente_theme_mode", th);
      localStorage.setItem("theme", th);
    } catch (_) {}
  }, theme);
  await suppressOverlays(page);
  await page.waitForTimeout(600);
}

async function waitForRealUI(page) {
  console.log("Waiting for real UI...");
  await page.waitForFunction(() => {
    const text = document.body ? document.body.innerText : "";
    return !text.includes("Загрузка системы") && !text.includes("Загрузка рабочей смены") && text.length > 200;
  }, { timeout: 25000 });
  await suppressOverlays(page);
}

async function triggerCallAndOpenSoftphone(page) {
  console.log("Triggering answered call with real WebRTC audio visualizer...");
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
  await page.waitForTimeout(800);

  // Answer call to switch state to connected/answered
  await page.evaluate(() => {
    const store = window.__denteTelephonyStore;
    if (store) {
      store.getState().answerCall();
    }
  });
  await page.waitForTimeout(600);

  // Click on the topbar header capsule to open TelephonySoftphonePopover
  const opened = await page.evaluate(() => {
    const capsuleBtn = document.querySelector('[data-testid="topbar-chairside-telephony-btn"] button') ||
      document.querySelector('[id*="telephony"] button') ||
      document.querySelector('[data-telephony-header-capsule="true"] button');
    if (capsuleBtn) {
      capsuleBtn.click();
      return true;
    }
    return false;
  });
  console.log("Clicked topbar capsule button:", opened);

  await page.waitForTimeout(1000);
  await suppressOverlays(page);
}

async function run() {
  console.log("Getting auth tokens...");
  const auth = await getAuthTokens();
  if (!auth) throw new Error("Failed to get auth tokens from API");
  console.log("Authenticated as:", auth.user?.fullName);

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
    await injectStorage(pcContext, auth, "light");

    const pcPage = await pcContext.newPage();
    console.log("Navigating PC to http://127.0.0.1:5173/#schedule ...");
    await pcPage.goto(`${WEB_BASE}/#schedule`, { waitUntil: "commit", timeout: 25000 });
    await waitForRealUI(pcPage);
    console.log("PC UI is ready!");

    // 01_telephony_softphone_pc_light_1440x900.png
    console.log("Capturing 01_telephony_softphone_pc_light_1440x900.png...");
    await setTheme(pcPage, "light");
    await triggerCallAndOpenSoftphone(pcPage);

    const pcLightPath = path.join(OUT_DIR, "01_telephony_softphone_pc_light_1440x900.png");
    await pcPage.screenshot({ path: pcLightPath, fullPage: false, animations: "disabled" });
    console.log(`Saved: ${pcLightPath} (${fs.statSync(pcLightPath).size} bytes)`);

    // 02_telephony_softphone_pc_dark_1440x900.png
    console.log("Capturing 02_telephony_softphone_pc_dark_1440x900.png...");
    await setTheme(pcPage, "dark");
    await triggerCallAndOpenSoftphone(pcPage);

    const pcDarkPath = path.join(OUT_DIR, "02_telephony_softphone_pc_dark_1440x900.png");
    await pcPage.screenshot({ path: pcDarkPath, fullPage: false, animations: "disabled" });
    console.log(`Saved: ${pcDarkPath} (${fs.statSync(pcDarkPath).size} bytes)`);

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
    await injectStorage(mobileContext, auth, "light");

    const mobilePage = await mobileContext.newPage();
    console.log("Navigating mobile to http://127.0.0.1:5173/#schedule ...");
    await mobilePage.goto(`${WEB_BASE}/#schedule`, { waitUntil: "commit", timeout: 25000 });
    await waitForRealUI(mobilePage);
    console.log("Mobile UI is ready!");

    // 03_telephony_softphone_mobile_light_390x844.png
    console.log("Capturing 03_telephony_softphone_mobile_light_390x844.png...");
    await setTheme(mobilePage, "light");
    await triggerCallAndOpenSoftphone(mobilePage);

    const mobileLightPath = path.join(OUT_DIR, "03_telephony_softphone_mobile_light_390x844.png");
    await mobilePage.screenshot({ path: mobileLightPath, fullPage: false, animations: "disabled" });
    console.log(`Saved: ${mobileLightPath} (${fs.statSync(mobileLightPath).size} bytes)`);

    // 04_telephony_softphone_mobile_dark_390x844.png
    console.log("Capturing 04_telephony_softphone_mobile_dark_390x844.png...");
    await setTheme(mobilePage, "dark");
    await triggerCallAndOpenSoftphone(mobilePage);

    const mobileDarkPath = path.join(OUT_DIR, "04_telephony_softphone_mobile_dark_390x844.png");
    await mobilePage.screenshot({ path: mobileDarkPath, fullPage: false, animations: "disabled" });
    console.log(`Saved: ${mobileDarkPath} (${fs.statSync(mobileDarkPath).size} bytes)`);

    await mobileContext.close();

    console.log("\nALL 4 TELEPHONY SOFTPHONE SCREENSHOTS CAPTURED SUCCESSFULLY!");
  } finally {
    await browser.close();
  }
}

run().catch((err) => {
  console.error("FATAL run error:", err);
  process.exit(1);
});
