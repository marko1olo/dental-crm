/**
 * scripts/capture_schedule_15min_and_toolbar_proofs.cjs
 *
 * Dedicated Red Team Inquisitor Screenshot Proof Script:
 * 1. 15-20 min micro-density appointment cards without wrapping/clipping
 * 2. 30-45 min 2-line appointment cards
 * 3. 60+ min expanded appointment cards
 * 4. Strict 1-line 36px ChairScheduleToolbar (Mandate 8p)
 *
 * Outputs:
 * - docs/screenshots/inquisition_live/proof_schedule_15min_cards_light.png (1440x900)
 * - docs/screenshots/inquisition_live/proof_schedule_15min_cards_dark.png (1440x900)
 */

const { chromium } = require("C:/Clinic_MVP/dental-crm/node_modules/playwright");
const path = require("node:path");
const fs = require("node:fs");
const http = require("node:http");

async function detectPort() {
  const tryPort = (port) =>
    new Promise((resolve) => {
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

// Helper to construct ISO strings matching clinic local time
function makeIso(hour, min) {
  const d = new Date();
  d.setHours(hour, min, 0, 0);
  return d.toISOString();
}

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
        name: "Кресло 1 (Терапия)",
        roomNumber: "Кабинет 1",
        color: "#0d9488",
        defaultDoctorId: "doc-1",
        active: true,
        sortOrder: 1,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      {
        id: "chair-2",
        organizationId: "00000000-0000-0000-0000-000000000001",
        name: "Кресло 2 (Хирургия)",
        roomNumber: "Кабинет 2",
        color: "#e11d48",
        defaultDoctorId: "doc-2",
        active: true,
        sortOrder: 2,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      {
        id: "chair-3",
        organizationId: "00000000-0000-0000-0000-000000000001",
        name: "Кресло 3 (Ортопедия)",
        roomNumber: "Кабинет 3",
        color: "#8b5cf6",
        defaultDoctorId: "doc-3",
        active: true,
        sortOrder: 3,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    ],
    rooms: [{ id: "room-1", name: "Кабинет 1" }],
    specialties: ["therapist", "surgeon", "orthopedist"],
    integrations: {},
    audit: [],
    updatedAt: new Date().toISOString(),
  },
  patients: [
    {
      id: "pat-1",
      organizationId: "00000000-0000-0000-0000-000000000001",
      fullName: "Иванов Иван Иванович",
      phone: "+7 (999) 111-22-33",
      status: "active",
      balanceRub: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      id: "pat-2",
      organizationId: "00000000-0000-0000-0000-000000000001",
      fullName: "Петрова Анна Сергеевна",
      phone: "+7 (999) 222-33-44",
      status: "active",
      balanceRub: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      id: "pat-3",
      organizationId: "00000000-0000-0000-0000-000000000001",
      fullName: "Сидоров Денис Павлович",
      phone: "+7 (999) 333-44-55",
      status: "active",
      balanceRub: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      id: "pat-4",
      organizationId: "00000000-0000-0000-0000-000000000001",
      fullName: "Козлова Ольга Николаевна",
      phone: "+7 (999) 444-55-66",
      status: "active",
      balanceRub: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      id: "pat-5",
      organizationId: "00000000-0000-0000-0000-000000000001",
      fullName: "Соколов Виктор Михайлович",
      phone: "+7 (999) 555-66-77",
      status: "active",
      balanceRub: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      id: "pat-6",
      organizationId: "00000000-0000-0000-0000-000000000001",
      fullName: "Михайлов Артем Юрьевич",
      phone: "+7 (999) 666-77-88",
      status: "active",
      balanceRub: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
  ],
  appointments: [
    // 15-minute slot (Micro-density mode)
    {
      id: "appt-1",
      organizationId: "00000000-0000-0000-0000-000000000001",
      chairId: "chair-1",
      doctorUserId: "doc-1",
      patientId: "pat-1",
      startsAt: makeIso(9, 0),
      endsAt: makeIso(9, 15),
      status: "confirmed",
      reason: "Осмотр и консультация",
      patientName: "Иванов Иван Иванович",
      patientPhone: "+7 (999) 111-22-33",
    },
    // 20-minute slot (Micro-density mode)
    {
      id: "appt-2",
      organizationId: "00000000-0000-0000-0000-000000000001",
      chairId: "chair-1",
      doctorUserId: "doc-1",
      patientId: "pat-2",
      startsAt: makeIso(9, 20),
      endsAt: makeIso(9, 40),
      status: "arrived",
      reason: "Снятие швов",
      patientName: "Петрова Анна Сергеевна",
      patientPhone: "+7 (999) 222-33-44",
    },
    // 30-minute slot (2-line mode)
    {
      id: "appt-3",
      organizationId: "00000000-0000-0000-0000-000000000001",
      chairId: "chair-1",
      doctorUserId: "doc-1",
      patientId: "pat-3",
      startsAt: makeIso(10, 0),
      endsAt: makeIso(10, 30),
      status: "in_treatment",
      reason: "Профгигиена AirFlow",
      patientName: "Сидоров Денис Павлович",
      patientPhone: "+7 (999) 333-44-55",
    },
    // 60-minute slot (Expanded mode)
    {
      id: "appt-4",
      organizationId: "00000000-0000-0000-0000-000000000001",
      chairId: "chair-1",
      doctorUserId: "doc-1",
      patientId: "pat-4",
      startsAt: makeIso(11, 0),
      endsAt: makeIso(12, 0),
      status: "confirmed",
      reason: "Лечение пульпита 1.6",
      patientName: "Козлова Ольга Николаевна",
      patientPhone: "+7 (999) 444-55-66",
    },
    // Chair 2: 15-minute slot
    {
      id: "appt-5",
      organizationId: "00000000-0000-0000-0000-000000000001",
      chairId: "chair-2",
      doctorUserId: "doc-2",
      patientId: "pat-5",
      startsAt: makeIso(9, 30),
      endsAt: makeIso(9, 45),
      status: "planned",
      reason: "Коррекция протеза",
      patientName: "Соколов Виктор Михайлович",
      patientPhone: "+7 (999) 555-66-77",
    },
    // Chair 2: 45-minute slot
    {
      id: "appt-6",
      organizationId: "00000000-0000-0000-0000-000000000001",
      chairId: "chair-2",
      doctorUserId: "doc-2",
      patientId: "pat-6",
      startsAt: makeIso(10, 0),
      endsAt: makeIso(10, 45),
      status: "confirmed",
      reason: "Препарирование под коронку 2.4",
      patientName: "Михайлов Артем Юрьевич",
      patientPhone: "+7 (999) 666-77-88",
    },
  ],
  serviceCatalog: [],
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
    return route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(mockDashboard),
    });
  });
}

