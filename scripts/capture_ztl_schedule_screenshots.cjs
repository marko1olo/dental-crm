/**
 * scripts/capture_ztl_schedule_screenshots.cjs
 * Автономный Red Team скрипт снятия скриншотов базовой ЗТЛ:
 * 1. Расписание с бейджами статуса ЗТЛ (В клинике, В ЗТЛ, Просрочен) (Desktop Light & Dark)
 * 2. Hover HUD визита с деталями наряда ЗТЛ и образцом расцветки VITA (Desktop Light & Dark)
 * 3. Реестр нарядов ЗТЛ (LabOrdersPage) с 32px таблицей и фильтрами этапов (Desktop Light & Dark)
 * 4. Шторка создания/редактирования наряда ЗТЛ со swatch образцом VITA и 17 изделиями (Desktop Light & Dark)
 */

const { chromium } = require("playwright");
const path = require("node:path");
const fs = require("node:fs");
const crypto = require("node:crypto");

const todayDate = new Date().toLocaleDateString("en-CA");

const mockDashboard = {
  clinicName: "Стоматология ДЕНТЕ Премиум",
  todayIso: todayDate,
  clinicSettings: {
    profile: {
      id: "c-1",
      organizationId: "00000000-0000-0000-0000-000000000001",
      clinicName: "Стоматология ДЕНТЕ Премиум",
      mode: "small_clinic",
      defaultVisitMinutes: 45,
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
        specialties: ["orthopedist", "therapist"],
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
        name: "Кресло 1 (Ортопедия)",
        roomNumber: "Кабинет 1",
        color: "#8b5cf6",
        active: true,
        sortOrder: 1,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      {
        id: "chair-2",
        organizationId: "00000000-0000-0000-0000-000000000001",
        name: "Кресло 2 (Терапия)",
        roomNumber: "Кабинет 2",
        color: "#0d9488",
        active: true,
        sortOrder: 2,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    ],
    rooms: [{ id: "room-1", name: "Кабинет 1" }],
    specialties: ["orthopedist", "therapist"],
    integrations: {},
    audit: [],
    updatedAt: new Date().toISOString(),
  },
  aiCoPilotSummary: {
    workloadMetrics: {
      occupancyPercent: 80,
      revenuePerChairHour: 4500,
      noshowRiskPatients: 0,
      bottleneckCategory: "none",
    },
    practiceScale: {
      mode: "small_clinic",
      title: "Оптимальный режим",
      fitScore: 100,
      blockers: [],
      upgrades: [],
      lowFrictionNextStep: "ready",
    },
    doctorLoads: [],
    assistantLoads: [],
    chairLoads: [],
    roleQueues: [],
    scheduleWarnings: [],
  },
  patients: [
    {
      id: "pat-1",
      organizationId: "00000000-0000-0000-0000-000000000001",
      fullName: "Ковалёв Роман Станиславович",
      status: "active",
      birthDate: "1988-04-12",
      phone: "+7 (999) 888-77-66",
      email: "kovalev@example.ru",
      notes: "Аллергия на пенициллин",
      allergies: ["Пенициллин"],
      createdAt: `${todayDate}T08:00:00.000Z`,
      updatedAt: `${todayDate}T08:00:00.000Z`,
    },
    {
      id: "pat-2",
      organizationId: "00000000-0000-0000-0000-000000000001",
      fullName: "Иванов Алексей Сергеевич",
      status: "active",
      birthDate: "1992-08-24",
      phone: "+7 (916) 123-45-67",
      email: "ivanov@example.ru",
      notes: "Здоров",
      createdAt: `${todayDate}T08:00:00.000Z`,
      updatedAt: `${todayDate}T08:00:00.000Z`,
    },
    {
      id: "pat-3",
      organizationId: "00000000-0000-0000-0000-000000000001",
      fullName: "Смирнова Елена Васильевна",
      status: "active",
      birthDate: "1995-11-15",
      phone: "+7 (925) 555-44-33",
      email: "smirnova@example.ru",
      notes: "Ортопедия",
      createdAt: `${todayDate}T08:00:00.000Z`,
      updatedAt: `${todayDate}T08:00:00.000Z`,
    },
  ],
  patientInsights: [],
  recommendedActions: [],
  appointments: [
    {
      id: "app-1",
      organizationId: "00000000-0000-0000-0000-000000000001",
      patientId: "pat-1",
      doctorUserId: "doc-1",
      doctorId: "doc-1",
      chairId: "chair-1",
      status: "in_treatment",
      state: "in_treatment",
      priority: "normal",
      intent: "treatment",
      startsAt: `${todayDate}T06:00:00.000Z`,
      endsAt: `${todayDate}T07:00:00.000Z`,
      startTime: `${todayDate}T06:00:00.000Z`,
      endTime: `${todayDate}T07:00:00.000Z`,
      durationMinutes: 60,
      serviceTitle: "Ортопедия: Фиксация коронки e.MAX",
      serviceCategories: ["orthopedics"],
      createdByUserId: "doc-1",
      createdAt: `${todayDate}T08:00:00.000Z`,
      updatedAt: `${todayDate}T08:00:00.000Z`,
      patientName: "Ковалёв Роман Станиславович",
      doctorName: "Д-р Воронов А.В.",
      tooth: "16",
      // Наряд ЗТЛ: Готов в клинике (зеленый)
      labOrder: {
        id: "ord-101",
        orderNumber: "ЗТЛ-101",
        patientId: "pat-1",
        status: "ready_in_clinic",
        stage: "ready_in_clinic",
        workType: "Коронка e.MAX",
        material: "IPS e.max Press",
        colorVita: "A2",
        toothFdi: "16",
        receivedDate: `${todayDate}T07:00:00.000Z`,
        dueDate: `${todayDate}T18:00:00.000Z`,
      },
    },
    {
      id: "app-2",
      organizationId: "00000000-0000-0000-0000-000000000001",
      patientId: "pat-2",
      doctorUserId: "doc-1",
      doctorId: "doc-1",
      chairId: "chair-1",
      status: "confirmed",
      state: "confirmed",
      priority: "normal",
      intent: "treatment",
      startsAt: `${todayDate}T07:30:00.000Z`,
      endsAt: `${todayDate}T08:30:00.000Z`,
      startTime: `${todayDate}T07:30:00.000Z`,
      endTime: `${todayDate}T08:30:00.000Z`,
      durationMinutes: 60,
      serviceTitle: "Ортопедия: Примерка каркаса ZrO2",
      serviceCategories: ["orthopedics"],
      createdByUserId: "doc-1",
      createdAt: `${todayDate}T08:00:00.000Z`,
      updatedAt: `${todayDate}T08:00:00.000Z`,
      patientName: "Иванов Алексей Сергеевич",
      doctorName: "Д-р Воронов А.В.",
      tooth: "21",
      // Наряд ЗТЛ: В производстве (желтый)
      labOrder: {
        id: "ord-102",
        orderNumber: "ЗТЛ-102",
        patientId: "pat-2",
        status: "in_progress",
        stage: "framework",
        workType: "Коронка ZrO2",
        material: "Katana Zirconia HTML",
        colorVita: "A3",
        toothFdi: "21",
        dueDate: "2026-10-25T18:00:00.000Z",
      },
    },
    {
      id: "app-3",
      organizationId: "00000000-0000-0000-0000-000000000001",
      patientId: "pat-3",
      doctorUserId: "doc-1",
      doctorId: "doc-1",
      chairId: "chair-1",
      status: "planned",
      state: "planned",
      priority: "normal",
      intent: "treatment",
      startsAt: `${todayDate}T09:00:00.000Z`,
      endsAt: `${todayDate}T10:00:00.000Z`,
      startTime: `${todayDate}T09:00:00.000Z`,
      endTime: `${todayDate}T10:00:00.000Z`,
      durationMinutes: 60,
      serviceTitle: "Съемное протезирование: Бюгель",
      serviceCategories: ["orthopedics"],
      createdByUserId: "doc-1",
      createdAt: `${todayDate}T08:00:00.000Z`,
      updatedAt: `${todayDate}T08:00:00.000Z`,
      patientName: "Смирнова Елена Васильевна",
      doctorName: "Д-р Воронов А.В.",
      tooth: "46",
      // Наряд ЗТЛ: Просрочен (красный)
      labOrder: {
        id: "ord-103",
        orderNumber: "ЗТЛ-103",
        patientId: "pat-3",
        status: "in_progress",
        stage: "casting",
        workType: "Бюгель металлический",
        colorVita: "B2",
        dueDate: "2026-09-28T18:00:00.000Z",
      },
    },
  ],
  appointmentReadiness: [],
  scheduleSuggestions: [],
  activeVisit: null,
  visitCloseChecklist: {
    visitId: "v-none",
    readyToSign: false,
    score: 0,
    nextAction: "none",
    blockingItems: 0,
    items: [],
  },
};

const mockLabOrders = [
  {
    id: "ord-101",
    orderNumber: "ЗТЛ-00101",
    patientId: "pat-1",
    patientName: "Ковалёв Роман Станиславович",
    doctorId: "doc-1",
    doctorName: "Д-р Воронов Алексей Владимирович",
    labName: "CAD/CAM Центр Дентал-Мастер",
    technicianName: "Ильин С.М.",
    teethFdi: [16],
    constructionType: "crown_emax",
    vitaShade: "A2",
    translucency: "MT",
    stumpShade: "ND2",
    sentDate: "2026-10-01",
    deadlineDate: todayDate,
    receivedDate: todayDate,
    status: "ready_in_clinic",
    stage: "ready_in_clinic",
    patientPriceKopecks: 2600000,
    ztlCostKopecks: 850000,
    doctorSharePercent: 20,
    clinicalNotes: "Высокая эстетика во фронте, микрорельеф эмали",
  },
  {
    id: "ord-102",
    orderNumber: "ЗТЛ-00102",
    patientId: "pat-2",
    patientName: "Иванов Алексей Сергеевич",
    doctorId: "doc-1",
    doctorName: "Д-р Воронов Алексей Владимирович",
    labName: "CAD/CAM Центр Дентал-Мастер",
    teethFdi: [21],
    constructionType: "crown_zirconia",
    vitaShade: "A3",
    translucency: "HT",
    stumpShade: "ND3",
    sentDate: "2026-10-02",
    deadlineDate: "2026-10-25",
    status: "in_progress",
    stage: "framework",
    patientPriceKopecks: 2400000,
    ztlCostKopecks: 750000,
    doctorSharePercent: 20,
  },
  {
    id: "ord-103",
    orderNumber: "ЗТЛ-00103",
    patientId: "pat-3",
    patientName: "Смирнова Елена Васильевна",
    doctorId: "doc-1",
    doctorName: "Д-р Воронов Алексей Владимирович",
    labName: "ЗТЛ Прецизион",
    teethFdi: [46],
    constructionType: "clasp_denture",
    vitaShade: "B2",
    sentDate: "2026-09-20",
    deadlineDate: "2026-09-28",
    status: "in_progress",
    stage: "casting",
    patientPriceKopecks: 4500000,
    ztlCostKopecks: 1600000,
    doctorSharePercent: 20,
  },
];

async function setupPageRoutes(page) {
  await page.route("**/api/dashboard**", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(mockDashboard),
    });
  });

  await page.route("**/api/clinical/lab-orders**", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(mockLabOrders),
    });
  });

  await page.route("**/api/auth/me**", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        authenticated: true,
        user: { id: "doc-1", fullName: "Д-р Воронов Алексей Владимирович", role: "owner" },
      }),
    });
  });

  await page.route("**/api/auth/user/me**", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        authenticated: true,
        user: { id: "doc-1", fullName: "Д-р Воронов Алексей Владимирович", role: "owner" },
      }),
    });
  });

  await page.route("**/api/auth/staff/unlock**", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        success: true,
        staffToken: "demo-showcase-staff-token-chief",
        user: { id: "doc-1", fullName: "Д-р Воронов Алексей Владимирович", role: "owner" },
      }),
    });
  });

  await page.route("**/api/auth/verify-clinic**", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        success: true,
        clinicId: "c-1",
        clinicName: "Стоматология ДЕНТЕ Премиум",
      }),
    });
  });

  await page.route("**/api/appointments**", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(mockDashboard.appointments),
    });
  });
}

