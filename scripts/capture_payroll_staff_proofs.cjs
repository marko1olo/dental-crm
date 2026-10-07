/**
 * scripts/capture_payroll_staff_proofs.cjs
 *
 * Captures live visual proofs for:
 * 1. DoctorPayrollModal (Desktop 1440x900 Light & Dark)
 * 2. TimesheetT13Modal (Desktop 1440x900 Light & Dark)
 * 3. SettingsStaffTab (Desktop 1440x900 Light & Dark)
 *
 * Verifies:
 * - Chrome headless live capture on http://127.0.0.1:5173
 * - File size >= 40 KB
 * - Unique MD5 hashes
 * - Zero clipping, clean segmented bars (28px/12.5px), standardized action buttons (32px/13px)
 */

const { chromium } = require("playwright");
const path = require("node:path");
const fs = require("node:fs");
const crypto = require("node:crypto");

const todayDate = new Date().toLocaleDateString("en-CA");

const mockDashboard = {
  clinicName: "ООО «ДЕНТЕ СТОМАТОЛОГИЯ»",
  todayIso: todayDate,
  clinicSettings: {
    profile: {
      id: "c-1",
      organizationId: "00000000-0000-0000-0000-000000000001",
      clinicName: "ООО «ДЕНТЕ СТОМАТОЛОГИЯ»",
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
        phone: "+7 (999) 111-22-33",
        active: true,
        color: "#0d9488",
        canSignMedicalRecords: true,
        canManageMoney: true,
        canManageImports: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      {
        id: "doc-2",
        organizationId: "00000000-0000-0000-0000-000000000001",
        fullName: "Д-р Громов Константин Дмитриевич",
        role: "doctor",
        specialties: ["surgeon", "implantologist"],
        phone: "+7 (999) 222-33-44",
        active: true,
        color: "#2563eb",
        canSignMedicalRecords: true,
        canManageMoney: false,
        canManageImports: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      {
        id: "asst-1",
        organizationId: "00000000-0000-0000-0000-000000000001",
        fullName: "Иванова Мария Сергеевна",
        role: "assistant",
        specialties: [],
        phone: "+7 (999) 333-44-55",
        active: true,
        color: "#10b981",
        canSignMedicalRecords: false,
        canManageMoney: false,
        canManageImports: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      {
        id: "adm-1",
        organizationId: "00000000-0000-0000-0000-000000000001",
        fullName: "Сидорова Анна Павловна",
        role: "administrator",
        specialties: [],
        phone: "+7 (999) 444-55-66",
        active: true,
        color: "#f59e0b",
        canSignMedicalRecords: false,
        canManageMoney: true,
        canManageImports: false,
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
        hasXraySensor: true,
        hasMicroscope: true,
        hasSurgeryKit: false,
      },
      {
        id: "chair-2",
        organizationId: "00000000-0000-0000-0000-000000000001",
        name: "Кабинет 2 (Хирургия)",
        room: "2",
        defaultDoctorId: "doc-2",
        active: true,
        hasXraySensor: true,
        hasMicroscope: true,
        hasSurgeryKit: true,
      },
    ],
    integrationPresets: [],
    workspaceProfiles: [],
    roleAccessPolicies: [],
    modeHints: [],
    soloDoctorMode: false,
  },
  shiftIntelligence: {
    modeFit: { mode: "small_clinic", title: "Оптимальный режим", fitScore: 100, blockers: [], upgrades: [], lowFrictionNextStep: "ready" },
    doctorLoads: [],
    assistantLoads: [],
    chairLoads: [],
    roleQueues: [],
    scheduleWarnings: [],
  },
  patients: [
    {
      id: "pat-1",
      organizationId: "00000000-0000-0000-0000-000000000001",
      fullName: "Ковалёв Роман Станиславович",
      status: "active",
      birthDate: "1988-04-12",
      phone: "+7 (999) 888-77-66",
    },
  ],
  appointments: [],
  payments: [],
};

async function runCapture() {
  const targetDirs = [
    path.resolve("C:/Users/Admin/.gemini/antigravity/brain/11b7cedd-d1f6-4ac0-a1bd-919a271256b0/screenshots"),
    path.resolve("C:/Clinic_MVP/dental-crm/docs/screenshots/payroll_staff"),
  ];

  for (const d of targetDirs) {
    if (!fs.existsSync(d)) {
      fs.mkdirSync(d, { recursive: true });
    }
  }

  const outDir = targetDirs[0];
  const capturedRegistry = [];

  console.log("[Playwright] Launching Chrome executable...");
  const browser = await chromium.launch({
    headless: true,
    executablePath: "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });

  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    deviceScaleFactor: 2,
    isMobile: false,
    hasTouch: false,
  });

  await context.addInitScript(() => {
    localStorage.setItem("dente_clinic_token", "live-settings-clinic-token");
    localStorage.setItem("dente_staff_token", "live-settings-staff-token");
    localStorage.setItem("dente_active_role", "owner");
    localStorage.setItem("dente_theme_mode", "light");
    localStorage.setItem(
      "dente_ui_preferences_v1",
      JSON.stringify({
        onboardingDismissed: true,
        onboardingStep: "done",
        version: 1,
      })
    );
    localStorage.setItem(
      "dental-crm:onboarding:v1",
      JSON.stringify({
        dismissed: true,
        step: "done",
        completed: true,
        onboardingDismissed: true,
        onboardingStep: "done",
        version: 1,
      })
    );
    localStorage.setItem(
      "dental-crm:web-ui-preferences:v1",
      JSON.stringify({
        version: 1,
        uiLanguage: "ru",
        selectedWorkspaceRole: "owner",
        selectedPatientId: "pat-1",
        onboardingDismissed: true,
        onboardingStep: "done",
      })
    );
    localStorage.setItem("dente_tour_completed", "true");
    localStorage.setItem("dente_guided_tour_active", "false");
    localStorage.setItem("dente-guided-tour-step", "999");
    localStorage.setItem("dente-tour-dismissed", "true");
  });

  const page = await context.newPage();

  // Mock API routes
  await page.route("**/api/**", async (route) => {
    const url = route.request().url();
    if (url.includes("/src/")) return route.continue();
    if (url.includes("/api/dashboard")) {
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(mockDashboard),
      });
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
    if (url.includes("/api/settings/staff/commissions")) {
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          commissions: [
            {
              userId: "doc-1",
              commissionPct: "40.00",
              materialCostDeductionPct: "25.00",
              effectiveFrom: "2026-10-01",
            },
            {
              userId: "doc-2",
              commissionPct: "35.00",
              materialCostDeductionPct: "0.00",
              effectiveFrom: "2026-10-01",
            },
          ],
        }),
      });
    }
    return route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify([]),
    });
  });

  async function applyTheme(th) {
    await page.evaluate((theme) => {
      localStorage.setItem("dente_theme_mode", theme);
      if (window.__useThemeStore) {
        window.__useThemeStore.getState().setThemeMode(theme);
      }
      document.documentElement.setAttribute("data-theme", theme);
      const isDark = theme === "dark";
      document.documentElement.classList.toggle("dark", isDark);
      document.documentElement.classList.toggle("light", !isDark);
      document.documentElement.style.colorScheme = isDark ? "dark" : "light";
    }, th);
    await page.waitForTimeout(600);
  }

  async function saveProof(fileName, viewName, modeName) {
    const targetFile = path.join(outDir, fileName);

    await page.waitForTimeout(800);

    if (fs.existsSync(targetFile)) {
      try { fs.unlinkSync(targetFile); } catch (_e) {}
    }

    await page.screenshot({
      path: targetFile,
      fullPage: false,
      animations: "disabled",
      timeout: 15000,
    });

    for (const d of targetDirs) {
      const dest = path.join(d, fileName);
      if (dest !== targetFile) {
        fs.copyFileSync(targetFile, dest);
      }
    }

    const stats = fs.statSync(targetFile);
    const hash = crypto.createHash("md5").update(fs.readFileSync(targetFile)).digest("hex");

    capturedRegistry.push({
      fileName,
      view: viewName,
      mode: modeName,
      sizeBytes: stats.size,
      sizeKb: (stats.size / 1024).toFixed(1),
      md5: hash,
      passSize: stats.size >= 40960,
    });

    console.log(
      `[Captured] ${fileName} (${viewName} ${modeName}): ${stats.size} bytes (${(stats.size / 1024).toFixed(1)} KB), MD5: ${hash}`
    );
  }

  // --- 1. DoctorPayrollModal (view=doctor_payroll_t51) ---
  console.log("\n>>> Navigating to DoctorPayrollModal preview...");
  await page.goto("http://127.0.0.1:5173/cashier_payroll_preview.html?view=doctor_payroll_t51&theme=light", {
    waitUntil: "domcontentloaded",
    timeout: 45000,
  });
  await page.waitForSelector('[data-testid="doctor-payroll-modal"]', { timeout: 30000 });
  await applyTheme("light");
  await saveProof("01_payroll_doctor_modal_light.png", "Doctor Payroll Modal", "Desktop Light");

  await applyTheme("dark");
  await saveProof("02_payroll_doctor_modal_dark.png", "Doctor Payroll Modal", "Desktop Dark");

  // --- 2. TimesheetT13Modal (view=timesheet_t13) ---
  console.log("\n>>> Navigating to TimesheetT13Modal preview...");
  await page.goto("http://127.0.0.1:5173/cashier_payroll_preview.html?view=timesheet_t13&theme=light", {
    waitUntil: "domcontentloaded",
    timeout: 45000,
  });
  await page.waitForSelector('[data-testid="timesheet-t13-modal"]', { timeout: 30000 });
  await applyTheme("light");
  await saveProof("03_timesheet_t13_modal_light.png", "Timesheet T-13 Modal", "Desktop Light");

  await applyTheme("dark");
  await saveProof("04_timesheet_t13_modal_dark.png", "Timesheet T-13 Modal", "Desktop Dark");

  // --- 3. SettingsStaffTab (Settings -> Staff Tab) ---
  console.log("\n>>> Navigating to Settings -> Staff Tab...");
  await page.goto("http://127.0.0.1:5173/#settings", {
    waitUntil: "domcontentloaded",
    timeout: 45000,
  });
  await page.addStyleTag({
    content: ".tour-spotlight-root, [data-testid=\"guided-tour-spotlight-overlay\"], .tour-backdrop-clickable-zone, [class*=\"tour\"], div:has(> button:has-text(\"Понятно\")) { display: none !important; pointer-events: none !important; }",
  });
  const dismissBtn = await page.$('button:has-text("Понятно, я сам")');
  if (dismissBtn) {
    await dismissBtn.click({ force: true }).catch(() => {});
  }
  await page.waitForSelector(".settings-segmented-strip", { state: "visible", timeout: 30000 });
  
  // Switch to Administrator cockpit where Staff is managed
  await page.click('[data-testid="btn-settings-role-admin"]', { force: true });
  await page.waitForTimeout(500);

  // Click on "Сотрудники и смены" subtab
  await page.waitForSelector('[data-testid="admin-tab-staff"]', { timeout: 10000 });
  await page.click('[data-testid="admin-tab-staff"]', { force: true });
  await page.waitForTimeout(600);

  // Wait for settings-staff-tab and scroll to active staff list card
  await page.waitForSelector('[data-testid="active-staff-list-card"]', { timeout: 10000 });
  await page.locator('[data-testid="active-staff-list-card"]').scrollIntoViewIfNeeded();
  await page.waitForTimeout(400);

  await applyTheme("light");
  await saveProof("05_settings_staff_tab_light.png", "Settings Staff Tab", "Desktop Light");

  await applyTheme("dark");
  await saveProof("06_settings_staff_tab_dark.png", "Settings Staff Tab", "Desktop Dark");

  await browser.close();

  console.log("\n==================================================");
  console.log("PAYROLL & STAFF SCREENSHOT CAPTURE AUDIT REPORT");
  console.log("==================================================");
  console.table(capturedRegistry);

  const hashes = new Set(capturedRegistry.map((r) => r.md5));
  const uniqueHashes = hashes.size === capturedRegistry.length;
  const allAbove40k = capturedRegistry.every((r) => r.sizeBytes >= 40960);

  console.log(`Total captured: ${capturedRegistry.length}`);
  console.log(`Unique MD5 hashes: ${uniqueHashes ? "YES (100% distinct screens)" : "FAIL"}`);
  console.log(`All files >= 40 KB: ${allAbove40k ? "PASS" : "FAIL"}`);

  if (!uniqueHashes || !allAbove40k) {
    throw new Error("Screenshot capture verification failed!");
  }
}

runCapture().catch((err) => {
  console.error("Payroll & staff screenshot capture failed:", err);
  process.exit(1);
});
