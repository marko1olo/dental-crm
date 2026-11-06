/**
 * scripts/capture-schedule-4state-canonical.mjs
 * Red Team 4-State Visual Proof Capture for Schedule & 3-Second Fast Booking:
 * 1. ☀️ PC Light (1440x900): Desktop Schedule Grid
 * 2. 🌙 PC Dark (1440x900): Desktop Schedule Grid Dark Mode
 * 3. ☀️ Quick Booking PC Light (1440x900): 3-Second Fast Booking Drawer
 * 4. 🌙 Quick Booking PC Dark (1440x900): 3-Second Fast Booking Drawer Dark Mode
 * 5. 📱 Mobile Light (390x844): Agenda View Apple HIG
 * 6. 🌙 Mobile Dark (390x844): Agenda View Dark Mode
 * 7. 📱 Mobile Quick Booking Bottom Sheet Light (390x844)
 * 8. 🌙 Mobile Quick Booking Bottom Sheet Dark (390x844)
 */

import { existsSync, mkdirSync, copyFileSync, statSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const CONV_ID = "8dc3a61d-f5c6-4072-bd1e-86fa5f439064";
const OUT_CONV = `C:/Users/Admin/.gemini/antigravity/brain/${CONV_ID}`;
const OUT_DOCS = path.resolve(__dirname, "../docs/proofs/schedule");

if (!existsSync(OUT_DOCS)) {
  mkdirSync(OUT_DOCS, { recursive: true });
}
if (!existsSync(OUT_CONV)) {
  mkdirSync(OUT_CONV, { recursive: true });
}

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
    if (th === "dark") {
      document.documentElement.classList.add("dark");
      document.documentElement.classList.remove("light");
      document.body.classList.add("dark");
      document.body.classList.remove("light");
    } else {
      document.documentElement.classList.add("light");
      document.documentElement.classList.remove("dark");
      document.body.classList.add("light");
      document.body.classList.remove("dark");
    }
    try {
      localStorage.setItem("dente_theme", th);
      localStorage.setItem("dente_theme_mode", th);
      localStorage.setItem("theme", th);
    } catch (_) {}
  }, theme);
  await sleep(400);
}

async function setupPageSession(context, page, role = "doctor") {
  await page.addInitScript(
    ({ role }) => {
      sessionStorage.setItem("dente_unlocked", "true");
      localStorage.setItem("dente_workspace_perspective", role);
      localStorage.setItem("dente_user_role", role);
      localStorage.setItem("dente_active_role", role);
      localStorage.setItem("dente_demo_showcase", "true");
      localStorage.setItem("dente_onboarding_completed", "true");
      localStorage.setItem("dente_tour_completed", "true");
      localStorage.setItem("dente_tour_dismissed", "true");
      localStorage.setItem("dente_guide_tour_dismissed_v2", "true");
      localStorage.setItem("dente_active_nav", "schedule");
      localStorage.setItem("dente_last_view", "schedule");
      localStorage.setItem(
        "dental-crm:onboarding:v1",
        JSON.stringify({ dismissed: true, step: "done" }),
      );
      localStorage.setItem(
        "dental-crm:web-ui-preferences:v1",
        JSON.stringify({
          version: 1,
          uiLanguage: "ru",
          selectedWorkspaceRole: role,
          onboardingDismissed: true,
          onboardingStep: "done",
        }),
      );
      localStorage.setItem(
        "dente-workspace-profile",
        JSON.stringify({ mode: "clinic", role: role, activeRole: role }),
      );
    },
    { role },
  );
}

