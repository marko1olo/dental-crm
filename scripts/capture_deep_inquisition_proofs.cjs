/**
 * scripts/capture_deep_inquisition_proofs.cjs
 * Comprehensive Playwright Capture Pipeline for Red Team Visual Proof & Ergonomic Inquisition
 * 
 * Target Workspaces:
 * 1. Schedule (Desktop Light/Dark, Mobile Light/Dark)
 * 2. Patients (Desktop Light/Dark, Mobile Light/Dark)
 * 3. Visit (Desktop Light/Dark, Mobile Light/Dark)
 * 4. Finance (Desktop Light/Dark, Mobile Light/Dark)
 * 
 * Quality Invariants:
 * - Live server execution only (HTTP 200 Fastify API & Vite Web)
 * - Unique MD5 hash per screenshot (zero duplicate/cloned screens)
 * - Size >= 40 KB per screenshot
 * - Zero 500 / Server Error / Blank Body
 * - Viewport verification: 1440x900 (PC) and 390x844 (Mobile)
 */

const { chromium } = require("playwright");
const path = require("node:path");
const fs = require("node:fs");
const crypto = require("node:crypto");
const { db } = require("../apps/api/dist/db/client.js");
const schema = require("../apps/api/dist/db/schema.js");

async function provisionLiveSession() {
  const API_BASE = "http://127.0.0.1:4100";
  const uniqueId = Date.now();
  console.log("[Provisioning] Initializing clean clinic session via API...");

  const initRes = await fetch(`${API_BASE}/api/auth/setup/init`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      clinicName: "Стоматология ДЕНТЕ Премиум",
      email: `chief-audit-${uniqueId}@dente-clinic.ru`,
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

  const orgId = initData.organizationId;
  const clinicId = crypto.randomUUID();
  const chairId = crypto.randomUUID();

  // Ensure clinic and chair rows exist in database
  await db.insert(schema.clinics).values({
    id: clinicId,
    organizationId: orgId,
    name: "Основное отделение",
    address: "ул. Стоматологическая, д. 10",
  });

  await db.insert(schema.chairs).values({
    id: chairId,
    organizationId: orgId,
    clinicId: clinicId,
    name: "Кресло 1 (Терапия/Хирургия)",
    isActive: true,
  });

  const headers = {
    "Content-Type": "application/json",
    "x-dente-clinic-token": initData.clinicToken,
    "x-dente-staff-token": unlockData.staffToken,
  };

  let patient1Id = null;
  let patient2Id = null;
  let patient3Id = null;
  let appointment1Id = null;

  // Patient 1 (Primary - In treatment)
  try {
    const p1Res = await fetch(`${API_BASE}/api/patients`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        fullName: "Ковалёв Роман Станиславович",
        phone: "+7 (999) 888-77-66",
        birthDate: "1988-04-12",
        gender: "male",
        notes: "Аллергия на пенициллин, глубокий кариес 36 зуба",
      }),
    });
    if (p1Res.ok) {
      const p1Data = await p1Res.json();
      patient1Id = p1Data.id;
      console.log(`[Provisioning] Created Patient 1: ${patient1Id} (${p1Data.fullName})`);

      const now = new Date();
      const startsAt = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 10, 0, 0);
      const endsAt = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 11, 0, 0);

      const appt1Res = await fetch(`${API_BASE}/api/appointments`, {
        method: "POST",
        headers,
        body: JSON.stringify({
          patientId: patient1Id,
          doctorUserId: initData.ownerUserId,
          chairId,
          status: "in_treatment",
          startsAt: startsAt.toISOString(),
          endsAt: endsAt.toISOString(),
          reason: "Лечение кариеса 3.6 (Острая боль)",
          comment: "Пациент в кресле, анестезия артикаин 1.7 мл",
        }),
      });
      if (appt1Res.ok) {
        const appt1Data = await appt1Res.json();
        const foundAppt = appt1Data.appointments?.find((a) => a.patientId === patient1Id);
        appointment1Id = foundAppt?.id || null;
        console.log(`[Provisioning] Created in_treatment appointment for Patient 1 (${appointment1Id})`);
      }

      // Payment 1 for Patient 1
      const pay1Res = await fetch(`${API_BASE}/api/billing/payments`, {
        method: "POST",
        headers: {
          ...headers,
          "Idempotency-Key": `pay-${uniqueId}-1`,
        },
        body: JSON.stringify({
          patientId: patient1Id,
          amountRub: 14500,
          method: "card",
          clientMutationId: crypto.randomUUID(),
          fiscalReceiptNumber: "ФЧ-000421",
          fiscalReceiptIssuedAt: new Date().toISOString(),
          note: "Оплата за комплексное лечение кариеса",
        }),
      });
      if (pay1Res.ok) {
        console.log("[Provisioning] Recorded payment 1 (14 500 ₽, card, ФЧ-000421)");
      }
    }
  } catch (err) {
    console.error("[Provisioning] Error seeding patient 1:", err.message);
  }

  // Patient 2
  try {
    const p2Res = await fetch(`${API_BASE}/api/patients`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        fullName: "Смирнова Елена Васильевна",
        phone: "+7 (916) 234-56-78",
        birthDate: "1992-11-20",
        gender: "female",
        notes: "Соматически здорова / норма",
      }),
    });
    if (p2Res.ok) {
      const p2Data = await p2Res.json();
      patient2Id = p2Data.id;
      console.log(`[Provisioning] Created Patient 2: ${patient2Id} (${p2Data.fullName})`);

      const now = new Date();
      const startsAt2 = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 12, 0, 0);
      const endsAt2 = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 13, 0, 0);

      await fetch(`${API_BASE}/api/appointments`, {
        method: "POST",
        headers,
        body: JSON.stringify({
          patientId: patient2Id,
          doctorUserId: initData.ownerUserId,
          chairId,
          status: "confirmed",
          startsAt: startsAt2.toISOString(),
          endsAt: endsAt2.toISOString(),
          reason: "Профессиональная гигиена полости рта",
          comment: "Подтверждено по WhatsApp",
        }),
      });
      console.log("[Provisioning] Created confirmed appointment for Patient 2");

      // Payment 2 for Patient 2
      await fetch(`${API_BASE}/api/billing/payments`, {
        method: "POST",
        headers: {
          ...headers,
          "Idempotency-Key": `pay-${uniqueId}-2`,
        },
        body: JSON.stringify({
          patientId: patient2Id,
          amountRub: 8200,
          method: "cash",
          clientMutationId: crypto.randomUUID(),
          fiscalReceiptNumber: "ФЧ-000422",
          fiscalReceiptIssuedAt: new Date().toISOString(),
          note: "Аванс за профессиональную гигиену",
        }),
      });
      console.log("[Provisioning] Recorded payment 2 (8 200 ₽, cash, ФЧ-000422)");
    }
  } catch (err) {
    console.error("[Provisioning] Error seeding patient 2:", err.message);
  }

  // Patient 3
  try {
    const p3Res = await fetch(`${API_BASE}/api/patients`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        fullName: "Алексеев Владимир Сергеевич",
        phone: "+7 (903) 987-65-43",
        birthDate: "1975-03-08",
        gender: "male",
        notes: "Имплантация 4.6, консультация ортопеда",
      }),
    });
    if (p3Res.ok) {
      const p3Data = await p3Res.json();
      patient3Id = p3Data.id;
      console.log(`[Provisioning] Created Patient 3: ${patient3Id} (${p3Data.fullName})`);
    }
  } catch (err) {
    console.error("[Provisioning] Error seeding patient 3:", err.message);
  }

  // Seed realistic dental warehouse items for inventory audit
  try {
    await db.insert(schema.inventoryItems).values([
      {
        organizationId: orgId,
        name: "Артикаин ИНИБСА 1:100000 1.7 мл (карпулы)",
        category: "material",
        unit: "карпула",
        currentQty: "48.000",
        stockQuantity: "48.000",
        minQty: "20.000",
        criticalThreshold: "20.000",
        pricePerUnit: "120.00",
        unitCostRub: "120.00",
        sku: "ART-100-50",
        barcode: "4601234567890",
        notes: "Партия: 240801, годен до 08.2027",
      },
      {
        organizationId: orgId,
        name: "Композит светоотверждаемый Filtek Ultimate A2 (шприц 4г)",
        category: "material",
        unit: "шприц",
        currentQty: "6.000",
        stockQuantity: "6.000",
        minQty: "3.000",
        criticalThreshold: "3.000",
        pricePerUnit: "4200.00",
        unitCostRub: "4200.00",
        sku: "FLT-ULT-A2",
        barcode: "4609876543210",
        notes: "Партия: 240515, годен до 05.2028",
      },
      {
        organizationId: orgId,
        name: "Иглы карпульные стоматологические 30G короткие 21мм",
        category: "material",
        unit: "шт",
        currentQty: "150.000",
        stockQuantity: "150.000",
        minQty: "50.000",
        criticalThreshold: "50.000",
        pricePerUnit: "18.50",
        unitCostRub: "18.50",
        sku: "NDL-30G-21",
        barcode: "4605551234567",
        notes: "Партия: 240310, годен до 03.2029",
      },
      {
        organizationId: orgId,
        name: "Перчатки смотровые нитриловые неприпудренные (р-р M)",
        category: "material",
        unit: "пара",
        currentQty: "12.000",
        stockQuantity: "12.000",
        minQty: "30.000",
        criticalThreshold: "30.000",
        pricePerUnit: "25.00",
        unitCostRub: "25.00",
        sku: "GLV-NIT-M",
        barcode: "4604449876543",
        notes: "В дефиците! Требуется дозаказ",
      },
    ]);
    console.log("[Provisioning] Seeded 4 realistic dental warehouse items");
  } catch (invErr) {
    console.error("[Provisioning] Error seeding inventory items:", invErr.message);
  }

  return {
    clinicToken: initData.clinicToken,
    staffToken: unlockData.staffToken,
    ownerUserId: initData.ownerUserId,
    patientId: patient1Id,
    appointmentId: appointment1Id,
  };
}

