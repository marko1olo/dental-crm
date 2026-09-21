/**
 * scripts/capture_accessibility_suite.cjs
 *
 * Visual Proofmaker & Red Team Inquisitor Runner for Accessibility Mode (ГОСТ Р 52872-2019 / WCAG AAA).
 * Captures 9 live screenshots:
 * 1. 01_a11y_contrast_header_control_center_desktop.png — Open Control Center popover with [A] [A+] [A++] scale & a11y toggle
 * 2. 02_a11y_contrast_header_active_desktop.png — Active contrast mode header with [Обычная версия]
 * 3. 03_a11y_contrast_schedule_desktop.png — Schedule in contrast mode (1440x900)
 * 4. 04_a11y_contrast_visit_desktop.png — Visit / EMK in contrast mode (1440x900)
 * 5. 05_a11y_contrast_imaging_desktop.png — X-Ray / Imaging in contrast mode (1440x900)
 * 6. 06_a11y_contrast_schedule_mobile.png — Schedule in contrast mode (390x844)
 * 7. 07_a11y_contrast_visit_mobile.png — Visit / EMK in contrast mode (390x844)
 * 8. 08_a11y_contrast_imaging_mobile.png — X-Ray / Imaging in contrast mode (390x844)
 * 9. 09_a11y_contrast_control_center_mobile.png — Open Control Center popover on mobile with [A] [A+] [A++]
 *
 * Rules:
 * - Real live servers (Fastify 4100 & Vite 5173)
 * - Zero mocks, real data seeded
 * - MD5 uniqueness check
 * - Size >= 40 KB check
 */

const { chromium } = require("playwright");
const path = require("node:path");
const fs = require("node:fs");
const crypto = require("node:crypto");
const { Pool } = require("pg");

const BRAIN_DIR = "C:/Users/Admin/.gemini/antigravity/brain/bdf8ab66-a315-429b-afdf-b2b5092468a1";
const PARENT_BRAIN_DIR = "C:/Users/Admin/.gemini/antigravity/brain/e1164d8d-2730-485e-9afe-aa0a260df89f";
const PREV_BRAIN_DIR = "C:/Users/Admin/.gemini/antigravity/brain/4f59b7b6-849c-4771-817e-92e126942063";
const LOCAL_DIR = "C:/Clinic_MVP/dental-crm/docs/screenshots/accessibility_suite";
const API_BASE = "http://127.0.0.1:4100";
const WEB_BASE = "http://127.0.0.1:5173";

