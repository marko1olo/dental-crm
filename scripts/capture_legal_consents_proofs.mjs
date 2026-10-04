import { chromium } from "playwright";
import path from "node:path";
import fs from "node:fs";
import { generatePrimaryIntakePackageHtml } from "../apps/web/src/components/documents/primaryIntakePackagePrintEngine.ts";

const repoOutDir = path.resolve("C:/Clinic_MVP/dental-crm/docs/screenshots/legal_consents_proofs");
const brainOutDir = path.resolve("C:/Users/Admin/.gemini/antigravity/brain/392c9591-0a0f-4cd0-995c-9dc7c28f2938/screenshots");

for (const dir of [repoOutDir, brainOutDir]) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

function saveDualScreenshot(buffer, filename) {
  const p1 = path.join(repoOutDir, filename);
  const p2 = path.join(brainOutDir, filename);
  fs.writeFileSync(p1, buffer);
  fs.writeFileSync(p2, buffer);
  console.log(`[Captured] ${filename} -> ${p1} (${buffer.length} bytes)`);
}

const mockDashboard = {
  clinicName: "Стоматология ДЕНТЕ Премиум",
  todayIso: new Date().toLocaleDateString("en-CA"),
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
        specialties: ["therapist", "orthopedist", "surgeon", "orthodontist"],
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
        name: "Кабинет 1 (Терапия и Хирургия)",
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
      id: "pat-minor-1",
      organizationId: "00000000-0000-0000-0000-000000000001",
      fullName: "Ковалёв Артём Романович",
      status: "active",
      birthDate: "2014-06-15",
      phone: "+7 (999) 111-22-33",
      notes: "Первичный приём: плановая санация, консультация ортодонта",
      allergies: [],
      administrativeProfile: {
        legalRepresentative: {
          fullName: "Ковалёва Анна Сергеевна",
          relationship: "Мать",
          phone: "+7 (999) 777-88-99",
          passportSeries: "4514",
          passportNumber: "987654",
          passportIssuedBy: "ГУ МВД России по г. Москве",
          passportIssuedDate: "2015-08-20",
          passportDepartmentCode: "770-025",
          basisDocument: "Свидетельство о рождении серии II-МЮ № 345678 от 25.06.2014 г.",
        },
      },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
  ],
  appointments: [
    {
      id: "app-1",
      patientId: "pat-minor-1",
      doctorId: "doc-1",
      chairId: "chair-1",
      date: new Date().toLocaleDateString("en-CA"),
      startTime: "11:00",
      endTime: "12:00",
      status: "in_progress",
      type: "treatment",
      patientName: "Ковалёв Артём Романович",
      doctorName: "Д-р Воронов Алексей Владимирович",
      reason: "Первичный приём (несовершеннолетний пациент)",
    },
  ],
  documents: [],
  payments: [],
  billingSummary: {
    totalPlannedRub: 0,
    totalPaidRub: 0,
    totalDueRub: 0,
    draftDocumentAmountRub: 0,
    taxDeductionEligibleRub: 0,
    openTreatmentItems: 0,
    unpaidDocuments: 0,
    totalDiscountRub: 0,
    familyBalanceRub: 0,
  },
  clinicalMetrics: {
    activeTreatmentPlans: 0,
    unscheduledFollowUps: 0,
    pendingInformedConsents: 1,
    prescriptionsIssuedThisMonth: 0,
    postVisitInstructions: 0,
  },
  importBatches: [],
  speechProviders: [],
  auditEvents: [],
  complianceWarnings: [],
};

async function setupContextAndMocks(browser, themeMode) {
  const ctx = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    deviceScaleFactor: 2,
    isMobile: false,
    hasTouch: false,
  });

  await ctx.addInitScript(
    ({ ct, st, uid, pid, tm }) => {
      localStorage.setItem("dente_clinic_token", ct);
      localStorage.setItem("dente_staff_token", st);
      localStorage.setItem("dente_active_role", "owner");
      localStorage.setItem("dente_theme_mode", tm);
      localStorage.setItem("dente_onboarding_completed", "true");
      localStorage.setItem("dente_onboarding_dismissed", "true");
      localStorage.setItem("dente_tour_completed", "true");
      localStorage.setItem(
        "dente_quest_progress_v2",
        JSON.stringify({
          currentTrackId: "solo_doctor",
          currentStepIndex: 0,
          completedStepIds: [],
          completedTrackIds: ["solo_doctor", "reception_admin", "imaging_diagnostics"],
          isTourActive: false,
          isDismissedPermanently: true,
          isPaused: true,
          lastInteractionTimestamp: Date.now(),
        })
      );
      localStorage.setItem(
        "dente_ui_preferences_v1",
        JSON.stringify({
          onboardingDismissed: true,
          onboardingDraftMode: false,
          onboardingStep: "done",
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
          version: 1,
        })
      );
      localStorage.setItem(
        "dental-crm:web-ui-preferences:v1",
        JSON.stringify({
          version: 1,
          uiLanguage: "ru",
          selectedWorkspaceRole: "owner",
          selectedPatientId: pid,
          onboardingDismissed: true,
          onboardingStep: "done",
        })
      );
      localStorage.setItem("dente_active_staff_user", JSON.stringify(staffUser));
    },
    {
      ct: "dente-offline-clinic-token",
      st: "dente-offline-staff-token",
      uid: "doc-1",
      pid: "pat-minor-1",
      tm: themeMode,
      staffUser: mockDashboard.clinicSettings.staff[0],
    }
  );

  const page = await ctx.newPage();

  await page.route("**/api/**", async (route) => {
    const url = route.request().url();
    if (url.includes("/src/")) return route.continue();
    if (url.includes("/api/dashboard")) {
      return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(mockDashboard) });
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
          token: "dente-offline-staff-token",
          user: { id: "doc-1", fullName: "Д-р Воронов Алексей Владимирович", role: "owner" },
        }),
      });
    }
    if (url.includes("/api/patients")) {
      return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(mockDashboard.patients) });
    }
    if (url.includes("/api/documents")) {
      return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(mockDashboard.documents) });
    }
    if (url.includes("/api/schedule")) {
      return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(mockDashboard.appointments) });
    }
    return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(url.includes("list") || url.includes("status") ? [] : {}) });
  });

  return { ctx, page };
}

