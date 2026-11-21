import { chromium } from "playwright";
import fs from "node:fs";
import path from "node:path";

const WEB_BASE = process.env.WEB_BASE || "http://127.0.0.1:5173";
const PROOFS_DIR = path.resolve("C:/Clinic_MVP/dental-crm/docs/proofs/schedule");

if (!fs.existsSync(PROOFS_DIR)) {
  fs.mkdirSync(PROOFS_DIR, { recursive: true });
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function main() {
  console.log("=== LAUNCHING CANONICAL 4-STATE SCHEDULE CAPTURE ===");
  const browser = await chromium.launch({
    executablePath: "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
    headless: true,
    args: ["--no-sandbox", "--disable-gpu", "--disable-dev-shm-usage"],
  });

  try {
    const context = await browser.newContext({
      viewport: { width: 1440, height: 900 },
      deviceScaleFactor: 1,
    });

    await context.addInitScript(() => {
      try {
        sessionStorage.setItem("dente_unlocked", "true");
        sessionStorage.setItem("dente:sw-controller-reload", "1");
        localStorage.setItem("dente_clinic_token", "demo-clinic-token-12345");
        localStorage.setItem("dente_staff_token", "demo-staff-token-12345");
        localStorage.setItem("dente_active_session_token", "demo-staff-token-12345");
        localStorage.setItem("dente_active_user_id", "doc-1");
        localStorage.setItem("dente_active_role", "doctor");
        localStorage.setItem("dente_active_mode", "doctor");
        localStorage.setItem("dente_user_id", "doc-1");
        localStorage.setItem("dente_user_name", "Д-р Захаров Андрей Васильевич");
        localStorage.setItem("dente_user_role", "doctor");
        localStorage.setItem("dente_role", "doctor");
        localStorage.setItem("dente_token", "demo_dev_doctor_token");
        localStorage.setItem("dente_onboarding_completed", "true");
        localStorage.setItem("dente_tour_completed", "true");
        localStorage.setItem("dente_tour_finished", "true");
        localStorage.setItem("dente_tour_dismissed", "true");
        localStorage.setItem("dente_guide_tour_dismissed_v2", "true");
        localStorage.setItem("dente_doctor_shift_active", "true");
        localStorage.setItem("dente_offline_autonomy_mode", "true");
        localStorage.setItem("dente_demo_showcase", "true");
        localStorage.setItem("dente_demo_showcase_mode", "true");
        localStorage.setItem("dente_demo_banner_dismissed", "true");
        localStorage.setItem("dente_current_view", "schedule");

        const doctorUser = {
          id: "doc-1",
          userId: "doc-1",
          name: "Д-р Захаров А. В.",
          fullName: "Д-р Захаров Андрей Васильевич",
          role: "doctor",
          specialties: ["Стоматолог-терапевт", "Хирург-имплантолог"],
        };

        localStorage.setItem("dente_staff_session", JSON.stringify(doctorUser));
        localStorage.setItem("dente_cached_active_staff_user", JSON.stringify(doctorUser));
        localStorage.setItem("dente_cached_staff_list", JSON.stringify([doctorUser]));
        localStorage.setItem(
          "dental-crm:web-ui-preferences:v1",
          JSON.stringify({
            version: 1,
            uiLanguage: "ru",
            selectedWorkspaceRole: "doctor",
            selectedSpecialty: "therapist",
            onboardingDismissed: true,
          })
        );
      } catch (e) {}
    });

    const page = await context.newPage();

    console.log("Navigating to " + WEB_BASE + "/ ...");
    await page.goto(`${WEB_BASE}/`, { waitUntil: "commit", timeout: 45000 });

    console.log("Waiting for appStore to initialize...");
    for (let i = 0; i < 60; i++) {
      const offlineBtn = page.locator('button:has-text("Перейти в автономный режим")');
      if ((await offlineBtn.count()) > 0 && (await offlineBtn.first().isVisible())) {
        console.log("Clicking offline autonomy button...");
        await offlineBtn.first().click({ force: true });
        await sleep(500);
      }

      const storeReady = await page.evaluate(() => {
        if (window.__APP_STORE__) {
          window.__APP_STORE__.getState().setCurrentView("schedule");
          window.location.hash = "schedule";
          return true;
        }
        return false;
      }).catch(() => false);

      if (storeReady) {
        console.log(`[Store Ready] at loop ${i}!`);
        break;
      }
      await sleep(1000);
    }

    // Now wait for schedule view or toolbar to mount
    console.log("Waiting for Schedule UI elements to mount...");
    for (let i = 0; i < 40; i++) {
      const scheduleReady = await page.evaluate(() => {
        const toolbar = document.querySelector('[data-testid="schedule-toolbar"], .schedule-panel, [data-testid="schedule-view"], [data-testid="schedule-grid-view"]');
        const text = document.body ? document.body.innerText : "";
        const isStillLoading = text.includes("Подготовка модулей") || text.includes("Загрузка CRM");
        return !!toolbar && !isStillLoading;
      }).catch(() => false);

      if (scheduleReady) {
        console.log(`[Schedule Ready] at loop ${i}!`);
        break;
      }
      await sleep(1000);
    }

    // Suppress banners, toasts, overlays
    await page.evaluate(() => {
      const s = document.createElement("style");
      s.id = "suppress-overlays-canonical";
      s.innerHTML = `
        .toast, .global-toast, .toast-container, [role="alert"],
        .tour-spotlight-root, .tour-backdrop-clickable-zone,
        [data-testid="guided-tour-spotlight-overlay"],
        [data-testid="guided-tour-coach-mark-card"],
        [data-testid="demo-mode-banner"],
        vite-error-overlay {
          display: none !important;
          opacity: 0 !important;
          visibility: hidden !important;
          pointer-events: none !important;
          height: 0 !important;
          width: 0 !important;
          overflow: hidden !important;
        }
      `;
      document.head.appendChild(s);
      document.querySelectorAll('.toast, .global-toast, .toast-container, [role="alert"]').forEach((el) => el.remove());
    });
    await sleep(1000);

    // =========================================================
    // 1. ☀️ Desktop Light (1440x900)
    // =========================================================
    console.log("\n--- Capturing 01_schedule_grid_pc_light_1440x900.png ---");
    await page.evaluate(() => {
      document.documentElement.setAttribute("data-theme", "light");
      document.body.setAttribute("data-theme", "light");
      document.documentElement.classList.add("light");
      document.documentElement.classList.remove("dark");
      document.body.classList.add("light");
      document.body.classList.remove("dark");
      document.documentElement.style.colorScheme = "light";
      localStorage.setItem("dente_theme_mode", "light");
      localStorage.setItem("dente_theme", "light");
      localStorage.setItem("theme", "light");
    });
    await sleep(1000);

    const pcLightPath = path.join(PROOFS_DIR, "01_schedule_grid_pc_light_1440x900.png");
    await page.screenshot({ path: pcLightPath, fullPage: false });
    fs.copyFileSync(pcLightPath, path.join(PROOFS_DIR, "schedule_pc_light_1440x900.png"));
    const pcLightStat = fs.statSync(pcLightPath);
    console.log(`[CAPTURED] 01_schedule_grid_pc_light_1440x900.png: ${(pcLightStat.size / 1024).toFixed(1)} KB`);

    // =========================================================
    // 2. 🌙 Desktop Dark (1440x900)
    // =========================================================
    console.log("\n--- Capturing 02_schedule_grid_pc_dark_1440x900.png ---");
    await page.evaluate(() => {
      document.documentElement.setAttribute("data-theme", "dark");
      document.body.setAttribute("data-theme", "dark");
      document.documentElement.classList.add("dark");
      document.documentElement.classList.remove("light");
      document.body.classList.add("dark");
      document.body.classList.remove("light");
      document.documentElement.style.colorScheme = "dark";
      localStorage.setItem("dente_theme_mode", "dark");
      localStorage.setItem("dente_theme", "dark");
      localStorage.setItem("theme", "dark");
    });
    await sleep(1000);

    const pcDarkPath = path.join(PROOFS_DIR, "02_schedule_grid_pc_dark_1440x900.png");
    await page.screenshot({ path: pcDarkPath, fullPage: false });
    fs.copyFileSync(pcDarkPath, path.join(PROOFS_DIR, "schedule_pc_dark_1440x900.png"));
    const pcDarkStat = fs.statSync(pcDarkPath);
    console.log(`[CAPTURED] 02_schedule_grid_pc_dark_1440x900.png: ${(pcDarkStat.size / 1024).toFixed(1)} KB`);

    // =========================================================
    // 3 & 4. Mobile Apple HIG (390x844)
    // =========================================================
    console.log("\n--- Resizing to Mobile (390x844) ---");
    await page.setViewportSize({ width: 390, height: 844 });
    await page.evaluate(() => window.dispatchEvent(new Event("resize")));
    await sleep(2000);

    // 3. ☀️ Mobile Light
    console.log("\n--- Capturing 03_schedule_agenda_mobile_light_390x844.png ---");
    await page.evaluate(() => {
      document.documentElement.setAttribute("data-theme", "light");
      document.body.setAttribute("data-theme", "light");
      document.documentElement.classList.add("light");
      document.documentElement.classList.remove("dark");
      document.body.classList.add("light");
      document.body.classList.remove("dark");
      document.documentElement.style.colorScheme = "light";
      localStorage.setItem("dente_theme_mode", "light");
      localStorage.setItem("dente_theme", "light");
      localStorage.setItem("theme", "light");
    });
    await sleep(1000);

    const mobileLightPath = path.join(PROOFS_DIR, "03_schedule_agenda_mobile_light_390x844.png");
    await page.screenshot({ path: mobileLightPath, fullPage: false });
    fs.copyFileSync(mobileLightPath, path.join(PROOFS_DIR, "schedule_mobile_light_390x844.png"));
    const mobileLightStat = fs.statSync(mobileLightPath);
    console.log(`[CAPTURED] 03_schedule_agenda_mobile_light_390x844.png: ${(mobileLightStat.size / 1024).toFixed(1)} KB`);

    // 4. 🌙 Mobile Dark
    console.log("\n--- Capturing 04_schedule_agenda_mobile_dark_390x844.png ---");
    await page.evaluate(() => {
      document.documentElement.setAttribute("data-theme", "dark");
      document.body.setAttribute("data-theme", "dark");
      document.documentElement.classList.add("dark");
      document.documentElement.classList.remove("light");
      document.body.classList.add("dark");
      document.body.classList.remove("light");
      document.documentElement.style.colorScheme = "dark";
      localStorage.setItem("dente_theme_mode", "dark");
      localStorage.setItem("dente_theme", "dark");
      localStorage.setItem("theme", "dark");
    });
    await sleep(1000);

    const mobileDarkPath = path.join(PROOFS_DIR, "04_schedule_agenda_mobile_dark_390x844.png");
    await page.screenshot({ path: mobileDarkPath, fullPage: false });
    fs.copyFileSync(mobileDarkPath, path.join(PROOFS_DIR, "schedule_mobile_dark_390x844.png"));
    const mobileDarkStat = fs.statSync(mobileDarkPath);
    console.log(`[CAPTURED] 04_schedule_agenda_mobile_dark_390x844.png: ${(mobileDarkStat.size / 1024).toFixed(1)} KB`);

    await context.close();
    console.log("\n=== ALL 4 SCHEDULE PROOFS CAPTURED SUCCESSFULLY! ===");
  } finally {
    await browser.close();
  }
}

main().catch((err) => {
  console.error("CAPTURE ERROR:", err);
  process.exit(1);
});
