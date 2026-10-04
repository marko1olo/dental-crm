const { chromium } = require("playwright");
const fs = require("node:fs");
const path = require("node:path");

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
      notes: "Бронхиальная астма, аллергия на лидокаин",
      administrativeProfile: "normal",
      createdAt: `${todayDate}T08:00:00.000Z`,
      updatedAt: `${todayDate}T08:00:00.000Z`,
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
      startsAt: `${todayDate}T10:00:00.000Z`,
      endsAt: `${todayDate}T11:30:00.000Z`,
      startTime: `${todayDate}T10:00:00.000Z`,
      endTime: `${todayDate}T11:30:00.000Z`,
      durationMinutes: 90,
      serviceTitle: "Комплексная реабилитация",
      serviceCategories: ["therapy", "surgery", "orthopedics"],
      createdByUserId: "doc-1",
      createdAt: `${todayDate}T08:00:00.000Z`,
      updatedAt: `${todayDate}T08:00:00.000Z`,
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
          user: { id: "doc-1", fullName: "Д-р Воронов Алексей Владимирович", role: "owner", active: true, organizationId: "00000000-0000-0000-0000-000000000001" },
        }),
      });
    }
    if (url.includes("/api/auth/staff/unlock")) {
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ success: true, token: "audit-token-staff", user: { id: "doc-1", fullName: "Д-р Воронов Алексей Владимирович", role: "owner" } }),
      });
    }
    if (url.includes("/tooth-states")) {
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ success: true, states: [
          { toothNumber: 16, state: "Caries" },
          { toothNumber: 36, state: "Missing" },
          { toothNumber: 46, state: "Pulpitis" }
        ] }),
      });
    }
    if (url.includes("/api/patients")) {
      return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(mockDashboard.patients) });
    }
    if (url.includes("/api/schedule")) {
      return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(mockDashboard.appointments) });
    }
    return route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(url.includes("list") || url.includes("status") ? [] : {}),
    });
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
    localStorage.setItem(
      "dente_ui_preferences_v1",
      JSON.stringify({ onboardingDismissed: true, onboardingStep: "done", version: 1 })
    );
    localStorage.setItem(
      "dental-crm:onboarding:v1",
      JSON.stringify({ dismissed: true, step: "done", completed: true, onboardingDismissed: true, onboardingStep: "done", version: 1 })
    );
    localStorage.setItem(
      "dental-crm:web-ui-preferences:v1",
      JSON.stringify({ version: 1, uiLanguage: "ru", selectedWorkspaceRole: "owner", selectedPatientId: "pat-1", onboardingDismissed: true, onboardingStep: "done" })
    );
    localStorage.setItem("dente_tour_completed", "true");
    localStorage.setItem("dente_demo_showcase", "true");
    localStorage.setItem("dente_workspace_perspective", "presentation");
  });
}

async function setTheme(page, theme) {
  await page.evaluate((th) => {
    if (window.__useThemeStore) {
      window.__useThemeStore.getState().setThemeMode(th);
    }
    document.documentElement.setAttribute("data-theme", th);
    const isDark = ["dark", "night", "ocean", "emerald", "cyber_xray"].includes(th);
    document.documentElement.classList.toggle("dark", isDark);
    document.documentElement.classList.toggle("light", !isDark);
    document.body.classList.toggle("dark", isDark);
    document.body.classList.toggle("light", !isDark);
    document.documentElement.style.colorScheme = isDark ? "dark" : "light";
    try {
      localStorage.setItem("dente_theme_mode", th);
      localStorage.setItem("dente_theme", th);
    } catch (_) {}
  }, theme);
  await page.waitForTimeout(500);
}

async function main() {
  const screenshotsDir = path.resolve(__dirname, "../docs/screenshots/inquisition_live");
  fs.mkdirSync(screenshotsDir, { recursive: true });
  const parentBrainDir = "C:\\Users\\Admin\\.gemini\\antigravity\\brain\\beb92312-c6d7-426d-a438-12dcad022abc";

  const browser = await chromium.launch({
    executablePath: "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
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
    let baseUrl = "http://127.0.0.1:5174";
    try {
      const res = await fetch("http://127.0.0.1:5173");
      if (res.ok) baseUrl = "http://127.0.0.1:5173";
    } catch (_) {}
    console.log(`Using Vite baseUrl: ${baseUrl}`);
    await setupPageRoutes(page);

    console.log(`Navigating to ${baseUrl}/#visit...`);
    await page.goto(`${baseUrl}/#visit`, { waitUntil: "domcontentloaded", timeout: 30000 });
    await page.waitForTimeout(2500);

    // Wait for treatment module and segmented control to mount
    console.log("Waiting for treatment-3tier-segmented-control...");
    await page.waitForSelector('[data-testid="treatment-3tier-segmented-control"]', { timeout: 15000 });
    await page.waitForSelector('[data-testid="treatment-mobile-floating-thumb-bar"]', { timeout: 10000 });
    console.log("Mounted successfully!");

    // Capture Light 3-Tier comparison
    await setTheme(page, "light");
    const light3TierPath = path.join(screenshotsDir, "proof_mobile_treatment_plans_light.png");
    await page.screenshot({ path: light3TierPath });
    console.log(`Saved ${light3TierPath}`);
    if (fs.existsSync(parentBrainDir)) {
      fs.copyFileSync(light3TierPath, path.join(parentBrainDir, "proof_mobile_treatment_plans_light.png"));
    }

    // Capture Dark 3-Tier comparison
    await setTheme(page, "dark");
    const dark3TierPath = path.join(screenshotsDir, "proof_mobile_treatment_plans_dark.png");
    await page.screenshot({ path: dark3TierPath });
    console.log(`Saved ${dark3TierPath}`);
    if (fs.existsSync(parentBrainDir)) {
      fs.copyFileSync(dark3TierPath, path.join(parentBrainDir, "proof_mobile_treatment_plans_dark.png"));
    }

    // Now test Presenter Modal / Bottom Sheet Drawer in Dark mode
    console.log("Opening Presenter Modal in Dark mode...");
    await page.click('[data-testid="treatment-plan-options-menu-btn"]');
    await page.waitForTimeout(400);
    await page.click('[data-testid="options-menu-presenter-btn"]');
    await page.waitForSelector('[data-testid="treatment-plan-presenter-modal"]', { timeout: 10000 });
    await page.waitForTimeout(800);

    const darkModalPath = path.join(screenshotsDir, "proof_mobile_presenter_modal_dark.png");
    await page.screenshot({ path: darkModalPath });
    console.log(`Saved ${darkModalPath}`);
    if (fs.existsSync(parentBrainDir)) {
      fs.copyFileSync(darkModalPath, path.join(parentBrainDir, "proof_mobile_presenter_modal_dark.png"));
    }

    // Switch to Light mode inside Presenter Modal
    console.log("Switching to Light mode in Presenter Modal...");
    await setTheme(page, "light");
    const lightModalPath = path.join(screenshotsDir, "proof_mobile_presenter_modal_light.png");
    await page.screenshot({ path: lightModalPath });
    console.log(`Saved ${lightModalPath}`);
    if (fs.existsSync(parentBrainDir)) {
      fs.copyFileSync(lightModalPath, path.join(parentBrainDir, "proof_mobile_presenter_modal_light.png"));
    }

    console.log("\nALL PROOF SCREENSHOTS SUCCESSFULLY CAPTURED!");
  } finally {
    await browser.close();
  }
}

main().catch((err) => {
  console.error("Main failed:", err);
  process.exit(1);
});
