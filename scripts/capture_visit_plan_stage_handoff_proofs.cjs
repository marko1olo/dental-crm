const { chromium } = require("playwright");
const path = require("node:path");
const fs = require("node:fs");

const ARTIFACTS_DIR = "C:/Users/Admin/.gemini/antigravity/brain/aebb3e14-928e-415c-ac6f-b73d533325e9";
const LOCAL_DIR = "C:/Clinic_MVP/dental-crm/apps/web/public/screenshots/stage_handoff";

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const todayDate = new Date().toISOString().split("T")[0];

const mockTreatmentPlanData = {
  success: true,
  plans: [
    {
      id: "plan-complex-101",
      name: "Комплексная реабилитация жевательного отдела",
      status: "Approved",
      totalPrice: 125000,
      stages: [
        { stageNumber: 1, titleRu: "Терапевтическая санация кариеса" },
        { stageNumber: 2, titleRu: "Хирургический этап: удаление и имплантация" },
        { stageNumber: 3, titleRu: "Ортопедия: коронка из диоксида циркония" },
      ],
      items: [
        {
          id: "item-101",
          phase: 1,
          stageNumber: 1,
          toothNumber: 16,
          code804n: "A16.07.002",
          priceId: "A16.07.002",
          name: "Восстановление зуба пломбой светоотверждаемой",
          quantity: 1,
          price: 4500,
          unitPriceRub: 4500,
          discount: 0,
        },
        {
          id: "item-102",
          phase: 1,
          stageNumber: 1,
          toothNumber: 15,
          code804n: "A16.07.002.001",
          priceId: "A16.07.002.001",
          name: "Лечение кариеса эмали",
          quantity: 1,
          price: 3500,
          unitPriceRub: 3500,
          discount: 0,
        },
        {
          id: "item-201",
          phase: 2,
          stageNumber: 2,
          toothNumber: 38,
          code804n: "A16.07.001.002",
          priceId: "A16.07.001.002",
          name: "Сложное удаление зуба мудрости",
          quantity: 1,
          price: 8000,
          unitPriceRub: 8000,
          discount: 0,
        },
        {
          id: "item-202",
          phase: 2,
          stageNumber: 2,
          toothNumber: 46,
          code804n: "A16.07.054",
          priceId: "A16.07.054",
          name: "Внутрикостная дентальная имплантация",
          quantity: 1,
          price: 35000,
          unitPriceRub: 35000,
          discount: 0,
        },
        {
          id: "item-301",
          phase: 3,
          stageNumber: 3,
          toothNumber: 46,
          code804n: "A16.07.004",
          priceId: "A16.07.004",
          name: "Коронка циркониевая на винтовой фиксации",
          quantity: 1,
          price: 42000,
          unitPriceRub: 42000,
          discount: 0,
        },
      ],
    },
  ],
};

const mockDashboard = {
  version: 1,
  organizationId: "00000000-0000-0000-0000-000000000001",
  clinicSettings: {
    profile: {
      name: "Стоматология ДЕНТЕ Премиум",
      operatingHours: {
        workdayStart: "08:00",
        workdayEnd: "21:00",
        appointmentBufferMinutes: 10,
      },
      hasPediatricMode: true,
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
        specialties: ["therapist", "surgeon", "orthopedist"],
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
        name: "Кабинет 1 (Хирургия/Терапия)",
        room: "1",
        defaultDoctorId: "doc-1",
        active: true,
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
      allergies: ["Лидокаин"],
      notes: "Бронхиальная астма",
      administrativeProfile: "normal",
      createdAt: `${todayDate}T08:00:00.000Z`,
      updatedAt: `${todayDate}T08:00:00.000Z`,
    },
  ],
  activeVisit: {
    id: "visit-1",
    appointmentId: "app-1",
    patientId: "pat-1",
    doctorId: "doc-1",
    chairId: "chair-1",
    status: "in_treatment",
    startedAt: `${todayDate}T10:00:00.000Z`,
  },
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
      startsAt: `${todayDate}T10:00:00.000Z`,
      endsAt: `${todayDate}T11:00:00.000Z`,
      startTime: `${todayDate}T10:00:00.000Z`,
      endTime: `${todayDate}T11:00:00.000Z`,
      durationMinutes: 60,
      estimatedDurationMinutes: 60,
      serviceTitle: "Хирургический этап: удаление и имплантация",
      serviceCategories: ["surgery", "implantology"],
      treatmentPlanId: "plan-complex-101",
      stageNumber: 2,
      stageId: "stage_2_surgery",
      stageTitle: "Хирургический этап: удаление и имплантация",
      services: [
        {
          code804n: "A16.07.001.002",
          title: "Сложное удаление зуба мудрости",
          toothNumber: 38,
          priceRub: 8000,
          quantity: 1,
        },
        {
          code804n: "A16.07.054",
          title: "Внутрикостная дентальная имплантация",
          toothNumber: 46,
          priceRub: 35000,
          quantity: 1,
        },
      ],
      createdByUserId: "doc-1",
      createdAt: `${todayDate}T08:00:00.000Z`,
      updatedAt: `${todayDate}T08:00:00.000Z`,
      patientName: "Ковалёв Роман Станиславович",
      doctorName: "Д-р Воронов А.В.",
    },
  ],
  documents: [],
  payments: [],
  billingSummary: { totalPlannedRub: 43000, totalDueRub: 43000, totalPaidRub: 0 },
};

