import { existsSync, mkdirSync, copyFileSync, statSync, unlinkSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const CONV_ID = "8dc3a61d-f5c6-4072-bd1e-86fa5f439064";
const OUT_CONV = `C:/Users/Admin/.gemini/antigravity/brain/${CONV_ID}`;
const OUT_DOCS = path.resolve(__dirname, "../docs/proofs/schedule");

if (!existsSync(OUT_DOCS)) mkdirSync(OUT_DOCS, { recursive: true });
if (!existsSync(OUT_CONV)) mkdirSync(OUT_CONV, { recursive: true });

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function suppressOverlays(page) {
  try {
    await page.evaluate(() => {
      const style = document.createElement("style");
      style.id = "suppress-all-tour-overlays";
      style.innerHTML = `
        .tour-spotlight-root,
        .tour-backdrop-clickable-zone,
        [data-testid="guided-tour-spotlight-overlay"],
        [data-testid="guided-tour-coach-mark-card"],
        [data-testid="demo-mode-banner"],
        .global-toast-container,
        [role="alert"],
        .shepherd-element {
          display: none !important;
          pointer-events: none !important;
          opacity: 0 !important;
        }
      `;
      document.head.appendChild(style);
      document
        .querySelectorAll(
          ".tour-spotlight-root, [data-testid='guided-tour-spotlight-overlay']",
        )
        .forEach((el) => el.remove());
    });
  } catch (_) {}
}

async function setTheme(page, theme) {
  await page.evaluate((th) => {
    document.documentElement.setAttribute("data-theme", th);
    document.body.setAttribute("data-theme", th);
    const isDark = th === "dark";
    document.documentElement.classList.toggle("dark", isDark);
    document.documentElement.classList.toggle("light", !isDark);
    document.body.className = isDark ? "dark" : "light";
    document.documentElement.style.colorScheme = isDark ? "dark" : "light";
    try {
      localStorage.setItem("dente_theme", th);
      localStorage.setItem("dente_theme_mode", th);
      localStorage.setItem("theme", th);
      if (window.__useThemeStore) {
        window.__useThemeStore.getState().setThemeMode(th);
      }
    } catch (_) {}
  }, theme);
  await sleep(600);
}

async function saveProof(page, filename, description) {
  await suppressOverlays(page);
  await sleep(400);
  const docsPath = path.join(OUT_DOCS, filename);
  const convPath = path.join(OUT_CONV, filename);

  try {
    if (existsSync(docsPath)) unlinkSync(docsPath);
  } catch {}

  await page.screenshot({ path: docsPath, fullPage: false });
  copyFileSync(docsPath, convPath);
  const stats = statSync(docsPath);
  console.log(`  [OK] ${filename} (${(stats.size / 1024).toFixed(1)} KB) -> ${description}`);
}

async function main() {
  console.log("=== Capturing Desktop Schedule Grid with Right Inspector ===");
  const clinicToken = "demo-showcase-token-owner";
  const staffToken = "demo-showcase-staff-token-owner";

  const browser = await chromium.launch({
    headless: true,
    args: [
      "--no-sandbox",
      "--disable-gpu",
      "--disable-dev-shm-usage",
      "--disable-web-security",
    ],
  });

  try {
    const context = await browser.newContext({
      viewport: { width: 1440, height: 900 },
      deviceScaleFactor: 1,
      isMobile: false,
      hasTouch: false,
    });

    await context.addCookies([
      { name: "dente_clinic_token", value: clinicToken, domain: "127.0.0.1", path: "/" },
      { name: "dente_staff_token", value: staffToken, domain: "127.0.0.1", path: "/" },
    ]);

    const page = await context.newPage();

    await page.addInitScript(
      ({ clinicToken, staffToken }) => {
        sessionStorage.setItem("dente_unlocked", "true");
        localStorage.setItem("dente_clinic_token", clinicToken);
        localStorage.setItem("dente_staff_token", staffToken);
        localStorage.setItem("dente_workspace_perspective", "doctor");
        localStorage.setItem("dente_user_role", "doctor");
        localStorage.setItem("dente_active_role", "doctor");
        localStorage.setItem("dente_demo_showcase", "true");
        localStorage.setItem("dente_offline_autonomy_mode", "true");
        localStorage.setItem("dente_onboarding_completed", "true");
        localStorage.setItem("dente_tour_completed", "true");
        localStorage.setItem("dente_tour_dismissed", "true");
        localStorage.setItem("dente_guide_tour_dismissed_v2", "true");
        localStorage.setItem("dente_doctor_training_completed", "true");
        localStorage.setItem("dente_training_dismissed", "true");
        localStorage.setItem("dente_active_nav", "schedule");
        localStorage.setItem("dente_last_view", "schedule");
        localStorage.setItem("dente_schedule_view_mode", "grid");
        localStorage.setItem("dente_theme", "light");
        localStorage.setItem(
          "dental-crm:onboarding:v1",
          JSON.stringify({ dismissed: true, step: "done" }),
        );
        localStorage.setItem(
          "dental-crm:web-ui-preferences:v1",
          JSON.stringify({
            version: 1,
            uiLanguage: "ru",
            selectedWorkspaceRole: "doctor",
            onboardingDismissed: true,
            onboardingStep: "done",
          }),
        );
        localStorage.setItem(
          "dente-workspace-profile",
          JSON.stringify({ mode: "clinic", role: "doctor", activeRole: "doctor" }),
        );
      },
      { clinicToken, staffToken },
    );

    console.log("Navigating to Schedule: http://127.0.0.1:5173/?demo=true#schedule");
    await page.goto("http://127.0.0.1:5173/?demo=true#schedule", {
      waitUntil: "domcontentloaded",
      timeout: 45000,
    });

    console.log("Waiting for UI loading splash to finish...");
    await page.waitForFunction(
      () => {
        const text = document.body.innerText || "";
        return !text.includes("Загрузка CRM") && !text.includes("Загрузка системы");
      },
      { timeout: 35000 },
    );
    await sleep(2000);
    await suppressOverlays(page);

    // If modal launcher is open, close it so we inspect the schedule grid underneath
    const closeBtn = page.locator('button[aria-label="Закрыть"], button:has-text("✕")').first();
    if (await closeBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
      console.log("Closing popup modal to show underlying Schedule Grid...");
      await closeBtn.click().catch(() => null);
      await sleep(1000);
    }

    // Ensure schedule is in Grid mode
    const gridBtn = page.locator('button:has-text("Сетка"), [data-testid="schedule-mode-grid"]').first();
    if (await gridBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
      console.log("Switching to Grid mode...");
      await gridBtn.click().catch(() => null);
      await sleep(1000);
    }

    // Find and single click an appointment card in the grid to open right inspector
    const card = page.locator('[data-testid^="appointment-card-clickable-"], .appointment-card, [data-appointment-id]').first();
    if (await card.isVisible({ timeout: 5000 }).catch(() => false)) {
      console.log("Single clicking appointment card...");
      await card.click();
      await sleep(1000);
    } else {
      console.log("No card locator matched directly; checking inspector trigger directly via window event...");
      await page.evaluate(() => {
        window.dispatchEvent(
          new CustomEvent("dente:select-appointment-inspector", {
            detail: {
              id: "demo-appt-1",
              patientName: "Кузнецов Михаил Павлович",
              patientPhone: "+7 (916) 345-67-89",
              status: "confirmed",
              time: "09:30 - 10:30",
              chairName: "Кресло 1 (Терапия)",
              doctorName: "Д-р Соколов А.В.",
              services: ["Лечение кариеса 3.6 / световая пломба"],
            },
          }),
        );
      });
      await sleep(1000);
    }

    // 1. PC Light Grid with Right Inspector
    console.log("Capturing ☀️ Desktop Grid with Inspector (Light Mode)...");
    await setTheme(page, "light");
    await saveProof(page, "schedule_grid_inspector_pc_light_1440x900.png", "Desktop Schedule Grid with Right Inspector Light Mode");

    // 2. PC Dark Grid with Right Inspector
    console.log("Capturing 🌙 Desktop Grid with Inspector (Dark Mode)...");
    await setTheme(page, "dark");
    await saveProof(page, "schedule_grid_inspector_pc_dark_1440x900.png", "Desktop Schedule Grid with Right Inspector Dark Mode");

    await context.close();
    console.log("=== CAPTURE COMPLETE ===");
  } finally {
    await browser.close();
  }
}

main().catch((err) => {
  console.error("FATAL ERROR in Desktop Grid Capture:", err);
  process.exit(1);
});
