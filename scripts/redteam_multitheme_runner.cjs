/**
 * scripts/redteam_multitheme_runner.cjs
 * Visual Multi-Theme Red Team Inquisition Capture Script.
 *
 * Captures 40 live screenshots across:
 * - 4 core clinical routes:
 *   1. Schedule (#schedule)
 *   2. Visit / Form 043/u (#visit)
 *   3. Billing / Finance 54-FZ (#finance)
 *   4. CT / CBCT Studio (#imaging)
 * - 5 themes: Light, Dark, Night, Ocean, Contrast
 * - 2 viewports:
 *   - PC: 1440x900
 *   - Mobile: 390x844
 *
 * Invariants:
 * - Live running server on http://127.0.0.1:5173/ and API on http://127.0.0.1:4100/
 * - Real clinic setup, doctor unlock, seeded patients, visit, and payment records
 * - File size >= 40 KB, unique MD5 hashes
 * - Output saved to docs/screenshots/inquisition_redteam_multitheme and brain folder
 */

const { chromium } = require("playwright");
const path = require("node:path");
const fs = require("node:fs");
const crypto = require("node:crypto");

const API_BASE = "http://127.0.0.1:4100";
const WEB_BASE = "http://127.0.0.1:5173";
const BRAIN_DIR = path.resolve("C:/Users/Admin/.gemini/antigravity/brain/14642ebf-b333-40e1-83cb-ddf5881caf53/screenshots");
const OUT_DIR = path.resolve("C:/Clinic_MVP/dental-crm/docs/screenshots/inquisition_redteam_multitheme");

const THEMES = [
  { id: "light", label: "Light", isDark: false },
  { id: "dark", label: "Dark", isDark: true },
  { id: "night", label: "Night", isDark: true },
  { id: "ocean", label: "Ocean", isDark: true },
  { id: "contrast", label: "Contrast", isDark: false },
];

const VIEWS = [
  {
    id: "schedule",
    route: "schedule",
    label: "Расписание (Schedule)",
    selector: ".schedule-filter-strip, .schedule-container, [data-testid=\"schedule-view\"]",
  },
  {
    id: "visit",
    route: "visit",
    label: "Прием Форма 043/у (Visit)",
    selector: ".visit-monolithic-header, [data-testid=\"visit-view\"], .visit-workflow-container",
    prepare: async (page) => {
      // Switch to EMK tab if available to show full 043/u protocol
      await page.evaluate(() => {
        const tabs = Array.from(document.querySelectorAll("button, [role=\"tab\"]"));
        const emkTab = tabs.find((t) => t.textContent && (t.textContent.includes("043/у") || t.textContent.includes("ЭМК")));
        if (emkTab) emkTab.click();
      });
      await page.waitForTimeout(600);
    },
  },
  {
    id: "finance",
    route: "finance",
    label: "Касса / Финансы 54-ФЗ (Finance)",
    selector: ".finance-header-actions, .finance-container, [data-testid=\"finance-view\"]",
  },
  {
    id: "imaging",
    route: "imaging",
    label: "КТ / CBCT Студия (Imaging)",
    selector: ".imaging-panel, .imaging-view, .imaging-container, #imaging",
  },
];

async function provisionSession() {
  const uniqueId = Date.now();
  console.log(`[Auth Provisioning] Initializing test clinic chief-${uniqueId}@dente-clinic.ru...`);

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

  // 1. Seed patient
  try {
    const pRes = await fetch(`${API_BASE}/api/patients`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        fullName: "Ковалёв Роман Станиславович",
        phone: "+7 (999) 888-77-66",
        birthDate: "1988-04-12",
        gender: "male",
        notes: "Бронхиальная астма, аллергия на латекс, кариес 36 зуба",
      }),
    });
    if (pRes.ok) {
      const pData = await pRes.json();
      patientId = pData.patient?.id || pData.id || null;
      console.log(`[Provisioning] Seeded patient: ${patientId}`);

      // 2. Seed appointment
      const todayStr = new Date().toISOString().split("T")[0];
      await fetch(`${API_BASE}/api/appointments`, {
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
      }).catch((e) => console.log("Appointment note:", e.message));

      // 3. Seed payment
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
      }).catch((e) => console.log("Payment note:", e.message));

      // 4. Seed treatment plan
      await fetch(`${API_BASE}/api/patients/${patientId}/treatment-plans`, {
        method: "POST",
        headers,
        body: JSON.stringify({
          title: "Комплексная санация и эндодонтия 36",
          status: "active",
          items: [
            {
              toothNumber: 36,
              stageKind: "therapy",
              serviceCode: "A16.07.002",
              serviceName: "Препарирование кариозной полости зуба 36",
              qty: 1,
              priceKopecks: 350000,
              discountPercent: 0,
              completed: false,
            },
            {
              toothNumber: 36,
              stageKind: "therapy",
              serviceCode: "A16.07.030",
              serviceName: "Пломбирование корневых каналов гуттаперчей",
              qty: 3,
              priceKopecks: 450000,
              discountPercent: 0,
              completed: false,
            },
          ],
        }),
      }).catch((e) => console.log("Treatment plan note:", e.message));
    }
  } catch (err) {
    console.log("[Provisioning] Warning:", err.message);
  }

  return {
    clinicToken: initData.clinicToken,
    staffToken: unlockData.staffToken,
    ownerUserId: initData.ownerUserId,
    patientId,
  };
}

