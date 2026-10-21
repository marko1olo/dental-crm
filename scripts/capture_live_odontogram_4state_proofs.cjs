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
      hasPediatricMode: true,
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
        active: true,
        sortOrder: 1,
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
      email: "kovalev@example.ru",
      notes: "Аллергия на пенициллин. Дентальная фобия средней степени.",
      balance: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
  ],
  appointments: [
    {
      id: "app-1",
      organizationId: "00000000-0000-0000-0000-000000000001",
      patientId: "pat-1",
      doctorId: "doc-1",
      chairId: "chair-1",
      date: todayDate,
      startTime: "10:00",
      endTime: "11:00",
      status: "in_chair",
      type: "treatment",
      treatmentNotes: "Лечение глубокого кариеса зуба 1.6",
      patientName: "Ковалёв Роман Станиславович",
      doctorName: "Д-р Воронов Алексей Владимирович",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
  ],
  activeVisit: {
    id: "00000000-0000-0000-0000-000000000010",
    appointmentId: "app-1",
    patientId: "pat-1",
    status: "in_chair",
  },
  payments: [],
  billingSummary: {
    totalPlannedRub: 0,
    totalInvoicedRub: 0,
    totalPaidRub: 0,
    balanceRub: 0,
  },
};

const outputDir = path.resolve(__dirname, "../docs/proofs/odontogram");
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

function addInitStorage(context) {
  return context.addInitScript(() => {
    localStorage.setItem("dente_clinic_token", "audit-token-clinic");
    localStorage.setItem("dente_staff_token", "audit-token-staff");
    localStorage.setItem("dente_active_role", "owner");
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
    sessionStorage.setItem("dente_chunk_reload_/", "1");
    localStorage.setItem(
      "dente-workspace-profile",
      JSON.stringify({
        state: {
          clinicName: "Стоматология ДЕНТЕ Премиум",
          currentDoctor: { id: "doc-1", fullName: "Д-р Воронов Алексей Владимирович", role: "owner" },
          flags: { disableTour: true, hasPediatricMode: true },
        },
      })
    );
  });
}

function setupRoutes(page) {
  return page.route("**/api/**", async (route) => {
    const url = route.request().url();
    if (url.includes("/src/")) return route.continue();
    if (url.includes("/api/dashboard") || url.includes("/api/bootstrap")) {
      return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(mockDashboard) });
    }
    if (url.includes("/api/auth/user/me") || url.includes("/api/auth/session")) {
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
        body: JSON.stringify({ success: true, states: [] }),
      });
    }
    if (url.includes("/api/schedule")) {
      return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(mockDashboard.appointments) });
    }
    if (url.includes("/api/patients")) {
      return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(mockDashboard.patients) });
    }
    return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify([]) });
  });
}

