/**
 * scripts/redteam_4state_inquisition_runner.cjs
 * Comprehensive 4-state Visual Inquisition Suite across 6 core clinical screens:
 * 1. Schedule (Расписание)
 * 2. Visit / Diary 043/u (Визит / Дневник 043/у)
 * 3. Odontogram (Зубная формула / Одонтограмма)
 * 4. Treatment Plans (Планы лечения / 3-Tier)
 * 5. Finance / Cashier 54-FZ (Касса / Счета 54-ФЗ)
 * 6. Patients Directory (Картотека пациентов)
 *
 * 4 States:
 * - PC Light: 1440x900
 * - PC Dark: 1440x900
 * - Mobile Light: 390x844
 * - Mobile Dark: 390x844
 */

const { chromium } = require("playwright");
const path = require("node:path");
const fs = require("node:fs");
const crypto = require("node:crypto");

const API_BASE = "http://127.0.0.1:4100";
const WEB_BASE = "http://127.0.0.1:5173";
const BRAIN_DIR = "C:/Users/Admin/.gemini/antigravity/brain/ab2efea1-9472-4107-91c3-faeecf38dcb1";
const OUT_DIR = path.resolve("C:/Clinic_MVP/dental-crm/docs/screenshots/inquisition_redteam_4state");

async function provisionSession() {
  const uniqueId = Date.now();
  console.log(`[Provisioning] Initializing test session chief-${uniqueId}@dente-clinic.ru...`);

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
      }).catch(() => {});

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
      }).catch(() => {});

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
      }).catch(() => {});
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

  const browser = await chromium.launch({
    headless: true,
    executablePath: "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });

  const records = [];

  const addAuthInitScript = (ctx) =>
    ctx.addInitScript(
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

  async function applyTheme(page, theme) {
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
    await page.waitForTimeout(600);
  }

  async function setPerspective(page, perspective) {
    await page.evaluate((persp) => {
      localStorage.setItem("dente_workspace_perspective", persp);
      if (window.__usePerspectiveStore) {
        window.__usePerspectiveStore.getState().setPerspective(persp);
      }
    }, perspective);
    await page.waitForTimeout(600);
  }

  async function captureProof(page, filename, description) {
    const filePath = path.join(OUT_DIR, filename);
    const brainPath = path.join(BRAIN_DIR, filename);

    await page.waitForSelector(".boot-state", { state: "detached", timeout: 30000 }).catch(() => {});
    await page.waitForSelector(".app-shell", { state: "visible", timeout: 20000 }).catch(() => {});
    await page.waitForTimeout(1000);

    try {
      await page.screenshot({ path: filePath, fullPage: false, animations: "disabled", timeout: 15000 });
    } catch (e) {
      console.warn(`[Screenshot retry] ${filename}: ${e.message}`);
      await page.waitForTimeout(2000);
      await page.screenshot({ path: filePath, fullPage: false, timeout: 20000 });
    }
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

  // =========================================================================
  // 1. DESKTOP SUITE (1440x900)
  // =========================================================================
  console.log("\n>>> STARTING 1440x900 DESKTOP SUITE <<<\n");
  const pcContext = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    deviceScaleFactor: 1,
    isMobile: false,
    hasTouch: false,
  });
  await addAuthInitScript(pcContext);
  const pcPage = await pcContext.newPage();
  await pcPage.goto(`${WEB_BASE}/#schedule`, { waitUntil: "domcontentloaded", timeout: 60000 });
  await pcPage.waitForSelector(".boot-state", { state: "detached", timeout: 60000 });
  await pcPage.waitForSelector(".app-shell", { state: "visible", timeout: 30000 });

  // 1A. Schedule PC
  console.log("--- PC Schedule ---");
  await setPerspective(pcPage, "standard");
  await pcPage.evaluate(() => { window.location.hash = "schedule"; });
  await pcPage.waitForSelector(".schedule-filter-strip, .schedule-container", { timeout: 20000 });
  await applyTheme(pcPage, "light");
  await captureProof(pcPage, "01_schedule_pc_light.png", "Расписание — PC Light 1440x900");
  await applyTheme(pcPage, "dark");
  await captureProof(pcPage, "02_schedule_pc_dark.png", "Расписание — PC Dark 1440x900");

  // 1B. Visit / Diary 043/u PC
  console.log("--- PC Visit EMK 043/u ---");
  await pcPage.evaluate(() => { window.location.hash = "visit"; });
  await pcPage.waitForSelector(".visit-monolithic-header, [data-testid=\"visit-view\"]", { timeout: 20000 });
  await pcPage.evaluate(() => {
    const tabs = Array.from(document.querySelectorAll("button, [role=\"tab\"]"));
    const emkTab = tabs.find((t) => t.textContent && (t.textContent.includes("043/у") || t.textContent.includes("ЭМК")));
    if (emkTab) emkTab.click();
  });
  await pcPage.waitForTimeout(1000);
  await applyTheme(pcPage, "light");
  await captureProof(pcPage, "03_visit_emk_pc_light.png", "Визит Дневник 043/у — PC Light 1440x900");
  await applyTheme(pcPage, "dark");
  await captureProof(pcPage, "04_visit_emk_pc_dark.png", "Визит Дневник 043/у — PC Dark 1440x900");

  // 1C. Odontogram PC
  console.log("--- PC Odontogram ---");
  await pcPage.evaluate(() => {
    const tabs = Array.from(document.querySelectorAll("button, [role=\"tab\"]"));
    const odoTab = tabs.find((t) => t.textContent && (t.textContent.includes("Формула") || t.textContent.includes("Зубная формула")));
    if (odoTab) odoTab.click();
  });
  await pcPage.waitForTimeout(1200);
  await applyTheme(pcPage, "light");
  await captureProof(pcPage, "05_odontogram_pc_light.png", "Одонтограмма — PC Light 1440x900");
  await applyTheme(pcPage, "dark");
  await captureProof(pcPage, "06_odontogram_pc_dark.png", "Одонтограмма — PC Dark 1440x900");

  // 1D. Treatment Plans PC
  console.log("--- PC Treatment Plans ---");
  await setPerspective(pcPage, "presentation");
  await pcPage.evaluate(() => { window.location.hash = "visit"; });
  await pcPage.waitForTimeout(1500);
  await applyTheme(pcPage, "light");
  await captureProof(pcPage, "07_treatment_plans_pc_light.png", "Планы лечения — PC Light 1440x900");
  await applyTheme(pcPage, "dark");
  await captureProof(pcPage, "08_treatment_plans_pc_dark.png", "Планы лечения — PC Dark 1440x900");

  // 1E. Finance / Cashier PC
  console.log("--- PC Finance Cashier ---");
  await setPerspective(pcPage, "standard");
  await pcPage.evaluate(() => { window.location.hash = "finance"; });
  await pcPage.waitForSelector(".finance-header-actions, .finance-container", { timeout: 20000 });
  await applyTheme(pcPage, "light");
  await captureProof(pcPage, "09_finance_cashier_pc_light.png", "Касса и Счета — PC Light 1440x900");
  await applyTheme(pcPage, "dark");
  await captureProof(pcPage, "10_finance_cashier_pc_dark.png", "Касса и Счета — PC Dark 1440x900");

  // 1F. Patients PC
  console.log("--- PC Patients ---");
  await pcPage.evaluate(() => { window.location.hash = "patients"; });
  await pcPage.waitForSelector(".patients-panel, .patients-header, .patient-card", { timeout: 20000 });
  await pcPage.waitForTimeout(1000);
  await applyTheme(pcPage, "light");
  await captureProof(pcPage, "11_patients_pc_light.png", "Картотека пациентов — PC Light 1440x900");
  await applyTheme(pcPage, "dark");
  await captureProof(pcPage, "12_patients_pc_dark.png", "Картотека пациентов — PC Dark 1440x900");

  await pcContext.close();

  // =========================================================================
  // 2. MOBILE SUITE (390x844)
  // =========================================================================
  console.log("\n>>> STARTING 390x844 MOBILE SUITE <<<\n");
  const mobileContext = await browser.newContext({
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 2,
    isMobile: true,
    hasTouch: true,
  });
  await addAuthInitScript(mobileContext);
  const mPage = await mobileContext.newPage();
  await mPage.goto(`${WEB_BASE}/#schedule`, { waitUntil: "domcontentloaded", timeout: 60000 });
  await mPage.waitForSelector(".boot-state", { state: "detached", timeout: 60000 });
  await mPage.waitForSelector(".app-shell", { state: "visible", timeout: 30000 });

  // 2A. Schedule Mobile
  console.log("--- Mobile Schedule ---");
  await setPerspective(mPage, "standard");
  await mPage.evaluate(() => { window.location.hash = "schedule"; });
  await mPage.waitForSelector(".schedule-filter-strip, .schedule-container", { timeout: 20000 });
  await applyTheme(mPage, "light");
  await captureProof(mPage, "13_schedule_mobile_light.png", "Расписание — Mobile Light 390x844");
  await applyTheme(mPage, "dark");
  await captureProof(mPage, "14_schedule_mobile_dark.png", "Расписание — Mobile Dark 390x844");

  // 2B. Visit / Diary 043/u Mobile
  console.log("--- Mobile Visit EMK 043/u ---");
  await mPage.evaluate(() => { window.location.hash = "visit"; });
  await mPage.waitForSelector(".visit-monolithic-header, [data-testid=\"visit-view\"]", { timeout: 20000 });
  await mPage.evaluate(() => {
    const tabs = Array.from(document.querySelectorAll("button, [role=\"tab\"]"));
    const emkTab = tabs.find((t) => t.textContent && (t.textContent.includes("043/у") || t.textContent.includes("ЭМК")));
    if (emkTab) emkTab.click();
  });
  await mPage.waitForTimeout(1000);
  await applyTheme(mPage, "light");
  await captureProof(mPage, "15_visit_emk_mobile_light.png", "Визит Дневник 043/у — Mobile Light 390x844");
  await applyTheme(mPage, "dark");
  await captureProof(mPage, "16_visit_emk_mobile_dark.png", "Визит Дневник 043/у — Mobile Dark 390x844");

  // 2C. Odontogram Mobile
  console.log("--- Mobile Odontogram ---");
  await mPage.evaluate(() => {
    const tabs = Array.from(document.querySelectorAll("button, [role=\"tab\"]"));
    const odoTab = tabs.find((t) => t.textContent && (t.textContent.includes("Формула") || t.textContent.includes("Зубная формула")));
    if (odoTab) odoTab.click();
  });
  await mPage.waitForTimeout(1200);
  await applyTheme(mPage, "light");
  await captureProof(mPage, "17_odontogram_mobile_light.png", "Одонтограмма — Mobile Light 390x844");
  await applyTheme(mPage, "dark");
  await captureProof(mPage, "18_odontogram_mobile_dark.png", "Одонтограмма — Mobile Dark 390x844");

  // 2D. Treatment Plans Mobile
  console.log("--- Mobile Treatment Plans ---");
  await setPerspective(mPage, "presentation");
  await mPage.evaluate(() => { window.location.hash = "visit"; });
  await mPage.waitForTimeout(1500);
  await applyTheme(mPage, "light");
  await captureProof(mPage, "19_treatment_plans_mobile_light.png", "Планы лечения — Mobile Light 390x844");
  await applyTheme(mPage, "dark");
  await captureProof(mPage, "20_treatment_plans_mobile_dark.png", "Планы лечения — Mobile Dark 390x844");

  // 2E. Finance / Cashier Mobile
  console.log("--- Mobile Finance Cashier ---");
  await setPerspective(mPage, "standard");
  await mPage.evaluate(() => { window.location.hash = "finance"; });
  await mPage.waitForSelector(".finance-header-actions, .finance-container", { timeout: 20000 });
  await applyTheme(mPage, "light");
  await captureProof(mPage, "21_finance_cashier_mobile_light.png", "Касса и Счета — Mobile Light 390x844");
  await applyTheme(mPage, "dark");
  await captureProof(mPage, "22_finance_cashier_mobile_dark.png", "Касса и Счета — Mobile Dark 390x844");

  // 2F. Patients Mobile
  console.log("--- Mobile Patients ---");
  await mPage.evaluate(() => { window.location.hash = "patients"; });
  await mPage.waitForSelector(".patients-panel, .patients-header, .patient-card", { timeout: 20000 });
  await mPage.waitForTimeout(1000);
  await applyTheme(mPage, "light");
  await captureProof(mPage, "23_patients_mobile_light.png", "Картотека пациентов — Mobile Light 390x844");
  await applyTheme(mPage, "dark");
  await captureProof(mPage, "24_patients_mobile_dark.png", "Картотека пациентов — Mobile Dark 390x844");

  await mobileContext.close();
  await browser.close();

  console.log("\n==================================================");
  console.log("4-STATE 24-SCREENSHOT INQUISITION AUDIT REPORT");
  console.log("==================================================");
  console.table(records);

  const hashes = new Set(records.map((r) => r.md5));
  const uniqueHashes = hashes.size === records.length;
  const allAbove40k = records.every((r) => r.sizeBytes >= 40960);

  console.log(`Total captured: ${records.length}/24`);
  console.log(`Unique MD5 hashes: ${uniqueHashes ? "YES (100% distinct screens)" : "FAIL"}`);
  console.log(`All files >= 40 KB: ${allAbove40k ? "PASS" : "FAIL"}`);

  if (!uniqueHashes || !allAbove40k || records.length < 24) {
    throw new Error("4-state inquisition runner failed criteria!");
  }
}

run().catch((err) => {
  console.error("4-state capture error:", err);
  process.exit(1);
});