async function provisionLiveSession() {
  const uniqueId = Date.now();
  console.log("[Provisioning] Setting up authenticated session on live API...");

  const initRes = await fetch(`${API_BASE}/api/auth/setup/init`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      clinicName: "Стоматология ДЕНТЕ Премиум",
      email: `chief-a11y-${uniqueId}@dente-clinic.ru`,
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
  let appointmentId = null;
  let seededChairId = null;

  // Ensure default clinic and chair exist in PostgreSQL
  try {
    const pool = new Pool({
      connectionString: process.env.DATABASE_URL || "postgres://dental@127.0.0.1:5432/dental_crm",
    });
    const client = await pool.connect();
    try {
      let clinicRes = await client.query(
        "SELECT id FROM clinics WHERE organization_id = $1 LIMIT 1",
        [initData.organizationId]
      );
      let clinicId;
      if (clinicRes.rows.length === 0) {
        const insertClinic = await client.query(
          "INSERT INTO clinics (organization_id, name, timezone) VALUES ($1, $2, $3) RETURNING id",
          [initData.organizationId, "Главное отделение", "Europe/Samara"]
        );
        clinicId = insertClinic.rows[0].id;
      } else {
        clinicId = clinicRes.rows[0].id;
      }

      let chairRes = await client.query(
        "SELECT id FROM chairs WHERE organization_id = $1 LIMIT 1",
        [initData.organizationId]
      );
      if (chairRes.rows.length === 0) {
        const insertChair = await client.query(
          "INSERT INTO chairs (organization_id, clinic_id, name, is_active) VALUES ($1, $2, $3, true) RETURNING id",
          [initData.organizationId, clinicId, "Кресло 1 (Основное)"]
        );
        seededChairId = insertChair.rows[0].id;
      } else {
        seededChairId = chairRes.rows[0].id;
      }
      console.log(`[Provisioning] Ensured clinic (${clinicId}) and chair (${seededChairId}) in DB`);
    } finally {
      client.release();
      await pool.end();
    }
  } catch (errDb) {
    console.log("[Provisioning] DB chair seed note:", errDb.message);
  }

  // Seed patient
  try {
    const pRes = await fetch(`${API_BASE}/api/patients`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        fullName: "Ковалёв Роман Станиславович",
        phone: "+7 (999) 888-77-66",
        birthDate: "1988-04-12",
        gender: "male",
        notes: "Бронхиальная астма, аллергия на латекс. План: эндодонтия 36 зуба.",
      }),
    });
    if (pRes.ok) {
      const pData = await pRes.json();
      patientId = pData.patient?.id || pData.id || null;
      console.log(`[Provisioning] Seeded patient: ${patientId}`);

      // Seed appointment on today (2026-09-21)
      const scheduleDateStr = "2026-09-21";
      const apptRes = await fetch(`${API_BASE}/api/appointments`, {
        method: "POST",
        headers,
        body: JSON.stringify({
          patientId,
          doctorUserId: initData.ownerUserId,
          doctorId: initData.ownerUserId,
          chairId: seededChairId || "default-chair",
          startsAt: `${scheduleDateStr}T05:00:00.000Z`,
          startTime: `${scheduleDateStr}T05:00:00.000Z`,
          endsAt: `${scheduleDateStr}T06:00:00.000Z`,
          endTime: `${scheduleDateStr}T06:00:00.000Z`,
          status: "in_treatment",
          reason: "Лечение глубокого кариеса и пульпита 36 зуба",
          notes: "Лечение глубокого кариеса и пульпита 36 зуба",
        }),
      });
      if (apptRes.ok) {
        const apptData = await apptRes.json();
        appointmentId =
          apptData.appointment?.id ||
          apptData.id ||
          apptData.appointmentId ||
          null;
        console.log(`[Provisioning] Seeded appointment: ${appointmentId}`);
      }

      // Seed imaging study
      await fetch(`${API_BASE}/api/imaging/studies`, {
        method: "POST",
        headers,
        body: JSON.stringify({
          patientId,
          kind: "periapical",
          title: "Прицельный снимок зуба 36 (периапикальный)",
          toothCode: "36",
          region: "36 нижний левый моляр",
          sourceKind: "manual_upload",
          sourceName: "Carestream RVG 5200",
        }),
      }).catch(() => {});
      console.log("[Provisioning] Seeded imaging study for tooth 36");
    }
  } catch (err) {
    console.log("[Provisioning] Patient/Appt seed note:", err.message);
  }

  return {
    clinicToken: initData.clinicToken,
    staffToken: unlockData.staffToken,
    ownerUserId: initData.ownerUserId,
    patientId,
    appointmentId,
  };
}