async function captureModalForTheme(browser, themeMode, outputFilename) {
  console.log(`\n--- Starting capture for theme: ${themeMode} (${outputFilename}) ---`);
  const { ctx, page } = await setupContextAndMocks(browser, themeMode);

  console.log(`Navigating to http://127.0.0.1:5173/#documents for ${themeMode}...`);
  await page.goto("http://127.0.0.1:5173/#documents", { waitUntil: "domcontentloaded", timeout: 60000 });
  await page.waitForSelector(".boot-state", { state: "detached", timeout: 60000 }).catch(() => {});
  await page.waitForSelector(".app-shell", { state: "visible", timeout: 30000 });
  await page.waitForSelector("#documents, .documents-panel", { state: "visible", timeout: 30000 });
  await page.waitForTimeout(1000);

  // Set theme attributes on HTML element
  await page.evaluate((tm) => {
    document.documentElement.setAttribute("data-theme", tm);
    const isDark = tm === "dark";
    document.documentElement.classList.toggle("dark", isDark);
    document.documentElement.classList.toggle("light", !isDark);
    document.documentElement.style.colorScheme = isDark ? "dark" : "light";
    document.querySelectorAll("[data-testid='doctor-training-coach-mark-card'], [data-testid='guided-tour-spotlight-overlay'], .tour-spotlight-root, .tour-backdrop-clickable-zone").forEach((el) => el.remove());
  }, themeMode);
  await page.waitForTimeout(500);

  // Wait for and click .document-intake-open-modal-btn or data-testid="scenario-primary-intake-btn"
  console.log("Triggering .document-intake-open-modal-btn...");
  const btnSelector = ".document-intake-open-modal-btn, [data-testid='scenario-primary-intake-btn']";
  await page.waitForSelector(btnSelector, { state: "visible", timeout: 15000 });
  await page.click(btnSelector);

  await page.waitForSelector(".document-package-modal-content", { state: "visible", timeout: 10000 });
  await page.waitForTimeout(500);

  // Open the "Ещё" menu to reveal the clean autoclaving title
  console.log("Clicking More menu button inside modal...");
  const moreSelector = "button[data-testid='primary-intake-more-btn']";
  await page.waitForSelector(moreSelector, { state: "visible", timeout: 5000 });
  await page.click(moreSelector);

  await page.waitForSelector("[data-testid='primary-intake-more-menu']", { state: "visible", timeout: 5000 });
  await page.waitForTimeout(500);

  console.log(`Capturing full CRM screenshot: ${outputFilename}...`);
  const buf = await page.screenshot({ fullPage: false });
  saveDualScreenshot(buf, outputFilename);

  await ctx.close();
}

