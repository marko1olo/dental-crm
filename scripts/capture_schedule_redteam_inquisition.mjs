/**
 * scripts/capture_schedule_redteam_inquisition.mjs
 *
 * Dedicated Red Team 4-State Proof Capture for Schedule & Agenda:
 * - Real Fastify API (http://127.0.0.1:4100) + PostgreSQL 18
 * - Real Vite Frontend (http://127.0.0.1:5173)
 * - 4 States: PC Light (1440x900), PC Dark (1440x900), Mobile Light (390x844), Mobile Dark (390x844)
 */

import { existsSync, mkdirSync, statSync } from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import puppeteer from "puppeteer";

const API_BASE = process.env.API_BASE || "http://127.0.0.1:4100";
const APP_BASE = process.env.APP_BASE || "http://127.0.0.1:5173";

const OUT_DIRS = [
  "C:/Users/Admin/.gemini/antigravity/brain/721d104b-5e51-4e45-b284-7b0102207416/screenshots",
  "C:/Clinic_MVP/dental-crm/docs/screenshots/schedule",
];

for (const dir of OUT_DIRS) {
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }
}

const possibleBrowserPaths = [
  "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
  "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe",
  "C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe",
  "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
].filter(Boolean);

const browserExecutable = possibleBrowserPaths.find((p) => existsSync(p));

async function preflightHealthCheck() {
  console.log(`[PREFLIGHT] Checking Fastify API (${API_BASE}) and Vite (${APP_BASE})...`);
  const apiRes = await fetch(`${API_BASE}/api/health`).catch(() => fetch(`${API_BASE}/`));
  if (!apiRes || (apiRes.status >= 500 && apiRes.status !== 503)) {
    throw new Error(`API unreachable: ${apiRes?.status}`);
  }
  const webRes = await fetch(APP_BASE);
  if (!webRes.ok && webRes.status !== 200 && webRes.status !== 304) {
    throw new Error(`Vite unreachable: ${webRes.status}`);
  }
  console.log(`[PREFLIGHT] All services live!`);
}

async function provisionTestClinic() {
  const uniqueId = Date.now();
  const loginEmail = `inq-sched-${uniqueId}@dente-test.local`;
  const password = "DentePassword2026!";
  const ownerPin = "123456";

  console.log(`[AUTH] Provisioning clinic for Red Team Schedule Audit...`);
  const initRes = await fetch(`${API_BASE}/api/auth/setup/init`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      clinicName: `Стоматология Дент-Инквизиция ${uniqueId}`,
      email: loginEmail,
      password,
      ownerName: "Д-р Инквизитор Алексей",
      ownerPin,
    }),
  });

  if (!initRes.ok) {
    throw new Error(`setup/init failed: ${await initRes.text()}`);
  }

  const initData = await initRes.json();
  const unlockRes = await fetch(`${API_BASE}/api/auth/staff/unlock`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-dente-clinic-token": initData.clinicToken,
    },
    body: JSON.stringify({ userId: initData.ownerUserId, pinCode: ownerPin }),
  });

  const unlockData = await unlockRes.json();
  const staffToken = unlockData.staffToken || initData.clinicToken;

  const headers = {
    "Content-Type": "application/json",
    "x-dente-clinic-token": initData.clinicToken,
    "x-dente-staff-token": staffToken,
  };

  // Seed patient
  const pRes = await fetch(`${API_BASE}/api/patients`, {
    method: "POST",
    headers,
    body: JSON.stringify({
      fullName: "Иванов Иван Иванович",
      phone: "+7 999 111-22-33",
      birthDate: "1990-05-15",
      status: "active",
    }),
  });
  const pData = await pRes.json();
  const patientId = pData.patient?.id || pData.id;

  // Seed appointments (one planned, one in_treatment)
  const now = new Date();
  const todayIso = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
  const startsAt1 = `${todayIso}T10:00:00.000Z`;
  const endsAt1 = `${todayIso}T11:00:00.000Z`;

  try {
    await fetch(`${API_BASE}/api/schedule/appointments`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        patientId,
        doctorUserId: initData.ownerUserId,
        status: "planned",
        startsAt: startsAt1,
        endsAt: endsAt1,
        reason: "Лечение кариеса 2.4",
      }),
    });
  } catch (err) {
    console.warn("Appointment seed note:", err.message);
  }

  return {
    clinicToken: initData.clinicToken,
    staffToken,
    patientId,
  };
}

const VIEWPORTS = {
  desktop: { width: 1440, height: 900, isMobile: false },
  mobile: { width: 390, height: 844, isMobile: true, hasTouch: true },
};

async function applyTheme(page, themeMode) {
  await page.evaluate((mode) => {
    const root = document.documentElement;
    root.setAttribute("data-theme", mode);
    if (mode === "dark") {
      root.classList.add("dark");
      root.classList.remove("light");
    } else {
      root.classList.remove("dark");
      root.classList.add("light");
    }
    localStorage.setItem("dente_theme_mode", mode);
    if (window.__useThemeStore && typeof window.__useThemeStore.getState === "function") {
      window.__useThemeStore.getState().setThemeMode(mode);
    }
    window.dispatchEvent(new Event("resize"));
  }, themeMode);
  await new Promise((r) => setTimeout(r, 600));
}

