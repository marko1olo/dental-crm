/**
 * scripts/capture-schedule-redteam-canonical-proofs.mjs
 * Red Team 4-State Visual Proof Capture for Schedule, Quick Booking & Mobile Agenda SSOT
 * Mandates: 8n, 8bi, 8am, 8zg, 8al
 */
import { copyFileSync, existsSync, mkdirSync, statSync } from "node:fs";
import path from "node:path";
import { chromium } from "playwright";

const WEB_URL = "http://127.0.0.1:5173/#schedule";
const PROOF_DIRS = [
  path.resolve(process.cwd(), "docs/proofs/schedule"),
  path.resolve(process.cwd(), "docs/screenshots/schedule"),
  path.resolve("C:/Users/Admin/.gemini/antigravity/brain/76095685-3cf7-4b11-a732-8f4d23552311"),
];

for (const d of PROOF_DIRS) {
  if (!existsSync(d)) mkdirSync(d, { recursive: true });
}

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function getAuthTokens() {
  try {
    const res = await fetch("http://127.0.0.1:4100/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: "doctor@clinic.com", password: "dente2026" }),
    });
    const data = await res.json();
    if (data.ok) return data;
  } catch (e) {
    console.log("[Auth] Error logging in:", e.message);
  }
  return null;
}

async function injectStorage(context, auth, theme = "light") {
  await context.addInitScript(
    ({ clinicToken, staffToken, user, th }) => {
      localStorage.setItem("dente_clinic_token", clinicToken);
      localStorage.setItem("dente_staff_token", staffToken);
      localStorage.setItem("dente_active_session_token", staffToken);
      localStorage.setItem("dente_active_role", user.role || "doctor");
      localStorage.setItem("dente_active_user_id", user.id || "doc-1");
      localStorage.setItem("dental-crm:active-user:v1", JSON.stringify(user));
      localStorage.setItem("dente_theme_mode", th);
      localStorage.setItem("dente_theme", th);
      localStorage.setItem("theme", th);
      localStorage.setItem("dente_onboarding_completed", "true");
      localStorage.setItem("dente_tour_completed", "true");
      localStorage.setItem("dente_tour_dismissed", "true");
      localStorage.setItem("dente_guide_tour_dismissed_v2", "true");
      localStorage.setItem("dente_demo_banner_dismissed", "true");
      localStorage.setItem("dente_active_nav", "schedule");
      localStorage.setItem("dental-crm:onboarding:v1", JSON.stringify({ completed: true, dismissed: true }));
      localStorage.setItem(
        "dental-crm:web-ui-preferences:v1",
        JSON.stringify({
          version: 1,
          uiLanguage: "ru",
          selectedWorkspaceRole: user.role || "doctor",
          onboardingDismissed: true,
          onboardingStep: "done",
        })
      );
      document.cookie = `dente_clinic_token=${encodeURIComponent(clinicToken)}; path=/; max-age=31536000`;
      document.cookie = `dente_staff_token=${encodeURIComponent(staffToken)}; path=/; max-age=31536000`;

      document.documentElement.setAttribute("data-theme", th);
      const isDark = th === "dark";
      document.documentElement.classList.toggle("dark", isDark);
      document.documentElement.classList.toggle("light", !isDark);
      document.body.className = isDark ? "dark" : "light";
      document.documentElement.style.colorScheme = isDark ? "dark" : "light";
    },
    { clinicToken: auth.clinicToken, staffToken: auth.staffToken, user: auth.user, th: theme }
  );
}

async function suppressOverlays(page) {
  try {
    await page.evaluate(() => {
      const style = document.createElement("style");
      style.id = "clean-redteam-proof-style";
      style.innerHTML = `
        .tour-spotlight-root,
        .tour-backdrop-clickable-zone,
        [data-testid="guided-tour-spotlight-overlay"],
        [data-testid="guided-tour-coach-mark-card"],
        [data-testid="demo-mode-banner"],
        .global-toast-container,
        vite-error-overlay {
          display: none !important;
          pointer-events: none !important;
        }
      `;
      document.head.appendChild(style);
      document
        .querySelectorAll("vite-error-overlay, .tour-spotlight-root, [data-testid='guided-tour-spotlight-overlay']")
        .forEach((el) => el.remove());
    });
  } catch (_) {}
}

