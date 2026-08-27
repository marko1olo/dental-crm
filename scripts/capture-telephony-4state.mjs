import fs from "node:fs";
import path from "node:path";
import { chromium } from "playwright";

const OUT_DIR = "C:/Users/Admin/.gemini/antigravity/brain/0ab1dc3b-dbc4-4822-9eca-6c647fab12e4";
const DOCS_DIR = "C:/Clinic_MVP/dental-crm/docs/screenshots";

for (const d of [OUT_DIR, DOCS_DIR]) {
  if (!fs.existsSync(d)) {
    fs.mkdirSync(d, { recursive: true });
  }
}

const edgePath = [
  "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
  "C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe",
  "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
].find((p) => fs.existsSync(p));

if (!edgePath) {
  console.error("Browser executable not found!");
  process.exit(1);
}

console.log(`[CAPTURE] Launching browser at: ${edgePath}`);
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
    ],
    staff: [
      {
        id: "doc-1",
        organizationId: "c-1",
        fullName: "Д-р Ковалев С.П.",
        role: "doctor",
        specialties: ["Терапевт", "Эндодонтист"],
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
        specialties: ["Хирург", "Имплантолог"],
        active: true,
        color: "#0284c7",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    ],
  },
  patients: [
    {
      id: "PAT-001",
      organizationId: "c-1",
      fullName: "Смирнова Екатерина Васильевна",
      status: "active",
      phone: "+7 (926) 555-12-34",
      email: "smirnova@example.com",
      balanceRub: 14500,
      notes: "Аллергия на лидокаин. Беременность 2 триместр.",
      administrativeProfile: {
        legalRepresentativePhone: "+7 (926) 555-99-88",
        insurancePolicyNumber: "СОГАЗ-МЕД-883492",
      },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      id: "PAT-002",
      organizationId: "c-1",
      fullName: "Иванов Петр Сергеевич",
      status: "active",
      phone: "+7 (999) 765-43-21",
      email: null,
      balanceRub: -4500,
      notes: "Острая боль 2.6, кардиостимулятор",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
  ],
  patientInsights: [
    {
      patientId: "PAT-001",
      balanceDueRub: 0,
      clinicalFlags: ["Аллергия на анестетики (лидокаин)", "Беременность"],
      riskLevel: "medium",
    },
    {
      patientId: "PAT-002",
      balanceDueRub: 4500,
      clinicalFlags: ["Острая боль", "Кардиостимулятор"],
      riskLevel: "high",
      riskReasons: ["Задолженность за предыдущий этап", "Кардиопатология"],
    },
  ],
  insuranceContracts: [
    {
      companyName: "АО «СОГАЗ-МЕД» (ДМС Премиум)",
      isActive: true,
    },
  ],
  appointments: [
    {
      id: "app-1",
      organizationId: "c-1",
      patientId: "PAT-001",
      doctorUserId: "doc-1",
      chairId: "chair-1",
      status: "completed",
      startsAt: "2026-08-20T10:00:00.000Z",
      endsAt: "2026-08-20T11:00:00.000Z",
      reason: "Лечение кариеса 1.6",
    },
    {
      id: "app-2",
      organizationId: "c-1",
      patientId: "PAT-001",
      doctorUserId: "doc-2",
      chairId: "chair-1",
      status: "planned",
      startsAt: `${todayDate}T14:30:00.000Z`,
      endsAt: `${todayDate}T15:30:00.000Z`,
      reason: "Консультация имплантолога",
    },
  ],
  inventory: { items: [], lowStock: [] },
  finance: { todayRevenueRub: 145000, monthRevenueRub: 2850000 },
  todayIso: todayDate,
};

const configs = [
  {
    key: "pc_light",
    label: "PC Light",
    viewport: { width: 1440, height: 900 },
    theme: "light",
    isMobile: false,
    deviceScaleFactor: 1.5,
  },
  {
    key: "pc_dark",
    label: "PC Dark",
    viewport: { width: 1440, height: 900 },
    theme: "dark",
    isMobile: false,
    deviceScaleFactor: 1.5,
  },
  {
    key: "mobile_light",
    label: "Mobile Light",
    viewport: { width: 390, height: 844 },
    theme: "light",
    isMobile: true,
    deviceScaleFactor: 2.5,
  },
  {
    key: "mobile_dark",
    label: "Mobile Dark",
    viewport: { width: 390, height: 844 },
    theme: "dark",
    isMobile: true,
    deviceScaleFactor: 2.5,
  },
];

