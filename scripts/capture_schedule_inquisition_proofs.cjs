/**
 * scripts/capture_schedule_inquisition_proofs.cjs
 * RED TEAM VISUAL PROOF SUITE for Schedule & AppointmentModal Inquisition.
 * Real PostgreSQL (5432) + Real Fastify API (4100) + Real Vite App (5173).
 * Captures 6 real screenshots at 1440x900 (PC Light & Dark).
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

const SUBAGENT_BRAIN_DIR = "C:/Users/Admin/.gemini/antigravity/brain/8feb82d5-2c97-4f8f-bdab-359971a796f3/screenshots";
const DOCS_DIR = path.resolve(__dirname, "../docs/screenshots/schedule_inquisition");

for (const dir of [SUBAGENT_BRAIN_DIR, DOCS_DIR]) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
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
  const brainPath = path.join(SUBAGENT_BRAIN_DIR, fileName);

  await page.screenshot({ path: docsPath, fullPage: false, animations: "disabled" });
  fs.copyFileSync(docsPath, brainPath);

  const stat = fs.statSync(docsPath);
  const hash = crypto.createHash("md5").update(fs.readFileSync(docsPath)).digest("hex");
  console.log(`[Captured] ${fileName} (${description}): ${stat.size} bytes (${(stat.size / 1024).toFixed(1)} KB), MD5: ${hash}`);

  if (stat.size < 40000) {
    throw new Error(`Screenshot ${fileName} is too small (${stat.size} bytes)!`);
  }
  return { fileName, docsPath, brainPath, size: stat.size, hash };
}

async function seedTodayAppointments(authData, schedData) {
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
  const chairId = schedData.chair1Id || (schedData.chairs && schedData.chairs[0]?.id);

  console.log(`[SEED-TODAY] Seeding appointments for dates [${dates.join(", ")}] on chair ${chairId}...`);

  for (const dt of dates) {
    const appts = [
      {
        patientId,
        doctorUserId,
        chairId,
        startsAt: `${dt}T09:00:00.000Z`,
        endsAt: `${dt}T10:00:00.000Z`,
        status: "confirmed",
        reason: "Лечение кариеса 16 зуба (Терапия)",
        comment: "", // Empty comment so spoiler starts collapsed!
      },
      {
        patientId,
        doctorUserId,
        chairId,
        startsAt: `${dt}T10:30:00.000Z`,
        endsAt: `${dt}T11:45:00.000Z`,
        status: "in_treatment",
        reason: "Эндодонтия 46 зуба (3 канала)",
        comment: "",
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
          console.log(`[SEED-TODAY] Created appointment at ${a.startsAt}`);
        } else {
          console.log(`[SEED-TODAY] Appt create note: ${res.status} ${await res.text()}`);
        }
      } catch (e) {
        console.warn(`[SEED-TODAY] Appt create warning: ${e.message}`);
      }
    }
  }
}

async function closeModal(page) {
  const container = page.locator('[data-testid="appointment-modal-container"]');
  if (await container.count() > 0 && await container.isVisible().catch(() => false)) {
    const closeBtn = page.locator('[data-testid="appointment-modal-close-btn"]').first();
    if (await closeBtn.isVisible().catch(() => false)) {
      await closeBtn.click({ force: true });
    } else {
      await page.keyboard.press("Escape");
    }
    await container.waitFor({ state: "hidden", timeout: 10000 }).catch(() => {});
    await page.waitForTimeout(600);
  }
}

async function openModal(page) {
  const card = page.locator('[data-testid^="appointment-card-clickable-"]').first();
  await card.waitFor({ state: "visible", timeout: 15000 });
  await card.scrollIntoViewIfNeeded();
  await card.click({ force: true });
  const container = page.locator('[data-testid="appointment-modal-container"]');
  await container.waitFor({ state: "visible", timeout: 15000 });
  await page.waitForTimeout(800);
}

async function ensureSpoilerState(page, shouldBeOpen) {
  const container = page.locator('[data-testid="appointment-modal-container"]');
  await container.waitFor({ state: "visible", timeout: 10000 });
  const btn = page.locator('[data-testid="appointment-modal-toggle-additional-btn"]');
  await btn.waitFor({ state: "attached", timeout: 10000 });
  const isExpanded = (await btn.getAttribute("aria-expanded")) === "true";
  if (isExpanded !== shouldBeOpen) {
    await page.evaluate(() => {
      const scrollContainer = document.querySelector('[data-testid="appointment-modal-container"] .overflow-y-auto');
      if (scrollContainer) scrollContainer.scrollTop = scrollContainer.scrollHeight;
    });
    await page.waitForTimeout(300);
    await btn.click({ force: true });
    await page.waitForTimeout(600);
  }
  if (shouldBeOpen) {
    await page.evaluate(() => {
      const scrollContainer = document.querySelector('[data-testid="appointment-modal-container"] .overflow-y-auto');
      if (scrollContainer) scrollContainer.scrollTop = scrollContainer.scrollHeight;
    });
  } else {
    await page.evaluate(() => {
      const scrollContainer = document.querySelector('[data-testid="appointment-modal-container"] .overflow-y-auto');
      if (scrollContainer) scrollContainer.scrollTop = 0;
    });
  }
  await page.waitForTimeout(500);
}

async function run() {
  console.log("=== INQUISITION REAL SCREENSHOT CAPTURE SUITE ===");
  console.log("1. Authenticating with real Fastify backend on port 4100...");
  const authData = await obtainRealAuthTokens();
  console.log(`   -> Auth OK: Org=${authData.organizationId}, User=${authData.user.fullName}`);

  console.log("2. Seeding real chairs, patients, and schedule appointments in PostgreSQL...");
  const schedData = await seedLiveScheduleData(authData);
  console.log(`   -> Seed OK: ActivePatient=${schedData.activePatientId}`);

  console.log("2.1 Seeding explicit appointments for local calendar date...");
  await seedTodayAppointments(authData, schedData);

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

    // Inject tokens to localStorage
    await injectRealAuthToContext(context, authData, {
      selectedPatientId: schedData.activePatientId,
    });

    const page = await context.newPage();
    page.on("pageerror", (err) => console.error("[PageError]:", err.message));
    page.on("console", (msg) => console.log(`[Browser ${msg.type()}]:`, msg.text()));
    page.on("framenavigated", (frame) => {
      if (frame === page.mainFrame()) {
        console.log("[MainFrameNavigated]:", frame.url());
      }
    });

    console.log("4. Navigating to http://127.0.0.1:5173/#schedule...");
    await page.goto("http://127.0.0.1:5173/#schedule", { waitUntil: "commit", timeout: 60000 });
    await page.waitForSelector(".boot-state", { state: "detached", timeout: 30000 }).catch(() => {});
    await page.waitForSelector(".schedule-filter-strip", { state: "visible", timeout: 30000 });
    await page.waitForTimeout(2000);

    // Dismiss any banner notices
    const noticeBtn = page.locator('.app-notice button:has-text("Понятно"), [data-testid="btn-dismiss-notice"], button:has-text("Скрыть")');
    if (await noticeBtn.isVisible()) {
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
        const el = document.querySelector(".schedule-filter-chips");
        if (el) el.scrollLeft = 0;
      });
    }

    // Ensure all scroll containers are at 0, 0
    await resetAllScrolls(page);

    // ─── 1. SCHEDULE PC LIGHT ───
    console.log("Capturing 01_schedule_pc_light.png...");
    await setTheme(page, "light");
    await resetAllScrolls(page);
    await page.waitForTimeout(800);
    await saveProof(page, "01_schedule_pc_light.png", "Schedule PC Light 1440x900");

    // ─── 2. SCHEDULE PC DARK ───
    console.log("Capturing 04_schedule_pc_dark.png...");
    await setTheme(page, "dark");
    await resetAllScrolls(page);
    await page.waitForTimeout(800);
    await saveProof(page, "04_schedule_pc_dark.png", "Schedule PC Dark 1440x900");

    // ─── 3. OPEN APPOINTMENT MODAL (in Dark mode) ───
    console.log("Opening AppointmentModal in Dark mode...");
    const apptTimeEl = page.locator('[data-testid^="appointment-card-clickable-"] span.font-mono').first();
    await apptTimeEl.waitFor({ state: "visible", timeout: 15000 });
    await apptTimeEl.click();

    const modalContainer = page.locator('[data-testid="appointment-modal-container"]');
    await modalContainer.waitFor({ state: "visible", timeout: 15000 });
    await page.waitForTimeout(800);

    // ─── 4. APPOINTMENT MODAL PC DARK (Base Layer A) ───
    console.log("Ensuring spoiler is collapsed for Dark Base Layer A...");
    await ensureSpoilerState(page, false);
    console.log("Capturing 05_appointment_modal_pc_dark.png...");
    await saveProof(page, "05_appointment_modal_pc_dark.png", "AppointmentModal Base Layer A PC Dark 1440x900");

    // ─── 5. APPOINTMENT MODAL SPOILER EXPANDED PC DARK ───
    console.log("Expanding 'Дополнительные параметры' spoiler in Dark mode...");
    await ensureSpoilerState(page, true);
    console.log("Capturing 06_appointment_modal_spoiler_pc_dark.png...");
    await saveProof(page, "06_appointment_modal_spoiler_pc_dark.png", "AppointmentModal with Spoiler Expanded PC Dark 1440x900");

    // ─── 6. APPOINTMENT MODAL SPOILER EXPANDED PC LIGHT ───
    console.log("Switching to Light mode with spoiler expanded...");
    await setTheme(page, "light");
    await page.waitForTimeout(800);
    console.log("Capturing 03_appointment_modal_spoiler_pc_light.png...");
    await saveProof(page, "03_appointment_modal_spoiler_pc_light.png", "AppointmentModal with Spoiler Expanded PC Light 1440x900");

    // ─── 7. APPOINTMENT MODAL PC LIGHT (Base Layer A) ───
    console.log("Collapsing spoiler for Light Base Layer A...");
    await ensureSpoilerState(page, false);
    console.log("Capturing 02_appointment_modal_pc_light.png...");
    await saveProof(page, "02_appointment_modal_pc_light.png", "AppointmentModal Base Layer A PC Light 1440x900");

    // Close modal
    console.log("Closing AppointmentModal...");
    await closeModal(page);

    console.log("=== ALL 6 REAL INQUISITION PROOFS CAPTURED SUCCESSFULLY! ===");
  } finally {
    await browser.close();
  }
}

run().catch((err) => {
  console.error(">>> CAPTURE SCRIPT FAILED:", err);
  process.exit(1);
});
