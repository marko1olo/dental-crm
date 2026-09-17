/**
 * scripts/redteam_inquisition_proofmaker.cjs
 * Visual Red Team & Proofmaker Capture Script.
 * Captures 10 live screenshots (1440x900 PC Light and PC Dark) across 5 core clinical routes:
 * 1. Schedule (Расписание)
 * 2. EMR / Patient 043/u (ЭМК Пациента 043/у)
 * 3. Finance / Cashier 54-FZ (Счета / Касса 54-ФЗ)
 * 4. Treatment Plans (Планы лечения)
 * 5. CT Studio / Imaging (КТ-студия / Снимки)
 */

const { chromium } = require("playwright");
const path = require("node:path");
const fs = require("node:fs");
const crypto = require("node:crypto");

const API_BASE = "http://127.0.0.1:4100";
const WEB_BASE = "http://127.0.0.1:5173";
const BRAIN_DIR = "C:/Users/Admin/.gemini/antigravity/brain/ab2efea1-9472-4107-91c3-faeecf38dcb1";
const OUT_DIR = path.resolve("C:/Clinic_MVP/dental-crm/docs/screenshots/inquisition_redteam");

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
            {
              toothNumber: 37,
              stageKind: "hygiene",
              serviceCode: "A16.07.051",
              serviceName: "Профессиональная гигиена полости рта ультразвуком",
              qty: 1,
              priceKopecks: 450000,
              discountPercent: 10,
              completed: true,
            },
          ],
        }),
      }).catch((e) => console.log("Treatment plan note:", e.message));

      // 5. Seed imaging study
      await fetch(`${API_BASE}/api/imaging/studies`, {
        method: "POST",
        headers,
        body: JSON.stringify({
          patientId,
          studyType: "cbct",
          title: "КЛКТ 3D челюсти (12x9 см)",
          acquisitionDate: new Date().toISOString(),
          status: "ready",
          notes: "3D исследование периапикальных тканей зубов 36, 37",
        }),
      }).catch((e) => console.log("Imaging study note:", e.message));
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

  async function applyTheme(theme) {
    await page.evaluate((th) => {
      localStorage.setItem("dente_theme_mode", th);
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
    }, theme);
    await page.waitForTimeout(800);
  }

  async function setPerspective(perspective) {
    await page.evaluate((persp) => {
      localStorage.setItem("dente_workspace_perspective", persp);
      if (window.__usePerspectiveStore) {
        window.__usePerspectiveStore.getState().setPerspective(persp);
      }
    }, perspective);
    await page.waitForTimeout(1000);
  }

  const records = [];

  async function captureProof(filename, description) {
    const filePath = path.join(OUT_DIR, filename);
    const brainPath = path.join(BRAIN_DIR, filename);

    await page.waitForSelector(".boot-state", { state: "detached", timeout: 20000 }).catch(() => {});
    await page.waitForSelector(".app-shell", { state: "visible", timeout: 20000 }).catch(() => {});
    await page.waitForTimeout(1200);

    await page.screenshot({ path: filePath, fullPage: false });
    fs.copyFileSync(filePath, brainPath);

    const stats = fs.statSync(filePath);
    const md5 = crypto.createHash("md5").update(fs.readFileSync(filePath)).digest("hex");

    const item = {
      filename,
      description,
      sizeBytes: stats.size,
      sizeKb: (stats.size / 1024).toFixed(1),
      md5,
      passSize: stats.size >= 40960,
    };
    records.push(item);
    console.log(`[Captured] ${filename} | ${description} | ${item.sizeKb} KB | MD5: ${md5} | >=40KB: ${item.passSize ? "PASS" : "FAIL"}`);
  }

  console.log("\n>>> STARTING 5-ROUTE INQUISITION CAPTURE SUITE (1440x900) <<<\n");

  // Initial load
  await page.goto(`${WEB_BASE}/#schedule`, { waitUntil: "domcontentloaded", timeout: 60000 });
  await page.waitForSelector(".boot-state", { state: "detached", timeout: 60000 });
  await page.waitForSelector(".app-shell", { state: "visible", timeout: 30000 });
  await page.waitForTimeout(2000);

  // -------------------------------------------------------------
  // ROUTE 1: Расписание (Schedule)
  // -------------------------------------------------------------
  console.log("--- 1. Capturing Schedule ---");
  await setPerspective("standard");
  await page.evaluate(() => { window.location.hash = "schedule"; });
  await page.waitForSelector(".boot-state", { state: "detached", timeout: 30000 });
  await page.waitForSelector(".schedule-filter-strip, .schedule-container", { state: "visible", timeout: 20000 });
  
  await applyTheme("light");
  await page.waitForSelector(".boot-state", { state: "detached", timeout: 30000 });
  await page.waitForSelector(".schedule-filter-strip, .schedule-container", { state: "visible", timeout: 20000 });
  await captureProof("01_schedule_pc_light.png", "Расписание — PC Light 1440x900");

  await applyTheme("dark");
  await page.waitForSelector(".boot-state", { state: "detached", timeout: 30000 });
  await page.waitForSelector(".schedule-filter-strip, .schedule-container", { state: "visible", timeout: 20000 });
  await page.waitForTimeout(1500);
  await captureProof("02_schedule_pc_dark.png", "Расписание — PC Dark 1440x900");

  // -------------------------------------------------------------
  // ROUTE 2: ЭМК Пациента 043/у (Visit EMR 043/u)
  // -------------------------------------------------------------
  console.log("--- 2. Capturing Patient EMR 043/u ---");
  await setPerspective("standard");
  await page.evaluate(() => { window.location.hash = "visit"; });
  await page.waitForSelector('[aria-busy="true"]', { state: "detached", timeout: 30000 }).catch(() => {});
  await page.waitForSelector(".visit-monolithic-header, [data-testid=\"visit-view\"]", { timeout: 20000 });
  await page.waitForTimeout(1500);

  // Click EMK tab if available to show full 043/u protocol
  await page.evaluate(() => {
    const tabs = Array.from(document.querySelectorAll("button, [role=\"tab\"]"));
    const emkTab = tabs.find((t) => t.textContent && (t.textContent.includes("043/у") || t.textContent.includes("ЭМК")));
    if (emkTab) emkTab.click();
  });
  await page.waitForTimeout(1200);

  await applyTheme("light");
  await captureProof("03_emk_visit_pc_light.png", "ЭМК Пациента 043/у — PC Light 1440x900");

  await applyTheme("dark");
  await captureProof("04_emk_visit_pc_dark.png", "ЭМК Пациента 043/у — PC Dark 1440x900");

  // -------------------------------------------------------------
  // ROUTE 3: Счета / Касса 54-ФЗ (Finance & 54-FZ Cashier)
  // -------------------------------------------------------------
  console.log("--- 3. Capturing Finance & 54-FZ Cashier ---");
  await setPerspective("standard");
  await page.evaluate(() => { window.location.hash = "finance"; });
  await page.waitForSelector(".finance-header-actions, .finance-container", { timeout: 20000 });
  await page.waitForTimeout(1200);

  await applyTheme("light");
  await captureProof("05_finance_cashier_pc_light.png", "Счета и Касса 54-ФЗ — PC Light 1440x900");

  await applyTheme("dark");
  await captureProof("06_finance_cashier_pc_dark.png", "Счета и Касса 54-ФЗ — PC Dark 1440x900");

  // -------------------------------------------------------------
  // ROUTE 4: Планы лечения (Treatment Plans)
  // -------------------------------------------------------------
  console.log("--- 4. Capturing Treatment Plans ---");
  // Set perspective to "presentation" which renders TreatmentPlanModule in #visit, or navigate directly
  await setPerspective("presentation");
  await page.evaluate(() => { window.location.hash = "visit"; });
  await page.waitForSelector('[aria-busy="true"]', { state: "detached", timeout: 30000 }).catch(() => {});
  await page.waitForTimeout(2000);

  await applyTheme("light");
  await captureProof("07_treatment_plans_pc_light.png", "Планы лечения — PC Light 1440x900");

  await applyTheme("dark");
  await captureProof("08_treatment_plans_pc_dark.png", "Планы лечения — PC Dark 1440x900");

  // -------------------------------------------------------------
  // ROUTE 5: КТ-студия / Снимки (CT Studio & Imaging)
  // -------------------------------------------------------------
  console.log("--- 5. Capturing CT Studio & Imaging ---");
  await setPerspective("standard");
  await page.evaluate(() => { window.location.hash = "imaging"; });
  await page.waitForSelector(".imaging-view, .imaging-container, .imaging-workspace", { timeout: 20000 }).catch(() => {});
  await page.waitForTimeout(2000);

  await applyTheme("light");
  await captureProof("09_imaging_ct_studio_pc_light.png", "КТ-студия / Снимки — PC Light 1440x900");

  await applyTheme("dark");
  await captureProof("10_imaging_ct_studio_pc_dark.png", "КТ-студия / Снимки — PC Dark 1440x900");

  await browser.close();

  console.log("\n==================================================");
  console.log("INQUISITION RED TEAM CAPTURE AUDIT REPORT");
  console.log("==================================================");
  console.table(records);

  const hashes = new Set(records.map((r) => r.md5));
  const uniqueHashes = hashes.size === records.length;
  const allAbove40k = records.every((r) => r.sizeBytes >= 40960);

  console.log(`Total captured: ${records.length}/10`);
  console.log(`Unique MD5 hashes: ${uniqueHashes ? "YES (100% distinct screens)" : "FAIL"}`);
  console.log(`All files >= 40 KB: ${allAbove40k ? "PASS" : "FAIL"}`);

  if (!uniqueHashes || !allAbove40k || records.length < 10) {
    throw new Error("Visual proofmaker criteria failed!");
  }
}

run().catch((err) => {
  console.error("Capture execution error:", err);
  process.exit(1);
});
