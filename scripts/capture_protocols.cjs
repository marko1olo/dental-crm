/**
 * scripts/capture_protocols.cjs
 *
 * Edge Playwright Screenshot Capture for Form 043/u Clinical Protocols & SOAP Diary.
 * Mandate 8c: 1440x900 PC Light and Dark screenshots.
 * Mandate 8p: Zero emojis, high contrast, clean toolbars.
 * Browser: Microsoft Edge via { channel: 'msedge' }.
 */

const { chromium } = require("playwright");
const fs = require("node:fs");
const path = require("node:path");
const {
  obtainRealAuthTokens,
  injectRealAuthToContext,
  seedLiveScheduleData,
} = require("./e2e-auth-helper.cjs");

const targetDirs = [
  "C:\\Users\\Admin\\.gemini\\antigravity\\brain\\855e98ac-e4d7-4ee7-a706-9bd961f4e2a1",
  path.resolve("docs/screenshots/protocols"),
];

for (const dir of targetDirs) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

async function setTheme(page, theme) {
  await page.evaluate((th) => {
    if (window.__useThemeStore) {
      window.__useThemeStore.getState().setThemeMode(th);
    }
    document.documentElement.setAttribute("data-theme", th);
    const isDark = ["dark", "night", "ocean", "emerald", "cyber_xray"].includes(th);
    document.documentElement.classList.toggle("dark", isDark);
    document.documentElement.classList.toggle("light", !isDark);
    document.documentElement.style.colorScheme = isDark ? "dark" : "light";
  }, theme);
  const isDark = ["dark", "night", "ocean", "emerald", "cyber_xray"].includes(theme);
  await page.waitForFunction(
    (dark) => document.documentElement.classList.contains("dark") === dark,
    isDark,
    { timeout: 5000 }
  ).catch(() => {});
  await page.waitForTimeout(600);
}

async function saveProof(page, fileName, description) {
  for (const dir of targetDirs) {
    const fullPath = path.join(dir, fileName);
    await page.screenshot({ path: fullPath, fullPage: false, animations: "disabled" });
    const stat = fs.statSync(fullPath);
    console.log(`[PROOF] Saved ${description}: ${fullPath} (${stat.size} bytes)`);
    if (stat.size < 30000) {
      throw new Error(`Screenshot file size too small: ${stat.size} bytes!`);
    }
  }
}

