/**
 * scripts/capture_schedule_wave7_inquisition.cjs
 * RED TEAM VISUAL PROOF SUITE WAVE 7: Schedule Grid & Frictionless Booking Inquisition.
 * Real PostgreSQL 18 (5432) + Real Fastify API (4100) + Real Vite App (5173).
 * Captures real screenshots at 1440x900 (PC Light & Dark).
 */

const { chromium } = require("playwright");
const path = require("node:path");
const fs = require("node:fs");
const crypto = require("node:crypto");
const {
  API_BASE,
  obtainRealAuthTokens,
  injectRealAuthToContext,
  seedLiveScheduleData,
} = require("./e2e-auth-helper.cjs");

const DOCS_DIR = path.resolve(__dirname, "../docs/screenshots/schedule_inquisition_wave7");

if (!fs.existsSync(DOCS_DIR)) {
  fs.mkdirSync(DOCS_DIR, { recursive: true });
}

async function setTheme(page, theme) {
  await page.evaluate((th) => {
    if (window.__useThemeStore) {
      window.__useThemeStore.getState().setThemeMode(th);
    }
    document.documentElement.setAttribute("data-theme", th);
    const isDark = ["dark", "night", "ocean", "emerald", "cyber_xray"].includes(th);
    document.documentElement.classList.toggle("dark", isDark);
    document.documentElement.classList.toggle("light", !isDark);
    document.documentElement.style.colorScheme = isDark ? "dark" : "light";
  }, theme);
  const isDark = ["dark", "night", "ocean", "emerald", "cyber_xray"].includes(theme);
  await page.waitForFunction(
    (dark) => document.documentElement.classList.contains("dark") === dark,
    isDark,
    { timeout: 5000 }
  ).catch(() => {});
  await page.waitForTimeout(400);
}

async function saveProof(page, fileName, description) {
  const docsPath = path.join(DOCS_DIR, fileName);

  await page.screenshot({ path: docsPath, fullPage: false, animations: "disabled" });

  const stat = fs.statSync(docsPath);
  const hash = crypto.createHash("md5").update(fs.readFileSync(docsPath)).digest("hex");
  console.log(`[Captured] ${fileName} (${description}): ${stat.size} bytes (${(stat.size / 1024).toFixed(1)} KB), MD5: ${hash}`);

  if (stat.size < 40000) {
    throw new Error(`Screenshot ${fileName} is too small (${stat.size} bytes)!`);
  }
  return { fileName, docsPath, size: stat.size, hash };
}

async function seedRichSchedule(authData, schedData) {
  const localToday = new Date().toLocaleDateString("en-CA");
  const isoToday = new Date().toISOString().slice(0, 10);
  const dates = Array.from(new Set([localToday, isoToday]));

  const headers = {
    "Content-Type": "application/json",
    "x-dente-clinic-token": authData.clinicToken,
    "x-dente-staff-token": authData.staffToken,
  };

  const patientId = schedData.activePatientId || (schedData.patients && schedData.patients[0]?.id);
  const doctorUserId = authData.user.id;
  const chair1Id = schedData.chair1Id || (schedData.chairs && schedData.chairs[0]?.id);
  const chair2Id = schedData.chair2Id || (schedData.chairs && schedData.chairs[1]?.id) || chair1Id;

  console.log(`[SEED-RICH] Seeding appointments for dates [${dates.join(", ")}]...`);

  for (const dt of dates) {
    const appts = [
      {
        patientId,
        doctorUserId,
        chairId: chair1Id,
        startsAt: `${dt}T09:30:00.000Z`,
        endsAt: `${dt}T11:00:00.000Z`,
        status: "confirmed",
        reason: "Лечение кариеса 16 зуба (Терапия)",
        comment: "Первичный прием",
      },
      {
        patientId,
        doctorUserId,
        chairId: chair1Id,
        startsAt: `${dt}T11:00:00.000Z`,
        endsAt: `${dt}T11:20:00.000Z`,
        status: "planned",
        reason: "Консультация и снятие швов",
        comment: "Короткий осмотр 20 мин",
      },
      {
        patientId,
        doctorUserId,
        chairId: chair1Id,
        startsAt: `${dt}T12:00:00.000Z`,
        endsAt: `${dt}T14:00:00.000Z`,
        status: "in_treatment",
        reason: "Эндодонтия 46 зуба (3 канала, 2 часа)",
        comment: "Длительный приём без наплывов",
      },
      {
        patientId,
        doctorUserId,
        chairId: chair2Id,
        startsAt: `${dt}T10:00:00.000Z`,
        endsAt: `${dt}T11:30:00.000Z`,
        status: "completed",
        reason: "Установка имплантата Nobel Biocare",
        comment: "Хирургический протокол",
      },
    ];

    for (const a of appts) {
      try {
        const res = await fetch(`${API_BASE}/api/appointments`, {
          method: "POST",
          headers,
          body: JSON.stringify(a),
        });
        if (res.ok) {
          console.log(`[SEED-RICH] Appt OK: ${a.startsAt} chair=${a.chairId}`);
        } else {
          console.log(`[SEED-RICH] Note: ${res.status} ${await res.text()}`);
        }
      } catch (e) {
        console.warn(`[SEED-RICH] Warning: ${e.message}`);
      }
    }
  }
}

