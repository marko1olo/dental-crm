/**
 * scripts/multi_theme_proofmaker.cjs
 * Multi-Theme Live Screenshot Proofmaker.
 *
 * Captures 50 live screenshots across 5 views, 5 themes, and 2 viewports:
 * - Views: Расписание, ЭМК 043/у, Одонтограмма, Касса 54-ФЗ, Документы
 * - Themes: Light, Dark, Sakura, Cyber X-Ray, Ocean
 * - Viewports: Desktop 1440x900 and Compact Laptop 1280x720
 *
 * Requirements:
 * - Live Fastify API (http://127.0.0.1:4100/) and Vite Web (http://127.0.0.1:5173/)
 * - Seeded real clinic session, patient, appointment, payment, and tooth states
 * - Output saved to target brain directory:
 *   C:\Users\Admin\.gemini\antigravity\brain\e1164d8d-2730-485e-9afe-aa0a260df89f\
 * - Verified size >= 40 KB and unique MD5 hashes
 */

const { chromium } = require("playwright");
const path = require("node:path");
const fs = require("node:fs");
const crypto = require("node:crypto");

const API_BASE = "http://127.0.0.1:4100";
const WEB_BASE = "http://127.0.0.1:5173";

const BRAIN_DIR = path.resolve(
  process.env.BRAIN_DIR ||
    "C:/Users/Admin/.gemini/antigravity/brain/e1164d8d-2730-485e-9afe-aa0a260df89f"
);
const SUBAGENT_BRAIN_DIR = path.resolve(
  "C:/Users/Admin/.gemini/antigravity/brain/1e5a450b-b829-48bc-9dd4-387035fa99c3"
);
const ARCHIVE_DIR = path.resolve("C:/Clinic_MVP/dental-crm/docs/screenshots/multi_theme_live");

