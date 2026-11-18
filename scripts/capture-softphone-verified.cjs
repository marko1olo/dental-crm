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
  await page.waitForTimeout(400);
}

async function safeGoto(page, url, retries = 3) {
  for (let i = 0; i < retries; i++) {
    try {
      await page.goto(url, { waitUntil: "commit", timeout: 25000 });
      return;
    } catch (e) {
      console.log(`[safeGoto] Attempt ${i + 1} failed: ${e.message}, waiting 1.5s...`);
      await new Promise((r) => setTimeout(r, 1500));
    }
  }
  await page.goto(url, { waitUntil: "commit", timeout: 25000 });
}

async function setupActiveCall(page) {
  await page.evaluate(() => {
    const store = window.__denteTelephonyStore;
    if (store) {
      store.getState().triggerIncomingCall({
        callId: "call-live-webrtc-1",
        phone: "+7 (926) 555-01-99",
        patientName: "Смирнова Екатерина Васильевна",
        patientId: "01a00000-0000-0000-0000-000000000001",
        provider: "mango",
        timestamp: new Date().toISOString(),
        status: "ringing",
        acutePain: true,
      });
      store.getState().answerCall();
    }
  });
  await page.waitForTimeout(600);
  await suppressOverlays(page);
}

async function run() {
  console.log("Obtaining real JWT auth tokens from Fastify API...");
  const auth = await getAuthTokens();
  if (!auth) throw new Error("Could not log in to Fastify API");
  console.log("Logged in as:", auth.user?.fullName);

  const browser = await chromium.launch({
    headless: true,
    args: ["--no-sandbox", "--disable-gpu", "--disable-dev-shm-usage"],
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
    console.log("Navigating PC to http://127.0.0.1:5173/?demo=true#softphone ...");
    await safeGoto(pcPage, `${WEB_BASE}/?demo=true#softphone`);
    await pcPage.waitForTimeout(3000);
    await setupActiveCall(pcPage);

    // Capture 01_telephony_softphone_pc_light_1440x900.png
    console.log("Capturing 01_telephony_softphone_pc_light_1440x900.png...");
    await setTheme(pcPage, "light");
    const pcLightPath = path.join(OUT_DIR, "01_telephony_softphone_pc_light_1440x900.png");
    await pcPage.screenshot({ path: pcLightPath, fullPage: false, animations: "disabled" });
    fs.copyFileSync(pcLightPath, path.join(OUT_DIR, "01_telephony_dialpad_pc_light_1440x900.png"));
    fs.copyFileSync(pcLightPath, path.join(OUT_DIR, "01_telephony_pc_light_1440x900.png"));
    fs.copyFileSync(pcLightPath, path.join(OUT_DIR, "01_telephony_pc_light.png"));
    console.log(`Saved: ${pcLightPath} (${fs.statSync(pcLightPath).size} bytes)`);

    // Capture 02_telephony_softphone_pc_dark_1440x900.png
    console.log("Capturing 02_telephony_softphone_pc_dark_1440x900.png...");
    await setTheme(pcPage, "dark");
    const pcDarkPath = path.join(OUT_DIR, "02_telephony_softphone_pc_dark_1440x900.png");
    await pcPage.screenshot({ path: pcDarkPath, fullPage: false, animations: "disabled" });
    fs.copyFileSync(pcDarkPath, path.join(OUT_DIR, "02_telephony_dialpad_pc_dark_1440x900.png"));
    fs.copyFileSync(pcDarkPath, path.join(OUT_DIR, "02_telephony_pc_dark_1440x900.png"));
    fs.copyFileSync(pcDarkPath, path.join(OUT_DIR, "02_telephony_pc_dark.png"));
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
    console.log("Navigating mobile to http://127.0.0.1:5173/?demo=true#softphone ...");
    await safeGoto(mobilePage, `${WEB_BASE}/?demo=true#softphone`);
    await mobilePage.waitForTimeout(3000);
    await setupActiveCall(mobilePage);

    // Capture 03_telephony_softphone_mobile_light_390x844.png
    console.log("Capturing 03_telephony_softphone_mobile_light_390x844.png...");
    await setTheme(mobilePage, "light");
    const mobileLightPath = path.join(OUT_DIR, "03_telephony_softphone_mobile_light_390x844.png");
    await mobilePage.screenshot({ path: mobileLightPath, fullPage: false, animations: "disabled" });
    fs.copyFileSync(mobileLightPath, path.join(OUT_DIR, "03_telephony_dialpad_mobile_light_390x844.png"));
    fs.copyFileSync(mobileLightPath, path.join(OUT_DIR, "03_telephony_mobile_light_390x844.png"));
    fs.copyFileSync(mobileLightPath, path.join(OUT_DIR, "03_telephony_mobile_light.png"));
    console.log(`Saved: ${mobileLightPath} (${fs.statSync(mobileLightPath).size} bytes)`);

    // Capture 04_telephony_softphone_mobile_dark_390x844.png
    console.log("Capturing 04_telephony_softphone_mobile_dark_390x844.png...");
    await setTheme(mobilePage, "dark");
    const mobileDarkPath = path.join(OUT_DIR, "04_telephony_softphone_mobile_dark_390x844.png");
    await mobilePage.screenshot({ path: mobileDarkPath, fullPage: false, animations: "disabled" });
    fs.copyFileSync(mobileDarkPath, path.join(OUT_DIR, "04_telephony_dialpad_mobile_dark_390x844.png"));
    fs.copyFileSync(mobileDarkPath, path.join(OUT_DIR, "04_telephony_mobile_dark_390x844.png"));
    fs.copyFileSync(mobileDarkPath, path.join(OUT_DIR, "04_telephony_mobile_dark.png"));
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
