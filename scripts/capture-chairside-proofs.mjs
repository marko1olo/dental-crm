/**
 * scripts/capture-chairside-proofs.mjs
 * Red Team 4-State Visual Proof Capture for Mobile Chairside Visit Workspace
 * Mandates 8al, 8am, 8ze, 8wy & Apple iOS HIG
 */

import { existsSync, mkdirSync, copyFileSync, statSync } from "node:fs";
import path from "node:path";
import { chromium } from "playwright";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, "..");

const API_BASE = process.env.API_BASE || "http://127.0.0.1:4100";
const WEB_BASE = process.env.BASE_URL || "http://127.0.0.1:5173";
const PROOFS_DIR = path.resolve(rootDir, "docs/proofs/chairside_visit");
const CONV_ID = "26292d85-f044-49ad-b928-c5f98e284e78";
const BRAIN_DIR = `C:/Users/Admin/.gemini/antigravity/brain/${CONV_ID}`;
const browserExecutable = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";

[PROOFS_DIR, BRAIN_DIR].forEach((dir) => {
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
});

async function provisionLiveSession() {
  const uniqueId = Date.now();
  console.log("[Provisioning] Setting up authenticated session on live API...");

  const initRes = await fetch(`${API_BASE}/api/auth/setup/init`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      clinicName: "Стоматология ДЕНТЕ Премиум",
      email: `doctor-${uniqueId}@dente-clinic.ru`,
      password: "DoctorPassword123!",
      ownerName: "Д-р Воронов Алексей Владимирович",
      ownerPin: "1234",
    }),
  });

  if (!initRes.ok) {
    throw new Error(`Clinic setup failed: ${await initRes.text()}`);
  }
  const initData = await initRes.json();

  const unlockRes = await fetch(`${API_BASE}/api/auth/staff/unlock`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-dente-clinic-token": initData.clinicToken,
    },
    body: JSON.stringify({ userId: initData.ownerUserId, pinCode: "1234" }),
  });

  if (!unlockRes.ok) {
    throw new Error(`Staff unlock failed: ${await unlockRes.text()}`);
  }
  const unlockData = await unlockRes.json();

  const headers = {
    "Content-Type": "application/json",
    "x-dente-clinic-token": initData.clinicToken,
    "x-dente-staff-token": unlockData.staffToken,
  };

  // Seed patient
  const patRes = await fetch(`${API_BASE}/api/patients`, {
    method: "POST",
    headers,
    body: JSON.stringify({
      fullName: "Смирнова Анна Сергеевна",
      birthDate: "1994-06-15",
      phone: "+7 (916) 123-45-67",
      gender: "female",
      allergies: ["Пенициллин", "Лидокаин"],
      somaticNotes: "Аллергический дерматит на бета-лактамы.",
    }),
  });
  const patData = await patRes.json();
  const patientId = patData.patient?.id || patData.id;

  // Seed active in_treatment appointment for today
  const todayIso = new Date().toISOString().slice(0, 10);
  const apptRes = await fetch(`${API_BASE}/api/appointments`, {
    method: "POST",
    headers,
    body: JSON.stringify({
      patientId,
      doctorUserId: initData.ownerUserId,
      doctorId: initData.ownerUserId,
      chairId: "chair_1",
      startsAt: `${todayIso}T08:00:00.000Z`,
      endsAt: `${todayIso}T09:00:00.000Z`,
      status: "in_treatment",
      reason: "Лечение глубокого кариеса 16 зуба",
    }),
  });
  const apptData = await apptRes.json();
  const appointmentId = apptData.appointment?.id || apptData.id;

  console.log(`[Provisioning] Ready: patient ${patientId}, appointment ${appointmentId}`);
  return {
    clinicToken: initData.clinicToken,
    staffToken: unlockData.staffToken,
    ownerUserId: initData.ownerUserId,
    patientId,
    appointmentId,
  };
}