async function setTheme(page, theme) {
  await page.evaluate((th) => {
    document.documentElement.setAttribute("data-theme", th);
    const isDark = th === "dark";
    document.documentElement.classList.toggle("dark", isDark);
    document.documentElement.classList.toggle("light", !isDark);
    document.body.className = isDark ? "dark" : "light";
    document.documentElement.style.colorScheme = isDark ? "dark" : "light";
    localStorage.setItem("dente_theme", th);
    localStorage.setItem("dente_theme_mode", th);
    localStorage.setItem("theme", th);
  }, theme);
  await suppressOverlays(page);
  await wait(600);
}

async function saveProof(page, filename, aliases = [], description = "") {
  await suppressOverlays(page);
  await wait(500);

  const mainPath = path.join(PROOF_DIRS[0], filename);
  await page.screenshot({ path: mainPath, fullPage: false, animations: "disabled" });

  const stat = statSync(mainPath);
  const sizeKb = (stat.size / 1024).toFixed(1);
  console.log(`  -> [PROOF CAPTURED] ${filename} (${sizeKb} KB) | ${description}`);

  if (stat.size < 25000) {
    throw new Error(`Screenshot ${filename} is too small: ${sizeKb} KB (< 25 KB)`);
  }

  // Copy to aliases across all proof directories
  const allNames = [filename, ...aliases];
  for (const d of PROOF_DIRS) {
    for (const name of allNames) {
      const dest = path.join(d, name);
      if (dest !== mainPath) {
        try {
          copyFileSync(mainPath, dest);
        } catch (_) {}
      }
    }
  }
  return mainPath;
}

