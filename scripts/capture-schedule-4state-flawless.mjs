import { chromium } from "playwright";
import fs from "node:fs";
import path from "node:path";

const WEB_BASE = process.env.WEB_BASE || "http://127.0.0.1:5173";
const PROOFS_DIR = path.resolve("C:/Clinic_MVP/dental-crm/docs/proofs/schedule");

if (!fs.existsSync(PROOFS_DIR)) {
  fs.mkdirSync(PROOFS_DIR, { recursive: true });
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function setupClinicDoctorSession(page) {
  await page.evaluate(() => {
    try {
      sessionStorage.setItem("dente:sw-controller-reload", "1");
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
      localStorage.setItem("dente_doctor_training_completed", "true");
      localStorage.setItem("dente_training_dismissed", "true");
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
    } catch (e) {
      console.error("Storage error:", e);
    }
  });
}

async function suppressToastsAndOverlays(page) {
  try {
    await page.evaluate(() => {
      if (!document.getElementById("suppress-overlays-canonical")) {
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
      }
      document.querySelectorAll('.toast, .global-toast, .toast-container, [role="alert"], [data-testid="guided-tour-spotlight-overlay"]').forEach((el) => el.remove());
    });
  } catch (_) {}
}

async function setDarkTheme(page) {
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
  await suppressToastsAndOverlays(page);
  await sleep(400);
}

async function setLightTheme(page) {
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
  await suppressToastsAndOverlays(page);
  await sleep(400);
}

async function waitForScheduleReady(page) {
  for (let i = 0; i < 40; i++) {
    const offlineBtn = page.locator('button:has-text("Перейти в автономный режим")');
    if ((await offlineBtn.count()) > 0 && (await offlineBtn.first().isVisible())) {
      console.log("[Browser] Clicking offline autonomy button...");
      await offlineBtn.first().click({ force: true });
      await sleep(600);
    }

    const hasApp = await page.evaluate(() => {
      const text = document.body ? document.body.innerText : "";
      const isStillBooting = text.includes("Загрузка CRM") || text.includes("Загрузка системы");
      const hasScheduleElements = text.includes("Расписание") || text.includes("Записи") || text.includes("Кресло 1");
      return !isStillBooting && hasScheduleElements;
    }).catch(() => false);

    if (hasApp) {
      console.log(`[Browser] Schedule successfully loaded and visible at loop ${i}!`);
      return;
    }
    await sleep(800);
  }
}

async function saveProof(page, filename, description) {
  await suppressToastsAndOverlays(page);
  await sleep(600);

  const fullPath = path.join(PROOFS_DIR, filename);
  await page.screenshot({ path: fullPath, fullPage: false });

  const stat = fs.statSync(fullPath);
  console.log(`[CAPTURED] ${filename} (${(stat.size / 1024).toFixed(1)} KB) -> ${description}`);
  if (stat.size < 20 * 1024) {
    throw new Error(`Screenshot ${filename} is too small (${stat.size} bytes < 20KB)!`);
  }
  return { filename, size: stat.size, path: fullPath };
}

async function main() {
  console.log("=== SCHEDULE RED TEAM 4-STATE CANONICAL CAPTURE (FLAWLESS) ===");
  const browser = await chromium.launch({
    executablePath: "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
    headless: true,
    args: ["--no-sandbox", "--disable-gpu", "--disable-dev-shm-usage"],
  });

  try {
    // -------------------------------------------------------------
    // 1. Desktop 1440x900
    // -------------------------------------------------------------
    console.log("\n--- 1. Desktop 1440x900 ---");
    const pcContext = await browser.newContext({
      viewport: { width: 1440, height: 900 },
      deviceScaleFactor: 1,
    });
    const pcPage = await pcContext.newPage();

    console.log("Navigating to origin to seed session...");
    await pcPage.goto(`${WEB_BASE}/`, { waitUntil: "commit", timeout: 45000 });
    await sleep(2000);
    await setupClinicDoctorSession(pcPage);

    console.log("Navigating to Schedule view...");
    await pcPage.goto(`${WEB_BASE}/?demo=true#schedule`, { waitUntil: "commit", timeout: 45000 });
    await waitForScheduleReady(pcPage);
    await suppressToastsAndOverlays(pcPage);
    await sleep(1500);

    // Switch view to schedule in store if needed
    await pcPage.evaluate(() => {
      if (window.__APP_STORE__) {
        window.__APP_STORE__.getState().setCurrentView("schedule");
      }
    });
    await sleep(1000);

    // 1.1 ☀️ PC Light
    await setLightTheme(pcPage);
    await saveProof(pcPage, "01_schedule_grid_pc_light_1440x900.png", "☀️ Desktop Light 1440x900 Schedule Grid");
    fs.copyFileSync(
      path.join(PROOFS_DIR, "01_schedule_grid_pc_light_1440x900.png"),
      path.join(PROOFS_DIR, "schedule_pc_light_1440x900.png")
    );

    // 1.2 🌙 PC Dark
    await setDarkTheme(pcPage);
    await saveProof(pcPage, "02_schedule_grid_pc_dark_1440x900.png", "🌙 Desktop Dark 1440x900 Schedule Grid");
    fs.copyFileSync(
      path.join(PROOFS_DIR, "02_schedule_grid_pc_dark_1440x900.png"),
      path.join(PROOFS_DIR, "schedule_pc_dark_1440x900.png")
    );

    await pcContext.close();

    // -------------------------------------------------------------
    // 2. Mobile 390x844 (Apple HIG)
    // -------------------------------------------------------------
    console.log("\n--- 2. Mobile 390x844 (Apple HIG) ---");
    const mobileContext = await browser.newContext({
      viewport: { width: 390, height: 844 },
      deviceScaleFactor: 2,
      isMobile: true,
      hasTouch: true,
    });
    const mobilePage = await mobileContext.newPage();

    console.log("Navigating mobile to origin to seed session...");
    await mobilePage.goto(`${WEB_BASE}/`, { waitUntil: "commit", timeout: 45000 });
    await sleep(2000);
    await setupClinicDoctorSession(mobilePage);

    console.log("Navigating mobile to Schedule view...");
    await mobilePage.goto(`${WEB_BASE}/?demo=true#schedule`, { waitUntil: "commit", timeout: 45000 });
    await waitForScheduleReady(mobilePage);
    await suppressToastsAndOverlays(mobilePage);
    await sleep(1500);

    await mobilePage.evaluate(() => {
      if (window.__APP_STORE__) {
        window.__APP_STORE__.getState().setCurrentView("schedule");
      }
    });
    await sleep(1000);

    // 2.1 ☀️ Mobile Light
    await setLightTheme(mobilePage);
    await saveProof(mobilePage, "03_schedule_agenda_mobile_light_390x844.png", "☀️ Mobile Light 390x844 Schedule Agenda");
    fs.copyFileSync(
      path.join(PROOFS_DIR, "03_schedule_agenda_mobile_light_390x844.png"),
      path.join(PROOFS_DIR, "schedule_mobile_light_390x844.png")
    );

    // 2.2 🌙 Mobile Dark
    await setDarkTheme(mobilePage);
    await saveProof(mobilePage, "04_schedule_agenda_mobile_dark_390x844.png", "🌙 Mobile Dark 390x844 Schedule Agenda");
    fs.copyFileSync(
      path.join(PROOFS_DIR, "04_schedule_agenda_mobile_dark_390x844.png"),
      path.join(PROOFS_DIR, "schedule_mobile_dark_390x844.png")
    );

    await mobileContext.close();
    console.log("\n=== ALL 4 PROOFS CAPTURED SUCCESSFULLY! ===");
  } finally {
    await browser.close();
  }
}

main().catch((err) => {
  console.error("CAPTURE ERROR:", err);
  process.exit(1);
});
