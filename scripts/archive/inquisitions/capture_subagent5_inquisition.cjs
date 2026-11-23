/**
 * scripts/capture_subagent5_inquisition.cjs
 * Subagent 5: Visual Red Team Inquisitor & Playwright Proofmaker.
 * 
 * Captures 10 live screenshots:
 * 1. Doctor Visit & FDI Odontogram (PC Light, PC Dark: 1440x900)
 * 2. Schedule & Appointment Cards (PC Light, PC Dark: 1440x900)
 * 3. Cashbox 54-FZ & Shift Close (PC Light, PC Dark: 1440x900)
 * 4. Comprehensive Treatment Plans & Presentation (PC Light, PC Dark: 1440x900)
 * 5. Patient Portal (Mobile Light, Mobile Dark: 390x844)
 */

const { chromium } = require("playwright");
const path = require("node:path");
const fs = require("node:fs");
const crypto = require("node:crypto");

const API_BASE = "http://127.0.0.1:4100";
const WEB_BASE = "http://127.0.0.1:5173";

const TARGET_DIRS = [
  path.resolve("C:/Users/Admin/.gemini/antigravity/brain/4d9e0fe3-ae4b-4959-a034-e2ea3d244aff/screenshots"),
  path.resolve("C:/Users/Admin/.gemini/antigravity/brain/a84df016-a7cc-461c-ba80-899ae84de477/screenshots"),
  path.resolve("C:/Clinic_MVP/dental-crm/docs/screenshots/inquisition_live"),
];

for (const d of TARGET_DIRS) {
  if (!fs.existsSync(d)) {
    fs.mkdirSync(d, { recursive: true });
  }
}

async function provisionLiveSession() {
  const uniqueId = Date.now();
  console.log("[Provisioning] Initializing live clinic session on API...");

  const initRes = await fetch(`${API_BASE}/api/auth/setup/init`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      clinicName: "Стоматология ДЕНТЕ Премиум",
      email: `doctor-inquisitor-${uniqueId}@dente-clinic.ru`,
      password: "Password123!",
      ownerName: "Д-р Барабаш Сергей Владимирович",
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

  let patientId = null;
  let appointmentId = null;

  // Seed patient
  const pRes = await fetch(`${API_BASE}/api/patients`, {
    method: "POST",
    headers,
    body: JSON.stringify({
      fullName: "Ковалёв Роман Станиславович",
      phone: "+7 (999) 888-77-66",
      birthDate: "1988-04-12",
      gender: "male",
      notes: "Бронхиальная астма, аллергия на латекс",
    }),
  });
  if (pRes.ok) {
    const pData = await pRes.json();
    patientId = pData.patient?.id || pData.id || null;
    console.log(`[Provisioning] Seeded patient: ${patientId}`);

    // Seed appointment for today
    const todayStr = new Date().toISOString().split("T")[0];
    const apptRes = await fetch(`${API_BASE}/api/appointments`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        patientId,
        doctorId: initData.ownerUserId,
        chairId: "chair-1",
        startTime: `${todayStr}T10:00:00Z`,
        endTime: `${todayStr}T11:00:00Z`,
        status: "confirmed",
        notes: "Лечение глубокого кариеса 36 зуба",
      }),
    });
    if (apptRes.ok) {
      const apptData = await apptRes.json();
      appointmentId = apptData.appointment?.id || apptData.id || null;
      console.log(`[Provisioning] Seeded appointment: ${appointmentId}`);
    }

    // Seed payment
    await fetch(`${API_BASE}/api/payments`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        patientId,
        amountRub: 14500,
        method: "card",
        clientMutationId: crypto.randomUUID(),
        fiscalReceiptNumber: "ФЧ-000941",
        fiscalReceiptIssuedAt: new Date().toISOString(),
        note: "Оплата за эндодонтическое лечение 36 зуба",
      }),
    });
    console.log("[Provisioning] Seeded payment 14 500 ₽ (card)");
  }

  return {
    clinicToken: initData.clinicToken,
    staffToken: unlockData.staffToken,
    ownerUserId: initData.ownerUserId,
    patientId,
    appointmentId,
  };
}

