const { chromium } = require("playwright");
const fs = require("node:fs");
const path = require("node:path");

const todayDate = new Date().toLocaleDateString("en-CA");
const brainDir = "C:\\Users\\Admin\\.gemini\\antigravity\\brain\\7cd67b6c-4183-463f-a1cc-73d6eff523bf";
const outDir = path.resolve(__dirname, "..", "docs", "screenshots", "inquisition_live");
fs.mkdirSync(outDir, { recursive: true });

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
      serviceTitle: "Комплексная санация и имплантация",
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
        body: JSON.stringify({
          success: true,
          states: [
            { toothNumber: 16, state: "Caries" },
            { toothNumber: 36, state: "Missing" },
            { toothNumber: 46, state: "Pulpitis" },
          ],
        }),
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

async function captureScreen(page, fileName) {
  const filePath = path.join(outDir, fileName);
  await page.screenshot({ path: filePath });
  console.log(`[Playwright] Saved: ${filePath}`);
  if (fs.existsSync(brainDir)) {
    fs.copyFileSync(filePath, path.join(brainDir, fileName));
  }
}

async function main() {
  console.log("[Playwright] Launching Chrome for Treatment Plan 4-Stage proofs...");
  const browser = await chromium.launch({
    executablePath: "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });

  const baseUrl = "http://127.0.0.1:5173";

  try {
    // 1. MOBILE CONTEXT (390x844)
    console.log("\n--- TESTING MOBILE 390x844 ---");
    const mContext = await browser.newContext({
      viewport: { width: 390, height: 844 },
      deviceScaleFactor: 2,
      isMobile: true,
      hasTouch: true,
    });
    await addInitStorage(mContext);
    const mPage = await mContext.newPage();
    await setupPageRoutes(mPage);

    await mPage.goto(`${baseUrl}/#visit`, { waitUntil: "domcontentloaded", timeout: 30000 });
    await mPage.waitForTimeout(3000);

    // Wait for treatment module tabs to mount
    console.log("[Playwright] Waiting for tp-tab-phased4...");
    await mPage.waitForSelector('[data-testid="tp-tab-phased4"]', { timeout: 20000 });
    console.log("[Playwright] Clicking '4 Фазы' tab button...");
    await mPage.click('[data-testid="tp-tab-phased4"]');
    await mPage.waitForTimeout(1000);

    // Wait for phased 4 stage view
    await mPage.waitForSelector('[data-testid="treatment-plan-phased-4stage-view"]', { timeout: 15000 });
    console.log("[Playwright] Found treatment-plan-phased-4stage-view!");

    // Capture Mobile Light
    await setTheme(mPage, "light");
    await captureScreen(mPage, "proof_mobile_treatment_plan_4stage_light.png");

    // Capture Mobile Dark
    await setTheme(mPage, "dark");
    await captureScreen(mPage, "proof_mobile_treatment_plan_4stage_dark.png");

    await mContext.close();

    // 2. PC CONTEXT (1440x900)
    console.log("\n--- TESTING PC 1440x900 ---");
    const pcContext = await browser.newContext({
      viewport: { width: 1440, height: 900 },
      deviceScaleFactor: 1,
    });
    await addInitStorage(pcContext);
    const pcPage = await pcContext.newPage();
    await setupPageRoutes(pcPage);

    await pcPage.goto(`${baseUrl}/#visit`, { waitUntil: "domcontentloaded", timeout: 30000 });
    await pcPage.waitForTimeout(3000);

    // Wait for treatment module tabs to mount on PC
    console.log("[Playwright] PC: Waiting for tp-tab-phased4...");
    await pcPage.waitForSelector('[data-testid="tp-tab-phased4"]', { timeout: 20000 });
    console.log("[Playwright] PC: Clicking '4 Фазы' tab button...");
    await pcPage.click('[data-testid="tp-tab-phased4"]');
    await pcPage.waitForTimeout(1000);

    await pcPage.waitForSelector('[data-testid="treatment-plan-phased-4stage-view"]', { timeout: 15000 });

    // Capture PC Light
    await setTheme(pcPage, "light");
    await captureScreen(pcPage, "proof_pc_treatment_plan_4stage_light.png");

    // Capture PC Dark
    await setTheme(pcPage, "dark");
    await captureScreen(pcPage, "proof_pc_treatment_plan_4stage_dark.png");

    await pcContext.close();

    console.log("\n[Playwright] All 4-stage screenshots successfully captured!");
  } finally {
    await browser.close();
  }
}

main().catch((err) => {
  console.error("Playwright script failed:", err);
  process.exit(1);
});
