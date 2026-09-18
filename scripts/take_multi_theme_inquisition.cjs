/**
 * scripts/take_multi_theme_inquisition.cjs
 * Multi-Theme Visual Proofmaker & Playwright Runner.
 * Captures 40 live screenshots across 4 core clinical screens
 * (Schedule, Visit / Odontogram, Finance / Cash, Imaging / X-Ray)
 * across all 10 clinical themes (Light, Dark, Ocean, Sakura, Emerald,
 * Cyber X-Ray, Night, Warm Sand, Calm Teal, Contrast)
 * at Desktop 1440x900 resolution (Scale 2x).
 *
 * Requirements:
 * - Live server on http://127.0.0.1:5173/ and API on http://127.0.0.1:4100/
 * - Save to docs/screenshots/multi_theme_inquisition/
 * - File size >= 40 KB
 * - 100% Unique MD5 hashes across all screenshots
 */

const { chromium } = require("playwright");
const path = require("node:path");
const fs = require("node:fs");
const crypto = require("node:crypto");

const THEMES = [
  { key: "light", name: "Light", isDark: false },
  { key: "dark", name: "Dark", isDark: true },
  { key: "ocean", name: "Ocean", isDark: true },
  { key: "sakura", name: "Sakura", isDark: false },
  { key: "emerald", name: "Emerald", isDark: true },
  { key: "cyber_xray", name: "Cyber X-Ray", isDark: true },
  { key: "night", name: "Night", isDark: true },
  { key: "warm_sand", name: "Warm Sand", isDark: false },
  { key: "calm_teal", name: "Calm Teal", isDark: false },
  { key: "contrast", name: "Contrast", isDark: false },
];

const VIEWS = [
  {
    id: "schedule",
    name: "Расписание",
    hash: "schedule",
    selector: ".schedule-filter-strip, .schedule-calendar-body, .schedule-view, [data-testid=\"schedule-view\"]",
  },
  {
    id: "visit",
    name: "Визит / Одонтограмма",
    hash: "visit",
    selector: ".visit-monolithic-header, [data-testid=\"visit-view\"]:not([aria-busy=\"true\"]), .odontogram-container, .dental-arch",
  },
  {
    id: "finance",
    name: "Касса / Финансы",
    hash: "finance",
    selector: ".finance-header-actions, .finance-container, .finance-ledger-table",
  },
  {
    id: "imaging",
    name: "Снимки",
    hash: "imaging",
    selector: ".imaging-panel, .imaging-layout, .imaging-viewer",
  },
];