async function main() {
  console.log("[Playwright] Launching Chrome executable...");
  const browser = await chromium.launch({
    headless: true,
    executablePath: "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });

  // 1. Capture Primary Intake Modal in PC Light (in live CRM UI 1440x900)
  await captureModalForTheme(browser, "light", "primary_intake_modal_desktop_light.png");

  // 2. Capture Primary Intake Modal in PC Dark (in live CRM UI 1440x900)
  await captureModalForTheme(browser, "dark", "primary_intake_modal_desktop_dark.png");

  // 3. Render and Capture Statutory Blanks (A4 sheets)
  console.log("\n--- Rendering Statutory Blanks (A4 sheets) ---");
  const minorPatientOptions = {
    patient: {
      fullName: "Ковалёв Артём Романович",
      birthDate: "2014-06-15",
      phone: "+7 (999) 111-22-33",
      cardNumber: "043-00892",
      gender: "Мужской",
      address: "г. Москва, ул. Арбат, д. 25, кв. 14",
      registrationAddress: "г. Москва, ул. Арбат, д. 25, кв. 14",
    },
    representative: {
      fullName: "Ковалёва Анна Сергеевна",
      relationship: "Мать",
      phone: "+7 (999) 777-88-99",
      passportSeries: "4514",
      passportNumber: "987654",
      passportIssuedBy: "ГУ МВД России по г. Москве",
      passportIssuedDate: "2015-08-20",
      passportDepartmentCode: "770-025",
      basisDocument: "Свидетельство о рождении серии II-МЮ № 345678 от 25.06.2014 г.",
    },
    clinic: {
      legalName: "ООО «Стоматологическая клиника ДЕНТЕ»",
      clinicName: "Стоматология ДЕНТЕ Премиум",
      inn: "7701234567",
      kpp: "770101001",
      ogrn: "1237700123456",
      licenseNumber: "ЛО41-01137-77/00584930",
      licenseDate: "2022-04-12",
      address: "г. Москва, Столярный пер., д. 14",
      actualAddress: "г. Москва, Столярный пер., д. 14",
      phone: "+7 (495) 123-45-67",
      bankName: "ПАО СБЕРБАНК г. Москва",
      bik: "044525225",
      checkingAccount: "40702810138000012345",
      corrAccount: "30101810400000000225",
      directorTitle: "Генеральный директор",
      directorFullName: "Воронов А. В.",
      city: "Москва",
      website: "https://dente-clinic.ru",
    },
    doctorFullName: "Д-р Воронов Алексей Владимирович",
    intakeNormApplied: true,
    questionnaireAnswers: {
      complaint: "Плановый осмотр и консультация ортодонта",
      allergies: "Отрицает, аллергических реакций на местные анестетики нет",
      medications: "Не принимает",
      chronic: "Соматически здоров, хронических заболеваний нет",
      anticoagulants: "Не принимает",
      infections: "Отрицает (гепатит, ВИЧ, туберкулез — отр.)",
      cardioEndocrine: "Без патологии, АД и сахар в норме",
      pregnancy: "Не применимо",
    },
  };

  const minorHtml = generatePrimaryIntakePackageHtml(minorPatientOptions);

  const a4Context = await browser.newContext({
    viewport: { width: 1200, height: 1680 },
    deviceScaleFactor: 2,
    isMobile: false,
  });
  const a4Page = await a4Context.newPage();
  await a4Page.setContent(minorHtml, { waitUntil: "load" });
  await a4Page.waitForTimeout(600);

  const sheets = a4Page.locator(".print-sheet");
  const sheetCount = await sheets.count();
  console.log(`Found ${sheetCount} printed sheets in minor package HTML.`);

  if (sheetCount >= 1) {
    console.log("Capturing statutory_blank_1_contract736_minor_representative.png...");
    const b1Buf = await sheets.nth(0).screenshot();
    saveDualScreenshot(b1Buf, "statutory_blank_1_contract736_minor_representative.png");
  }

  if (sheetCount >= 2) {
    console.log("Capturing statutory_blank_2_ids1051n_minor_representative.png...");
    const b2Buf = await sheets.nth(1).screenshot();
    saveDualScreenshot(b2Buf, "statutory_blank_2_ids1051n_minor_representative.png");
  }

  if (sheetCount >= 3) {
    console.log("Capturing statutory_blank_3_consent152fz_minor_representative.png...");
    const b3Buf = await sheets.nth(2).screenshot();
    saveDualScreenshot(b3Buf, "statutory_blank_3_consent152fz_minor_representative.png");
  }

  if (sheetCount >= 4) {
    console.log("Capturing statutory_blank_4_questionnaire043u_minor_representative.png...");
    const b4Buf = await sheets.nth(3).screenshot();
    saveDualScreenshot(b4Buf, "statutory_blank_4_questionnaire043u_minor_representative.png");
  }

  // 4. Zero-Mock Production Blank (clean underlines «______________»)
  console.log("\nGenerating Zero-Mock Production Blank (no mock clinic, no mock patient)...");
  const zeroMockOptions = {
    patient: null,
    representative: null,
    clinic: {
      clinicName: "Стоматологическая клиника",
      legalName: "",
      inn: "",
      licenseNumber: "",
      address: "",
      phone: "",
    },
    doctorFullName: null,
    intakeNormApplied: false,
  };

  const zeroMockHtml = generatePrimaryIntakePackageHtml(zeroMockOptions);
  await a4Page.setContent(zeroMockHtml, { waitUntil: "load" });
  await a4Page.waitForTimeout(600);

  const zeroSheets = a4Page.locator(".print-sheet");
  if ((await zeroSheets.count()) >= 1) {
    console.log("Capturing statutory_blank_zero_mock_clean_underlines.png...");
    const zmBuf = await zeroSheets.nth(0).screenshot();
    saveDualScreenshot(zmBuf, "statutory_blank_zero_mock_clean_underlines.png");
  }

  await browser.close();
  console.log("\n=== ALL SCREENSHOTS SUCCESSFULLY CAPTURED ===");
}

main().catch((err) => {
  console.error("FATAL ERROR in capture_legal_consents_proofs:", err);
  process.exit(1);
});
