import { chromium } from "playwright";
import fs from "node:fs";
import path from "node:path";

const OUT_DOCS = path.resolve(process.cwd(), "docs/screenshots/schedule_live");
const OUT_CONV = "C:/Users/Admin/.gemini/antigravity/brain/cfc3e656-a5f4-4c5f-aa25-83869a4f9ffa";

if (!fs.existsSync(OUT_DOCS)) {
  fs.mkdirSync(OUT_DOCS, { recursive: true });
}

const now = new Date();
const todayIso = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;

const mockDashboard = {
  organization: {
    id: "org-dente-demo",
    name: "Клиника DENTE",
  },
  clinicSettings: {
    name: "Клиника DENTE",
    profile: {
      mode: "clinic",
      timezone: "Europe/Moscow",
    },
    chairs: [
      {
        id: "chair-1",
        name: "Кресло 1 (Терапия)",
        roomNumber: "1",
        room: "1",
        active: true,
        isActive: true,
        color: "#0d9488",
        colorId: "teal",
      },
      {
        id: "chair-2",
        name: "Кресло 2 (Хирургия)",
        roomNumber: "2",
        room: "2",
        active: true,
        isActive: true,
        color: "#3b82f6",
        colorId: "blue",
      },
    ],
    staff: [
      {
        id: "doc-1",
        fullName: "Д-р Воронов Алексей Владимирович",
        role: "doctor",
        active: true,
        specialties: ["therapy"],
      },
      {
        id: "doc-2",
        fullName: "Д-р Смирнова Анна Павловна",
        role: "doctor",
        active: true,
        specialties: ["surgery"],
      },
    ],
  },
  patients: [
    {
      id: "pat-1",
      fullName: "Петров Пётр Сергеевич",
      phone: "+7 (916) 123-45-67",
      status: "active",
      balanceRub: 0,
    },
    {
      id: "pat-2",
      fullName: "Васильева Ольга Игоревна",
      phone: "+7 (926) 555-43-21",
      status: "active",
      balanceRub: 12000,
    },
  ],
  appointments: [
    {
      id: "appt-1",
      organizationId: "org-dente-demo",
      chairId: "chair-1",
      doctorUserId: "doc-1",
      patientId: "pat-1",
      startsAt: `${todayIso}T08:30:00+03:00`,
      endsAt: `${todayIso}T09:30:00+03:00`,
      status: "completed",
      reason: "Лечение пульпита 16 зуба",
      costRub: 6500,
      isCito: false,
    },
    {
      id: "appt-2",
      organizationId: "org-dente-demo",
      chairId: "chair-1",
      doctorUserId: "doc-1",
      patientId: "pat-2",
      startsAt: `${todayIso}T10:00:00+03:00`,
      endsAt: `${todayIso}T11:00:00+03:00`,
      status: "in_treatment",
      reason: "Установка коронки E-max",
      costRub: 18000,
      isCito: false,
    },
  ],
  rooms: [],
  cashRegisters: [],
  priceList: [],
  shiftIntelligence: {
    scheduleWarnings: [],
  },
};

const mockShifts = [
  {
    id: `shift-doc-1-${todayIso}`,
    doctorId: "doc-1",
    doctorName: "Д-р Воронов А.В.",
    doctorRole: "therapist",
    assistantId: null,
    assistantName: null,
    cabinetId: "chair-1",
    chairId: "chair-1",
    dateIso: todayIso,
    archetypeId: "first_shift",
    startTime: "08:00",
    endTime: "14:00",
    durationHours: 6,
    breakMinutes: 0,
    isNight: false,
    nightHours: 0,
    status: "confirmed",
  },
  {
    id: `shift-doc-2-${todayIso}`,
    doctorId: "doc-2",
    doctorName: "Д-р Смирнова А.П.",
    doctorRole: "surgeon",
    assistantId: null,
    assistantName: null,
    cabinetId: "chair-2",
    chairId: "chair-2",
    dateIso: todayIso,
    archetypeId: "first_shift",
    startTime: "08:00",
    endTime: "14:00",
    durationHours: 6,
    breakMinutes: 0,
    isNight: false,
    nightHours: 0,
    status: "confirmed",
  },
];

