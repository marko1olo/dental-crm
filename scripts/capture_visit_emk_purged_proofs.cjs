const { chromium } = require("playwright");
const path = require("node:path");
const fs = require("node:fs");

async function captureProofs() {
  console.log("1. Authenticating with API...");
  let auth = { clinicToken: "mock", staffToken: "mock", user: { id: "u-1", fullName: "Доктор Смирнов" } };
  try {
    const loginRes = await fetch("http://localhost:4100/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: "doctor@clinic.com", password: "dente2026" }),
    });
    if (loginRes.ok) {
      auth = await loginRes.json();
      console.log("Logged in successfully:", auth.user?.fullName);
    }
  } catch (err) {
    console.warn("API login fallback:", err.message);
  }

  const outDir = path.resolve("docs/screenshots/visit_emk_purity");
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

  const browser = await chromium.launch({
    channel: "msedge",
    headless: true,
    args: ["--no-sandbox", "--disable-gpu"],
  });

  // Capture Light & Dark
  for (const theme of ["light", "dark"]) {
    console.log(`\n2. Capturing ${theme.toUpperCase()} theme (1440x900)...`);
    const context = await browser.newContext({
      viewport: { width: 1440, height: 900 },
    });

    await context.addInitScript(({ clinicToken, staffToken, user, themeMode }) => {
      localStorage.setItem("dente_clinic_token", clinicToken);
      localStorage.setItem("dente_staff_token", staffToken);
      localStorage.setItem("dente_active_role", "doctor");
      localStorage.setItem("dental-crm:active-user:v1", JSON.stringify(user));
      localStorage.setItem("dente_theme_mode", themeMode);
      localStorage.setItem("dental-crm:onboarding:v1", JSON.stringify({ completed: true, dismissed: true }));
      localStorage.setItem("dente_tour_completed", "true");
      localStorage.setItem("dente_quest_progress_v2", JSON.stringify({ isDismissedPermanently: true, activeTrack: null, tracksProgress: {} }));
      localStorage.setItem("dental-crm:web-ui-preferences:v1", JSON.stringify({
        version: 1,
        uiLanguage: "ru",
        selectedWorkspaceRole: "doctor",
        onboardingDismissed: true,
        onboardingStep: "done",
      }));
    }, { clinicToken: auth.clinicToken, staffToken: auth.staffToken, user: auth.user, themeMode: theme });

    const page = await context.newPage();
    await page.goto("http://127.0.0.1:5173/#visit", { waitUntil: "networkidle", timeout: 15000 }).catch(async () => {
      await page.goto("http://127.0.0.1:5173/#visit", { waitUntil: "domcontentloaded" });
    });
    await page.waitForTimeout(2000);

    // Remove tour spotlights and noisy toasts
    await page.evaluate((themeMode) => {
      document.documentElement.classList.remove("light", "dark");
      document.documentElement.classList.add(themeMode);
      document.body.classList.remove("light", "dark");
      document.body.classList.add(themeMode);
      document.querySelectorAll('.tour-spotlight-root, [data-testid="guided-tour-spotlight-overlay"], .tour-backdrop-clickable-zone, .global-toast-container').forEach(el => el.remove());
    }, theme);

    await page.waitForTimeout(500);

    // Take full page screenshot
    const shotPath = path.join(outDir, `visit_emk_desktop_${theme}.png`);
    await page.screenshot({ path: shotPath, fullPage: false });
    console.log(`Saved screenshot: ${shotPath}`);

    // Click more actions to inspect menu if exists
    const moreBtn = page.locator('[data-testid="visit-header-more-actions-btn"]');
    if (await moreBtn.count() > 0 && await moreBtn.isVisible()) {
      await moreBtn.click();
      await page.waitForTimeout(400);
      const menuShotPath = path.join(outDir, `visit_header_more_menu_${theme}.png`);
      await page.screenshot({ path: menuShotPath, fullPage: false });
      console.log(`Saved menu screenshot: ${menuShotPath}`);
    }

    await context.close();
  }

  await browser.close();
  console.log("\nAll proofs captured successfully!");
}

captureProofs().catch(console.error);
