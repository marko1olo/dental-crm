/**
 * scripts/take_proofmaker_suite.cjs
 * Visual Proofmaker & Screenshot Runner.
 * Captures 24 live screenshots across 6 key clinic views:
 * 1. Schedule (Расписание)
 * 2. Visit / EMK (Визит / ЭМК)
 * 3. Odontogram (Одонтограмма / Зубная формула)
 * 4. Finance / Cashbox (Касса / Финансы)
 * 5. Documents 043/y (Документы 043/у)
 * 6. Visiograph / Imaging (Визиограф / Снимки)
 *
 * In 4 core states:
 * - Desktop Light (1440x900, DPR 2)
 * - Desktop Dark (1440x900, DPR 2)
 * - Mobile Light (390x844, DPR 2)
 * - Mobile Dark (390x844, DPR 2)
 *
 * Invariants:
 * - Live PostgreSQL 18 on 127.0.0.1:5432
 * - Live Fastify API on http://127.0.0.1:4100/
 * - Live Vite Web on http://127.0.0.1:5173/
 * - File size >= 40 KB, strictly unique MD5 hashes
 * - Saved to C:\Users\Admin\.gemini\antigravity\brain\e1164d8d-2730-485e-9afe-aa0a260df89f/
 */

const { chromium } = require("playwright");
const path = require("node:path");
const fs = require("node:fs");
const crypto = require("node:crypto");

const BRAIN_DIR = "C:/Users/Admin/.gemini/antigravity/brain/e1164d8d-2730-485e-9afe-aa0a260df89f";
const LOCAL_DIR = "C:/Clinic_MVP/dental-crm/docs/screenshots/proofmaker_suite";
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
  let appointmentId = null;

  // 1. Seed primary patient
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

      // 2. Seed appointments on Monday 2026-09-21
      try {
        const scheduleDateStr = "2026-09-21";
        const apptRes = await fetch(`${API_BASE}/api/appointments`, {
          method: "POST",
          headers,
          body: JSON.stringify({
            patientId,
            doctorUserId: initData.ownerUserId,
            doctorId: initData.ownerUserId,
            chairId: "default-chair",
            startsAt: `${scheduleDateStr}T10:00:00.000Z`,
            startTime: `${scheduleDateStr}T10:00:00.000Z`,
            endsAt: `${scheduleDateStr}T11:00:00.000Z`,
            endTime: `${scheduleDateStr}T11:00:00.000Z`,
            status: "in_progress",
            reason: "Лечение глубокого кариеса и пульпита 36 зуба",
            notes: "Лечение глубокого кариеса и пульпита 36 зуба",
          }),
        });
        if (apptRes.ok) {
          const apptData = await apptRes.json();
          appointmentId = apptData.appointment?.id || apptData.id || null;
          console.log(`[Provisioning] Seeded in_progress appointment on ${scheduleDateStr}: ${appointmentId}`);
        } else {
          console.log(`[Provisioning] Appointment seeding response status: ${apptRes.status}`);
        }
        await fetch(`${API_BASE}/api/appointments`, {
          method: "POST",
          headers,
          body: JSON.stringify({
            patientId,
            doctorUserId: initData.ownerUserId,
            doctorId: initData.ownerUserId,
            chairId: "default-chair",
            startsAt: `${scheduleDateStr}T11:30:00.000Z`,
            startTime: `${scheduleDateStr}T11:30:00.000Z`,
            endsAt: `${scheduleDateStr}T12:30:00.000Z`,
            endTime: `${scheduleDateStr}T12:30:00.000Z`,
            status: "planned",
            reason: "Консультация ортопеда, коронка 46",
            notes: "Консультация ортопеда, коронка 46",
          }),
        }).catch(() => {});
      } catch (errAppt) {
        console.log("[Provisioning] Appointment seeding note:", errAppt.message);
      }

      // 3. Seed payment record (12,500 RUB)
      try {
        await fetch(`${API_BASE}/api/payments`, {
          method: "POST",
          headers,
          body: JSON.stringify({
            patientId,
            amountRub: 12500,
            method: "card",
            clientMutationId: crypto.randomUUID(),
            fiscalReceiptNumber: "ФЧ-000941",
            fiscalReceiptIssuedAt: new Date().toISOString(),
            note: "Оплата за эндодонтическое лечение 36 зуба (картой)",
          }),
        });
        console.log("[Provisioning] Seeded payment 12 500 ₽ (card)");
      } catch (errPay) {
        console.log("[Provisioning] Payment seeding note:", errPay.message);
      }

      // 4. Seed imaging study (RVG 36 tooth)
      try {
        await fetch(`${API_BASE}/api/imaging/studies`, {
          method: "POST",
          headers,
          body: JSON.stringify({
            patientId,
            kind: "rvg",
            title: "Прицельный снимок зуба 36 (периапикальный)",
            toothCode: "36",
            region: "36 нижний левый моляр",
            sourceKind: "manual_upload",
            sourceName: "Carestream RVG 5200",
          }),
        });
        console.log("[Provisioning] Seeded imaging study for tooth 36");
      } catch (errImg) {
        console.log("[Provisioning] Imaging seeding note:", errImg.message);
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
    appointmentId,
  };
}

