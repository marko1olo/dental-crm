const { chromium } = require("playwright");
const fs = require("node:fs");
const path = require("node:path");

const targetDirs = [
  path.resolve("docs/screenshots/inquisition_live"),
  path.resolve("docs/screenshots/mobile_audit_wave127"),
];

for (const dir of targetDirs) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

const brainDir = "C:\\Users\\Admin\\.gemini\\antigravity\\brain\\beb92312-c6d7-426d-a438-12dcad022abc";
if (!fs.existsSync(brainDir)) {
  fs.mkdirSync(brainDir, { recursive: true });
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
  await page.waitForTimeout(400);
}

async function saveProof(page, fileName) {
  for (const dir of targetDirs) {
    const fullPath = path.join(dir, fileName);
    await page.screenshot({ path: fullPath, fullPage: false, animations: "disabled" });
    console.log(`Saved screenshot: ${fullPath} (${fs.statSync(fullPath).size} bytes)`);
  }
  // Copy to brain artifacts dir
  const brainPath = path.join(brainDir, fileName);
  fs.copyFileSync(path.join(targetDirs[0], fileName), brainPath);
  console.log(`Copied to brain: ${brainPath}`);
}

async function main() {
  console.log("=== PLAYWRIGHT CAPTURE: DEDICATED MOBILE SCHEDULE AGENDA VIEW (APPLE HIG) ===");

  const browser = await chromium.launch({
    executablePath: "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });

  try {
    // Standard iPhone 14/15/16 viewport (390 x 844)
    const context = await browser.newContext({
      viewport: { width: 390, height: 844 },
      deviceScaleFactor: 2,
      isMobile: true,
      hasTouch: true,
      userAgent: "Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Mobile/15E148 Safari/604.1",
    });

    await context.addInitScript(() => {
      // 1. Enable Demo Showcase Mode per Rule 7 (Demo-Only Mocks Mandate)
      localStorage.setItem("dente_demo_showcase", "true");
      localStorage.setItem("dente_clinic_token", "demo-token-clinic-777");
      localStorage.setItem("dente_staff_token", "demo-token-staff-777");
      localStorage.setItem("dente_active_session_token", "demo-token-staff-777");
      localStorage.setItem("dente_active_user_id", "doc-1");
      localStorage.setItem("dente_active_role", "owner");
      localStorage.setItem("dente_active_mode", "clinic");
      sessionStorage.setItem("dente_unlocked", "true");
      document.cookie = "dente_clinic_token=demo-token-clinic-777; path=/;";
      document.cookie = "dente_staff_token=demo-token-staff-777; path=/;";

      // 2. Dismiss onboarding and tours
      localStorage.setItem("dental-crm:onboarding:v1", JSON.stringify({ dismissed: true, step: "done", completed: true }));
      localStorage.setItem("dente_tour_completed", "true");
      localStorage.setItem("dente_tour_dismissed", "true");
      localStorage.setItem("dente_onboarding_dismissed", "true");
      localStorage.setItem("dente_ui_preferences_v1", JSON.stringify({ onboardingDismissed: true, onboardingStep: "done", version: 1 }));
      localStorage.setItem("dental-crm:web-ui-preferences:v1", JSON.stringify({
        version: 1,
        uiLanguage: "ru",
        selectedWorkspaceRole: "owner",
        onboardingDismissed: true,
        onboardingStep: "done",
      }));
    });

    const page = await context.newPage();

    await page.route("**/*fonts.googleapis.com/**", (route) => route.abort());
    await page.route("**/*fonts.gstatic.com/**", (route) => route.abort());

    console.log("Navigating to http://127.0.0.1:5173/?demo=true#schedule...");
    await page.goto("http://127.0.0.1:5173/?demo=true#schedule", { waitUntil: "domcontentloaded", timeout: 30000 });
    await page.waitForSelector(".boot-state", { state: "detached", timeout: 30000 }).catch(() => {});
    
    // Clean any overlays or toasts that may obstruct clinical view
    await page.evaluate(() => {
      document.querySelectorAll(
        '.sa-toast, [data-testid="global-toast"], .onboarding-compact-strip, .tour-spotlight-root, [data-testid="guided-tour-spotlight-overlay"], .tour-backdrop-clickable-zone, [data-testid="demo-mode-banner"], .default-clinic-banner, .tour-tooltip, .driver-overlay, .driver-popover'
      ).forEach((el) => el.remove());
    });

    // Wait for dedicated mobile agenda view
    console.log("Waiting for schedule mobile agenda view...");
    await page.waitForSelector('[data-testid="schedule-mobile-agenda-view"], .schedule-mobile-agenda', {
      state: "visible",
      timeout: 30000,
    });
    await page.waitForTimeout(1000);

    // Dismiss banner notices or onboarding if present
    const noticeDismiss = page.locator('.app-notice button:has-text("Понятно"), [data-testid="btn-dismiss-notice"]');
    if (await noticeDismiss.isVisible()) {
      await noticeDismiss.click().catch(() => {});
      await page.waitForTimeout(300);
    }

    // Measure horizontal scroll on 390px
    const scrollDimensions = await page.evaluate(() => {
      return {
        scrollWidth: document.documentElement.scrollWidth,
        clientWidth: document.documentElement.clientWidth,
        bodyScrollWidth: document.body.scrollWidth,
      };
    });
    console.log(`[SCROLL-CHECK] Document scrollWidth: ${scrollDimensions.scrollWidth}, clientWidth: ${scrollDimensions.clientWidth}`);
    if (scrollDimensions.scrollWidth > scrollDimensions.clientWidth) {
      console.error(`[FAIL] Parasitic horizontal scroll: +${scrollDimensions.scrollWidth - scrollDimensions.clientWidth}px`);
    } else {
      console.log(`[PASS] ZERO PARASITIC SCROLL CONFIRMED: 0px drift!`);
    }

    // 1. Capture Mobile Light
    console.log("Capturing Mobile Light...");
    await setTheme(page, "light");
    await page.waitForTimeout(500);
    await saveProof(page, "proof_mobile_schedule_agenda_light.png");

    // 2. Capture Mobile Dark
    console.log("Capturing Mobile Dark...");
    await setTheme(page, "dark");
    await page.waitForTimeout(500);
    await saveProof(page, "proof_mobile_schedule_agenda_dark.png");

    console.log("=== MOBILE SCHEDULE AGENDA PROOFS SUCCESSFULLY CAPTURED ===");
  } finally {
    await browser.close();
  }
}

main().catch((err) => {
  console.error("Capture failed:", err);
  process.exit(1);
});
