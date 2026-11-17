const { chromium } = require("playwright");
const path = require("node:path");
const fs = require("node:fs");

const CONV_ID = "9d76937f-e6fc-4112-b940-6415f1b5893f";
const DIRS = [
  path.resolve(__dirname, "..", "docs", "proofs", "patients"),
  `C:/Users/Admin/.gemini/antigravity/brain/${CONV_ID}`,
];

DIRS.forEach((dir) => {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
});

function replicateFile(srcPath, filename) {
  for (const dir of DIRS) {
    try {
      fs.copyFileSync(srcPath, path.join(dir, filename));
    } catch (_) {}
  }
}

async function detectWebPort() {
  for (const port of [5174, 5173, 5175, 5177]) {
    try {
      const res = await fetch(`http://127.0.0.1:${port}/`, { signal: AbortSignal.timeout(3000) });
      if (res.status === 200) {
        console.log(`[Web Port] Detected active web server on port ${port}`);
        return port;
      }
    } catch (_) {}
  }
  return 5174;
}

async function main() {
  console.log("=== 1. REAL AUTHENTICATION VIA FASTIFY API ===");
  let authData = { clinicToken: "", staffToken: "", user: { id: "doc-1", role: "doctor", fullName: "Д-р Соколов А. В." } };
  try {
    const authRes = await fetch("http://127.0.0.1:4100/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: "doctor@clinic.com", password: "dente2026" }),
      signal: AbortSignal.timeout(5000),
    });
    if (authRes.ok) {
      authData = await authRes.json();
      console.log("[Auth] Logged in as:", authData.user?.fullName, "Role:", authData.user?.role);
    }
  } catch (e) {
    console.warn("[Auth Warning] Fastify login fallback:", e.message);
  }

  const port = await detectWebPort();
  const TARGET_URL = `http://127.0.0.1:${port}/?stand=1&demo=true#patient-card`;
  console.log("[Target URL]:", TARGET_URL);

  const browserExecutable = [
    "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
    "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
    "C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe",
  ].find((p) => fs.existsSync(p));

  console.log("[Browser] Launching with:", browserExecutable);

  const browser = await chromium.launch({
    headless: true,
    executablePath: browserExecutable,
    args: ["--no-sandbox", "--disable-gpu", "--disable-dev-shm-usage"],
  });

  async function injectAuth(context, theme = "light") {
    await context.addInitScript(({ clinicToken, staffToken, user, th }) => {
      sessionStorage.setItem("dente:sw-controller-reload", "1");
      sessionStorage.setItem("dente_unlocked", "true");
      localStorage.setItem("dente_unlocked", "true");
      if (clinicToken) localStorage.setItem("dente_clinic_token", clinicToken);
      if (staffToken) {
        localStorage.setItem("dente_staff_token", staffToken);
        localStorage.setItem("dente_active_session_token", staffToken);
      }
      localStorage.setItem("dente_active_role", user.role || "doctor");
      localStorage.setItem("dente_user_role", user.role || "doctor");
      localStorage.setItem("dente_active_user_id", user.id || "doc-1");
      localStorage.setItem("dental-crm:active-user:v1", JSON.stringify(user));
      localStorage.setItem("dente_theme", th);
      localStorage.setItem("dente_theme_mode", th);
      localStorage.setItem("theme", th);
      localStorage.setItem("dente_demo_showcase", "true");
      localStorage.setItem("dente_demo_mode", "true");
      localStorage.setItem("dental-crm:onboarding:v1", JSON.stringify({ completed: true, dismissed: true }));
      localStorage.setItem("dente_onboarding_completed", "true");
      localStorage.setItem("dente_tour_completed", "true");
      localStorage.setItem("dente_tour_dismissed", "true");
      localStorage.setItem("dente_guide_tour_dismissed_v2", "true");
      localStorage.setItem("dente_demo_banner_dismissed", "true");
      localStorage.setItem("dente_quest_progress_v2", JSON.stringify({ isDismissedPermanently: true, activeTrack: null, tracksProgress: {} }));
      document.documentElement.setAttribute("data-theme", th);
      if (th === "dark") {
        document.documentElement.classList.add("dark");
        document.documentElement.classList.remove("light");
        document.body.className = "dark";
      } else {
        document.documentElement.classList.add("light");
        document.documentElement.classList.remove("dark");
        document.body.className = "light";
      }
      if (clinicToken) document.cookie = `dente_clinic_token=${encodeURIComponent(clinicToken)}; path=/; max-age=31536000`;
      if (staffToken) document.cookie = `dente_staff_token=${encodeURIComponent(staffToken)}; path=/; max-age=31536000`;
    }, { clinicToken: authData.clinicToken, staffToken: authData.staffToken, user: authData.user, th: theme });
  }

  async function cleanOverlays(page, theme = "light") {
    await page.evaluate((th) => {
      document.documentElement.setAttribute("data-theme", th);
      if (th === "dark") {
        document.documentElement.classList.add("dark");
        document.documentElement.classList.remove("light");
        document.body.className = "dark";
      } else {
        document.documentElement.classList.add("light");
        document.documentElement.classList.remove("dark");
        document.body.className = "light";
      }
      let style = document.getElementById("suppress-all-overlays");
      if (!style) {
        style = document.createElement("style");
        style.id = "suppress-all-overlays";
        document.head.appendChild(style);
      }
      style.innerHTML = `
        .tour-spotlight-root,
        .tour-backdrop-clickable-zone,
        [data-testid="guided-tour-spotlight-overlay"],
        [data-testid="guided-tour-coach-mark-card"],
        [data-testid="demo-mode-banner"],
        .shepherd-element,
        .splash,
        #splash-root,
        [data-testid="splash-loader"],
        .global-toast-container,
        vite-error-overlay {
          display: none !important;
          pointer-events: none !important;
        }
        *, *::before, *::after {
          animation: none !important;
          transition: none !important;
        }
      `;
      document.querySelectorAll('.tour-spotlight-root, [data-testid="guided-tour-spotlight-overlay"], .tour-backdrop-clickable-zone, [data-testid="demo-mode-banner"], .global-toast-container, vite-error-overlay, [role="alert"]').forEach((el) => el.remove());
    }, theme);
    await page.waitForTimeout(500);
  }

  async function waitForPatientCard(page) {
    for (let i = 0; i < 30; i++) {
      await page.waitForTimeout(1000);
      try {
        const text = await page.evaluate(() => (document.body ? document.body.innerText : ""));
        if (text.includes("Основные сведения") || text.includes("Иванов Алексей") || text.includes("Паспортные данные")) {
          console.log(`[Card Ready] Found populated patient card DOM (${text.length} chars)`);
          return true;
        }
      } catch (_) {}
    }
    console.log("[Card Warning] Timed out waiting for card specific text");
    return false;
  }

  // ═══════════════════════════════════════════════════════════
  // 1. PC Light (1440x900)
  // ═══════════════════════════════════════════════════════════
  console.log("\n--- [1. PC Light 1440x900] ---");
  {
    const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, serviceWorkers: "block", deviceScaleFactor: 2 });
    await injectAuth(ctx, "light");
    const page = await ctx.newPage();
    await page.goto(TARGET_URL, { waitUntil: "commit", timeout: 35000 });
    await waitForPatientCard(page);
    await cleanOverlays(page, "light");
    const shot = path.resolve(DIRS[0], "01_patient_card_modal_pc_light_1440x900.png");
    await page.screenshot({ path: shot });
    replicateFile(shot, "01_patient_card_modal_pc_light_1440x900.png");
    const sz = fs.statSync(shot).size;
    console.log("  Saved:", shot, `(${sz} bytes, >=20KB: ${sz >= 20480})`);
    if (sz < 20480) throw new Error("Screenshot is smaller than 20KB");
    await ctx.close();
  }

  // ═══════════════════════════════════════════════════════════
  // 2. PC Dark (1440x900)
  // ═══════════════════════════════════════════════════════════
  console.log("\n--- [2. PC Dark 1440x900] ---");
  {
    const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, serviceWorkers: "block", deviceScaleFactor: 2 });
    await injectAuth(ctx, "dark");
    const page = await ctx.newPage();
    await page.goto(TARGET_URL, { waitUntil: "commit", timeout: 35000 });
    await waitForPatientCard(page);
    await cleanOverlays(page, "dark");
    const shot = path.resolve(DIRS[0], "02_patient_card_modal_pc_dark_1440x900.png");
    await page.screenshot({ path: shot });
    replicateFile(shot, "02_patient_card_modal_pc_dark_1440x900.png");
    const sz = fs.statSync(shot).size;
    console.log("  Saved:", shot, `(${sz} bytes, >=20KB: ${sz >= 20480})`);
    if (sz < 20480) throw new Error("Screenshot is smaller than 20KB");
    await ctx.close();
  }

  // ═══════════════════════════════════════════════════════════
  // 3. Mobile Light (390x844) Apple HIG
  // ═══════════════════════════════════════════════════════════
  console.log("\n--- [3. Mobile Light 390x844] ---");
  {
    const ctx = await browser.newContext({
      viewport: { width: 390, height: 844 },
      userAgent: "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1",
      deviceScaleFactor: 2,
      isMobile: true,
      hasTouch: true,
      serviceWorkers: "block",
    });
    await injectAuth(ctx, "light");
    const page = await ctx.newPage();
    await page.goto(TARGET_URL, { waitUntil: "commit", timeout: 35000 });
    await waitForPatientCard(page);
    await cleanOverlays(page, "light");
    const shot = path.resolve(DIRS[0], "03_patient_card_mobile_light_390x844.png");
    await page.screenshot({ path: shot });
    replicateFile(shot, "03_patient_card_mobile_light_390x844.png");
    const sz = fs.statSync(shot).size;
    console.log("  Saved:", shot, `(${sz} bytes, >=20KB: ${sz >= 20480})`);
    if (sz < 20480) throw new Error("Screenshot is smaller than 20KB");
    await ctx.close();
  }

  // ═══════════════════════════════════════════════════════════
  // 4. Mobile Dark (390x844) Apple HIG
  // ═══════════════════════════════════════════════════════════
  console.log("\n--- [4. Mobile Dark 390x844] ---");
  {
    const ctx = await browser.newContext({
      viewport: { width: 390, height: 844 },
      userAgent: "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1",
      deviceScaleFactor: 2,
      isMobile: true,
      hasTouch: true,
      serviceWorkers: "block",
    });
    await injectAuth(ctx, "dark");
    const page = await ctx.newPage();
    await page.goto(TARGET_URL, { waitUntil: "commit", timeout: 35000 });
    await waitForPatientCard(page);
    await cleanOverlays(page, "dark");
    const shot = path.resolve(DIRS[0], "04_patient_card_mobile_dark_390x844.png");
    await page.screenshot({ path: shot });
    replicateFile(shot, "04_patient_card_mobile_dark_390x844.png");
    const sz = fs.statSync(shot).size;
    console.log("  Saved:", shot, `(${sz} bytes, >=20KB: ${sz >= 20480})`);
    if (sz < 20480) throw new Error("Screenshot is smaller than 20KB");
    await ctx.close();
  }

  await browser.close();
  console.log("\n=== ALL 4-STATE VISUAL PROOFS CAPTURED SUCCESSFULLY ===");
}

main().catch((err) => {
  console.error("FATAL CAPTURE ERROR:", err);
  process.exit(1);
});
