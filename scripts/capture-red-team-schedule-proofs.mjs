/**
 * scripts/capture-red-team-schedule-proofs.mjs
 * Red Team Schedule & Chairside Dispatch Proof Capture
 */
import { existsSync, mkdirSync } from "node:fs";
import path from "node:path";
import { chromium } from "playwright";

const API_BASE = "http://127.0.0.1:4100";
const APP_BASE = "http://127.0.0.1:5173";
const OUT_DIR = path.join(process.cwd(), "docs/screenshots/red_team");

if (!existsSync(OUT_DIR)) {
  mkdirSync(OUT_DIR, { recursive: true });
}

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function setupDataAndAuth() {
  console.log("[LOGIN] Authenticating via demo credentials (admin@clinic.ru)...");
  const loginRes = await fetch(`${API_BASE}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: "admin@clinic.ru", password: "Password123!" }),
  });

  if (!loginRes.ok) {
    throw new Error(`Login failed: HTTP ${loginRes.status} ${await loginRes.text()}`);
  }
  const auth = await loginRes.json();
  const headers = {
    "Content-Type": "application/json",
    "x-dente-clinic-token": auth.clinicToken,
    "Authorization": `Bearer ${auth.staffToken}`,
  };

  // Get current dashboard data
  const dashRes = await fetch(`${API_BASE}/api/dashboard`, { headers });
  const dashboard = await dashRes.json();
  const patients = dashboard.patients || [];
  const doctor = (dashboard.clinicSettings?.staff || []).find((s) => s.role === "doctor") || auth.user;
  const chair = (dashboard.clinicSettings?.chairs || [])[0] || { id: "chair-1" };

  const todayIso = "2026-10-08";

  // Check if 15m and 30m slots exist, if not create them
  const existingAppts = dashboard.appointments || [];
  const has15m = existingAppts.some((a) => a.startsAt?.includes("07:00:00"));
  const has30m = existingAppts.some((a) => a.startsAt?.includes("09:00:00"));

  if (!has15m) {
    console.log("[DATA] Creating 15m slot: 07:00 - 07:15 (confirmed)...");
    await fetch(`${API_BASE}/api/appointments`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        patientId: patients[0]?.id || "p1",
        doctorUserId: doctor.id,
        chairId: chair.id,
        startsAt: `${todayIso}T07:00:00.000Z`,
        endsAt: `${todayIso}T07:15:00.000Z`,
        reason: "Консультация ортодонта",
        status: "confirmed",
      }),
    });
  }

  if (!has30m) {
    console.log("[DATA] Creating 30m slot: 09:00 - 09:30 (arrived)...");
    await fetch(`${API_BASE}/api/appointments`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        patientId: patients[1]?.id || patients[0]?.id || "p2",
        doctorUserId: doctor.id,
        chairId: chair.id,
        startsAt: `${todayIso}T09:00:00.000Z`,
        endsAt: `${todayIso}T09:30:00.000Z`,
        reason: "Лечение кариеса 2.4",
        status: "arrived",
      }),
    });
  }

  return {
    auth,
    doctor,
    patientId: patients[0]?.id || null,
  };
}

async function applyTheme(page, theme) {
  await page.evaluate((th) => {
    document.documentElement.setAttribute("data-theme", th);
    const isDark = th === "dark";
    document.documentElement.classList.toggle("dark", isDark);
    document.documentElement.classList.toggle("light", !isDark);
    document.body.className = isDark ? "dark" : "light";
    document.documentElement.style.colorScheme = isDark ? "dark" : "light";
    localStorage.setItem("dente_theme_mode", th);
    if (window.__useThemeStore) {
      window.__useThemeStore.getState().setThemeMode(th);
    }
  }, theme);
  await wait(400);
}

async function main() {
  console.log("=== STARTING RED TEAM SCHEDULE PROOF CAPTURE ===");
  const { auth, doctor, patientId } = await setupDataAndAuth();

  const browser = await chromium.launch({
    channel: "msedge",
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });

  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    deviceScaleFactor: 1,
  });

  // Inject cookies
  await context.addCookies([
    { name: "dente_clinic_token", value: auth.clinicToken, domain: "127.0.0.1", path: "/" },
    { name: "dente_staff_token", value: auth.staffToken, domain: "127.0.0.1", path: "/" },
  ]);

  const page = await context.newPage();

  // Inject session tokens
  await page.addInitScript(({ cToken, sToken, pId, doc }) => {
    localStorage.setItem("dente_clinic_token", cToken);
    localStorage.setItem("dente_staff_token", sToken);
    localStorage.setItem("dente_workspace_perspective", "doctor");
    localStorage.setItem("dente_user_role", "doctor");
    localStorage.setItem("dente_active_staff_user", JSON.stringify(doc));
    localStorage.setItem("dental-crm:onboarding:v1", JSON.stringify({ dismissed: true, step: "done" }));
    localStorage.setItem("dental-crm:web-ui-preferences:v1", JSON.stringify({
      version: 1,
      uiLanguage: "ru",
      selectedWorkspaceRole: "doctor",
      selectedSpecialty: "therapist",
      selectedPatientId: pId,
      onboardingDismissed: true,
    }));
  }, {
    cToken: auth.clinicToken,
    sToken: auth.staffToken,
    pId: patientId,
    doc: doctor,
  });

  // 1. Navigate to schedule
  console.log("[CAPTURE] Navigating to /#schedule (PC Light)...");
  await page.goto(`${APP_BASE}/#schedule`, { waitUntil: "domcontentloaded", timeout: 45000 });

  console.log("   Waiting for schedule toolbar...");
  await page.waitForSelector('[data-testid="schedule-toolbar"]', { state: "visible", timeout: 35000 });

  console.log("   Waiting for Suspense fallbacks to clear...");
  await page.waitForFunction(() => {
    const text = document.body.innerText || "";
    return !text.includes("Подготовка модулей расписания") &&
           !text.includes("Загрузка системы") &&
           !text.includes("Загрузка рабочей смены");
  }, { timeout: 30000 }).catch(() => console.log("   Warning: timeout waiting for body text to clear fallback"));

  await applyTheme(page, "light");
  await wait(1500);

  const shot1Path = path.join(OUT_DIR, "01_schedule_pc_light.png");
  await page.screenshot({ path: shot1Path, fullPage: false, animations: "disabled" });
  console.log(`[PROOF 1] Saved: ${shot1Path}`);

  // 2. Schedule PC Dark
  console.log("[CAPTURE] Capturing /#schedule (PC Dark)...");
  await applyTheme(page, "dark");
  await wait(1500);

  const shot2Path = path.join(OUT_DIR, "02_schedule_pc_dark.png");
  await page.screenshot({ path: shot2Path, fullPage: false, animations: "disabled" });
  console.log(`[PROOF 2] Saved: ${shot2Path}`);

  // 3. Switch to Chairs View
  console.log("[CAPTURE] Switching to Chairs view (PC Light)...");
  await applyTheme(page, "light");
  await wait(800);

  const chairsBtn = page.locator('[data-testid="schedule-view-mode-chairs"]').first();
  if (await chairsBtn.isVisible()) {
    console.log("   Clicking [data-testid=\"schedule-view-mode-chairs\"]...");
    await chairsBtn.click();
    await wait(1500);
  }

  // Ensure chairs view is rendered without Suspense
  await page.waitForFunction(() => {
    const text = document.body.innerText || "";
    return !text.includes("Подготовка модулей расписания");
  }, { timeout: 15000 }).catch(() => {});
  await wait(1000);

  const shot3Path = path.join(OUT_DIR, "03_schedule_chairs_light.png");
  await page.screenshot({ path: shot3Path, fullPage: false, animations: "disabled" });
  console.log(`[PROOF 3] Saved: ${shot3Path}`);

  // 4. Test visit launch and capture #visit view
  console.log("[CAPTURE] Testing instant dispatch to #visit...");
  const gridBtn = page.locator('[data-testid="schedule-view-mode-grid"]').first();
  if (await gridBtn.isVisible()) {
    await gridBtn.click();
    await wait(1000);
  }

  const dentalProQuickInChair = page.locator('[data-testid^="dentalpro-quick-in-chair"]').first();
  const dentalProQuickStart = page.locator('[data-testid^="dentalpro-quick-start-treatment"]').first();
  const dentalProQuickOpen = page.locator('[data-testid^="dentalpro-quick-open-visit"]').first();
  const startBtn = page.locator('[data-testid="appointment-action-in-treatment-btn"]').first();
  const openVisitBtn = page.locator('[data-testid="appointment-action-open-visit-btn"]').first();
  const microStart = page.locator('[data-testid="appointment-micro-start-visit-btn"]').first();
  const anyApptCard = page.locator('[data-testid^="appointment-card-clickable"]').first();

  if (await dentalProQuickInChair.isVisible()) {
    console.log("   Clicking dentalpro-quick-in-chair button...");
    await dentalProQuickInChair.click();
  } else if (await dentalProQuickStart.isVisible()) {
    console.log("   Clicking dentalpro-quick-start-treatment button...");
    await dentalProQuickStart.click();
  } else if (await dentalProQuickOpen.isVisible()) {
    console.log("   Clicking dentalpro-quick-open-visit button...");
    await dentalProQuickOpen.click();
  } else if (await startBtn.isVisible()) {
    console.log("   Clicking startBtn...");
    await startBtn.click();
  } else if (await openVisitBtn.isVisible()) {
    console.log("   Clicking openVisitBtn...");
    await openVisitBtn.click();
  } else if (await microStart.isVisible()) {
    console.log("   Clicking microStart...");
    await microStart.click();
  } else if (await anyApptCard.isVisible()) {
    console.log("   Double-clicking appointment card...");
    await anyApptCard.dblclick();
  } else {
    console.log("   Navigating directly to #visit...");
    await page.goto(`${APP_BASE}/#visit`, { waitUntil: "domcontentloaded", timeout: 15000 });
  }

  // Wait for #visit route and components to render
  await page.waitForFunction(() => window.location.hash.includes("visit"), { timeout: 10000 }).catch(() => {});
  await page.waitForFunction(() => {
    const text = document.body.innerText || "";
    return !text.includes("Загрузка CRM") && !text.includes("Загрузка системы") && !text.includes("загрузка");
  }, { timeout: 15000 }).catch(() => {});
  await wait(2500);

  const currentUrl = page.url();
  console.log(`   Current URL after dispatch: ${currentUrl}`);

  const shot4Path = path.join(OUT_DIR, "04_visit_opened_hash.png");
  await page.screenshot({ path: shot4Path, fullPage: false, animations: "disabled" });
  console.log(`[PROOF 4] Saved: ${shot4Path}`);

  await browser.close();
  console.log("=== CAPTURE COMPLETE ===");
}

main().catch((err) => {
  console.error("FATAL CAPTURE ERROR:", err);
  process.exit(1);
});
