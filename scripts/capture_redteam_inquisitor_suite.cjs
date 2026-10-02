/**
 * scripts/capture_redteam_inquisitor_suite.cjs
 *
 * Dedicated Adversarial Red Team Inquisitor Screenshot Engine.
 * Captures 6 mandatory screens in 4 states (Desktop Light/Dark 1440x900, Mobile Light/Dark 390x844):
 *   1) Дневник приёма / ЭМК 043/у (VisitView.tsx, subtab 'emk')
 *   2) Зубная формула (ToothChart.tsx, ClassicGostOdontogram.tsx, subtab 'odontogram')
 *   3) Расписание приёма (ScheduleView.tsx)
 *   4) Модалка снимков / КТ DICOM (DicomViewerModal.tsx, CtStudyViewer.tsx)
 *   5) Касса и чек 54-ФЗ (PaymentModal.tsx / FastCheckout)
 *   6) Настройки клиники и оборудования (SettingsView.tsx, HardwareSettingsTab.tsx)
 */

const { chromium } = require("playwright");
const path = require("node:path");
const fs = require("node:fs");

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
        specialties: ["therapist", "orthopedist", "surgeon"],
        active: true,
        color: "#0d9488",
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
      },
      {
        id: "chair-2",
        organizationId: "00000000-0000-0000-0000-000000000001",
        name: "Кабинет 2 (Хирургия)",
        room: "2",
        defaultDoctorId: "doc-1",
        active: true,
        hasXraySensor: true,
        hasMicroscope: false,
        hasSurgeryKit: true,
      },
    ],
    integrationPresets: [],
    workspaceProfiles: [],
    roleAccessPolicies: [],
    modeHints: [],
    soloDoctorMode: false,
  },
  shiftIntelligence: {
    modeFit: {
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
      notes: "Бронхиальная астма, аллергия на латекс",
      administrativeProfile: "normal",
      balanceRub: 0,
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
      administrativeProfile: "normal",
      balanceRub: 12000,
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
      notes: "Чувствительность эмали",
      administrativeProfile: "normal",
      balanceRub: -2500,
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
      patientId: "pat-2",
      doctorUserId: "doc-1",
      doctorId: "doc-1",
      chairId: "chair-1",
      status: "completed",
      state: "completed",
      priority: "normal",
      intent: "treatment",
      startsAt: `${todayDate}T08:30:00.000Z`,
      endsAt: `${todayDate}T09:30:00.000Z`,
      startTime: `${todayDate}T08:30:00.000Z`,
      endTime: `${todayDate}T09:30:00.000Z`,
      durationMinutes: 60,
      serviceTitle: "Терапия: Лечение кариеса 16 зуба",
      serviceCategories: ["therapy"],
      createdByUserId: "doc-1",
      createdAt: `${todayDate}T08:00:00.000Z`,
      updatedAt: `${todayDate}T08:00:00.000Z`,
      patientName: "Иванов Алексей Сергеевич",
      doctorName: "Д-р Воронов А.В.",
    },
    {
      id: "app-2",
      organizationId: "00000000-0000-0000-0000-000000000001",
      patientId: "pat-1",
      doctorUserId: "doc-1",
      doctorId: "doc-1",
      chairId: "chair-1",
      status: "in_treatment",
      state: "in_treatment",
      priority: "urgent",
      intent: "treatment",
      startsAt: `${todayDate}T10:00:00.000Z`,
      endsAt: `${todayDate}T11:30:00.000Z`,
      startTime: `${todayDate}T10:00:00.000Z`,
      endTime: `${todayDate}T11:30:00.000Z`,
      durationMinutes: 90,
      serviceTitle: "Эндодонтия 46 зуба (3 канала) под микроскопом",
      serviceCategories: ["therapy", "endodontics"],
      createdByUserId: "doc-1",
      createdAt: `${todayDate}T08:00:00.000Z`,
      updatedAt: `${todayDate}T08:00:00.000Z`,
      patientName: "Ковалёв Роман Станиславович",
      doctorName: "Д-р Воронов А.В.",
    },
    {
      id: "app-3",
      organizationId: "00000000-0000-0000-0000-000000000001",
      patientId: "pat-3",
      doctorUserId: "doc-1",
      doctorId: "doc-1",
      chairId: "chair-1",
      status: "confirmed",
      state: "confirmed",
      priority: "normal",
      intent: "consultation",
      startsAt: `${todayDate}T13:00:00.000Z`,
      endsAt: `${todayDate}T14:00:00.000Z`,
      startTime: `${todayDate}T13:00:00.000Z`,
      endTime: `${todayDate}T14:00:00.000Z`,
      durationMinutes: 60,
      serviceTitle: "Первичная консультация + профгигиена Air-Flow",
      serviceCategories: ["hygiene", "therapy"],
      createdByUserId: "doc-1",
      createdAt: `${todayDate}T08:00:00.000Z`,
      updatedAt: `${todayDate}T08:00:00.000Z`,
      patientName: "Смирнова Елена Васильевна",
      doctorName: "Д-р Воронов А.В.",
    },
  ],
  appointmentReadiness: [],
  scheduleSuggestions: [],
  activeVisit: {
    id: "visit-kovalev-1",
    organizationId: "00000000-0000-0000-0000-000000000001",
    patientId: "pat-1",
    doctorId: "doc-1",
    appointmentId: "app-2",
    status: "in_progress",
    complaint: "Ноющие боли в области 46 зуба при приёме горячей пищи.",
    anamnesis: "Зуб ранее лечен по поводу кариеса 2 года назад. Аллергия на латекс.",
    objectiveStatus: "Зуб 46 под пломбой с нарушением краевого прилегания. Перкуссия слабо положительна. Слизистая оболочка б/о.",
    diagnosis: "K04.0 Пульпит (Хронический фиброзный пульпит 46)",
    treatmentPlan: "Механическая и медикаментозная обработка 3 корневых каналов, временная обтурация гидроксидом кальция.",
    createdAt: `${todayDate}T10:00:00.000Z`,
    updatedAt: `${todayDate}T10:15:00.000Z`,
  },
  visitCloseChecklist: {
    visitId: "visit-kovalev-1",
    readyToSign: false,
    score: 80,
    nextAction: "none",
    blockingItems: 0,
    items: [],
  },
  activeVisit: {
    id: "visit-1",
    patientId: "pat-1",
    appointmentId: "app-2",
    doctorId: "doc-1",
    chairId: "chair-1",
    status: "in_treatment",
    startedAt: `${todayDate}T10:00:00.000Z`,
    complaints: "Острая боль при накусывании на 46 зуб",
    anamnesis: "Ранее лечен по поводу глубокого кариеса",
    objectiveStatus: "Зуб 46 под временной повязкой, перкуссия резко болезненна",
    diagnosis: "K04.0 Острый пульпит",
    treatmentDone: "Проведена инструментальная и медикаментозная обработка 3 корневых каналов",
    recommendations: "Нестероидные противовоспалительные препараты при боли",
    createdAt: `${todayDate}T10:00:00.000Z`,
    updatedAt: `${todayDate}T10:00:00.000Z`,
  },
  documents: [],
  imagingStudies: [
    {
      id: "study-1",
      title: "КЛКТ обеих челюстей 0.2мм (Planmeca Romexis)",
      patientId: "pat-1",
      patientName: "Ковалёв Роман Станиславович",
      modality: "CBCT",
      manufacturer: "Planmeca",
      sliceCount: 420,
      dimensions: "512x512",
      voxelSpacing: "0.2x0.2x0.2 мм",
      capturedAt: `${todayDate}T09:45:00.000Z`,
      storagePath: "/radiology/samples/cbct_kovalev.zip",
      bindingStatus: "auto_bound",
      bindingConfidence: 100,
    },
  ],
  protocolTemplates: [],
  serviceCatalog: [
    { id: "srv-1", code: "A16.07.002", name: "Восстановление зуба пломбой (светоотверждаемый композит)", priceRub: 4500 },
    { id: "srv-2", code: "A16.07.030", name: "Инструментальная и медикаментозная обработка корневого канала", priceRub: 2200 },
    { id: "srv-3", code: "A16.07.008", name: "Пломбирование корневого канала гуттаперчей методом латеральной конденсации", priceRub: 2800 },
  ],
  treatmentPlanItems: [],
  treatmentPlanScenarios: [],
  clinicalRules: [],
  clinicalRuleEvaluations: [],
  clinicalRuleSummary: {
    activeRules: 0,
    evaluatedRules: 0,
    unresolved: 0,
    blockers: 0,
    warnings: 0,
    requiredServices: 0,
    coveredRules: 0,
  },
  payments: [
    {
      id: "pay-1",
      patientId: "pat-1",
      amountRub: 9500,
      method: "card",
      fiscalReceiptNumber: "ФЧ-000892",
      fiscalReceiptIssuedAt: new Date().toISOString(),
      note: "Оплата за эндодонтическое лечение 46 зуба",
    },
  ],
  billingSummary: {
    totalPlannedRub: 9500,
    totalDiscountRub: 0,
    totalPaidRub: 9500,
    totalDueRub: 0,
    taxDeductionEligibleRub: 9500,
    draftDocumentAmountRub: 0,
    openTreatmentItems: 1,
    unpaidDocuments: 0,
  },
  communicationTemplates: [],
  communicationTasks: [],
  communicationEvents: [],
  communicationSummary: {
    openTasks: 0,
    urgentTasks: 0,
    dueToday: 0,
    overdue: 0,
    completedToday: 0,
    appointmentConfirmations: 0,
    paymentReminders: 0,
    postVisitInstructions: 0,
  },
  importBatches: [],
  speechProviders: [],
  auditEvents: [],
  complianceWarnings: [],
};

