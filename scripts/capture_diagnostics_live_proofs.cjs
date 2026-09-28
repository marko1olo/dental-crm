const { chromium } = require("playwright");
const fs = require("fs");
const path = require("path");
const {
  obtainRealAuthTokens,
  injectRealAuthToContext,
  seedLiveScheduleData,
} = require("./e2e-auth-helper.cjs");

const targetDirs = [
  path.resolve("docs/screenshots/inquisition_live"),
  path.resolve("docs/screenshots/audit_7sins"),
  "C:\\Users\\Admin\\.gemini\\antigravity\\brain\\1fe8318d-5b52-49b0-ae26-d5bf469ac2cd\\screenshots",
  "C:\\Users\\Admin\\.gemini\\antigravity\\brain\\1cbe3ec4-e647-4d20-8fdd-2e51740038bc\\screenshots",
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

async function saveProof(page, fileName) {
  for (const dir of targetDirs) {
    const fullPath = path.join(dir, fileName);
    await page.screenshot({ path: fullPath, fullPage: false, animations: "disabled" });
    console.log(`Saved screenshot: ${fullPath} (${fs.statSync(fullPath).size} bytes)`);
  }
}

async function main() {
  console.log("=== CAPTURE DIAGNOSTICS COCKPIT PROOFS ===");

  // 1. Get real auth tokens
  const authData = await obtainRealAuthTokens();
  console.log(`[AUTH] Clinic: ${authData.clinicName}, Doctor: ${authData.user.fullName}`);

  // 2. Seed live schedule data
  const schedData = await seedLiveScheduleData(authData);
  console.log(`[SEED] Active Patient ID: ${schedData.activePatientId}`);

  const browser = await chromium.launch({
    executablePath: "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });

  try {
    const context = await browser.newContext({
      viewport: { width: 1440, height: 900 },
      deviceScaleFactor: 2,
    });

    // 3. Inject tokens into context
    await injectRealAuthToContext(context, authData, {
      selectedPatientId: schedData.activePatientId,
    });

    const page = await context.newPage();
    page.setDefaultTimeout(30000);

    // Block Google fonts for offline stability
    await page.route("**/*fonts.googleapis.com/**", (route) => route.abort());
    await page.route("**/*fonts.gstatic.com/**", (route) => route.abort());

    console.log("Navigating to http://127.0.0.1:5173/#schedule...");
    await page.goto("http://127.0.0.1:5173/#schedule", { waitUntil: "domcontentloaded", timeout: 30000 });
    await page.waitForSelector(".boot-state", { state: "detached", timeout: 30000 }).catch(() => {});
    await page.waitForTimeout(1000);

    // Dismiss any notices
    const noticeDismissBtn = page.locator('.app-notice button:has-text("Понятно"), [data-testid="btn-dismiss-notice"]');
    if (await noticeDismissBtn.isVisible()) {
      await noticeDismissBtn.click().catch(() => {});
      await page.waitForTimeout(300);
    }

    // Click [В приём] on live patient card
    console.log("Looking for [В приём] button...");
    const startVisitBtn = page.locator('[data-testid^="appointment-action-start-"], button:has-text("В приём")').first();
    if (await startVisitBtn.isVisible()) {
      console.log("Clicking [В приём] button...");
      await startVisitBtn.click();
      await page.waitForTimeout(1500);
    } else {
      console.log("Navigating to #visit via hash...");
      await page.evaluate(() => { window.location.hash = "visit"; });
      await page.waitForTimeout(1500);
    }

    // Wait for VisitView and diagnostics subtab to load
    console.log("Waiting for diagnostics tab button...");
    await page.waitForSelector('[data-testid="visit-subtab-diagnostics"]', { state: "visible", timeout: 20000 });
    
    // Click Diagnostics subtab
    console.log("Clicking diagnostics tab...");
    await page.click('[data-testid="visit-subtab-diagnostics"]');
    await page.waitForTimeout(1000);

    // Check if cockpit toolbar is already visible or if we need to load sample scan
    const toolbar = page.locator('[data-testid="visiograph-cockpit-toolbar"]');
    const isToolbarVisible = await toolbar.isVisible();
    console.log(`Cockpit toolbar initially visible: ${isToolbarVisible}`);

    if (!isToolbarVisible) {
      const loadDemoBtn = page.locator('[data-testid="btn-load-demo-scan"]');
      if (await loadDemoBtn.isVisible()) {
        console.log("Clicking [Загрузить пример RVG] to populate RVG cockpit...");
        await loadDemoBtn.click();
        await page.waitForTimeout(1200);
      }
    }

    // Ensure dominant canvas is visible
    await page.waitForSelector('.visiograph-dominant-canvas', { state: "visible", timeout: 10000 });
    console.log("Dominant canvas is VISIBLE and verified!");

    // Capture LIGHT theme
    console.log("\n--- Capturing LIGHT Theme ---");
    await setTheme(page, "light");
    await page.waitForTimeout(800);
    await saveProof(page, "visit_diagnostics_clean_light.png");
    await saveProof(page, "visit_tab3_diagnostics_desktop_light.png");

    // Capture DARK theme
    console.log("\n--- Capturing DARK Theme ---");
    await setTheme(page, "dark");
    await page.waitForTimeout(800);
    await saveProof(page, "visit_diagnostics_clean_dark.png");
    await saveProof(page, "visit_tab3_diagnostics_desktop_dark.png");

    console.log("\nALL DIAGNOSTICS PROOFS CAPTURED SUCCESSFULLY!");
  } finally {
    await browser.close();
  }
}

main().catch((err) => {
  console.error("Capture script failed:", err);
  process.exit(1);
});