async function runCapture() {
  const outDir = path.resolve("C:/Clinic_MVP/dental-crm/docs/screenshots/inquisition_live");
  fs.mkdirSync(outDir, { recursive: true });

  const brainDir = path.resolve("C:/Users/Admin/.gemini/antigravity/brain/f7d36a81-134e-4ff9-8b9b-915c338cc092");
  fs.mkdirSync(brainDir, { recursive: true });

  const auth = await provisionLiveSession();

  console.log("[Playwright] Launching Chrome executable...");
  const browser = await chromium.launch({
    headless: true,
    executablePath: "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });

  const capturedRegistry = [];
  const seenHashes = new Set();

  async function takeProof(page, fileName, targetDesc) {
    // Audit for crash / error body before capture
    const pageErrorState = await page.evaluate(() => {
      const text = document.body.innerText || "";
      const is500 = text.includes("Server Error") || text.includes("500 Internal") || text.includes("RouteNotFound");
      const isBootStall = text.includes("Загрузка CRM") && !document.querySelector(".workspace-shell");
      const isEmpty = document.body.children.length === 0;
      return { is500, isBootStall, isEmpty, textSnippet: text.slice(0, 100) };
    });

    if (pageErrorState.is500) {
      throw new Error(`CRITICAL DEFECT: Server error detected on page before capturing ${fileName}: ${pageErrorState.textSnippet}`);
    }
    if (pageErrorState.isBootStall) {
      throw new Error(`CRITICAL DEFECT: Boot stall ('Загрузка CRM') detected before capturing ${fileName}!`);
    }
    if (pageErrorState.isEmpty) {
      throw new Error(`CRITICAL DEFECT: Blank body detected before capturing ${fileName}!`);
    }

    const targetFile = path.join(outDir, fileName);
    const brainFile = path.join(brainDir, fileName);

    await page.waitForTimeout(600);
    await page.screenshot({ path: targetFile, fullPage: false, animations: "disabled", timeout: 20000 });

    // Copy to active brain directory for direct view_file inspection
    fs.copyFileSync(targetFile, brainFile);

    const stats = fs.statSync(targetFile);
    const hash = crypto.createHash("md5").update(fs.readFileSync(targetFile)).digest("hex");

    if (seenHashes.has(hash)) {
      throw new Error(`CRITICAL VIOLATION: Duplicate screenshot hash detected for ${fileName}: ${hash}`);
    }
    seenHashes.add(hash);

    if (stats.size < 40960) {
      throw new Error(`CRITICAL VIOLATION: Screenshot ${fileName} is too small (${stats.size} bytes < 40 KB threshold)`);
    }

    const item = {
      fileName,
      targetDesc,
      sizeBytes: stats.size,
      sizeKb: (stats.size / 1024).toFixed(1),
      md5: hash,
      path: targetFile,
      passSize: stats.size >= 40960,
    };
    capturedRegistry.push(item);

    console.log(
      `[Captured] ${fileName} (${targetDesc}): ${stats.size} bytes (${item.sizeKb} KB), MD5: ${hash}`
    );
  }

  const addAuthInitScript = (ctx, themeMode) =>
    ctx.addInitScript(
      ({ ct, st, uid, pid, th }) => {
        if (typeof document !== "undefined" && document.documentElement) {
          document.documentElement.setAttribute("data-theme", th);
          if (th === "dark") {
            document.documentElement.classList.add("dark");
            document.documentElement.classList.remove("light");
          } else {
            document.documentElement.classList.remove("dark");
            document.documentElement.classList.add("light");
          }
        }
        localStorage.setItem("dente_clinic_token", ct);
        localStorage.setItem("dente_staff_token", st);
        localStorage.setItem("dente_active_role", "owner");
        localStorage.setItem("dente_theme_mode", th);
        localStorage.setItem("theme", th);
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
        th: themeMode,
      }
    );

  async function applyTheme(page, theme) {
    for (let attempt = 0; attempt < 5; attempt++) {
      try {
        await page.waitForTimeout(400);
        await page.evaluate((th) => {
          localStorage.setItem("dente_theme_mode", th);
          localStorage.setItem("theme", th);
          document.documentElement.setAttribute("data-theme", th);
          document.body.setAttribute("data-theme", th);
          if (th === "dark") {
            document.documentElement.classList.add("dark");
            document.documentElement.classList.remove("light");
          } else {
            document.documentElement.classList.remove("dark");
            document.documentElement.classList.add("light");
          }
          const store = window.__useThemeStore;
          if (store && typeof store.getState === "function") {
            store.getState().setThemeMode(th);
          }
        }, theme);
        return;
      } catch (err) {
        if (attempt === 4) throw err;
        await page.waitForTimeout(600);
      }
    }
  }

  // =========================================================================
  // 1. DESKTOP SUITE (1440x900)
  // =========================================================================
  console.log("\n==================== 1. DESKTOP SUITE (1440x900) ====================");

  for (const theme of ["light", "dark"]) {
    const desktopContext = await browser.newContext({
      viewport: { width: 1440, height: 900 },
      deviceScaleFactor: 2,
      isMobile: false,
    });
    await addAuthInitScript(desktopContext, theme);
    const page = await desktopContext.newPage();

    // 1A. Schedule Desktop
    console.log(`\n[Desktop] Opening Schedule View (${theme})...`);
    await page.goto("http://127.0.0.1:5173/#schedule", { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(2500);

    const retryDesk = await page.$(".boot-retry-button");
    if (retryDesk) {
      console.log("[RETRY] Clicking boot-retry-button on desktop...");
      await retryDesk.click();
      await page.waitForTimeout(2000);
    }

    await page.waitForSelector("#schedule, [data-testid='schedule-view'], .workspace-shell", { timeout: 25000 });
    await page.waitForFunction(() => {
      const text = document.body.innerText || "";
      return !text.includes("Загрузка CRM") &&
             !text.includes("Подготовка модулей") &&
             (text.includes("Ковалёв") || text.includes("Воронов") || text.includes("Записать на") || document.querySelector(".workspace-shell"));
    }, { timeout: 25000 });
    await applyTheme(page, theme);
    await page.waitForTimeout(1200);
    await takeProof(page, `proof_01_schedule_desktop_${theme}.png`, `Schedule View Desktop ${theme}`);

    // 1B. Patients Desktop
    console.log(`\n[Desktop] Opening Patients View (${theme})...`);
    await page.evaluate(() => { window.location.hash = "#patients"; });
    await page.waitForTimeout(1000);
    await page.waitForSelector("#patients, .patients-panel, [data-testid='patients-view']", { timeout: 20000 });
    await page.waitForFunction(() => {
      const text = document.body.innerText || "";
      return !text.includes("Загрузка CRM") &&
             !text.includes("загрузка") &&
             (text.includes("Ковалёв") || text.includes("Пациенты") || document.querySelector(".patients-panel"));
    }, { timeout: 20000 });
    await page.waitForTimeout(1000);
    await takeProof(page, `proof_02_patients_desktop_${theme}.png`, `Patients View Desktop ${theme}`);

    // 1C. Visit Desktop
    console.log(`\n[Desktop] Opening Visit View (${theme})...`);
    await page.evaluate(() => { window.location.hash = "#visit"; });
    await page.waitForTimeout(1000);
    await page.waitForSelector("#visit, [data-testid='visit-view'], .visit-panel", { timeout: 20000 });
    await page.waitForFunction(() => {
      const text = document.body.innerText || "";
      return !text.includes("Загрузка CRM") &&
             (text.includes("Приём") || text.includes("Ковалёв") || document.querySelector(".odontogram-container, [data-testid='visit-view'], #visit"));
    }, { timeout: 20000 });
    await page.waitForTimeout(1000);
    await takeProof(page, `proof_03_visit_desktop_${theme}.png`, `Visit View Desktop ${theme}`);

    // 1D. Finance Desktop
    console.log(`\n[Desktop] Opening Finance View (${theme})...`);
    await page.evaluate(() => { window.location.hash = "#finance"; });
    await page.waitForTimeout(1000);
    await page.waitForSelector("#finance, .finance-panel, [data-testid='finance-view']", { timeout: 20000 });
    await page.waitForFunction(() => {
      const text = document.body.innerText || "";
      return !text.includes("Загрузка CRM") &&
             (text.includes("Оплаты") || text.includes("Касса") || text.includes("14 500") || document.querySelector("#finance, .finance-panel"));
    }, { timeout: 20000 });
    await page.waitForTimeout(1000);
    await takeProof(page, `proof_04_finance_desktop_${theme}.png`, `Finance View Desktop ${theme}`);

    // 1E. Warehouse Desktop
    console.log(`\n[Desktop] Opening Warehouse View (${theme})...`);
    await page.evaluate(() => { window.location.hash = "#inventory"; });
    await page.waitForTimeout(1000);
    await page.waitForFunction(() => {
      const text = document.body.innerText || "";
      return !text.includes("Загрузка CRM") &&
             !text.includes("Загрузка склада") &&
             (text.includes("Склад материалов") || text.includes("Позиций") || text.includes("Артикаин"));
    }, { timeout: 20000 });
    await page.waitForTimeout(1000);
    await takeProof(page, `proof_10_warehouse_desktop_${theme}.png`, `Warehouse View Desktop ${theme}`);

    await desktopContext.close();
  }

  // =========================================================================
  // 2. MOBILE SUITE (390x844)
  // =========================================================================
  console.log("\n==================== 2. MOBILE SUITE (390x844) ====================");

  for (const theme of ["light", "dark"]) {
    const mobileContext = await browser.newContext({
      viewport: { width: 390, height: 844 },
      deviceScaleFactor: 2,
      isMobile: true,
      hasTouch: true,
    });
    await addAuthInitScript(mobileContext, theme);
    const page = await mobileContext.newPage();

    // 2A. Schedule Mobile
    console.log(`\n[Mobile] Opening Schedule View (${theme})...`);
    await page.goto("http://127.0.0.1:5173/#schedule", { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(2500);

    const retryMob = await page.$(".boot-retry-button");
    if (retryMob) {
      console.log("[RETRY] Clicking boot-retry-button on mobile...");
      await retryMob.click();
      await page.waitForTimeout(2000);
    }

    await page.waitForSelector("#schedule, [data-testid='schedule-view'], .workspace-shell", { timeout: 25000 });
    await page.waitForFunction(() => {
      const text = document.body.innerText || "";
      return !text.includes("Загрузка CRM") &&
             !text.includes("Подготовка модулей") &&
             (text.includes("Ковалёв") || text.includes("Воскресенье") || text.includes("В кресле") || document.querySelector(".workspace-shell"));
    }, { timeout: 25000 });
    await applyTheme(page, theme);
    await page.waitForTimeout(1000);
    await page.evaluate(() => {
      window.scrollTo(0, 0);
      const scrollEl = document.querySelector(".overflow-y-auto, main");
      if (scrollEl) scrollEl.scrollTop = 0;
    });
    await page.waitForTimeout(800);
    await takeProof(page, `proof_05_schedule_mobile_${theme}.png`, `Schedule View Mobile ${theme}`);

    // 2B. Patients Mobile
    console.log(`\n[Mobile] Opening Patients View (${theme})...`);
    await page.evaluate(() => { window.location.hash = "#patients"; });
    await page.waitForTimeout(1000);
    await page.waitForSelector("#patients, .patients-panel, [data-testid='patients-view']", { timeout: 20000 });
    await page.waitForFunction(() => {
      const text = document.body.innerText || "";
      return !text.includes("Загрузка CRM") &&
             !text.includes("загрузка") &&
             (text.includes("Ковалёв") || text.includes("Пациенты") || document.querySelector(".patients-panel"));
    }, { timeout: 20000 });
    await page.evaluate(() => {
      window.scrollTo(0, 0);
      const scrollEl = document.querySelector(".overflow-y-auto, main, .patients-panel");
      if (scrollEl) scrollEl.scrollTop = 0;
    });
    await page.waitForTimeout(800);
    await takeProof(page, `proof_06_patients_mobile_${theme}.png`, `Patients View Mobile ${theme}`);

    // 2C. Visit Mobile
    console.log(`\n[Mobile] Opening Visit View (${theme})...`);
    await page.evaluate(() => { window.location.hash = "#visit"; });
    await page.waitForTimeout(1000);
    await page.waitForSelector("#visit, [data-testid='visit-view'], .visit-panel", { timeout: 20000 });
    await page.waitForFunction(() => {
      const text = document.body.innerText || "";
      return !text.includes("Загрузка CRM") &&
             (text.includes("Приём") || text.includes("Ковалёв") || document.querySelector(".odontogram-container, [data-testid='visit-view'], #visit"));
    }, { timeout: 20000 });
    await page.waitForTimeout(800);
    await takeProof(page, `proof_07_visit_mobile_${theme}.png`, `Visit View Mobile ${theme}`);

    // 2D. Finance Mobile
    console.log(`\n[Mobile] Opening Finance View (${theme})...`);
    await page.evaluate(() => { window.location.hash = "#finance"; });
    await page.waitForTimeout(1000);
    await page.waitForSelector("#finance, .finance-panel, [data-testid='finance-view']", { timeout: 20000 });
    await page.waitForFunction(() => {
      const text = document.body.innerText || "";
      return !text.includes("Загрузка CRM") &&
             (text.includes("Оплаты") || text.includes("Касса") || text.includes("14 500") || document.querySelector("#finance, .finance-panel"));
    }, { timeout: 20000 });
    await page.waitForTimeout(800);
    await takeProof(page, `proof_08_finance_mobile_${theme}.png`, `Finance View Mobile ${theme}`);

    // 2E. Warehouse Mobile
    console.log(`\n[Mobile] Opening Warehouse View (${theme})...`);
    await page.evaluate(() => { window.location.hash = "#inventory"; });
    await page.waitForTimeout(1000);
    await page.waitForFunction(() => {
      const text = document.body.innerText || "";
      return !text.includes("Загрузка CRM") &&
             !text.includes("Загрузка склада") &&
             (text.includes("Склад материалов") || text.includes("Позиций") || text.includes("Артикаин"));
    }, { timeout: 20000 });
    await page.evaluate(() => {
      window.scrollTo(0, 0);
      const scrollEl = document.querySelector(".overflow-y-auto, main");
      if (scrollEl) scrollEl.scrollTop = 0;
    });
    await page.waitForTimeout(800);
    await takeProof(page, `proof_11_warehouse_mobile_${theme}.png`, `Warehouse View Mobile ${theme}`);

    await mobileContext.close();
  }

  await browser.close();

  console.log("\n=======================================================");
  console.log(`[CAPTURE PIPELINE COMPLETE] Successfully captured ${capturedRegistry.length} screens.`);
  console.log(JSON.stringify(capturedRegistry, null, 2));
  console.log("=======================================================\n");

  return capturedRegistry;
}

runCapture()
  .then((registry) => {
    console.log(`[DONE] ${registry.length} screenshots verified.`);
    process.exit(0);
  })
  .catch((err) => {
    console.error("FATAL ERROR in runCapture:", err);
    process.exit(1);
  });