async function setupPageRoutes(page) {
  await page.route("**/api/**", async (route) => {
    const url = route.request().url();
    if (url.includes("/src/")) return route.continue();

    if (url.includes("/api/dashboard")) {
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(mockDashboard),
      });
    }
    if (url.includes("/api/auth/user/me") || url.includes("/api/auth/session")) {
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
    if (url.includes("/api/auth/staff/unlock")) {
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          success: true,
          token: "live-inquisition-staff-token",
          user: {
            id: "doc-1",
            fullName: "Д-р Воронов Алексей Владимирович",
            role: "owner",
          },
        }),
      });
    }
    if (url.includes("/api/schedule")) {
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(mockDashboard.appointments),
      });
    }
    if (url.includes("/api/patients")) {
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(mockDashboard.patients),
      });
    }
    if (url.includes("/api/payments") || url.includes("/api/billing")) {
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(mockDashboard.payments),
      });
    }
    return route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(url.includes("list") || url.includes("status") || url.includes("/scans") || url.includes("/xray") ? [] : {}),
    });
  });
}

async function applyTheme(page, theme) {
  await page.waitForFunction(() => typeof window !== "undefined" && Boolean(window.__useThemeStore), { timeout: 15000 }).catch(() => {});
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
  const isDark = ["dark", "night", "ocean", "emerald", "cyber_xray"].includes(theme);
  await page.waitForFunction((dark) => {
    const hasDark = document.documentElement.classList.contains("dark");
    return dark ? hasDark : !hasDark;
  }, isDark, { timeout: 8000 }).catch(() => {});
  await page.waitForTimeout(600);
}

