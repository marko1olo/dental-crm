const { chromium } = require("playwright");
const fs = require("node:fs");
const path = require("node:path");

const WEB_BASE = "http://127.0.0.1:5173";
const API_BASE = "http://127.0.0.1:4100";
const PROOFS_DIR = path.resolve(__dirname, "../docs/proofs/telephony");
const ARTIFACTS_DIR = "C:\\Users\\Admin\\.gemini\\antigravity\\brain\\5dec68d9-2a3c-488e-be95-c444deb95b64";

if (!fs.existsSync(PROOFS_DIR)) {
  fs.mkdirSync(PROOFS_DIR, { recursive: true });
}
if (!fs.existsSync(ARTIFACTS_DIR)) {
  fs.mkdirSync(ARTIFACTS_DIR, { recursive: true });
}

async function getAuthTokens() {
  try {
    const res = await fetch(`${API_BASE}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: "doctor@clinic.com", password: "dente2026" }),
    });
    const data = await res.json();
    if (data.ok && data.clinicToken && data.staffToken) {
      console.log(`[Auth] Authenticated as: ${data.user?.fullName} (${data.user?.role})`);
      return data;
    }
  } catch (e) {
    console.log("[Auth] Error logging in:", e.message);
  }
  return {
    clinicToken: "clinic-test-token",
    staffToken: "staff-test-token",
    user: { id: "doc-1", fullName: "Д-р Соколов А. В.", role: "doctor" },
  };
}

async function injectStorage(context, auth, theme = "light") {
  await context.addInitScript(({ cTok, sTok, usr, th }) => {
    localStorage.setItem("dente_clinic_token", cTok);
    localStorage.setItem("dente_staff_token", sTok);
    localStorage.setItem("dente_active_session_token", sTok);
    localStorage.setItem("dente_active_role", usr.role || "doctor");
    localStorage.setItem("dente_user_role", usr.role || "doctor");
    localStorage.setItem("dente_active_user_id", usr.id || "doc-1");
    localStorage.setItem("dental-crm:active-user:v1", JSON.stringify(usr));
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
      selectedWorkspaceRole: usr.role || "doctor",
      onboardingDismissed: true,
      onboardingStep: "done",
    }));
    localStorage.setItem("dente-workspace-profile", JSON.stringify({ mode: "clinic", role: usr.role || "doctor", activeRole: usr.role || "doctor" }));
    document.cookie = `dente_clinic_token=${cTok}; path=/; max-age=31536000`;
    document.cookie = `dente_staff_token=${sTok}; path=/; max-age=31536000`;

    document.documentElement.setAttribute("data-theme", th);
    if (th === "dark") {
      document.documentElement.classList.add("dark");
      document.documentElement.classList.remove("light");
    } else {
      document.documentElement.classList.add("light");
      document.documentElement.classList.remove("dark");
    }
  }, { cTok: auth.clinicToken, sTok: auth.staffToken, usr: auth.user, th: theme });
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

async function applyTheme(page, theme) {
  await page.evaluate((th) => {
    document.documentElement.setAttribute("data-theme", th);
    if (th === "dark") {
      document.documentElement.classList.add("dark");
      document.documentElement.classList.remove("light");
    } else {
      document.documentElement.classList.add("light");
      document.documentElement.classList.remove("dark");
    }
    localStorage.setItem("dente_theme", th);
    localStorage.setItem("dente_theme_mode", th);
    localStorage.setItem("theme", th);
  }, theme);
  await suppressOverlays(page);
  await page.waitForTimeout(400);
}

async function run() {
  console.log("Fetching live auth tokens...");
  const auth = await getAuthTokens();

  console.log("Launching browser for Telephony Studio 4-State Proof capture...");
  const browser = await chromium.launch({
    headless: true,
    executablePath: "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
    args: ["--no-sandbox", "--disable-gpu", "--disable-dev-shm-usage"],
  });

  try {
    const context = await browser.newContext({
      viewport: { width: 1440, height: 900 },
      deviceScaleFactor: 1,
    });
    await injectStorage(context, auth, "light");

    const page = await context.newPage();
    page.on("console", (m) => {
      const txt = m.text();
      if (!txt.includes("[vite]") && !txt.includes("DevTools")) {
        console.log("PAGE LOG:", txt);
      }
    });

    console.log("Navigating to http://127.0.0.1:5173/?stand=telephony#telephony...");
    await page.goto(`${WEB_BASE}/?stand=telephony#telephony`, { waitUntil: "commit", timeout: 45000 });
    
    console.log("Waiting for [data-testid='telephony-studio-modal-root']...");
    await page.waitForSelector('[data-testid="telephony-studio-modal-root"]', { timeout: 30000 });
    console.log("Found [data-testid='telephony-studio-modal-root']!");

    await page.waitForTimeout(1000);
    await suppressOverlays(page);

    const shots = [
      {
        width: 1440, height: 900, isMobile: false, theme: "light",
        filename: "01_telephony_studio_pc_light_1440x900.png",
      },
      {
        width: 1440, height: 900, isMobile: false, theme: "dark",
        filename: "02_telephony_studio_pc_dark_1440x900.png",
      },
      {
        width: 390, height: 844, isMobile: true, theme: "light",
        filename: "03_telephony_studio_mobile_light_390x844.png",
      },
      {
        width: 390, height: 844, isMobile: true, theme: "dark",
        filename: "04_telephony_studio_mobile_dark_390x844.png",
      },
    ];

    for (const s of shots) {
      console.log(`\nCapturing ${s.filename} (${s.width}x${s.height}, ${s.theme})...`);
      await page.setViewportSize({ width: s.width, height: s.height });
      await applyTheme(page, s.theme);
      await page.waitForTimeout(700);

      const outProof = path.join(PROOFS_DIR, s.filename);
      await page.screenshot({ path: outProof, fullPage: false, animations: "disabled" });

      const stat = fs.statSync(outProof);
      console.log(`Saved proof: ${outProof} (${stat.size} bytes)`);
      if (stat.size < 20000) {
        throw new Error(`Screenshot ${s.filename} is suspiciously small: ${stat.size} bytes!`);
      }

      const outArtifact = path.join(ARTIFACTS_DIR, s.filename);
      fs.copyFileSync(outProof, outArtifact);
      console.log(`Copied to artifact dir: ${outArtifact}`);
    }

    console.log("\n✅ ALL 4-STATE TELEPHONY STUDIO PROOFS SUCCESSFULLY CAPTURED!");
  } finally {
    await browser.close();
  }
}

run().catch((err) => {
  console.error("FATAL run error:", err);
  process.exit(1);
});