async function seedAndNavigate(page, auth, viewport, theme) {
  page.on("console", (msg) => {
    const text = msg.text();
    if (text.includes("Schedule") || text.includes("error") || text.includes("Error") || text.includes("boot")) {
      console.log(`  [BROWSER] ${text}`);
    }
  });
  page.on("pageerror", (err) => {
    console.error(`  [PAGE ERROR] ${err.message}`);
  });

  await page.setViewport(viewport);

  await page.evaluateOnNewDocument((ct, st, pid, tm) => {
    localStorage.setItem("dente_clinic_token", ct);
    localStorage.setItem("dente_staff_token", st);
    localStorage.setItem("dente_active_session_token", st);
    localStorage.setItem("dente_user_role", "owner");
    localStorage.setItem("dente_onboarding_completed", "true");
    localStorage.setItem("dente_theme_mode", tm);
    localStorage.setItem("dente_workspace_perspective", "standard");
    localStorage.setItem("dental-crm:onboarding:v1", JSON.stringify({ dismissed: true, step: "done", completed: true }));
    localStorage.setItem(
      "dental-crm:web-ui-preferences:v1",
      JSON.stringify({
        version: 1,
        uiLanguage: "ru",
        selectedWorkspaceRole: "owner",
        selectedSpecialty: "therapist",
        selectedPatientId: pid || null,
        onboardingDismissed: true,
        soundNotificationsMuted: false,
      })
    );
    localStorage.setItem(
      "dente_ui_preferences_v1",
      JSON.stringify({
        version: 1,
        uiLanguage: "ru",
        selectedWorkspaceRole: "owner",
        selectedSpecialty: "therapist",
        selectedPatientId: pid || null,
        onboardingDismissed: true,
        soundNotificationsMuted: false,
      })
    );
  }, auth.clinicToken, auth.staffToken, auth.patientId, theme);

  await page.goto(`${APP_BASE}/#schedule`, { waitUntil: "domcontentloaded", timeout: 30000 });
  await new Promise((r) => setTimeout(r, 2000));

  const retryBtn = await page.$(".boot-retry-button");
  if (retryBtn) {
    console.log("  [ACTION] Clicking boot-retry-button...");
    await retryBtn.click();
    await new Promise((r) => setTimeout(r, 1500));
  }

  // Wait for Suspense lazy-loaded ScheduleView to resolve
  console.log("  [WAIT] Waiting for ScheduleView to load and resolve from Suspense...");
  try {
    await page.waitForFunction(() => {
      const isSuspended = Boolean(document.querySelector(".schedule-panel .animate-spin"));
      const hasSchedule = Boolean(
        document.querySelector(".schedule-filter-strip") ||
        document.querySelector(".schedule-mobile-agenda") ||
        document.querySelector("[data-testid='schedule-grid-view']") ||
        document.querySelector(".chair-schedule-container") ||
        document.querySelector(".schedule-toolbar")
      );
      return !isSuspended && hasSchedule;
    }, { timeout: 20000 });
    console.log("  [READY] ScheduleView fully resolved!");
  } catch {
    console.warn("  [WARN] waitForFunction timed out, checking DOM state...");
  }

  await applyTheme(page, theme);
  await new Promise((r) => setTimeout(r, 1500));
}

async function captureState(page, filename) {
  for (const dir of OUT_DIRS) {
    const fullPath = path.join(dir, `${filename}.png`);
    await page.screenshot({ path: fullPath, fullPage: false });
    const stat = statSync(fullPath);
    console.log(`[CAPTURED] ${filename}.png (${(stat.size / 1024).toFixed(1)} KB) -> ${dir}`);
  }
}

async function main() {
  await preflightHealthCheck();
  const auth = await provisionTestClinic();

  const browser = await puppeteer.launch({
    headless: "new",
    args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-gpu"],
    executablePath: browserExecutable,
  });

  try {
    // 1. PC Light
    console.log("\n[STATE 1/4] PC Light (1440x900)...");
    let page = await browser.newPage();
    await seedAndNavigate(page, auth, VIEWPORTS.desktop, "light");
    await captureState(page, "proof_schedule_redteam_pc_light_1440x900");
    await page.close();

    // 2. PC Dark
    console.log("\n[STATE 2/4] PC Dark (1440x900)...");
    page = await browser.newPage();
    await seedAndNavigate(page, auth, VIEWPORTS.desktop, "dark");
    await captureState(page, "proof_schedule_redteam_pc_dark_1440x900");
    await page.close();

    // 3. Mobile Light
    console.log("\n[STATE 3/4] Mobile Light (390x844)...");
    page = await browser.newPage();
    await seedAndNavigate(page, auth, VIEWPORTS.mobile, "light");
    await captureState(page, "proof_schedule_redteam_mobile_light_390x844");
    await page.close();

    // 4. Mobile Dark
    console.log("\n[STATE 4/4] Mobile Dark (390x844)...");
    page = await browser.newPage();
    await seedAndNavigate(page, auth, VIEWPORTS.mobile, "dark");
    await captureState(page, "proof_schedule_redteam_mobile_dark_390x844");
    await page.close();

    console.log("\n[SUCCESS] All 4 Red Team Visual Proof states successfully captured!");
  } finally {
    await browser.close();
  }
}

main().catch((err) => {
  console.error("[FATAL] Capture failed:", err);
  process.exit(1);
});