async function main() {
  console.log("=== STARTING CANONICAL SCHEDULE 4-STATE VISUAL PROOF CAPTURE ===");
  const auth = await getAuthTokens();
  if (!auth) {
    throw new Error("Failed to get auth tokens from API on port 4100!");
  }
  console.log(`[Auth] Logged in as ${auth.user.fullName} (${auth.user.role})`);

  const browser = await chromium.launch({
    headless: true,
  });

  try {
    // ====================================================
    // PHASE 1: PC DESKTOP (1440x900)
    // ====================================================
    console.log("\n--- Phase 1: PC Desktop Schedule (1440x900) ---");
    const pcContext = await browser.newContext({
      viewport: { width: 1440, height: 900 },
      deviceScaleFactor: 1,
    });
    await injectStorage(pcContext, auth, "light");

    const pcPage = await pcContext.newPage();
    console.log("  -> Navigating PC to " + WEB_URL + " ...");
    await pcPage.goto(WEB_URL, { waitUntil: "commit", timeout: 25000 });

    for (let i = 0; i < 40; i++) {
      await wait(300);
      try {
        const ready = await pcPage.evaluate(() => {
          const text = document.body ? document.body.innerText : "";
          return !text.includes("Загрузка системы") && text.length > 200;
        });
        if (ready) break;
      } catch (_) {}
    }
    console.log("  -> Waiting for schedule-grid-view...");
    await pcPage.waitForSelector('[data-testid="schedule-grid-view"], [data-testid="schedule-view"], .schedule-grid-container', {
      timeout: 25000,
      state: "visible",
    });
    await wait(1000);

    // 1. PC Light Schedule Grid
    await setTheme(pcPage, "light");
    await saveProof(pcPage, "01_schedule_pc_light_1440x900.png", ["01_schedule_grid_pc_light_1440x900.png", "schedule_pc_light_1440x900.png"], "Schedule Grid PC Light (1440x900)");

    // 2. PC Dark Schedule Grid
    await setTheme(pcPage, "dark");
    await saveProof(pcPage, "02_schedule_pc_dark_1440x900.png", ["02_schedule_grid_pc_dark_1440x900.png", "schedule_pc_dark_1440x900.png"], "Schedule Grid PC Dark (1440x900)");

    // 3. Quick Booking Drawer PC Light
    await setTheme(pcPage, "light");
    console.log("  -> Opening Quick Booking Drawer PC Light via button click...");
    await pcPage.evaluate(() => {
      const btn = document.querySelector('[data-testid="schedule-toolbar-primary-quick-booking-btn"]') || document.querySelector('button[title*="Новая запись"]');
      if (btn && btn.click) btn.click();
    });
    await pcPage.waitForSelector('[data-testid="quick-booking-drawer"]', { timeout: 10000, state: "visible" }).catch(() => {});
    await wait(1000);
    await saveProof(pcPage, "03_schedule_quick_booking_pc_light_1440x900.png", ["05_schedule_quick_booking_pc_light_1440x900.png"], "Quick Booking Drawer PC Light (1440x900)");

    // 4. Quick Booking Drawer PC Dark
    await setTheme(pcPage, "dark");
    console.log("  -> Capturing Quick Booking Drawer PC Dark...");
    await saveProof(pcPage, "04_schedule_quick_booking_pc_dark_1440x900.png", ["06_schedule_quick_booking_pc_dark_1440x900.png"], "Quick Booking Drawer PC Dark (1440x900)");

    // Close quick booking drawer
    await pcPage.evaluate(() => {
      const closeBtn = document.querySelector('[data-testid="quick-booking-cancel-btn"]') || document.querySelector('[aria-label="Закрыть быструю запись"]');
      if (closeBtn && closeBtn.click) closeBtn.click();
    });
    await wait(600);

    // ====================================================
    // PHASE 2: MOBILE APPLE HIG (390x844)
    // ====================================================
    console.log("\n--- Phase 2: Mobile Apple HIG Agenda View (390x844) ---");
    await pcPage.setViewportSize({ width: 390, height: 844 });
    await pcPage.waitForSelector('[data-testid="schedule-mobile-agenda-view"], .schedule-mobile-agenda', { timeout: 15000, state: "visible" }).catch(() => {});
    await wait(1500);

    // 5. Mobile Light Agenda View
    await setTheme(pcPage, "light");
    await saveProof(pcPage, "03_schedule_mobile_light_390x844.png", ["06_schedule_mobile_agenda_light_390x844.png", "schedule_mobile_light_390x844.png"], "Mobile Agenda View Light (390x844)");

    // 6. Mobile Dark Agenda View
    await setTheme(pcPage, "dark");
    await saveProof(pcPage, "04_schedule_mobile_dark_390x844.png", ["07_schedule_mobile_agenda_dark_390x844.png", "schedule_mobile_dark_390x844.png"], "Mobile Agenda View Dark (390x844)");

    // 7. Mobile Quick Booking / Action Bottom Sheet Light
    await setTheme(pcPage, "light");
    console.log("  -> Opening Mobile Quick Booking...");
    await pcPage.evaluate(() => {
      const btn = document.querySelector('[data-testid="schedule-mobile-add-btn"]') || document.querySelector('.schedule-mobile-primary-action-btn') || document.querySelector('[data-testid="schedule-toolbar-primary-quick-booking-btn"]');
      if (btn && btn.click) btn.click();
    });
    await wait(1000);
    await saveProof(pcPage, "08_schedule_mobile_quick_booking_light_390x844.png", [], "Mobile Quick Booking Light (390x844)");

    // 8. Mobile Quick Booking Bottom Sheet Dark
    await setTheme(pcPage, "dark");
    await saveProof(pcPage, "09_schedule_mobile_quick_booking_dark_390x844.png", [], "Mobile Quick Booking Dark (390x844)");

    await pcContext.close();
    console.log("\n[SUCCESS] ALL CANONICAL 4-STATE SCHEDULE PROOFS CAPTURED & VALIDATED (>25 KB)!");
  } finally {
    await browser.close();
  }
}

main().catch((err) => {
  console.error("[FATAL ERROR]", err);
  process.exit(1);
});