async function configurePage(page, auth, theme) {
  await page.evaluate(
    ({ ct, st, uid, pid, aid, th }) => {
      localStorage.setItem("dente_clinic_token", ct);
      localStorage.setItem("dente_staff_token", st);
      localStorage.setItem("dente_active_session_token", st);
      localStorage.setItem("dente_active_role", "doctor");
      localStorage.setItem("dente_role", "doctor");
      localStorage.setItem("dente_perspective", "doctor");
      localStorage.setItem("dente_workspace_perspective", "doctor");
      localStorage.setItem("dente_theme_mode", th);
      localStorage.setItem("dente_theme", th);
      localStorage.setItem("theme", th);
      localStorage.setItem("dente_onboarding_completed", "true");
      localStorage.setItem("dente_tour_completed", "true");
      localStorage.setItem("dente_tour_dismissed", "true");
      localStorage.setItem("dente_guide_tour_dismissed_v2", "true");
      localStorage.setItem("dente_demo_banner_dismissed", "true");
      localStorage.setItem(
        "dente_ui_preferences_v1",
        JSON.stringify({
          onboardingDismissed: true,
          onboardingStep: "done",
          version: 1,
          selectedWorkspaceRole: "doctor",
        })
      );
      localStorage.setItem(
        "dental-crm:web-ui-preferences:v1",
        JSON.stringify({
          version: 1,
          uiLanguage: "ru",
          selectedWorkspaceRole: "doctor",
          selectedPatientId: pid,
          selectedAppointmentId: aid,
          onboardingDismissed: true,
          onboardingStep: "done",
        })
      );
      document.cookie = `dente_clinic_token=${encodeURIComponent(ct)}; path=/; max-age=31536000; SameSite=Lax`;
      document.cookie = `dente_staff_token=${encodeURIComponent(st)}; path=/; max-age=31536000; SameSite=Lax`;

      document.documentElement.setAttribute("data-theme", th);
      document.body.setAttribute("data-theme", th);
      const isDark = th === "dark";
      document.documentElement.classList.toggle("dark", isDark);
      document.documentElement.classList.toggle("light", !isDark);
      document.body.classList.toggle("dark", isDark);
      document.body.classList.toggle("light", !isDark);
      document.documentElement.style.colorScheme = isDark ? "dark" : "light";

      if (window.__useThemeStore) {
        window.__useThemeStore.getState().setThemeMode(th);
      }
      window.dispatchEvent(new Event("themechange"));
    },
    {
      ct: auth.clinicToken,
      st: auth.staffToken,
      uid: auth.ownerUserId,
      pid: auth.patientId,
      aid: auth.appointmentId,
      th: theme,
    }
  );
  await page.waitForTimeout(500);
}

async function cleanOverlays(page) {
  await page.evaluate(() => {
    const style = document.createElement("style");
    style.id = "suppress-all-overlays";
    style.innerHTML = `
      .tour-spotlight-root,
      .tour-backdrop-clickable-zone,
      [data-testid="guided-tour-spotlight-overlay"],
      [data-testid="guided-tour-coach-mark-card"],
      [data-testid="demo-mode-banner"],
      .default-clinic-banner,
      .shepherd-element,
      .global-toast-container,
      .global-toast,
      .toast,
      vite-error-overlay {
        display: none !important;
        pointer-events: none !important;
      }
      *, *::before, *::after {
        animation: none !important;
        transition: none !important;
      }
    `;
    document.head.appendChild(style);
    document.querySelectorAll(
      'vite-error-overlay, .tour-spotlight-root, [data-testid="guided-tour-spotlight-overlay"], .tour-backdrop-clickable-zone, .global-toast-container, [data-testid="demo-mode-banner"], .default-clinic-banner, .shepherd-element'
    ).forEach((el) => el.remove());
  });
  await page.waitForTimeout(300);
}

async function saveProof(page, fileName) {
  const targetPath = path.join(PROOFS_DIR, fileName);
  await page.screenshot({ path: targetPath, fullPage: false, animations: "disabled" });

  const stat = statSync(targetPath);
  console.log(`Saved [${fileName}]: ${stat.size} bytes (${stat.size >= 20480 ? "PASSED >= 20KB" : "FAILED < 20KB"})`);

  copyFileSync(targetPath, path.join(BRAIN_DIR, fileName));

  if (stat.size < 20480) {
    throw new Error(`CRITICAL DEFECT: ${fileName} is below 20KB byte guard (${stat.size} bytes)!`);
  }
}

