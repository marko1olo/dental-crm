const { chromium } = require("playwright");
const fs = require("node:fs");
const path = require("node:path");

const WEB_BASE = "http://127.0.0.1:5173";
const API_BASE = "http://127.0.0.1:4100";
const OUT_DIR = path.resolve(__dirname, "../docs/proofs/telephony_crm");

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
    
    // Set html attributes early
    document.documentElement.setAttribute("data-theme", th);
    if (th === "dark") {
      document.documentElement.classList.add("dark");
      document.documentElement.classList.remove("light");
    } else {
      document.documentElement.classList.add("light");
      document.documentElement.classList.remove("dark");
    }
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
  await page.waitForTimeout(1000);
}

async function waitForRealUI(page) {
  await page.waitForFunction(() => {
    const text = document.body ? document.body.innerText : "";
    return !text.includes("Загрузка системы") && !text.includes("Загрузка рабочей смены") && text.length > 200;
  }, { timeout: 25000 });
  await suppressOverlays(page);
  await page.waitForTimeout(500);
}

async function captureState(browser, auth, { width, height, isMobile, theme, filename, expandCapsule }) {
  console.log(`\n[Capturing ${filename}] (${width}x${height}, isMobile=${isMobile}, theme=${theme})...`);
  const context = await browser.newContext({
    viewport: { width, height },
    deviceScaleFactor: isMobile ? 2 : 1,
    isMobile: !!isMobile,
    hasTouch: !!isMobile,
  });
  await injectStorage(context, auth, theme);

  const page = await context.newPage();
  try {
    await page.goto(`${WEB_BASE}/#leads`, { waitUntil: "commit", timeout: 25000 });
    await waitForRealUI(page);
    await triggerCall(page);

    if (expandCapsule) {
      const expandBtn = page.locator('[data-testid="capsule-expand-btn"]');
      if (await expandBtn.isVisible().catch(() => false)) {
        await expandBtn.click();
        await page.waitForTimeout(600);
      }
    }
    await suppressOverlays(page);
    await page.waitForTimeout(400);

    const outPath = path.join(OUT_DIR, filename);
    await page.screenshot({ path: outPath, fullPage: false, animations: "disabled" });
    const stat = fs.statSync(outPath);
    console.log(`Saved: ${outPath} (${stat.size} bytes)`);
    if (stat.size < 20000) {
      throw new Error(`Screenshot ${filename} size is too small: ${stat.size} bytes (<20KB)`);
    }
  } finally {
    await context.close();
  }
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
    // 1. PC Light (1440x900)
    await captureState(browser, auth, {
      width: 1440,
      height: 900,
      isMobile: false,
      theme: "light",
      filename: "01_telephony_crm_pc_light_1440x900.png",
      expandCapsule: true,
    });

    // 2. PC Dark (1440x900)
    await captureState(browser, auth, {
      width: 1440,
      height: 900,
      isMobile: false,
      theme: "dark",
      filename: "02_telephony_crm_pc_dark_1440x900.png",
      expandCapsule: true,
    });

    // 3. Mobile Light (390x844)
    await captureState(browser, auth, {
      width: 390,
      height: 844,
      isMobile: true,
      theme: "light",
      filename: "03_telephony_crm_mobile_light_390x844.png",
      expandCapsule: false,
    });

    // 4. Mobile Dark (390x844)
    await captureState(browser, auth, {
      width: 390,
      height: 844,
      isMobile: true,
      theme: "dark",
      filename: "04_telephony_crm_mobile_dark_390x844.png",
      expandCapsule: false,
    });

    console.log("\nALL 4 TELEPHONY CRM PROOFS SUCCESSFULLY CAPTURED!");
  } finally {
    await browser.close();
  }
}

run().catch((err) => {
  console.error("FATAL run error:", err);
  process.exit(1);
});
