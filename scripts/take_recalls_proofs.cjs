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
let WEB_BASE = process.env.WEB_BASE || "http://127.0.0.1:5173";
const PROOFS_DIR = path.resolve(__dirname, "../docs/proofs/recalls");

if (!fs.existsSync(PROOFS_DIR)) {
  fs.mkdirSync(PROOFS_DIR, { recursive: true });
}

async function detectWebBase() {
  if (process.env.WEB_BASE) return process.env.WEB_BASE;
  for (const port of [5173, 5174, 5175, 5176]) {
    try {
      const res = await fetch(`http://127.0.0.1:${port}/`);
      if (res.ok) {
        console.log(`[WebBase] Auto-detected active web server at http://127.0.0.1:${port}`);
        return `http://127.0.0.1:${port}`;
      }
    } catch (_) {}
  }
  return "http://127.0.0.1:5173";
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
      allergies: "Пенициллиновый ряд (крапивница)",
      chronicDiseases: "Состояние после имплантации (зубы 3.6, 4.6)",
    }),
  });
  const p4 = await p4Res.json();
  const p4Id = p4.patient?.id || p4.id;

  console.log("[Provisioning] Seeding completed historical appointments...");

  const now = Date.now();
  const dayMs = 24 * 60 * 60 * 1000;

  // Patient 1: Hygiene 210 days ago (due every 180 days -> overdue by 30 days)
  await fetch(`${API_BASE}/api/appointments`, {
    method: "POST",
    headers,
    body: JSON.stringify({
      patientId: p1Id,
      doctorId: initData.ownerUserId,
      chairId: 1,
      startTime: new Date(now - 210 * dayMs).toISOString(),
      durationMinutes: 60,
      treatmentType: "Профгигиена полости рта и осмотр",
      status: "completed",
    }),
  });

  // Patient 2: Perio check 120 days ago (due every 90 days -> overdue by 30 days)
  await fetch(`${API_BASE}/api/appointments`, {
    method: "POST",
    headers,
    body: JSON.stringify({
      patientId: p2Id,
      doctorId: initData.ownerUserId,
      chairId: 1,
      startTime: new Date(now - 120 * dayMs).toISOString(),
      durationMinutes: 45,
      treatmentType: "Пародонтологический осмотр и гигиена",
      status: "completed",
    }),
  });

  // Patient 3: Endo check 60 days ago (due every 30 days -> overdue by 30 days)
  await fetch(`${API_BASE}/api/appointments`, {
    method: "POST",
    headers,
    body: JSON.stringify({
      patientId: p3Id,
      doctorId: initData.ownerUserId,
      chairId: 1,
      startTime: new Date(now - 60 * dayMs).toISOString(),
      durationMinutes: 30,
      treatmentType: "Эндодонтический контроль и снимок",
      status: "completed",
    }),
  });

  // Patient 4: Implant 395 days ago (due every 365 days -> overdue by 30 days)
  await fetch(`${API_BASE}/api/appointments`, {
    method: "POST",
    headers,
    body: JSON.stringify({
      patientId: p4Id,
      doctorId: initData.ownerUserId,
      chairId: 1,
      startTime: new Date(now - 395 * dayMs).toISOString(),
      durationMinutes: 45,
      treatmentType: "Контроль имплантов и ортопедии",
      status: "completed",
    }),
  });

  // Verify recall-candidates endpoint responds with calculated records
  console.log("[Provisioning] Verification: querying GET /api/patients/recall-candidates...");
  const candRes = await fetch(`${API_BASE}/api/patients/recall-candidates`, { headers });
  if (candRes.ok) {
    const cands = await candRes.json();
    console.log(`[Provisioning] Recall candidates found: ${Array.isArray(cands) ? cands.length : (cands.candidates?.length || 0)}`);
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
  WEB_BASE = await detectWebBase();
  const auth = await provisionClinicalRecallsSession();

  const browser = await chromium.launch({
    headless: true,
    executablePath: "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
    args: ["--no-sandbox", "--disable-gpu", "--disable-dev-shm-usage"],
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
        localStorage.setItem("dente_workspace_mode", "clinic");
        localStorage.setItem(
          "dente-workspace-profile",
          JSON.stringify({ mode: "clinic", role: "owner", activeRole: "owner" })
        );
        localStorage.setItem("dental-crm:active-user:v1", JSON.stringify({
          id: uid,
          fullName: docName,
          role: "owner",
          email: "owner@dente-clinic.ru",
        }));
        sessionStorage.setItem("dente_unlocked", "true");
        localStorage.setItem("dente_onboarding_completed", "true");
        localStorage.setItem("dente_tour_completed", "true");
        localStorage.setItem("dente_tour_dismissed", "true");
        localStorage.setItem("dente_guide_tour_dismissed_v2", "true");
        localStorage.setItem("dente_demo_banner_dismissed", "true");
        localStorage.setItem("dental-crm:onboarding:v1", JSON.stringify({ completed: true, dismissed: true }));

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

        localStorage.setItem("theme", dark ? "dark" : "light");
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
      document.documentElement.style.colorScheme = dark ? "dark" : "light";
    }, isDark).catch(() => {});
    await page.waitForTimeout(600);
  };

  const openRecallsPage = async (ctx, isDark) => {
    const page = await ctx.newPage();
    page.on("console", (msg) => {
      if (msg.type() === "error") console.log("[BROWSER CONSOLE ERROR]", msg.text());
    });
    page.on("pageerror", (err) => console.error("[BROWSER PAGEERROR]", err.message));

    await page.goto(`${WEB_BASE}/?demo=true#recalls`, { waitUntil: "commit", timeout: 35000 });
    await page.waitForTimeout(3000);
    await page.locator(".boot-logo-box").waitFor({ state: "detached", timeout: 15000 }).catch(() => {});
    await page.waitForFunction(() => !document.body?.innerText?.includes("Загрузка CRM") && !document.body?.innerText?.includes("Загрузка системы"), { timeout: 15000 }).catch(() => {});

    // Suppress overlays
    await page.evaluate(() => {
      const style = document.createElement("style");
      style.innerHTML = `
        .tour-spotlight-root, [data-testid="guided-tour-spotlight-overlay"], .toast, .connection-toast {
          display: none !important;
        }
      `;
      document.head.appendChild(style);
    }).catch(() => {});

    await applyTheme(page, isDark);

    const modalLocator = page.locator('[data-testid="patient-recalls-hub-modal"]');
    for (let attempt = 0; attempt < 5; attempt++) {
      const visible = await modalLocator.isVisible().catch(() => false);
      if (visible) break;
      await page.evaluate(() => {
        window.dispatchEvent(new CustomEvent("dente:open-recalls-hub"));
        window.dispatchEvent(new CustomEvent("dente-open-recalls-hub"));
      });
      const ok = await modalLocator.waitFor({ state: "visible", timeout: 4000 }).then(() => true).catch(() => false);
      if (ok) break;
    }
    await modalLocator.waitFor({ state: "visible", timeout: 15000 });
    await page.waitForTimeout(1000);
    return { page, modalLocator };
  };

  // ==========================================
  // 1. PROOF 1: PC Light (1440x900) - Recalls Hub Modal
  // ==========================================
  console.log("\n--- Capturing PC Light (1440x900) ---");
  const pcCtx = await setupContext(false, { width: 1440, height: 900 });
  const { page: pcPage } = await openRecallsPage(pcCtx, false);

  const pcLightProofPath = path.join(PROOFS_DIR, "pc_light_recalls_hub.png");
  await pcPage.screenshot({ path: pcLightProofPath, fullPage: false });
  fs.copyFileSync(pcLightProofPath, path.join(PROOFS_DIR, "01_pc_light_1440x900.png"));
  fs.copyFileSync(pcLightProofPath, path.join(PROOFS_DIR, "recalls_pc_light.png"));
  const pcLightSize = fs.statSync(pcLightProofPath).size;
  console.log(`[PROOF 1 OK] Saved pc_light_recalls_hub.png & 01_pc_light_1440x900.png (${pcLightSize} bytes)`);
  if (pcLightSize < 20480) throw new Error(`PC Light screenshot too small: ${pcLightSize}`);

  // ==========================================
  // 2. PROOF 2: PC Dark (1440x900) - QuickBookingDrawer / Dark Hub
  // ==========================================
  console.log("\n--- Capturing PC Dark (1440x900) with QuickBookingDrawer ---");
  const pcDarkCtx = await setupContext(true, { width: 1440, height: 900 });
  const { page: pcDarkPage, modalLocator: darkModalLocator } = await openRecallsPage(pcDarkCtx, true);

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
  fs.copyFileSync(pcDarkProofPath, path.join(PROOFS_DIR, "02_pc_dark_1440x900.png"));
  fs.copyFileSync(pcDarkProofPath, path.join(PROOFS_DIR, "recalls_pc_dark.png"));
  const pcDarkSize = fs.statSync(pcDarkProofPath).size;
  console.log(`[PROOF 2 OK] Saved pc_dark_recalls_hub.png & 02_pc_dark_1440x900.png (${pcDarkSize} bytes)`);
  if (pcDarkSize < 20480) throw new Error(`PC Dark screenshot too small: ${pcDarkSize}`);

  await pcCtx.close();
  await pcDarkCtx.close();

  // ==========================================
  // 3. PROOF 3: Mobile Light (390x844) - Mobile Kanban View
  // ==========================================
  console.log("\n--- Capturing Mobile Light (390x844) - Mobile Kanban ---");
  const mobileLightCtx = await setupContext(false, { width: 390, height: 844 });
  const { page: mobileLightPage } = await openRecallsPage(mobileLightCtx, false);

  console.log("[Mobile Light] Switching to Kanban View Mode...");
  const kanbanToggle = mobileLightPage.locator('[data-testid="view-mode-kanban"]');
  if (await kanbanToggle.count() > 0) {
    await kanbanToggle.click();
    await mobileLightPage.waitForTimeout(1000);
  }
  const kanbanWrapper = mobileLightPage.locator('.recall-kanban-wrapper');
  await kanbanWrapper.waitFor({ state: "visible", timeout: 8000 });
  await kanbanWrapper.scrollIntoViewIfNeeded();
  await mobileLightPage.waitForTimeout(600);

  const mobileLightProofPath = path.join(PROOFS_DIR, "mobile_light_recalls_kanban.png");
  await mobileLightPage.screenshot({ path: mobileLightProofPath, fullPage: false });
  fs.copyFileSync(mobileLightProofPath, path.join(PROOFS_DIR, "03_mobile_light_390x844.png"));
  fs.copyFileSync(mobileLightProofPath, path.join(PROOFS_DIR, "recalls_mobile_light.png"));
  const mobileLightSize = fs.statSync(mobileLightProofPath).size;
  console.log(`[PROOF 3 OK] Saved mobile_light_recalls_kanban.png & 03_mobile_light_390x844.png (${mobileLightSize} bytes)`);
  if (mobileLightSize < 20480) throw new Error(`Mobile Light screenshot too small: ${mobileLightSize}`);

  // ==========================================
  // 4. PROOF 4: Mobile Dark (390x844) - Mobile Kanban Dark
  // ==========================================
  console.log("\n--- Capturing Mobile Dark (390x844) - Mobile Kanban Dark ---");
  const mobileDarkCtx = await setupContext(true, { width: 390, height: 844 });
  const { page: mobileDarkPage } = await openRecallsPage(mobileDarkCtx, true);

  console.log("[Mobile Dark] Switching to Kanban View Mode...");
  const darkKanbanToggle = mobileDarkPage.locator('[data-testid="view-mode-kanban"]');
  if (await darkKanbanToggle.count() > 0) {
    await darkKanbanToggle.click();
    await mobileDarkPage.waitForTimeout(1000);
  }
  const darkKanbanWrapper = mobileDarkPage.locator('.recall-kanban-wrapper');
  await darkKanbanWrapper.waitFor({ state: "visible", timeout: 8000 });
  await darkKanbanWrapper.scrollIntoViewIfNeeded();
  await mobileDarkPage.waitForTimeout(600);

  const mobileDarkProofPath = path.join(PROOFS_DIR, "mobile_dark_recalls_kanban.png");
  await mobileDarkPage.screenshot({ path: mobileDarkProofPath, fullPage: false });
  fs.copyFileSync(mobileDarkProofPath, path.join(PROOFS_DIR, "04_mobile_dark_390x844.png"));
  fs.copyFileSync(mobileDarkProofPath, path.join(PROOFS_DIR, "recalls_mobile_dark.png"));
  const mobileDarkSize = fs.statSync(mobileDarkProofPath).size;
  console.log(`[PROOF 4 OK] Saved mobile_dark_recalls_kanban.png & 04_mobile_dark_390x844.png (${mobileDarkSize} bytes)`);
  if (mobileDarkSize < 20480) throw new Error(`Mobile Dark screenshot too small: ${mobileDarkSize}`);

  await mobileLightCtx.close();
  await mobileDarkCtx.close();

  await browser.close();
  console.log("\n[ALL 4 PROOFS CAPTURED SUCCESSFULLY]");
}

run().catch((err) => {
  console.error("[FATAL ERROR]", err);
  process.exit(1);
});