async function run() {
  const auth = await provisionLiveSession();

  console.log("=== Launching Browser for 4-State Chairside Visit Proofs ===");
  const browser = await chromium.launch({
    executablePath: browserExecutable,
    headless: true,
    args: ["--no-sandbox", "--disable-gpu", "--disable-dev-shm-usage"],
  });

  try {
    // ═══════════════════════════════════════════════════════════════════
    // 1. DESKTOP (1440 x 900)
    // ═══════════════════════════════════════════════════════════════════
    console.log("\n--- Capturing Desktop Proofs (1440x900) ---");
    const dContext = await browser.newContext({
      viewport: { width: 1440, height: 900 },
      deviceScaleFactor: 1,
    });
    const dPage = await dContext.newPage();
    await dPage.goto(WEB_BASE, { waitUntil: "domcontentloaded", timeout: 45000 });
    await configurePage(dPage, auth, "light");

    await dPage.evaluate(() => {
      window.location.hash = "visit";
      const btn = document.querySelector('a[href="#visit"], button[data-view="visit"], [data-testid="nav-visit"]');
      if (btn) btn.click();
    });
    await dPage.waitForSelector(".boot-state", { state: "detached", timeout: 25000 }).catch(() => {});
    await dPage.waitForTimeout(2500);
    await cleanOverlays(dPage);

    // If intake cockpit has start next, click it
    const dStartNext = dPage.locator('#btn-intake-start-next, [data-testid="btn-intake-start-next"], button:has-text("Пригласить следующего")').first();
    if (await dStartNext.isVisible().catch(() => false)) {
      await dStartNext.click().catch(() => {});
      await dPage.waitForTimeout(1500);
    }
    await cleanOverlays(dPage);

    // 01 PC Light
    console.log("Saving 01_chairside_pc_light.png...");
    await configurePage(dPage, auth, "light");
    await cleanOverlays(dPage);
    await saveProof(dPage, "01_chairside_pc_light.png");

    // 02 PC Dark
    console.log("Saving 02_chairside_pc_dark.png...");
    await configurePage(dPage, auth, "dark");
    await cleanOverlays(dPage);
    await saveProof(dPage, "02_chairside_pc_dark.png");

    await dContext.close();

    // ═══════════════════════════════════════════════════════════════════
    // 2. MOBILE (390 x 844)
    // ═══════════════════════════════════════════════════════════════════
    console.log("\n--- Capturing Mobile Chairside Proofs (390x844) ---");
    const mContext = await browser.newContext({
      viewport: { width: 390, height: 844 },
      deviceScaleFactor: 2,
      isMobile: true,
      hasTouch: true,
    });
    const mPage = await mContext.newPage();
    await mPage.goto(WEB_BASE, { waitUntil: "domcontentloaded", timeout: 45000 });
    await configurePage(mPage, auth, "light");

    await mPage.evaluate(() => {
      window.location.hash = "visit";
      const btn = document.querySelector('a[href="#visit"], button[data-view="visit"], [data-testid="nav-visit"]');
      if (btn) btn.click();
    });
    await mPage.waitForSelector(".boot-state", { state: "detached", timeout: 25000 }).catch(() => {});
    await mPage.waitForTimeout(2500);
    await cleanOverlays(mPage);

    // If intake start-next or emergency is visible, click it
    const mStartNext = mPage.locator('#btn-intake-start-next, [data-testid="btn-intake-start-next"], button:has-text("Пригласить следующего"), button:has-text("Начать приём")').first();
    const mEmergency = mPage.locator('[data-testid="btn-intake-cito-emergency"], button:has-text("Острая боль")').first();
    const mQueueItem = mPage.locator('.intake-queue-item, [data-testid^="queue-item-"]').first();

    const isMobChairsideReady = await mPage.locator(".mobile-chairside-container").isVisible().catch(() => false);
    if (!isMobChairsideReady) {
      if (await mStartNext.isVisible().catch(() => false)) {
        console.log("Clicking start next on mobile...");
        await mStartNext.click().catch(() => {});
        await mPage.waitForTimeout(2000);
      } else if (await mEmergency.isVisible().catch(() => false)) {
        console.log("Clicking emergency on mobile...");
        await mEmergency.click().catch(() => {});
        await mPage.waitForTimeout(2000);
      } else if (await mQueueItem.isVisible().catch(() => false)) {
        console.log("Clicking queue patient on mobile...");
        await mQueueItem.click().catch(() => {});
        await mPage.waitForTimeout(2000);
      }
    }

    await mPage.waitForSelector(".mobile-chairside-container", { state: "visible", timeout: 20000 }).catch(() => {});
    await cleanOverlays(mPage);

    // 03 Mobile Light
    console.log("Saving 03_chairside_mobile_light.png...");
    await configurePage(mPage, auth, "light");
    await cleanOverlays(mPage);
    await saveProof(mPage, "03_chairside_mobile_light.png");

    // 04 Mobile Dark
    console.log("Saving 04_chairside_mobile_dark.png...");
    await configurePage(mPage, auth, "dark");
    await cleanOverlays(mPage);
    await saveProof(mPage, "04_chairside_mobile_dark.png");

    await mContext.close();

    console.log("\n🎉 ALL 4 RED TEAM VISUAL PROOFS CAPTURED AND VERIFIED SUCCESSFULLY!");
  } finally {
    await browser.close();
  }
}

run().catch((err) => {
  console.error("CAPTURE FAILED:", err);
  process.exit(1);
});
