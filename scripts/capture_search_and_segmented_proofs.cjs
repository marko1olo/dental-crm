const { chromium } = require("playwright");
const path = require("node:path");
const fs = require("node:fs");

const ARTIFACTS_DIR = "C:/Users/Admin/.gemini/antigravity/brain/beb92312-c6d7-426d-a438-12dcad022abc";
const LOCAL_DIR = "C:/Clinic_MVP/dental-crm/apps/web/public/screenshots/settings_prices";

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function captureProof() {
  console.log("Launching Playwright Chromium (channel: chrome) for Search & Segmented Controls Visual Proof...");
  fs.mkdirSync(LOCAL_DIR, { recursive: true });

  const browser = await chromium.launch({
    channel: "chrome",
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox"]
  });

  try {
    const context = await browser.newContext({
      viewport: { width: 1440, height: 900 }
    });

    await context.addInitScript(() => {
      localStorage.setItem("dente_demo_showcase", "true");
      localStorage.setItem("dente_clinic_token", "dental");
      localStorage.setItem("dente_staff_token", "demo-showcase-staff-token-chief");
      localStorage.setItem("dente_active_role", "owner");
      localStorage.setItem("dente_user_id", "demo-chief");
      localStorage.setItem("dente_user_role", "owner");
      localStorage.setItem("dente_clinic_tenant_id", "00000000-0000-0000-0000-000000000001");
      localStorage.setItem("dente_onboarding_completed", "true");
      localStorage.setItem("dente_tour_completed", "true");
      localStorage.setItem("dental-crm:onboarding:v1", JSON.stringify({ dismissed: true, step: "done", completed: true }));
      localStorage.setItem("dente_theme_mode", "light");
    });

    const page = await context.newPage();

    console.log("Opening http://127.0.0.1:5173/?demo=true#settings ...");
    await page.goto("http://127.0.0.1:5173/?demo=true#settings", { waitUntil: "domcontentloaded", timeout: 20000 });
    await wait(2000);

    // If still on auth screen, click demo unlock
    const demoBtn = await page.$(".auth-demo-btn");
    if (demoBtn) {
      console.log("Clicking .auth-demo-btn...");
      await demoBtn.click();
      await wait(1500);
    }

    // Remove onboarding modal and overlays directly
    await page.evaluate(() => {
      // Click 0-click start if present
      const startBtn = Array.from(document.querySelectorAll("button")).find(b => b.textContent?.includes("0-клик старт"));
      if (startBtn) startBtn.click();

      // Remove any remaining backdrop or dialog overlays
      document.querySelectorAll('.fixed.inset-0, .onboarding-modal, [role="dialog"], .tour-spotlight-root, [data-testid="guided-tour-spotlight-overlay"], .tour-backdrop-clickable-zone, [data-testid="demo-mode-banner"], .interactive-guide-tour-card').forEach((el) => {
        if (!el.closest('.pricelist-section-card')) el.remove();
      });
    });
    await wait(1000);

    // Ensure we are in settings prices tab
    console.log("Navigating to prices tab...");
    await page.evaluate(() => {
      // 1. If settings button exists in nav, click it
      const settingsNav = Array.from(document.querySelectorAll("button, a, [data-tab]")).find(
        r => r.getAttribute("data-tab") === "settings" || r.textContent?.includes("Настройки")
      );
      if (settingsNav) settingsNav.click();

      // 2. Click prices tab
      const pricesTab = Array.from(document.querySelectorAll("button, [role='tab'], span, a")).find(
        t => t.textContent?.includes("Цены") || t.textContent?.includes("Прейскурант")
      );
      if (pricesTab) pricesTab.click();
    });
    await wait(2000);

    // Set Light theme
    console.log("Capturing PC Light...");
    await page.evaluate(() => {
      document.documentElement.classList.remove("dark");
      document.documentElement.setAttribute("data-theme", "light");
    });
    await wait(800);

    const lightPricelistPath = path.join(ARTIFACTS_DIR, "proof_search_prices_pc_light.png");
    const localLightPath = path.join(LOCAL_DIR, "proof_search_prices_pc_light.png");
    await page.screenshot({ path: lightPricelistPath, fullPage: false });
    await page.screenshot({ path: localLightPath, fullPage: false });
    console.log("Saved PC Light:", lightPricelistPath);

    // Set Dark theme
    console.log("Capturing PC Dark...");
    await page.evaluate(() => {
      document.documentElement.classList.add("dark");
      document.documentElement.setAttribute("data-theme", "dark");
    });
    await wait(800);

    const darkPricelistPath = path.join(ARTIFACTS_DIR, "proof_search_prices_pc_dark.png");
    const localDarkPath = path.join(LOCAL_DIR, "proof_search_prices_pc_dark.png");
    await page.screenshot({ path: darkPricelistPath, fullPage: false });
    await page.screenshot({ path: localDarkPath, fullPage: false });
    console.log("Saved PC Dark:", darkPricelistPath);

    // Mobile viewport test (390x844)
    console.log("Capturing Mobile Dark...");
    await page.setViewportSize({ width: 390, height: 844 });
    await wait(1000);

    const darkMobilePath = path.join(ARTIFACTS_DIR, "proof_search_prices_mobile_dark.png");
    const localDarkMobilePath = path.join(LOCAL_DIR, "proof_search_prices_mobile_dark.png");
    await page.screenshot({ path: darkMobilePath, fullPage: false });
    await page.screenshot({ path: localDarkMobilePath, fullPage: false });
    console.log("Saved Mobile Dark:", darkMobilePath);

    console.log("Capturing Mobile Light...");
    await page.evaluate(() => {
      document.documentElement.classList.remove("dark");
      document.documentElement.setAttribute("data-theme", "light");
    });
    await wait(800);

    const lightMobilePath = path.join(ARTIFACTS_DIR, "proof_search_prices_mobile_light.png");
    const localLightMobilePath = path.join(LOCAL_DIR, "proof_search_prices_mobile_light.png");
    await page.screenshot({ path: lightMobilePath, fullPage: false });
    await page.screenshot({ path: localLightMobilePath, fullPage: false });
    console.log("Saved Mobile Light:", lightMobilePath);

    console.log("Visual proof capture complete!");
  } catch (err) {
    console.error("Capture failed:", err);
  } finally {
    await browser.close();
  }
}

captureProof();
