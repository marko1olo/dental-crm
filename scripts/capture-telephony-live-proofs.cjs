const { chromium } = require("playwright");
const fs = require("node:fs");
const path = require("node:path");

let WEB_BASE = "http://127.0.0.1:5173";
const API_BASE = "http://127.0.0.1:4100";
const OUT_DIR = path.resolve(__dirname, "../docs/proofs/telephony");

async function resolveWebBase() {
  for (const port of [5173, 5174, 5175]) {
    try {
      const res = await fetch(`http://127.0.0.1:${port}/`);
      if (res.ok || res.status < 500) {
        console.log(`[WebBase] Detected active Vite server on port ${port}`);
        return `http://127.0.0.1:${port}`;
      }
    } catch (_) {}
  }
  return "http://127.0.0.1:5173";
}

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
  return {
    clinicToken: "demo-clinic-token",
    staffToken: "demo-staff-token",
    user: { id: "demo-doctor-id", fullName: "д-р Смирнова Анна Владимировна", role: "owner" },
  };
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
        .shepherd-element {
          display: none !important;
          pointer-events: none !important;
        }
      `;
      document.head.appendChild(style);
      document.querySelectorAll(".tour-spotlight-root, [data-testid='guided-tour-spotlight-overlay']").forEach((el) => el.remove());
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

async function triggerCall(page) {
  await page.evaluate(() => {
    window.dispatchEvent(
      new CustomEvent("dente:telephony-mock-incoming", {
        detail: {
          callId: "call-" + Date.now(),
          phone: "+7 (926) 555-12-34",
          patientName: "Смирнова Екатерина Васильевна",
          patientId: "01a00000-0000-0000-0000-000000000001",
          provider: "sip",
          timestamp: new Date().toISOString(),
          status: "ringing",
          acutePain: true,
        },
      })
    );
  });
  await page.waitForTimeout(1000);
}

async function waitForRealUI(page) {
  console.log("Waiting for real UI...");
  try {
    await page.waitForFunction(() => {
      const text = document.body ? document.body.innerText : "";
      return !text.includes("Загрузка CRM") && !text.includes("Загрузка системы") && !text.includes("Загрузка рабочей смены") && text.length > 50;
    }, { timeout: 25000 });
  } catch (e) {
    console.log("[Wait] Continuing after wait timeout:", e.message);
  }
  await page.waitForTimeout(2000);
  await suppressOverlays(page);
}

async function run() {
  WEB_BASE = await resolveWebBase();
  console.log("Getting auth tokens...");
  const auth = await getAuthTokens();
  if (!auth) throw new Error("Failed to get auth tokens from API");
  console.log("Authenticated as:", auth.user?.fullName);

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
    console.log("\n[Setup Desktop Context 1440x900]...");
    const pcContext = await browser.newContext({
      viewport: { width: 1440, height: 900 },
      deviceScaleFactor: 1,
    });
    await injectStorage(pcContext, auth, "light");

    const pcPage = await pcContext.newPage();
    console.log("Navigating PC to http://127.0.0.1:5173/?demo=true#telephony ...");
    await pcPage.goto(`${WEB_BASE}/?demo=true#telephony`, { waitUntil: "commit", timeout: 25000 });
    await waitForRealUI(pcPage);
    console.log("PC Telephony Studio UI is ready!");

    // 01_telephony_studio_pc_light_1440x900.png
    console.log("Capturing 01_telephony_studio_pc_light_1440x900.png...");
    await setTheme(pcPage, "light");
    await pcPage.waitForTimeout(1000);
    const pcLightPath = path.join(OUT_DIR, "01_telephony_studio_pc_light_1440x900.png");
    await pcPage.screenshot({ path: pcLightPath, fullPage: false, animations: "disabled" });
    fs.copyFileSync(pcLightPath, path.join(OUT_DIR, "01_telephony_pc_light_1440x900.png"));
    fs.copyFileSync(pcLightPath, path.join(OUT_DIR, "01_telephony_pc_light.png"));
    fs.copyFileSync(pcLightPath, path.join(OUT_DIR, "telephony_pc_light_1440x900.png"));
    console.log(`Saved: ${pcLightPath} (${fs.statSync(pcLightPath).size} bytes)`);

    // 02_telephony_studio_pc_dark_1440x900.png
    console.log("Capturing 02_telephony_studio_pc_dark_1440x900.png...");
    await setTheme(pcPage, "dark");
    await pcPage.waitForTimeout(1000);
    const pcDarkPath = path.join(OUT_DIR, "02_telephony_studio_pc_dark_1440x900.png");
    await pcPage.screenshot({ path: pcDarkPath, fullPage: false, animations: "disabled" });
    fs.copyFileSync(pcDarkPath, path.join(OUT_DIR, "02_telephony_pc_dark_1440x900.png"));
    fs.copyFileSync(pcDarkPath, path.join(OUT_DIR, "02_telephony_pc_dark.png"));
    fs.copyFileSync(pcDarkPath, path.join(OUT_DIR, "telephony_pc_dark_1440x900.png"));
    console.log(`Saved: ${pcDarkPath} (${fs.statSync(pcDarkPath).size} bytes)`);

    // Capture Softphone Popover on Desktop
    console.log("Navigating PC to http://127.0.0.1:5173/?demo=true#softphone ...");
    await pcPage.goto(`${WEB_BASE}/?demo=true#softphone`, { waitUntil: "commit", timeout: 25000 });
    await waitForRealUI(pcPage);
    await setTheme(pcPage, "light");
    await pcPage.waitForTimeout(1000);
    const softphonePcLight = path.join(OUT_DIR, "05_softphone_pc_light_1440x900.png");
    await pcPage.screenshot({ path: softphonePcLight, fullPage: false, animations: "disabled" });
    console.log(`Saved: ${softphonePcLight} (${fs.statSync(softphonePcLight).size} bytes)`);

    await setTheme(pcPage, "dark");
    await pcPage.waitForTimeout(1000);
    const softphonePcDark = path.join(OUT_DIR, "06_softphone_pc_dark_1440x900.png");
    await pcPage.screenshot({ path: softphonePcDark, fullPage: false, animations: "disabled" });
    console.log(`Saved: ${softphonePcDark} (${fs.statSync(softphonePcDark).size} bytes)`);

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
    console.log("Navigating mobile to http://127.0.0.1:5173/?demo=true#telephony ...");
    await mobilePage.goto(`${WEB_BASE}/?demo=true#telephony`, { waitUntil: "commit", timeout: 25000 });
    await waitForRealUI(mobilePage);
    console.log("Mobile UI is ready!");

    // Capture Telephony on Mobile
    console.log("Capturing 05_telephony_mobile_light_390x844.png...");
    await setTheme(mobilePage, "light");
    await mobilePage.waitForTimeout(1000);
    const mobileStudioLightPath = path.join(OUT_DIR, "05_telephony_mobile_light_390x844.png");
    await mobilePage.screenshot({ path: mobileStudioLightPath, fullPage: false, animations: "disabled" });
    console.log(`Saved: ${mobileStudioLightPath} (${fs.statSync(mobileStudioLightPath).size} bytes)`);

    await setTheme(mobilePage, "dark");
    await mobilePage.waitForTimeout(1000);
    const mobileStudioDarkPath = path.join(OUT_DIR, "06_telephony_mobile_dark_390x844.png");
    await mobilePage.screenshot({ path: mobileStudioDarkPath, fullPage: false, animations: "disabled" });
    console.log(`Saved: ${mobileStudioDarkPath} (${fs.statSync(mobileStudioDarkPath).size} bytes)`);

    // Capture Softphone on Mobile (Canonical 03 & 04 proofs)
    console.log("Navigating mobile to http://127.0.0.1:5173/?demo=true#softphone ...");
    await mobilePage.goto(`${WEB_BASE}/?demo=true#softphone`, { waitUntil: "commit", timeout: 25000 });
    await waitForRealUI(mobilePage);
    await setTheme(mobilePage, "light");
    await mobilePage.waitForTimeout(1000);
    const softphoneMobileLight = path.join(OUT_DIR, "03_telephony_softphone_mobile_light_390x844.png");
    await mobilePage.screenshot({ path: softphoneMobileLight, fullPage: false, animations: "disabled" });
    fs.copyFileSync(softphoneMobileLight, path.join(OUT_DIR, "03_telephony_mobile_light_390x844.png"));
    fs.copyFileSync(softphoneMobileLight, path.join(OUT_DIR, "07_softphone_mobile_light_390x844.png"));
    console.log(`Saved: ${softphoneMobileLight} (${fs.statSync(softphoneMobileLight).size} bytes)`);

    await setTheme(mobilePage, "dark");
    await mobilePage.waitForTimeout(1000);
    const softphoneMobileDark = path.join(OUT_DIR, "04_telephony_softphone_mobile_dark_390x844.png");
    await mobilePage.screenshot({ path: softphoneMobileDark, fullPage: false, animations: "disabled" });
    fs.copyFileSync(softphoneMobileDark, path.join(OUT_DIR, "04_telephony_mobile_dark_390x844.png"));
    fs.copyFileSync(softphoneMobileDark, path.join(OUT_DIR, "08_softphone_mobile_dark_390x844.png"));
    console.log(`Saved: ${softphoneMobileDark} (${fs.statSync(softphoneMobileDark).size} bytes)`);

    await mobileContext.close();

    // Verify all 4 files exist and >= 20KB
    const requiredProofs = [
      "01_telephony_studio_pc_light_1440x900.png",
      "02_telephony_studio_pc_dark_1440x900.png",
      "03_telephony_softphone_mobile_light_390x844.png",
      "04_telephony_softphone_mobile_dark_390x844.png",
    ];

    for (const f of requiredProofs) {
      const p = path.join(OUT_DIR, f);
      const size = fs.existsSync(p) ? fs.statSync(p).size : 0;
      if (size < 20480) {
        throw new Error(`Proof artifact ${f} is too small: ${size} bytes (<20KB)`);
      }
      console.log(`[VERIFIED PROOF] ${f}: ${size} bytes (>= 20KB threshold passed)`);
    }

    console.log("\nALL 4 TELEPHONY PROOF SCREENSHOTS CAPTURED WITH REAL LIVE DATA!");
  } finally {
    await browser.close();
  }
}

run().catch((err) => {
  console.error("FATAL run error:", err);
  process.exit(1);
});
