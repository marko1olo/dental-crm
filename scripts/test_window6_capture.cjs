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
  imagingStudies: [],
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
  page.on("console", (msg) => console.log(`[${msg.type().toUpperCase()}]:`, msg.text()));

  await setupPageRoutes(page);

  console.log("Navigating to http://127.0.0.1:5173/#imaging...");
  await page.goto("http://127.0.0.1:5173/#imaging", { waitUntil: "domcontentloaded" });
  await page.waitForSelector(".app-shell", { timeout: 30000 });

  console.log("Opening 3D CBCT via custom event dente:open-cbct-demo...");
  await page.evaluate(() => {
    window.dispatchEvent(new CustomEvent("dente:open-cbct-demo"));
  });

  await page.waitForSelector('[data-testid="cbct-studio-modal"]', { timeout: 15000 });
  console.log("cbct-studio-modal opened!");

  await page.waitForTimeout(2000);

  const tabs = await page.$$eval('[role="tab"]', (els) => els.map(e => ({
    text: e.textContent.trim(),
    testId: e.getAttribute('data-testid'),
    visible: e.offsetParent !== null,
  })));
  console.log("Available tabs:", JSON.stringify(tabs, null, 2));

  // Check panorama tab
  const panoBtn = await page.$('[data-testid="cbct-nav-tab-panorama"]');
  console.log("panoBtn found?", Boolean(panoBtn));
  if (panoBtn) {
    const isVis = await panoBtn.isVisible();
    console.log("panoBtn isVisible?", isVis);
    await panoBtn.click();
    console.log("Clicked panoBtn!");
    await page.waitForTimeout(2000);
    const hasPanoContainer = await page.$('[data-testid="cbct-panoramic-dominant-container"], [data-testid="cbct-workspace-panoramic-root"]');
    console.log("hasPanoContainer?", Boolean(hasPanoContainer));
  }

  await browser.close();
}

main().catch(console.error);