const addAuthInitScript = (ctx) =>
  ctx.addInitScript(() => {
    localStorage.setItem("dente_clinic_token", "live-inquisition-clinic-token");
    localStorage.setItem("dente_staff_token", "live-inquisition-staff-token");
    localStorage.setItem("dente_active_role", "owner");
    localStorage.setItem("dente_theme_mode", "light");
    localStorage.setItem("dente_active_patient_id", "pat-1");
    localStorage.setItem("dente_tour_completed", "true");
    localStorage.setItem(
      "dente_quest_progress_v2",
      JSON.stringify({
        activeTrackId: "solo_doctor",
        currentStepIndex: 4,
        completedStepIds: ["schedule_overview", "tooth_formula", "diary_043u", "reception_receipt"],
        isTourActive: false,
        isDismissedPermanently: true,
        tracksProgress: {
          solo_doctor: { completed: true, completedStepIds: ["schedule_overview", "tooth_formula", "diary_043u", "reception_receipt"] },
          reception_admin: { completed: true, completedStepIds: [] },
          imaging_diagnostics: { completed: true, completedStepIds: [] },
        },
      })
    );
    localStorage.setItem(
      "dental-crm:onboarding:v1",
      JSON.stringify({
        dismissed: true,
        step: "done",
        completed: true,
        onboardingDismissed: true,
        onboardingStep: "done",
        version: 1,
      })
    );
    localStorage.setItem(
      "dental-crm:web-ui-preferences:v1",
      JSON.stringify({
        version: 1,
        uiLanguage: "ru",
        selectedWorkspaceRole: "owner",
        selectedPatientId: "pat-1",
        onboardingDismissed: true,
        onboardingStep: "done",
      })
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

    // Inject non-blocking style to kill tour spotlights and coach marks
    const style = document.createElement("style");
    style.innerHTML = `
      [data-testid="doctor-training-coach-mark-card"],
      [data-testid="guided-tour-spotlight-overlay"],
      .tour-spotlight-root,
      .tour-backdrop-clickable-zone {
        display: none !important;
        pointer-events: none !important;
      }
    `;
    document.head?.appendChild(style);
  });

async function main() {
  const targetDirs = [
    path.resolve("C:/Users/Admin/.gemini/antigravity/brain/501bdacd-4cb9-4b31-be4b-403a48e21716/screenshots"),
    path.resolve("C:/Clinic_MVP/dental-crm/docs/screenshots/redteam_inquisition"),
  ];
  for (const d of targetDirs) {
    if (!fs.existsSync(d)) fs.mkdirSync(d, { recursive: true });
  }

  const browser = await chromium.launch({
    headless: true,
    executablePath: "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });

  const capturedRegistry = [];

  async function takeScreen(page, fileName, description) {
    await page.waitForTimeout(600);
    const primaryPath = path.join(targetDirs[0], fileName);
    if (fs.existsSync(primaryPath)) {
      try { fs.unlinkSync(primaryPath); } catch {}
    }
    await page.screenshot({ path: primaryPath, fullPage: false, animations: "disabled", timeout: 30000 });
    for (let i = 1; i < targetDirs.length; i++) {
      fs.copyFileSync(primaryPath, path.join(targetDirs[i], fileName));
    }
    const stat = fs.statSync(primaryPath);
    capturedRegistry.push({ fileName, description, sizeBytes: stat.size, path: primaryPath });
    console.log(`[CAPTURED] ${fileName} (${description}) — ${(stat.size / 1024).toFixed(1)} KB`);
  }

  try {
    // =========================================================================
    // 1. DESKTOP VIEWPORT (1440x900)
    // =========================================================================
    console.log("\n=================== DESKTOP SUITE (1440x900) ===================");
    const deskCtx = await browser.newContext({
      viewport: { width: 1440, height: 900 },
      deviceScaleFactor: 2,
    });
    await addAuthInitScript(deskCtx);
    const dPage = await deskCtx.newPage();
    await setupPageRoutes(dPage);

    await dPage.goto("http://127.0.0.1:5173/#schedule", { waitUntil: "domcontentloaded", timeout: 45000 });
    await dPage.waitForSelector(".boot-state", { state: "detached", timeout: 45000 }).catch(() => {});
    await dPage.waitForSelector(".app-shell", { state: "visible", timeout: 30000 });
    await dPage.waitForTimeout(1500);

    // -------------------------------------------------------------------------
    // 1. Расписание приёма (ScheduleView.tsx)
    // -------------------------------------------------------------------------
    await dPage.evaluate(() => { window.location.hash = "#schedule"; });
    await dPage.waitForSelector(".schedule-filter-strip, .schedule-panel", { timeout: 20000 });
    await applyTheme(dPage, "light");
    await takeScreen(dPage, "01_schedule_desktop_light.png", "Расписание (Desktop Light)");

    await applyTheme(dPage, "dark");
    await takeScreen(dPage, "01_schedule_desktop_dark.png", "Расписание (Desktop Dark)");

    // -------------------------------------------------------------------------
    // 2. Дневник приёма / ЭМК 043/у (VisitView.tsx, subtab 'emk')
    // -------------------------------------------------------------------------
    await dPage.evaluate(() => { window.location.hash = "#visit"; });
    await dPage.waitForSelector('[data-testid="visit-subtab-emk"], .visit-monolithic-header, [data-testid="visit-view"]', { timeout: 35000 });
    await dPage.evaluate(() => {
      const btn = document.querySelector('[data-testid="visit-subtab-emk"]');
      if (btn) btn.click();
    });
    await dPage.waitForTimeout(800);

    await applyTheme(dPage, "light");
    await takeScreen(dPage, "02_visit_emk_desktop_light.png", "Дневник ЭМК 043/у (Desktop Light)");

    await applyTheme(dPage, "dark");
    await takeScreen(dPage, "02_visit_emk_desktop_dark.png", "Дневник ЭМК 043/у (Desktop Dark)");

    // -------------------------------------------------------------------------
    // 3. Зубная формула (ToothChart.tsx / ClassicGostOdontogram.tsx, subtab 'odontogram')
    // -------------------------------------------------------------------------
    await dPage.evaluate(() => {
      const btn = document.querySelector('[data-testid="visit-subtab-odontogram"]');
      if (btn) btn.click();
    });
    await dPage.waitForTimeout(1000);
    await applyTheme(dPage, "light");
    await takeScreen(dPage, "03_odontogram_desktop_light.png", "Зубная формула (Desktop Light)");

    await applyTheme(dPage, "dark");
    await takeScreen(dPage, "03_odontogram_desktop_dark.png", "Зубная формула (Desktop Dark)");

    // -------------------------------------------------------------------------
    // 4. Модалка снимков / КТ DICOM (CbctMprImplantStudioModal.tsx / Zakharov 312 slices)
    // -------------------------------------------------------------------------
    await dPage.evaluate(() => {
      window.dispatchEvent(new CustomEvent("dente:open-cbct-demo"));
    });
    await dPage.waitForSelector('[data-testid="cbct-studio-modal"], .cbct-dark-cockpit, canvas', { timeout: 15000 }).catch(() => {});
    await dPage.waitForTimeout(2000);

    await applyTheme(dPage, "light");
    await takeScreen(dPage, "04_dicom_viewer_desktop_light.png", "DICOM / КТ Модалка (Desktop Light)");

    await applyTheme(dPage, "dark");
    await takeScreen(dPage, "04_dicom_viewer_desktop_dark.png", "DICOM / КТ Модалка (Desktop Dark)");

    // Close DICOM modal
    await dPage.evaluate(() => {
      const closeBtn = document.querySelector('[data-testid="close-cbct-mpr-3d-studio-btn"]');
      if (closeBtn) closeBtn.click();
    });
    await dPage.keyboard.press("Escape");
    await dPage.waitForTimeout(600);

    // -------------------------------------------------------------------------
    // 5. Касса и чек 54-ФЗ (PaymentModal.tsx / FastCheckout)
    // -------------------------------------------------------------------------
    await dPage.evaluate(() => {
      const finLink = document.querySelector('a[href="#finance"]');
      if (finLink) finLink.click();
      else window.location.hash = "#finance";
    });
    await dPage.waitForSelector(".finance-panel, #finance, [data-testid='finance-view']", { timeout: 25000 }).catch(() => {});
    await dPage.waitForTimeout(1000);

    await dPage.evaluate(() => {
      const splitBtn = document.querySelector('[data-testid="payment-split-modal-button"]') ||
                       Array.from(document.querySelectorAll('button')).find(b => b.textContent?.includes("Сплит") || b.textContent?.includes("Принять оплату"));
      if (splitBtn) splitBtn.click();
    });
    await dPage.waitForSelector('.payment-modal, [aria-labelledby="payment-modal-title"], [role="dialog"]', { timeout: 15000 }).catch(() => {});
    await dPage.waitForTimeout(1000);

    await applyTheme(dPage, "light");
    await takeScreen(dPage, "05_cash_54fz_desktop_light.png", "Касса и чек 54-ФЗ (Desktop Light)");

    await applyTheme(dPage, "dark");
    await takeScreen(dPage, "05_cash_54fz_desktop_dark.png", "Касса и чек 54-ФЗ (Desktop Dark)");

    // Close Payment Modal
    await dPage.keyboard.press("Escape");
    await dPage.waitForTimeout(800);

    // -------------------------------------------------------------------------
    // 6. Настройки оборудования (SettingsView.tsx -> HardwareSettingsTab.tsx -> Audio DSP)
    // -------------------------------------------------------------------------
    await dPage.evaluate(() => {
      const setLink = document.querySelector('a[href="#settings"]');
      if (setLink) setLink.click();
      else window.location.hash = "#settings/hardware";
    });
    await dPage.waitForSelector('[data-testid="settings-view"], .settings-zone', { timeout: 25000 }).catch(() => {});
    await dPage.waitForTimeout(1000);

    await dPage.evaluate(() => {
      const hwTab = document.getElementById("settings-tab-hardware") ||
                    Array.from(document.querySelectorAll('button')).find(b => b.textContent?.includes("Оборудование"));
      if (hwTab) hwTab.click();
    });
    await dPage.waitForSelector('.hw-studio-container, [data-testid="hardware-studio-container"]', { timeout: 15000 }).catch(() => {});
    await dPage.waitForTimeout(800);

    await dPage.evaluate(() => {
      const audioTab = document.querySelector('[data-testid="domain-tab-audio"]');
      if (audioTab) audioTab.click();
    });
    await dPage.waitForSelector('[data-testid="hardware-audio-section"]', { timeout: 15000 }).catch(() => {});
    await dPage.waitForTimeout(800);

    await applyTheme(dPage, "light");
    await takeScreen(dPage, "06_hardware_settings_desktop_light.png", "Настройки оборудования (Desktop Light)");

    await applyTheme(dPage, "dark");
    await takeScreen(dPage, "06_hardware_settings_desktop_dark.png", "Настройки оборудования (Desktop Dark)");

    await deskCtx.close();

    // =========================================================================
    // 2. MOBILE VIEWPORT (390x844)
    // =========================================================================
    console.log("\n=================== MOBILE SUITE (390x844) ===================");
    const mobCtx = await browser.newContext({
      viewport: { width: 390, height: 844 },
      deviceScaleFactor: 2,
      isMobile: true,
      hasTouch: true,
    });
    await addAuthInitScript(mobCtx);
    const mPage = await mobCtx.newPage();
    await setupPageRoutes(mPage);

    await mPage.goto("http://127.0.0.1:5173/#schedule", { waitUntil: "domcontentloaded", timeout: 45000 });
    await mPage.waitForSelector(".boot-state", { state: "detached", timeout: 45000 }).catch(() => {});
    await mPage.waitForSelector(".app-shell", { state: "visible", timeout: 30000 });
    await mPage.waitForTimeout(1500);

    // Mobile 1: Schedule
    await mPage.evaluate(() => { window.location.hash = "#schedule"; });
    await applyTheme(mPage, "light");
    await takeScreen(mPage, "01_schedule_mobile_light.png", "Расписание (Mobile Light)");
    await applyTheme(mPage, "dark");
    await takeScreen(mPage, "01_schedule_mobile_dark.png", "Расписание (Mobile Dark)");

    // Mobile 2: Visit EMK
    await mPage.evaluate(() => { window.location.hash = "#visit"; });
    await mPage.waitForSelector('[data-testid="visit-subtab-emk"], .visit-monolithic-header, [data-testid="visit-view"]', { timeout: 35000 }).catch(() => {});
    await mPage.evaluate(() => {
      const btn = document.querySelector('[data-testid="visit-subtab-emk"]');
      if (btn) btn.click();
    });
    await mPage.waitForTimeout(600);
    await applyTheme(mPage, "light");
    await takeScreen(mPage, "02_visit_emk_mobile_light.png", "Дневник ЭМК 043/у (Mobile Light)");
    await applyTheme(mPage, "dark");
    await takeScreen(mPage, "02_visit_emk_mobile_dark.png", "Дневник ЭМК 043/у (Mobile Dark)");

    // Mobile 3: Odontogram
    await mPage.evaluate(() => {
      const btn = document.querySelector('[data-testid="visit-subtab-odontogram"]');
      if (btn) btn.click();
    });
    await mPage.waitForTimeout(1000);
    await applyTheme(mPage, "light");
    await takeScreen(mPage, "03_odontogram_mobile_light.png", "Зубная формула (Mobile Light)");
    await applyTheme(mPage, "dark");
    await takeScreen(mPage, "03_odontogram_mobile_dark.png", "Зубная формула (Mobile Dark)");

    // Mobile 4: DICOM Viewer (CBCT 3D Studio)
    await mPage.evaluate(() => {
      window.dispatchEvent(new CustomEvent("dente:open-cbct-demo"));
    });
    await mPage.waitForSelector('[data-testid="cbct-studio-modal"], .cbct-dark-cockpit, canvas', { timeout: 15000 }).catch(() => {});
    await mPage.waitForTimeout(2000);
    await applyTheme(mPage, "light");
    await takeScreen(mPage, "04_dicom_viewer_mobile_light.png", "DICOM / КТ Модалка (Mobile Light)");
    await applyTheme(mPage, "dark");
    await takeScreen(mPage, "04_dicom_viewer_mobile_dark.png", "DICOM / КТ Модалка (Mobile Dark)");

    await mPage.evaluate(() => {
      const closeBtn = document.querySelector('[data-testid="close-cbct-mpr-3d-studio-btn"]');
      if (closeBtn) closeBtn.click();
    });
    await mPage.keyboard.press("Escape");
    await mPage.waitForTimeout(600);

    // Mobile 5: Cash 54-FZ
    await mPage.evaluate(() => {
      const finLink = document.querySelector('a[href="#finance"]');
      if (finLink) finLink.click();
      else window.location.hash = "#finance";
    });
    await mPage.waitForSelector(".finance-panel, #finance, [data-testid='finance-view']", { timeout: 25000 }).catch(() => {});
    await mPage.waitForTimeout(1000);
    await mPage.evaluate(() => {
      const splitBtn = document.querySelector('[data-testid="payment-split-modal-button"]') ||
                       Array.from(document.querySelectorAll('button')).find(b => b.textContent?.includes("Сплит") || b.textContent?.includes("Принять оплату"));
      if (splitBtn) splitBtn.click();
    });
    await mPage.waitForSelector('.payment-modal, [aria-labelledby="payment-modal-title"], [role="dialog"]', { timeout: 15000 }).catch(() => {});
    await mPage.waitForTimeout(1000);
    await applyTheme(mPage, "light");
    await takeScreen(mPage, "05_cash_54fz_mobile_light.png", "Касса и чек 54-ФЗ (Mobile Light)");
    await applyTheme(mPage, "dark");
    await takeScreen(mPage, "05_cash_54fz_mobile_dark.png", "Касса и чек 54-ФЗ (Mobile Dark)");

    await mPage.keyboard.press("Escape");
    await mPage.waitForTimeout(800);

    // Mobile 6: Hardware Settings (Audio DSP)
    await mPage.evaluate(() => {
      const setLink = document.querySelector('a[href="#settings"]');
      if (setLink) setLink.click();
      else window.location.hash = "#settings/hardware";
    });
    await mPage.waitForSelector('[data-testid="settings-view"], .settings-zone', { timeout: 25000 }).catch(() => {});
    await mPage.waitForTimeout(1000);
    await mPage.evaluate(() => {
      const hwTab = document.getElementById("settings-tab-hardware") ||
                    Array.from(document.querySelectorAll('button')).find(b => b.textContent?.includes("Оборудование"));
      if (hwTab) hwTab.click();
    });
    await mPage.waitForSelector('.hw-studio-container, [data-testid="hardware-studio-container"]', { timeout: 15000 }).catch(() => {});
    await mPage.waitForTimeout(800);
    await mPage.evaluate(() => {
      const audioTab = document.querySelector('[data-testid="domain-tab-audio"]');
      if (audioTab) audioTab.click();
    });
    await mPage.waitForSelector('[data-testid="hardware-audio-section"]', { timeout: 15000 }).catch(() => {});
    await mPage.waitForTimeout(800);
    await applyTheme(mPage, "light");
    await takeScreen(mPage, "06_hardware_settings_mobile_light.png", "Настройки оборудования (Mobile Light)");
    await applyTheme(mPage, "dark");
    await takeScreen(mPage, "06_hardware_settings_mobile_dark.png", "Настройки оборудования (Mobile Dark)");

    await mobCtx.close();
  } finally {
    await browser.close();
  }

  console.log("\n=================== INQUISITION SUMMARY ===================");
  console.log(`Total captured: ${capturedRegistry.length}`);
  for (const c of capturedRegistry) {
    console.log(`- ${c.fileName}: ${(c.sizeBytes / 1024).toFixed(1)} KB (${c.description})`);
  }
}

main().catch((err) => {
  console.error("FATAL ERROR IN SUITE:", err);
  process.exit(1);
});