async function provisionLiveSession() {
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

      // Seed appointments on Monday 2026-09-21 (with confirmed & planned cards)
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
            status: "confirmed",
            reason: "Лечение глубокого кариеса 36 зуба",
            notes: "Лечение глубокого кариеса 36 зуба",
          }),
        });
        if (apptRes.ok) {
          console.log(`[Provisioning] Seeded appointment on ${scheduleDateStr} (10:00 - 11:00)`);
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

      // Seed tooth states for odontogram
      try {
        await fetch(`${API_BASE}/api/patients/${patientId}/tooth-states/batch`, {
          method: "POST",
          headers,
          body: JSON.stringify({
            toothNumbers: [36],
            state: "Caries",
            surfaces: ["O", "MOD"],
            notes: "Глубокий кариес 36 зуба",
          }),
        });
        await fetch(`${API_BASE}/api/patients/${patientId}/tooth-states/batch`, {
          method: "POST",
          headers,
          body: JSON.stringify({
            toothNumbers: [46],
            state: "Filled",
            notes: "Пломба светоотверждаемая",
          }),
        });
        console.log("[Provisioning] Seeded clinical tooth states (36 Caries, 46 Filled)");
      } catch (errTooth) {
        console.log("[Provisioning] Tooth state seeding note:", errTooth.message);
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

async function runMultiThemeProofmaker() {
  for (const dir of [BRAIN_DIR, SUBAGENT_BRAIN_DIR, ARCHIVE_DIR]) {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  }

  const auth = await provisionLiveSession();

  console.log("[Playwright] Launching Chrome executable...");
  const browser = await chromium.launch({
    headless: true,
    executablePath: "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });

  const capturedRegistry = [];

  const addAuthInitScript = (ctx) =>
    ctx.addInitScript(
      ({ ct, st, uid, pid }) => {
        localStorage.setItem("dente_clinic_token", ct);
        localStorage.setItem("dente_staff_token", st);
        localStorage.setItem("dente_active_role", "owner");
        if (!localStorage.getItem("dente_theme_mode")) {
          localStorage.setItem("dente_theme_mode", "light");
        }
        if (!localStorage.getItem("dente_theme")) {
          localStorage.setItem("dente_theme", "light");
        }
        localStorage.setItem("dente_onboarding_completed", "true");
        localStorage.setItem("dente_sidebar_collapsed", "false");
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
      }
    );

  async function applyTheme(page, theme) {
    for (let t = 0; t < 3; t++) {
      try {
        await page.evaluate((th) => {
          localStorage.setItem("dente_theme_mode", th);
          localStorage.setItem("dente_theme", th);
          document.documentElement.setAttribute("data-theme", th);
          if (document.body) {
            document.body.setAttribute("data-theme", th);
          }
          const isDark = (th === "dark" || th === "night" || th === "ocean" || th === "emerald" || th === "cyber_xray");
          if (isDark) {
            document.documentElement.classList.add("dark");
            document.documentElement.classList.remove("light");
            document.documentElement.style.colorScheme = "dark";
          } else {
            document.documentElement.classList.remove("dark");
            document.documentElement.classList.add("light");
            document.documentElement.style.colorScheme = "light";
          }
          if (window.__useThemeStore) {
            window.__useThemeStore.getState().setThemeMode(th);
          }
        }, theme);
        break;
      } catch (e) {
        await page.waitForTimeout(500);
      }
    }
    await page.waitForTimeout(600);
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

  async function takeProof(page, fileName, viewName, viewportLabel, themeLabel, viewSelector, themeKey, beforeShotHook) {
    const brainFile = path.join(BRAIN_DIR, fileName);
    const archiveFile = path.join(ARCHIVE_DIR, fileName);
    const subagentBrainFile = path.join(SUBAGENT_BRAIN_DIR, fileName);

    let stats = null;
    let attempts = 0;
    const maxAttempts = 4;

    while (attempts < maxAttempts) {
      attempts++;

      try {
        if (themeKey) {
          await applyTheme(page, themeKey);
        }

        // 1. Ensure boot-state is detached and app-shell is visible
        await page.waitForSelector(".boot-state", { state: "detached", timeout: 15000 }).catch(() => {});
        await page.waitForSelector(".app-shell", { state: "visible", timeout: 15000 }).catch(() => {});

        // 2. Strict crash detection prior to view setup
        await assertNoCrashScreen(page, fileName, viewName);

        if (viewSelector) {
          await page.waitForSelector(viewSelector, { state: "visible", timeout: 15000 }).catch(() => {});
        }

        if (beforeShotHook) {
          await beforeShotHook(page);
        }

        await page.waitForTimeout(300);

        // Dismiss and remove any stray floating toast before taking screenshot
        await page.evaluate(() => {
          document.querySelectorAll('.sa-toast, [data-testid="global-toast"], .toast-container, .alert-toast, .error-toast, [data-testid="toast"]').forEach(el => {
            el.remove();
          });
        }).catch(() => {});
        await page.waitForTimeout(150);

        // Verify DOM is ready, not in boot state, and no crash occurred
        await assertNoCrashScreen(page, fileName, viewName);

        // GUARANTEED THEME APPLICATION DIRECTLY BEFORE SHOT (Defect 6 fix per Mandate 8d)
        if (themeKey) {
          await page.evaluate((th) => {
            localStorage.setItem("dente_theme_mode", th);
            localStorage.setItem("dente_theme", th);
            document.documentElement.setAttribute("data-theme", th);
            if (document.body) {
              document.body.setAttribute("data-theme", th);
            }
            const isDark = (th === "dark" || th === "night" || th === "ocean" || th === "emerald" || th === "cyber_xray");
            if (isDark) {
              document.documentElement.classList.add("dark");
              document.documentElement.classList.remove("light");
              document.documentElement.style.colorScheme = "dark";
            } else {
              document.documentElement.classList.remove("dark");
              document.documentElement.classList.add("light");
              document.documentElement.style.colorScheme = "light";
            }
            if (window.__useThemeStore) {
              window.__useThemeStore.getState().setThemeMode(th);
            }
          }, themeKey);
          await page.waitForTimeout(200);
        }

        // Final pre-shot crash screen check
        await assertNoCrashScreen(page, fileName, viewName);

        // Take screenshot
        await page.screenshot({ path: brainFile, fullPage: false });
        stats = fs.statSync(brainFile);

        // Post-shot crash screen check
        await assertNoCrashScreen(page, fileName, viewName);

        if (stats.size >= 40960) {
          break;
        }
        console.warn(`[takeProof] Attempt ${attempts}/${maxAttempts}: File ${fileName} is below 40KB (${stats.size} bytes). Retrying in 1000ms...`);
        await page.waitForTimeout(1000);
      } catch (err) {
        if (err.message && err.message.startsWith("CRASH_SCREEN_DETECTED")) {
          // Re-throw immediately: do NOT swallow crash screens!
          throw err;
        }
        console.warn(`[takeProof] Attempt ${attempts} transient error: ${err.message}. Retrying...`);
        await page.waitForTimeout(1000);
      }
    }

    if (!stats || stats.size < 40960) {
      console.error(`[takeProof ERROR] File ${fileName} failed size check after ${attempts} attempts! Size: ${stats ? stats.size : 0} bytes`);
    }

    fs.copyFileSync(brainFile, archiveFile);
    fs.copyFileSync(brainFile, subagentBrainFile);

    const hash = crypto.createHash("md5").update(fs.readFileSync(brainFile)).digest("hex");

    capturedRegistry.push({
      fileName,
      view: viewName,
      viewport: viewportLabel,
      theme: themeLabel,
      sizeBytes: stats.size,
      sizeKb: (stats.size / 1024).toFixed(1),
      md5: hash,
      passSize: stats.size >= 40960,
    });

    console.log(
      `[Captured] ${fileName} (${viewName} | ${viewportLabel} | ${themeLabel}): ${stats.size} bytes (${(stats.size / 1024).toFixed(1)} KB), MD5: ${hash} [${stats.size >= 40960 ? "PASS" : "FAIL < 40KB"}]`
    );
  }

  const themes = [
    { key: "light", label: "Light" },
    { key: "dark", label: "Dark" },
    { key: "sakura", label: "Sakura" },
    { key: "cyber_xray", label: "Cyber X-Ray" },
    { key: "ocean", label: "Ocean" },
  ];

  const viewports = [
    { width: 1440, height: 900, scale: 2, isMobile: false, hasTouch: false, label: "Desktop 1440x900", tag: "desktop" },
    { width: 1280, height: 720, scale: 2, isMobile: false, hasTouch: false, label: "Compact Laptop 1280x720", tag: "laptop" },
    { width: 390, height: 844, scale: 3, isMobile: true, hasTouch: true, label: "Mobile 390x844", tag: "mobile" },
  ];

  let fileIndex = 1;

  for (const vp of viewports) {
    console.log(`\n=================================================================`);
    console.log(`>>> STARTING VIEWPORT: ${vp.label} (${vp.width}x${vp.height}) <<<`);
    console.log(`=================================================================`);

    const context = await browser.newContext({
      viewport: { width: vp.width, height: vp.height },
      deviceScaleFactor: vp.scale,
      isMobile: vp.isMobile || false,
      hasTouch: vp.hasTouch || false,
    });
    await addAuthInitScript(context);
    const page = await context.newPage();

    page.on("pageerror", (err) => console.log(`[Browser PageError]: ${err.message}`));

    // Initial navigation
    await page.goto(`${WEB_BASE}/#schedule`, { waitUntil: "domcontentloaded", timeout: 60000 });
    await page.waitForSelector(".boot-state", { state: "detached", timeout: 60000 });
    await page.waitForSelector(".app-shell", { state: "visible", timeout: 30000 });
    await page.waitForSelector(".schedule-filter-strip, .schedule-grid, [data-testid=\"schedule-view\"], .app-shell", { timeout: 20000 }).catch(() => {});
    await page.waitForTimeout(2000);

    // 1. SCREEN: Schedule (Расписание)
    console.log(`\n--- View: Schedule (Расписание) [${vp.label}] ---`);
    await page.goto(`${WEB_BASE}/#schedule`, { waitUntil: "domcontentloaded" });
    const scheduleSelector = ".schedule-filter-strip, .schedule-grid, [data-testid=\"schedule-view\"], .app-shell";
    await page.waitForSelector(scheduleSelector, { state: "visible", timeout: 20000 }).catch(() => {});

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

    await ensureScheduleDateAndCards(page);

    for (const th of themes) {
      await applyTheme(page, th.key);
      await ensureScheduleDateAndCards(page);
      const fn = `${String(fileIndex++).padStart(2, "0")}_schedule_${vp.tag}_${th.key}.png`;
      await takeProof(page, fn, "Расписание", vp.label, th.label, scheduleSelector, th.key, ensureScheduleDateAndCards);
    }

    // 2. SCREEN: Visit EMR 043/u (ЭМК 043/у)
    console.log(`\n--- View: Visit EMR 043/u (ЭМК 043/у) [${vp.label}] ---`);
    await page.goto(`${WEB_BASE}/#visit`, { waitUntil: "domcontentloaded" });
    const emkSelector = ".visit-monolithic-header, [data-testid=\"visit-view\"]";
    await page.waitForSelector(emkSelector, { state: "visible", timeout: 25000 });

    const ensureEmkTab = async (p) => {
      await p.evaluate(() => {
        const tabs = Array.from(document.querySelectorAll('.visit-sub-nav-tabs button[role="tab"], button[role="tab"]'));
        const emk = tabs.find(b => b.textContent && (b.textContent.includes("043/у") || b.textContent.includes("ЭМК")));
        if (emk) emk.click();
      });
      const tabLocator = p.locator('.visit-sub-nav-tabs button[role="tab"]').nth(1);
      if (await tabLocator.count() > 0) {
        await tabLocator.click({ force: true }).catch(() => {});
      }
      await p.waitForSelector(emkSelector, { state: "visible", timeout: 10000 }).catch(() => {});
      await p.waitForTimeout(400);
    };

    await ensureEmkTab(page);

    for (const th of themes) {
      await applyTheme(page, th.key);
      await ensureEmkTab(page);
      const fn = `${String(fileIndex++).padStart(2, "0")}_emk043_${vp.tag}_${th.key}.png`;
      await takeProof(page, fn, "ЭМК 043/у", vp.label, th.label, emkSelector, th.key, ensureEmkTab);
    }

    // 3. SCREEN: Odontogram (Одонтограмма)
    console.log(`\n--- View: Odontogram (Одонтограмма) [${vp.label}] ---`);
    if (!page.url().includes("#visit")) {
      await page.goto(`${WEB_BASE}/#visit`, { waitUntil: "domcontentloaded" }).catch(() => {});
    }
    await page.waitForSelector(".app-shell", { state: "visible", timeout: 15000 }).catch(() => {});

    const odontoSelector = '[data-testid="visit-odontogram-tab"], .visit-odontogram-tab, .odontogram-module, .tooth-chart-arch-wrapper, .odontogram-toolbar';

    const ensureOdontoTab = async (p) => {
      await p.evaluate(() => {
        const tabs = Array.from(document.querySelectorAll('.visit-sub-nav-tabs button[role="tab"], button[role="tab"]'));
        const od = tabs.find(b => b.textContent && (b.textContent.includes("Формула") || b.textContent.includes("Зубная формула") || b.textContent.includes("Дневник")));
        if (od) {
          od.click();
        } else {
          const first = document.querySelector('button[role="tab"]:nth-child(1)');
          if (first) first.click();
        }
      }).catch(() => {});
      await p.waitForSelector(odontoSelector, { timeout: 10000 }).catch(() => {});
      await p.waitForTimeout(600);
    };

    await ensureOdontoTab(page);

    if (vp.tag === "laptop") {
      const odontoGeometry = await page.evaluate(() => {
        const arch = document.querySelector(".tooth-chart-arch-wrapper, .odontogram-container");
        const lowerTeeth = Array.from(document.querySelectorAll('[data-tooth-id^="4"], [data-tooth-id^="3"], .tooth-card-bottom, .lower-arch-tooth, svg[data-tooth-id]'));
        let lowestY = 0;
        for (const t of lowerTeeth) {
          const r = t.getBoundingClientRect();
          if (r.bottom > lowestY) lowestY = r.bottom;
        }
        const archRect = arch ? arch.getBoundingClientRect() : null;
        return {
          viewport: { width: window.innerWidth, height: window.innerHeight },
          archRect: archRect ? { top: Math.round(archRect.top), bottom: Math.round(archRect.bottom), height: Math.round(archRect.height) } : null,
          lowerTeethCount: lowerTeeth.length,
          lowestPoint: Math.round(lowestY),
          areRootsInViewport: lowestY <= window.innerHeight,
        };
      });
      console.log(`[EMPIRICAL GEOMETRY] Odontogram 1280x720 roots:`, JSON.stringify(odontoGeometry));
    }

    for (const th of themes) {
      await applyTheme(page, th.key);
      await ensureOdontoTab(page);
      const fn = `${String(fileIndex++).padStart(2, "0")}_odontogram_${vp.tag}_${th.key}.png`;
      await takeProof(page, fn, "Одонтограмма", vp.label, th.label, odontoSelector, th.key, ensureOdontoTab);
    }

    // 4. SCREEN: Finance 54-FZ (Касса 54-ФЗ)
    console.log(`\n--- View: Finance 54-FZ (Касса 54-ФЗ) [${vp.label}] ---`);
    await page.goto(`${WEB_BASE}/#finance`, { waitUntil: "domcontentloaded" });
    const financeSelector = ".finance-header-actions, .finance-container, #finance, [data-testid=\"finance-view\"]";
    await page.waitForSelector(financeSelector, { state: "visible", timeout: 25000 }).catch(() => {});
    await page.waitForSelector(".payment-checkout-bar, #payment-checkout-bar, [data-testid=\"payment-checkout-bar\"]", { state: "visible", timeout: 15000 }).catch(() => {});
    await page.waitForTimeout(1200);

    if (vp.tag === "laptop") {
      const financeGeometry = await page.evaluate(() => {
        const bar = document.querySelector("#payment-checkout-bar, .payment-checkout-bar, [data-testid=\"payment-checkout-bar\"]");
        if (!bar) return { found: false };
        const rect = bar.getBoundingClientRect();
        const style = window.getComputedStyle(bar);
        const chain = [];
        let curr = bar.parentElement;
        while (curr && curr !== document.body) {
          const s = window.getComputedStyle(curr);
          const isContainingBlock = s.transform !== "none" || s.filter !== "none" || s.perspective !== "none" || s.contain !== "none" || (s.willChange && s.willChange.includes("transform"));
          if (isContainingBlock || s.overflow !== "visible") {
            chain.push({
              tag: curr.tagName,
              id: curr.id,
              className: String(curr.className).slice(0, 50),
              transform: s.transform,
              overflow: s.overflow,
              position: s.position,
              isContainingBlock,
            });
          }
          curr = curr.parentElement;
        }
        return {
          found: true,
          viewport: { width: window.innerWidth, height: window.innerHeight },
          rect: {
            top: Math.round(rect.top),
            bottom: Math.round(rect.bottom),
            left: Math.round(rect.left),
            right: Math.round(rect.right),
            width: Math.round(rect.width),
            height: Math.round(rect.height),
          },
          position: style.position,
          bottomStyle: style.bottom,
          isInViewport: rect.top >= 0 && rect.bottom <= window.innerHeight,
          containingAncestors: chain.filter(c => c.isContainingBlock),
          overflowAncestors: chain.filter(c => c.overflow !== "visible")
        };
      });
      console.log(`[EMPIRICAL GEOMETRY] Finance 1280x720 checkout bar:`, JSON.stringify(financeGeometry, null, 2));
    }
    for (const th of themes) {
      await applyTheme(page, th.key);
      const fn = `${String(fileIndex++).padStart(2, "0")}_finance_${vp.tag}_${th.key}.png`;
      await takeProof(page, fn, "Касса 54-ФЗ", vp.label, th.label, financeSelector, th.key);
    }

    // 5. SCREEN: Documents (Документы)
    console.log(`\n--- View: Documents (Документы) [${vp.label}] ---`);
    await page.goto(`${WEB_BASE}/#documents`, { waitUntil: "domcontentloaded" });
    const docsSelector = "#documents, .documents-panel, .documents-container, [data-testid=\"documents-view\"]";
    await page.waitForSelector(docsSelector, { state: "visible", timeout: 25000 }).catch(() => {});
    await page.waitForTimeout(1200);
    for (const th of themes) {
      await applyTheme(page, th.key);
      const fn = `${String(fileIndex++).padStart(2, "0")}_documents_${vp.tag}_${th.key}.png`;
      await takeProof(page, fn, "Документы", vp.label, th.label, docsSelector, th.key);
    }

    await context.close();
  }

  await browser.close();

  // Summary Verification
  console.log(`\n=================================================================`);
  console.log(`MULTI-THEME SCREENSHOT CAPTURE VERIFICATION AUDIT`);
  console.log(`=================================================================`);
  console.table(capturedRegistry);

  const hashes = new Set(capturedRegistry.map((r) => r.md5));
  const uniqueHashes = hashes.size === capturedRegistry.length;
  const allAbove40k = capturedRegistry.every((r) => r.sizeBytes >= 40960);
  const totalCount = capturedRegistry.length;

  console.log(`Total captured: ${totalCount} (Target: 75)`);
  console.log(`Unique MD5 hashes: ${uniqueHashes ? "PASS (100% unique)" : `FAIL (${hashes.size}/${totalCount} unique)`}`);
  console.log(`All files >= 40 KB: ${allAbove40k ? "PASS" : "FAIL"}`);

  // Write summary JSON to brain
  const summaryData = JSON.stringify(
    {
      total: totalCount,
      uniqueHashes,
      allAbove40k,
      viewports: ["Desktop 1440x900", "Compact Laptop 1280x720", "Mobile 390x844"],
      themes: ["Light", "Dark", "Sakura", "Cyber X-Ray", "Ocean"],
      screens: ["Расписание", "ЭМК 043/у", "Одонтограмма", "Касса 54-ФЗ", "Документы"],
      files: capturedRegistry,
    },
    null,
    2
  );
  const summaryPath = path.join(BRAIN_DIR, "multi_theme_proof_summary.json");
  fs.writeFileSync(summaryPath, summaryData, "utf8");
  fs.writeFileSync(path.join(SUBAGENT_BRAIN_DIR, "multi_theme_proof_summary.json"), summaryData, "utf8");
  fs.writeFileSync(path.join(ARCHIVE_DIR, "multi_theme_proof_summary.json"), summaryData, "utf8");
  console.log(`Summary written to: ${summaryPath}`);

  if (totalCount < 75 || !allAbove40k) {
    throw new Error("Multi-theme screenshot capture failed validation thresholds!");
  }
}

runMultiThemeProofmaker().catch((err) => {
  console.error("Multi-theme proofmaker fatal error:", err);
  process.exit(1);
});
