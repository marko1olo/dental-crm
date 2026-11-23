/**
 * scripts/redteam_multitheme_inquisition.cjs
 * Visual Multi-Theme Red Team Inquisition Capture Script.
 *
 * Captures 30 live desktop screenshots (1440x900) across 10 clinical themes:
 * 1. Light (light)
 * 2. Dark (dark)
 * 3. Ocean (ocean)
 * 4. Sakura (sakura)
 * 5. Emerald (emerald)
 * 6. Cyber X-Ray (cyber_xray)
 * 7. Night (night)
 * 8. Warm Sand (warm_sand)
 * 9. Calm Teal (calm_teal)
 * 10. Contrast (contrast)
 *
 * Across 3 core clinical routes:
 * 1. Schedule (#schedule)
 * 2. Visit / EMR 043/u (#visit)
 * 3. Cashier & Finance 54-FZ (#finance)
 *
 * Invariants:
 * - Live running server on http://127.0.0.1:5173/ and API on http://127.0.0.1:4100/
 * - Real clinic setup, doctor unlock, seeded patients, visit, and payment records
 * - File size >= 40 KB, unique MD5 hashes
 * - Output saved to docs/screenshots/multi_theme_inquisition and brain folder
 */

const { chromium } = require("playwright");
const path = require("node:path");
const fs = require("node:fs");
const crypto = require("node:crypto");

const API_BASE = "http://127.0.0.1:4100";
const WEB_BASE = "http://127.0.0.1:5173";
const BRAIN_DIR = path.resolve("C:/Users/Admin/.gemini/antigravity/brain/14b4c01e-d2fc-46bf-b357-3a484e38a322/screenshots");
const OUT_DIR = path.resolve("C:/Clinic_MVP/dental-crm/docs/screenshots/multi_theme_inquisition");

const THEMES = [
  { id: "light", label: "Light", isDark: false },
  { id: "dark", label: "Dark", isDark: true },
  { id: "ocean", label: "Ocean", isDark: true },
  { id: "sakura", label: "Sakura", isDark: false },
  { id: "emerald", label: "Emerald", isDark: true },
  { id: "cyber_xray", label: "Cyber X-Ray", isDark: true },
  { id: "night", label: "Night", isDark: true },
  { id: "warm_sand", label: "Warm Sand", isDark: false },
  { id: "calm_teal", label: "Calm Teal", isDark: false },
  { id: "contrast", label: "Contrast", isDark: false },
];

const VIEWS = [
  { id: "schedule", label: "Расписание (Schedule)", selector: ".schedule-filter-strip, .schedule-container, [data-testid=\"schedule-view\"]" },
  { id: "visit", label: "Визит / ЭМК 043/у (Visit EMR)", selector: ".visit-monolithic-header, [data-testid=\"visit-view\"], .visit-workflow-container" },
  { id: "finance", label: "Касса / Счета 54-ФЗ (Finance)", selector: ".finance-header-actions, .finance-container, [data-testid=\"finance-view\"]" },
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

  console.log("[Chrome] Launching Playwright browser (1440x900)...");
  const browser = await chromium.launch({
    headless: true,
    executablePath: "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });

  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    deviceScaleFactor: 1,
    isMobile: false,
    hasTouch: false,
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

  const page = await context.newPage();

  async function applyTheme(themeObj) {
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
    await page.waitForTimeout(600);
  }

  const records = [];

  // Initial load
  console.log("Navigating to initial load...");
  await page.goto(`${WEB_BASE}/#schedule`, { waitUntil: "domcontentloaded", timeout: 60000 });
  await page.waitForSelector(".boot-state", { state: "detached", timeout: 60000 });
  await page.waitForSelector(".app-shell", { state: "visible", timeout: 30000 });
  await page.waitForTimeout(2000);

  console.log("\n====================================================================");
  console.log("STARTING 10-THEME x 3-VIEW INQUISITION SUITE (1440x900 DESKTOP)");
  console.log("====================================================================\n");

  let counter = 1;

  for (const theme of THEMES) {
    console.log(`\n>>> THEME: ${theme.label} (${theme.id}) | isDark: ${theme.isDark} <<<`);
    await applyTheme(theme);

    for (const view of VIEWS) {
      const padIndex = String(counter).padStart(2, "0");
      const filename = `theme_${padIndex}_${theme.id}_${view.id}.png`;
      const filePath = path.join(OUT_DIR, filename);
      const brainPath = path.join(BRAIN_DIR, filename);

      // Navigate to view
      await page.evaluate((vId) => {
        window.location.hash = vId;
      }, view.id);

      if (view.id === "visit") {
        await page.waitForSelector('[aria-busy="true"]', { state: "detached", timeout: 30000 }).catch(() => {});
        // Select EMK tab if available
        await page.evaluate(() => {
          const tabs = Array.from(document.querySelectorAll("button, [role=\"tab\"]"));
          const emkTab = tabs.find((t) => t.textContent && (t.textContent.includes("043/у") || t.textContent.includes("ЭМК")));
          if (emkTab) emkTab.click();
        });
        await page.waitForTimeout(1000);
      }

      await page.waitForSelector(".boot-state", { state: "detached", timeout: 20000 }).catch(() => {});
      await page.waitForSelector(view.selector, { timeout: 20000 }).catch(() => {});
      await page.waitForTimeout(800);

      // Capture screenshot
      await page.screenshot({ path: filePath, fullPage: false });
      fs.copyFileSync(filePath, brainPath);

      const stats = fs.statSync(filePath);
      const md5 = crypto.createHash("md5").update(fs.readFileSync(filePath)).digest("hex");

      const item = {
        index: counter,
        themeId: theme.id,
        themeName: theme.label,
        viewId: view.id,
        viewName: view.label,
        filename,
        sizeBytes: stats.size,
        sizeKb: (stats.size / 1024).toFixed(1),
        md5,
        passSize: stats.size >= 40960,
      };
      records.push(item);
      console.log(`  [Shot ${counter}/30] ${filename} | ${theme.label} - ${view.label} | ${item.sizeKb} KB | MD5: ${md5} | >=40KB: ${item.passSize ? "PASS" : "FAIL"}`);

      counter++;
    }
  }

  await browser.close();

  const resultsJson = path.join(OUT_DIR, "audit_results.json");
  fs.writeFileSync(resultsJson, JSON.stringify(records, null, 2), "utf8");
  fs.writeFileSync(path.join(BRAIN_DIR, "audit_results.json"), JSON.stringify(records, null, 2), "utf8");

  console.log("\n==================================================");
  console.log("MULTI-THEME RED TEAM INQUISITION REPORT");
  console.log("==================================================");
  console.table(records.map(r => ({
    File: r.filename,
    Theme: r.themeName,
    View: r.viewId,
    Size_KB: r.sizeKb,
    PassSize: r.passSize ? "PASS" : "FAIL",
    MD5: r.md5.substring(0, 10) + "..."
  })));

  const hashes = new Set(records.map((r) => r.md5));
  const uniqueHashes = hashes.size === records.length;
  const allAbove40k = records.every((r) => r.sizeBytes >= 40960);

  console.log(`\nTotal captured: ${records.length}/30`);
  console.log(`Unique MD5 hashes: ${uniqueHashes ? "YES (100% distinct screens)" : "FAIL"}`);
  console.log(`All files >= 40 KB: ${allAbove40k ? "PASS" : "FAIL"}`);

  if (!uniqueHashes || !allAbove40k || records.length < 30) {
    throw new Error("Multi-theme inquisition criteria failed!");
  }
}

run().catch((err) => {
  console.error("Capture execution error:", err);
  process.exit(1);
});