async function waitForRealUI(page) {
  const loginBtn = page.locator('button:has-text("Войти в систему")');
  if (await loginBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
    console.log("  [AUTH] Clicking login submit button...");
    await loginBtn.click();
    await sleep(1500);
  }

  const demoBtn = page.locator(".auth-demo-btn");
  if (await demoBtn.isVisible({ timeout: 1500 }).catch(() => false)) {
    console.log("  [AUTH] Clicking demo launch button...");
    await demoBtn.click();
    await sleep(800);
    const adminCard = page
      .locator(".auth-demo-role-card", { hasText: "Главврач" })
      .first();
    if (await adminCard.isVisible().catch(() => false)) {
      await adminCard.click();
      await sleep(400);
    }
    const launchBtn = page
      .locator(".auth-demo-tour-actions button.auth-submit-btn")
      .first();
    if (await launchBtn.isVisible().catch(() => false)) {
      await launchBtn.click();
      await sleep(2000);
    }
  }

  console.log("  Waiting for UI to stabilize...");
  await page.waitForFunction(
    () => {
      const text = document.body.innerText || "";
      return (
        !text.includes("Загрузка системы") &&
        !text.includes("Подготовка модулей") &&
        (document.querySelector(".workspace-shell") ||
          document.querySelector('[data-testid="schedule-toolbar"]') ||
          document.querySelector('[data-testid="schedule-mobile-agenda-view"]') ||
          document.querySelector("#root"))
      );
    },
    { timeout: 45000 },
  ).catch(() => {});

  await suppressOverlays(page);
  await sleep(1000);
}

async function saveProof(page, filename, description) {
  await suppressOverlays(page);
  await sleep(500);

  const docsPath = path.join(OUT_DOCS, filename);
  const convPath = path.join(OUT_CONV, filename);

  await page.screenshot({ path: docsPath, fullPage: false });
  copyFileSync(docsPath, convPath);

  const stats = statSync(docsPath);
  console.log(
    `  [OK] ${filename} (${(stats.size / 1024).toFixed(1)} KB) -> ${description}`,
  );
}

