/**
 * scripts/audit_executive_analytics_layout.cjs
 *
 * Инструментальный скрипт захвата реальных скриншотов аналитических панелей клиники:
 * 1. Рабочий стол Директора (DirectorExecutiveDashboard) - PC Light & PC Dark (1440x900)
 * 2. Мобильный дашборд директора (ExecutiveDashboard / Apple HIG) - Mobile Light & Mobile Dark (390x844)
 * 3. Сводный пульт клиники (ClinicAnalyticsDashboard / Загрузка кресел, P&L) - PC Light & PC Dark (1440x900)
 * 4. Кураторы пациентов (CuratorDashboard & CuratorConversionFunnel) - PC Light & PC Dark (1440x900)
 * 5. Возврат пациентов (LostPatientsPanel & LostPatientsRecallCohortsTable) - PC Light & PC Dark (1440x900)
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
        specialties: ["therapist", "orthopedist"],
        active: true,
        color: "#0d9488",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      {
        id: "cur-1",
        organizationId: "00000000-0000-0000-0000-000000000001",
        fullName: "Анна Соколова (Куратор)",
        role: "curator",
        specialties: [],
        active: true,
        color: "#6366f1",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      {
        id: "doc-2",
        organizationId: "00000000-0000-0000-0000-000000000001",
        fullName: "Д-р Морозов Дмитрий Сергеевич",
        role: "doctor",
        specialties: ["surgeon", "implantologist"],
        active: true,
        color: "#ef4444",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    ],
    chairs: [
      {
        id: "chair-1",
        organizationId: "00000000-0000-0000-0000-000000000001",
        name: "Кресло 1 (Терапия)",
        cabinet: "Кабинет №1",
        defaultDoctorId: "doc-1",
        active: true,
        hasXraySensor: true,
        hasMicroscope: true,
        hasSurgeryKit: false,
      },
      {
        id: "chair-2",
        organizationId: "00000000-0000-0000-0000-000000000001",
        name: "Кресло 2 (Ортопедия)",
        cabinet: "Кабинет №2",
        defaultDoctorId: "doc-1",
        active: true,
        hasXraySensor: true,
        hasMicroscope: false,
        hasSurgeryKit: false,
      },
      {
        id: "chair-surg",
        organizationId: "00000000-0000-0000-0000-000000000001",
        name: "Хирургический кабинет",
        cabinet: "Операционная",
        defaultDoctorId: "doc-2",
        active: true,
        hasXraySensor: true,
        hasMicroscope: false,
        hasSurgeryKit: true,
      },
    ],
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
      balanceRub: 15000,
      administrativeProfile: {
        curatorId: "cur-1",
        curatorFullName: "Анна Соколова (Куратор)",
        curatorFunnelStage: "treatment_start",
        curatorAssignedAt: `${todayDate}T08:00:00.000Z`,
      },
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
      balanceRub: 0,
      administrativeProfile: {
        curatorId: "cur-1",
        curatorFullName: "Анна Соколова (Куратор)",
        curatorFunnelStage: "plan_negotiation",
        curatorAssignedAt: `${todayDate}T08:00:00.000Z`,
      },
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
      balanceRub: 45000,
      administrativeProfile: {
        curatorId: "cur-1",
        curatorFullName: "Анна Соколова (Куратор)",
        curatorFunnelStage: "prepayment",
        curatorAssignedAt: `${todayDate}T08:00:00.000Z`,
      },
      createdAt: `${todayDate}T08:00:00.000Z`,
      updatedAt: `${todayDate}T08:00:00.000Z`,
    },
    {
      id: "pat-4",
      organizationId: "00000000-0000-0000-0000-000000000001",
      fullName: "Михайлов Денис Павлович",
      status: "active",
      birthDate: "1983-02-10",
      phone: "+7 (903) 444-22-11",
      email: "mikhailov@example.ru",
      balanceRub: 0,
      administrativeProfile: {
        curatorId: "cur-1",
        curatorFullName: "Анна Соколова (Куратор)",
        curatorFunnelStage: "consultation",
        curatorAssignedAt: `${todayDate}T08:00:00.000Z`,
      },
      createdAt: `${todayDate}T08:00:00.000Z`,
      updatedAt: `${todayDate}T08:00:00.000Z`,
    },
  ],
  treatmentPlans: [
    {
      id: "plan-1",
      patientId: "pat-1",
      title: "Тотальная реабилитация: имплантация и цирконий",
      name: "Тотальная реабилитация: имплантация и цирконий",
      status: "Active",
      totalPriceRub: 280000,
      totalPrice: 280000,
      paidAmountRub: 140000,
      doctorId: "doc-2",
      createdAt: new Date(Date.now() - 4 * 24 * 3600 * 1000).toISOString(),
    },
    {
      id: "plan-2",
      patientId: "pat-2",
      title: "Ортопедическое лечение: 4 коронки E.max",
      name: "Ортопедическое лечение: 4 коронки E.max",
      status: "Approved",
      totalPriceRub: 120000,
      totalPrice: 120000,
      paidAmountRub: 0,
      doctorId: "doc-1",
      createdAt: new Date(Date.now() - 6 * 24 * 3600 * 1000).toISOString(),
    },
    {
      id: "plan-3",
      patientId: "pat-3",
      title: "Комплексная санация: эндодонтия и реставрация",
      name: "Комплексная санация: эндодонтия и реставрация",
      status: "Active",
      totalPriceRub: 75000,
      totalPrice: 75000,
      paidAmountRub: 45000,
      doctorId: "doc-1",
      createdAt: new Date(Date.now() - 2 * 24 * 3600 * 1000).toISOString(),
    },
    {
      id: "plan-4",
      patientId: "pat-4",
      title: "Первичный осмотр и профгигиена AirFlow",
      name: "Первичный осмотр и профгигиена AirFlow",
      status: "Draft",
      totalPriceRub: 18500,
      totalPrice: 18500,
      paidAmountRub: 0,
      doctorId: "doc-1",
      createdAt: new Date(Date.now() - 1 * 24 * 3600 * 1000).toISOString(),
    },
  ],
  appointments: [
    {
      id: "app-1",
      organizationId: "00000000-0000-0000-0000-000000000001",
      patientId: "pat-1",
      doctorId: "doc-2",
      doctorName: "Д-р Морозов Д.С.",
      chairId: "chair-surg",
      chairName: "Хирургический кабинет",
      status: "completed",
      startsAt: `${todayDate}T09:00:00.000Z`,
      endsAt: `${todayDate}T10:30:00.000Z`,
      priceRub: 45000,
      serviceTitle: "Установка имплантата Straumann",
    },
    {
      id: "app-2",
      organizationId: "00000000-0000-0000-0000-000000000001",
      patientId: "pat-2",
      doctorId: "doc-1",
      doctorName: "Д-р Воронов А.В.",
      chairId: "chair-1",
      chairName: "Кресло 1 (Терапия)",
      status: "completed",
      startsAt: `${todayDate}T11:00:00.000Z`,
      endsAt: `${todayDate}T12:00:00.000Z`,
      priceRub: 14500,
      serviceTitle: "Эндодонтическое перелечивание",
    },
    {
      id: "app-3",
      organizationId: "00000000-0000-0000-0000-000000000001",
      patientId: "pat-3",
      doctorId: "doc-1",
      doctorName: "Д-р Воронов А.В.",
      chairId: "chair-2",
      chairName: "Кресло 2 (Ортопедия)",
      status: "completed",
      startsAt: `${todayDate}T13:00:00.000Z`,
      endsAt: `${todayDate}T14:30:00.000Z`,
      priceRub: 38000,
      serviceTitle: "Фиксация безметалловых коронок",
    },
    {
      id: "app-4",
      organizationId: "00000000-0000-0000-0000-000000000001",
      patientId: "pat-4",
      doctorId: "doc-1",
      doctorName: "Д-р Воронов А.В.",
      chairId: "chair-1",
      chairName: "Кресло 1 (Терапия)",
      status: "booked",
      startsAt: `${todayDate}T15:00:00.000Z`,
      endsAt: `${todayDate}T16:00:00.000Z`,
      priceRub: 18500,
      serviceTitle: "Консультация и профгигиена",
    },
  ],
  payments: [
    {
      id: "pay-1",
      patientId: "pat-1",
      amountRub: 140000,
      amountKopecks: 14000000,
      method: "card",
      paymentMethod: "card",
      status: "paid",
      paidAt: `${todayDate}T10:35:00.000Z`,
    },
    {
      id: "pay-2",
      patientId: "pat-3",
      amountRub: 45000,
      amountKopecks: 4500000,
      method: "sbp",
      paymentMethod: "sbp",
      status: "paid",
      paidAt: `${todayDate}T14:35:00.000Z`,
    },
    {
      id: "pay-3",
      patientId: "pat-2",
      amountRub: 14500,
      amountKopecks: 1450000,
      method: "cash",
      paymentMethod: "cash",
      status: "paid",
      paidAt: `${todayDate}T12:05:00.000Z`,
    },
  ],
};

const mockExecutivePayload = {
  kpis: {
    period: "month",
    totalRevenueKopecks: 485000000,
    totalRevenueFormatted: "4 850 000 ₽",
    totalRevenuePlanKopecks: 500000000,
    totalRevenuePlanFormatted: "5 000 000 ₽",
    overallPlanFulfillmentPercent: 97,
    primaryRevenueKopecks: 194000000,
    primaryRevenueFormatted: "1 940 000 ₽",
    repeatRevenueKopecks: 291000000,
    repeatRevenueFormatted: "2 910 000 ₽",
    primaryPatientsCount: 48,
    primaryPatientsPercent: 22,
    repeatPatientsCount: 170,
    totalPatientsCount: 218,
    totalMarketingSpendKopecks: 15400000,
    totalMarketingSpendFormatted: "154 000 ₽",
    patientLtvKopecks: 9450000,
    patientLtvFormatted: "94 500 ₽",
    cacKopecks: 320800,
    cacFormatted: "3 208 ₽",
    ltvToCacRatio: 29.5,
    totalOccupiedMinutes: 44280,
    totalAvailableMinutes: 54000,
    totalChairsCount: 3,
    chairOccupancyRatePercent: 82,
    totalLeadsCount: 120,
    aiExaminedLeadsCount: 82,
    aiDiagnosticRatePercent: 68,
    totalSanitationCount: 38,
    leadToSanitationConversionPercent: 32,
    totalCompletedVisits: 310,
    averageCheckKopecks: 1564500,
    averageCheckFormatted: "15 645 ₽",
    activeDoctorsCount: 6,
    cancellationRatePercent: 8,
    cancelledVisitsCount: 26,
    noShowVisitsCount: 8,
  },
  funnelStages: [
    { stage: "lead", title: "1. Первичный лид", count: 120, conversionFromPreviousPercent: 100, isAiAssisted: false },
    { stage: "consultation_booking", title: "2. Запись на консультацию", count: 98, conversionFromPreviousPercent: 82, isAiAssisted: false },
    { stage: "attended", title: "3. Явка в клинику", count: 88, conversionFromPreviousPercent: 90, isAiAssisted: false },
    { stage: "ai_examination", title: "4. Осмотр Diagnocat AI", count: 82, conversionFromPreviousPercent: 93, isAiAssisted: true },
    { stage: "plan_presentation", title: "5. Презентация плана", count: 78, conversionFromPreviousPercent: 95, isAiAssisted: false, totalVolumeFormatted: "12 400 000 ₽" },
    { stage: "plan_approved", title: "6. Согласование плана", count: 56, conversionFromPreviousPercent: 72, isAiAssisted: false, totalVolumeFormatted: "8 200 000 ₽" },
    { stage: "treatment_started", title: "7. Старт лечения", count: 48, conversionFromPreviousPercent: 86, isAiAssisted: false, totalVolumeFormatted: "6 800 000 ₽" },
    { stage: "sanitation_completed", title: "8. Полная санация", count: 38, conversionFromPreviousPercent: 79, isAiAssisted: false },
  ],
  departments: [
    {
      departmentKey: "therapy",
      titleRu: "Терапевтическая стоматология",
      accentColor: "#0d9488",
      planRevenueFormatted: "1 500 000 ₽",
      factRevenueFormatted: "1 580 000 ₽",
      planFulfillmentPercent: 105,
      shareOfTotalRevenuePercent: 33,
      status: "ahead",
      statusLabel: "Перевыполнение +5%",
      averageCheckFormatted: "8 400 ₽",
      completedVisitsCount: 188,
      uniquePatientsCount: 142,
    },
    {
      departmentKey: "orthopedics",
      titleRu: "Ортопедическая стоматология",
      accentColor: "#6366f1",
      planRevenueFormatted: "1 600 000 ₽",
      factRevenueFormatted: "1 520 000 ₽",
      planFulfillmentPercent: 95,
      shareOfTotalRevenuePercent: 31,
      status: "on_track",
      statusLabel: "В плане (95%)",
      averageCheckFormatted: "38 000 ₽",
      completedVisitsCount: 40,
      uniquePatientsCount: 32,
    },
    {
      departmentKey: "surgery_implantation",
      titleRu: "Хирургия и Имплантация",
      accentColor: "#ef4444",
      planRevenueFormatted: "1 100 000 ₽",
      factRevenueFormatted: "1 050 000 ₽",
      planFulfillmentPercent: 95,
      shareOfTotalRevenuePercent: 22,
      status: "on_track",
      statusLabel: "В плане (95%)",
      averageCheckFormatted: "47 700 ₽",
      completedVisitsCount: 22,
      uniquePatientsCount: 18,
    },
    {
      departmentKey: "orthodontics",
      titleRu: "Ортодонтия",
      accentColor: "#8b5cf6",
      planRevenueFormatted: "550 000 ₽",
      factRevenueFormatted: "510 000 ₽",
      planFulfillmentPercent: 93,
      shareOfTotalRevenuePercent: 10,
      status: "on_track",
      statusLabel: "В плане (93%)",
      averageCheckFormatted: "28 300 ₽",
      completedVisitsCount: 18,
      uniquePatientsCount: 16,
    },
    {
      departmentKey: "pediatric",
      titleRu: "Детская стоматология",
      accentColor: "#f59e0b",
      planRevenueFormatted: "250 000 ₽",
      factRevenueFormatted: "190 000 ₽",
      planFulfillmentPercent: 76,
      shareOfTotalRevenuePercent: 4,
      status: "behind",
      statusLabel: "Отставание 24%",
      averageCheckFormatted: "4 500 ₽",
      completedVisitsCount: 42,
      uniquePatientsCount: 38,
    },
  ],
  period: "month",
  isEmpty: false,
};

const mockLostPatients = [
  {
    id: "pat-lost-1",
    patientName: "Королёв Сергей Павлович",
    phone: "+7 (916) 777-88-99",
    daysSinceLastVisit: 195,
    lastTreatmentCategory: "sanitation",
    lastDoctorName: "Д-р Воронов А.В.",
    hasFutureAppointment: false,
  },
  {
    id: "pat-lost-2",
    patientName: "Васильева Татьяна Николаевна",
    phone: "+7 (926) 333-22-11",
    daysSinceLastVisit: 380,
    lastTreatmentCategory: "implantation",
    lastDoctorName: "Д-р Морозов Д.С.",
    hasFutureAppointment: false,
  },
  {
    id: "pat-lost-3",
    patientName: "Григорьев Артём Игоревич",
    phone: "+7 (903) 111-44-55",
    daysSinceLastVisit: 760,
    lastTreatmentCategory: "general_therapy",
    lastDoctorName: "Д-р Воронов А.В.",
    hasFutureAppointment: false,
  },
];

const mockRecallCohorts = [
  {
    cohortMonth: "Апрель 2025",
    category: "sanitation",
    totalPatients: 45,
    returned6m: 32,
    returned12m: 28,
    recallRevenueKopecks: 28800000,
  },
  {
    cohortMonth: "Октябрь 2024",
    category: "implantation",
    totalPatients: 24,
    returned6m: 19,
    returned12m: 16,
    recallRevenueKopecks: 24500000,
  },
  {
    cohortMonth: "Январь 2025",
    category: "sanitation",
    totalPatients: 38,
    returned6m: 26,
    returned12m: 22,
    recallRevenueKopecks: 21500000,
  },
];

async function setupInterception(page) {
  await page.route("**/api/**", async (route) => {
    const url = route.request().url();
    if (url.includes("/src/")) {
      return route.continue();
    }
    if (url.includes("/api/analytics/executive")) {
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ success: true, data: mockExecutivePayload }),
      });
    }
    if (url.includes("/api/analytics/dashboard")) {
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          kpis: {
            totalPatients: 218,
            primaryPatientsCount: 48,
            repeatPatientsCount: 170,
            totalRevenue: 485000000,
            cashRevenue: 120000000,
            cardRevenue: 365000000,
            totalAppointments: 310,
            chairOccupancyRatePercent: 82,
            averageCheck: 1564500,
          },
          doctorProfitabilityJson: [
            { name: "Д-р Воронов А.В.", revenue: 158000000, clinicMarginRub: 94800000, completionRate: 96, services804nCount: 188, labOrdersCount: 12 },
            { name: "Д-р Морозов Д.С.", revenue: 105000000, clinicMarginRub: 63000000, completionRate: 95, services804nCount: 22, labOrdersCount: 18 },
          ],
        }),
      });
    }
    if (url.includes("/api/analytics/lost-patients-filters")) {
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(mockLostPatients),
      });
    }
    if (url.includes("/api/dashboard")) {
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(mockDashboard),
      });
    }
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
    if (url.includes("/api/billing/payments")) {
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ data: mockDashboard.payments }),
      });
    }
    if (url.includes("/api/billing/invoices")) {
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ data: [] }),
      });
    }
    if (url.includes("/api/appointments") || url.includes("/api/schedule")) {
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ data: mockDashboard.appointments }),
      });
    }
    return route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({}),
    });
  });
}

async function injectSession(context) {
  await context.addInitScript(() => {
    localStorage.setItem("dente_clinic_token", "clinic-test-token-jwt");
    localStorage.setItem("dente_staff_token", "staff-test-token-jwt");
    localStorage.setItem("dente_active_session_token", "staff-test-token-jwt");
    localStorage.setItem("dente_active_user_id", "doc-1");
    localStorage.setItem("dente_active_role", "owner");
    localStorage.setItem("dente_active_mode", "clinic");
    sessionStorage.setItem("dente_unlocked", "true");
    localStorage.setItem("dente_tour_completed", "true");
    localStorage.setItem("dente_quest_progress_v2", JSON.stringify({
      activeTrackId: "solo_doctor",
      currentStepIndex: 0,
      completedStepIds: ["admin_schedule_grid", "admin_patient_search", "admin_cashier_checkout"],
      isDismissedPermanently: true,
      isPaused: true,
      tracksProgress: {
        solo_doctor: { completed: true, completedSteps: [] },
        reception_admin: { completed: true, completedSteps: [] },
        imaging_diagnostics: { completed: true, completedSteps: [] },
      },
    }));
    localStorage.setItem("dente_guide_tour_dismissed_v2", "true");
    localStorage.setItem("dente_guide_tour_seen_roles_v2", JSON.stringify(["admin", "doctor", "director"]));
    localStorage.setItem("dente_ui_preferences_v1", JSON.stringify({
      onboardingDismissed: true,
      onboardingStep: "done",
      onboardingDraftMode: false,
      version: 1,
    }));
    localStorage.setItem("dental-crm:onboarding:v1", JSON.stringify({
      dismissed: true,
      step: "done",
      completed: true,
      onboardingDismissed: true,
      onboardingStep: "done",
      onboardingDraftMode: false,
      version: 1,
    }));
    localStorage.setItem("dental-crm:web-ui-preferences:v1", JSON.stringify({
      version: 1,
      uiLanguage: "ru",
    }));
  });
}

async function run() {
  const screenshotsDir = path.resolve("C:/Clinic_MVP/dental-crm/docs/screenshots/audit_executive_analytics");
  const brainDir = path.resolve("C:/Users/Admin/.gemini/antigravity/brain/a1694a54-c82b-48ae-8427-f98d2ef54bbf");

  if (!fs.existsSync(screenshotsDir)) {
    fs.mkdirSync(screenshotsDir, { recursive: true });
  }

  const browser = await chromium.launch({
    headless: true,
    executablePath: "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });

  try {
    console.log("[Playwright] Launching captures...");

    // ─────────────────────────────────────────────────────────────────────────
    // 1 & 2: PC LIGHT & PC DARK (DirectorExecutiveDashboard 1440x900)
    // ─────────────────────────────────────────────────────────────────────────
    {
      const context = await browser.newContext({
        viewport: { width: 1440, height: 900 },
        deviceScaleFactor: 1,
      });
      await injectSession(context);
      const page = await context.newPage();
      page.on("console", (msg) => {
        if (msg.type() === "error" || msg.type() === "warning") {
          console.log(`[BROWSER ${msg.type().toUpperCase()}]`, msg.text());
        }
      });
      page.on("pageerror", (err) => {
        console.error("[BROWSER UNCAUGHT ERROR]", err.message);
      });
      await setupInterception(page);

      await page.goto("http://127.0.0.1:5173/#analytics", { waitUntil: "networkidle" });
      await page.waitForSelector("#analytics", { timeout: 15000 });

      // PC Light
      await page.evaluate(() => document.documentElement.setAttribute("data-theme", "light"));
      await page.waitForTimeout(1000);
      const pcLightPath = path.join(screenshotsDir, "audit_pc_light_director_executive.png");
      await page.screenshot({ path: pcLightPath, fullPage: false });
      fs.copyFileSync(pcLightPath, path.join(brainDir, "audit_pc_light_director_executive.png"));
      console.log(`[Captured] ${pcLightPath}`);

      // PC Dark
      await page.evaluate(() => document.documentElement.setAttribute("data-theme", "dark"));
      await page.waitForTimeout(1000);
      const pcDarkPath = path.join(screenshotsDir, "audit_pc_dark_director_executive.png");
      await page.screenshot({ path: pcDarkPath, fullPage: false });
      fs.copyFileSync(pcDarkPath, path.join(brainDir, "audit_pc_dark_director_executive.png"));
      console.log(`[Captured] ${pcDarkPath}`);

      // ───────────────────────────────────────────────────────────────────────
      // 3 & 4: PC LIGHT & PC DARK (CuratorDashboard / Воронка куратора)
      // ───────────────────────────────────────────────────────────────────────
      await page.evaluate(() => {
        document.querySelectorAll('.tour-spotlight-root, [data-testid="guided-tour-spotlight-overlay"], .tour-backdrop-clickable-zone').forEach((el) => el.remove());
      });
      // Кликаем по табу «Кураторы пациентов»
      const curatorTab = page.locator('button[role="tab"]:has-text("Кураторы пациентов")');
      if (await curatorTab.isVisible()) {
        await curatorTab.click({ force: true });
        await page.waitForTimeout(1200);

        // Light
        await page.evaluate(() => document.documentElement.setAttribute("data-theme", "light"));
        await page.waitForTimeout(800);
        const curLightPath = path.join(screenshotsDir, "audit_pc_light_curator_funnel.png");
        await page.screenshot({ path: curLightPath, fullPage: false });
        fs.copyFileSync(curLightPath, path.join(brainDir, "audit_pc_light_curator_funnel.png"));
        console.log(`[Captured] ${curLightPath}`);

        // Dark
        await page.evaluate(() => document.documentElement.setAttribute("data-theme", "dark"));
        await page.waitForTimeout(800);
        const curDarkPath = path.join(screenshotsDir, "audit_pc_dark_curator_funnel.png");
        await page.screenshot({ path: curDarkPath, fullPage: false });
        fs.copyFileSync(curDarkPath, path.join(brainDir, "audit_pc_dark_curator_funnel.png"));
        console.log(`[Captured] ${curDarkPath}`);
      }

      // ───────────────────────────────────────────────────────────────────────
      // 5 & 6: PC LIGHT & PC DARK (ClinicAnalyticsDashboard / Сводный пульт)
      // ───────────────────────────────────────────────────────────────────────
      await page.evaluate(() => {
        document.querySelectorAll('.tour-spotlight-root, [data-testid="guided-tour-spotlight-overlay"], .tour-backdrop-clickable-zone').forEach((el) => el.remove());
      });
      // Открываем меню «Ещё разделы» и выбираем «Сводный пульт клиники»
      const moreBtn = page.locator('button:has-text("Ещё разделы"), button:has-text("Ещё:")');
      if (await moreBtn.isVisible()) {
        await moreBtn.click({ force: true });
        await page.waitForTimeout(500);
        const clinicBtn = page.locator('button[role="menuitem"]:has-text("Сводный пульт клиники")');
        if (await clinicBtn.isVisible()) {
          await clinicBtn.click({ force: true });
          await page.waitForTimeout(1200);

          // Light
          await page.evaluate(() => document.documentElement.setAttribute("data-theme", "light"));
          await page.waitForTimeout(800);
          const clinicLightPath = path.join(screenshotsDir, "audit_pc_light_clinic_dashboard.png");
          await page.screenshot({ path: clinicLightPath, fullPage: false });
          fs.copyFileSync(clinicLightPath, path.join(brainDir, "audit_pc_light_clinic_dashboard.png"));
          console.log(`[Captured] ${clinicLightPath}`);

          // Dark
          await page.evaluate(() => document.documentElement.setAttribute("data-theme", "dark"));
          await page.waitForTimeout(800);
          const clinicDarkPath = path.join(screenshotsDir, "audit_pc_dark_clinic_dashboard.png");
          await page.screenshot({ path: clinicDarkPath, fullPage: false });
          fs.copyFileSync(clinicDarkPath, path.join(brainDir, "audit_pc_dark_clinic_dashboard.png"));
          console.log(`[Captured] ${clinicDarkPath}`);
        }
      }

      // ───────────────────────────────────────────────────────────────────────
      // 7 & 8: PC LIGHT & PC DARK (LostPatientsPanel / Возврат и Когорты)
      // ───────────────────────────────────────────────────────────────────────
      await page.evaluate(() => {
        document.querySelectorAll('.tour-spotlight-root, [data-testid="guided-tour-spotlight-overlay"], .tour-backdrop-clickable-zone').forEach((el) => el.remove());
      });
      if (await moreBtn.isVisible()) {
        await moreBtn.click({ force: true });
        await page.waitForTimeout(500);
        const lostBtn = page.locator('button[role="menuitem"]:has-text("Возврат пациентов")');
        if (await lostBtn.isVisible()) {
          await lostBtn.click({ force: true });
          await page.waitForTimeout(1000);

          // Переключаемся на таб «Когорты Recall 6/12м»
          const cohortTab = page.locator('button:has-text("Когорты Recall 6/12м")');
          if (await cohortTab.isVisible()) {
            await cohortTab.click({ force: true });
            await page.waitForTimeout(800);
          }

          // Light
          await page.evaluate(() => document.documentElement.setAttribute("data-theme", "light"));
          await page.waitForTimeout(800);
          const lostLightPath = path.join(screenshotsDir, "audit_pc_light_lost_patients_cohorts.png");
          await page.screenshot({ path: lostLightPath, fullPage: false });
          fs.copyFileSync(lostLightPath, path.join(brainDir, "audit_pc_light_lost_patients_cohorts.png"));
          console.log(`[Captured] ${lostLightPath}`);

          // Dark
          await page.evaluate(() => document.documentElement.setAttribute("data-theme", "dark"));
          await page.waitForTimeout(800);
          const lostDarkPath = path.join(screenshotsDir, "audit_pc_dark_lost_patients_cohorts.png");
          await page.screenshot({ path: lostDarkPath, fullPage: false });
          fs.copyFileSync(lostDarkPath, path.join(brainDir, "audit_pc_dark_lost_patients_cohorts.png"));
          console.log(`[Captured] ${lostDarkPath}`);
        }
      }

      await context.close();
    }

    // ─────────────────────────────────────────────────────────────────────────
    // 9 & 10: MOBILE LIGHT & MOBILE DARK (ExecutiveDashboard 390x844)
    // ─────────────────────────────────────────────────────────────────────────
    {
      const context = await browser.newContext({
        viewport: { width: 390, height: 844 },
        deviceScaleFactor: 2,
        isMobile: true,
        hasTouch: true,
      });
      await injectSession(context);
      const page = await context.newPage();
      await setupInterception(page);

      await page.goto("http://127.0.0.1:5173/#analytics", { waitUntil: "networkidle" });
      await page.waitForSelector("#analytics", { timeout: 15000 });

      // Mobile Light
      await page.evaluate(() => document.documentElement.setAttribute("data-theme", "light"));
      await page.waitForTimeout(1000);
      const mobLightPath = path.join(screenshotsDir, "audit_mobile_light_executive.png");
      await page.screenshot({ path: mobLightPath, fullPage: false });
      fs.copyFileSync(mobLightPath, path.join(brainDir, "audit_mobile_light_executive.png"));
      console.log(`[Captured] ${mobLightPath}`);

      // Mobile Dark
      await page.evaluate(() => document.documentElement.setAttribute("data-theme", "dark"));
      await page.waitForTimeout(1000);
      const mobDarkPath = path.join(screenshotsDir, "audit_mobile_dark_executive.png");
      await page.screenshot({ path: mobDarkPath, fullPage: false });
      fs.copyFileSync(mobDarkPath, path.join(brainDir, "audit_mobile_dark_executive.png"));
      console.log(`[Captured] ${mobDarkPath}`);

      await context.close();
    }

    console.log("[Playwright] All captures completed successfully!");
  } finally {
    await browser.close();
  }
}

run().catch((err) => {
  console.error("Execution failed:", err);
  process.exit(1);
});
