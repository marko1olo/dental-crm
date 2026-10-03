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
        name: "Кабинет 1 (Хирургия и Ортодонтия)",
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
      notes: "Подготовка к остеопластике и элайнерам.",
      allergies: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
  ],
  appointments: [
    {
      id: "app-1",
      patientId: "pat-1",
      doctorId: "doc-1",
      chairId: "chair-1",
      date: todayDate,
      startTime: "10:00",
      endTime: "11:00",
      status: "in_progress",
      type: "treatment",
      patientName: "Ковалёв Роман Станиславович",
      doctorName: "Д-р Воронов Алексей Владимирович",
      reason: "Консультация: костная пластика и элайнеры",
    },
  ],
  documents: [
    {
      id: "doc-issued-1",
      patientId: "pat-1",
      kind: "paid_medical_services_contract",
      number: "ДОГ-2026-0041",
      status: "issued",
      createdAt: new Date().toISOString(),
      issuedAt: new Date().toISOString(),
      title: "Договор на оказание платных медицинских услуг",
      totalAmountRub: 25000,
    },
    {
      id: "doc-issued-2",
      patientId: "pat-1",
      kind: "informed_voluntary_consent",
      number: "ИДС-2026-0082",
      status: "issued",
      createdAt: new Date().toISOString(),
      issuedAt: new Date().toISOString(),
      title: "Информированное добровольное согласие на медицинское вмешательство",
      totalAmountRub: 0,
    },
  ],
  payments: [],
  billingSummary: {
    totalPlannedRub: 25000,
    totalPaidRub: 25000,
    totalDueRub: 0,
    draftDocumentAmountRub: 0,
    taxDeductionEligibleRub: 25000,
    openTreatmentItems: 1,
    unpaidDocuments: 0,
    totalDiscountRub: 0,
    familyBalanceRub: 0,
  },
  clinicalMetrics: {
    activeTreatmentPlans: 1,
    unscheduledFollowUps: 0,
    pendingInformedConsents: 0,
    prescriptionsIssuedThisMonth: 2,
    postVisitInstructions: 1,
  },
  importBatches: [],
  speechProviders: [],
  auditEvents: [],
  complianceWarnings: [],
};

