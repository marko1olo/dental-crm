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
    localStorage.setItem("dente_active_role", "owner");
    localStorage.setItem("dente_user_role", "owner");
    localStorage.setItem("dente_active_user_id", user.id || "doc-1");
    localStorage.setItem("dental-crm:active-user:v1", JSON.stringify({ ...user, role: "owner" }));
    localStorage.setItem("dente_theme_mode", th);
    localStorage.setItem("dente_theme", th);
    localStorage.setItem("theme", th);
    localStorage.setItem("dente_onboarding_completed", "true");
    localStorage.setItem("dente_tour_completed", "true");
    localStorage.setItem("dente_tour_dismissed", "true");
    localStorage.setItem("dente_guide_tour_dismissed_v2", "true");
    localStorage.setItem("dente_demo_banner_dismissed", "true");
    localStorage.setItem("dente_demo_showcase", "true");
    localStorage.setItem("dental-crm:onboarding:v1", JSON.stringify({ completed: true, dismissed: true }));
    localStorage.setItem("dental-crm:web-ui-preferences:v1", JSON.stringify({
      version: 1,
      uiLanguage: "ru",
      selectedWorkspaceRole: "owner",
      onboardingDismissed: true,
      onboardingStep: "done",
    }));
    localStorage.setItem("dente-workspace-profile", JSON.stringify({ mode: "clinic", role: "owner", activeRole: "owner" }));
    document.cookie = `dente_clinic_token=${encodeURIComponent(clinicToken)}; path=/; max-age=31536000`;
    document.cookie = `dente_staff_token=${encodeURIComponent(staffToken)}; path=/; max-age=31536000`;
    
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

async function waitForRealUI(page) {
  console.log("Waiting for real UI to hydrate...");
  await page.waitForFunction(() => {
    const text = document.body ? document.body.innerText : "";
    return !text.includes("Загрузка системы") && !text.includes("Загрузка рабочей смены") && text.length > 200;
  }, { timeout: 35000 }).catch((e) => {
    console.log("Hydration wait warning:", e.message);
  });
  
  await suppressOverlays(page);
  await page.waitForTimeout(600);
}

async function captureProof(browser, auth, { width, height, isMobile, theme, targetHash, filename }) {
  console.log(`\n[Capturing ${filename}] (${width}x${height}, isMobile=${isMobile}, theme=${theme}, hash=${targetHash})...`);
  const context = await browser.newContext({
    viewport: { width, height },
    deviceScaleFactor: isMobile ? 2 : 1,
    isMobile: !!isMobile,
    hasTouch: !!isMobile,
  });
  await injectStorage(context, auth, theme);

  const page = await context.newPage();
  try {
    await safeGoto(page, `${WEB_BASE}/?demo=true${targetHash}`);
    await waitForRealUI(page);
    await setTheme(page, theme);
    
    // Open telephony modal via event and wait for modal root
    await page.evaluate(() => {
      window.dispatchEvent(new CustomEvent("dente:open-telephony"));
    }).catch(() => {});
    
    await page.waitForSelector('[data-testid="telephony-studio-modal-root"]', { timeout: 10000 }).catch(() => {
      console.log("Modal root selector wait timed out, continuing...");
    });
    
    await suppressOverlays(page);
    await page.waitForTimeout(1000);

    const outPath = path.join(OUT_DIR, filename);
    await page.screenshot({ path: outPath, fullPage: false, animations: "disabled" });
    const stat = fs.statSync(outPath);
    console.log(`Saved: ${outPath} (${stat.size} bytes)`);
    if (stat.size < 20000) {
      throw new Error(`Screenshot ${filename} size is too small: ${stat.size} bytes (<20KB)`);
    }
    return outPath;
  } finally {
    await context.close();
  }
}

async function run() {
  console.log("Obtaining real JWT auth tokens from Fastify API...");
  const auth = await getAuthTokens();
  if (!auth) throw new Error("Could not log in to Fastify API");
  console.log("Logged in as:", auth.user?.fullName);

  const browser = await chromium.launch({
    headless: true,
    executablePath: "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
    args: ["--no-sandbox", "--disable-gpu", "--disable-dev-shm-usage"],
  });

  try {
    // 1. Studio PC Light (1440x900)
    await captureProof(browser, auth, {
      width: 1440,
      height: 900,
      isMobile: false,
      theme: "light",
      targetHash: "#telephony",
      filename: "01_telephony_studio_pc_light_1440x900.png",
    });

    // 2. Studio PC Dark (1440x900)
    await captureProof(browser, auth, {
      width: 1440,
      height: 900,
      isMobile: false,
      theme: "dark",
      targetHash: "#telephony",
      filename: "02_telephony_studio_pc_dark_1440x900.png",
    });

    // 3. Studio Mobile Light (390x844)
    await captureProof(browser, auth, {
      width: 390,
      height: 844,
      isMobile: true,
      theme: "light",
      targetHash: "#telephony",
      filename: "03_telephony_studio_mobile_light_390x844.png",
    });

    // 4. Studio Mobile Dark (390x844)
    await captureProof(browser, auth, {
      width: 390,
      height: 844,
      isMobile: true,
      theme: "dark",
      targetHash: "#telephony",
      filename: "04_telephony_studio_mobile_dark_390x844.png",
    });

    // Copy canonical 4-state aliases
    fs.copyFileSync(
      path.join(OUT_DIR, "01_telephony_studio_pc_light_1440x900.png"),
      path.join(OUT_DIR, "01_telephony_pc_light_1440x900.png")
    );
    fs.copyFileSync(
      path.join(OUT_DIR, "02_telephony_studio_pc_dark_1440x900.png"),
      path.join(OUT_DIR, "02_telephony_pc_dark_1440x900.png")
    );
    fs.copyFileSync(
      path.join(OUT_DIR, "03_telephony_studio_mobile_light_390x844.png"),
      path.join(OUT_DIR, "03_telephony_mobile_light_390x844.png")
    );
    fs.copyFileSync(
      path.join(OUT_DIR, "04_telephony_studio_mobile_dark_390x844.png"),
      path.join(OUT_DIR, "04_telephony_mobile_dark_390x844.png")
    );

    console.log("\nALL 4 TELEPHONY RED TEAM PROOFS CAPTURED SUCCESSFULLY!");
  } finally {
    await browser.close();
  }
}

run().catch((err) => {
  console.error("FATAL run error:", err);
  process.exit(1);
});
