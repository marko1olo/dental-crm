/**
 * scripts/capture_real_appointment_modal.cjs
 * RED TEAM VISUAL PROOF: Live end-to-end screenshot capture of AppointmentModal in the real app.
 * Full stack: Fastify (4100), PostgreSQL (5432), Vite Frontend (5173).
 */

const { chromium } = require("playwright");
const path = require("node:path");
const fs = require("node:fs");

const BRAIN_DIR = "C:/Users/Admin/.gemini/antigravity/brain/df880520-dc90-48e7-ab9e-032bd60d9f31";
const LOCAL_DIR = path.resolve(__dirname, "../apps/web/public/screenshots/schedule_flow");
const API_BASE = "http://127.0.0.1:4100";
const WEB_BASE = "http://127.0.0.1:5173";

async function provisionLiveSession() {
  const uniqueId = Date.now();
  console.log(">>> [Provisioning] Setting up authenticated session on live API (Fastify 4100)...");

  const initRes = await fetch(`${API_BASE}/api/auth/setup/init`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      clinicName: "Стоматология ДЕНТЕ Премиум",
      email: `chief-inq-${uniqueId}@dente-clinic.ru`,
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

  // 0. Ensure default clinic and chair exist in PostgreSQL for this new organization
  let seededChairId = null;
  try {
    const { Pool } = require("pg");
    const pool = new Pool({
      connectionString: process.env.DATABASE_URL || "postgres://dental@127.0.0.1:5432/dental_crm",
    });
    const client = await pool.connect();
    try {
      let clinicRes = await client.query(
        "SELECT id FROM clinics WHERE organization_id = $1 LIMIT 1",
        [initData.organizationId]
      );
      let clinicId;
      if (clinicRes.rows.length === 0) {
        const insertClinic = await client.query(
          "INSERT INTO clinics (organization_id, name, timezone) VALUES ($1, $2, $3) RETURNING id",
          [initData.organizationId, "Главное отделение", "Europe/Samara"]
        );
        clinicId = insertClinic.rows[0].id;
      } else {
        clinicId = clinicRes.rows[0].id;
      }

      let chairRes = await client.query(
        "SELECT id FROM chairs WHERE organization_id = $1 LIMIT 1",
        [initData.organizationId]
      );
      if (chairRes.rows.length === 0) {
        const insertChair = await client.query(
          "INSERT INTO chairs (organization_id, clinic_id, name, is_active) VALUES ($1, $2, $3, true) RETURNING id",
          [initData.organizationId, clinicId, "Кресло 1 (Основное)"]
        );
        seededChairId = insertChair.rows[0].id;
      } else {
        seededChairId = chairRes.rows[0].id;
      }
      console.log(`>>> [Provisioning] Ensured clinic (${clinicId}) and chair (${seededChairId}) in DB`);
    } finally {
      client.release();
      await pool.end();
    }
  } catch (errDb) {
    console.log(">>> [Provisioning] DB chair seed note:", errDb.message);
  }

  // 1. Seed patient
  console.log(">>> [Provisioning] Seeding primary patient...");
  const pRes = await fetch(`${API_BASE}/api/patients`, {
    method: "POST",
    headers,
    body: JSON.stringify({
      fullName: "Алексеева Виктория Игоревна",
      phone: "+7 (916) 555-01-99",
      birthDate: "1992-04-12",
      gender: "female",
      notes: "Острая боль 46 зуба, CITO-прием. Аллергия на лидокаин.",
    }),
  });
  if (!pRes.ok) throw new Error(`Patient seed failed: ${await pRes.text()}`);
  const patient = await pRes.json();
  const patientId = patient.id;

  // 2. Seed appointment today
  const todayStr = new Date().toISOString().slice(0, 10);
  console.log(`>>> [Provisioning] Seeding appointment on ${todayStr}...`);
  const apptRes = await fetch(`${API_BASE}/api/appointments`, {
    method: "POST",
    headers,
    body: JSON.stringify({
      patientId,
      doctorUserId: initData.ownerUserId,
      chairId: seededChairId || "default-chair",
      startsAt: `${todayStr}T10:00:00.000Z`,
      endsAt: `${todayStr}T10:30:00.000Z`,
      status: "planned",
      reason: "CITO! Острая пульпитная боль 46 зуба",
      notes: "Экстренный прием по острой боли",
      isCito: true,
    }),
  });
  let appointmentId = null;
  if (apptRes.ok) {
    const appt = await apptRes.json();
    appointmentId = appt.id || (appt.appointment && appt.appointment.id);
    console.log(`>>> [Provisioning] Seeded appointment: ${appointmentId}`);
  } else {
    console.log(`>>> [Provisioning] Note on appt seed: ${await apptRes.text()}`);
  }

  return {
    clinicToken: initData.clinicToken,
    staffToken: unlockData.staffToken,
    ownerUserId: initData.ownerUserId,
    patientId,
    appointmentId,
    todayStr,
  };
}

async function main() {
  fs.mkdirSync(LOCAL_DIR, { recursive: true });
  fs.mkdirSync(BRAIN_DIR, { recursive: true });

  const auth = await provisionLiveSession();

  console.log(">>> Launching Playwright Chromium (1440x900)...");
  const browser = await chromium.launch({
    channel: "chrome",
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });

  try {
    const context = await browser.newContext({
      viewport: { width: 1440, height: 900 },
      isMobile: false,
      hasTouch: false,
    });

    await context.addInitScript(({ clinicToken, staffToken, ownerUserId, patientId }) => {
      localStorage.setItem("dente_clinic_token", clinicToken);
      localStorage.setItem("dente_staff_token", staffToken);
      localStorage.setItem("dente_active_role", "owner");
      localStorage.setItem("dente_user_id", ownerUserId);
      if (patientId) {
        localStorage.setItem("dente_active_patient_id", patientId);
      }
      localStorage.setItem("dente_onboarding_completed", "true");
      localStorage.setItem("dente_tour_completed", "true");
      localStorage.setItem("dental-crm:onboarding:v1", JSON.stringify({ dismissed: true, step: "done", completed: true }));
      localStorage.setItem("dente_theme_mode", "light");
    }, auth);

    const page = await context.newPage();
    page.on("pageerror", (err) => console.error("[PageError]:", err.message));
    page.on("console", (msg) => {
      if (msg.type() === "error") console.error("[ConsoleError]:", msg.text());
    });

    console.log(">>> Navigating to real app #schedule...");
    await page.goto(`${WEB_BASE}/#schedule`, { waitUntil: "domcontentloaded", timeout: 60000 });
    await page.waitForSelector(".boot-state", { state: "detached", timeout: 60000 }).catch(() => {});
    await page.waitForSelector(".app-shell", { state: "visible", timeout: 30000 });
    await page.waitForSelector(".schedule-filter-strip", { state: "visible", timeout: 30000 });
    console.log(">>> Schedule view rendered!");
    await page.waitForTimeout(2000);

    console.log(">>> Looking for appointment card in real schedule grid...");
    const cardSelector = '.appointment-card, [data-testid="appointment-card"], .schedule-appointment-card, .schedule-card, .schedule-cell-event';
    let card = await page.$(cardSelector);

    if (!card) {
      console.log(">>> Card not immediately found on current day, checking empty slot or creating...");
      const slot = await page.$('.schedule-slot, .schedule-time-cell, [data-testid^="schedule-cell-"], .schedule-grid-cell');
      if (slot) {
        console.log(">>> Clicking schedule slot to open appointment modal...");
        await slot.click();
      } else {
        console.log(">>> Triggering modal via primary action button or click...");
        const newApptBtn = await page.$('button[data-testid="schedule-new-appointment-btn"], button[data-testid="btn-new-appointment"], .schedule-toolbar-primary-quick-booking-btn');
        if (newApptBtn) {
          await newApptBtn.click();
        }
      }
    } else {
      console.log(">>> Clicking appointment card to open AppointmentModal...");
      await card.click();
    }

    console.log(">>> Waiting for real [data-testid=\"appointment-modal-container\"]...");
    const modalContainer = await page.waitForSelector('[data-testid="appointment-modal-container"]', {
      state: "visible",
      timeout: 15000,
    });
    console.log(">>> AppointmentModal successfully mounted and visible in real app!");
    await page.waitForTimeout(1000);

    // ─── 1. CAPTURE LIGHT SCREENSHOT ───
    await page.evaluate(() => {
      document.documentElement.setAttribute("data-theme", "light");
      document.documentElement.classList.remove("dark");
      document.documentElement.classList.add("light");
    });
    await page.waitForTimeout(600);

    const lightPath = path.join(LOCAL_DIR, "schedule_appointment_modal_light.png");
    const lightBrain = path.join(BRAIN_DIR, "schedule_appointment_modal_light.png");
    await page.screenshot({ path: lightPath, fullPage: false });
    fs.copyFileSync(lightPath, lightBrain);
    console.log(`>>> Captured REAL Light screenshot: ${lightPath} (${fs.statSync(lightPath).size} bytes)`);

    // ─── 2. CAPTURE DARK SCREENSHOT ───
    console.log(">>> Switching to Dark mode...");
    await page.evaluate(() => {
      document.documentElement.setAttribute("data-theme", "dark");
      document.documentElement.classList.remove("light");
      document.documentElement.classList.add("dark");
    });
    await page.waitForTimeout(600);

    const darkPath = path.join(LOCAL_DIR, "schedule_appointment_modal_dark.png");
    const darkBrain = path.join(BRAIN_DIR, "schedule_appointment_modal_dark.png");
    await page.screenshot({ path: darkPath, fullPage: false });
    fs.copyFileSync(darkPath, darkBrain);
    console.log(`>>> Captured REAL Dark screenshot: ${darkPath} (${fs.statSync(darkPath).size} bytes)`);

    console.log(">>> ALL REAL PROOFS CAPTURED SUCCESSFULLY!");
  } finally {
    await browser.close();
  }
}

main().catch((err) => {
  console.error(">>> CAPTURE ERROR:", err);
  process.exit(1);
});
