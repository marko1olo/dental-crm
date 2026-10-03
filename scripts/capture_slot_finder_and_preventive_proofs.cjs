/**
 * scripts/capture_slot_finder_and_preventive_proofs.cjs
 *
 * Dedicated Live Playwright Capture for:
 * 1. proof_slot_finder_dark.png & proof_slot_finder_light.png
 *    - Free Windows Slot Finder modal (DentalPRO / IDENT parity)
 *    - Duration chips [15, 30, 45, 60, 90, 120 min], doctor selector, quick date ranges, candidate slots
 * 2. proof_preventive_inspection_dark.png & proof_preventive_inspection_light.png
 *    - Preventive inspection & warranty control modal (Mandate 8x & Mandate 8y)
 *    - Implant & orthopedic warranty cards, 1-click WhatsApp, 152-FZ copy message, 1-click booking
 */

const { chromium } = require("C:/Clinic_MVP/dental-crm/node_modules/playwright");
const path = require("node:path");
const fs = require("node:fs");
const http = require("node:http");

async function detectPort() {
  const tryPort = (port) => new Promise((resolve) => {
    const req = http.get(`http://127.0.0.1:${port}/`, (res) => {
      resolve(res.statusCode < 500);
    });
    req.on("error", () => resolve(false));
    req.setTimeout(1500, () => {
      req.destroy();
      resolve(false);
    });
  });

  if (await tryPort(5173)) return 5173;
  if (await tryPort(5174)) return 5174;
  return 5173;
}

const localNow = new Date();
const todayDate = `${localNow.getFullYear()}-${String(localNow.getMonth() + 1).padStart(2, "0")}-${String(localNow.getDate()).padStart(2, "0")}`;

