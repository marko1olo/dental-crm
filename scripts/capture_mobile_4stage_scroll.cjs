const { chromium } = require("playwright");
const fs = require("node:fs");
const path = require("node:path");

const todayDate = new Date().toLocaleDateString("en-CA");
const brainDir = "C:\\Users\\Admin\\.gemini\\antigravity\\brain\\7cd67b6c-4183-463f-a1cc-73d6eff523bf";
const outDir = path.resolve(__dirname, "..", "docs", "screenshots", "inquisition_live");

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
        specialties: ["therapist", "orthopedist", "implantologist"],
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
        name: "Кабинет 1",
        room: "1",
        defaultDoctorId: "doc-1",
        active: true,
      },
    ],
    integrationPresets: [],
    workspaceProfiles: [],
    roleAccessPolicies: [],
    modeHints: [],
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
      notes: "",
      administrativeProfile: "normal",
      createdAt: todayDate,
      updatedAt: todayDate,
    },
  ],
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
      startsAt: todayDate,
      endsAt: todayDate,
      startTime: todayDate,
      endTime: todayDate,
      durationMinutes: 90,
      serviceTitle: "Комплексный план",
      serviceCategories: ["therapy", "surgery", "orthopedics"],
      createdByUserId: "doc-1",
      createdAt: todayDate,
      updatedAt: todayDate,
      patientName: "Ковалёв Роман Станиславович",
      doctorName: "Д-р Воронов А.В.",
    },
  ],
  activeVisit: {
    id: "00000000-0000-0000-0000-000000000001",
    appointmentId: "app-1",
    patientId: "pat-1",
    doctorId: "doc-1",
    status: "in_treatment",
  },
  payments: [],
};

async function setupPageRoutes(page) {
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
          user: { id: "doc-1", fullName: "Д-р Воронов Алексей Владимирович", role: "owner", active: true },
        }),
      });
    }
    if (url.includes("/api/auth/staff/unlock")) {
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ success: true, token: "audit-token-staff", user: { id: "doc-1" } }),
      });
    }
    if (url.includes("/tooth-states")) {
      return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ success: true, states: [] }) });
    }
    if (url.includes("/api/patients")) {
      return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(mockDashboard.patients) });
    }
    if (url.includes("/api/schedule")) {
      return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(mockDashboard.appointments) });
    }
    return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify([]) });
  });
}

function addInitStorage(context) {
  return context.addInitScript(() => {
    localStorage.setItem("dente_clinic_token", "audit-token-clinic");
    localStorage.setItem("dente_staff_token", "audit-token-staff");
    localStorage.setItem("dente_active_session_token", "audit-token-staff");
    localStorage.setItem("dente_active_user_id", "doc-1");
    localStorage.setItem("dente_active_role", "owner");
    localStorage.setItem("dente_active_mode", "clinic");
    sessionStorage.setItem("dente_unlocked", "true");
    localStorage.setItem("dente_onboarding_completed", "true");
    localStorage.setItem("dente_demo_showcase", "true");
    localStorage.setItem("dente_workspace_perspective", "presentation");
  });
}

async function main() {
  const browser = await chromium.launch({
    executablePath: "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
    headless: true,
    args: ["--no-sandbox"],
  });

  try {
    const context = await browser.newContext({
      viewport: { width: 390, height: 844 },
      deviceScaleFactor: 2,
      isMobile: true,
      hasTouch: true,
    });
    await addInitStorage(context);
    const page = await context.newPage();
    await setupPageRoutes(page);

    await page.goto("http://127.0.0.1:5173/#visit", { waitUntil: "domcontentloaded" });
    await page.waitForSelector('[data-testid="tp-tab-phased4"]', { timeout: 20000 });
    await page.click('[data-testid="tp-tab-phased4"]');
    await page.waitForSelector('[data-testid="treatment-plan-phased-4stage-view"]', { timeout: 15000 });
    await page.waitForTimeout(800);

    // 1. Scroll to Stage 1 and Stage 2
    console.log("Scrolling to Stage 1 & 2...");
    const stageCard = page.locator('[data-testid="phased-stage-card-hygiene_sanitation"]');
    await stageCard.scrollIntoViewIfNeeded();
    await page.waitForTimeout(500);

    const shotMiddlePath = path.join(outDir, "proof_mobile_4stage_scrolled_middle.png");
    await page.screenshot({ path: shotMiddlePath });
    fs.copyFileSync(shotMiddlePath, path.join(brainDir, "proof_mobile_4stage_scrolled_middle.png"));
    console.log("Saved middle shot:", shotMiddlePath);

    // 2. Scroll to Bank Installments & Total
    console.log("Scrolling to Bank Installments...");
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await page.waitForTimeout(500);

    const shotBottomPath = path.join(outDir, "proof_mobile_4stage_scrolled_installments.png");
    await page.screenshot({ path: shotBottomPath });
    fs.copyFileSync(shotBottomPath, path.join(brainDir, "proof_mobile_4stage_scrolled_installments.png"));
    console.log("Saved installments shot:", shotBottomPath);

  } finally {
    await browser.close();
  }
}

main().catch((err) => {
  console.error("Failed:", err);
  process.exit(1);
});