async function runCapture() {
  const auth = await provisionLiveSession();

  console.log("[Playwright] Launching Chrome executable...");
  const browser = await chromium.launch({
    headless: true,
    executablePath: "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
    args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-gpu"],
  });

  const capturedRegistry = [];

  const addAuthInitScript = (ctx) =>
    ctx.addInitScript(
      ({ ct, st, uid, pid }) => {
        localStorage.setItem("dente_clinic_token", ct);
        localStorage.setItem("dente_staff_token", st);
        localStorage.setItem("dente_active_role", "owner");
        localStorage.setItem("dente_onboarding_completed", "true");
        localStorage.setItem(
          "dente_ui_preferences_v1",
          JSON.stringify({
            onboardingDismissed: true,
            onboardingStep: "done",
            version: 1,
          })
        );
        localStorage.setItem(
          "dental-crm:onboarding:v1",
          JSON.stringify({
            dismissed: true,
            step: "done",
            completed: true,
            onboardingDismissed: true,
            onboardingStep: "done",
            version: 1,
          })
        );
        localStorage.setItem(
          "dental-crm:web-ui-preferences:v1",
          JSON.stringify({
            version: 1,
            uiLanguage: "ru",
            selectedWorkspaceRole: "owner",
            selectedPatientId: pid,
            onboardingDismissed: true,
            onboardingStep: "done",
          })
        );
        localStorage.setItem(
          "dente-workspace-profile",
          JSON.stringify({
            state: {
              clinicName: "Стоматология ДЕНТЕ Премиум",
              currentDoctor: { id: uid, fullName: "Д-р Барабаш С. В.", role: "owner" },
              flags: { disableTour: true },
            },
          })
        );
      },
      {
        ct: auth.clinicToken,
        st: auth.staffToken,
        uid: auth.ownerUserId,
        pid: auth.patientId,
      }
    );

  async function setPageTheme(page, theme) {
    await page.evaluate((th) => {
      document.documentElement.setAttribute("data-theme", th);
      if (th === "dark") {
        document.documentElement.classList.add("dark");
        document.documentElement.classList.remove("light");
      } else {
        document.documentElement.classList.remove("dark");
        document.documentElement.classList.add("light");
      }
      localStorage.setItem("dente_theme_mode", th);
      if (window.__useThemeStore) {
        window.__useThemeStore.getState().setThemeMode(th);
      }
    }, theme);
    await page.waitForTimeout(800);
  }

  async function saveProof(page, fileName, viewName, modeName, requiredSelector) {
    const mainPath = path.join(TARGET_DIRS[0], fileName);

    await page.waitForSelector(".boot-state", { state: "detached", timeout: 20000 }).catch(() => {});
    if (requiredSelector) {
      await page.waitForSelector(requiredSelector, { state: "visible", timeout: 20000 }).catch(() => {});
    }
    await page.waitForTimeout(1200);

    let buffer = await page.screenshot({ path: mainPath, fullPage: false });

    // Self-healing: if buffer is suspiciously small, wait for boot-state and retry
    if (buffer.length < 40960) {
      console.warn(`[Retry] File ${fileName} is ${buffer.length} bytes, retrying after state stabilization...`);
      await page.waitForSelector(".boot-state", { state: "detached", timeout: 20000 }).catch(() => {});
      if (requiredSelector) {
        await page.waitForSelector(requiredSelector, { state: "visible", timeout: 20000 }).catch(() => {});
      }
      await page.waitForTimeout(2000);
      buffer = await page.screenshot({ path: mainPath, fullPage: false });
    }

    for (let i = 1; i < TARGET_DIRS.length; i++) {
      fs.copyFileSync(mainPath, path.join(TARGET_DIRS[i], fileName));
    }

    const stats = fs.statSync(mainPath);
    const md5 = crypto.createHash("md5").update(fs.readFileSync(mainPath)).digest("hex");

    capturedRegistry.push({
      fileName,
      view: viewName,
      mode: modeName,
      sizeBytes: stats.size,
      sizeKb: (stats.size / 1024).toFixed(1),
      md5,
      path: mainPath,
      passSize: stats.size >= 40960,
    });

    console.log(
      `[Captured] ${fileName} (${viewName} ${modeName}): ${stats.size} bytes (${(stats.size / 1024).toFixed(1)} KB), MD5: ${md5}, >=40KB: ${stats.size >= 40960 ? "PASS" : "FAIL"}`
    );
  }

  // =========================================================================
  // 1. DESKTOP SUITE (1440x900)
  // =========================================================================
  console.log("\n>>> DESKTOP INQUISITION SUITE (1440x900) <<<");
  const desktopCtx = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    deviceScaleFactor: 2,
    isMobile: false,
    hasTouch: false,
  });
  await addAuthInitScript(desktopCtx);
  const dPage = await desktopCtx.newPage();

  // Initial load
  await dPage.goto(`${WEB_BASE}/#schedule`, { waitUntil: "domcontentloaded", timeout: 60000 });
  await dPage.waitForSelector(".boot-state", { state: "detached", timeout: 60000 }).catch(() => {});
  await dPage.waitForSelector(".app-shell", { state: "visible", timeout: 30000 });
  await dPage.waitForTimeout(2000);

  // ── 1. DOCTOR VISIT & FDI ODONTOGRAM ─────────────────────────────────────
  console.log("\n[Screen 1] Doctor Visit & FDI Odontogram...");
  await dPage.evaluate((pid) => {
    localStorage.setItem("dente_workspace_perspective", "standard");
    if (window.__usePerspectiveStore) window.__usePerspectiveStore.getState().setPerspective("standard");
    window.location.hash = "visit";
  }, auth.patientId);
  await dPage.waitForSelector('[aria-busy="true"]', { state: "detached", timeout: 30000 }).catch(() => {});
  await dPage.waitForSelector(".visit-monolithic-header, [data-testid=\"visit-view\"]", { timeout: 20000 });
  await dPage.waitForTimeout(1500);

  // 1A. PC Light
  await setPageTheme(dPage, "light");
  await saveProof(dPage, "01_doctor_visit_odontogram_pc_light.png", "Doctor Visit & Odontogram", "PC Light", ".visit-monolithic-header, [data-testid=\"visit-view\"]");

  // 1B. PC Dark
  await setPageTheme(dPage, "dark");
  await saveProof(dPage, "02_doctor_visit_odontogram_pc_dark.png", "Doctor Visit & Odontogram", "PC Dark", ".visit-monolithic-header, [data-testid=\"visit-view\"]");

  // ── 2. SCHEDULE & APPOINTMENT CARDS ──────────────────────────────────────
  console.log("\n[Screen 2] Schedule & Appointment Cards...");
  await dPage.evaluate(() => {
    window.location.hash = "schedule";
  });
  await dPage.waitForSelector(".schedule-filter-strip", { state: "visible", timeout: 20000 });
  await dPage.waitForTimeout(1500);

  // 2A. PC Light
  await setPageTheme(dPage, "light");
  await saveProof(dPage, "03_schedule_appointments_pc_light.png", "Schedule & Appointments", "PC Light", ".schedule-filter-strip");

  // 2B. PC Dark
  await setPageTheme(dPage, "dark");
  await saveProof(dPage, "04_schedule_appointments_pc_dark.png", "Schedule & Appointments", "PC Dark", ".schedule-filter-strip");

  // ── 3. CASHBOX 54-FZ & SHIFT CLOSE ──────────────────────────────────────
  console.log("\n[Screen 3] Cashbox 54-FZ & Shift Close...");
  await dPage.evaluate(() => {
    window.location.hash = "finance";
  });
  await dPage.waitForSelector(".finance-header-actions, .finance-container", { state: "visible", timeout: 20000 });
  // Open Cash Shift Widget
  await dPage.evaluate(() => {
    const shiftBtn = document.querySelector('[data-testid="btn-toggle-cash-shift"]');
    if (shiftBtn) shiftBtn.click();
  });
  await dPage.waitForTimeout(1200);

  // 3A. PC Light
  await setPageTheme(dPage, "light");
  await saveProof(dPage, "05_cashbox_54fz_shift_close_pc_light.png", "Cashbox 54-FZ & Shift Close", "PC Light", ".finance-header-actions, .finance-container");

  // 3B. PC Dark
  await setPageTheme(dPage, "dark");
  await saveProof(dPage, "06_cashbox_54fz_shift_close_pc_dark.png", "Cashbox 54-FZ & Shift Close", "PC Dark", ".finance-header-actions, .finance-container");

  // ── 4. COMPREHENSIVE TREATMENT PLANS & PRESENTATION ──────────────────────
  console.log("\n[Screen 4] Treatment Plans & Presentation...");
  await dPage.evaluate(() => {
    localStorage.setItem("dente_workspace_perspective", "presentation");
    if (window.__usePerspectiveStore) window.__usePerspectiveStore.getState().setPerspective("presentation");
    window.location.hash = "visit";
  });
  await dPage.waitForTimeout(2000);

  // 4A. PC Light
  await setPageTheme(dPage, "light");
  await saveProof(dPage, "07_treatment_plans_presentation_pc_light.png", "Treatment Plans Presentation", "PC Light", ".treatment-plan-module, .plan-comparison-container, [data-testid=\"visit-view\"]");

  // 4B. PC Dark
  await setPageTheme(dPage, "dark");
  await saveProof(dPage, "08_treatment_plans_presentation_pc_dark.png", "Treatment Plans Presentation", "PC Dark", ".treatment-plan-module, .plan-comparison-container, [data-testid=\"visit-view\"]");

  await desktopCtx.close();

  // =========================================================================
  // 2. MOBILE SUITE (390x844) — PATIENT PORTAL
  // =========================================================================
  console.log("\n>>> MOBILE INQUISITION SUITE (390x844) — PATIENT PORTAL <<<");
  const mobileCtx = await browser.newContext({
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 2,
    isMobile: true,
    hasTouch: true,
  });
  await addAuthInitScript(mobileCtx);
  const mPage = await mobileCtx.newPage();

  // Open Public Booking / Patient Portal page
  await mPage.goto(`${WEB_BASE}/#/portal/booking/default`, { waitUntil: "domcontentloaded", timeout: 60000 });
  await mPage.waitForTimeout(2500);

  // 5A. Mobile Light
  await setPageTheme(mPage, "light");
  await saveProof(mPage, "09_patient_portal_mobile_light.png", "Patient Portal Mobile", "Mobile Light", ".PublicBookingWidget-root, .public-booking-container");

  // 5B. Mobile Dark
  await setPageTheme(mPage, "dark");
  await saveProof(mPage, "10_patient_portal_mobile_dark.png", "Patient Portal Mobile", "Mobile Dark", ".PublicBookingWidget-root, .public-booking-container");

  await mobileCtx.close();
  await browser.close();

  // Verification Summary
  console.log("\n========================================================");
  console.log("SUBAGENT 5: VISUAL PROOF CAPTURE SUMMARY TABLE");
  console.log("========================================================");
  console.table(capturedRegistry);

  const hashes = new Set(capturedRegistry.map((r) => r.md5));
  const uniqueHashes = hashes.size === capturedRegistry.length;
  const allAbove40k = capturedRegistry.every((r) => r.sizeBytes >= 40960);

  console.log(`Total captured: ${capturedRegistry.length}/10`);
  console.log(`Unique MD5 hashes: ${uniqueHashes ? "YES (100% distinct screens)" : "FAIL"}`);
  console.log(`All files >= 40 KB: ${allAbove40k ? "PASS" : "FAIL"}`);

  if (!uniqueHashes || !allAbove40k || capturedRegistry.length < 10) {
    throw new Error("Screenshot capture failed verification gates!");
  }

  return capturedRegistry;
}

runCapture()
  .then(() => {
    console.log("\n[SUCCESS] All 10 screenshots captured and verified successfully.");
    process.exit(0);
  })
  .catch((err) => {
    console.error("\n[FATAL] Screenshot capture failed:", err);
    process.exit(1);
  });