async function provisionLiveSession() {
  const API_BASE = "http://127.0.0.1:4100";
  const uniqueId = Date.now();
  console.log("[Provisioning] Initializing authenticated clinic session on live API...");

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

  // 1. Seed Patient
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

      // 2. Seed Appointment
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
          console.log("[Provisioning] Seeded appointment for today");
        }
      } catch (errAppt) {
        console.log("[Provisioning] Appointment seeding note:", errAppt.message);
      }

      // 3. Seed Payment
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
            note: "Оплата за терапевтическое лечение",
          }),
        });
        console.log("[Provisioning] Seeded payment 12 500 ₽");
      } catch (errPay) {
        console.log("[Provisioning] Payment seeding note:", errPay.message);
      }

      // 4. Seed Imaging Study
      try {
        const studyRes = await fetch(`${API_BASE}/api/imaging/studies`, {
          method: "POST",
          headers,
          body: JSON.stringify({
            patientId,
            kind: "periapical",
            title: "Прицельный снимок 36 зуба",
            toothCode: "36",
            sourceKind: "manual_upload",
          }),
        });
        if (studyRes.ok) {
          console.log("[Provisioning] Seeded periapical imaging study");
        }
      } catch (errStudy) {
        console.log("[Provisioning] Imaging seeding note:", errStudy.message);
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

async function runMultiThemeCapture() {
  const outDir = path.resolve("C:/Clinic_MVP/dental-crm/docs/screenshots/multi_theme_inquisition");
  if (!fs.existsSync(outDir)) {
    fs.mkdirSync(outDir, { recursive: true });
  }

  const brainDir = path.resolve(
    process.env.BRAIN_DIR ||
      "C:/Users/Admin/.gemini/antigravity/brain/39e41a91-78d9-461d-a342-68c45644cd69/multi_theme_inquisition"
  );
  if (!fs.existsSync(brainDir)) {
    fs.mkdirSync(brainDir, { recursive: true });
  }

  const auth = await provisionLiveSession();

  console.log("\n[Playwright] Launching Google Chrome...");
  const browser = await chromium.launch({
    headless: true,
    executablePath: "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });

  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    deviceScaleFactor: 2,
    isMobile: false,
    hasTouch: false,
  });

  // Inject authentication and persistent state into localStorage before any page navigation
  await context.addInitScript(
    ({ ct, st, uid, pid }) => {
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

  // Initial load
  console.log("[Playwright] Loading application root...");
  await page.goto("http://127.0.0.1:5173/#schedule", { waitUntil: "domcontentloaded", timeout: 60000 });
  await page.waitForSelector(".boot-state", { state: "detached", timeout: 60000 }).catch(() => {});
  await page.waitForSelector(".app-shell", { state: "visible", timeout: 30000 });
  await page.waitForTimeout(2000);

  const capturedRegistry = [];
  let screenIndex = 1;

  for (const view of VIEWS) {
    console.log(`\n======================================================`);
    console.log(`>>> SCREEN VIEW: ${view.name} (#${view.hash}) <<<`);
    console.log(`======================================================`);

    // Navigate to view
    await page.evaluate((h) => {
      window.location.hash = h;
    }, view.hash);

    if (view.id === "visit") {
      await page.waitForSelector('[aria-busy="true"]', { state: "detached", timeout: 30000 }).catch(() => {});
    }
    await page.waitForSelector(view.selector, { timeout: 25000 });
    if (view.id === "visit") {
      await page.waitForSelector('[aria-busy="true"]', { state: "detached", timeout: 30000 }).catch(() => {});
      await page.waitForTimeout(1500);
    } else {
      await page.waitForTimeout(1000);
    }

    // Now iterate across all 10 themes for this view
    for (const theme of THEMES) {
      // Configure theme
      await page.evaluate(
        ({ th, isDark }) => {
          localStorage.setItem("dente_theme_mode", th);
          document.documentElement.setAttribute("data-theme", th);
          document.documentElement.dataset.theme = th;
          document.documentElement.classList.toggle("dark", isDark);
          document.documentElement.classList.toggle("light", !isDark);
          document.documentElement.style.colorScheme = isDark ? "dark" : "light";
          if (window.__useThemeStore) {
            window.__useThemeStore.getState().setThemeMode(th);
          }
        },
        { th: theme.key, isDark: theme.isDark }
      );

      // Give browser time to recalculate styles and settle
      await page.waitForTimeout(900);
      await page.waitForSelector(".boot-state", { state: "detached", timeout: 10000 }).catch(() => {});
      await page.waitForSelector(".app-shell", { state: "visible", timeout: 10000 }).catch(() => {});

      const padIndex = String(screenIndex).padStart(2, "0");
      const fileName = `${padIndex}_${view.id}_${theme.key}.png`;
      const targetFile = path.join(outDir, fileName);
      const brainFile = path.join(brainDir, fileName);

      await page.screenshot({ path: targetFile, fullPage: false });
      fs.copyFileSync(targetFile, brainFile);

      const stats = fs.statSync(targetFile);
      const hash = crypto.createHash("md5").update(fs.readFileSync(targetFile)).digest("hex");

      const record = {
        index: screenIndex,
        fileName,
        view: view.name,
        theme: theme.name,
        themeKey: theme.key,
        sizeBytes: stats.size,
        sizeKb: (stats.size / 1024).toFixed(1),
        md5: hash,
        path: targetFile,
        passSize: stats.size >= 40960,
      };

      capturedRegistry.push(record);
      console.log(
        `[${padIndex}/40] Captured: ${fileName} (${view.name} - ${theme.name}) | Size: ${record.sizeKb} KB | MD5: ${hash} | >=40KB: ${record.passSize ? "PASS" : "FAIL"}`
      );

      screenIndex++;
    }
  }

  await context.close();
  await browser.close();

  // Audit validation
  console.log("\n================================================================================");
  console.log("             MULTI-THEME VISUAL PROOFMAKER AUDIT SUMMARY REPORT                ");
  console.log("================================================================================");
  console.table(
    capturedRegistry.map((r) => ({
      "#": r.index,
      File: r.fileName,
      View: r.view,
      Theme: r.theme,
      "Size (KB)": r.sizeKb,
      MD5: r.md5,
      ">=40KB": r.passSize ? "PASS" : "FAIL",
    }))
  );

  const hashes = new Set(capturedRegistry.map((r) => r.md5));
  const uniqueHashes = hashes.size === capturedRegistry.length;
  const allAbove40k = capturedRegistry.every((r) => r.sizeBytes >= 40960);

  console.log(`\nTotal screenshots captured: ${capturedRegistry.length}/40`);
  console.log(`Unique MD5 hashes: ${uniqueHashes ? "YES (100% distinct screens)" : "FAIL"}`);
  console.log(`All files >= 40 KB: ${allAbove40k ? "PASS" : "FAIL"}`);

  // Save audit registry JSON
  const auditJsonPath = path.join(outDir, "audit_summary.json");
  fs.writeFileSync(
    auditJsonPath,
    JSON.stringify(
      {
        total: capturedRegistry.length,
        uniqueHashes,
        allAbove40k,
        capturedAt: new Date().toISOString(),
        registry: capturedRegistry,
      },
      null,
      2
    ),
    "utf-8"
  );
  console.log(`Audit report saved to ${auditJsonPath}`);

  if (!uniqueHashes || !allAbove40k || capturedRegistry.length < 40) {
    throw new Error("Multi-theme inquisition verification failed criteria!");
  }

  console.log("\n>>> MULTI-THEME PLAYWRIGHT CAPTURE SUITE COMPLETED SUCCESSFULLY! <<<\n");
}

runMultiThemeCapture().catch((err) => {
  console.error("Multi-theme capture failed:", err);
  process.exit(1);
});
