const { chromium } = require("playwright");
const path = require("node:path");
const fs = require("node:fs");

const todayDate = new Date().toISOString().split("T")[0];

const mockDashboard = {
  activeDoctor: {
    id: "doc-1",
    fullName: "Д-р Воронов Алексей Владимирович",
    role: "owner",
    specialties: ["therapist", "orthopedist"],
    active: true,
  },
  activePatient: {
    id: "pat-1",
    organizationId: "00000000-0000-0000-0000-000000000001",
    fullName: "Ковалёв Роман Станиславович",
    status: "active",
    birthDate: "1988-04-12",
    phone: "+7 (999) 888-77-66",
    allergies: ["Лидокаин"],
    notes: "Бронхиальная астма, аллергия на лидокаин",
    createdAt: `${todayDate}T08:00:00.000Z`,
    updatedAt: `${todayDate}T08:00:00.000Z`,
  },
  activeAppointment: {
    id: "app-2",
    organizationId: "00000000-0000-0000-0000-000000000001",
    patientId: "pat-1",
    doctorUserId: "doc-1",
    doctorId: "doc-1",
    chairId: "chair-1",
    startTime: `${todayDate}T10:00:00.000Z`,
    endTime: `${todayDate}T11:00:00.000Z`,
    durationMinutes: 60,
    status: "in_treatment",
    paymentStatus: "partially_paid",
    serviceType: "Лечение кариеса 36",
    totalCost: 14500,
    paidAmount: 5000,
    patientName: "Ковалёв Роман Станиславович",
    patientPhone: "+7 (999) 888-77-66",
    complaint: "Острая ночная боль в области моляра 36",
    createdAt: `${todayDate}T08:00:00.000Z`,
    updatedAt: `${todayDate}T08:00:00.000Z`,
  },
  activeVisit: {
    id: "app-2",
    patientId: "pat-1",
    doctorId: "doc-1",
    status: "in_treatment",
    diagnosisTooth: 36,
  },
  settings: {
    clinic: {
      name: "Стоматология ДЕНТЕ Премиум",
      scheduleConfig: {
        workdayStart: "08:00",
        workdayEnd: "21:00",
        appointmentBufferMinutes: 10,
      },
      timezone: "Europe/Moscow",
      phone: "+7 (495) 123-45-67",
      address: "Москва, Столярный переулок, 14",
    },
    staff: [
      {
        id: "doc-1",
        organizationId: "00000000-0000-0000-0000-000000000001",
        fullName: "Д-р Воронов Алексей Владимирович",
        role: "owner",
        specialties: ["therapist", "orthopedist"],
        active: true,
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
  },
  patients: [
    {
      id: "pat-1",
      organizationId: "00000000-0000-0000-0000-000000000001",
      fullName: "Ковалёв Роман Станиславович",
      status: "active",
      birthDate: "1988-04-12",
      phone: "+7 (999) 888-77-66",
      allergies: ["Лидокаин"],
      notes: "Бронхиальная астма, аллергия на лидокаин",
      createdAt: `${todayDate}T08:00:00.000Z`,
      updatedAt: `${todayDate}T08:00:00.000Z`,
    },
  ],
  appointments: [
    {
      id: "app-2",
      organizationId: "00000000-0000-0000-0000-000000000001",
      patientId: "pat-1",
      doctorUserId: "doc-1",
      doctorId: "doc-1",
      chairId: "chair-1",
      startTime: `${todayDate}T10:00:00.000Z`,
      endTime: `${todayDate}T11:00:00.000Z`,
      durationMinutes: 60,
      status: "in_treatment",
      paymentStatus: "partially_paid",
      serviceType: "Лечение кариеса 36",
      totalCost: 14500,
      paidAmount: 5000,
      patientName: "Ковалёв Роман Станиславович",
      patientPhone: "+7 (999) 888-77-66",
      complaint: "Острая ночная боль в области моляра 36",
      createdAt: `${todayDate}T08:00:00.000Z`,
      updatedAt: `${todayDate}T08:00:00.000Z`,
    },
  ],
};

async function runCapture() {
  const targetDirs = [
    path.resolve("C:/Clinic_MVP/dental-crm/docs/screenshots/inquisition_live"),
    "C:/Users/Admin/.gemini/antigravity/brain/bbed6651-df44-48c5-9ec6-06c68c2fcd08",
    "C:/Users/Admin/.gemini/antigravity/brain/beb92312-c6d7-426d-a438-12dcad022abc",
  ];
  for (const d of targetDirs) {
    if (!fs.existsSync(d)) {
      fs.mkdirSync(d, { recursive: true });
    }
  }
  const outDir = targetDirs[0];

  console.log("[Playwright] Launching Chrome executable for mobile 390x844...");
  const browser = await chromium.launch({
    headless: true,
    executablePath: "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });

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
          body: JSON.stringify({ success: true, token: "live-staff-token", user: { id: "doc-1", fullName: "Д-р Воронов Алексей Владимирович", role: "owner" } }),
        });
      }
      if (url.includes("/api/schedule")) {
        return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(mockDashboard.appointments) });
      }
      if (url.includes("/api/patients")) {
        return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(mockDashboard.patients) });
      }
      return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(url.includes("list") || url.includes("status") ? [] : {}) });
    });
  }

  async function applyTheme(page, theme) {
    await page.evaluate((th) => {
      localStorage.setItem("dente_theme_mode", th);
      if (window.__useThemeStore) {
        window.__useThemeStore.getState().setThemeMode(th);
      }
      document.documentElement.setAttribute("data-theme", th);
      const isDark = ["dark", "night", "ocean", "emerald", "cyber_xray"].includes(th);
      document.documentElement.classList.toggle("dark", isDark);
      document.documentElement.classList.toggle("light", !isDark);
      document.documentElement.style.colorScheme = isDark ? "dark" : "light";
    }, theme);
    await page.waitForTimeout(600);
  }

  async function takeProof(page, fileName, description) {
    const targetFile = path.join(outDir, fileName);
    await page.waitForTimeout(800);
    await page.screenshot({ path: targetFile, fullPage: false });

    for (const d of targetDirs) {
      const dest = path.join(d, fileName);
      if (dest !== targetFile) {
        try { fs.copyFileSync(targetFile, dest); } catch (e) {}
      }
    }

    const stats = fs.statSync(targetFile);
    console.log(`[Captured] ${fileName} (${description}): ${stats.size} bytes (${(stats.size / 1024).toFixed(1)} KB)`);
  }

  const mobileContext = await browser.newContext({
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 2,
    isMobile: true,
    hasTouch: true,
  });

  await mobileContext.addInitScript(() => {
    localStorage.setItem("dente_clinic_token", "live-inquisition-clinic-token");
    localStorage.setItem("dente_staff_token", "live-inquisition-staff-token");
    localStorage.setItem("dente_active_role", "owner");
    localStorage.setItem("dente_theme_mode", "light");
    localStorage.setItem("dente_onboarding_completed", "true");
    localStorage.setItem("dente_tour_completed", "true");
    localStorage.setItem("dente_tour_dismissed", "true");
    localStorage.setItem(
      "dente_ui_preferences_v1",
      JSON.stringify({ onboardingDismissed: true, onboardingStep: "done", version: 1 })
    );
    localStorage.setItem(
      "dental-crm:onboarding:v1",
      JSON.stringify({ dismissed: true, step: "done", completed: true, version: 1 })
    );
    localStorage.setItem(
      "dental-crm:web-ui-preferences:v1",
      JSON.stringify({ version: 1, uiLanguage: "ru", selectedWorkspaceRole: "owner", selectedPatientId: "pat-1", onboardingDismissed: true, onboardingStep: "done" })
    );
    localStorage.setItem(
      "dente-workspace-profile",
      JSON.stringify({
        state: {
          clinicName: "Стоматология ДЕНТЕ Премиум",
          currentDoctor: { id: "doc-1", fullName: "Д-р Воронов А. В.", role: "owner" },
          flags: { disableTour: true },
        },
      })
    );
  });

  const page = await mobileContext.newPage();
  await setupPageRoutes(page);

  console.log("Loading http://127.0.0.1:5173/#visit...");
  await page.goto("http://127.0.0.1:5173/#visit", { waitUntil: "domcontentloaded", timeout: 30000 });
  await page.waitForTimeout(2000);

  // Remove any tour overlay if present
  await page.evaluate(() => {
    document.querySelectorAll('.tour-spotlight-root, [data-testid="guided-tour-spotlight-overlay"], .tour-backdrop-clickable-zone').forEach((el) => el.remove());
  });

  // Ensure visit view is shown
  await page.evaluate(() => {
    window.location.hash = "visit";
    const visitTab = document.querySelector('[data-testid="visit-subtab-emk"]') || document.querySelector('button[role="tab"]');
    if (visitTab) visitTab.click();
  });
  await page.waitForTimeout(1500);

  // 1. Proof Mobile Chairside Visit Light (390x844)
  console.log("[Theme] Applying Light theme...");
  await applyTheme(page, "light");
  await takeProof(page, "proof_mobile_visit_chairside_light.png", "Mobile Chairside Visit Light 390x844");

  // 2. Proof Mobile Chairside Visit Dark (390x844)
  console.log("[Theme] Applying Dark theme...");
  await applyTheme(page, "dark");
  await takeProof(page, "proof_mobile_visit_chairside_dark.png", "Mobile Chairside Visit Dark 390x844");

  await browser.close();
  console.log("[SUCCESS] Mobile visual proof capture complete!");
}

runCapture().catch((err) => {
  console.error("Capture failed:", err);
  process.exit(1);
});
