import { existsSync, copyFileSync, statSync } from "node:fs";
import { chromium } from "playwright";

const edgePath = [
  "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
  "C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe",
  "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
].find((p) => existsSync(p));

const browser = await chromium.launch({
  executablePath: edgePath,
  headless: true,
  args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-gpu"],
});

const todayDate = new Date().toISOString().slice(0, 10);

const mockDashboard = {
  clinicSettings: {
    profile: {
      organizationId: "c-1",
      clinicName: "DENTE Стоматология",
      timezone: "Europe/Moscow",
      phone: "+7 (495) 123-45-67",
      address: "Москва, ул. Тверская 1",
      inn: "7701234567",
      mode: "small_clinic",
      updatedAt: new Date().toISOString(),
    },
    chairs: [
      {
        id: "chair-1",
        organizationId: "c-1",
        name: "Кабинет 1 (Терапия)",
        active: true,
        notes: null,
        room: "1",
        specialization: "therapist",
        hasXraySensor: true,
        hasMicroscope: true,
        hasSurgeryKit: false,
      },
      {
        id: "chair-2",
        organizationId: "c-1",
        name: "Кабинет 2 (Хирургия)",
        active: true,
        notes: null,
        room: "2",
        specialization: "surgery",
        hasXraySensor: true,
        hasMicroscope: false,
        hasSurgeryKit: true,
      },
      {
        id: "chair-3",
        organizationId: "c-1",
        name: "Кабинет 3 (Ортопедия)",
        active: true,
        notes: null,
        room: "3",
        specialization: "orthopedist",
        hasXraySensor: false,
        hasMicroscope: false,
        hasSurgeryKit: false,
      },
    ],
    staff: [
      {
        id: "doc-1",
        organizationId: "c-1",
        fullName: "Д-р Ковалев С.П.",
        role: "doctor",
        active: true,
        color: "#0d9488",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      {
        id: "doc-2",
        organizationId: "c-1",
        fullName: "Д-р Смирнова Е.В.",
        role: "doctor",
        active: true,
        color: "#0284c7",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    ],
  },
  patients: [
    {
      id: "p-1",
      organizationId: "c-1",
      fullName: "Иванов Иван Иванович",
      status: "active",
      phone: "+7 (999) 123-45-67",
      email: null,
      notes: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      id: "p-2",
      organizationId: "c-1",
      fullName: "Петрова Анна Сергеевна",
      status: "active",
      phone: "+7 (999) 765-43-21",
      email: null,
      notes: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
  ],
  appointments: [
    {
      id: "app-1",
      organizationId: "c-1",
      patientId: "p-1",
      doctorUserId: "doc-1",
      doctorId: "doc-1",
      chairId: "chair-1",
      status: "in_treatment",
      startsAt: `${todayDate}T10:00:00.000Z`,
      endsAt: `${todayDate}T11:00:00.000Z`,
      startTime: `${todayDate}T10:00:00.000Z`,
      endTime: `${todayDate}T11:00:00.000Z`,
      serviceTitle: "Лечение пульпита 2.4 (Кариес/Эндо)",
      notes: "Острая боль",
    },
    {
      id: "app-2",
      organizationId: "c-1",
      patientId: "p-2",
      doctorUserId: "doc-2",
      doctorId: "doc-2",
      chairId: "chair-2",
      status: "confirmed",
      startsAt: `${todayDate}T11:30:00.000Z`,
      endsAt: `${todayDate}T12:30:00.000Z`,
      startTime: `${todayDate}T11:30:00.000Z`,
      endTime: `${todayDate}T12:30:00.000Z`,
      serviceTitle: "Установка имплантата Straumann BLX",
      notes: null,
    },
  ],
  inventory: {
    items: [],
    lowStock: [],
  },
  finance: {
    todayRevenueRub: 145000,
    monthRevenueRub: 2850000,
  },
};

const configs = [
  { key: "pc_light", width: 1920, height: 1080, theme: "light", isMobile: false },
  { key: "pc_dark", width: 1920, height: 1080, theme: "dark", isMobile: false },
  { key: "mobile_light", width: 390, height: 844, theme: "light", isMobile: true },
  { key: "mobile_dark", width: 390, height: 844, theme: "dark", isMobile: true },
];

for (const cfg of configs) {
  const context = await browser.newContext({
    viewport: { width: cfg.width, height: cfg.height },
    deviceScaleFactor: cfg.isMobile ? 2.5 : 1.5,
    isMobile: cfg.isMobile,
    hasTouch: cfg.isMobile,
  });

  const page = await context.newPage();

  await page.route("**/api/dashboard**", (route) => {
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(mockDashboard),
    });
  });

  await page.route("**/api/schedule**", (route) => {
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(mockDashboard.appointments),
    });
  });

  await page.addInitScript(() => {
    window.localStorage.setItem("dente_active_session_token", "mock-session-token");
    window.localStorage.setItem("dente_user_role", "doctor");
    window.localStorage.setItem("dente_offline_mode", "true");
    window.localStorage.setItem("dente_clinic_token", "dev_token_sample_clinic");
    window.localStorage.setItem("dente_staff_token", "dev_token_sample_staff");
    window.localStorage.setItem("dental-crm:onboarding:v1", JSON.stringify({ dismissed: true, step: "done" }));
    window.localStorage.setItem(
      "dental-crm:web-ui-preferences:v1",
      JSON.stringify({
        version: 1,
        uiLanguage: "ru",
        selectedWorkspaceRole: "doctor",
        selectedSpecialty: "therapist",
        selectedPatientId: "PAT-001",
        onboardingDismissed: true,
      }),
    );
  });

  await page.goto("http://127.0.0.1:5173/#schedule", { waitUntil: "domcontentloaded", timeout: 15000 });

  await page.evaluate((th) => {
    document.documentElement.setAttribute("data-theme", th);
    const isDark = th === "dark" || th === "night" || th === "ocean" || th === "cyber_xray";
    document.documentElement.classList.toggle("dark", isDark);
    document.documentElement.classList.toggle("light", !isDark);
    document.body.className = isDark ? "dark" : "light";
    document.documentElement.style.colorScheme = isDark ? "dark" : "light";
    localStorage.setItem("dente_theme_mode", th);
  }, cfg.theme);

  await page.waitForTimeout(1000);

  const file1 = `C:/Clinic_MVP/dental-crm/docs/screenshots/01_schedule_grid_emergency_buffer_${cfg.key}.png`;
  const file2 = `C:/Users/Admin/.gemini/antigravity/brain/0284cf50-cf45-4b19-be4c-f6f53b03120f/01_schedule_grid_emergency_buffer_${cfg.key}.png`;

  await page.screenshot({ path: file1 });
  copyFileSync(file1, file2);

  if (cfg.key === "pc_dark") {
    const can1 = `C:/Clinic_MVP/dental-crm/docs/screenshots/01_schedule_grid_emergency_buffer.png`;
    const can2 = `C:/Users/Admin/.gemini/antigravity/brain/0284cf50-cf45-4b19-be4c-f6f53b03120f/01_schedule_grid_emergency_buffer.png`;
    await page.screenshot({ path: can1 });
    copyFileSync(can1, can2);
  }

  console.log(`Saved 01 ${cfg.key}: ${statSync(file1).size} bytes`);
  await context.close();
}

await browser.close();
console.log("01 Schedule Grid recaptured successfully!");
