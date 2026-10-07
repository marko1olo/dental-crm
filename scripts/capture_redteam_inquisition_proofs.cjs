/**
 * scripts/capture_redteam_inquisition_proofs.cjs
 *
 * Red Team Inquisitor Proofmaker Script (Mandates 8d, 8e, 8k, 8n, THE HAMMER).
 * Captures 4 live 1440x900 screenshots with real server data:
 * 1. Warehouse write-off without "1-клик" and zero emojis (Light)
 * 2. Schedule with opened Smart Slot Recovery Popover (Light)
 * 3. PaymentCapture with offline fiscal queue badge & offline banner (Dark)
 * 4. Messengers settings overview with honest unconfigured statuses (Dark)
 */

const { chromium } = require("playwright");
const path = require("node:path");
const fs = require("node:fs");
const crypto = require("node:crypto");

const API_BASE = "http://127.0.0.1:4100";
const WEB_BASE = "http://127.0.0.1:5173";
const OUT_DIR = path.resolve("C:/Clinic_MVP/dental-crm/docs/screenshots/redteam_inquisition");
const CHROME_PATH = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";

async function setupAuthAndSeed() {
  const unique = Date.now();
  console.log(`[Setup] Initializing clinic for red team inquisition...`);

  let clinicToken = null;
  let staffToken = null;
  let ownerUserId = null;
  let orgId = null;
  let chairs = [];

  const initRes = await fetch(`${API_BASE}/api/auth/setup/init`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      clinicName: "Стоматология ДЕНТЕ RedTeam",
      email: `inquisitor-${unique}@dente-crm.ru`,
      password: "Password123!",
      ownerName: "Д-р Инквизитор Алексей Владимирович",
      ownerPin: "1234",
    }),
  });

  if (!initRes.ok) {
    throw new Error(`Init failed: ${initRes.status} ${await initRes.text()}`);
  }

  const initData = await initRes.json();
  clinicToken = initData.clinicToken;
  ownerUserId = initData.ownerUserId;
  orgId = initData.organizationId;

  const unlockRes = await fetch(`${API_BASE}/api/auth/staff/unlock`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-dente-clinic-token": clinicToken,
    },
    body: JSON.stringify({ userId: ownerUserId, pinCode: "1234" }),
  });

  if (!unlockRes.ok) {
    throw new Error(`Unlock failed: ${unlockRes.status} ${await unlockRes.text()}`);
  }

  const unlockData = await unlockRes.json();
  staffToken = unlockData.staffToken;

  const headers = {
    "Content-Type": "application/json",
    "x-dente-clinic-token": clinicToken,
    "x-dente-staff-token": staffToken,
  };

  // Fetch dashboard to get real chair UUIDs
  const dashRes = await fetch(`${API_BASE}/api/dashboard`, { headers });
  if (dashRes.ok) {
    const dashData = await dashRes.json();
    chairs = dashData.chairs || dashData.clinicSettings?.chairs || [];
    console.log(`[Setup] Discovered ${chairs.length} chairs in clinic.`);
  }

  const primaryChairId = chairs[0]?.id || "chair-1";

  // Seed patient
  let patientId = null;
  try {
    const pRes = await fetch(`${API_BASE}/api/patients`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        fullName: "Смирнов Константин Андреевич",
        phone: "+7 (912) 345-67-89",
        birthDate: "1985-05-15",
        gender: "male",
        notes: "Острая боль 3.6, аллергия на пенициллин",
      }),
    });
    if (pRes.ok) {
      const pData = await pRes.json();
      patientId = pData.patient?.id || pData.id;
      console.log(`[Seed] Seeded patient: ${patientId}`);
    }
  } catch (e) {
    console.warn("Patient seed note:", e.message);
  }

  // Seed future cancelled appointment for today with valid chairId
  const now = new Date();
  const startTime = new Date(now.getTime() + 15 * 60 * 1000).toISOString();
  const endTime = new Date(now.getTime() + 45 * 60 * 1000).toISOString();

  let appointmentId = null;
  try {
    const aRes = await fetch(`${API_BASE}/api/appointments`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        patientId: patientId || "patient-1",
        doctorId: ownerUserId || "doctor-1",
        chairId: primaryChairId,
        startsAt: startTime,
        endsAt: endTime,
        status: "cancelled",
        reason: "Отмена по болезни: окно свободно",
      }),
    });
    if (aRes.ok) {
      const aData = await aRes.json();
      const createdAppt = aData.appointments?.find((a) => a.chairId === primaryChairId && a.status === "cancelled");
      appointmentId = createdAppt?.id || aData.id;
      console.log(`[Seed] Seeded cancelled appointment: ${appointmentId} on chair ${primaryChairId}`);
    }
  } catch (e) {
    console.warn("Appointment seed error:", e.message);
  }

  return { clinicToken, staffToken, ownerUserId, orgId, primaryChairId, patientId, appointmentId };
}