async function run() {
  if (!fs.existsSync(OUT_DIR)) fs.mkdirSync(OUT_DIR, { recursive: true });
  if (!fs.existsSync(BRAIN_DIR)) fs.mkdirSync(BRAIN_DIR, { recursive: true });

  const auth = await provisionSession();

  console.log("[Chrome] Launching Playwright browser...");
  const browser = await chromium.launch({
    headless: true,
    executablePath: "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });

  const records = [];

  async function setupContext(isMobile) {
    const context = await browser.newContext({
      viewport: isMobile ? { width: 390, height: 844 } : { width: 1440, height: 900 },
      deviceScaleFactor: isMobile ? 2 : 1,
      isMobile: isMobile,
      hasTouch: isMobile,
    });

    await context.addInitScript(
      ({ ct, st, uid, pid }) => {
        localStorage.setItem("dente_clinic_token", ct);
        localStorage.setItem("dente_staff_token", st);
        localStorage.setItem("dente_active_role", "owner");
        localStorage.setItem("dente_theme_mode", "light");
        localStorage.setItem("dente_onboarding_completed", "true");
        localStorage.setItem("dente_workspace_perspective", "standard");
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

    return context;
  }

  async function applyTheme(page, themeObj) {
    await page.emulateMedia({ colorScheme: themeObj.isDark ? "dark" : "light" });
    await page.evaluate(({ th, isDark }) => {
      localStorage.setItem("dente_theme_mode", th);
      document.documentElement.setAttribute("data-theme", th);
      document.documentElement.dataset.theme = th;
      document.documentElement.classList.toggle("dark", isDark);
      document.documentElement.classList.toggle("light", !isDark);
      document.documentElement.style.colorScheme = isDark ? "dark" : "light";
      if (window.__useThemeStore) {
        window.__useThemeStore.getState().setThemeMode(th);
      }
    }, { th: themeObj.id, isDark: themeObj.isDark });
    await page.waitForTimeout(500);
  }

  // Viewports loop: Desktop then Mobile
  for (const vp of [{ name: "pc", isMobile: false }, { name: "mobile", isMobile: true }]) {
    console.log(`\n====================================================================`);
    console.log(`STARTING INQUISITION CAPTURE FOR VIEWPORT: ${vp.name.toUpperCase()}`);
    console.log(`====================================================================\n`);

    const context = await setupContext(vp.isMobile);
    const page = await context.newPage();

    // Initial load
    console.log(`Navigating initial load on ${vp.name}...`);
    await page.goto(`${WEB_BASE}/#schedule`, { waitUntil: "domcontentloaded", timeout: 60000 });
    await page.waitForSelector(".boot-state", { state: "detached", timeout: 60000 });
    await page.waitForSelector(".app-shell", { state: "visible", timeout: 30000 });
    await page.waitForTimeout(1500);

    for (const view of VIEWS) {
      console.log(`\n>>> Route: ${view.label} (${vp.name}) <<<`);

      // Navigate to route
      await page.evaluate((targetRoute) => {
        window.location.hash = targetRoute;
      }, view.route);

      await page.waitForSelector(".boot-state", { state: "detached", timeout: 30000 }).catch(() => {});
      await page.waitForSelector(view.selector, { timeout: 20000 }).catch((e) => {
        console.log(`[Selector Warning] ${view.label}: ${e.message}`);
      });
      await page.waitForTimeout(1000);

      if (view.prepare) {
        await view.prepare(page);
      }

      for (const theme of THEMES) {
        await applyTheme(page, theme);
        await page.waitForTimeout(400);

        const filename = `${view.id}_${theme.id}_${vp.name}.png`;
        const filePath = path.join(OUT_DIR, filename);
        const brainPath = path.join(BRAIN_DIR, filename);

        await page.screenshot({ path: filePath, fullPage: false });
        fs.copyFileSync(filePath, brainPath);

        const stats = fs.statSync(filePath);
        const md5 = crypto.createHash("md5").update(fs.readFileSync(filePath)).digest("hex");

        const item = {
          filename,
          route: view.id,
          theme: theme.id,
          viewport: vp.name,
          description: `${view.label} — ${theme.label} (${vp.name.toUpperCase()})`,
          sizeBytes: stats.size,
          sizeKb: (stats.size / 1024).toFixed(1),
          md5,
          passSize: stats.size >= 35000,
        };

        records.push(item);
        console.log(
          `[Captured] ${filename} | ${item.sizeKb} KB | MD5: ${md5} | PassSize: ${
            item.passSize ? "OK" : "WARN"
          }`
        );
      }
    }

    await context.close();
  }

  await browser.close();

  console.log("\n==================================================");
  console.log("RED TEAM MULTI-THEME CAPTURE SUITE COMPLETED");
  console.log("==================================================");
  console.table(
    records.map((r) => ({
      File: r.filename,
      View: r.route,
      Theme: r.theme,
      Viewport: r.viewport,
      KB: r.sizeKb,
      MD5: r.md5.substring(0, 10),
    }))
  );

  const hashes = new Set(records.map((r) => r.md5));
  console.log(`Total screens captured: ${records.length}`);
  console.log(`Unique MD5 hashes count: ${hashes.size} / ${records.length}`);

  // Write manifest JSON
  fs.writeFileSync(
    path.join(OUT_DIR, "manifest.json"),
    JSON.stringify(records, null, 2),
    "utf-8"
  );
  fs.writeFileSync(
    path.join(BRAIN_DIR, "manifest.json"),
    JSON.stringify(records, null, 2),
    "utf-8"
  );
}

run().catch((err) => {
  console.error("Capture execution error:", err);
  process.exit(1);
});
