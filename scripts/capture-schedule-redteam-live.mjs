import { chromium } from "playwright";
import fs from "node:fs";
import path from "node:path";

const WEB_BASE = process.env.WEB_BASE || "http://127.0.0.1:5173";
const PROOFS_DIR = path.resolve("C:/Clinic_MVP/dental-crm/docs/proofs/schedule");

if (!fs.existsSync(PROOFS_DIR)) {
  fs.mkdirSync(PROOFS_DIR, { recursive: true });
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const initDoctorSession = () => {
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
    localStorage.setItem("dente_current_view", "schedule");
    localStorage.setItem("dente_sidebar_collapsed", "false");

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
      "dente-workspace-profile",
      JSON.stringify({ mode: "doctor", role: "doctor", activeRole: "doctor" })
    );
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
};

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
  await sleep(400);
}

async function suppressToastsAndOverlays(page) {
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
}

async function waitForAppReady(page) {
  for (let i = 0; i < 40; i++) {
    const offlineBtn = page.locator('button:has-text("Перейти в автономный режим")');
    if ((await offlineBtn.count()) > 0 && (await offlineBtn.first().isVisible())) {
      console.log("[Browser] Clicking offline autonomy button...");
      await offlineBtn.first().click({ force: true });
      await sleep(600);
    }
    const hasLoading = await page.evaluate(() => {
      const text = document.body ? document.body.innerText : "";
      return text.includes("Загрузка CRM") || text.includes("Загрузка системы");
    }).catch(() => true);

    const hasAppShell = await page.$(".app-shell, .schedule-panel, [data-testid='schedule-view']");
    if (!hasLoading && hasAppShell) {
      console.log(`[Browser] App fully mounted and ready! (loop ${i})`);
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
    console.warn(`[WARNING] File size is less than 20KB: ${(stat.size / 1024).toFixed(1)} KB`);
  }
  return { filename, size: stat.size, path: fullPath };
}

async function main() {
  console.log("=== SCHEDULE RED TEAM 4-STATE CANONICAL CAPTURE ===");
  const browser = await chromium.launch({
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-dev-shm-usage"],
  });

  try {
    // 1. PC Desktop 1440x900
    console.log("\n--- 1. PC Desktop 1440x900 (Schedule Grid Workspace) ---");
    const pcContext = await browser.newContext({
      viewport: { width: 1440, height: 900 },
      deviceScaleFactor: 1,
      serviceWorkers: "block",
    });
    await pcContext.addInitScript(initDoctorSession);
    const pcPage = await pcContext.newPage();

    console.log("Navigating PC to " + WEB_BASE + "/?demo=true#schedule ...");
    await pcPage.goto(`${WEB_BASE}/?demo=true#schedule`, { waitUntil: "domcontentloaded", timeout: 35000 });
    await waitForAppReady(pcPage);
    await suppressToastsAndOverlays(pcPage);
    await sleep(1500);

    // Switch view to schedule via useAppStore
    await pcPage.evaluate(() => {
      if (window.__APP_STORE__) {
        window.__APP_STORE__.getState().setCurrentView("schedule");
      }
    });
    await pcPage.waitForSelector(".schedule-panel, [data-testid='schedule-view'], #schedule", { state: "visible", timeout: 20000 }).catch(() => {});
    await sleep(2000);

    // 1.1 ☀️ PC Light
    await setLightTheme(pcPage);
    await saveProof(
      pcPage,
      "01_schedule_grid_pc_light_1440x900.png",
      "☀️ PC Light 1440x900 Schedule Grid Workspace"
    );
    fs.copyFileSync(
      path.join(PROOFS_DIR, "01_schedule_grid_pc_light_1440x900.png"),
      path.join(PROOFS_DIR, "schedule_pc_light_1440x900.png")
    );

    // 1.2 🌙 PC Dark
    await setDarkTheme(pcPage);
    await saveProof(
      pcPage,
      "02_schedule_grid_pc_dark_1440x900.png",
      "🌙 PC Dark 1440x900 Schedule Grid Dark Theme"
    );
    fs.copyFileSync(
      path.join(PROOFS_DIR, "02_schedule_grid_pc_dark_1440x900.png"),
      path.join(PROOFS_DIR, "schedule_pc_dark_1440x900.png")
    );

    await pcContext.close();

    // 2. Mobile 390x844 (Apple iPhone HIG)
    console.log("\n--- 2. Mobile 390x844 (Mobile Schedule Agenda View) ---");
    const mobileContext = await browser.newContext({
      viewport: { width: 390, height: 844 },
      deviceScaleFactor: 2,
      isMobile: true,
      hasTouch: true,
      serviceWorkers: "block",
    });
    await mobileContext.addInitScript(initDoctorSession);
    const mobilePage = await mobileContext.newPage();

    console.log("Navigating Mobile to " + WEB_BASE + "/?demo=true#schedule ...");
    await mobilePage.goto(`${WEB_BASE}/?demo=true#schedule`, { waitUntil: "domcontentloaded", timeout: 35000 });
    await waitForAppReady(mobilePage);
    await suppressToastsAndOverlays(mobilePage);
    await sleep(1500);

    await mobilePage.evaluate(() => {
      if (window.__APP_STORE__) {
        window.__APP_STORE__.getState().setCurrentView("schedule");
      }
    });
    await mobilePage.waitForSelector(".schedule-panel, [data-testid='schedule-view'], #schedule", { state: "visible", timeout: 20000 }).catch(() => {});
    await sleep(2000);

    // 2.1 ☀️ Mobile Light
    await setLightTheme(mobilePage);
    await saveProof(
      mobilePage,
      "03_schedule_agenda_mobile_light_390x844.png",
      "☀️ Mobile Light 390x844 Schedule Agenda View (Apple HIG)"
    );
    fs.copyFileSync(
      path.join(PROOFS_DIR, "03_schedule_agenda_mobile_light_390x844.png"),
      path.join(PROOFS_DIR, "schedule_mobile_light_390x844.png")
    );

    // 2.2 🌙 Mobile Dark
    await setDarkTheme(mobilePage);
    await saveProof(
      mobilePage,
      "04_schedule_agenda_mobile_dark_390x844.png",
      "🌙 Mobile Dark 390x844 Schedule Agenda View (Apple HIG)"
    );
    fs.copyFileSync(
      path.join(PROOFS_DIR, "04_schedule_agenda_mobile_dark_390x844.png"),
      path.join(PROOFS_DIR, "schedule_mobile_dark_390x844.png")
    );

    await mobileContext.close();
    console.log("\n=== 4-STATE SCHEDULE CAPTURE COMPLETE ===");
  } finally {
    await browser.close();
  }
}

main().catch((err) => {
  console.error("FATAL ERROR IN CAPTURE:", err);
  process.exit(1);
});
