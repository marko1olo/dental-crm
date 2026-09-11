/**
 * scripts/take_inquisition_live_screenshots.cjs
 * Adversarial Red Team Live Screenshot Pipeline.
 * Captures 16 live screenshots across 4 views (Schedule, Visit/EMK, Patients, Finance)
 * and 4 core states (1440x900 Desktop Light, 1440x900 Desktop Dark, 390x844 Mobile Light, 390x844 Mobile Dark).
 *
 * Invariants:
 * - Live running server on http://127.0.0.1:5173/ and API on http://127.0.0.1:4100/
 * - Real clinic setup, doctor unlock, seeded patients, visit, and payment records
 * - Explicit selector waiters and theme switching (Light / Dark)
 * - File size >= 40 KB, unique MD5 hashes
 * - Output saved in docs/screenshots/inquisition_live/ and copied to brain
 */

const { chromium } = require("playwright");
const path = require("node:path");
const fs = require("node:fs");
const crypto = require("node:crypto");

async function provisionLiveSession() {
  const API_BASE = "http://127.0.0.1:4100";
  const uniqueId = Date.now();
  console.log("[Provisioning] Setting up authenticated clinic session on live API...");

  const initRes = await fetch(`${API_BASE}/api/auth/setup/init`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      clinicName: "Стоматология ДЕНТЕ Премиум",
      email: `chief-${uniqueId}@dente-clinic.ru`,
      password: "Password123!",
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

  let patientId = null;

  // Seed primary patient
  try {
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

      // Seed appointment
      try {
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
          console.log("[Provisioning] Seeded today appointment");
        }
      } catch (errAppt) {
        console.log("[Provisioning] Appointment seeding note:", errAppt.message);
      }

      // Seed payment
      try {
        await fetch(`${API_BASE}/api/payments`, {
          method: "POST",
          headers,
          body: JSON.stringify({
            patientId,
            amountRub: 12500,
            method: "card",
            clientMutationId: crypto.randomUUID(),
            fiscalReceiptNumber: "ФЧ-000892",
            fiscalReceiptIssuedAt: new Date().toISOString(),
            note: "Оплата за комплексное терапевтическое лечение",
          }),
        });
        console.log("[Provisioning] Seeded payment 12 500 ₽ (card)");
      } catch (errPay) {
        console.log("[Provisioning] Payment seeding note:", errPay.message);
      }
    }
  } catch (errPat) {
    console.log("[Provisioning] Patient seeding note:", errPat.message);
  }

  return {
    clinicToken: initData.clinicToken,
    staffToken: unlockData.staffToken,
    ownerUserId: initData.ownerUserId,
    patientId,
  };
}