async function captureClinicalConsentsProofs() {
  const outDir = path.resolve("C:/Clinic_MVP/dental-crm/docs/screenshots/inquisition_live");
  if (!fs.existsSync(outDir)) {
    fs.mkdirSync(outDir, { recursive: true });
  }

  console.log("[Playwright] Launching Chrome executable...");
  const browser = await chromium.launch({
    headless: true,
    executablePath: "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });

  const desktopContext = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    deviceScaleFactor: 2,
    isMobile: false,
    hasTouch: false,
  });

  const initAuth = async (ctx) => {
    await ctx.addInitScript(
      ({ ct, st, uid, pid }) => {
        localStorage.setItem("dente_clinic_token", ct);
        localStorage.setItem("dente_staff_token", st);
        localStorage.setItem("dente_active_role", "owner");
        localStorage.setItem("dente_theme_mode", "light");
        localStorage.setItem("dente_onboarding_completed", "true");
        localStorage.setItem("dente_onboarding_dismissed", "true");
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
      },
      {
        ct: "live-inquisition-clinic-token",
        st: "live-inquisition-staff-token",
        uid: "doc-1",
        pid: "pat-1",
      }
    );
  };

  await initAuth(desktopContext);
  const page = await desktopContext.newPage();

  // Route interception
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
          token: "live-inquisition-staff-token",
          user: { id: "doc-1", fullName: "Д-р Воронов Алексей Владимирович", role: "owner" },
        }),
      });
    }
    if (url.includes("/api/documents")) return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(mockDashboard.documents) });
    if (url.includes("/api/patients")) return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(mockDashboard.patients) });
    if (url.includes("/api/schedule")) return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(mockDashboard.appointments) });
    return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(url.includes("list") || url.includes("status") ? [] : {}) });
  });

  async function applyTheme(p, th) {
    await p.waitForFunction(() => typeof window !== "undefined" && Boolean(window.__useThemeStore), { timeout: 20000 }).catch(() => {});
    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        await p.evaluate((t) => {
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
        await p.waitForTimeout(600);
        break;
      } catch (err) {
        if (attempt === 3) throw err;
        await p.waitForTimeout(400);
      }
    }
  }

  console.log("\nNavigating to #documents...");
  await page.goto("http://127.0.0.1:5173/#documents", { waitUntil: "domcontentloaded", timeout: 60000 });
  await page.waitForSelector(".boot-state", { state: "detached", timeout: 60000 });
  await page.waitForSelector(".app-shell", { state: "visible", timeout: 30000 });
  await page.waitForSelector("#documents, .documents-panel", { state: "visible", timeout: 30000 });
  await page.waitForTimeout(1000);

  // Dismiss any lingering onboarding modal
  await page.evaluate(() => {
    const dismissBtn = Array.from(document.querySelectorAll("button")).find(
      (b) => b.textContent && (b.textContent.includes("Больше не показывать") || b.textContent.includes("Пропустить"))
    );
    if (dismissBtn) dismissBtn.click();
  });
  await page.waitForTimeout(500);

  // 1. Expand Document Templates Catalog
  console.log("Opening Document Templates Catalog...");
  await page.evaluate(() => {
    const details = document.querySelector(".document-templates-collapsible");
    if (details) {
      details.setAttribute("open", "true");
      details.scrollIntoView({ behavior: "instant", block: "center" });
    }
  });
  await page.waitForTimeout(600);

  // Capture DocumentTemplatesCatalog Light
  console.log("Capturing DocumentTemplatesCatalog Light...");
  await applyTheme(page, "light");
  await page.waitForTimeout(500);
  const catalogLight = path.join(outDir, "clinical_templates_catalog_desktop_light.png");
  await page.screenshot({ path: catalogLight, fullPage: false });
  console.log(`[Captured] ${catalogLight} (${fs.statSync(catalogLight).size} bytes)`);

  // Capture DocumentTemplatesCatalog Dark
  console.log("Capturing DocumentTemplatesCatalog Dark...");
  await applyTheme(page, "dark");
  await page.waitForTimeout(500);
  const catalogDark = path.join(outDir, "clinical_templates_catalog_desktop_dark.png");
  await page.screenshot({ path: catalogDark, fullPage: false });
  console.log(`[Captured] ${catalogDark} (${fs.statSync(catalogDark).size} bytes)`);

  // 2. Select procedure_specific_consent_packet
  console.log("Selecting procedure_specific_consent_packet...");
  await page.evaluate(() => {
    const details = document.querySelector(".document-templates-collapsible");
    if (details) details.removeAttribute("open");

    const select = document.querySelector("#document-kind-selector");
    if (select) {
      select.value = "procedure_specific_consent_packet";
      select.dispatchEvent(new Event("change", { bubbles: true }));
    }
    const form = document.querySelector(".document-form-switch, .document-factory");
    if (form) {
      form.scrollIntoView({ behavior: "instant", block: "start" });
    }
  });
  await page.waitForTimeout(1000);

  // Capture ProcedureSpecificConsentForm Dark
  console.log("Capturing ProcedureSpecificConsentForm Dark...");
  const consentDark = path.join(outDir, "clinical_procedure_consent_desktop_dark.png");
  await page.screenshot({ path: consentDark, fullPage: false });
  console.log(`[Captured] ${consentDark} (${fs.statSync(consentDark).size} bytes)`);

  // Capture ProcedureSpecificConsentForm Light
  console.log("Capturing ProcedureSpecificConsentForm Light...");
  await applyTheme(page, "light");
  await page.waitForTimeout(600);
  const consentLight = path.join(outDir, "clinical_procedure_consent_desktop_light.png");
  await page.screenshot({ path: consentLight, fullPage: false });
  console.log(`[Captured] ${consentLight} (${fs.statSync(consentLight).size} bytes)`);

  // 3. Switch to post_visit_recommendations
  console.log("Selecting post_visit_recommendations...");
  await page.evaluate(() => {
    const select = document.querySelector("#document-kind-selector");
    if (select) {
      select.value = "post_visit_recommendations";
      select.dispatchEvent(new Event("change", { bubbles: true }));
    }
    const form = document.querySelector(".document-form-switch, .document-factory");
    if (form) {
      form.scrollIntoView({ behavior: "instant", block: "start" });
    }
  });
  await page.waitForTimeout(1000);

  // Capture PostVisitRecommendationsForm Light
  console.log("Capturing PostVisitRecommendationsForm Light...");
  const memoLight = path.join(outDir, "clinical_aftercare_memo_desktop_light.png");
  await page.screenshot({ path: memoLight, fullPage: false });
  console.log(`[Captured] ${memoLight} (${fs.statSync(memoLight).size} bytes)`);

  // Capture PostVisitRecommendationsForm Dark
  console.log("Capturing PostVisitRecommendationsForm Dark...");
  await applyTheme(page, "dark");
  await page.waitForTimeout(500);
  const memoDark = path.join(outDir, "clinical_aftercare_memo_desktop_dark.png");
  await page.screenshot({ path: memoDark, fullPage: false });
  console.log(`[Captured] ${memoDark} (${fs.statSync(memoDark).size} bytes)`);

  await desktopContext.close();
  await browser.close();
  console.log("\nAll clinical consent and memo proofs captured successfully!");
}

captureClinicalConsentsProofs().catch((err) => {
  console.error("Screenshot capture failed:", err);
  process.exit(1);
});