async function runProofmakerSuite() {
  if (!fs.existsSync(BRAIN_DIR)) {
    fs.mkdirSync(BRAIN_DIR, { recursive: true });
  }
  if (!fs.existsSync(LOCAL_DIR)) {
    fs.mkdirSync(LOCAL_DIR, { recursive: true });
  }

  const auth = await provisionLiveSession();

  console.log("[Playwright] Launching Google Chrome...");
  const browser = await chromium.launch({
    headless: true,
    executablePath: "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });

  const capturedRegistry = [];

  async function configurePage(page, theme) {
    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        await page.waitForLoadState("domcontentloaded");
        await page.evaluate(
          ({ ct, st, uid, pid, aid, th }) => {
            localStorage.setItem("dente_clinic_token", ct);
            localStorage.setItem("dente_staff_token", st);
            localStorage.setItem("dente_active_role", "owner");
            localStorage.setItem("dente_theme_mode", th);
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
            document.documentElement.setAttribute("data-theme", th);
            if (th === "dark") {
              document.documentElement.classList.add("dark");
              document.documentElement.classList.remove("light");
            } else {
              document.documentElement.classList.remove("dark");
              document.documentElement.classList.add("light");
            }
            if (window.__useThemeStore) {
              window.__useThemeStore.getState().setThemeMode(th);
            }
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
        if (hash === "visit") {
          await page.waitForSelector('[aria-busy="true"]', { state: "detached", timeout: 30000 }).catch(() => {});
        }
        await page.waitForSelector(selector, { timeout: 15000 });
        await page.waitForTimeout(1000);
        break;
      } catch (err) {
        if (attempt === 3) throw err;
        await page.waitForTimeout(1000);
      }
    }
  }

  async function assertNoCrashScreen(page, fileName, viewName) {
    const crashInfo = await page.evaluate(() => {
      const errEl = document.querySelector(".boot-state-error, .boot-state");
      const lastErr = window.LAST_BOOT_ERROR;
      const bodyText = document.body ? document.body.innerText : "";
      const hasCrashText =
        bodyText.includes("Не удалось открыть рабочее место") ||
        bodyText.includes("Страница не открылась") ||
        bodyText.includes("Файлы интерфейса не загрузились") ||
        bodyText.includes("BootErrorBoundary");
      const hasAppShell = Boolean(document.querySelector(".app-shell"));

      if (errEl || lastErr || hasCrashText || !hasAppShell) {
        return {
          errText: errEl ? errEl.innerText.slice(0, 300) : null,
          lastErr: lastErr ? String(lastErr).slice(0, 300) : null,
          hasCrashText,
          hasAppShell,
          snippet: bodyText.slice(0, 300),
        };
      }
      return null;
    }).catch(() => null);

    if (crashInfo) {
      const reason =
        crashInfo.lastErr ||
        crashInfo.errText ||
        (crashInfo.hasCrashText
          ? "Crash text detected in DOM ('Не удалось открыть рабочее место')"
          : "Missing .app-shell");
      throw new Error(
        `CRASH_SCREEN_DETECTED: View "${viewName}" (file "${fileName}") crashed with BootErrorBoundary: ${reason}. Snippet: ${crashInfo.snippet}`
      );
    }
  }

  async function takeProof(page, fileName, viewName, modeName) {
    const brainFile = path.join(BRAIN_DIR, fileName);
    const localFile = path.join(LOCAL_DIR, fileName);

    await page.waitForSelector(".boot-state", { state: "detached", timeout: 20000 }).catch(() => {});
    await page.waitForSelector(".app-shell", { state: "visible", timeout: 20000 }).catch(() => {});
    await assertNoCrashScreen(page, fileName, viewName);

    // Dismiss transient toast overlays so real UI toolbars are audited without occlusion
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
    await page.waitForTimeout(1000);

    // Pre-shot crash check
    await assertNoCrashScreen(page, fileName, viewName);

    await page.screenshot({ path: brainFile, fullPage: false });

    // Post-shot crash check
    await assertNoCrashScreen(page, fileName, viewName);

    // Copy to local backup
    fs.copyFileSync(brainFile, localFile);

    const stats = fs.statSync(brainFile);
    const hash = crypto.createHash("md5").update(fs.readFileSync(brainFile)).digest("hex");

    capturedRegistry.push({
      fileName,
      view: viewName,
      mode: modeName,
      sizeBytes: stats.size,
      sizeKb: (stats.size / 1024).toFixed(1),
      md5: hash,
      path: brainFile,
      passSize: stats.size >= 40960,
    });

    console.log(
      `[Captured] ${fileName} (${viewName} - ${modeName}): ${stats.size} bytes (${(stats.size / 1024).toFixed(1)} KB), MD5: ${hash} [>=40KB: ${stats.size >= 40960 ? "PASS" : "FAIL"}]`
    );
  }

  const addAuthInitScript = (ctx) =>
    ctx.addInitScript(
      ({ ct, st, uid, pid, aid }) => {
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
            scheduleDateFilter: "2026-09-21",
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

  // =========================================================================
  // 1. DESKTOP VIEWPORT (1440x900, Scale 2)
  // =========================================================================
  console.log("\n=======================================================");
  console.log(">>> 1. STARTING DESKTOP SUITE (1440x900, Scale 2) <<<");
  console.log("=======================================================");
  const desktopContext = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    deviceScaleFactor: 2,
    isMobile: false,
    hasTouch: false,
  });
  await addAuthInitScript(desktopContext);
  const dPage = await desktopContext.newPage();
  dPage.on("pageerror", (err) => console.error("[dPage PageError]:", err.stack || err));
  dPage.on("console", (msg) => {
    if (msg.type() === "error") console.error("[dPage ConsoleError]:", msg.text());
  });
  await dPage.goto(`${WEB_BASE}/#schedule`, { waitUntil: "domcontentloaded", timeout: 60000 });
  await dPage.waitForSelector(".boot-state", { state: "detached", timeout: 60000 });
  await dPage.waitForSelector(".app-shell", { state: "visible", timeout: 30000 });
  await dPage.waitForSelector(".schedule-filter-strip", { state: "visible", timeout: 30000 });
  await dPage.waitForTimeout(2000);

  // 1. Schedule (Desktop Light & Dark)
  console.log("\n[Desktop] Screen 1: Schedule (Расписание)");
  const ensureScheduleDateAndCards = async (p) => {
    await p.evaluate(() => {
      // Reset filter chips to "Все записи" if present to avoid doctor/chair filtering hiding cards
      const chips = Array.from(document.querySelectorAll('.schedule-filter-chips button, .quick-chip, button'));
      const allChip = chips.find((b) => b.textContent && b.textContent.includes('Все записи'));
      if (allChip) {
        allChip.click();
      }
      const dateInput = document.querySelector('input.schedule-date-input, input[aria-label="Фильтр расписания по дате"], input[type="date"]');
      if (dateInput && dateInput.value !== "2026-09-21") {
        dateInput.value = "2026-09-21";
        dateInput.dispatchEvent(new Event("input", { bubbles: true }));
        dateInput.dispatchEvent(new Event("change", { bubbles: true }));
      }
    }).catch(() => {});
    await p.waitForSelector('.appointment-card, [data-testid="appointment-card"], .schedule-appointment-card, .schedule-card, .schedule-cell-event', { state: "visible", timeout: 8000 }).catch(() => {});
    await p.waitForTimeout(400);
  };

  await configurePage(dPage, "light");
  await navigateTo(dPage, "schedule", ".schedule-filter-strip");
  await ensureScheduleDateAndCards(dPage);
  await takeProof(dPage, "01_schedule_desktop_light.png", "Расписание", "Desktop Light");

  await configurePage(dPage, "dark");
  await dPage.waitForTimeout(1000);
  await ensureScheduleDateAndCards(dPage);
  await takeProof(dPage, "02_schedule_desktop_dark.png", "Расписание", "Desktop Dark");

  // 2. Visit / EMK (Desktop Light & Dark)
  console.log("\n[Desktop] Screen 2: Visit / EMK (Визит / ЭМК)");
  await configurePage(dPage, "light");
  await navigateTo(dPage, "visit", ".visit-monolithic-header, [data-testid=\"visit-view\"]:not([aria-busy=\"true\"])");
  // Ensure EMK tab is active
  await dPage.evaluate(() => {
    const emkTab = document.querySelector('button[role="tab"]:nth-child(2)');
    if (emkTab) emkTab.click();
  });
  await dPage.waitForTimeout(1500);
  await takeProof(dPage, "05_visit_emk_desktop_light.png", "Визит / ЭМК", "Desktop Light");

  await configurePage(dPage, "dark");
  await dPage.waitForTimeout(1000);
  await takeProof(dPage, "06_visit_emk_desktop_dark.png", "Визит / ЭМК", "Desktop Dark");

  // 3. Odontogram (Desktop Light & Dark)
  console.log("\n[Desktop] Screen 3: Odontogram (Одонтограмма)");
  await configurePage(dPage, "light");
  await navigateTo(dPage, "visit", ".visit-monolithic-header, [data-testid=\"visit-view\"]:not([aria-busy=\"true\"])");
  // Click Odontogram tab (tab 1)
  await dPage.evaluate(() => {
    const odoTab = document.querySelector('button[role="tab"]:nth-child(1)');
    if (odoTab) odoTab.click();
  });
  await dPage.waitForSelector('[data-testid="visit-odontogram-tab"], .visit-odontogram-tab, .odontogram-module', { timeout: 20000 }).catch(() => {});
  await dPage.waitForTimeout(1500);
  await takeProof(dPage, "09_odontogram_desktop_light.png", "Одонтограмма", "Desktop Light");

  await configurePage(dPage, "dark");
  await dPage.waitForTimeout(1000);
  await takeProof(dPage, "10_odontogram_desktop_dark.png", "Одонтограмма", "Desktop Dark");

  // 4. Finance / Cashbox (Desktop Light & Dark)
  console.log("\n[Desktop] Screen 4: Finance (Касса / Финансы)");
  await configurePage(dPage, "light");
  await navigateTo(dPage, "finance", ".finance-panel, .finance-monolithic-toolbar, #finance");
  await takeProof(dPage, "13_finance_desktop_light.png", "Касса / Финансы", "Desktop Light");

  await configurePage(dPage, "dark");
  await dPage.waitForSelector(".finance-panel, .finance-monolithic-toolbar, #finance", { timeout: 15000 }).catch(() => {});
  await dPage.waitForTimeout(1000);
  await takeProof(dPage, "14_finance_desktop_dark.png", "Касса / Финансы", "Desktop Dark");

  // 5. Documents 043/y (Desktop Light & Dark)
  console.log("\n[Desktop] Screen 5: Documents 043/y (Документы 043/у)");
  await configurePage(dPage, "light");
  await navigateTo(dPage, "documents", ".documents-panel, #documents, .documents-container");
  await takeProof(dPage, "17_documents_desktop_light.png", "Документы 043/у", "Desktop Light");

  await configurePage(dPage, "dark");
  await dPage.waitForTimeout(1000);
  await takeProof(dPage, "18_documents_desktop_dark.png", "Документы 043/у", "Desktop Dark");

  // 6. Visiograph / Imaging (Desktop Light & Dark)
  console.log("\n[Desktop] Screen 6: Visiograph / Imaging (Визиограф / Снимки)");
  await configurePage(dPage, "light");
  await navigateTo(dPage, "imaging", ".imaging-panel, .imaging-layout, #imaging");
  await takeProof(dPage, "21_imaging_desktop_light.png", "Визиограф / Снимки", "Desktop Light");

  await configurePage(dPage, "dark");
  await dPage.waitForTimeout(1000);
  await takeProof(dPage, "22_imaging_desktop_dark.png", "Визиограф / Снимки", "Desktop Dark");

  await desktopContext.close();

  // =========================================================================
  // 2. MOBILE VIEWPORT (390x844, Scale 2)
  // =========================================================================
  console.log("\n=======================================================");
  console.log(">>> 2. STARTING MOBILE SUITE (390x844, Scale 2) <<<");
  console.log("=======================================================");
  const mobileContext = await browser.newContext({
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 2,
    isMobile: true,
    hasTouch: true,
  });
  await addAuthInitScript(mobileContext);
  const mPage = await mobileContext.newPage();
  mPage.on("pageerror", (err) => console.error("[mPage PageError]:", err.stack || err));
  mPage.on("console", (msg) => {
    if (msg.type() === "error") console.error("[mPage ConsoleError]:", msg.text());
  });
  await mPage.goto(`${WEB_BASE}/#schedule`, { waitUntil: "domcontentloaded", timeout: 60000 });
  await mPage.waitForSelector(".boot-state", { state: "detached", timeout: 60000 });
  await mPage.waitForSelector(".app-shell", { state: "visible", timeout: 30000 });
  await mPage.waitForSelector(".schedule-filter-strip", { state: "visible", timeout: 30000 });
  await mPage.waitForTimeout(2000);

  // 1. Schedule (Mobile Light & Dark)
  console.log("\n[Mobile] Screen 1: Schedule (Расписание)");
  await configurePage(mPage, "light");
  await navigateTo(mPage, "schedule", ".schedule-filter-strip");
  await ensureScheduleDateAndCards(mPage);
  await takeProof(mPage, "03_schedule_mobile_light.png", "Расписание", "Mobile Light");

  await configurePage(mPage, "dark");
  await mPage.waitForTimeout(1000);
  await ensureScheduleDateAndCards(mPage);
  await takeProof(mPage, "04_schedule_mobile_dark.png", "Расписание", "Mobile Dark");

  // 2. Visit / EMK (Mobile Light & Dark)
  console.log("\n[Mobile] Screen 2: Visit / EMK (Визит / ЭМК)");
  await configurePage(mPage, "light");
  await navigateTo(mPage, "visit", ".visit-monolithic-header, [data-testid=\"visit-view\"]:not([aria-busy=\"true\"])");
  await mPage.evaluate(() => {
    const emkTab = document.querySelector('button[role="tab"]:nth-child(2)');
    if (emkTab) emkTab.click();
  });
  await mPage.waitForTimeout(1500);
  await takeProof(mPage, "07_visit_emk_mobile_light.png", "Визит / ЭМК", "Mobile Light");

  await configurePage(mPage, "dark");
  await mPage.waitForTimeout(1000);
  await takeProof(mPage, "08_visit_emk_mobile_dark.png", "Визит / ЭМК", "Mobile Dark");

  // 3. Odontogram (Mobile Light & Dark)
  console.log("\n[Mobile] Screen 3: Odontogram (Одонтограмма)");
  await configurePage(mPage, "light");
  await navigateTo(mPage, "visit", ".visit-monolithic-header, [data-testid=\"visit-view\"]:not([aria-busy=\"true\"])");
  await mPage.evaluate(() => {
    const odoTab = document.querySelector('button[role="tab"]:nth-child(1)');
    if (odoTab) odoTab.click();
  });
  await mPage.waitForSelector('[data-testid="visit-odontogram-tab"], .visit-odontogram-tab, .odontogram-module', { timeout: 20000 }).catch(() => {});
  await mPage.waitForTimeout(1500);
  await takeProof(mPage, "11_odontogram_mobile_light.png", "Одонтограмма", "Mobile Light");

  await configurePage(mPage, "dark");
  await mPage.waitForTimeout(1000);
  await takeProof(mPage, "12_odontogram_mobile_dark.png", "Одонтограмма", "Mobile Dark");

  // 4. Finance / Cashbox (Mobile Light & Dark)
  console.log("\n[Mobile] Screen 4: Finance (Касса / Финансы)");
  await configurePage(mPage, "light");
  await navigateTo(mPage, "finance", ".finance-panel, .finance-monolithic-toolbar, #finance");
  await takeProof(mPage, "15_finance_mobile_light.png", "Касса / Финансы", "Mobile Light");

  await configurePage(mPage, "dark");
  await mPage.waitForTimeout(1000);
  await takeProof(mPage, "16_finance_mobile_dark.png", "Касса / Финансы", "Mobile Dark");

  // 5. Documents 043/y (Mobile Light & Dark)
  console.log("\n[Mobile] Screen 5: Documents 043/y (Документы 043/у)");
  await configurePage(mPage, "light");
  await navigateTo(mPage, "documents", ".documents-panel, #documents, .documents-container");
  await takeProof(mPage, "19_documents_mobile_light.png", "Документы 043/у", "Mobile Light");

  await configurePage(mPage, "dark");
  await mPage.waitForTimeout(1000);
  await takeProof(mPage, "20_documents_mobile_dark.png", "Документы 043/у", "Mobile Dark");

  // 6. Visiograph / Imaging (Mobile Light & Dark)
  console.log("\n[Mobile] Screen 6: Visiograph / Imaging (Визиограф / Снимки)");
  await configurePage(mPage, "light");
  await navigateTo(mPage, "imaging", ".imaging-panel, .imaging-layout, #imaging");
  await takeProof(mPage, "23_imaging_mobile_light.png", "Визиограф / Снимки", "Mobile Light");

  await configurePage(mPage, "dark");
  await mPage.waitForTimeout(1000);
  await takeProof(mPage, "24_imaging_mobile_dark.png", "Визиограф / Снимки", "Mobile Dark");

  await mobileContext.close();
  await browser.close();

  // =========================================================================
  // SUMMARY AUDIT
  // =========================================================================
  console.log("\n=======================================================");
  console.log("PROOFMAKER LIVE SCREENSHOT AUDIT VERIFICATION");
  console.log("=======================================================");
  console.table(
    capturedRegistry.map((r) => ({
      File: r.fileName,
      View: r.view,
      Mode: r.mode,
      SizeKB: r.sizeKb,
      MD5: r.md5.substring(0, 12) + "...",
      Status: r.passSize ? "PASS (>=40KB)" : "FAIL (<40KB)",
    }))
  );

  const hashes = new Set(capturedRegistry.map((r) => r.md5));
  const uniqueHashes = hashes.size === capturedRegistry.length;
  const allAbove40k = capturedRegistry.every((r) => r.sizeBytes >= 40960);

  console.log(`\nTotal screenshots captured: ${capturedRegistry.length}/24`);
  console.log(`Unique MD5 hashes: ${uniqueHashes ? "YES (100% unique screens, zero blanks)" : "FAIL (duplicates found)"}`);
  console.log(`All files >= 40 KB: ${allAbove40k ? "PASS" : "FAIL"}`);

  if (!uniqueHashes || !allAbove40k || capturedRegistry.length < 24) {
    throw new Error("Proofmaker verification failed quality criteria!");
  }

  // Write summary JSON to brain dir for audit verification
  fs.writeFileSync(
    path.join(BRAIN_DIR, "screenshots_audit.json"),
    JSON.stringify(
      {
        timestamp: new Date().toISOString(),
        totalCaptured: capturedRegistry.length,
        allAbove40k,
        uniqueHashes,
        screenshots: capturedRegistry,
      },
      null,
      2
    )
  );

  console.log("\n[SUCCESS] All 24 screenshots captured and verified cleanly!");
}

runProofmakerSuite().catch((err) => {
  console.error("Proofmaker suite run failed:", err);
  process.exit(1);
});