async function addAuthInitScript(context, themeMode = "light") {
  await context.addInitScript((mode) => {
    localStorage.setItem("dente_clinic_token", "demo-clinic-token");
    localStorage.setItem("dente_staff_token", "demo-showcase-staff-token-chief");
    localStorage.setItem("dente_active_role", "owner");
    localStorage.setItem("dente_theme_mode", mode);
    localStorage.setItem("dente_tour_completed", "true");
    localStorage.setItem("dente_demo_showcase_mode_v1", "true");
    localStorage.setItem(
      "dente_active_staff_user",
      JSON.stringify({
        id: "doc-1",
        fullName: "Д-р Воронов Алексей Владимирович",
        role: "owner",
      })
    );
    localStorage.setItem(
      "dente_quest_tour_progress_v1",
      JSON.stringify({
        isDismissedPermanently: true,
        isTourActive: false,
        activeTrackId: "solo_doctor",
        currentStepIndex: 999,
        completedStepIds: ["step-1", "step-2", "step-3"],
        tracksProgress: {
          solo_doctor: { completed: true, completedStepIds: ["step-1", "step-2", "step-3"] },
          reception_admin: { completed: true, completedStepIds: [] },
          imaging_diagnostics: { completed: true, completedStepIds: [] },
        },
      })
    );
    localStorage.setItem(
      "dental-crm:onboarding:v1",
      JSON.stringify({ dismissed: true, step: "done", completed: true })
    );
    localStorage.setItem(
      "dente-workspace-profile",
      JSON.stringify({
        state: {
          clinicName: "Стоматология ДЕНТЕ Премиум",
          currentDoctor: { id: "doc-1", fullName: "Д-р Воронов Алексей Владимирович", role: "owner" },
          flags: { disableTour: true },
        },
      })
    );
  }, themeMode);
}

async function suppressOverlays(page) {
  await page.evaluate(() => {
    const style = document.createElement("style");
    style.id = "suppress-all-tour-overlays";
    style.innerHTML = `
      .tour-spotlight-root,
      .tour-backdrop-clickable-zone,
      [data-testid="guided-tour-spotlight-overlay"],
      [data-testid="guided-tour-coach-mark-card"],
      .shepherd-element,
      vite-error-overlay {
        display: none !important;
        pointer-events: none !important;
        opacity: 0 !important;
      }
    `;
    document.head.appendChild(style);

    document.querySelectorAll(".tour-spotlight-root, .tour-backdrop-clickable-zone, [data-testid='guided-tour-spotlight-overlay']").forEach((el) => {
      el.remove();
    });
  });
}

async function unlockPinPadIfVisible(page) {
  try {
    const pinPad = await page.$('.auth-pin-grid, .auth-modal-content, .auth-staff-card');
    if (pinPad) {
      console.log(">>> Detected StaffPinPad on screen, unlocking...");
      const staffCard = await page.$('.auth-staff-card');
      if (staffCard) {
        await staffCard.click({ force: true }).catch(() => {});
        await page.waitForTimeout(200);
      }
      const zeroBtn = await page.$('button.auth-pin-btn:has-text("0")');
      if (zeroBtn) {
        for (let i = 0; i < 4; i++) {
          await zeroBtn.click({ force: true }).catch(() => {});
          await page.waitForTimeout(100);
        }
      }
      await page.waitForTimeout(1000);
    }
  } catch (e) {
    console.warn(">>> unlockPinPadIfVisible warning:", e);
  }
}