async function run() {
  console.log("=== WAVE 7 RED TEAM SCHEDULE & BOOKING INQUISITION ===");
  console.log("1. Authenticating with real Fastify backend on port 4100...");
  const authData = await obtainRealAuthTokens();
  console.log(`   -> Auth OK: Org=${authData.organizationId}, User=${authData.user.fullName}`);

  console.log("2. Seeding real chairs, patients, and schedule in PostgreSQL...");
  const schedData = await seedLiveScheduleData(authData);

  console.log("2.1 Seeding rich appointments set across chairs...");
  await seedRichSchedule(authData, schedData);

  console.log("3. Launching Chromium at 1440x900...");
  const browser = await chromium.launch({
    executablePath: "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });

  try {
    const context = await browser.newContext({
      viewport: { width: 1440, height: 900 },
      deviceScaleFactor: 2,
    });

    await injectRealAuthToContext(context, authData, {
      selectedPatientId: schedData.activePatientId,
    });

    const page = await context.newPage();
    page.on("pageerror", (err) => console.error("[PageError]:", err.message));

    console.log("4. Navigating to http://127.0.0.1:5173/#schedule...");
    await page.goto("http://127.0.0.1:5173/#schedule", { waitUntil: "domcontentloaded", timeout: 60000 });

    // Anti-Blank / Anti-Splash Guard:
    console.log("5. Anti-Splash Guard: waiting for system loader detachment...");
    await page.waitForSelector(".boot-state", { state: "detached", timeout: 30000 }).catch(() => {});
    await page.waitForSelector(".schedule-filter-strip", { state: "visible", timeout: 30000 });
    await page.waitForTimeout(2000);

    // Dismiss notifications
    const noticeBtn = page.locator('.app-notice button:has-text("Понятно"), [data-testid="btn-dismiss-notice"], button:has-text("Скрыть")');
    if (await noticeBtn.isVisible().catch(() => false)) {
      await noticeBtn.click().catch(() => {});
      await page.waitForTimeout(300);
    }

    async function resetAllScrolls(page) {
      await page.evaluate(() => {
        window.scrollTo(0, 0);
        document.documentElement.scrollTop = 0;
        document.body.scrollTop = 0;
        document.querySelectorAll('*').forEach((el) => {
          if (el.scrollTop > 0) el.scrollTop = 0;
        });
      });
    }

    // ─── 1. SCHEDULE GRID PC LIGHT ───
    console.log("Capturing 01_schedule_day_grid_pc_light.png...");
    await setTheme(page, "light");
    await resetAllScrolls(page);
    await page.waitForTimeout(800);
    await saveProof(page, "01_schedule_day_grid_pc_light.png", "Schedule Day Grid PC Light 1440x900");

    // ─── 2. SCHEDULE GRID PC DARK ───
    console.log("Capturing 02_schedule_day_grid_pc_dark.png...");
    await setTheme(page, "dark");
    await resetAllScrolls(page);
    await page.waitForTimeout(800);
    await saveProof(page, "02_schedule_day_grid_pc_dark.png", "Schedule Day Grid PC Dark 1440x900");

    // ─── 3. QUICK BOOKING MODAL PC DARK ───
    console.log("Opening QuickBookingDrawer in PC Dark...");
    const quickBookingBtn = page.locator('[data-testid="schedule-toolbar-primary-quick-booking-btn"]');
    if (await quickBookingBtn.isVisible()) {
      await quickBookingBtn.click();
    } else {
      // Fallback: click any slot
      const emptySlot = page.locator('.schedule-grid-slot, [data-testid^="slot-"]').first();
      await emptySlot.click({ force: true });
    }
    const quickDrawer = page.locator('[data-testid="quick-booking-drawer"]');
    await quickDrawer.waitFor({ state: "visible", timeout: 15000 });
    await page.waitForTimeout(800);

    console.log("Capturing 04_quick_booking_modal_pc_dark.png...");
    await saveProof(page, "04_quick_booking_modal_pc_dark.png", "Quick Booking Drawer PC Dark 1440x900");

    // ─── 4. QUICK BOOKING MODAL PC LIGHT ───
    console.log("Switching QuickBookingDrawer to PC Light...");
    await setTheme(page, "light");
    await page.waitForTimeout(800);
    console.log("Capturing 03_quick_booking_modal_pc_light.png...");
    await saveProof(page, "03_quick_booking_modal_pc_light.png", "Quick Booking Drawer PC Light 1440x900");

    // Close QuickBookingDrawer
    console.log("Closing QuickBookingDrawer...");
    await page.keyboard.press("Escape");
    await quickDrawer.waitFor({ state: "hidden", timeout: 10000 }).catch(() => {});
    await page.waitForTimeout(600);

    // ─── 5. APPOINTMENT MODAL PC LIGHT ───
    console.log("Opening AppointmentModal in PC Light...");
    const apptCard = page.locator('[data-testid^="appointment-card-clickable-"], .appointment-card, [data-testid="appointment-card-container"]').first();
    await apptCard.waitFor({ state: "visible", timeout: 15000 });
    await apptCard.scrollIntoViewIfNeeded().catch(() => {});
    await apptCard.click({ force: true });

    const apptModal = page.locator('[data-testid="appointment-modal-container"]');
    await apptModal.waitFor({ state: "visible", timeout: 15000 });
    await page.waitForTimeout(800);

    console.log("Capturing 05_appointment_modal_pc_light.png...");
    await saveProof(page, "05_appointment_modal_pc_light.png", "AppointmentModal PC Light 1440x900");

    // ─── 6. APPOINTMENT MODAL PC DARK ───
    console.log("Switching AppointmentModal to PC Dark...");
    await setTheme(page, "dark");
    await page.waitForTimeout(800);
    console.log("Capturing 06_appointment_modal_pc_dark.png...");
    await saveProof(page, "06_appointment_modal_pc_dark.png", "AppointmentModal PC Dark 1440x900");

    // Close AppointmentModal
    console.log("Closing AppointmentModal...");
    const closeBtn = page.locator('[data-testid="appointment-modal-close-btn"]');
    if (await closeBtn.isVisible().catch(() => false)) {
      await closeBtn.click({ force: true });
    } else {
      await page.keyboard.press("Escape");
    }
    await apptModal.waitFor({ state: "hidden", timeout: 10000 }).catch(() => {});
    await page.waitForTimeout(600);

    // ─── 7. APPOINTMENT HOVER HUD PC DARK ───
    console.log("Hovering appointment card in PC Dark...");
    await apptCard.hover();
    await page.waitForTimeout(600);
    console.log("Capturing 07_appointment_hover_card_pc_dark.png...");
    await saveProof(page, "07_appointment_hover_card_pc_dark.png", "Appointment Hover Card PC Dark 1440x900");

    console.log("=== ALL WAVE 7 PROOFS CAPTURED SUCCESSFULLY ===");
  } finally {
    await browser.close();
  }
}

run().catch((err) => {
  console.error(">>> WAVE 7 CAPTURE SCRIPT FAILED:", err);
  process.exit(1);
});