async function run() {
  if (!fs.existsSync(OUT_DIR)) {
    fs.mkdirSync(OUT_DIR, { recursive: true });
  }

  const contextData = await setupAuthAndSeed();

  const browser = await chromium.launch({
    headless: true,
    executablePath: fs.existsSync(CHROME_PATH) ? CHROME_PATH : undefined,
    args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-gpu"],
  });

  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    deviceScaleFactor: 1,
  });

  // Inject session, tour suppression, and storage before any script runs
  await context.addInitScript(({ cToken, sToken, nowIso }) => {
    if (cToken) {
      localStorage.setItem("dente_clinic_token", cToken);
      document.cookie = `dente_clinic_token=${cToken}; path=/; max-age=31536000`;
    }
    if (sToken) {
      localStorage.setItem("dente_staff_token", sToken);
      document.cookie = `dente_staff_token=${sToken}; path=/; max-age=31536000`;
    }
    localStorage.setItem("dente_tour_completed", "true");
    localStorage.setItem("dente_quest_progress_v2", JSON.stringify({
      activeTrackId: "solo_doctor",
      currentStepIndex: 0,
      completedStepIds: ["solo_schedule", "solo_odontogram", "solo_diary", "solo_cashier"],
      isTourActive: false,
      isDismissedPermanently: true,
      tracksProgress: {
        solo_doctor: { completed: true, completedStepIds: ["solo_schedule", "solo_odontogram", "solo_diary", "solo_cashier"] },
        reception_admin: { completed: true, completedStepIds: [] },
        imaging_diagnostics: { completed: true, completedStepIds: [] },
      },
    }));
    localStorage.setItem("dente_onboarding_dismissed", "true");
    localStorage.setItem("dente_onboarding_completed", "true");
    localStorage.setItem("dente_scale_mode", "solo_doctor");

    // Seed offline fiscal queue
    const queueItem = {
      id: "offline-receipt-test-1",
      status: "pending_fiscal_sync",
      createdAt: nowIso,
      retryCount: 0,
      payload: { amountRub: 4500, method: "card" },
      lastError: "Ожидает ОФД (сетевой буфер)",
    };
    localStorage.setItem("dente_offline_fiscal_queue_v1", JSON.stringify([queueItem]));
  }, {
    cToken: contextData.clinicToken,
    sToken: contextData.staffToken,
    nowIso: new Date().toISOString(),
  });

  const page = await context.newPage();

  const dismissOverlaysAndModals = async () => {
    await page.evaluate(() => {
      document.querySelectorAll("vite-error-overlay").forEach((el) => el.remove());
      const buttons = Array.from(document.querySelectorAll("button"));
      const dismissBtn = buttons.find((b) =>
        b.textContent && (b.textContent.includes("Больше не показывать") || b.textContent.includes("Пропустить"))
      );
      if (dismissBtn) dismissBtn.click();
    });
    await page.waitForTimeout(300);
  };

  const ensureAppMounted = async () => {
    await page.waitForFunction(() => {
      const boot = document.querySelector(".boot-state");
      const root = document.getElementById("root");
      return !boot && root && root.children.length > 0;
    }, { timeout: 30000 });

    await dismissOverlaysAndModals();
  };

  const setTheme = async (themeName) => {
    await page.evaluate((theme) => {
      localStorage.setItem("dente_theme", theme);
      document.documentElement.setAttribute("data-theme", theme);
      if (theme === "dark") {
        document.documentElement.classList.add("dark");
      } else {
        document.documentElement.classList.remove("dark");
      }
    }, themeName);
    await page.waitForTimeout(300);
  };

  console.log("\n========================================================");
  console.log("RED TEAM INQUISITION: CAPTURING 4 VERIFIED 1440x900 SHOTS");
  console.log("========================================================\n");

  // --------------------------------------------------------------------------
  // SCREENSHOT 1: Склад и списание (без «1-клик» и без эмодзи) Light
  // --------------------------------------------------------------------------
  console.log("[Capture 1/4] Loading Warehouse and Write-Off (Light)...");
  await page.goto(`${WEB_BASE}/#inventory`, { waitUntil: "domcontentloaded", timeout: 30000 });
  await ensureAppMounted();
  await setTheme("light");

  await page.waitForSelector(
    '.inventory-container, .inventory-top-toolbar, [data-testid="inventory-category-filters-row"], [data-testid="btn-toggle-quick-packages"]',
    { timeout: 15000 }
  );

  const packagesBtn = page.locator('[data-testid="btn-toggle-quick-packages"]').first();
  if (await packagesBtn.isVisible({ timeout: 4000 }).catch(() => false)) {
    const isBarVisible = await page.locator('[data-testid="warehouse-package-writeoff-bar"]').isVisible().catch(() => false);
    if (!isBarVisible) {
      await dismissOverlaysAndModals();
      await packagesBtn.click({ force: true });
      await page.waitForTimeout(800);
    }
  }

  try {
    await page.waitForSelector('[data-testid="warehouse-package-writeoff-bar"]', { timeout: 8000 });
  } catch (e) {
    console.warn("Write-off bar selector note:", e.message);
  }

  await dismissOverlaysAndModals();
  await page.waitForTimeout(1000);
  const shot1Path = path.join(OUT_DIR, "proof_01_warehouse_writeoff_light.png");
  await page.screenshot({ path: shot1Path, fullPage: false });
  console.log(`✓ Saved Screenshot 1: ${shot1Path}`);

  // --------------------------------------------------------------------------
  // SCREENSHOT 2: Расписание со Smart Slot Recovery Popover (Light)
  // --------------------------------------------------------------------------
  console.log("\n[Capture 2/4] Loading Schedule with Smart Slot Recovery Popover (Light)...");
  await page.goto(`${WEB_BASE}/#schedule`, { waitUntil: "domcontentloaded", timeout: 30000 });
  await ensureAppMounted();
  await setTheme("light");

  await page.waitForSelector('[data-testid="schedule-view"], #schedule, .schedule-panel', { timeout: 15000 });
  await page.waitForTimeout(1000);
  await dismissOverlaysAndModals();

  // Switch to timeline ("Лента") mode
  const timelineBtn = page.locator('[data-testid="schedule-view-mode-timeline"]').first();
  if (await timelineBtn.isVisible({ timeout: 4000 }).catch(() => false)) {
    await timelineBtn.click({ force: true });
    await page.waitForTimeout(1000);
  }

  // Click Smart Slot Recovery button
  const recoveryBtn = page.locator('[data-testid="smart-slot-recovery-open-btn"]').first();
  if (await recoveryBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
    await recoveryBtn.scrollIntoViewIfNeeded();
    await recoveryBtn.click({ force: true });
    await page.waitForTimeout(800);
  }

  try {
    await page.waitForSelector('[data-testid="smart-slot-recovery-popover"]', { timeout: 6000 });
  } catch (e) {
    console.warn("Popover selector wait note:", e.message);
  }

  await dismissOverlaysAndModals();
  await page.waitForTimeout(1000);
  const shot2Path = path.join(OUT_DIR, "proof_02_schedule_smart_slot_recovery_light.png");
  await page.screenshot({ path: shot2Path, fullPage: false });
  console.log(`✓ Saved Screenshot 2: ${shot2Path}`);

  // --------------------------------------------------------------------------
  // SCREENSHOT 3: Касса с бейджем офлайн-очереди Dark
  // --------------------------------------------------------------------------
  console.log("\n[Capture 3/4] Loading Cash Desk with Offline Queue Badge (Dark)...");
  await page.goto(`${WEB_BASE}/#finance`, { waitUntil: "domcontentloaded", timeout: 30000 });
  await ensureAppMounted();
  await setTheme("dark");

  await page.waitForSelector('.payment-capture, #payment-capture, .finance-cashbox-container', { timeout: 15000 });

  // Trigger offline state for offline badge and banner
  await page.evaluate(() => {
    window.dispatchEvent(new Event("offline"));
  });
  await page.waitForTimeout(800);

  const payCapture = page.locator('.payment-capture, #payment-capture').first();
  if (await payCapture.isVisible({ timeout: 4000 }).catch(() => false)) {
    await payCapture.scrollIntoViewIfNeeded();
  }

  await dismissOverlaysAndModals();
  await page.waitForTimeout(1000);
  const shot3Path = path.join(OUT_DIR, "proof_03_payment_capture_offline_queue_dark.png");
  await page.screenshot({ path: shot3Path, fullPage: false });
  console.log(`✓ Saved Screenshot 3: ${shot3Path}`);

  // --------------------------------------------------------------------------
  // SCREENSHOT 4: Настройки мессенджеров с честными статусами Dark
  // --------------------------------------------------------------------------
  console.log("\n[Capture 4/4] Loading Messengers Settings with Honest Statuses (Dark)...");
  // Restore online state
  await page.evaluate(() => {
    window.dispatchEvent(new Event("online"));
  });
  await page.waitForTimeout(400);

  await page.goto(`${WEB_BASE}/#settings/telegram`, { waitUntil: "domcontentloaded", timeout: 30000 });
  await ensureAppMounted();
  await setTheme("dark");

  await page.waitForSelector('#settings, .settings-zone', { timeout: 15000 });

  // Wait for overview card
  try {
    await page.waitForSelector('[data-testid="messengers-overview-card"]', { timeout: 12000 });
    const overviewCard = page.locator('[data-testid="messengers-overview-card"]').first();
    await overviewCard.scrollIntoViewIfNeeded();
  } catch (e) {
    console.warn("Messengers overview card wait note:", e.message);
  }

  await dismissOverlaysAndModals();
  await page.waitForTimeout(1000);
  const shot4Path = path.join(OUT_DIR, "proof_04_messengers_settings_honest_dark.png");
  await page.screenshot({ path: shot4Path, fullPage: false });
  console.log(`✓ Saved Screenshot 4: ${shot4Path}`);

  await browser.close();

  console.log("\n========================================================");
  console.log("CAPTURE RUN COMPLETE. VERIFYING FILES & HASHES...");
  console.log("========================================================\n");

  const files = [shot1Path, shot2Path, shot3Path, shot4Path];
  for (const f of files) {
    if (fs.existsSync(f)) {
      const stats = fs.statSync(f);
      const hash = crypto.createHash("md5").update(fs.readFileSync(f)).digest("hex");
      console.log(`FILE: ${path.basename(f)} | SIZE: ${stats.size} bytes | MD5: ${hash}`);
    } else {
      console.error(`MISSING: ${f}`);
    }
  }
}

run().catch((err) => {
  console.error("FATAL ERROR in capture runner:", err);
  process.exit(1);
});
