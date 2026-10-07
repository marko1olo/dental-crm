const { chromium } = require("playwright");
const path = require("node:path");
const fs = require("node:fs");

const TARGET_DIR = path.resolve("docs/screenshots/omnichannel_master");
const BRAIN_DIR = path.resolve("C:/Users/Admin/.gemini/antigravity/brain/a3b47045-b11d-4653-8af4-e9981cee44dc");

if (!fs.existsSync(TARGET_DIR)) {
  fs.mkdirSync(TARGET_DIR, { recursive: true });
}

async function captureState({ name, width, height, theme, isMobile }) {
  console.log(`\n========================================`);
  console.log(`Capturing ${name} (${width}x${height}, theme: ${theme}, isMobile: ${isMobile})`);
  console.log(`========================================`);

  // Get real auth token
  const res = await fetch("http://127.0.0.1:4100/api/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: "doctor@clinic.com", password: "dente2026" }),
  });
  const authData = await res.json();

  const browser = await chromium.launch({
    headless: true,
    executablePath: "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
    args: ["--no-sandbox", "--disable-gpu", "--disable-dev-shm-usage"],
  });

  const context = await browser.newContext({
    viewport: { width, height },
    isMobile,
    deviceScaleFactor: 2,
  });

  await context.addInitScript(({ authData, theme }) => {
    localStorage.setItem("dente_clinic_token", authData.clinicToken);
    localStorage.setItem("dente_staff_token", authData.staffToken);
    localStorage.setItem("dente_active_role", "owner");
    localStorage.setItem("dental-crm:active-user:v1", JSON.stringify({ ...authData.user, role: "owner" }));
    localStorage.setItem("dente_cached_active_staff_user", JSON.stringify({ ...authData.user, role: "owner" }));
    localStorage.setItem("dente_theme_mode", theme);
    localStorage.setItem("dental-crm:onboarding:v1", JSON.stringify({ completed: true, dismissed: true }));
    localStorage.setItem("dente_tour_completed", "true");
    localStorage.setItem("dente_quest_progress_v2", JSON.stringify({ isDismissedPermanently: true, activeTrack: null, tracksProgress: {} }));
    localStorage.setItem("dental-crm:web-ui-preferences:v1", JSON.stringify({
      version: 1,
      uiLanguage: "ru",
      selectedWorkspaceRole: "owner",
      onboardingDismissed: true,
      onboardingStep: "done",
    }));
  }, { authData, theme });

  const page = await context.newPage();
  console.log("Navigating to http://127.0.0.1:5173/#settings...");
  await page.goto("http://127.0.0.1:5173/#settings", { waitUntil: "domcontentloaded", timeout: 25000 });
  await page.waitForTimeout(2000);

  // Apply theme & remove overlays
  await page.evaluate((t) => {
    document.documentElement.setAttribute("data-theme", t);
    if (t === "dark") {
      document.documentElement.classList.add("dark");
      document.documentElement.classList.remove("light");
      document.documentElement.style.colorScheme = "dark";
    } else {
      document.documentElement.classList.add("light");
      document.documentElement.classList.remove("dark");
      document.documentElement.style.colorScheme = "light";
    }
    document.querySelectorAll('.tour-spotlight-root, [data-testid="guided-tour-spotlight-overlay"], .tour-backdrop-clickable-zone, [data-testid="demo-mode-banner"], .global-toast-container, [role="alert"]').forEach((el) => el.remove());
  }, theme);

  if (!isMobile) {
    // Desktop Flow
    console.log("Desktop: Clicking admin role tab...");
    const adminRoleBtn = page.locator('[data-testid="btn-settings-role-admin"]');
    await adminRoleBtn.waitFor({ state: "visible", timeout: 8000 });
    await adminRoleBtn.click();
    await page.waitForTimeout(800);

    console.log("Desktop: Clicking messengers tab...");
    const messengersTabBtn = page.locator('[data-testid="admin-tab-messengers"]');
    await messengersTabBtn.waitFor({ state: "visible", timeout: 8000 });
    await messengersTabBtn.click();
    await page.waitForTimeout(1500);
  } else {
    // Mobile Flow
    console.log("Mobile: Waiting for mobile-settings-row-messengers...");
    const mobileMessengersRow = page.locator('[data-testid="mobile-settings-row-messengers"]');
    await mobileMessengersRow.scrollIntoViewIfNeeded();
    await mobileMessengersRow.waitFor({ state: "visible", timeout: 8000 });
    await mobileMessengersRow.click();
    await page.waitForTimeout(1500);
  }

  // Remove any remaining tour overlays
  await page.evaluate(() => {
    document.querySelectorAll('.tour-spotlight-root, [data-testid="guided-tour-spotlight-overlay"], .tour-backdrop-clickable-zone, [data-testid="demo-mode-banner"], .global-toast-container, [role="alert"]').forEach((el) => el.remove());
  });

  // Verify MessengersOverviewCard is mounted
  console.log("Verifying [data-testid='messengers-overview-card'] is visible...");
  const overviewCard = page.locator("[data-testid='messengers-overview-card']");
  await overviewCard.waitFor({ state: "visible", timeout: 10000 });
  await page.waitForTimeout(1200);

  const outPathDocs = path.join(TARGET_DIR, name);
  const outPathBrain = path.join(BRAIN_DIR, name);

  await page.screenshot({ path: outPathDocs, fullPage: false });
  fs.copyFileSync(outPathDocs, outPathBrain);

  const stat = fs.statSync(outPathDocs);
  console.log(`>>> SUCCESS: Saved ${name} (${stat.size} bytes)`);

  await browser.close();
}

async function main() {
  await captureState({
    name: "omnichannel_master_pc_light.png",
    width: 1440,
    height: 900,
    theme: "light",
    isMobile: false,
  });

  await captureState({
    name: "omnichannel_master_pc_dark.png",
    width: 1440,
    height: 900,
    theme: "dark",
    isMobile: false,
  });

  await captureState({
    name: "omnichannel_master_mobile_light.png",
    width: 390,
    height: 844,
    theme: "light",
    isMobile: true,
  });

  await captureState({
    name: "omnichannel_master_mobile_dark.png",
    width: 390,
    height: 844,
    theme: "dark",
    isMobile: true,
  });

  console.log("\nALL 4 OMNICHANNEL MASTER PROOFS CAPTURED SUCCESSFULLY!");
}

main().catch((err) => {
  console.error("Capture process error:", err);
  process.exit(1);
});
