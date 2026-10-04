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
      notes: "Бронхиальная астма, аллергия на латекс",
      administrativeProfile: "normal",
      balanceRub: 0,
      createdAt: `${todayDate}T08:00:00.000Z`,
      updatedAt: `${todayDate}T08:00:00.000Z`,
    },
  ],
  patientInsights: [],
  recommendedActions: [],
  appointments: [],
  imagingStudies: [
    {
      id: "02b00000-0000-0000-0000-000000000001",
      patientId: "pat-1",
      organizationId: "00000000-0000-0000-0000-000000000001",
      patientFullName: "Ковалёв Роман Станиславович",
      dicomPatientName: "Kovalev Roman",
      kind: "cbct",
      modality: "CT",
      title: "3D КЛКТ верхней и нижней челюсти 8x8 (KaVo OP 3D Pro)",
      seriesDescription: "KaVo OP 3D Pro / 80x80mm Standard Res",
      studyDate: todayDate,
      capturedAt: `${todayDate}T10:30:00.000Z`,
      sliceCount: 420,
      dimensions: "512x512x420",
      voxelSpacing: "0.2mm",
      fileSizeBytes: 185400000,
      bindingStatus: "auto_bound",
      bindingConfidence: 98,
      sourceKind: "folder_watch",
      sourceName: "KaVo eXam Vision PACS",
      status: "available",
      toothCode: "16",
      previewUrl: "/radiology/sample_rvg_tooth16.jpg",
    },
  ],
  serviceCatalog: [],
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
    if (url.includes("/api/imaging/studies")) {
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(mockDashboard.imagingStudies),
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

async function main() {
  const browser = await chromium.launch({
    headless: true,
    executablePath: "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
  });
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  await addAuthInitScript(ctx);
  const page = await ctx.newPage();

  page.on("pageerror", (err) => console.error("[PAGE ERROR]:", err.message));
  page.on("console", (msg) => {
    if (msg.type() === "error") console.error(`[CONSOLE ERROR]:`, msg.text());
  });

  await setupPageRoutes(page);

  console.log("Navigating to http://127.0.0.1:5173/#imaging...");
  await page.goto("http://127.0.0.1:5173/#imaging", { waitUntil: "domcontentloaded" });
  await page.waitForSelector(".app-shell", { timeout: 30000 });

  console.log("Opening RadiologyModule modal...");
  const openRadBtn = await page.waitForSelector('[data-testid="imaging-open-radiology-module"]', { timeout: 15000 });
  await openRadBtn.click();
  await page.waitForSelector('[data-testid="radiology-module-container"]', { timeout: 15000 });

  console.log("Opening 3D CBCT Studio...");
  const openCbctBtn = await page.waitForSelector('[data-testid="btn-open-3d-cbct-studio"]', { timeout: 10000 });
  await openCbctBtn.click();
  await page.waitForSelector('[data-testid="cbct-studio-modal"]', { timeout: 20000 });
  console.log("CBCT Studio modal opened!");

  await page.waitForTimeout(1000);

  // Take probe screenshot of empty studio
  await page.screenshot({ path: "scratch_cbct_step1.png" });
  console.log("Saved scratch_cbct_step1.png");

  // Check buttons
  const buttons = await page.$$eval("button", (btns) => btns.map(b => ({
    text: b.textContent.trim(),
    testId: b.getAttribute("data-testid"),
    role: b.getAttribute("role"),
  })));
  console.log("Buttons with testid:", buttons.filter(b => b.testId));

  const loadDemoBtn = await page.$('[data-testid="cbct-btn-load-demo-empty"]');
  if (loadDemoBtn) {
    console.log("Clicking load demo button...");
    await loadDemoBtn.click();
    await page.waitForTimeout(4000);
    await page.screenshot({ path: "scratch_cbct_step2.png" });
    console.log("Saved scratch_cbct_step2.png");
  }

  const buttonsAfter = await page.$$eval("button", (btns) => btns.map(b => ({
    text: b.textContent.trim(),
    testId: b.getAttribute("data-testid"),
    role: b.getAttribute("role"),
  })));
  console.log("Buttons after demo load:", buttonsAfter.filter(b => b.testId));

  await browser.close();
}

main().catch(console.error);
