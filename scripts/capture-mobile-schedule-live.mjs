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
  console.log("=== CAPTURING MOBILE SCHEDULE AGENDA LIVE (390x844) ===");
  const browser = await chromium.launch({
    executablePath: "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
    headless: true,
    args: ["--no-sandbox", "--disable-gpu", "--disable-dev-shm-usage"],
  });

  try {
    const context = await browser.newContext({
      viewport: { width: 390, height: 844 },
      deviceScaleFactor: 2,
      isMobile: true,
      hasTouch: true,
    });

    await context.addInitScript(() => {
      try {
        sessionStorage.setItem("dente_unlocked", "true");
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

    page.on("console", (msg) => {
      const txt = msg.text();
      if (txt.includes("vite") || msg.type() === "error") {
        console.log(`[BROWSER ${msg.type()}]:`, txt);
      }
    });

    console.log("Navigating mobile page to " + WEB_BASE + "/?demo=true#schedule ...");
    await page.goto(`${WEB_BASE}/?demo=true#schedule`, { waitUntil: "commit", timeout: 45000 });

    // Wait for the app to load and autonomy / schedule element to appear
    console.log("Waiting for schedule content to mount...");
    for (let i = 0; i < 60; i++) {
      const offlineBtn = page.locator('button:has-text("Перейти в автономный режим")');
      if ((await offlineBtn.count()) > 0 && (await offlineBtn.first().isVisible())) {
        console.log("[Browser] Clicking offline autonomy button...");
        await offlineBtn.first().click({ force: true });
        await sleep(600);
      }

      const mounted = await page.evaluate(() => {
        const text = document.body ? document.body.innerText : "";
        const isStillBooting = text.includes("Загрузка CRM") || text.includes("Загрузка системы");
        const hasMobileSchedule = !!document.querySelector(
          "[data-testid='schedule-mobile-agenda-view'], .schedule-mobile-agenda, .schedule-panel, [data-testid='schedule-view']"
        );
        return !isStillBooting && (hasMobileSchedule || text.includes("Расписание") || text.includes("Записи"));
      }).catch(() => false);

      if (mounted) {
        console.log(`[Browser] Mobile Schedule ready at loop ${i}!`);
        break;
      }
      await sleep(1000);
    }

    // Switch view to schedule in store explicitly
    await page.evaluate(() => {
      if (window.__APP_STORE__) {
        window.__APP_STORE__.getState().setCurrentView("schedule");
      }
    });
    await sleep(2000);

    // Suppress transient banners/toasts
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

    // 1. Mobile Light (390x844)
    console.log("Setting light theme on mobile...");
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
    await sleep(800);

    const lightPath = path.join(PROOFS_DIR, "03_schedule_agenda_mobile_light_390x844.png");
    await page.screenshot({ path: lightPath, fullPage: false });
    fs.copyFileSync(lightPath, path.join(PROOFS_DIR, "schedule_mobile_light_390x844.png"));
    const lightStat = fs.statSync(lightPath);
    console.log(`[CAPTURED] 03_schedule_agenda_mobile_light_390x844.png (${(lightStat.size / 1024).toFixed(1)} KB)`);

    // 2. Mobile Dark (390x844)
    console.log("Setting dark theme on mobile...");
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
    await sleep(800);

    const darkPath = path.join(PROOFS_DIR, "04_schedule_agenda_mobile_dark_390x844.png");
    await page.screenshot({ path: darkPath, fullPage: false });
    fs.copyFileSync(darkPath, path.join(PROOFS_DIR, "schedule_mobile_dark_390x844.png"));
    const darkStat = fs.statSync(darkPath);
    console.log(`[CAPTURED] 04_schedule_agenda_mobile_dark_390x844.png (${(darkStat.size / 1024).toFixed(1)} KB)`);

    await context.close();
    console.log("=== MOBILE PROOFS CAPTURED SUCCESSFULLY ===");
  } finally {
    await browser.close();
  }
}

main().catch((err) => {
  console.error("MOBILE CAPTURE FAILED:", err);
  process.exit(1);
});
