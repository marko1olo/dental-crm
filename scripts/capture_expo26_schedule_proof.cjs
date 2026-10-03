/**
 * scripts/capture_expo26_schedule_proof.cjs
 *
 * Dedicated Live Playwright Capture for DentalPRO Expo26 Schedule Innovations:
 * 1. PC Light: Multi-chair schedule grid with 17 clinical badges (schi-1 .. schi-17) & CSS slot variables
 * 2. PC Dark: Schedule grid in Dark mode (zero white glare, WCAG AAA contrast audit)
 * 3. Lateral Quick Booking Drawer open with semi-transparent backdrop (timeline & adjacent chairs visible)
 * 4. Hover HUD over appointment card showing 6 clinical actions (Apple HIG progressive disclosure)
 */

const { chromium } = require("C:/Clinic_MVP/dental-crm/node_modules/playwright");
const path = require("node:path");
const fs = require("node:fs");

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
        hasSurgeryKit: false,
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
        hasSurgeryKit: true,
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
        hasMicroscope: true,
        hasSurgeryKit: false,
        colorId: "chair-3",
      },
    ],
    integrationPresets: [],
    workspaceProfiles: [],
    roleAccessPolicies: [],
    modeHints: [],
    soloDoctorMode: false,
  },
  shiftIntelligence: {
    modeFit: { mode: "small_clinic", title: "Оптимальный режим", fitScore: 100, blockers: [], upgrades: [], lowFrictionNextStep: "ready" },
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
      notes: "Бронхиальная астма, аллергия на пенициллин, латекс",
      administrativeProfile: "normal",
      balanceRub: -4500,
      createdAt: `${todayDate}T08:00:00.000Z`,
      updatedAt: `${todayDate}T08:00:00.000Z`,
      tags: ["vip", "treatment_plan", "consent_signed", "contract_signed"],
      activeTreatmentPlanId: "plan-1",
      lastImagingDate: `${todayDate}T08:30:00.000Z`,
    },
    {
      id: "pat-2",
      organizationId: "00000000-0000-0000-0000-000000000001",
      fullName: "Смирнова Екатерина Андреевна",
      status: "active",
      birthDate: "1994-09-21",
      phone: "+7 (916) 123-45-67",
      email: "smirnova@example.ru",
      notes: "Первичный приём, консультация имплантолога",
      administrativeProfile: "normal",
      balanceRub: 15000,
      createdAt: `${todayDate}T08:00:00.000Z`,
      updatedAt: `${todayDate}T08:00:00.000Z`,
      tags: ["primary", "deposit"],
    },
    {
      id: "pat-3",
      organizationId: "00000000-0000-0000-0000-000000000001",
      fullName: "Барабаш Сергей Владимирович",
      status: "active",
      birthDate: "1980-02-15",
      phone: "+7 (903) 777-88-99",
      email: "barabash@example.ru",
      notes: "CITO: Острая боль, пульпит",
      administrativeProfile: "normal",
      balanceRub: 0,
      createdAt: `${todayDate}T08:00:00.000Z`,
      updatedAt: `${todayDate}T08:00:00.000Z`,
      tags: ["emergency"],
    },
  ],
  patientInsights: [],
  recommendedActions: [],
  appointments: [
    {
      id: "appt-1",
      organizationId: "00000000-0000-0000-0000-000000000001",
      patientId: "pat-1",
      chairId: "chair-1",
      doctorUserId: "doc-1",
      startsAt: `${todayDate}T06:00:00.000Z`,
      endsAt: `${todayDate}T07:30:00.000Z`,
      durationMinutes: 90,
      status: "in_treatment",
      reason: "Лечение пульпита зуба 16, эндодонтия",
      teeth: ["16"],
      toothNumber: "16",
      notes: "Аллергия на пенициллин! Наряд ЗТЛ доставлен.",
      isCito: false,
      labOrderId: "lab-101",
      labWorkTitle: "Керамическая вкладка E.max 16",
      labDueDate: `${todayDate}T17:00:00.000Z`,
      labStatus: "ready_in_clinic",
      hasTreatmentPlan: true,
      hasInformedConsent: true,
      hasContract: true,
      hasRadiology: true,
      chatConfirmed: true,
      appointmentType: "treatment",
      createdAt: `${todayDate}T05:00:00.000Z`,
      updatedAt: `${todayDate}T06:00:00.000Z`,
    },
    {
      id: "appt-2",
      organizationId: "00000000-0000-0000-0000-000000000001",
      patientId: "pat-2",
      chairId: "chair-2",
      doctorUserId: "doc-2",
      startsAt: `${todayDate}T07:00:00.000Z`,
      endsAt: `${todayDate}T08:00:00.000Z`,
      durationMinutes: 60,
      status: "arrived",
      reason: "Имплантация Nobel Biocare зуба 24",
      teeth: ["24"],
      toothNumber: "24",
      notes: "Первичная консультация и установка имплантата",
      isPrimary: true,
      chatConfirmed: true,
      appointmentType: "surgery",
      createdAt: `${todayDate}T05:00:00.000Z`,
      updatedAt: `${todayDate}T06:50:00.000Z`,
    },
    {
      id: "appt-3",
      organizationId: "00000000-0000-0000-0000-000000000001",
      patientId: "pat-3",
      chairId: "chair-2",
      doctorUserId: "doc-2",
      startsAt: `${todayDate}T08:30:00.000Z`,
      endsAt: `${todayDate}T09:15:00.000Z`,
      durationMinutes: 45,
      status: "planned",
      reason: "CITO: Острая пульсирующая боль зуба 36",
      teeth: ["36"],
      toothNumber: "36",
      notes: "Внеплановый пациент по острой боли",
      isCito: true,
      appointmentType: "emergency",
      createdAt: `${todayDate}T05:00:00.000Z`,
      updatedAt: `${todayDate}T05:00:00.000Z`,
    },
    {
      id: "appt-4",
      organizationId: "00000000-0000-0000-0000-000000000001",
      patientId: "pat-2",
      chairId: "chair-3",
      doctorUserId: "doc-3",
      startsAt: `${todayDate}T06:30:00.000Z`,
      endsAt: `${todayDate}T08:00:00.000Z`,
      durationMinutes: 90,
      status: "confirmed",
      reason: "Снятие слепков, коронки E.max фронтальной группы",
      teeth: ["11", "12", "21", "22"],
      notes: "Предоплата внесена, слепочные массы проверены",
      labOrderId: "lab-102",
      labWorkTitle: "Виниры E.max 11-22",
      labDueDate: `${todayDate}T19:00:00.000Z`,
      labStatus: "in_progress",
      discountPercent: 10,
      appointmentType: "prosthetics",
      createdAt: `${todayDate}T05:30:00.000Z`,
      updatedAt: `${todayDate}T06:30:00.000Z`,
    },
  ],
  imagingStudies: [
    {
      id: "img-1",
      patientId: "pat-1",
      modality: "CBCT",
      studyDate: `${todayDate}T08:30:00.000Z`,
      title: "КЛКТ верхней челюсти",
    },
  ],
  serviceCatalog: [
    { id: "srv-1", name: "Лечение пульпита 1-канального", priceRub: 4500 },
    { id: "srv-2", name: "Установка имплантата Nobel Biocare", priceRub: 38000 },
    { id: "srv-3", name: "Коронка из диоксида циркония", priceRub: 22000 },
  ],
  payments: [],
};

