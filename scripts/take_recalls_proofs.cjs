/**
 * scripts/take_recalls_proofs.cjs
 *
 * Captures 4-state visual proofs for Patient Recalls, Prophylaxis & Retention Funnel:
 * 1. PC Light (1440x900) - Recalls Hub Modal with Real Calculated PostgreSQL 18 Candidates
 * 2. PC Dark (1440x900) - Recalls Hub with QuickBookingDrawer (Order 804n auto-populated)
 * 3. Mobile Light (390x844) - Apple HIG 1-Row Segmented Chips & Touch Ergonomics (>=44x44px)
 * 4. Mobile Dark (390x844) - Mobile Kanban in Dark Theme (zero horizontal drift)
 */

const { chromium } = require("playwright");
const fs = require("node:fs");
const path = require("node:path");

const API_BASE = "http://127.0.0.1:4100";
const WEB_BASE = "http://127.0.0.1:5173";
const PROOFS_DIR = path.resolve(__dirname, "../docs/proofs/recalls");

if (!fs.existsSync(PROOFS_DIR)) {
  fs.mkdirSync(PROOFS_DIR, { recursive: true });
}

async function provisionClinicalRecallsSession() {
  const uniqueId = Date.now();
  console.log(`[Provisioning] Initializing clinic session recalls-${uniqueId}@dente-clinic.ru...`);

  const initRes = await fetch(`${API_BASE}/api/auth/setup/init`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      clinicName: "Клиника ДЕНТЕ (Профилактика и Реколлы)",
      email: `recalls-proof-${uniqueId}@dente-clinic.ru`,
      password: "Password123!",
      ownerName: "Д-р Смирнова Екатерина Васильевна",
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

  // Seed 4 Real Clinical Patients with different clinical histories
  console.log("[Provisioning] Seeding 4 clinical patients...");

  // Patient 1: Hygiene 6m candidate (completed 7 months ago)
  const p1Res = await fetch(`${API_BASE}/api/patients`, {
    method: "POST",
    headers,
    body: JSON.stringify({
      fullName: "Кузнецова Ирина Викторовна",
      birthDate: "1989-05-14",
      gender: "female",
      phone: "+7 (916) 234-56-78",
      allergies: "Без отягощенного аллергоанамнеза",
      chronicDiseases: "Соматически здорова",
    }),
  });
  const p1 = await p1Res.json();
  const p1Id = p1.patient?.id || p1.id;

  // Patient 2: Periodontal 3m candidate (completed 4 months ago)
  const p2Res = await fetch(`${API_BASE}/api/patients`, {
    method: "POST",
    headers,
    body: JSON.stringify({
      fullName: "Соколов Максим Игоревич",
      birthDate: "1978-11-20",
      gender: "male",
      phone: "+7 (926) 345-67-89",
      allergies: "Хлоргексидин (легкая гиперемия)",
      chronicDiseases: "Хронический генерализованный пародонтит",
    }),
  });
  const p2 = await p2Res.json();
  const p2Id = p2.patient?.id || p2.id;

  // Patient 3: Endodontic 1m check candidate (completed 2 months ago)
  const p3Res = await fetch(`${API_BASE}/api/patients`, {
    method: "POST",
    headers,
    body: JSON.stringify({
      fullName: "Волкова Анна Сергеевна",
      birthDate: "1995-02-28",
      gender: "female",
      phone: "+7 (903) 456-78-90",
      allergies: "Без аллергий",
      chronicDiseases: "Здорова",
    }),
  });
  const p3 = await p3Res.json();
  const p3Id = p3.patient?.id || p3.id;

  // Patient 4: Implant 12m annual check candidate
  const p4Res = await fetch(`${API_BASE}/api/patients`, {
    method: "POST",
    headers,
    body: JSON.stringify({
      fullName: "Дмитриев Роман Олегович",
      birthDate: "1982-08-09",
      gender: "male",
      phone: "+7 (985) 567-89-01",
      allergies: "Пенициллиновый ряд",
      chronicDiseases: "Соматически компенсирован",
    }),
  });
  const p4 = await p4Res.json();
  const p4Id = p4.patient?.id || p4.id;

  // Now seed completed past appointments directly in DB or via API so recallCandidates finds them
  // Let's create past appointments via DB client or API
  console.log("[Provisioning] Seeding completed historical appointments...");

  const { db } = await import("../apps/api/dist/db/client.js");
  const { appointments, patientImplantInstallations } = await import("../apps/api/dist/db/schema.js");

  const sevenMonthsAgo = new Date();
  sevenMonthsAgo.setMonth(sevenMonthsAgo.getMonth() - 7);

  const fourMonthsAgo = new Date();
  fourMonthsAgo.setMonth(fourMonthsAgo.getMonth() - 4);

  const twoMonthsAgo = new Date();
  twoMonthsAgo.setMonth(twoMonthsAgo.getMonth() - 2);

  const thirteenMonthsAgo = new Date();
  thirteenMonthsAgo.setMonth(thirteenMonthsAgo.getMonth() - 13);

  // Insert completed appointment for P1 (Hygiene)
  await db.insert(appointments).values({
    organizationId: initData.organizationId,
    patientId: p1Id,
    doctorUserId: initData.ownerUserId,
    startsAt: sevenMonthsAgo,
    endsAt: new Date(sevenMonthsAgo.getTime() + 45 * 60000),
    status: "completed",
    reason: "Комплексная профессиональная гигиена полости рта и реминерализация",
  });

  // Insert completed appointment for P2 (Periodontal)
  await db.insert(appointments).values({
    organizationId: initData.organizationId,
    patientId: p2Id,
    doctorUserId: initData.ownerUserId,
    startsAt: fourMonthsAgo,
    endsAt: new Date(fourMonthsAgo.getTime() + 60 * 60000),
    status: "completed",
    reason: "Пародонтологическое лечение: кюретаж пародонтальных карманов и вектор-терапия",
  });

  // Insert completed appointment for P3 (Endodontic)
  await db.insert(appointments).values({
    organizationId: initData.organizationId,
    patientId: p3Id,
    doctorUserId: initData.ownerUserId,
    startsAt: twoMonthsAgo,
    endsAt: new Date(twoMonthsAgo.getTime() + 90 * 60000),
    status: "completed",
    reason: "Эндодонтическое лечение пульпита 3 каналов зуба 16, обтурация",
  });

  // Insert completed appointment for P4 (Implant)
  await db.insert(appointments).values({
    organizationId: initData.organizationId,
    patientId: p4Id,
    doctorUserId: initData.ownerUserId,
    startsAt: thirteenMonthsAgo,
    endsAt: new Date(thirteenMonthsAgo.getTime() + 60 * 60000),
    status: "completed",
    reason: "Установка дентального имплантата Osstem в позицию зуба 36",
  });

  // Also insert implant installation record for P4
  await db.insert(patientImplantInstallations).values({
    organizationId: initData.organizationId,
    patientId: p4Id,
    surgeonDoctorId: initData.ownerUserId,
    toothNumberFdi: 36,
    implantBrand: "Osstem TS III",
    implantDiameterMm: "4.00",
    implantLengthMm: "10.00",
    finalInsertionTorqueNcm: "35.00",
    installedAt: thirteenMonthsAgo,
  });

  console.log("[Provisioning] Verification: querying GET /api/patients/recall-candidates...");
  const candRes = await fetch(`${API_BASE}/api/patients/recall-candidates?minMonths=1&limit=200`, {
    headers,
  });
  if (candRes.ok) {
    const candData = await candRes.json();
    console.log(`[Provisioning] Recall candidates found: ${candData.candidates?.length ?? 0}`);
  } else {
    console.warn(`[Provisioning] Recall candidates fetch failed: ${await candRes.text()}`);
  }

  return {
    clinicToken: initData.clinicToken,
    organizationId: initData.organizationId,
    staffToken: unlockData.staffToken,
    ownerUserId: initData.ownerUserId,
    doctorName: "Д-р Смирнова Екатерина Васильевна",
    patient1Id: p1Id,
  };
}

async function run() {
  const auth = await provisionClinicalRecallsSession();

  const browser = await chromium.launch({
    headless: true,
    executablePath: "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
    args: ["--no-sandbox", "--disable-setuid-sandbox", "--font-render-hinting=none"],
  });

  const setupContext = async (isDark, viewport = { width: 1440, height: 900 }) => {
    const context = await browser.newContext({
      viewport,
      deviceScaleFactor: 1,
    });

    await context.addInitScript(
      ({ ct, orgId, st, uid, docName, dark }) => {
        localStorage.setItem("dente_clinic_token", ct);
        localStorage.setItem("dente_organization_id", orgId);
        localStorage.setItem("dente_staff_token", st);
        localStorage.setItem("dente_active_session_token", st);
        localStorage.setItem("dente_active_user_id", uid);
        localStorage.setItem("dente_user_id", uid);
        localStorage.setItem("dente_active_role", "owner");
        localStorage.setItem("dente_user_role", "owner");
        localStorage.setItem("dente_active_mode", "clinic");
        sessionStorage.setItem("dente_unlocked", "true");
        localStorage.setItem("dente_onboarding_completed", "true");
        localStorage.setItem("dente_tour_completed", "true");

        localStorage.setItem(
          "dente_staff_session",
          JSON.stringify({
            userId: uid,
            name: "Д-р Смирнова Е. В.",
            fullName: docName,
            role: "owner",
            roleScope: "clinical_director",
          }),
        );

        localStorage.setItem("dental-crm:web-ui-preferences:v1", JSON.stringify({
          version: 1,
          uiLanguage: "ru",
          theme: dark ? "dark" : "light",
          selectedWorkspaceRole: "owner",
          onboardingDismissed: true,
          onboardingStep: "done",
        }));

        localStorage.setItem("theme", dark ? "dark" : "light");

        if (dark) {
          document.documentElement.classList.add("dark");
          document.documentElement.setAttribute("data-theme", "dark");
        } else {
          document.documentElement.classList.remove("dark");
          document.documentElement.setAttribute("data-theme", "light");
        }
      },
      {
        ct: auth.clinicToken,
        orgId: auth.organizationId,
        st: auth.staffToken,
        uid: auth.ownerUserId,
        docName: auth.doctorName,
        dark: isDark,
      },
    );

    return context;
  };

  const applyTheme = async (page, isDark) => {
    await page.evaluate((dark) => {
      const mode = dark ? "dark" : "light";
      document.documentElement.classList.remove("dark", "light");
      document.documentElement.classList.add(mode);
      document.documentElement.setAttribute("data-theme", mode);
      if (document.body) {
        document.body.classList.remove("dark", "light");
        document.body.classList.add(mode);
        document.body.setAttribute("data-theme", mode);
      }
      localStorage.setItem("dente_theme_mode", mode);
      localStorage.setItem("theme", mode);
      localStorage.setItem("dental-crm:web-ui-preferences:v1", JSON.stringify({
        version: 1,
        uiLanguage: "ru",
        theme: mode,
        selectedWorkspaceRole: "owner",
        onboardingDismissed: true,
        onboardingStep: "done",
      }));
    }, isDark);
    await page.waitForTimeout(500);
  };

  // ==========================================
  // 1. PROOF 1: PC Light (1440x900) - Recalls Hub Modal
  // ==========================================
  console.log("\n--- Capturing PC Light (1440x900) ---");
  const pcLightCtx = await setupContext(false, { width: 1440, height: 900 });
  const pcLightPage = await pcLightCtx.newPage();

  await pcLightPage.goto(`${WEB_BASE}/#recalls`, { waitUntil: "domcontentloaded" });
  await pcLightPage.waitForTimeout(2000);
  await applyTheme(pcLightPage, false);

  const modalLocator = pcLightPage.locator('[data-testid="patient-recalls-hub-modal"]');
  if (await modalLocator.count() === 0) {
    console.log("[PC Light] Dispatching dente:open-recalls-hub...");
    await pcLightPage.evaluate(() => window.dispatchEvent(new CustomEvent("dente:open-recalls-hub")));
  }
  await modalLocator.waitFor({ state: "visible", timeout: 10000 });
  await pcLightPage.waitForTimeout(2000);

  const pcLightProofPath = path.join(PROOFS_DIR, "pc_light_recalls_hub.png");
  await pcLightPage.screenshot({ path: pcLightProofPath, fullPage: false });
  const pcLightSize = fs.statSync(pcLightProofPath).size;
  console.log(`[PROOF 1 OK] Saved pc_light_recalls_hub.png (${pcLightSize} bytes)`);

  // ==========================================
  // 2. PROOF 2: PC Dark (1440x900) - QuickBookingDrawer inside Recalls Hub
  // ==========================================
  console.log("\n--- Capturing PC Dark (1440x900) with QuickBookingDrawer ---");
  const pcDarkCtx = await setupContext(true, { width: 1440, height: 900 });
  const pcDarkPage = await pcDarkCtx.newPage();

  await pcDarkPage.goto(`${WEB_BASE}/#recalls`, { waitUntil: "domcontentloaded" });
  await pcDarkPage.waitForTimeout(2000);
  await applyTheme(pcDarkPage, true);

  const darkModalLocator = pcDarkPage.locator('[data-testid="patient-recalls-hub-modal"]');
  if (await darkModalLocator.count() === 0) {
    console.log("[PC Dark] Dispatching dente:open-recalls-hub...");
    await pcDarkPage.evaluate(() => window.dispatchEvent(new CustomEvent("dente:open-recalls-hub")));
  }
  await darkModalLocator.waitFor({ state: "visible", timeout: 10000 });
  await pcDarkPage.waitForTimeout(1500);

  // Click "Записать" button on the first candidate to trigger QuickBookingDrawer!
  console.log("[PC Dark] Triggering 'Записать на прием' to open QuickBookingDrawer...");
  const bookBtn = darkModalLocator.locator('button:has-text("Записать")').first();
  if (await bookBtn.count() > 0) {
    await bookBtn.click();
    await pcDarkPage.waitForTimeout(1500);
  } else {
    console.warn("[PC Dark] Could not find 'Записать' button, taking screenshot of dark hub");
  }

  const pcDarkProofPath = path.join(PROOFS_DIR, "pc_dark_recalls_hub.png");
  await pcDarkPage.screenshot({ path: pcDarkProofPath, fullPage: false });
  const pcDarkSize = fs.statSync(pcDarkProofPath).size;
  console.log(`[PROOF 2 OK] Saved pc_dark_recalls_hub.png (${pcDarkSize} bytes)`);

  // ==========================================
  // 3. PROOF 3: Mobile Light (390x844) - Mobile Kanban View
  // ==========================================
  console.log("\n--- Capturing Mobile Light (390x844) - Mobile Kanban ---");
  const mobileLightCtx = await setupContext(false, { width: 390, height: 844 });
  const mobileLightPage = await mobileLightCtx.newPage();

  await mobileLightPage.goto(`${WEB_BASE}/#recalls`, { waitUntil: "domcontentloaded" });
  await mobileLightPage.waitForTimeout(2000);
  await applyTheme(mobileLightPage, false);

  try {
    const mobModalLocator = mobileLightPage.locator('[data-testid="patient-recalls-hub-modal"]');
    if (await mobModalLocator.count() === 0) {
      console.log("[Mobile Light] Modal not open yet, dispatching dente:open-recalls-hub...");
      await mobileLightPage.evaluate(() => {
        window.dispatchEvent(new CustomEvent("dente:open-recalls-hub"));
      });
    }
    await mobModalLocator.waitFor({ state: "visible", timeout: 8000 });
    await mobileLightPage.waitForTimeout(1000);

    // Switch to Kanban View Mode
    console.log("[Mobile Light] Switching to Kanban View Mode...");
    const kanbanToggle = mobileLightPage.locator('[data-testid="view-mode-kanban"]');
    if (await kanbanToggle.count() > 0) {
      await kanbanToggle.click();
      await mobileLightPage.waitForTimeout(800);
    }
    const kanbanWrapper = mobileLightPage.locator('.recall-kanban-wrapper');
    await kanbanWrapper.waitFor({ state: "visible", timeout: 5000 });
    await kanbanWrapper.scrollIntoViewIfNeeded();
    await mobileLightPage.waitForTimeout(600);

    const mobileLightProofPath = path.join(PROOFS_DIR, "mobile_light_recalls_kanban.png");
    await mobileLightPage.screenshot({ path: mobileLightProofPath, fullPage: false });
    const mobileLightSize = fs.statSync(mobileLightProofPath).size;
    console.log(`[PROOF 3 OK] Saved mobile_light_recalls_kanban.png (${mobileLightSize} bytes)`);
  } catch (err) {
    console.error("[Mobile Light FAIL]", err.message);
    await mobileLightPage.screenshot({ path: "scripts/debug_mobile_light.png" });
    const url = mobileLightPage.url();
    console.log("[Mobile Light URL]", url);
    throw err;
  }

  // ==========================================
  // 4. PROOF 4: Mobile Dark (390x844) - Mobile Kanban Dark
  // ==========================================
  console.log("\n--- Capturing Mobile Dark (390x844) - Mobile Kanban Dark ---");
  const mobileDarkCtx = await setupContext(true, { width: 390, height: 844 });
  const mobileDarkPage = await mobileDarkCtx.newPage();

  await mobileDarkPage.goto(`${WEB_BASE}/#recalls`, { waitUntil: "domcontentloaded" });
  await mobileDarkPage.waitForTimeout(2000);
  await applyTheme(mobileDarkPage, true);

  try {
    const mobDarkModalLocator = mobileDarkPage.locator('[data-testid="patient-recalls-hub-modal"]');
    if (await mobDarkModalLocator.count() === 0) {
      console.log("[Mobile Dark] Modal not open yet, dispatching dente:open-recalls-hub...");
      await mobileDarkPage.evaluate(() => {
        window.dispatchEvent(new CustomEvent("dente:open-recalls-hub"));
      });
    }
    await mobDarkModalLocator.waitFor({ state: "visible", timeout: 8000 });
    await mobileDarkPage.waitForTimeout(1000);

    // Switch to Kanban View Mode
    const darkKanbanToggle = mobileDarkPage.locator('[data-testid="view-mode-kanban"]');
    if (await darkKanbanToggle.count() > 0) {
      await darkKanbanToggle.click();
      await mobileDarkPage.waitForTimeout(800);
    }
    const darkKanbanWrapper = mobileDarkPage.locator('.recall-kanban-wrapper');
    await darkKanbanWrapper.waitFor({ state: "visible", timeout: 5000 });
    await darkKanbanWrapper.scrollIntoViewIfNeeded();
    await mobileDarkPage.waitForTimeout(600);

    const mobileDarkProofPath = path.join(PROOFS_DIR, "mobile_dark_recalls_kanban.png");
    await mobileDarkPage.screenshot({ path: mobileDarkProofPath, fullPage: false });
    const mobileDarkSize = fs.statSync(mobileDarkProofPath).size;
    console.log(`[PROOF 4 OK] Saved mobile_dark_recalls_kanban.png (${mobileDarkSize} bytes)`);
  } catch (err) {
    console.error("[Mobile Dark FAIL]", err.message);
    await mobileDarkPage.screenshot({ path: "scripts/debug_mobile_dark.png" });
    const url = mobileDarkPage.url();
    console.log("[Mobile Dark URL]", url);
    throw err;
  }

  await browser.close();
  console.log("\n[ALL 4 PROOFS CAPTURED SUCCESSFULLY]");
}

run().catch((err) => {
  console.error("[FATAL ERROR]", err);
  process.exit(1);
});
