const { chromium } = require("C:/Clinic_MVP/dental-crm/node_modules/playwright");

const todayDate = new Date().toLocaleDateString("en-CA");
const mockDashboard = {
  clinicName: "Стоматология ДЕНТЕ Премиум",
  todayIso: todayDate,
  clinicSettings: {
    profile: { id: "c-1", organizationId: "00000000-0000-0000-0000-000000000001", clinicName: "Стоматология ДЕНТЕ Премиум", mode: "small_clinic", defaultVisitMinutes: 45, hasPediatricMode: true, timezone: "Europe/Moscow", phone: "+7 (495) 123-45-67", address: "Москва, Столярный переулок, 14", inn: "7701234567", updatedAt: new Date().toISOString() },
    staff: [{ id: "doc-1", organizationId: "00000000-0000-0000-0000-000000000001", fullName: "Д-р Воронов Алексей Владимирович", role: "owner", active: true, color: "#0d9488", createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() }],
    chairs: [{ id: "chair-1", organizationId: "00000000-0000-0000-0000-000000000001", name: "Кабинет 1", room: "1", defaultDoctorId: "doc-1", active: true }],
    integrationPresets: [], workspaceProfiles: [], roleAccessPolicies: [], modeHints: [], soloDoctorMode: false,
  },
  patients: [{ id: "pat-1", organizationId: "00000000-0000-0000-0000-000000000001", fullName: "Ковалёв Роман Станиславович", status: "active", birthDate: "1988-04-12", phone: "+7 (999) 888-77-66", email: "kovalev@example.ru", notes: "Аллергоанамнез спокоен", administrativeProfile: "normal", createdAt: `${todayDate}T08:00:00.000Z`, updatedAt: `${todayDate}T08:00:00.000Z` }],
  appointments: [{ id: "app-1", organizationId: "00000000-0000-0000-0000-000000000001", patientId: "pat-1", doctorUserId: "doc-1", doctorId: "doc-1", chairId: "chair-1", status: "in_treatment", state: "in_treatment", priority: "normal", intent: "treatment", startsAt: `${todayDate}T10:00:00.000Z`, endsAt: `${todayDate}T11:30:00.000Z`, startTime: `${todayDate}T10:00:00.000Z`, endTime: `${todayDate}T11:30:00.000Z`, durationMinutes: 90, serviceTitle: "Лечение кариеса 36 зуба", serviceCategories: ["therapy"], createdByUserId: "doc-1", createdAt: `${todayDate}T08:00:00.000Z`, updatedAt: `${todayDate}T08:00:00.000Z`, patientName: "Ковалёв Роман Станиславович", doctorName: "Д-р Воронов А.В." }],
  activeVisit: { id: "00000000-0000-0000-0000-000000000001", appointmentId: "app-1", patientId: "pat-1", doctorId: "doc-1", status: "in_treatment" },
  payments: [],
};

async function setupPageRoutes(page) {
  await page.route("**/api/**", async (route) => {
    const url = route.request().url();
    if (url.includes("/src/")) return route.continue();
    if (url.includes("/api/dashboard")) return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(mockDashboard) });
    if (url.includes("/api/auth/user/me") || url.includes("/api/auth/session")) {
      return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ user: { id: "doc-1", fullName: "Д-р Воронов Алексей Владимирович", role: "owner", active: true, organizationId: "00000000-0000-0000-0000-000000000001" } }) });
    }
    if (url.includes("/api/auth/staff/unlock")) return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ success: true, token: "audit-token-staff", user: { id: "doc-1", fullName: "Д-р Воронов Алексей Владимирович", role: "owner" } }) });
    if (url.includes("/tooth-states")) return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ success: true, states: [] }) });
    if (url.includes("/api/patients")) return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(mockDashboard.patients) });
    if (url.includes("/api/schedule")) return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(mockDashboard.appointments) });
    return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(url.includes("list") || url.includes("status") ? [] : {}) });
  });
}

function addInitStorage(context) {
  return context.addInitScript(() => {
    localStorage.setItem("dente_clinic_token", "audit-token-clinic");
    localStorage.setItem("dente_staff_token", "audit-token-staff");
    localStorage.setItem("dente_active_role", "owner");
    localStorage.setItem("dente_onboarding_completed", "true");
    localStorage.setItem("dente_tour_completed", "true");
    localStorage.setItem("dente_quest_progress_v1", JSON.stringify({ isDismissedPermanently: true, isTourActive: false, tracksProgress: {} }));
    localStorage.setItem("dente_ui_preferences_v1", JSON.stringify({ onboardingDismissed: true, onboardingStep: "done", version: 1 }));
    localStorage.setItem("dental-crm:onboarding:v1", JSON.stringify({ dismissed: true, step: "done", completed: true }));
    localStorage.setItem("dental-crm:web-ui-preferences:v1", JSON.stringify({ version: 1, uiLanguage: "ru", selectedWorkspaceRole: "owner", selectedPatientId: "pat-1", onboardingDismissed: true }));
    localStorage.setItem("dente_demo_showcase", "true");
    sessionStorage.setItem("dente_chunk_reload_/", "1");
  });
}

(async () => {
  const browser = await chromium.launch({ executablePath: "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe", headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  await addInitStorage(context);
  const page = await context.newPage();
  await setupPageRoutes(page);

  await page.goto("http://127.0.0.1:5173/#visit");
  await page.waitForTimeout(3000);
  await page.click('[data-testid="visit-subtab-odontogram"]');
  await page.waitForTimeout(1000);

  // Click tooth 18
  await page.evaluate(() => {
    const el = document.querySelector('.tooth-svg-wrapper[data-tooth-id="18"]');
    if (el) el.click();
  });
  await page.waitForTimeout(1000);

  const res18 = await page.evaluate(() => ({
    radialMenu: Boolean(document.querySelector('.radial-tooth-menu-container, [data-testid="tooth-radial-menu-overlay"]')),
    radialDisc: Boolean(document.querySelector('.radial-glass-disc')),
    radialWing: Boolean(document.querySelector('.radial-wing-pod')),
    menuConfig: Boolean(document.querySelector('.tooth-radial-menu')),
  }));
  console.log("Tooth 18 after 1s wait:", res18);

  await browser.close();
})();
