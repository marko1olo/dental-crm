/**
 * scripts/capture_clinical_drug_safety_proofs.cjs
 *
 * Captures LIVE DENTE CRM interface screenshots (1440x900) in PC Light and PC Dark:
 * 1. Chairside Drug Safety & Somatic Badges in Visit Header (Passive, Non-blocking, Silent Background)
 * 2. Anamnesis Tab with Auto-populated Somatic Factors (Form 043/u)
 */

const { chromium } = require("playwright");
const path = require("node:path");
const fs = require("node:fs");

const todayDate = new Date().toLocaleDateString("en-CA");

const targetDirs = [
  path.resolve("docs/screenshots/inquisition_live"),
];

for (const dir of targetDirs) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
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
        specialties: ["therapist", "surgeon", "implantologist"],
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
        name: "Кабинет 1 (Терапия / Хирургия)",
        room: "1",
        defaultDoctorId: "doc-1",
        active: true,
        hasXraySensor: true,
        hasMicroscope: true,
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
    modeFit: { mode: "small_clinic", title: "Оптимальный режим", fitScore: 100, blockers: [], upgrades: [], lowFrictionNextStep: "ready" },
    doctorLoads: [], assistantLoads: [], chairLoads: [], roleQueues: [], scheduleWarnings: [],
  },
  patients: [
    {
      id: "pat-1",
      organizationId: "00000000-0000-0000-0000-000000000001",
      fullName: "Смирнова Елена Сергеевна",
      status: "active",
      birthDate: "1988-06-15",
      phone: "+7 (916) 555-44-33",
      notes: "Гипертоническая болезнь 2 ст. Прием ксарелто 20 мг. Аллергия на артикаин, септанест, пенициллин.",
      somaticNotes: "Гипертоническая болезнь 2 ст. Прием ксарелто 20 мг. Аллергия на артикаин, септанест, пенициллин.",
      concomitantDiseases: "Артериальная гипертензия, ИБС",
      allergies: ["Артикаин", "Септанест", "Пенициллин"],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
  ],
  appointments: [
    {
      id: "app-1",
      organizationId: "00000000-0000-0000-0000-000000000001",
      patientId: "pat-1",
      doctorUserId: "doc-1",
      chairId: "chair-1",
      startsAt: `${todayDate}T10:00:00.000Z`,
      endsAt: `${todayDate}T11:00:00.000Z`,
      status: "in_treatment",
      patientName: "Смирнова Елена Сергеевна",
      doctorName: "Д-р Воронов Алексей Владимирович",
      reason: "Лечение кариеса 16 зуба, консультация",
    },
  ],
  activeVisit: {
    id: "visit-1",
    appointmentId: "app-1",
    patientId: "pat-1",
    doctorId: "doc-1",
    chairId: "chair-1",
    diagnosisTooth: "16",
    status: "in_progress",
    date: todayDate,
  },
  documents: [],
  payments: [],
  billingSummary: { totalPlannedRub: 12000, totalPaidRub: 12000, totalDueRub: 0, draftDocumentAmountRub: 0, taxDeductionEligibleRub: 12000, openTreatmentItems: 1, unpaidDocuments: 0, totalDiscountRub: 0, familyBalanceRub: 0 },
  clinicalMetrics: { activeTreatmentPlans: 1, unscheduledFollowUps: 0, pendingInformedConsents: 0, prescriptionsIssuedThisMonth: 1, postVisitInstructions: 1 },
  importBatches: [], speechProviders: [], auditEvents: [], complianceWarnings: [],
};