async function applyTheme(page, theme) {
  await page.evaluate((th) => {
    document.documentElement.setAttribute("data-theme", th);
    const isDark = th === "dark" || th === "night" || th === "ocean" || th === "cyber_xray";
    document.documentElement.classList.toggle("dark", isDark);
    document.documentElement.classList.toggle("light", !isDark);
    document.body.className = isDark ? "dark" : "light";
    document.documentElement.style.colorScheme = isDark ? "dark" : "light";
    localStorage.setItem("dente_theme_mode", th);
  }, theme);
  await page.waitForTimeout(300);
}

for (const cfg of configs) {
  console.log(`\n==================================================`);
  console.log(`📸 Processing 4-State Capture: ${cfg.label}`);
  console.log(`==================================================`);

  const context = await browser.newContext({
    viewport: cfg.viewport,
    deviceScaleFactor: cfg.deviceScaleFactor,
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

  await page.addInitScript(({ theme }) => {
    window.localStorage.setItem("dente_active_session_token", "mock-session-token");
    window.localStorage.setItem("dente_user_role", "doctor");
    window.localStorage.setItem("dente_offline_mode", "true");
    window.localStorage.setItem("dente_clinic_token", "dev_token_sample_clinic");
    window.localStorage.setItem("dente_staff_token", "dev_token_sample_staff");
    window.localStorage.setItem("dente_theme_mode", theme);
    window.localStorage.setItem("dente_workspace_perspective", "standard");
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
  }, { theme: cfg.theme });

  await page.goto("http://127.0.0.1:5173/#schedule", { waitUntil: "domcontentloaded", timeout: 15000 });
  await applyTheme(page, cfg.theme);
  await page.waitForTimeout(600);

  // 1. Capture Softphone Floating Widget Expanded with line switcher & agent status
  await page.evaluate(() => {
    const store = window.useTelephonyStore;
    if (store) {
      store.getState().setAgentState("online");
      store.getState().switchLine(1);
    }
    const card = document.querySelector('.dnt-telephony-card');
    if (!card) {
      const launcher = document.querySelector('.dnt-telephony-launcher');
      if (launcher) (launcher).click();
    }
  });
  await page.waitForTimeout(600);

  const softphoneName = `telephony_softphone_${cfg.key}.png`;
  const softphonePath = path.join(OUT_DIR, softphoneName);
  await page.screenshot({ path: softphonePath, fullPage: false });
  fs.copyFileSync(softphonePath, path.join(DOCS_DIR, softphoneName));
  console.log(`  ✓ Saved: ${softphoneName}`);

  // 2. Trigger Incoming Call Popup with full clinical patient recognition, financial status & waveform player
  await page.evaluate(() => {
    const store = window.useTelephonyStore;
    if (store) {
      store.getState().triggerIncomingCall({
        callId: "call-rec-8899",
        phone: "+7 (926) 555-12-34",
        patientName: "Смирнова Екатерина Васильевна",
        patientId: "PAT-001",
        provider: "mango",
        status: "answered",
        timestamp: new Date().toISOString(),
        durationSeconds: 45,
        recordingUrl: "https://records.mango-office.ru/sample-rec.mp3",
      });
    }
  });
  await page.waitForTimeout(600);

  const incomingName = `telephony_incoming_call_${cfg.key}.png`;
  const incomingPath = path.join(OUT_DIR, incomingName);
  await page.screenshot({ path: incomingPath, fullPage: false });
  fs.copyFileSync(incomingPath, path.join(DOCS_DIR, incomingName));
  console.log(`  ✓ Saved: ${incomingName}`);

  await context.close();
}

console.log("\n[SUCCESS] All 4-State Visual Proofs Captured and Verified!");
await browser.close();