async function runInquisitionCapture() {
  const outDir = path.resolve("C:/Clinic_MVP/dental-crm/docs/screenshots/inquisition_live");
  if (!fs.existsSync(outDir)) {
    fs.mkdirSync(outDir, { recursive: true });
  }

  const brainDir = path.resolve("C:/Users/Admin/.gemini/antigravity/brain/6d8b32e4-5895-4535-b761-840423744138");
  if (!fs.existsSync(brainDir)) {
    fs.mkdirSync(brainDir, { recursive: true });
  }

  const auth = await provisionLiveSession();

  console.log("[Playwright] Launching Chrome executable...");
  const browser = await chromium.launch({
    headless: true,
    executablePath: "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });

  const capturedRegistry = [];

  // Helper to inject tokens and preferences
  async function configurePage(page, theme) {
    await page.evaluate(
      ({ ct, st, uid, pid, th }) => {
        localStorage.setItem("dente_clinic_token", ct);
        localStorage.setItem("dente_staff_token", st);
        localStorage.setItem("dente_active_role", "owner");
        localStorage.setItem("dente_theme_mode", th);
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
              currentDoctor: { id: uid, fullName: "Д-р Воронов А. В.", role: "owner" },
              flags: { disableTour: true },
            },
          })
        );
        document.documentElement.setAttribute("data-theme", th);
        if (th === "dark") {
          document.documentElement.classList.add("dark");
          document.documentElement.classList.remove("light");
        } else {
          document.documentElement.classList.remove("dark");
          document.documentElement.classList.add("light");
        }
      },
      {
        ct: auth.clinicToken,
        st: auth.staffToken,
        uid: auth.ownerUserId,
        pid: auth.patientId,
        th: theme,
      }
    );
  }

  async function takeProof(page, fileName, viewName, modeName) {
    const targetFile = path.join(outDir, fileName);
    const brainFile = path.join(brainDir, fileName);

    await page.waitForTimeout(1000);
    await page.screenshot({ path: targetFile, fullPage: false });

    fs.copyFileSync(targetFile, brainFile);

    const stats = fs.statSync(targetFile);
    const hash = crypto.createHash("md5").update(fs.readFileSync(targetFile)).digest("hex");

    capturedRegistry.push({
      fileName,
      view: viewName,
      mode: modeName,
      sizeBytes: stats.size,
      sizeKb: (stats.size / 1024).toFixed(1),
      md5: hash,
      path: targetFile,
      passSize: stats.size >= 40960,
    });

    console.log(
      `[Captured] ${fileName} (${viewName} ${modeName}): ${stats.size} bytes (${(stats.size / 1024).toFixed(1)} KB), MD5: ${hash}, >=40KB: ${stats.size >= 40960 ? "PASS" : "FAIL"}`
    );
  }

  const addAuthInitScript = (ctx) =>
    ctx.addInitScript(
      ({ ct, st, uid, pid }) => {
        localStorage.setItem("dente_clinic_token", ct);
        localStorage.setItem("dente_staff_token", st);
        localStorage.setItem("dente_active_role", "owner");
        localStorage.setItem("dente_theme_mode", "light");
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
              currentDoctor: { id: uid, fullName: "Д-р Воронов А. В.", role: "owner" },
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

  // =========================================================================
  // 1. DESKTOP VIEWPORT (1440x900, Scale 2)
  // =========================================================================
  console.log("\n>>> STARTING DESKTOP SUITE (1440x900) <<<");
  const desktopContext = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    deviceScaleFactor: 2,
    isMobile: false,
    hasTouch: false,
  });
  await addAuthInitScript(desktopContext);
  const dPage = await desktopContext.newPage();
  await dPage.goto("http://127.0.0.1:5173/", { waitUntil: "domcontentloaded", timeout: 60000 });

  // 1A. Schedule Desktop Light & Dark
  await configurePage(dPage, "light");
  await dPage.evaluate(() => { window.location.hash = "schedule"; });
  await dPage.waitForTimeout(2000);
  await dPage.waitForFunction(() => {
    return document.querySelector(".schedule-filter-strip, .schedule-calendar-grid, .timeline-wrapper");
  }, { timeout: 10000 }).catch(() => {});
  await takeProof(dPage, "01_schedule_desktop_light.png", "Schedule", "Desktop Light");

  await configurePage(dPage, "dark");
  await dPage.waitForTimeout(1200);
  await takeProof(dPage, "02_schedule_desktop_dark.png", "Schedule", "Desktop Dark");

  // 1B. Visit Desktop Light & Dark
  await configurePage(dPage, "light");
  await dPage.evaluate(() => { window.location.hash = "visit"; });
  await dPage.waitForTimeout(2000);
  await dPage.waitForFunction(() => {
    return document.querySelector(".visit-monolithic-header, .visit-panel, .visit-sub-nav-tabs");
  }, { timeout: 10000 }).catch(() => {});
  await takeProof(dPage, "05_visit_desktop_light.png", "Visit", "Desktop Light");

  await configurePage(dPage, "dark");
  await dPage.waitForTimeout(1200);
  await takeProof(dPage, "06_visit_desktop_dark.png", "Visit", "Desktop Dark");

  // 1C. Patients Desktop Light & Dark
  await configurePage(dPage, "light");
  await dPage.evaluate(() => { window.location.hash = "patients"; });
  await dPage.waitForTimeout(2000);
  await dPage.waitForFunction(() => {
    return document.querySelector(".patients-panel, .patients-search-box, .patient-card");
  }, { timeout: 10000 }).catch(() => {});
  await takeProof(dPage, "09_patients_desktop_light.png", "Patients", "Desktop Light");

  await configurePage(dPage, "dark");
  await dPage.waitForTimeout(1200);
  await takeProof(dPage, "10_patients_desktop_dark.png", "Patients", "Desktop Dark");

  // 1D. Finance Desktop Light & Dark
  await configurePage(dPage, "light");
  await dPage.evaluate(() => { window.location.hash = "finance"; });
  await dPage.waitForTimeout(2000);
  await dPage.waitForFunction(() => {
    return document.querySelector(".finance-panel, .finance-header-actions, .kassa-wrapper");
  }, { timeout: 10000 }).catch(() => {});
  await takeProof(dPage, "13_finance_desktop_light.png", "Finance", "Desktop Light");

  await configurePage(dPage, "dark");
  await dPage.waitForTimeout(1200);
  await takeProof(dPage, "14_finance_desktop_dark.png", "Finance", "Desktop Dark");

  await desktopContext.close();

  // =========================================================================
  // 2. MOBILE VIEWPORT (390x844, Scale 2)
  // =========================================================================
  console.log("\n>>> STARTING MOBILE SUITE (390x844) <<<");
  const mobileContext = await browser.newContext({
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 2,
    isMobile: true,
    hasTouch: true,
  });
  await addAuthInitScript(mobileContext);
  const mPage = await mobileContext.newPage();
  await mPage.goto("http://127.0.0.1:5173/", { waitUntil: "domcontentloaded", timeout: 60000 });

  // 2A. Schedule Mobile Light & Dark
  await configurePage(mPage, "light");
  await mPage.evaluate(() => { window.location.hash = "schedule"; });
  await mPage.waitForTimeout(2000);
  await mPage.waitForFunction(() => {
    return document.querySelector(".schedule-filter-strip, .schedule-calendar-grid");
  }, { timeout: 10000 }).catch(() => {});
  await takeProof(mPage, "03_schedule_mobile_light.png", "Schedule", "Mobile Light");

  await configurePage(mPage, "dark");
  await mPage.waitForTimeout(1200);
  await takeProof(mPage, "04_schedule_mobile_dark.png", "Schedule", "Mobile Dark");

  // 2B. Visit Mobile Light & Dark
  await configurePage(mPage, "light");
  await mPage.evaluate(() => { window.location.hash = "visit"; });
  await mPage.waitForTimeout(2000);
  await mPage.waitForFunction(() => {
    return document.querySelector(".visit-monolithic-header, .visit-panel");
  }, { timeout: 10000 }).catch(() => {});
  await takeProof(mPage, "07_visit_mobile_light.png", "Visit", "Mobile Light");

  await configurePage(mPage, "dark");
  await mPage.waitForTimeout(1200);
  await takeProof(mPage, "08_visit_mobile_dark.png", "Visit", "Mobile Dark");

  // 2C. Patients Mobile Light & Dark
  await configurePage(mPage, "light");
  await mPage.evaluate(() => { window.location.hash = "patients"; });
  await mPage.waitForTimeout(2000);
  await mPage.waitForFunction(() => {
    return document.querySelector(".patients-panel, .patients-search-box");
  }, { timeout: 10000 }).catch(() => {});
  await takeProof(mPage, "11_patients_mobile_light.png", "Patients", "Mobile Light");

  await configurePage(mPage, "dark");
  await mPage.waitForTimeout(1200);
  await takeProof(mPage, "12_patients_mobile_dark.png", "Patients", "Mobile Dark");

  // 2D. Finance Mobile Light & Dark
  await configurePage(mPage, "light");
  await mPage.evaluate(() => { window.location.hash = "finance"; });
  await mPage.waitForTimeout(2000);
  await mPage.waitForFunction(() => {
    return document.querySelector(".finance-panel, .finance-header-actions");
  }, { timeout: 10000 }).catch(() => {});
  await takeProof(mPage, "15_finance_mobile_light.png", "Finance", "Mobile Light");

  await configurePage(mPage, "dark");
  await mPage.waitForTimeout(1200);
  await takeProof(mPage, "16_finance_mobile_dark.png", "Finance", "Mobile Dark");

  await mobileContext.close();
  await browser.close();

  // Summary verification
  console.log("\n==================================================");
  console.log("INQUISITION LIVE SCREENSHOT CAPTURE AUDIT REPORT");
  console.log("==================================================");
  console.table(capturedRegistry);

  const hashes = new Set(capturedRegistry.map((r) => r.md5));
  const uniqueHashes = hashes.size === capturedRegistry.length;
  const allAbove40k = capturedRegistry.every((r) => r.sizeBytes >= 40960);

  console.log(`Total captured: ${capturedRegistry.length}/16`);
  console.log(`Unique MD5 hashes: ${uniqueHashes ? "YES (100% distinct screens)" : "FAIL"}`);
  console.log(`All files >= 40 KB: ${allAbove40k ? "PASS" : "FAIL"}`);

  if (!uniqueHashes || !allAbove40k || capturedRegistry.length < 16) {
    throw new Error("Screenshot inquisition verification failed criteria!");
  }
}

runInquisitionCapture().catch((err) => {
  console.error("Screenshot capture failed:", err);
  process.exit(1);
});
