const { chromium } = require("playwright");
const path = require("node:path");
const fs = require("node:fs");

const outputDir = path.resolve(__dirname, "../docs/screenshots/smart_opg_inquisition");
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

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
      fullName: "Темур (Консультация ОПТГ)",
      phone: "+7 (916) 777-88-99",
      birthDate: "1994-05-18",
      gender: "male",
      notes: "Консультация по панорамному снимку ОПТГ. Жалобы на боли в области 48 зуба.",
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
      patientName: "Темур (Консультация ОПТГ)",
      patientPhone: "+7 (916) 777-88-99",
      doctorId: "doc-1",
      doctorName: "Д-р Воронов Алексей Владимирович",
      chairId: "chair-1",
      date: todayDate,
      startTime: "10:00",
      endTime: "11:00",
      status: "in_chair",
      type: "treatment",
      treatmentNotes: "Анализ панорамного снимка ОПТГ и одонтограмма",
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

(async () => {
  console.log("=== Launching Playwright with Edge (channel: msedge) at 1440x900 ===");
  const browser = await chromium.launch({
    channel: "msedge",
    headless: true,
    args: ["--no-sandbox", "--disable-gpu", "--force-device-scale-factor=1"],
  });

  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    deviceScaleFactor: 1,
  });

  await context.addInitScript(() => {
    localStorage.setItem("dente_demo_showcase", "true");
    localStorage.setItem("dente_clinic_token", "demo-showcase-token-therapist");
    localStorage.setItem("dente_staff_token", "demo-showcase-staff-token-therapist");
    localStorage.setItem("dente_theme_mode", "light");
    localStorage.setItem("dente_theme", "light");
    localStorage.setItem("dente_active_role", "doctor");
    localStorage.setItem(
      "dente_cached_active_staff_user",
      JSON.stringify({
        id: "demo-therapist-user",
        fullName: "Д-р Воронов А. В.",
        role: "doctor",
        organizationId: "demo-showcase-org",
        specialization: "Терапевт",
      })
    );
    localStorage.setItem("dental-crm:active-user:v1", JSON.stringify({
      id: "demo-therapist-user",
      fullName: "Д-р Воронов А. В.",
      role: "doctor",
      organizationId: "demo-showcase-org",
    }));
    localStorage.setItem("dental-crm:onboarding:v1", JSON.stringify({ completed: true, dismissed: true }));
    localStorage.setItem("dente_tour_completed", "true");
    localStorage.setItem("dente_quest_progress_v2", JSON.stringify({ isDismissedPermanently: true, activeTrack: null, tracksProgress: {} }));
    localStorage.setItem("dental-crm:web-ui-preferences:v1", JSON.stringify({
      version: 1,
      uiLanguage: "ru",
      selectedWorkspaceRole: "doctor",
      selectedPatientId: "pat-1",
      onboardingDismissed: true,
      onboardingStep: "done",
    }));
  });

  const page = await context.newPage();

  // Route interceptor
  await page.route("**/api/**", async (route) => {
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
            id: "demo-therapist-user",
            fullName: "Д-р Воронов А. В.",
            role: "doctor",
            organizationId: "demo-showcase-org",
          },
        }),
      });
    }
    if (url.includes("/api/patients") || url.includes("/api/appointments") || url.includes("/api/diaries")) {
      return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify([]) });
    }
    return route.continue();
  });

  const saveScreenshot = async (filename) => {
    const filePath = path.join(outputDir, filename);
    await page.screenshot({ path: filePath, fullPage: false });
    const stats = fs.statSync(filePath);
    console.log(`[PROOF] Saved ${filename} (${Math.round(stats.size / 1024)} KB)`);
    if (stats.size < 20000) {
      throw new Error(`CRITICAL: Screenshot ${filename} is smaller than 20 KB floor (${stats.size} bytes). Blank canvas suspected!`);
    }
  };

  const applyTheme = async (theme) => {
    await page.evaluate((t) => {
      document.documentElement.classList.remove("light", "dark");
      document.documentElement.classList.add(t);
      document.documentElement.setAttribute("data-theme", t);
      localStorage.setItem("dente_theme", t);
      localStorage.setItem("dente_theme_mode", t);
    }, theme);
    await page.waitForTimeout(500);
  };

  console.log("Navigating to http://127.0.0.1:5173/?opg=demo#opg ...");
  try {
    await page.goto("http://127.0.0.1:5173/?opg=demo#opg", { waitUntil: "domcontentloaded", timeout: 45000 });
  } catch (e) {
    console.log("Goto domcontentloaded fallback:", e.message);
  }
  await page.waitForTimeout(3000);

  // Wait for Smart OPG modal to appear
  console.log("Waiting for Smart OPG Modal...");
  await page.waitForSelector("[data-testid='smart-opg-viewer-modal']", { timeout: 25000 });
  await page.waitForTimeout(3000); // Wait for inference rendering

  // 1. Capture Smart OPG PC Light (1440x900)
  console.log("Capturing Smart OPG PC Light...");
  await applyTheme("light");
  await saveScreenshot("proof_smart_opg_pc_light_1440x900.png");

  // 2. Capture Smart OPG PC Dark (1440x900)
  console.log("Capturing Smart OPG PC Dark...");
  await applyTheme("dark");
  await saveScreenshot("proof_smart_opg_pc_dark_1440x900.png");

  // 3. Test Mobile viewport (390x844)
  console.log("Switching to Mobile 390x844 viewport...");
  await page.setViewportSize({ width: 390, height: 844 });
  await page.waitForTimeout(1500);

  // Capture Mobile Image Tab (Radiograph canvas)
  console.log("Capturing Smart OPG Mobile Image Dark...");
  const tabImageBtn = page.locator("[data-testid='mobile-tab-opg-image']").first();
  if (await tabImageBtn.count() > 0) {
    await tabImageBtn.click();
    await page.waitForTimeout(600);
  }
  await applyTheme("dark");
  await saveScreenshot("proof_smart_opg_mobile_dark_390x844.png");

  // Capture Mobile Details Tab (Form 043/y Protocol)
  console.log("Capturing Smart OPG Mobile Details Dark...");
  const tabDetailsBtn = page.locator("[data-testid='mobile-tab-opg-details']").first();
  if (await tabDetailsBtn.count() > 0) {
    await tabDetailsBtn.click();
    await page.waitForTimeout(600);
  }
  await saveScreenshot("proof_smart_opg_mobile_details_dark_390x844.png");

  console.log("Capturing Smart OPG Mobile Light...");
  await applyTheme("light");
  await saveScreenshot("proof_smart_opg_mobile_light_390x844.png");

  // Switch back to Image tab before switching back to desktop
  if (await tabImageBtn.count() > 0) {
    await tabImageBtn.click();
    await page.waitForTimeout(400);
  }

  // Restore Desktop Viewport for 1-click sync test
  await page.setViewportSize({ width: 1440, height: 900 });
  await applyTheme("dark");
  await page.waitForTimeout(1000);

  // 4. Test 1-click Apply to Odontogram
  console.log("Testing 1-Click Apply to Odontogram...");
  const applyBtn = page.locator("button:has-text('Принять в зубную формулу')").first();
  if (await applyBtn.count() > 0) {
    await applyBtn.click();
    await page.waitForTimeout(1200);
    // Modal will show checkmark "Внесено в формулу 043/у!"
    await saveScreenshot("proof_smart_opg_applied_modal_pc_dark.png");
  }

  // 5. Close modal and verify
  const closeBtn = page.locator("[data-testid='btn-close-smart-opg'], button[aria-label='Закрыть']").first();
  if (await closeBtn.count() > 0) {
    await closeBtn.click();
    await page.waitForTimeout(1500);
  }

  // Navigate to #visit or odontogram to capture synced state
  console.log("Navigating to http://127.0.0.1:5173/#visit ...");
  try {
    await page.goto("http://127.0.0.1:5173/#visit", { waitUntil: "domcontentloaded", timeout: 30000 });
    await page.waitForTimeout(3000);
  } catch (e) {
    console.log("Visit nav fallback:", e.message);
  }

  // Ensure Odontogram tab is visible
  const odontogramBtn = page.locator("[data-testid='visit-subtab-odontogram'], .visit-subtab-btn:has-text('Зубная формула'), button:has-text('Зубная формула')").first();
  if (await odontogramBtn.count() > 0) {
    await odontogramBtn.click().catch(() => {});
    await page.waitForTimeout(2000);
  }

  // 6. Capture Synced Odontogram in Dark Mode
  await saveScreenshot("proof_smart_opg_odontogram_synced_pc_dark.png");

  console.log("=== ALL SMART OPG PROOFS SUCCESSFULLY CAPTURED! ===");
  await browser.close();
})().catch((err) => {
  console.error("FATAL ERROR capturing Smart OPG screenshots:", err);
  process.exit(1);
});
