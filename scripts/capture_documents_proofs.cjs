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
        specialties: ["therapist", "orthopedist"],
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
      notes: "Первичный осмотр. Жалобы на чувствительность 46 зуба.",
      allergies: ["Лидокаин (анамнестически)"],
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
      reason: "Лечение кариеса 46 зуба",
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
      title: "Информированное добровольное согласие (терапия)",
      totalAmountRub: 0,
    },
    {
      id: "doc-issued-3",
      patientId: "pat-1",
      kind: "dental_medical_card_043u",
      number: "043-2026-0112",
      status: "issued",
      createdAt: new Date().toISOString(),
      issuedAt: new Date().toISOString(),
      title: "Медицинская карта стоматологического пациента (043/у)",
      totalAmountRub: 0,
    },
  ],
  payments: [
    {
      id: "pay-1",
      patientId: "pat-1",
      amountRub: 12500,
      method: "card",
      fiscalReceiptNumber: "ФЧ-000892",
      fiscalReceiptIssuedAt: new Date().toISOString(),
      note: "Оплата за комплексное терапевтическое лечение",
    },
  ],
  billingSummary: {
    totalPlannedRub: 12500,
    totalPaidRub: 12500,
    totalDueRub: 0,
    draftDocumentAmountRub: 0,
    taxDeductionEligibleRub: 12500,
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
    postVisitInstructions: 0,
  },
  importBatches: [],
  speechProviders: [],
  auditEvents: [],
  complianceWarnings: [],
};