async function run() {
  console.log("=== Capturing Targeted Stage Handoff Proofs (PC Light & Dark) ===");
  fs.mkdirSync(LOCAL_DIR, { recursive: true });
  fs.mkdirSync(ARTIFACTS_DIR, { recursive: true });

  const browser = await chromium.launch({
    channel: "chrome",
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox"]
  });

  try {
    const context = await browser.newContext({
      viewport: { width: 1440, height: 900 }
    });

    // Intercept API routes
    await context.route("**/api/**", async (route) => {
      const url = route.request().url();
      if (url.includes("/src/")) return route.continue();

      if (url.includes("/api/dashboard")) {
        return route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify(mockDashboard),
        });
      }

      if (url.includes("/treatment-plans")) {
        return route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify(mockTreatmentPlanData),
        });
      }

      if (url.includes("/api/auth/user/me") || url.includes("/api/auth/session") || url.includes("/api/auth/verify")) {
        return route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            user: {
              id: "doc-1",
              fullName: "Д-р Воронов Алексей Владимирович",
              role: "owner",
              organizationId: "00000000-0000-0000-0000-000000000001",
            },
          }),
        });
      }

      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ success: true }),
      });
    });

    await context.addInitScript(() => {
      localStorage.setItem("dente_auth_token", "live-inquisition-token");
      localStorage.setItem("dente_clinic_token", "live-clinic-token");
      localStorage.setItem("dente_staff_token", "live-staff-token");
      localStorage.setItem("dente_active_role", "owner");
      localStorage.setItem("dente_user_id", "doc-1");
      localStorage.setItem("dente_user_role", "owner");
      localStorage.setItem("dente_clinic_tenant_id", "00000000-0000-0000-0000-000000000001");
      localStorage.setItem("dente_onboarding_completed", "true");
      localStorage.setItem("dente_tour_completed", "true");
      localStorage.setItem(
        "dental-crm:onboarding-state:v1",
        JSON.stringify({ completed: true, onboardingDismissed: true, onboardingStep: "done", version: 1 })
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
            currentDoctor: { id: "doc-1", fullName: "Д-р Воронов А. В.", role: "owner" },
            flags: { disableTour: true, hasPediatricMode: true },
          },
        })
      );
      localStorage.setItem("dente_theme_mode", "light");
    });

    const page = await context.newPage();

    console.log("Navigating to http://127.0.0.1:5173/#visit ...");
    await page.goto("http://127.0.0.1:5173/#visit", {
      waitUntil: "domcontentloaded",
      timeout: 25000,
    });
    await wait(2500);

    // Clean up overlays
    await page.evaluate(() => {
      const startBtn = Array.from(document.querySelectorAll("button")).find(b => b.textContent?.includes("0-клик старт"));
      if (startBtn) startBtn.click();
      document.querySelectorAll('.fixed.inset-0, .onboarding-modal, [role="dialog"], .tour-spotlight-root, [data-testid="guided-tour-spotlight-overlay"], .tour-backdrop-clickable-zone, [data-testid="demo-mode-banner"], .interactive-guide-tour-card').forEach((el) => {
        el.remove();
      });
    });
    await wait(1500);

    // Wait for the targeted stage banner to appear
    console.log("Waiting for targeted stage banner selector...");
    await page.waitForSelector('[data-testid="visit-treatment-plan-handoff-banner"]', {
      state: "visible",
      timeout: 12000,
    });
    console.log("Found [data-testid=\"visit-treatment-plan-handoff-banner\"]!");

    await wait(1000);

    // ── PROOF 1: Real Visit Targeted Stage Banner (PC Light, 1440x900) ──
    const pcLightPath = path.join(LOCAL_DIR, "proof_visit_plan_stage_handoff_pc_light.png");
    const pcLightArtifact = path.join(ARTIFACTS_DIR, "proof_visit_plan_stage_handoff_pc_light.png");
    await page.screenshot({ path: pcLightPath, fullPage: false });
    fs.copyFileSync(pcLightPath, pcLightArtifact);
    console.log("Saved Proof (PC Light):", pcLightPath);

    // ── PROOF 2: Real Visit Targeted Stage Banner (PC Dark, 1440x900) ──
    console.log("Switching to Dark mode...");
    await page.evaluate(() => {
      document.documentElement.setAttribute("data-theme", "dark");
      document.documentElement.classList.add("dark");
      document.documentElement.classList.remove("light");
      document.documentElement.style.colorScheme = "dark";
      localStorage.setItem("dente_theme_mode", "dark");
    });
    await wait(1500);

    const pcDarkPath = path.join(LOCAL_DIR, "proof_visit_plan_stage_handoff_pc_dark.png");
    const pcDarkArtifact = path.join(ARTIFACTS_DIR, "proof_visit_plan_stage_handoff_pc_dark.png");
    await page.screenshot({ path: pcDarkPath, fullPage: false });
    fs.copyFileSync(pcDarkPath, pcDarkArtifact);
    console.log("Saved Proof (PC Dark):", pcDarkPath);

    console.log("=== Capture completed successfully ===");
  } finally {
    await browser.close();
  }
}

run().catch((err) => {
  console.error("Capture script failed:", err);
  process.exit(1);
});