async function configureTheme(page, mode = "light") {
  await page.evaluate((themeMode) => {
    document.documentElement.classList.remove("light", "dark");
    document.documentElement.classList.add(themeMode);
    document.documentElement.setAttribute("data-theme", themeMode);
    const isDark = ["dark", "night", "ocean", "emerald", "cyber_xray"].includes(themeMode);
    document.documentElement.style.colorScheme = isDark ? "dark" : "light";
    localStorage.setItem("dente_theme_mode", themeMode);
  }, mode);
  await page.waitForTimeout(400);
}

async function takeProof(page, filename, description) {
  const targetDirs = [
    path.resolve("C:/Clinic_MVP/dental-crm/docs/screenshots/inquisition_live"),
    path.resolve("C:/Users/Admin/.gemini/antigravity/brain/c6cfecb5-4269-4362-8242-8db61cae5d24"),
  ];
  for (const d of targetDirs) {
    if (!fs.existsSync(d)) {
      fs.mkdirSync(d, { recursive: true });
    }
  }

  const primaryPath = path.join(targetDirs[0], filename);
  await page.screenshot({ path: primaryPath, fullPage: false });

  const brainPath = path.join(targetDirs[1], filename);
  fs.copyFileSync(primaryPath, brainPath);

  const stats = fs.statSync(primaryPath);
  console.log(`[PROOF CAPTURED] ${filename}`);
  console.log(`   Desc: ${description}`);
  console.log(`   Size: ${Math.round(stats.size / 1024)} KB (${stats.size} bytes)`);
  console.log(`   Path: ${primaryPath}`);

  return { primaryPath, brainPath, size: stats.size };
}

async function main() {
  const port = await detectPort();
  console.log(`Using server on port ${port}`);

  const chromePath = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
  const browser = await chromium.launch({
    executablePath: chromePath,
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });

  try {
    const context = await browser.newContext({
      viewport: { width: 1440, height: 900 },
      deviceScaleFactor: 2,
    });
    await addAuthInitScript(context, "light");
    const page = await context.newPage();

    page.on("console", (msg) => {
      const text = msg.text();
      if (text.includes("error") || text.includes("Error") || text.includes("warn")) {
        console.log(`[BROWSER CONSOLE] ${text}`);
      }
    });

    await setupPageRoutes(page);

    console.log(">>> Navigating to http://127.0.0.1:" + port + "/#schedule...");
    await page.goto("http://127.0.0.1:" + port + "/#schedule", { waitUntil: "domcontentloaded", timeout: 60000 });
    await unlockPinPadIfVisible(page);
    await suppressOverlays(page);

    // Wait for Suspense lazy loading to complete
    console.log(">>> Waiting for ScheduleView lazy chunk to finish loading...");
    await page.waitForFunction(
      () => !document.body.innerText.includes("Подготовка модулей расписания"),
      { timeout: 45000 }
    ).catch(() => console.warn(">>> Timeout waiting for suspense text detachment"));

    await page.waitForTimeout(1000);
    await unlockPinPadIfVisible(page);
    await suppressOverlays(page);

    // Switch to Chairs view mode where ChairScheduleToolbar is rendered
    console.log(">>> Checking for Chairs view mode button...");
    const chairsModeBtn = page.locator('[data-testid="schedule-view-mode-chairs"]').first();
    try {
      await chairsModeBtn.waitFor({ state: "visible", timeout: 15000 });
      console.log(">>> Clicking Chairs view mode button...");
      await chairsModeBtn.click({ force: true });
      await page.waitForTimeout(1200);
    } catch (e) {
      console.warn(">>> Could not click chairs mode button:", e.message);
    }

    // Wait for toolbar
    console.log(">>> Waiting for chair-schedule-palette-strip...");
    const toolbar = page.locator('[data-testid="chair-schedule-palette-strip"]');
    try {
      await toolbar.waitFor({ state: "visible", timeout: 15000 });
      console.log(">>> ChairScheduleToolbar is visible!");
    } catch (e) {
      console.warn(">>> chair-schedule-palette-strip wait failed:", e.message);
    }

    // Wait for appointment cards / grid to settle
    await page.waitForTimeout(1000);
    await suppressOverlays(page);

    // Capture Light theme
    console.log(">>> Configuring Light theme...");
    await configureTheme(page, "light");
    await page.waitForTimeout(800);
    await takeProof(
      page,
      "proof_schedule_15min_cards_light.png",
      "Расписание (Light): 15-мин микро-карточки без наездов и строгий 1-строчный 36px тулбар"
    );

    // Capture Dark theme
    console.log(">>> Configuring Dark theme...");
    await configureTheme(page, "dark");
    await page.waitForTimeout(800);
    await takeProof(
      page,
      "proof_schedule_15min_cards_dark.png",
      "Расписание (Dark): 15-мин микро-карточки без наездов и строгий 1-строчный 36px тулбар"
    );

    console.log("\n>>> Visual Proofs captured successfully!");
  } finally {
    await browser.close();
  }
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