async function setTheme(page, theme) {
  await page.evaluate((th) => {
    if (window.__useThemeStore) {
      window.__useThemeStore.getState().setThemeMode(th);
    }
    document.documentElement.setAttribute("data-theme", th);
    const isDark = th === "dark";
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
  await page.waitForTimeout(600);
}

async function run() {
  console.log("=== Launching Playwright 4-State Proof Runner ===");

  const browser = await chromium.launch({
    channel: "msedge",
    headless: true,
    args: ["--no-sandbox", "--disable-gpu", "--force-device-scale-factor=1"],
  });

  try {
    // -------------------------------------------------------------------------
    // 1 & 2: PC Desktop (1440x900) - Light & Dark
    // -------------------------------------------------------------------------
    console.log("Setting up PC Context (1440x900)...");
    const pcContext = await browser.newContext({
      viewport: { width: 1440, height: 900 },
      deviceScaleFactor: 1,
    });
    await addInitStorage(pcContext);
    const pcPage = await pcContext.newPage();
    await setupRoutes(pcPage);

    console.log("Navigating PC to http://127.0.0.1:5173/#visit ...");
    await pcPage.goto("http://127.0.0.1:5173/#visit", { waitUntil: "domcontentloaded", timeout: 45000 });

    console.log("Waiting for VisitView / Odontogram tab on PC...");
    await pcPage.waitForSelector('[data-testid="visit-subtab-odontogram"], .visit-subtab-btn:has-text("Зубная формула"), button:has-text("Зубная формула"), [data-testid="odontogram-view-container"]', { timeout: 35000 });

    await pcPage.evaluate(() => {
      if (window.location.hash !== "#visit") window.location.hash = "#visit";
      document.querySelectorAll(".tour-spotlight-root, [data-testid=\"guided-tour-spotlight-overlay\"], .tour-backdrop-clickable-zone, .global-toast-container").forEach((el) => el.remove());
    });

    const pcOdontogramTab = pcPage.locator("[data-testid='visit-subtab-odontogram'], .visit-subtab-btn:has-text('Зубная формула'), button:has-text('Зубная формула')").first();
    if (await pcOdontogramTab.isVisible()) {
      await pcOdontogramTab.click();
    }

    console.log("Waiting for Odontogram container on PC...");
    await pcPage.waitForSelector('[data-testid="odontogram-view-container"], .odontogram-active-view-slot, .tooth-chart-svg', { timeout: 35000 });
    await pcPage.waitForTimeout(1500);

    // 1. PC Light
    await setTheme(pcPage, "light");
    const pcLightPath = path.join(outputDir, "odontogram_live_pc_light.png");
    await pcPage.screenshot({ path: pcLightPath, fullPage: false, animations: "disabled" });
    const pcLightSize = fs.statSync(pcLightPath).size;
    console.log(`[1/4] odontogram_live_pc_light.png: ${(pcLightSize / 1024).toFixed(1)} KB`);
    if (pcLightSize < 20480) throw new Error("PC Light size < 20KB");

    // 2. PC Dark
    await setTheme(pcPage, "dark");
    const pcDarkPath = path.join(outputDir, "odontogram_live_pc_dark.png");
    await pcPage.screenshot({ path: pcDarkPath, fullPage: false, animations: "disabled" });
    const pcDarkSize = fs.statSync(pcDarkPath).size;
    console.log(`[2/4] odontogram_live_pc_dark.png: ${(pcDarkSize / 1024).toFixed(1)} KB`);
    if (pcDarkSize < 20480) throw new Error("PC Dark size < 20KB");

    await pcContext.close();

    // -------------------------------------------------------------------------
    // 3 & 4: Mobile iPhone 14 (390x844) - Light & Dark
    // -------------------------------------------------------------------------
    console.log("Setting up Mobile Context (390x844)...");
    const mobileContext = await browser.newContext({
      viewport: { width: 390, height: 844 },
      deviceScaleFactor: 2,
      isMobile: true,
      hasTouch: true,
    });
    await addInitStorage(mobileContext);
    const mPage = await mobileContext.newPage();
    await setupRoutes(mPage);

    console.log("Navigating Mobile to http://127.0.0.1:5173/#visit ...");
    await mPage.goto("http://127.0.0.1:5173/#visit", { waitUntil: "domcontentloaded", timeout: 45000 });
    
    console.log("Waiting for Mobile Chairside / Visit workspace on Mobile...");
    await mPage.waitForSelector('[data-testid="mobile-chairside-visit-workspace"], [data-testid="visit-subtab-odontogram"], .mobile-chairside-header, [data-testid="odontogram-view-container"]', { timeout: 35000 });

    await mPage.evaluate(() => {
      if (window.location.hash !== "#visit") window.location.hash = "#visit";
      document.querySelectorAll(".tour-spotlight-root, [data-testid=\"guided-tour-spotlight-overlay\"], .tour-backdrop-clickable-zone, .global-toast-container").forEach((el) => el.remove());
    });

    const examStepBtn = mPage.locator('[data-testid*="-step-exam"], button:has-text("2. Осмотр"), [data-testid="visit-subtab-odontogram"]').first();
    if (await examStepBtn.isVisible()) {
      console.log("Clicking Mobile Exam / Teeth step button...");
      await examStepBtn.click();
    }

    console.log("Waiting for Mobile Teeth Selector to render...");
    await mPage.waitForSelector('[data-testid*="-teeth-scroller"], .mobile-quadrant-tabs, [data-testid*="-teeth-norm-btn"], [data-testid="odontogram-view-container"]', { timeout: 35000 });
    await mPage.waitForTimeout(1500);

    // 3. Mobile Light
    await setTheme(mPage, "light");
    const mLightPath = path.join(outputDir, "odontogram_live_mobile_light.png");
    await mPage.screenshot({ path: mLightPath, fullPage: false, animations: "disabled" });
    const mLightSize = fs.statSync(mLightPath).size;
    console.log(`[3/4] odontogram_live_mobile_light.png: ${(mLightSize / 1024).toFixed(1)} KB`);
    if (mLightSize < 20480) throw new Error("Mobile Light size < 20KB");

    // 4. Mobile Dark
    await setTheme(mPage, "dark");
    const mDarkPath = path.join(outputDir, "odontogram_live_mobile_dark.png");
    await mPage.screenshot({ path: mDarkPath, fullPage: false, animations: "disabled" });
    const mDarkSize = fs.statSync(mDarkPath).size;
    console.log(`[4/4] odontogram_live_mobile_dark.png: ${(mDarkSize / 1024).toFixed(1)} KB`);
    if (mDarkSize < 20480) throw new Error("Mobile Dark size < 20KB");

    await mobileContext.close();

    console.log("=== All 4 proofs verified successfully! ===");
  } finally {
    await browser.close();
  }
}

run().catch((err) => {
  console.error("FATAL ERROR in 4-state proof runner:", err);
  process.exit(1);
});
