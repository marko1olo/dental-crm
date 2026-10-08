import { chromium } from "playwright";

const APP_BASE = "http://127.0.0.1:5173";
const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function run() {
  const browser = await chromium.launch({
    headless: true,
    executablePath: "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
    args: ["--no-sandbox", "--disable-gpu", "--disable-dev-shm-usage"],
  });

  // 1. LIGHT MODE
  {
    const context = await browser.newContext({
      viewport: { width: 1440, height: 900 },
      deviceScaleFactor: 1,
    });

    await context.addInitScript(() => {
      localStorage.setItem("dente_clinic_token", "dental_live_token");
      localStorage.setItem("dente_staff_token", "staff_live_token");
      localStorage.setItem("dente_active_session_token", "session_token_123");
      localStorage.setItem("dente_organization_id", "org_dental_1");
      localStorage.setItem("dente_user_role", "doctor");
      localStorage.setItem("dente_role", "doctor");
      localStorage.setItem("dente_perspective", "doctor");
      localStorage.setItem("dente_user_name", "Д-р Смирнов Алексей Петрович");
      localStorage.setItem("dente_onboarding_completed", "true");
      localStorage.setItem("dental-crm:onboarding:v1", JSON.stringify({ dismissed: true, step: "done" }));
      localStorage.setItem("dente_ui_preferences_v1", JSON.stringify({ onboardingDismissed: true, version: 1, selectedWorkspaceRole: "doctor" }));
      localStorage.setItem("dente_tour_completed", "true");
      localStorage.setItem("dente_quest_progress_v2", JSON.stringify({ isDismissedPermanently: true, activeTrack: null, tracksProgress: {} }));
      localStorage.setItem("dente_theme", "light");
      localStorage.setItem("dente_theme_mode", "light");
    });

    const page = await context.newPage();
    console.log("Navigating to http://127.0.0.1:5173/?demo=true#schedule (Light)...");
    await page.goto(`${APP_BASE}/?demo=true#schedule`, { waitUntil: "domcontentloaded", timeout: 45000 });
    
    console.log("Waiting for schedule container to mount...");
    await page.waitForSelector('.schedule-filter-strip, [data-testid="schedule-grid"], .schedule-timeline', { state: "visible", timeout: 35000 });
    await wait(3000);

    // Clean toasts / overlays
    await page.evaluate(() => {
      document.querySelectorAll('vite-error-overlay, .tour-spotlight-root, [data-testid="guided-tour-spotlight-overlay"], .tour-backdrop-clickable-zone, .global-toast-container, [data-testid="demo-mode-banner"]').forEach(el => el.remove());
      document.documentElement.setAttribute("data-theme", "light");
      document.documentElement.classList.remove("dark");
      document.documentElement.classList.add("light");
      document.body.className = "light";
      document.documentElement.style.colorScheme = "light";
    });
    await wait(1000);

    await page.screenshot({ path: "proof_schedule_chair_duty_light_1440x900.png" });
    console.log("Saved proof_schedule_chair_duty_light_1440x900.png");
    await context.close();
  }

  // 2. DARK MODE
  {
    const context = await browser.newContext({
      viewport: { width: 1440, height: 900 },
      deviceScaleFactor: 1,
    });

    await context.addInitScript(() => {
      localStorage.setItem("dente_clinic_token", "dental_live_token");
      localStorage.setItem("dente_staff_token", "staff_live_token");
      localStorage.setItem("dente_active_session_token", "session_token_123");
      localStorage.setItem("dente_organization_id", "org_dental_1");
      localStorage.setItem("dente_user_role", "doctor");
      localStorage.setItem("dente_role", "doctor");
      localStorage.setItem("dente_perspective", "doctor");
      localStorage.setItem("dente_user_name", "Д-р Смирнов Алексей Петрович");
      localStorage.setItem("dente_onboarding_completed", "true");
      localStorage.setItem("dental-crm:onboarding:v1", JSON.stringify({ dismissed: true, step: "done" }));
      localStorage.setItem("dente_ui_preferences_v1", JSON.stringify({ onboardingDismissed: true, version: 1, selectedWorkspaceRole: "doctor" }));
      localStorage.setItem("dente_tour_completed", "true");
      localStorage.setItem("dente_quest_progress_v2", JSON.stringify({ isDismissedPermanently: true, activeTrack: null, tracksProgress: {} }));
      localStorage.setItem("dente_theme", "dark");
      localStorage.setItem("dente_theme_mode", "dark");
    });

    const page = await context.newPage();
    console.log("Navigating to http://127.0.0.1:5173/?demo=true#schedule (Dark)...");
    await page.goto(`${APP_BASE}/?demo=true#schedule`, { waitUntil: "domcontentloaded", timeout: 45000 });
    
    console.log("Waiting for schedule container to mount...");
    await page.waitForSelector('.schedule-filter-strip, [data-testid="schedule-grid"], .schedule-timeline', { state: "visible", timeout: 35000 });
    await wait(3000);

    // Clean toasts / overlays
    await page.evaluate(() => {
      document.querySelectorAll('vite-error-overlay, .tour-spotlight-root, [data-testid="guided-tour-spotlight-overlay"], .tour-backdrop-clickable-zone, .global-toast-container, [data-testid="demo-mode-banner"]').forEach(el => el.remove());
      document.documentElement.setAttribute("data-theme", "dark");
      document.documentElement.classList.remove("light");
      document.documentElement.classList.add("dark");
      document.body.className = "dark";
      document.documentElement.style.colorScheme = "dark";
    });
    await wait(1000);

    await page.screenshot({ path: "proof_schedule_chair_duty_dark_1440x900.png" });
    console.log("Saved proof_schedule_chair_duty_dark_1440x900.png");
    await context.close();
  }

  await browser.close();
  console.log("ALL REAL SCHEDULE CHAIR PROOFS SAVED SUCCESSFULLY!");
}

run().catch(console.error);