const mockDashboard = {
  clinicName: "Стоматология ДЕНТЕ Премиум",
  todayIso: todayDate,
  clinicSettings: {
    profile: {
      id: "c-1",
      organizationId: "00000000-0000-0000-0000-000000000001",
      clinicName: "Стоматология ДЕНТЕ Премиум",
      mode: "small_clinic",
      defaultVisitMinutes: 30,
      scheduleDefaults: {
        workingDays: [1, 2, 3, 4, 5, 6],
        workdayStart: "08:00",
        workdayEnd: "21:00",
        appointmentBufferMinutes: 10,
      },
      timezone: "Europe/Moscow",
      phone: "+7 (495) 123-45-67",
      address: "Москва, Столярный переулок, 14",
      inn: "7701234567",
      updatedAt: new Date().toISOString(),
    },
    staff: [
      {
        id: "doc-1",
        organizationId: "00000000-0000-0000-0000-000000000001",
        fullName: "Д-р Воронов Алексей Владимирович",
        role: "owner",
        specialties: ["therapist"],
        active: true,
        color: "#0d9488",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      {
        id: "doc-2",
        organizationId: "00000000-0000-0000-0000-000000000001",
        fullName: "Д-р Захарова Елена Сергеевна",
        role: "doctor",
        specialties: ["surgeon"],
        active: true,
        color: "#e11d48",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      {
        id: "doc-3",
        organizationId: "00000000-0000-0000-0000-000000000001",
        fullName: "Д-р Лебедев Дмитрий Павлович",
        role: "doctor",
        specialties: ["orthopedist"],
        active: true,
        color: "#8b5cf6",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    ],
    chairs: [
      {
        id: "chair-1",
        organizationId: "00000000-0000-0000-0000-000000000001",
        name: "Кабинет 1 (Терапия)",
        room: "1",
        defaultDoctorId: "doc-1",
        active: true,
        hasXraySensor: true,
        hasMicroscope: true,
        colorId: "chair-1",
      },
      {
        id: "chair-2",
        organizationId: "00000000-0000-0000-0000-000000000001",
        name: "Кабинет 2 (Хирургия)",
        room: "2",
        defaultDoctorId: "doc-2",
        active: true,
        hasXraySensor: true,
        hasMicroscope: false,
        colorId: "chair-2",
      },
      {
        id: "chair-3",
        organizationId: "00000000-0000-0000-0000-000000000001",
        name: "Кабинет 3 (Ортопедия)",
        room: "3",
        defaultDoctorId: "doc-3",
        active: true,
        hasXraySensor: false,
        hasMicroscope: false,
        colorId: "chair-3",
      },
    ],
  },
  patients: [
    {
      id: "pat-1",
      organizationId: "00000000-0000-0000-0000-000000000001",
      fullName: "Ковалёв Роман Станиславович",
      phone: "+7 (999) 111-22-33",
      status: "active",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      id: "pat-2",
      organizationId: "00000000-0000-0000-0000-000000000001",
      fullName: "Смирнова Ольга Викторовна",
      phone: "+7 (999) 222-33-44",
      status: "active",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      id: "pat-3",
      organizationId: "00000000-0000-0000-0000-000000000001",
      fullName: "Алексеев Денис Игоревич",
      phone: "+7 (999) 333-44-55",
      status: "active",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      id: "pat-4",
      organizationId: "00000000-0000-0000-0000-000000000001",
      fullName: "Морозова Екатерина Андреевна",
      phone: "+7 (999) 444-55-66",
      status: "active",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
  ],
  appointments: [
    {
      id: "appt-1",
      organizationId: "00000000-0000-0000-0000-000000000001",
      chairId: "chair-1",
      doctorUserId: "doc-1",
      patientId: "pat-1",
      startsAt: `${todayDate}T09:00:00.000Z`,
      endsAt: `${todayDate}T10:00:00.000Z`,
      status: "confirmed",
      reason: "Лечение глубокого кариеса 1.6",
      patientName: "Ковалёв Роман Станиславович",
      patientPhone: "+7 (999) 111-22-33",
    },
    {
      id: "appt-past-1",
      organizationId: "00000000-0000-0000-0000-000000000001",
      chairId: "chair-2",
      doctorUserId: "doc-2",
      patientId: "pat-2",
      startsAt: "2026-04-01T10:00:00.000Z",
      endsAt: "2026-04-01T11:30:00.000Z",
      status: "completed",
      reason: "Имплантация Nobel Biocare 3.6",
      patientName: "Смирнова Ольга Викторовна",
      patientPhone: "+7 (999) 222-33-44",
    },
    {
      id: "appt-past-2",
      organizationId: "00000000-0000-0000-0000-000000000001",
      chairId: "chair-3",
      doctorUserId: "doc-3",
      patientId: "pat-3",
      startsAt: "2026-03-15T12:00:00.000Z",
      endsAt: "2026-03-15T13:00:00.000Z",
      status: "completed",
      reason: "Фиксация циркониевой коронки E.max 2.4",
      patientName: "Алексеев Денис Игоревич",
      patientPhone: "+7 (999) 333-44-55",
    },
    {
      id: "appt-past-3",
      organizationId: "00000000-0000-0000-0000-000000000001",
      chairId: "chair-1",
      doctorUserId: "doc-1",
      patientId: "pat-4",
      startsAt: "2026-04-05T14:00:00.000Z",
      endsAt: "2026-04-05T15:00:00.000Z",
      status: "completed",
      reason: "Профессиональная гигиена AirFlow и ультразвук",
      patientName: "Морозова Екатерина Андреевна",
      patientPhone: "+7 (999) 444-55-66",
    },
  ],
  serviceCatalog: [
    { id: "srv-1", name: "Лечение пульпита 1-канального", priceRub: 4500 },
    { id: "srv-2", name: "Установка имплантата Nobel Biocare", priceRub: 38000 },
    { id: "srv-3", name: "Коронка из диоксида циркония", priceRub: 22000 },
  ],
  imagingStudies: [],
  payments: [],
};

async function setupPageRoutes(page) {
  await page.route(/(fonts\.googleapis\.com|fonts\.gstatic\.com)/, (route) => route.abort());
  await page.route("**/api/**", async (route) => {
    const url = route.request().url();
    if (url.includes("/api/auth/session") || url.includes("/api/auth/user/me")) {
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          user: {
            id: "doc-1",
            fullName: "Д-р Воронов Алексей Владимирович",
            role: "owner",
            active: true,
            organizationId: "00000000-0000-0000-0000-000000000001",
          },
        }),
      });
    }
    if (url.includes("/api/dashboard") || url.includes("/api/clinic")) {
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(mockDashboard),
      });
    }
    return route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(mockDashboard),
    });
  });
}

