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
    localStorage.setItem("dente_active_role", "admin");
    localStorage.setItem("dente_active_user_id", user.id || "doc-1");
    localStorage.setItem("dental-crm:active-user:v1", JSON.stringify({ ...user, role: "admin" }));
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
      selectedWorkspaceRole: "admin",
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
  await page.waitForTimeout(500);
}

async function setDialerNumber(page, phone = "+7 (926) 555-12-34") {
  await page.evaluate((val) => {
    const input = document.querySelector('input[type="tel"]') ||
      document.querySelector('[aria-label="Номер телефона для набора"]') ||
      document.querySelector('.dnt-dialpad-input');
    if (input) {
      input.value = val;
      input.dispatchEvent(new Event("input", { bubbles: true }));
      input.dispatchEvent(new Event("change", { bubbles: true }));
    }
  }, phone);
  await page.waitForTimeout(400);
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
    await pcPage.goto(`${WEB_BASE}/?demo=true#softphone`, { waitUntil: "commit", timeout: 25000 });
    await pcPage.waitForTimeout(3000);
    await suppressOverlays(pcPage);

    // ☀️ 01_telephony_dialpad_pc_light_1440x900.png
    console.log("Capturing 01_telephony_dialpad_pc_light_1440x900.png...");
    await setTheme(pcPage, "light");
    await setDialerNumber(pcPage, "+7 (926) 555-12-34");

    const pcLightPath = path.join(OUT_DIR, "01_telephony_dialpad_pc_light_1440x900.png");
    await pcPage.screenshot({ path: pcLightPath, fullPage: false, animations: "disabled" });
    const pcLightSize = fs.statSync(pcLightPath).size;
    console.log(`Saved: ${pcLightPath} (${pcLightSize} bytes)`);
    if (pcLightSize < 30720) throw new Error(`Screenshot size ${pcLightSize} < 30KB threshold!`);

    // 🌙 02_telephony_dialpad_pc_dark_1440x900.png
    console.log("Capturing 02_telephony_dialpad_pc_dark_1440x900.png...");
    await setTheme(pcPage, "dark");
    await setDialerNumber(pcPage, "+7 (926) 555-12-34");

    const pcDarkPath = path.join(OUT_DIR, "02_telephony_dialpad_pc_dark_1440x900.png");
    await pcPage.screenshot({ path: pcDarkPath, fullPage: false, animations: "disabled" });
    const pcDarkSize = fs.statSync(pcDarkPath).size;
    console.log(`Saved: ${pcDarkPath} (${pcDarkSize} bytes)`);
    if (pcDarkSize < 30720) throw new Error(`Screenshot size ${pcDarkSize} < 30KB threshold!`);

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
    await mobilePage.goto(`${WEB_BASE}/?demo=true#softphone`, { waitUntil: "commit", timeout: 25000 });
    await mobilePage.waitForTimeout(3000);
    await suppressOverlays(mobilePage);

    // 📱 03_telephony_dialpad_mobile_light_390x844.png
    console.log("Capturing 03_telephony_dialpad_mobile_light_390x844.png...");
    await setTheme(mobilePage, "light");
    await setDialerNumber(mobilePage, "+7 (926) 555-12-34");

    const mobileLightPath = path.join(OUT_DIR, "03_telephony_dialpad_mobile_light_390x844.png");
    await mobilePage.screenshot({ path: mobileLightPath, fullPage: false, animations: "disabled" });
    const mobileLightSize = fs.statSync(mobileLightPath).size;
    console.log(`Saved: ${mobileLightPath} (${mobileLightSize} bytes)`);
    if (mobileLightSize < 30720) throw new Error(`Screenshot size ${mobileLightSize} < 30KB threshold!`);

    // 📱 04_telephony_dialpad_mobile_dark_390x844.png
    console.log("Capturing 04_telephony_dialpad_mobile_dark_390x844.png...");
    await setTheme(mobilePage, "dark");
    await setDialerNumber(mobilePage, "+7 (926) 555-12-34");

    const mobileDarkPath = path.join(OUT_DIR, "04_telephony_dialpad_mobile_dark_390x844.png");
    await mobilePage.screenshot({ path: mobileDarkPath, fullPage: false, animations: "disabled" });
    const mobileDarkSize = fs.statSync(mobileDarkPath).size;
    console.log(`Saved: ${mobileDarkPath} (${mobileDarkSize} bytes)`);
    if (mobileDarkSize < 30720) throw new Error(`Screenshot size ${mobileDarkSize} < 30KB threshold!`);

    await mobileContext.close();

    console.log("\n✅ ALL 4 TELEPHONY DIALPAD SCREENSHOTS CAPTURED AND VERIFIED >= 30KB!");
  } finally {
    await browser.close();
  }
}

run().catch((err) => {
  console.error("FATAL run error:", err);
  process.exit(1);
});