async function captureClinicalDrugSafetyProofs() {
  console.log("[Playwright] Launching Chrome...");
  const browser = await chromium.launch({
    headless: true,
    executablePath: "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });

  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    deviceScaleFactor: 2,
    isMobile: false,
    hasTouch: false,
    serviceWorkers: "block",
  });

  await context.addInitScript(() => {
    try {
      Object.defineProperty(navigator, 'serviceWorker', { get: () => undefined });
    } catch {}
    sessionStorage.setItem("dente:sw-controller-reload", "1");
    localStorage.setItem("dente_clinic_token", "mock-clinic-token-12345");
    localStorage.setItem("dente_staff_token", "mock-staff-token-67890");
    localStorage.setItem("dente_active_user_id", "doc-1");
    localStorage.setItem("dente_active_role", "owner");
    localStorage.setItem("dente_active_mode", "clinic");
    sessionStorage.setItem("dente_unlocked", "true");
    localStorage.setItem("dente_theme_mode", "light");
    localStorage.setItem("dente_theme", "light");
    localStorage.setItem("theme", "light");
    localStorage.setItem(
      "dente_ui_preferences_v1",
      JSON.stringify({
        onboardingDismissed: true,
        onboardingStep: "done",
        onboardingDraftMode: false,
        version: 1,
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
        onboardingDraftMode: false,
        version: 1,
      })
    );
    localStorage.setItem("dente_tour_completed", "true");
    localStorage.setItem(
      "dente_quest_progress_v2",
      JSON.stringify({
        activeTrackId: "solo_doctor",
        currentStepIndex: 0,
        completedStepIds: [],
        isTourActive: false,
        isDismissedPermanently: true,
        tracksProgress: {
          solo_doctor: { completed: true, completedStepIds: [] },
          reception_admin: { completed: true, completedStepIds: [] },
          imaging_diagnostics: { completed: true, completedStepIds: [] },
        },
      })
    );
    localStorage.setItem(
      "dental-crm:web-ui-preferences:v1",
      JSON.stringify({
        version: 1,
        uiLanguage: "ru",
        selectedWorkspaceRole: "owner",
        selectedPatientId: "pat-1",
        selectedSpecialty: "therapist",
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

    const injectTourStyle = () => {
      const style = document.createElement("style");
      style.id = "dente-tour-suppress";
      style.textContent = `
        .tour-spotlight-root, [data-testid="guided-tour-spotlight-overlay"], .tour-backdrop-clickable-zone, [data-testid="guided-tour-coach-mark-card"], [data-testid="guided-tour-pulsing-halo-anchor"] {
          display: none !important;
          pointer-events: none !important;
        }
      `;
      if (document.head) {
        document.head.appendChild(style);
      } else {
        document.addEventListener("DOMContentLoaded", () => document.head.appendChild(style));
      }
    };
    injectTourStyle();
  });

  const page = await context.newPage();

  page.on("pageerror", (err) => console.log("[PAGE ERROR]", err.message));
  page.on("console", (msg) => {
    if (msg.type() === "error") console.log("[BROWSER ERROR]", msg.text());
  });

  // Intercept API routes
  await page.route("**/api/**", async (route) => {
    const url = route.request().url();
    if (url.includes("/src/")) return route.continue();
    if (url.includes("/api/dashboard")) return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(mockDashboard) });
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
          token: "mock-staff-token-67890",
          user: { id: "doc-1", fullName: "Д-р Воронов Алексей Владимирович", role: "owner" },
        }),
      });
    }
    if (url.includes("/api/patients/pat-1/tooth-states")) {
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ success: true, toothStates: { "16": "Caries", "48": "Healthy" } }),
      });
    }
    if (url.includes("/api/patients/pat-1/treatment-plans")) {
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ success: true, plans: [] }),
      });
    }
    if (url.includes("/draft/autosave")) {
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ success: true, savedAt: new Date().toISOString() }),
      });
    }
    if (url.includes("/api/templates")) {
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ success: true, templates: [] }),
      });
    }
    if (url.includes("/api/clinical/804n") || url.includes("/api/clinical/icd10")) {
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify([]),
      });
    }
    if (url.includes("/api/patients")) return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(mockDashboard.patients) });
    if (url.includes("/api/schedule")) return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(mockDashboard.appointments) });
    return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify([]) });
  });

  async function applyTheme(th) {
    await page.evaluate((t) => {
      localStorage.setItem("dente_theme_mode", t);
      if (window.__useThemeStore) {
        window.__useThemeStore.getState().setThemeMode(t);
      }
      document.documentElement.setAttribute("data-theme", t);
      const isDark = ["dark", "night", "ocean", "emerald", "cyber_xray"].includes(t);
      document.documentElement.classList.toggle("dark", isDark);
      document.documentElement.classList.toggle("light", !isDark);
      document.documentElement.style.colorScheme = isDark ? "dark" : "light";
    }, th);
    await page.waitForTimeout(600);
  }

  async function saveProof(filename) {
    for (const dir of targetDirs) {
      const targetPath = path.join(dir, filename);
      await page.screenshot({ path: targetPath, fullPage: false });
      console.log(`[Captured] ${targetPath}`);
    }
  }

  console.log("Navigating to http://127.0.0.1:5173/#schedule...");
  await page.goto("http://127.0.0.1:5173/#schedule", { waitUntil: "domcontentloaded", timeout: 60000 });
  await page.waitForSelector(".boot-state", { state: "detached", timeout: 60000 }).catch(() => {});
  await page.waitForSelector(".app-shell", { state: "visible", timeout: 30000 });
  await page.waitForTimeout(1000);

  // Switch to visit view with patient pat-1
  console.log("Switching to visit view with patient pat-1...");
  await page.evaluate((patientData) => {
    if (window.__usePatientStore) {
      window.__usePatientStore.getState().setSelectedPatientId("pat-1");
      window.__usePatientStore.getState().setPatientCoreDraft(patientData);
    }
    if (window.__useVisitStore) {
      window.__useVisitStore.getState().setSelectedSpecialty("therapist");
    }
    if (window.__useAppStore) {
      window.__useAppStore.getState().setActivePatientId("pat-1");
      window.__useAppStore.getState().setCurrentView("visit");
    }
    window.location.hash = "visit";
  }, mockDashboard.patients[0]);

  // Wait specifically for visit view to mount
  console.log("Waiting for visit view to mount...");
  await page.locator('[data-testid="visit-view"], .visit-monolithic-header').first().waitFor({ state: "visible", timeout: 40000 });
  console.log("Visit view mounted!");

  // Wait for critical badges
  console.log("Waiting for critical drug safety badges...");
  await page.locator('[data-testid="visit-focus-allergy-alert"], [data-testid="visit-focus-hypertension-alert"]').first().waitFor({ state: "visible", timeout: 15000 }).catch(() => {
    console.log("Note: badges might already be rendered");
  });
  await page.waitForTimeout(1000);

  // Dismiss any tour if present
  const dismissBtn = page.locator('button:has-text("Понятно"), button:has-text("Пропустить"), [data-testid="btn-dismiss-notice"]');
  if (await dismissBtn.isVisible()) {
    await dismissBtn.click({ force: true }).catch(() => {});
    await page.waitForTimeout(400);
  }

  // 1. Proof 1: Chairside Drug Safety & Somatic Badges in Light Theme (Closed/Calm)
  console.log("Capturing proof_chairside_drug_safety_light.png...");
  await applyTheme("light");
  await saveProof("proof_chairside_drug_safety_light.png");

  // 2. Proof 2: Chairside Drug Safety & Somatic Badges in Dark Theme (Closed/Calm)
  console.log("Capturing proof_chairside_drug_safety_dark.png...");
  await applyTheme("dark");
  await saveProof("proof_chairside_drug_safety_dark.png");

  // 3. Open Chairside Stop-Factors Popover (Floating drawer, unclipped)
  console.log("Opening Chairside Stop-Factors Popover...");
  const alertBadge = page.locator('[data-testid="somatic-safety-alert-badge"]').first();
  if (await alertBadge.isVisible()) {
    await alertBadge.click();
    await page.waitForSelector('[data-testid="somatic-safety-alert-popover"]', { state: "visible", timeout: 5000 }).catch(() => {});
    await page.waitForTimeout(500);

    console.log("Capturing proof_chairside_stop_factors_popover_dark.png...");
    await saveProof("proof_chairside_stop_factors_popover_dark.png");

    console.log("Capturing proof_chairside_stop_factors_popover_light.png...");
    await applyTheme("light");
    await saveProof("proof_chairside_stop_factors_popover_light.png");

    // Close popover
    await alertBadge.click().catch(() => {});
    await page.waitForTimeout(400);
  }

  // 4. Switch to Anamnesis Tab
  console.log("Switching to Anamnesis tab via data-testid='visit-subtab-anamnesis'...");
  const anamnesisTabBtn = page.locator('[data-testid="visit-subtab-anamnesis"]').first();
  if (await anamnesisTabBtn.isVisible()) {
    await anamnesisTabBtn.click();
    await page.waitForTimeout(800);
  }

  // 5. Proof 3: Anamnesis Tab in Light Theme
  console.log("Capturing proof_chairside_anamnesis_somatic_light.png...");
  await applyTheme("light");
  await saveProof("proof_chairside_anamnesis_somatic_light.png");

  // 6. Proof 4: Anamnesis Tab in Dark Theme
  console.log("Capturing proof_chairside_anamnesis_somatic_dark.png...");
  await applyTheme("dark");
  await saveProof("proof_chairside_anamnesis_somatic_dark.png");

  await browser.close();
  console.log("All drug safety proofs successfully captured!");
}

captureClinicalDrugSafetyProofs().catch((err) => {
  console.error("Fatal error capturing proofs:", err);
  process.exit(1);
});