async function main() {
  console.log("=== Launching Playwright for Schedule & Booking 4-State Proofs ===");

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
    // ----------------------------------------------------
    // PHASE 1: Desktop Schedule Suite (1440x900)
    // ----------------------------------------------------
    console.log("\n>>> PHASE 1: Desktop Suite (1440x900)");
    const pcContext = await browser.newContext({
      viewport: { width: 1440, height: 900 },
      deviceScaleFactor: 1,
      isMobile: false,
      hasTouch: false,
    });

    const pcPage = await pcContext.newPage();
    await setupPageSession(pcContext, pcPage, "doctor");

    console.log("Navigating to Schedule: http://127.0.0.1:5173/?demo=true#schedule");
    await pcPage.goto("http://127.0.0.1:5173/?demo=true#schedule", {
      waitUntil: "commit",
      timeout: 30000,
    });

    await waitForRealUI(pcPage);

    // Switch to Schedule view if needed
    const scheduleNav = pcPage.locator('a[href="#schedule"], button:has-text("Записи")').first();
    if (await scheduleNav.isVisible().catch(() => false)) {
      await scheduleNav.click();
      await sleep(1500);
    }

    // 1. PC Light
    console.log("Capturing ☀️ PC Light (1440x900)...");
    await setTheme(pcPage, "light");
    await saveProof(pcPage, "schedule_pc_light_1440x900.png", "Desktop Schedule Grid Light Mode");

    // 2. PC Dark
    console.log("Capturing 🌙 PC Dark (1440x900)...");
    await setTheme(pcPage, "dark");
    await saveProof(pcPage, "schedule_pc_dark_1440x900.png", "Desktop Schedule Grid Dark Mode");

    // 3. Open Quick Booking Drawer on PC
    console.log("Opening Quick Booking Drawer on PC...");
    await setTheme(pcPage, "light");
    await pcPage.evaluate(() => {
      window.dispatchEvent(
        new CustomEvent("dente:open-quick-booking", {
          detail: {
            dateKey: "2026-11-05",
            startTime: "11:30",
            durationMinutes: 30,
            chairId: "chair-1",
            chairName: "Кресло 1 (Терапия)",
            patientName: "Аллергиков Иван Петрович",
            patientPhone: "+7 (999) 111-22-33",
            allergies: "Лидокаин, Новокаин",
          },
        })
      );
    });
    await sleep(1000);

    // 3.1 PC Quick Booking Drawer Light
    console.log("Capturing ☀️ Quick Booking Drawer PC Light (1440x900)...");
    await saveProof(pcPage, "schedule_quick_booking_pc_light_1440x900.png", "Quick Booking Drawer Desktop Light");

    // 3.2 PC Quick Booking Drawer Dark
    console.log("Capturing 🌙 Quick Booking Drawer PC Dark (1440x900)...");
    await setTheme(pcPage, "dark");
    await saveProof(pcPage, "schedule_quick_booking_pc_dark_1440x900.png", "Quick Booking Drawer Desktop Dark");

    await pcContext.close();

    // ----------------------------------------------------
    // PHASE 2: Mobile Apple HIG Agenda View Suite (390x844)
    // ----------------------------------------------------
    console.log("\n>>> PHASE 2: Mobile Apple HIG Agenda Suite (390x844)");
    const mobileContext = await browser.newContext({
      viewport: { width: 390, height: 844 },
      deviceScaleFactor: 2,
      isMobile: true,
      hasTouch: true,
    });

    const mobilePage = await mobileContext.newPage();
    await setupPageSession(mobileContext, mobilePage, "doctor");

    console.log("Navigating Mobile to Schedule: http://127.0.0.1:5173/?demo=true#schedule");
    await mobilePage.goto("http://127.0.0.1:5173/?demo=true#schedule", {
      waitUntil: "commit",
      timeout: 30000,
    });

    await waitForRealUI(mobilePage);

    // 5. Mobile Light
    console.log("Capturing 📱 Mobile Light (390x844)...");
    await setTheme(mobilePage, "light");
    await saveProof(mobilePage, "schedule_mobile_light_390x844.png", "Mobile Agenda View Light Mode");

    // 6. Mobile Dark
    console.log("Capturing 🌙 Mobile Dark (390x844)...");
    await setTheme(mobilePage, "dark");
    await saveProof(mobilePage, "schedule_mobile_dark_390x844.png", "Mobile Agenda View Dark Mode");

    // 7. Open Quick Booking Bottom Sheet on Mobile
    console.log("Opening Quick Booking Bottom Sheet on Mobile...");
    await setTheme(mobilePage, "light");
    await mobilePage.evaluate(() => {
      window.dispatchEvent(
        new CustomEvent("dente:open-quick-booking", {
          detail: {
            dateKey: "2026-11-05",
            startTime: "12:00",
            durationMinutes: 30,
            chairId: "chair-1",
            chairName: "Кресло 1 (Терапия)",
            patientName: "Смирнова Анна Викторовна",
            patientPhone: "+7 (925) 987-65-43",
          },
        })
      );
    });
    await sleep(1000);

    // 7.1 Mobile Bottom Sheet Light
    console.log("Capturing 📱 Mobile Bottom Sheet Light (390x844)...");
    await saveProof(mobilePage, "schedule_mobile_quick_booking_bottom_sheet_390x844.png", "Mobile Quick Booking Bottom Sheet Light Mode");

    // 7.2 Mobile Bottom Sheet Dark
    console.log("Capturing 🌙 Mobile Bottom Sheet Dark (390x844)...");
    await setTheme(mobilePage, "dark");
    await saveProof(mobilePage, "schedule_mobile_quick_booking_bottom_sheet_dark_390x844.png", "Mobile Quick Booking Bottom Sheet Dark Mode");

    await mobileContext.close();

    console.log("\n=== ALL 8 SCHEDULE & BOOKING PROOF CAPTURES COMPLETED SUCCESSFULLY ===");
  } finally {
    await browser.close();
  }
}

main().catch((err) => {
  console.error("FATAL ERROR in Schedule Capture:", err);
  process.exit(1);
});