async function captureDocumentsProofs() {
  const targetDirs = [
    path.resolve("C:/Clinic_MVP/dental-crm/docs/screenshots/inquisition_live"),
    path.resolve("C:/Users/Admin/.gemini/antigravity/brain/a84df016-a7cc-461c-ba80-899ae84de477/screenshots"),
    path.resolve("C:/Users/Admin/.gemini/antigravity/brain/074e0e86-2ad9-4e4b-a4af-77c3968931c4/screenshots"),
  ];

  for (const d of targetDirs) {
    if (!fs.existsSync(d)) {
      fs.mkdirSync(d, { recursive: true });
    }
  }

  const outDir = targetDirs[0];

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
        localStorage.setItem(
          "dente_ui_preferences_v1",
          JSON.stringify({
            onboardingDismissed: true,
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
        localStorage.setItem(
          "dente-workspace-profile",
          JSON.stringify({
            state: {
              clinicName: "Стоматология ДЕНТЕ Премиум",
              currentDoctor: { id: uid, fullName: "Д-р Воронов А. В.", role: "owner" },
              flags: { disableTour: true },
            },
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
    if (url.includes("/src/")) {
      return route.continue();
    }
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
    if (url.includes("/api/documents")) {
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(mockDashboard.documents),
      });
    }
    if (url.includes("/api/patients")) {
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(mockDashboard.patients),
      });
    }
    if (url.includes("/api/schedule")) {
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(mockDashboard.appointments),
      });
    }
    return route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(url.includes("list") || url.includes("status") ? [] : {}),
    });
  });

  async function applyTheme(p, th) {
    await p.waitForFunction(() => typeof window !== "undefined" && Boolean(window.__useThemeStore), { timeout: 20000 }).catch(() => {});
    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        const res = await p.evaluate((t) => {
          localStorage.setItem("dente_theme_mode", t);
          if (window.__useThemeStore) {
            window.__useThemeStore.getState().setThemeMode(t);
          }
          document.documentElement.setAttribute("data-theme", t);
          const isDark = ["dark", "night", "ocean", "emerald", "cyber_xray"].includes(t);
          document.documentElement.classList.toggle("dark", isDark);
          document.documentElement.classList.toggle("light", !isDark);
          document.documentElement.style.colorScheme = isDark ? "dark" : "light";
          return {
            th: t,
            store: window.__useThemeStore?.getState()?.themeMode,
            dataTheme: document.documentElement.getAttribute("data-theme"),
            hasDarkClass: document.documentElement.classList.contains("dark"),
          };
        }, th);
        console.log(`  [Theme Applied] ${th}: store=${res?.store}, dataTheme=${res?.dataTheme}, dark=${res?.hasDarkClass}`);
        const isDark = ["dark", "night", "ocean", "emerald", "cyber_xray"].includes(th);
        await p.waitForFunction((dark) => {
          const hasDark = document.documentElement.classList.contains("dark");
          return dark ? hasDark : !hasDark;
        }, isDark, { timeout: 10000 }).catch(() => {});
        await p.waitForTimeout(800);
        break;
      } catch (err) {
        if (attempt === 3) throw err;
        await p.waitForTimeout(500);
      }
    }
  }

  console.log("\nNavigating to #documents...");
  await page.goto("http://127.0.0.1:5173/#documents", { waitUntil: "domcontentloaded", timeout: 60000 });
  
  // Wait explicitly for app shell and for boot state to completely detach
  await page.waitForSelector(".boot-state", { state: "detached", timeout: 60000 });
  await page.waitForSelector(".app-shell", { state: "visible", timeout: 30000 });
  await page.waitForSelector("#documents, .documents-panel", { state: "visible", timeout: 30000 });
  await page.waitForSelector(".document-intake-quick-print-btn", { state: "visible", timeout: 30000 });
  await page.waitForSelector(".document-nav-tabs", { state: "visible", timeout: 30000 });
  await page.waitForTimeout(1200);

  // Take Desktop Light (28_documents_desktop_light.png)
  console.log("Applying Light theme...");
  await applyTheme(page, "light");
  await page.waitForSelector(".document-intake-quick-print-btn", { state: "visible", timeout: 10000 });
  await page.waitForTimeout(1000);

  const lightFile = path.join(outDir, "28_documents_desktop_light.png");
  if (fs.existsSync(lightFile)) fs.unlinkSync(lightFile);
  await page.screenshot({ path: lightFile, fullPage: false, animations: "disabled" });
  for (const d of targetDirs) {
    const dest = path.join(d, "28_documents_desktop_light.png");
    if (dest !== lightFile) fs.copyFileSync(lightFile, dest);
  }
  const lightStats = fs.statSync(lightFile);
  const lightHash = crypto.createHash("md5").update(fs.readFileSync(lightFile)).digest("hex");
  console.log(`[Captured] 28_documents_desktop_light.png: ${lightStats.size} bytes (${(lightStats.size / 1024).toFixed(1)} KB), MD5: ${lightHash}`);

  // Take Desktop Dark (29_documents_desktop_dark.png)
  console.log("Applying Dark theme...");
  await applyTheme(page, "dark");
  await page.waitForSelector(".document-intake-quick-print-btn", { state: "visible", timeout: 10000 });
  await page.waitForTimeout(1000);

  const darkFile = path.join(outDir, "29_documents_desktop_dark.png");
  if (fs.existsSync(darkFile)) fs.unlinkSync(darkFile);
  await page.screenshot({ path: darkFile, fullPage: false, animations: "disabled" });
  for (const d of targetDirs) {
    const dest = path.join(d, "29_documents_desktop_dark.png");
    if (dest !== darkFile) fs.copyFileSync(darkFile, dest);
  }
  const darkStats = fs.statSync(darkFile);
  const darkHash = crypto.createHash("md5").update(fs.readFileSync(darkFile)).digest("hex");
  console.log(`[Captured] 29_documents_desktop_dark.png: ${darkStats.size} bytes (${(darkStats.size / 1024).toFixed(1)} KB), MD5: ${darkHash}`);

  await desktopContext.close();

  // Mobile Suite (390x844)
  console.log("\nStarting Mobile Suite (390x844)...");
  const mobileContext = await browser.newContext({
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 2,
    isMobile: true,
    hasTouch: true,
  });
  await initAuth(mobileContext);
  const mPage = await mobileContext.newPage();

  // Route interception for mobile
  await mPage.route("**/api/**", async (route) => {
    const url = route.request().url();
    if (url.includes("/src/")) return route.continue();
    if (url.includes("/api/dashboard")) return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(mockDashboard) });
    if (url.includes("/api/auth/user/me") || url.includes("/api/auth/session")) return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ user: { id: "doc-1", fullName: "Д-р Воронов Алексей Владимирович", role: "owner", active: true, organizationId: "00000000-0000-0000-0000-000000000001" } }) });
    if (url.includes("/api/auth/staff/unlock")) return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ success: true, token: "live-inquisition-staff-token", user: { id: "doc-1", fullName: "Д-р Воронов Алексей Владимирович", role: "owner" } }) });
    if (url.includes("/api/documents")) return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(mockDashboard.documents) });
    if (url.includes("/api/patients")) return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(mockDashboard.patients) });
    if (url.includes("/api/schedule")) return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(mockDashboard.appointments) });
    return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(url.includes("list") || url.includes("status") ? [] : {}) });
  });

  await mPage.goto("http://127.0.0.1:5173/#documents", { waitUntil: "domcontentloaded", timeout: 60000 });
  await mPage.waitForSelector(".boot-state", { state: "detached", timeout: 60000 });
  await mPage.waitForSelector(".app-shell", { state: "visible", timeout: 30000 });
  await mPage.waitForSelector("#documents, .documents-panel", { state: "visible", timeout: 30000 });
  await mPage.waitForSelector(".document-intake-quick-print-btn", { state: "visible", timeout: 30000 });
  await mPage.waitForTimeout(1200);

  // Mobile Light
  await applyTheme(mPage, "light");
  await mPage.waitForTimeout(800);
  const mobLightFile = path.join(outDir, "documents_mobile_light.png");
  await mPage.screenshot({ path: mobLightFile, fullPage: false, animations: "disabled" });
  for (const d of targetDirs) {
    const dest = path.join(d, "documents_mobile_light.png");
    if (dest !== mobLightFile) fs.copyFileSync(mobLightFile, dest);
  }
  const mobLightStats = fs.statSync(mobLightFile);
  console.log(`[Captured] documents_mobile_light.png: ${mobLightStats.size} bytes (${(mobLightStats.size / 1024).toFixed(1)} KB)`);

  // Mobile Dark
  await applyTheme(mPage, "dark");
  await mPage.waitForTimeout(800);
  const mobDarkFile = path.join(outDir, "documents_mobile_dark.png");
  await mPage.screenshot({ path: mobDarkFile, fullPage: false, animations: "disabled" });
  for (const d of targetDirs) {
    const dest = path.join(d, "documents_mobile_dark.png");
    if (dest !== mobDarkFile) fs.copyFileSync(mobDarkFile, dest);
  }
  const mobDarkStats = fs.statSync(mobDarkFile);
  console.log(`[Captured] documents_mobile_dark.png: ${mobDarkStats.size} bytes (${(mobDarkStats.size / 1024).toFixed(1)} KB)`);

  await mobileContext.close();
  await browser.close();
  console.log("\nAll Document screenshots captured successfully!");
}

captureDocumentsProofs().catch((err) => {
  console.error("Screenshot capture failed:", err);
  process.exit(1);
});