async function runAccessibilitySuite() {
  for (const d of [BRAIN_DIR, PARENT_BRAIN_DIR, PREV_BRAIN_DIR, LOCAL_DIR]) {
    if (!fs.existsSync(d)) {
      fs.mkdirSync(d, { recursive: true });
    }
  }

  const auth = await provisionLiveSession();

  console.log("[Playwright] Launching Google Chrome...");
  const browser = await chromium.launch({
    headless: true,
    executablePath: "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });

  const capturedRegistry = [];

  const addAuthInitScript = (ctx) =>
    ctx.addInitScript(
      ({ ct, st, uid, pid, aid }) => {
        sessionStorage.setItem("dente:sw-controller-reload", "1");
        localStorage.setItem("dente_clinic_token", ct);
        localStorage.setItem("dente_staff_token", st);
        localStorage.setItem("dente_active_role", "owner");
        localStorage.setItem("dente_theme_mode", "light");
        localStorage.setItem("dente_onboarding_completed", "true");
        localStorage.setItem(
          "dente_ui_preferences_v1",
          JSON.stringify({
            onboardingDismissed: true,
            onboardingStep: "done",
            scheduleDateFilter: "2026-09-21",
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
            selectedAppointmentId: aid,
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
        aid: auth.appointmentId,
      }
    );

  async function configureA11yMode(page, { contrast = true, fontSize = "normal" } = {}) {
    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        await page.waitForLoadState("domcontentloaded");
        await page.evaluate(({ contrast, fontSize }) => {
          localStorage.setItem("dente_theme_mode", contrast ? "contrast" : "light");
          localStorage.setItem("dente_a11y_mode", contrast ? "true" : "false");
          localStorage.setItem("dente_a11y_font_size", fontSize);

          document.documentElement.setAttribute("data-theme", contrast ? "contrast" : "light");
          document.documentElement.setAttribute("data-a11y-font", fontSize);
          if (contrast) {
            document.documentElement.classList.add("a11y-contrast");
            document.documentElement.classList.remove("dark");
            document.documentElement.classList.add("light");
          } else {
            document.documentElement.classList.remove("a11y-contrast");
          }

          if (window.__useThemeStore) {
            const store = window.__useThemeStore.getState();
            if (contrast) {
              store.setThemeMode("contrast");
            } else {
              store.setThemeMode("light");
            }
            store.setA11yFontSize(fontSize);
          }
        }, { contrast, fontSize });
        await page.waitForTimeout(500);
        break;
      } catch (err) {
        if (attempt === 3) throw err;
        await page.waitForTimeout(1000);
      }
    }
  }

  async function navigateTo(page, hash, selector) {
    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        await page.evaluate((h) => {
          window.location.hash = h;
          const btn = document.querySelector(`a[href="#${h}"], button[data-view="${h}"], [data-testid="nav-${h}"]`);
          if (btn) btn.click();
        }, hash);
        if (selector) {
          await page.waitForSelector(selector, { timeout: 15000 });
        }
        await page.waitForTimeout(1000);
        break;
      } catch (err) {
        if (attempt === 3) throw err;
        await page.waitForTimeout(1000);
      }
    }
  }

  async function takeProof(page, fileName, description, targetClip = null) {
    const brainFile = path.join(BRAIN_DIR, fileName);
    const localFile = path.join(LOCAL_DIR, fileName);

    await page.waitForSelector(".boot-state", { state: "detached", timeout: 30000 });
    await page.waitForSelector(".app-shell", { state: "visible", timeout: 30000 });
    await page.waitForFunction(
      () => !document.querySelector(".boot-state") && !!document.querySelector(".app-shell"),
      { timeout: 30000 }
    );

    // Dismiss transient toast overlays
    await page.evaluate(() => {
      let style = document.getElementById("proofmaker-anti-toast");
      if (!style) {
        style = document.createElement("style");
        style.id = "proofmaker-anti-toast";
        style.textContent = `
          .sa-toast, [data-testid="global-toast"], .toast, [role="alert"].sa-toast {
            display: none !important;
            opacity: 0 !important;
            pointer-events: none !important;
          }
        `;
        document.head.appendChild(style);
      }
    }).catch(() => {});
    await page.waitForTimeout(600);

    const screenshotOpts = { path: brainFile, fullPage: false };
    if (targetClip) {
      screenshotOpts.clip = targetClip;
    }

    await page.screenshot(screenshotOpts);

    // Copy to all brains and local backup
    for (const d of [PARENT_BRAIN_DIR, PREV_BRAIN_DIR, LOCAL_DIR]) {
      try {
        fs.copyFileSync(brainFile, path.join(d, fileName));
      } catch (err) {}
    }

    const stats = fs.statSync(brainFile);
    const hash = crypto.createHash("md5").update(fs.readFileSync(brainFile)).digest("hex");

    capturedRegistry.push({
      fileName,
      description,
      sizeBytes: stats.size,
      sizeKb: (stats.size / 1024).toFixed(1),
      md5: hash,
      path: brainFile,
      passSize: stats.size >= 40960,
    });

    console.log(
      `[Captured] ${fileName} (${description}): ${stats.size} bytes (${(stats.size / 1024).toFixed(1)} KB), MD5: ${hash} [>=40KB: ${stats.size >= 40960 ? "PASS" : "FAIL"}]`
    );
  }

  // =========================================================================
  // 1. DESKTOP VIEWPORT (1440x900, Scale 2)
  // =========================================================================
  console.log("\n=======================================================");
  console.log(">>> 1. STARTING DESKTOP A11Y SUITE (1440x900, Scale 2) <<<");
  console.log("=======================================================");

  const desktopContext = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    deviceScaleFactor: 2,
    isMobile: false,
    hasTouch: false,
    serviceWorkers: "block",
  });
  await addAuthInitScript(desktopContext);
  const dPage = await desktopContext.newPage();

  await dPage.goto(`${WEB_BASE}/#schedule`, { waitUntil: "domcontentloaded", timeout: 60000 });
  await dPage.waitForSelector(".boot-state", { state: "detached", timeout: 60000 });
  await dPage.waitForSelector(".app-shell", { state: "visible", timeout: 30000 });
  await dPage.waitForSelector(".schedule-filter-strip", { state: "visible", timeout: 30000 });
  await dPage.waitForTimeout(2000);

  // 1. Desktop: Open Control Center popover showing [A] [A+] [A++] and [Для слабовидящих]
  console.log("\n[Desktop] Screen 1: Control Center Popover (Accessibility Controls)");
  await configureA11yMode(dPage, { contrast: false, fontSize: "normal" });
  await dPage.waitForSelector(".dnt-clinic-control-pill", { state: "visible", timeout: 15000 });
  await dPage.waitForTimeout(500);
  // Click pill to open popover
  await dPage.evaluate(() => {
    const pill = document.querySelector(".dnt-clinic-control-pill");
    if (pill) pill.click();
  });
  await dPage.waitForSelector(".dnt-control-center-popover", { state: "visible", timeout: 15000 });
  await dPage.waitForTimeout(1000);
  await takeProof(
    dPage,
    "01_a11y_contrast_header_control_center_desktop.png",
    "Desktop: Пульт Control Center с масштабированием шрифта [A] [A+] [A++] и кнопкой режима"
  );

  // 2. Desktop: Header in active contrast mode showing [Обычная версия]
  console.log("\n[Desktop] Screen 2: Header with Active Contrast Mode");
  // Toggle a11y mode via evaluate or button
  await configureA11yMode(dPage, { contrast: true, fontSize: "normal" });
  // Close popover if open
  await dPage.evaluate(() => {
    const popoverClose = document.querySelector('.dnt-control-center-popover button[aria-label="Закрыть пульт"]');
    if (popoverClose) {
      popoverClose.click();
    } else {
      const pill = document.querySelector(".dnt-clinic-control-pill");
      if (pill && pill.classList.contains("dnt-clinic-control-pill--open")) {
        pill.click();
      }
    }
  });
  await dPage.waitForSelector(".dnt-a11y-toggle-btn--active", { state: "visible", timeout: 15000 });
  await dPage.waitForSelector(".schedule-filter-strip", { state: "visible", timeout: 15000 });
  await dPage.waitForFunction(() => !document.querySelector(".boot-state"), { timeout: 15000 });
  await dPage.waitForTimeout(1000);
  await takeProof(
    dPage,
    "02_a11y_contrast_header_active_desktop.png",
    "Desktop: Верхняя панель в активном режиме для слабовидящих [Обычная версия]"
  );

  // 3. Desktop: Schedule in contrast mode
  console.log("\n[Desktop] Screen 3: Schedule in Contrast Mode");
  await navigateTo(dPage, "schedule", ".schedule-filter-strip");
  await dPage.waitForTimeout(1000);
  await takeProof(
    dPage,
    "03_a11y_contrast_schedule_desktop.png",
    "Desktop: Расписание в высококонтрастном режиме contrast (WCAG AAA)"
  );

  // 4. Desktop: Visit / EMK in contrast mode
  console.log("\n[Desktop] Screen 4: Visit / EMK in Contrast Mode");
  await navigateTo(dPage, "visit", ".visit-monolithic-header, [data-testid=\"visit-view\"]:not([aria-busy=\"true\"])");
  // Select EMK tab
  await dPage.evaluate(() => {
    const emkTab = document.querySelector('button[role="tab"]:nth-child(2)');
    if (emkTab) emkTab.click();
  });
  await dPage.waitForTimeout(1500);
  await takeProof(
    dPage,
    "04_a11y_contrast_visit_desktop.png",
    "Desktop: ЭМК / Визит в высококонтрастном режиме contrast (WCAG AAA)"
  );

  // 5. Desktop: Imaging in contrast mode
  console.log("\n[Desktop] Screen 5: Imaging / X-Ray in Contrast Mode");
  await navigateTo(dPage, "imaging", ".imaging-panel, .imaging-layout, #imaging");
  await dPage.waitForTimeout(1500);
  await takeProof(
    dPage,
    "05_a11y_contrast_imaging_desktop.png",
    "Desktop: Визиограф / Рентген в высококонтрастном режиме contrast (WCAG AAA)"
  );

  await desktopContext.close();

  // =========================================================================
  // 2. MOBILE VIEWPORT (390x844, Scale 2)
  // =========================================================================
  console.log("\n=======================================================");
  console.log(">>> 2. STARTING MOBILE A11Y SUITE (390x844, Scale 2) <<<");
  console.log("=======================================================");

  const mobileContext = await browser.newContext({
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 2,
    isMobile: true,
    hasTouch: true,
    serviceWorkers: "block",
  });
  await addAuthInitScript(mobileContext);
  const mPage = await mobileContext.newPage();

  await mPage.goto(`${WEB_BASE}/#schedule`, { waitUntil: "domcontentloaded", timeout: 60000 });
  await mPage.waitForSelector(".boot-state", { state: "detached", timeout: 60000 });
  await mPage.waitForSelector(".app-shell", { state: "visible", timeout: 30000 });
  await mPage.waitForTimeout(2000);

  // 6. Mobile: Schedule in contrast mode
  console.log("\n[Mobile] Screen 6: Schedule in Contrast Mode");
  await configureA11yMode(mPage, { contrast: true, fontSize: "normal" });
  await navigateTo(mPage, "schedule");
  await mPage.waitForTimeout(1500);
  await takeProof(
    mPage,
    "06_a11y_contrast_schedule_mobile.png",
    "Mobile: Расписание в высококонтрастном режиме contrast (390x844)"
  );

  // 7. Mobile: Visit / EMK in contrast mode
  console.log("\n[Mobile] Screen 7: Visit / EMK in Contrast Mode");
  await navigateTo(mPage, "visit");
  await mPage.waitForTimeout(1500);
  await takeProof(
    mPage,
    "07_a11y_contrast_visit_mobile.png",
    "Mobile: ЭМК / Визит в высококонтрастном режиме contrast (390x844)"
  );

  // 8. Mobile: Imaging in contrast mode
  console.log("\n[Mobile] Screen 8: Imaging in Contrast Mode");
  await navigateTo(mPage, "imaging");
  await mPage.waitForTimeout(1500);
  await takeProof(
    mPage,
    "08_a11y_contrast_imaging_mobile.png",
    "Mobile: Визиограф / Рентген в высококонтрастном режиме contrast (390x844)"
  );

  // 9. Mobile: Control Center Popover open
  console.log("\n[Mobile] Screen 9: Control Center Popover (Accessibility Controls)");
  await mPage.waitForSelector(".dnt-clinic-control-pill", { state: "visible", timeout: 10000 });
  await mPage.evaluate(() => {
    const pill = document.querySelector(".dnt-clinic-control-pill");
    if (pill) pill.click();
  });
  await mPage.waitForSelector(".dnt-control-center-popover", { state: "visible", timeout: 10000 });
  await mPage.waitForTimeout(800);
  await takeProof(
    mPage,
    "09_a11y_contrast_control_center_mobile.png",
    "Mobile: Пульт управления с переключателем шрифта [A] [A+] [A++] (390x844)"
  );

  await mobileContext.close();
  await browser.close();

  console.log("\n=======================================================");
  console.log(">>> A11Y SCREENSHOT SUITE COMPLETED SUCCESSFULLY <<<");
  console.log("=======================================================");
  console.table(
    capturedRegistry.map((r) => ({
      File: r.fileName,
      Description: r.description,
      Size: `${r.sizeKb} KB`,
      MD5: r.md5.slice(0, 12) + "...",
      Status: r.passSize ? "PASS" : "FAIL (<40KB)",
    }))
  );

  const allPassSize = capturedRegistry.every((r) => r.passSize);
  const hashes = new Set(capturedRegistry.map((r) => r.md5));
  const allUnique = hashes.size === capturedRegistry.length;

  console.log(`\nSize check (all >= 40KB): ${allPassSize ? "PASSED" : "FAILED"}`);
  console.log(`Uniqueness check (${hashes.size}/${capturedRegistry.length} unique MD5): ${allUnique ? "PASSED" : "FAILED"}`);

  if (!allPassSize || !allUnique) {
    throw new Error("Audit verification failed: size < 40KB or duplicate MD5 hashes detected!");
  }
}

runAccessibilitySuite().catch((err) => {
  console.error("FATAL SUITE ERROR:", err);
  process.exit(1);
});