async function run() {
  console.log("Launching Microsoft Edge via Playwright...");
  const browser = await chromium.launch({
    channel: "msedge",
    headless: true,
  });

  try {
    const context = await browser.newContext({
      viewport: { width: 1440, height: 900 },
      deviceScaleFactor: 1,
    });

    // Intercept /api/dashboard and set storage
    await context.addInitScript(({ dashboardData, shiftsData }) => {
      const origFetch = window.fetch;
      window.fetch = async function (url, opts) {
        if (typeof url === "string" && url.includes("/api/dashboard")) {
          return new Response(JSON.stringify(dashboardData), {
            status: 200,
            headers: { "Content-Type": "application/json" },
          });
        }
        return origFetch.apply(this, arguments);
      };
      try {
        localStorage.setItem("dente_clinic_token", "demo-clinic-token-123");
        localStorage.setItem("dente_staff_token", "demo-staff-token-123");
        localStorage.setItem("dente_onboarding_completed", "true");
        localStorage.setItem(
          "dental-crm:onboarding:v1",
          JSON.stringify({ dismissed: true, step: "done", completed: true })
        );
        localStorage.setItem(
          "dental-crm:web-ui-preferences:v1",
          JSON.stringify({
            version: 1,
            uiLanguage: "ru",
            selectedWorkspaceRole: "doctor",
            onboardingDismissed: true,
          })
        );
        localStorage.setItem("dente_doctor_shifts", JSON.stringify(shiftsData));
      } catch (e) {}
    }, { dashboardData: mockDashboard, shiftsData: mockShifts });

    const page = await context.newPage();

    console.log("Navigating to http://127.0.0.1:5173/#schedule...");
    await page.goto("http://127.0.0.1:5173/#schedule", { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(2500);

    // Switch to chairs view mode
    const chairsBtn = await page.waitForSelector('[data-testid="schedule-view-mode-chairs"]', { timeout: 8000 }).catch(() => null);
    if (chairsBtn) {
      console.log("Switching to chairs view mode...");
      await chairsBtn.click();
      await page.waitForTimeout(800);
    }

    // Wait for the toolbar palette strip
    console.log("Waiting for chair toolbar strip...");
    const toolbar = await page.waitForSelector(
      '[data-testid="chair-schedule-palette-strip"]',
      { timeout: 15000 }
    ).catch(() => null);

    if (toolbar) {
      console.log("Chair schedule palette strip found and mounted!");
    } else {
      console.warn("Palette strip not found, proceeding to capture...");
    }

    await page.waitForTimeout(1000);

    // 1. Light Mode (1440x900)
    console.log("Configuring PC Light mode...");
    await page.evaluate(() => {
      document.documentElement.setAttribute("data-theme", "light");
      document.documentElement.classList.remove("dark");
      document.documentElement.classList.add("light");
      document.body.setAttribute("data-theme", "light");
      localStorage.setItem("dente_theme", "light");
    });
    await page.waitForTimeout(800);

    const lightPathDocs = path.join(OUT_DOCS, "chair_toolbar_pc_light_1440x900.png");
    const lightPathConv = path.join(OUT_CONV, "chair_toolbar_pc_light_1440x900.png");

    await page.screenshot({ path: lightPathDocs, fullPage: false });
    fs.copyFileSync(lightPathDocs, lightPathConv);
    const lightStats = fs.statSync(lightPathDocs);
    console.log(`[CAPTURED LIGHT] ${lightPathDocs} (${(lightStats.size / 1024).toFixed(1)} KB)`);

    // 2. Dark Mode (1440x900)
    console.log("Configuring PC Dark mode...");
    await page.evaluate(() => {
      document.documentElement.setAttribute("data-theme", "dark");
      document.documentElement.classList.remove("light");
      document.documentElement.classList.add("dark");
      document.body.setAttribute("data-theme", "dark");
      localStorage.setItem("dente_theme", "dark");
    });
    await page.waitForTimeout(800);

    const darkPathDocs = path.join(OUT_DOCS, "chair_toolbar_pc_dark_1440x900.png");
    const darkPathConv = path.join(OUT_CONV, "chair_toolbar_pc_dark_1440x900.png");

    await page.screenshot({ path: darkPathDocs, fullPage: false });
    fs.copyFileSync(darkPathDocs, darkPathConv);
    const darkStats = fs.statSync(darkPathDocs);
    console.log(`[CAPTURED DARK] ${darkPathDocs} (${(darkStats.size / 1024).toFixed(1)} KB)`);

    console.log("All screenshots captured successfully!");
  } finally {
    await browser.close();
  }
}

run().catch((err) => {
  console.error("Capture failed:", err);
  process.exit(1);
});