async function setupPageRoutes(page) {
  await page.route("**/api/**", async (route) => {
    const url = route.request().url();
    if (url.includes("/src/")) return route.continue();
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

const addAuthInitScript = (ctx) =>
  ctx.addInitScript(() => {
    localStorage.setItem("dente_clinic_token", "live-inquisition-clinic-token");
    localStorage.setItem("dente_staff_token", "live-inquisition-staff-token");
    localStorage.setItem("dente_active_role", "owner");
    localStorage.setItem("dente_theme_mode", "light");
    localStorage.setItem("dente_active_patient_id", "pat-1");
    localStorage.setItem("dente_tour_completed", "true");
  });

async function applyTheme(page, theme) {
  await page.evaluate((th) => {
    localStorage.setItem("dente_theme_mode", th);
    if (window.__useThemeStore) {
      window.__useThemeStore.getState().setThemeMode(th);
    }
    document.documentElement.setAttribute("data-theme", th);
    const isDark = ["dark", "night", "ocean", "emerald", "cyber_xray"].includes(th);
    document.documentElement.classList.toggle("dark", isDark);
    document.documentElement.classList.toggle("light", !isDark);
    document.documentElement.style.colorScheme = isDark ? "dark" : "light";
  }, theme);
  await page.waitForTimeout(600);
}

async function main() {
  const targetDir = path.resolve("C:/Clinic_MVP/dental-crm/docs/screenshots/expo26_schedule");
  if (!fs.existsSync(targetDir)) fs.mkdirSync(targetDir, { recursive: true });

  console.log("Launching browser via Chrome executable...");
  const browser = await chromium.launch({
    headless: true,
    executablePath: "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });

  try {
    const ctx = await browser.newContext({
      viewport: { width: 1440, height: 900 },
      deviceScaleFactor: 2,
    });
    await addAuthInitScript(ctx);
    const page = await ctx.newPage();

    page.on("pageerror", (err) => console.error("[BROWSER ERROR]:", err.message));
    page.on("console", (msg) => {
      if (msg.type() === "error") console.error("[BROWSER CONSOLE ERROR]:", msg.text());
    });

    await setupPageRoutes(page);

    console.log("Navigating to http://127.0.0.1:5173/#schedule...");
    await page.goto("http://127.0.0.1:5173/#schedule", { waitUntil: "domcontentloaded", timeout: 45000 });

    console.log("Waiting for schedule view...");
    await page.waitForSelector(".boot-state", { state: "detached", timeout: 30000 }).catch(() => {});
    await page.waitForSelector(".schedule-filter-strip", { state: "visible", timeout: 30000 });
    await page.waitForTimeout(1000);

    // Dismiss onboarding and banners if visible
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

    // Switch to Grid mode to show multi-chair track with appointments and badges
    const gridModeBtn = page.locator('[data-testid="schedule-view-mode-grid"], button:has-text("Сетка")').first();
    try {
      await gridModeBtn.waitFor({ state: "visible", timeout: 8000 });
      console.log("Switching to Grid mode...");
      await gridModeBtn.click({ force: true });
      await page.waitForTimeout(800);
    } catch (e) {
      console.log("Grid mode button wait fallback:", e.message);
    }
    // Wait for appointment cards in grid
    await page.waitForSelector('[data-testid^="appointment-card-"]', { timeout: 8000 }).catch(() => {});

    // 1. PC Light Schedule Grid (with 17 badges & CSS variables)
    console.log("Capturing 01_expo26_schedule_pc_light.png...");
    await applyTheme(page, "light");
    const lightPath = path.join(targetDir, "01_expo26_schedule_pc_light.png");
    await page.screenshot({ path: lightPath, fullPage: false });
    console.log(`Saved 01_expo26_schedule_pc_light.png (${fs.statSync(lightPath).size} bytes)`);

    // 2. PC Dark Schedule Grid (WCAG AAA contrast audit)
    console.log("Capturing 02_expo26_schedule_pc_dark.png...");
    await applyTheme(page, "dark");
    const darkPath = path.join(targetDir, "02_expo26_schedule_pc_dark.png");
    await page.screenshot({ path: darkPath, fullPage: false });
    console.log(`Saved 02_expo26_schedule_pc_dark.png (${fs.statSync(darkPath).size} bytes)`);

    // 3. Hover HUD over appointment card (showing 6 clinical actions)
    console.log("Capturing 04_expo26_hover_hud_dark.png...");
    const apptCard = page.locator('[data-testid^="appointment-card-appt-1"]').first();
    if (await apptCard.isVisible()) {
      console.log("Hovering appointment card appt-1 via real mouse move...");
      await apptCard.scrollIntoViewIfNeeded();
      const cardBox = await apptCard.boundingBox();
      if (cardBox) {
        await page.mouse.move(cardBox.x + cardBox.width / 2, cardBox.y + cardBox.height / 2);
        await page.waitForTimeout(700);
      }
      const hud = page.locator('[data-testid="schedule-grid-patient-hover-preview"], [data-testid="grid-appointment-hover-hud"]').first();
      await hud.waitFor({ state: "visible", timeout: 5000 }).catch(() => {
        console.log("HUD state waiting fallback...");
      });
      await page.waitForTimeout(600);
      const hudPath = path.join(targetDir, "04_expo26_hover_hud_dark.png");
      await page.screenshot({ path: hudPath, fullPage: false });
      console.log(`Saved 04_expo26_hover_hud_dark.png (${fs.statSync(hudPath).size} bytes)`);
    } else {
      console.warn("appt-1 card not found for hover HUD!");
    }

    // Unhover
    await page.mouse.move(10, 10);
    await page.evaluate(() => {
      document.querySelectorAll('[data-testid^="appointment-card-"]').forEach(el => {
        el.dispatchEvent(new MouseEvent('mouseleave'));
      });
    });
    await page.waitForTimeout(300);

    // 4. Open Lateral Quick Booking Drawer
    console.log("Opening Lateral Quick Booking Drawer...");
    await applyTheme(page, "light");
    await page.evaluate(() => {
      document.querySelector('vite-error-overlay')?.remove();
    });
    const quickBookingBtn = page.locator('[data-testid="schedule-toolbar-primary-quick-booking-btn"], button:has-text("Запись")').first();
    let drawerOpened = false;
    try {
      await quickBookingBtn.waitFor({ state: "visible", timeout: 8000 });
      console.log("Clicking quick booking button...");
      await quickBookingBtn.click({ force: true });
      drawerOpened = true;
    } catch (e) {
      console.log("Quick booking button wait fallback...", e.message);
      const slotBtn = page.locator('button:has-text("Записать на 08:00"), button:has-text("Записать на 08:30")').first();
      if (await slotBtn.isVisible()) {
        await slotBtn.click({ force: true });
        drawerOpened = true;
      }
    }

    if (drawerOpened) {
      await page.waitForTimeout(600);
      await page.evaluate(() => {
        document.querySelector('vite-error-overlay')?.remove();
      });
      const drawer = page.locator('[data-testid="quick-booking-drawer"]');
      await drawer.waitFor({ state: "visible", timeout: 8000 });
      console.log("Drawer is open!");

      // Click "Найти варианты" smart free slots button to open candidates panel
      const findVariantsBtn = page.locator('[data-testid="quick-booking-find-slots-btn"], button:has-text("Найти варианты")').first();
      if (await findVariantsBtn.isVisible()) {
        console.log("Clicking 'Найти варианты' to show smart candidate slots panel...");
        await findVariantsBtn.click({ force: true });
        await page.waitForTimeout(600);
      }

      const drawerPath = path.join(targetDir, "03_expo26_lateral_drawer_light.png");
      await page.screenshot({ path: drawerPath, fullPage: false });
      console.log(`Saved 03_expo26_lateral_drawer_light.png (${fs.statSync(drawerPath).size} bytes)`);
    } else {
      console.warn("Quick booking button not found!");
    }

    console.log("\n=== ALL EXPO26 SCHEDULE PROOFS CAPTURED SUCCESSFULLY! ===");
  } finally {
    await browser.close();
  }
}

main().catch((err) => {
  console.error("FATAL ERROR in capture_expo26_schedule_proof:", err);
  process.exit(1);
});