const addAuthInitScript = (ctx, themeMode = "dark") =>
  ctx.addInitScript((mode) => {
    localStorage.setItem("dente_clinic_token", "live-inquisition-clinic-token");
    localStorage.setItem("dente_staff_token", "live-inquisition-staff-token");
    localStorage.setItem("dente_active_role", "owner");
    localStorage.setItem("dente_theme_mode", mode);
    localStorage.setItem("dente_active_patient_id", "pat-1");
    localStorage.setItem("dente_tour_completed", "true");
  }, themeMode);

async function captureForTheme(browser, themeMode, targetDir, port = 5173) {
  console.log(`\n=== Starting capture session for ${themeMode.toUpperCase()} mode ===`);
  const ctx = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    deviceScaleFactor: 2,
  });
  await addAuthInitScript(ctx, themeMode);
  const page = await ctx.newPage();

  page.on("pageerror", (err) => console.error(`[BROWSER ERROR ${themeMode}]:`, err.message));

  await setupPageRoutes(page);

  console.log(`[${themeMode}] Navigating to http://127.0.0.1:${port}/#schedule...`);
  await page.goto(`http://127.0.0.1:${port}/#schedule`, { waitUntil: "networkidle", timeout: 45000 });

  console.log(`[${themeMode}] Waiting for schedule view to boot...`);
  await page.waitForSelector(".boot-state", { state: "detached", timeout: 30000 }).catch(() => {});
  await page.waitForSelector(".schedule-filter-strip", { state: "visible", timeout: 30000 });
  await page.waitForTimeout(1000);

  // Apply theme attributes to documentElement just to be 100% sure matching CSS tokens
  await page.evaluate((th) => {
    document.documentElement.setAttribute("data-theme", th);
    const isDark = ["dark", "night", "ocean", "emerald", "cyber_xray"].includes(th);
    document.documentElement.classList.toggle("dark", isDark);
    document.documentElement.classList.toggle("light", !isDark);
    document.documentElement.style.colorScheme = isDark ? "dark" : "light";
  }, themeMode);

  // Remove vite error overlay if present
  await page.evaluate(() => {
    document.querySelector("vite-error-overlay")?.remove();
  });

  // Dismiss notifications/onboarding
  const dismissBtn = page.locator('button:has-text("Скрыть")');
  if (await dismissBtn.isVisible()) {
    await dismissBtn.click().catch(() => {});
    await page.waitForTimeout(300);
  }
  const noticeDismissBtn = page.locator('.app-notice button:has-text("Понятно"), [data-testid="btn-dismiss-notice"]');
  if (await noticeDismissBtn.isVisible()) {
    await noticeDismissBtn.click().catch(() => {});
    await page.waitForTimeout(300);
  }

  // Switch to Chairs view mode where ChairScheduleToolbar is mounted
  console.log(`[${themeMode}] Switching to Chairs view mode...`);
  const chairsModeBtn = page.locator('[data-testid="schedule-view-mode-chairs"], button:has-text("Кресла")').first();
  if (await chairsModeBtn.isVisible()) {
    await chairsModeBtn.click({ force: true });
    await page.waitForTimeout(800);
  }

  // ==========================================
  // 1. FREE WINDOWS SLOT FINDER MODAL
  // ==========================================
  console.log(`[${themeMode}] Opening Free Windows Slot Finder modal...`);
  const optionsMenuBtn = page.locator('[data-testid="schedule-toolbar-options-btn"]').first();
  await optionsMenuBtn.waitFor({ state: "visible", timeout: 8000 });
  await optionsMenuBtn.click({ force: true });
  await page.waitForTimeout(400);

  const freeSlotsMenuItem = page.locator('[data-testid="schedule-strip-free-slots-btn"], button:has-text("Свободные окна")').first();
  await freeSlotsMenuItem.waitFor({ state: "attached", timeout: 5000 });
  await freeSlotsMenuItem.evaluate((btn) => btn.click());

  const slotModal = page.locator('[data-testid="doctor-free-slots-modal"]');
  await slotModal.waitFor({ state: "visible", timeout: 8000 });
  console.log(`[${themeMode}] DoctorFreeSlotsModal is visible!`);

  // Click 60 min chip
  const chip60 = page.locator('[data-testid="duration-chip-60"], button:has-text("60м")').first();
  if (await chip60.isVisible()) {
    await chip60.click({ force: true });
    await page.waitForTimeout(400);
  }

  const slotProofPath = path.join(targetDir, `proof_slot_finder_${themeMode}.png`);
  console.log(`[${themeMode}] Capturing ${slotProofPath}...`);
  await page.screenshot({ path: slotProofPath, fullPage: false, animations: "disabled", timeout: 15000 });
  console.log(`[${themeMode}] Saved proof_slot_finder_${themeMode}.png (${fs.statSync(slotProofPath).size} bytes)`);

  // Close Slot Finder modal
  const closeSlotModalBtn = page.locator('[data-testid="btn-close-free-slots-modal"]').first();
  if (await closeSlotModalBtn.isVisible()) {
    await closeSlotModalBtn.click({ force: true });
  } else {
    await page.keyboard.press("Escape");
  }
  await slotModal.waitFor({ state: "hidden", timeout: 5000 }).catch(() => {});
  await page.waitForTimeout(600);

  // ==========================================
  // 2. PREVENTIVE INSPECTION & WARRANTY MODAL
  // ==========================================
  console.log(`[${themeMode}] Opening Preventive Inspection & Warranty Modal...`);
  const shiftsMenuBtn = page.locator('[data-testid="btn-chair-shifts-menu-trigger"]').first();
  if (await shiftsMenuBtn.isVisible()) {
    await shiftsMenuBtn.click({ force: true });
    await page.waitForTimeout(300);
    const chairPrevBtn = page.locator('[data-testid="btn-chair-preventive-inspection"]').first();
    await chairPrevBtn.waitFor({ state: "attached", timeout: 5000 });
    await chairPrevBtn.evaluate((btn) => btn.click());
  } else {
    await optionsMenuBtn.click({ force: true });
    await page.waitForTimeout(400);
    const prevMenuItem = page.locator('[data-testid="schedule-strip-preventive-inspection-btn"], button:has-text("Осмотры по гарантии")').first();
    await prevMenuItem.waitFor({ state: "attached", timeout: 5000 });
    await prevMenuItem.evaluate((btn) => btn.click());
  }

  const prevModal = page.locator('[data-testid="preventive-inspection-modal"]');
  await prevModal.waitFor({ state: "visible", timeout: 8000 });
  console.log(`[${themeMode}] PreventiveInspectionModal is visible!`);
  await page.waitForTimeout(500);

  const prevProofPath = path.join(targetDir, `proof_preventive_inspection_${themeMode}.png`);
  console.log(`[${themeMode}] Capturing ${prevProofPath}...`);
  await page.screenshot({ path: prevProofPath, fullPage: false, animations: "disabled", timeout: 15000 });
  console.log(`[${themeMode}] Saved proof_preventive_inspection_${themeMode}.png (${fs.statSync(prevProofPath).size} bytes)`);

  // Close context cleanly
  await ctx.close();
}

async function main() {
  const targetDir = path.resolve("C:/Clinic_MVP/dental-crm/docs/screenshots/inquisition_live");
  if (!fs.existsSync(targetDir)) fs.mkdirSync(targetDir, { recursive: true });

  const port = await detectPort();
  console.log(`Detected Vite server running on port: ${port}`);

  console.log("Launching Chromium browser for Live Inquisitor Proofs...");
  const browser = await chromium.launch({
    headless: true,
    executablePath: "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
    args: ["--headless=new", "--no-sandbox", "--disable-dev-shm-usage", "--disable-gpu"],
  });

  try {
    await captureForTheme(browser, "dark", targetDir, port);
    await captureForTheme(browser, "light", targetDir, port);
    console.log("\n=== ALL RED TEAM VISUAL PROOFS CAPTURED SUCCESSFULLY! ===");
  } finally {
    await browser.close();
  }
}

main().catch((err) => {
  console.error("FATAL ERROR in capture_slot_finder_and_preventive_proofs:", err);
  process.exit(1);
});
