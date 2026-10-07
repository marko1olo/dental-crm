const { chromium } = require("playwright");

const mockTreatmentPlanData = {
  success: true,
  plans: [{
    id: "plan-complex-101",
    name: "Комплексная реабилитация жевательного отдела",
    status: "Approved",
    totalPrice: 125000,
    stages: [
      { stageNumber: 1, titleRu: "Терапевтическая санация кариеса" },
      { stageNumber: 2, titleRu: "Хирургический этап: удаление и имплантация" },
      { stageNumber: 3, titleRu: "Ортопедия: коронка из диоксида циркония" },
    ],
    items: [
      { id: "i1", phase: 1, stageNumber: 1, toothNumber: 16, code804n: "A16.07.002", name: "Восстановление зуба пломбой", quantity: 1, price: 4500, unitPriceRub: 4500 },
      { id: "i2", phase: 2, stageNumber: 2, toothNumber: 38, code804n: "A16.07.001.002", name: "Сложное удаление зуба мудрости", quantity: 1, price: 8000, unitPriceRub: 8000 },
      { id: "i3", phase: 2, stageNumber: 2, toothNumber: 46, code804n: "A16.07.054", name: "Внутрикостная дентальная имплантация", quantity: 1, price: 35000, unitPriceRub: 35000 },
      { id: "i4", phase: 3, stageNumber: 3, toothNumber: 46, code804n: "A16.07.004", name: "Коронка циркониевая", quantity: 1, price: 42000, unitPriceRub: 42000 }
    ]
  }]
};

const todayDate = new Date().toISOString().split("T")[0];
const mockDashboard = {
  version: 1,
  organizationId: "00000000-0000-0000-0000-000000000001",
  clinicSettings: {
    profile: { name: "Стоматология ДЕНТЕ Премиум", workdayStart: "08:00", workdayEnd: "21:00" },
    staff: [{ id: "doc-1", fullName: "Д-р Воронов Алексей Владимирович", role: "owner", active: true, color: "#0d9488" }],
    chairs: [{ id: "chair-1", name: "Кабинет 1", defaultDoctorId: "doc-1", active: true }],
  },
  patients: [{
    id: "pat-1",
    organizationId: "00000000-0000-0000-0000-000000000001",
    fullName: "Ковалёв Роман Станиславович",
    status: "active",
    birthDate: "1988-04-12",
    phone: "+7 (999) 888-77-66",
    allergies: ["Лидокаин"],
  }],
  activeVisit: {
    id: "visit-1",
    appointmentId: "app-1",
    patientId: "pat-1",
    doctorId: "doc-1",
    chairId: "chair-1",
    status: "in_treatment",
    startedAt: todayDate + "T10:00:00.000Z",
  },
  appointments: [{
    id: "app-1",
    organizationId: "00000000-0000-0000-0000-000000000001",
    patientId: "pat-1",
    doctorUserId: "doc-1",
    doctorId: "doc-1",
    chairId: "chair-1",
    status: "in_treatment",
    serviceTitle: "Хирургический этап: удаление и имплантация",
    treatmentPlanId: "plan-complex-101",
    stageNumber: 2,
    stageId: "stage_2_surgery",
    stageTitle: "Хирургический этап: удаление и имплантация",
    durationMinutes: 60,
    services: [
      { code804n: "A16.07.001.002", title: "Сложное удаление зуба мудрости", toothNumber: 38, priceRub: 8000, quantity: 1 },
      { code804n: "A16.07.054", title: "Внутрикостная дентальная имплантация", toothNumber: 46, priceRub: 35000, quantity: 1 }
    ]
  }]
};

async function run() {
  const browser = await chromium.launch({ channel: "chrome", headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  
  await context.route("**/api/**", async (route) => {
    const url = route.request().url();
    if (url.includes("/src/")) return route.continue();
    if (url.includes("/treatment-plans")) {
      console.log("[ROUTE] treatment plans intercepted:", url);
      return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(mockTreatmentPlanData) });
    }
    if (url.includes("/api/dashboard")) {
      console.log("[ROUTE] dashboard intercepted:", url);
      return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(mockDashboard) });
    }
    if (url.includes("/api/auth/user/me") || url.includes("/api/auth/session") || url.includes("/api/auth/verify")) {
      console.log("[ROUTE] auth user me intercepted:", url);
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          user: {
            id: "doc-1",
            fullName: "Д-р Воронов Алексей Владимирович",
            role: "owner",
            organizationId: "00000000-0000-0000-0000-000000000001",
          },
        }),
      });
    }
    return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ success: true }) });
  });

  await context.addInitScript(() => {
    const staffUser = {
      id: "doc-1",
      fullName: "Д-р Воронов Алексей Владимирович",
      role: "owner",
      organizationId: "00000000-0000-0000-0000-000000000001",
    };
    localStorage.setItem("dente_auth_token", "dente-offline-auth-token");
    localStorage.setItem("dente_clinic_token", "dente-offline-clinic-token");
    localStorage.setItem("dente_staff_token", "dente-offline-staff-token");
    localStorage.setItem("dente_active_role", "owner");
    localStorage.setItem("dente_user_id", "doc-1");
    localStorage.setItem("dente_user_role", "owner");
    localStorage.setItem("dente_clinic_tenant_id", "00000000-0000-0000-0000-000000000001");
    localStorage.setItem("dente_onboarding_completed", "true");
    localStorage.setItem("dente_tour_completed", "true");
    localStorage.setItem("dente_cached_active_staff_user", JSON.stringify(staffUser));
    localStorage.setItem("dental-crm:web-ui-preferences:v1", JSON.stringify({
      version: 1, selectedWorkspaceRole: "owner", selectedPatientId: "pat-1", onboardingDismissed: true, onboardingStep: "done"
    }));
  });

  const page = await context.newPage();
  page.on("console", msg => console.log("[PAGE LOG]", msg.type(), msg.text()));
  page.on("pageerror", err => console.log("[PAGE ERROR]", err.stack || err.message));
  page.on("requestfailed", r => console.log("[REQ FAILED]", r.url(), r.failure()?.errorText));

  console.log("Navigating to http://127.0.0.1:5173/#visit ...");
  await page.goto("http://127.0.0.1:5173/#visit", { waitUntil: "domcontentloaded" });
  
  console.log("Waiting for boot-state detach...");
  await page.waitForSelector("main.boot-state", { state: "detached", timeout: 30000 });
  console.log("Boot state detached!");

  console.log("Waiting for visit panel or banner...");
  try {
    await page.waitForSelector('[data-testid="visit-view"], [data-testid="visit-treatment-plan-handoff-banner"]', { timeout: 15000 });
    console.log("Found visit view or banner!");
  } catch (e) {
    console.log("Wait for visit-view timed out:", e.message);
  }

  const html = await page.evaluate(() => document.querySelector(".content-area, main, #root")?.innerHTML?.slice(0, 500));
  console.log("HTML snippet of main area:", html);

  const testIds = await page.evaluate(() => Array.from(document.querySelectorAll("[data-testid]")).map(e => e.getAttribute("data-testid")));
  console.log("Visible TestIDs count:", testIds.length, testIds);

  await page.screenshot({ path: "apps/web/public/screenshots/stage_handoff/test_banner.png" });
  await browser.close();
}

run().catch(console.error);
