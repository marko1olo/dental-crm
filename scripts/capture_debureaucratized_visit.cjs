const { chromium } = require("playwright");
const fs = require("fs");
const path = require("path");

const targetDirs = [
  path.resolve("docs/screenshots/inquisition_live"),
  "C:\\Users\\Admin\\.gemini\\antigravity\\brain\\1cbe3ec4-e647-4d20-8fdd-2e51740038bc\\screenshots",
];

for (const dir of targetDirs) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

// Read mockDashboard from scripts/take_inquisition_live_screenshots.cjs
const lines = fs.readFileSync(path.resolve("scripts/take_inquisition_live_screenshots.cjs"), "utf8").split("\n");
const mockCode = lines.slice(21, 277).join("\n");
let mockDashboard;
eval(mockCode);

async function capture() {
  const browser = await chromium.launch({
    executablePath: "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });

  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    deviceScaleFactor: 2,
  });

  await context.addInitScript(() => {
    localStorage.setItem("dente_clinic_token", "mock-clinic-token-12345");
    localStorage.setItem("dente_staff_token", "mock-staff-token-67890");
    localStorage.setItem("dente_active_user_id", "doc-1");
    localStorage.setItem("dente_active_role", "owner");
    localStorage.setItem("dente_active_mode", "clinic");
    sessionStorage.setItem("dente_unlocked", "true");
    localStorage.setItem("dente_theme", "light");
    localStorage.setItem("theme", "light");
    localStorage.setItem("dente_ui_preferences_v1", JSON.stringify({
      onboardingDismissed: true,
      onboardingStep: "done",
      onboardingDraftMode: false,
      version: 1,
    }));
    localStorage.setItem("dental-crm:onboarding:v1", JSON.stringify({
      dismissed: true,
      step: "done",
      completed: true,
      onboardingDismissed: true,
      onboardingStep: "done",
      onboardingDraftMode: false,
      version: 1,
    }));
  });

  const page = await context.newPage();

  await page.route("**/api/**", async (route) => {
    const url = route.request().url();
    if (url.includes("/src/")) return route.continue();
    if (url.includes("/api/dashboard")) {
      return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(mockDashboard) });
    }
    if (url.includes("/api/auth/user/me") || url.includes("/api/auth/session")) {
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          user: { id: "doc-1", fullName: "Д-р Воронов Алексей Владимирович", role: "owner", active: true },
        }),
      });
    }
    if (url.includes("/api/auth/staff/unlock")) {
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ success: true, token: "mock-staff-token", user: { id: "doc-1", fullName: "Д-р Воронов Алексей Владимирович", role: "owner" } }),
      });
    }
    if (url.includes("/api/schedule")) {
      return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(mockDashboard.appointments) });
    }
    return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify([]) });
  });

  console.log("Navigating to http://127.0.0.1:5173/#schedule...");
  await page.goto("http://127.0.0.1:5173/#schedule", { waitUntil: "domcontentloaded", timeout: 30000 });
  await page.waitForTimeout(2000);

  console.log("Navigating to #visit...");
  await page.evaluate(() => { window.location.hash = "visit"; });
  await page.waitForSelector('[data-testid="visit-subtab-diagnostics"]', { state: "visible", timeout: 30000 });
  await page.waitForTimeout(1000);

  // Dismiss any modals/banners
  const dismissBtn = page.locator('button:has-text("Понятно"), [data-testid="btn-dismiss-notice"]');
  if (await dismissBtn.isVisible()) {
    await dismissBtn.click().catch(() => {});
  }

  const themes = ["light", "dark"];

  for (const theme of themes) {
    console.log(`Setting theme ${theme}...`);
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
    await page.waitForTimeout(600);

    // Switch to Diagnostics tab
    console.log(`Clicking Diagnostics tab in ${theme}...`);
    const diagTab = page.locator('[data-testid="visit-subtab-diagnostics"]');
    if (await diagTab.isVisible()) {
      await diagTab.click();
      await page.waitForTimeout(800);
    } else {
      console.warn("Diagnostics tab not visible");
    }

    const diagShotPath = path.resolve(`docs/screenshots/inquisition_live/visit_diagnostics_clean_${theme}.png`);
    await page.screenshot({ path: diagShotPath });
    for (const d of targetDirs) {
      fs.copyFileSync(diagShotPath, path.join(d, `visit_diagnostics_clean_${theme}.png`));
    }
    console.log(`Captured: visit_diagnostics_clean_${theme}.png`);

    // Switch to Consents tab
    console.log(`Clicking Consents tab in ${theme}...`);
    const consentsTab = page.locator('[data-testid="visit-subtab-consents"]');
    if (await consentsTab.isVisible()) {
      await consentsTab.click();
      await page.waitForTimeout(800);
    }

    const consentsShotPath = path.resolve(`docs/screenshots/inquisition_live/visit_consents_clean_${theme}.png`);
    await page.screenshot({ path: consentsShotPath });
    for (const d of targetDirs) {
      fs.copyFileSync(consentsShotPath, path.join(d, `visit_consents_clean_${theme}.png`));
    }
    console.log(`Captured: visit_consents_clean_${theme}.png`);

    // Switch to EMK tab
    console.log(`Clicking EMK tab in ${theme}...`);
    const emkTab = page.locator('[data-testid="visit-subtab-emk"]');
    if (await emkTab.isVisible()) {
      await emkTab.click();
      await page.waitForTimeout(800);
    }

    const emkShotPath = path.resolve(`docs/screenshots/inquisition_live/visit_emk_clean_${theme}.png`);
    await page.screenshot({ path: emkShotPath });
    for (const d of targetDirs) {
      fs.copyFileSync(emkShotPath, path.join(d, `visit_emk_clean_${theme}.png`));
    }
    console.log(`Captured: visit_emk_clean_${theme}.png`);
  }

  await browser.close();
  console.log("All clean debureaucratized screenshots successfully captured!");
}

capture().catch((e) => {
  console.error("Error capturing screenshots:", e);
  process.exit(1);
});