async function run() {
  console.log("=== STARTING CLINICAL PROTOCOLS 043 SCREENSHOT CAPTURE (EDGE) ===");

  // 1. Obtain real auth tokens
  const authData = await obtainRealAuthTokens();
  console.log(`[AUTH] Clinic: ${authData.clinicName}, Doctor: ${authData.user.fullName}`);

  // 2. Seed live schedule and patient data
  const schedData = await seedLiveScheduleData(authData);
  console.log(`[SEED] Active Patient ID: ${schedData.activePatientId}`);

  // 3. Launch Edge via Playwright
  console.log("[BROWSER] Launching Microsoft Edge via { channel: 'msedge' }...");
  const browser = await chromium.launch({
    channel: "msedge",
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });

  try {
    const context = await browser.newContext({
      viewport: { width: 1440, height: 900 },
      deviceScaleFactor: 1,
    });

    // 4. Inject real auth tokens to browser context
    await injectRealAuthToContext(context, authData, {
      selectedPatientId: schedData.activePatientId,
    });

    await context.addInitScript(() => {
      localStorage.setItem("dente_tour_completed", "true");
      localStorage.setItem("dente_quest_progress_v2", JSON.stringify({
        activeTrackId: "solo_doctor",
        currentStepIndex: 0,
        completedStepIds: [],
        isTourActive: false,
        isDismissedPermanently: true,
        tracksProgress: {
          solo_doctor: { completed: true, completedStepIds: [] },
          reception_admin: { completed: true, completedStepIds: [] },
          imaging_diagnostics: { completed: true, completedStepIds: [] },
        },
      }));
    });

    const page = await context.newPage();
    page.setDefaultTimeout(30000);

    // Block remote Google fonts for deterministic rendering
    await page.route("**/*fonts.googleapis.com/**", (route) => route.abort());
    await page.route("**/*fonts.gstatic.com/**", (route) => route.abort());

    console.log("[NAV] Navigating to http://127.0.0.1:5173/#schedule...");
    await page.goto("http://127.0.0.1:5173/#schedule", { waitUntil: "domcontentloaded", timeout: 30000 });
    await page.waitForSelector(".boot-state", { state: "detached", timeout: 30000 }).catch(() => {});
    await page.waitForTimeout(1000);

    // Dismiss any modal notices or onboarding or spotlights
    await page.evaluate(() => {
      document.querySelectorAll('.tour-spotlight-root, [data-testid="guided-tour-spotlight-overlay"]').forEach(el => el.remove());
    });
    const noticeDismissBtn = page.locator('.app-notice button:has-text("Понятно"), [data-testid="btn-dismiss-notice"]');
    if (await noticeDismissBtn.isVisible()) {
      await noticeDismissBtn.click().catch(() => {});
      await page.waitForTimeout(300);
    }

    // Click [В приём] on live patient card
    console.log("[NAV] Looking for [В приём] button...");
    const startVisitBtn = page.locator('[data-testid^="appointment-action-start-"], button:has-text("В приём")').first();
    if (await startVisitBtn.isVisible()) {
      console.log("[NAV] Clicking [В приём] button...");
      await startVisitBtn.click();
      await page.waitForTimeout(1500);
    } else {
      console.log("[NAV] Navigating to #visit via hash...");
      await page.evaluate(() => { window.location.hash = "visit"; });
      await page.waitForTimeout(1500);
    }

    // Wait for VisitView and EMK unified toolbar
    console.log("[NAV] Waiting for EMK toolbar and diary section...");
    await page.waitForSelector('[data-testid="emk-unified-toolbar"], .emk-unified-toolbar, [data-testid="visit-subtab-emk"]', { state: "visible", timeout: 20000 });
    await page.waitForTimeout(800);

    // Ensure spotlights are cleaned up
    await page.evaluate(() => {
      document.querySelectorAll('.tour-spotlight-root, [data-testid="guided-tour-spotlight-overlay"]').forEach(el => el.remove());
    });

    // Ensure EMK subtab is clicked
    const emkTabBtn = page.locator('[data-testid="visit-subtab-emk"]');
    if (await emkTabBtn.isVisible()) {
      await emkTabBtn.click().catch(() => {});
      await page.waitForTimeout(500);
    }

    // Apply physiological norm via 1-click button to showcase clinical 043 protocol in fields
    console.log("[ACTION] Applying physiological norm 1-click button...");
    await page.evaluate(() => {
      const normBtn = document.querySelector('[data-testid="btn-chairside-physiological-norm"]');
      if (normBtn) normBtn.click();
    });
    await page.waitForTimeout(800);

    // Settle UI
    await page.waitForTimeout(600);

    // Capture LIGHT theme
    console.log("\n--- Capturing LIGHT Theme (1440x900) ---");
    await setTheme(page, "light");
    await page.waitForTimeout(600);
    await saveProof(page, "protocol_043_light.png", "Form 043/u Clinical Protocols & SOAP Diary (Light)");

    // Capture DARK theme
    console.log("\n--- Capturing DARK Theme (1440x900) ---");
    await setTheme(page, "dark");
    await page.waitForTimeout(600);
    await saveProof(page, "protocol_043_dark.png", "Form 043/u Clinical Protocols & SOAP Diary (Dark)");

    console.log("\n[SUCCESS] All Form 043/u protocol screenshots captured cleanly via Edge Playwright!");
  } finally {
    await browser.close();
  }
}

run().catch((err) => {
  console.error("[FATAL] Screenshot capture failed:", err);
  process.exit(1);
});