async function addAuthInitScript(context) {
  await context.addInitScript(() => {
    localStorage.setItem("dente_clinic_token", "demo-clinic-token");
    localStorage.setItem("dente_staff_token", "demo-showcase-staff-token-chief");
    localStorage.setItem("dente_active_role", "owner");
    localStorage.setItem("dente_theme_mode", "light");
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
  });
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
      .shepherd-element {
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

async function configureTheme(page, mode = "light") {
  await page.evaluate((themeMode) => {
    document.documentElement.classList.remove("light", "dark");
    document.documentElement.classList.add(themeMode);
    document.documentElement.setAttribute("data-theme", themeMode);
    localStorage.setItem("dente_theme_mode", themeMode);
  }, mode);
  await page.waitForTimeout(400);
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

async function takeProof(page, filename, description) {
  const targetDirs = [
    path.resolve("C:/Clinic_MVP/dental-crm/docs/screenshots/inquisition_live"),
    path.resolve("C:/Users/Admin/.gemini/antigravity/brain/4b1b104d-9e71-4475-b451-4a85a3688556"),
  ];
  for (const d of targetDirs) {
    if (!fs.existsSync(d)) {
      fs.mkdirSync(d, { recursive: true });
    }
  }

  const primaryPath = path.join(targetDirs[0], filename);
  await page.screenshot({ path: primaryPath, fullPage: false });

  // Скопировать в brain
  const brainPath = path.join(targetDirs[1], filename);
  fs.copyFileSync(primaryPath, brainPath);

  const stats = fs.statSync(primaryPath);
  const hash = crypto.createHash("md5").update(fs.readFileSync(primaryPath)).digest("hex");

  console.log(`[PROOF CAPTURED] ${filename}`);
  console.log(`   Desc: ${description}`);
  console.log(`   Size: ${Math.round(stats.size / 1024)} KB (${stats.size} bytes)`);
  console.log(`   MD5:  ${hash}`);
  console.log(`   Path: ${primaryPath}`);

  return { primaryPath, brainPath, size: stats.size, hash };
}

async function main() {
  console.log("\n=======================================================");
  console.log("RED TEAM ADVERSARIAL ZTL SCREENSHOT INQUISITION PIPELINE");
  console.log("=======================================================\n");

  const browser = await chromium.launch({
    headless: true,
    executablePath: "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });

  try {
    const context = await browser.newContext({
      viewport: { width: 1440, height: 900 },
      deviceScaleFactor: 2,
    });
    await addAuthInitScript(context);
    const page = await context.newPage();
    page.on("console", (msg) => {
      const text = msg.text();
      if (text.includes("error") || text.includes("Error") || text.includes("fail") || text.includes("warn")) {
        console.log(`[BROWSER CONSOLE] ${text}`);
      }
    });
    page.on("pageerror", (err) => console.error(`[BROWSER ERROR] ${err.message}`));
    await setupPageRoutes(page);

    // ─── 1. СЕТКА РАСПИСАНИЯ С БЕЙДЖАМИ СТАТУСА ЗТЛ ───
    console.log(">>> Step 1: Navigating to Schedule Grid (http://127.0.0.1:5173/#schedule)...");
    await page.goto("http://127.0.0.1:5173/#schedule", { waitUntil: "domcontentloaded", timeout: 60000 });
    await unlockPinPadIfVisible(page);
    await suppressOverlays(page);
    console.log(">>> Waiting for schedule grid to load appointment cards...");
    await page.waitForSelector('[data-testid*="clickable-app-1"], [data-appointment-id="app-1"]', { timeout: 30000 }).catch((e) => {
      console.warn(">>> Wait for clickable-app-1 timed out:", e.message);
    });
    await page.waitForTimeout(1000);
    await suppressOverlays(page);

    console.log(">>> Capturing Schedule Grid with ZTL Badges (Light & Dark)...");
    await configureTheme(page, "light");
    await page.waitForTimeout(500);
    await takeProof(
      page,
      "ztl_01_schedule_badges_desktop_light.png",
      "Расписание: карточки визитов со статусами ЗТЛ («В клинике», «В ЗТЛ», «Просрочен») (Light)"
    );

    await configureTheme(page, "dark");
    await takeProof(
      page,
      "ztl_02_schedule_badges_desktop_dark.png",
      "Расписание: карточки визитов со статусами ЗТЛ («В клинике», «В ЗТЛ», «Просрочен») (Dark)"
    );

    // ─── 2. HOVER HUD ВИЗИТА С ДЕТАЛЯМИ НАРЯДА ЗТЛ ───
    console.log(">>> Step 2: Hovering over appointment card with ZTL order...");
    await unlockPinPadIfVisible(page);
    await suppressOverlays(page);
    await configureTheme(page, "dark");
    await page.waitForTimeout(400);

    const cardSelector = '[data-testid="appointment-card-clickable-app-1"], [data-testid*="clickable-app-1"], [data-appointment-id="app-1"]';
    let apptCard = await page.waitForSelector(cardSelector, { timeout: 15000 }).catch(() => null);
    if (apptCard) {
      console.log(">>> Found appointment card app-1, hovering for HUD...");
      await apptCard.hover({ force: true });
      await page.waitForSelector('[data-testid="schedule-grid-patient-hover-preview"], [data-testid*="hover-hud-lab-status"]', { timeout: 5000 }).catch(() => null);
      await page.waitForTimeout(800);

      await takeProof(
        page,
        "ztl_03_schedule_hover_hud_ztl_dark.png",
        "Hover HUD визита: блок наряда ЗТЛ со статусом «В клинике», зубом 16, VITA A2 swatch и переходом в ЗТЛ (Dark)"
      );

      await configureTheme(page, "light");
      await page.waitForTimeout(400);
      apptCard = await page.waitForSelector(cardSelector, { timeout: 10000 }).catch(() => null);
      if (apptCard) {
        await apptCard.hover({ force: true });
        await page.waitForSelector('[data-testid="schedule-grid-patient-hover-preview"], [data-testid*="hover-hud-lab-status"]', { timeout: 5000 }).catch(() => null);
        await page.waitForTimeout(800);
      }
      await takeProof(
        page,
        "ztl_04_schedule_hover_hud_ztl_light.png",
        "Hover HUD визита: блок наряда ЗТЛ со статусом «В клинике», зубом 16, VITA A2 swatch и переходом в ЗТЛ (Light)"
      );
    } else {
      console.warn("⚠️ app-1 appointment card not found for hover HUD test");
    }

    // ─── 3. РЕЕСТР НАРИДОВ ЗТЛ (LabOrdersPage) ───
    console.log(">>> Step 3: Navigating to Lab Orders Preview Registry (http://127.0.0.1:5173/lab_orders_preview.html)...");
    await page.goto("http://127.0.0.1:5173/lab_orders_preview.html", { waitUntil: "networkidle", timeout: 60000 }).catch(async () => {
      await page.goto("http://127.0.0.1:5173/lab_orders_preview.html", { waitUntil: "domcontentloaded", timeout: 60000 });
    });
    await page.waitForSelector('[data-testid="tab-lab-registry"], [data-testid="lab-orders-open-tracker-btn"]', { timeout: 15000 }).catch((e) => {
      console.warn(">>> Step 3: Wait for tab-lab-registry timed out:", e.message);
    });
    await page.waitForTimeout(1500);
    await suppressOverlays(page);

    console.log(">>> Capturing Lab Orders Registry (Light & Dark)...");
    await configureTheme(page, "light");
    await takeProof(
      page,
      "ztl_05_lab_orders_registry_desktop_light.png",
      "Реестр ЗТЛ (LabOrdersPage): 32px таблица нарядов, фильтры 5 этапов, трекер дедлайнов (Light)"
    );

    await configureTheme(page, "dark");
    await takeProof(
      page,
      "ztl_06_lab_orders_registry_desktop_dark.png",
      "Реестр ЗТЛ (LabOrdersPage): 32px таблица нарядов, фильтры 5 этапов, трекер дедлайнов (Dark)"
    );

    // ─── 4. ШТОРКА НАРИДА ЗТЛ (DentalLabOrderDrawer) ───
    console.log(">>> Step 4: Opening Dental Lab Tracker & Drawer...");
    const trackerBtn = await page.$('[data-testid="lab-orders-open-tracker-btn"]');
    if (trackerBtn) {
      await suppressOverlays(page);
      await trackerBtn.click({ force: true });
      await page.waitForTimeout(800);

      const drawerBtn = await page.$('[data-testid="lab-tracker-new-order-btn"]');
      if (drawerBtn) {
        await drawerBtn.click({ force: true });
        await page.waitForTimeout(600);
      }

      // Скриншот шторки ЗТЛ: Dark
      await configureTheme(page, "dark");
      await takeProof(
        page,
        "ztl_07_drawer_vita_swatch_desktop_dark.png",
        "Шторка наряда ЗТЛ (DentalLabOrderDrawer): выбор из 17 конструкций DentTechnician + круглый swatch образец цвета VITA (Dark)"
      );

      // Скриншот шторки ЗТЛ: Light
      await configureTheme(page, "light");
      await takeProof(
        page,
        "ztl_08_drawer_vita_swatch_desktop_light.png",
        "Шторка наряда ЗТЛ (DentalLabOrderDrawer): выбор из 17 конструкций DentTechnician + круглый swatch образец цвета VITA (Light)"
      );
    } else {
      console.warn("⚠️ lab-orders-open-tracker-btn not found on lab_orders_preview.html");
    }

    console.log("\n=======================================================");
    console.log("ALL ZTL PROOF SCREENSHOTS CAPTURED SUCCESSFULLY!");
    console.log("=======================================================\n");
  } finally {
    await browser.close();
  }
}

main().catch((err) => {
  console.error("Screenshot capture failed:", err);
  process.exit(1);
});
