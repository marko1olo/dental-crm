/**
 * scripts/capture_settings_roles_screenshots.cjs
 * Subagent 4 (Settings Roles & Sections Stylist) Live Visual Proof Pipeline.
 *
 * Captures:
 * 1. 42_settings_clinic_desktop_light.png (1440x900 Desktop Light, Settings Clinic with Segmented Control Strip)
 * 2. 43_settings_clinic_desktop_dark.png  (1440x900 Desktop Dark, Settings Clinic with Segmented Control Strip)
 * 3. 44_settings_role_doctor_light.png    (1440x900 Desktop Light, Doctor Cockpit)
 * 4. 45_settings_role_admin_light.png     (1440x900 Desktop Light, Admin Cockpit)
 * 5. 46_settings_role_all_tabs_light.png  (1440x900 Desktop Light, All Sections 20-tab Catalogue with Lucide icons)
 *
 * Standards:
 * - Real headless Chromium execution (Google Chrome)
 * - Minimum file size >= 40 KB
 * - Distinct MD5 hashes
 * - Output in docs/screenshots/inquisition_live/ and copied to brain directories
 */

const { chromium } = require("playwright");
const path = require("node:path");
const fs = require("node:fs");
const crypto = require("node:crypto");

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
        defaultDoctorId: "doc-1",
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
    modeFit: {
      mode: "small_clinic",
      title: "Оптимальный режим",
      fitScore: 100,
      blockers: [],
      upgrades: [],
      lowFrictionNextStep: "ready",
    },
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

async function runSettingsCapture() {
  const targetDirs = [
    path.resolve("C:/Clinic_MVP/dental-crm/docs/screenshots/inquisition_live"),
    path.resolve("C:/Users/Admin/.gemini/antigravity/brain/a84df016-a7cc-461c-ba80-899ae84de477/screenshots"),
    path.resolve("C:/Users/Admin/.gemini/antigravity/brain/4309fd1a-0e76-4f88-a590-4fcf5eb86f12/screenshots"),
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
    localStorage.setItem(
      "dente-workspace-profile",
      JSON.stringify({
        state: {
          clinicName: "Стоматология ДЕНТЕ Премиум",
          currentDoctor: { id: "doc-1", fullName: "Д-р Воронов Алексей Владимирович", role: "owner" },
          flags: { disableTour: true },
        },
      })
    );
  });

  const page = await context.newPage();

  // Setup route mocking
  await page.route("**/api/**", async (route) => {
    const url = route.request().url();
    if (url.includes("/src/")) {
      return route.continue();
    }
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
    if (url.includes("/api/auth/staff/unlock")) {
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          success: true,
          token: "live-settings-staff-token",
          user: {
            id: "doc-1",
            fullName: "Д-р Воронов Алексей Владимирович",
            role: "owner",
          },
        }),
      });
    }
    if (url.includes("/api/schedule")) {
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(mockDashboard.appointments),
      });
    }
    if (url.includes("/api/patients")) {
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(mockDashboard.patients),
      });
    }
    return route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(url.includes("list") || url.includes("status") ? [] : {}),
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

  async function takeProof(fileName, viewName, modeName) {
    const targetFile = path.join(outDir, fileName);

    await page.waitForSelector(".boot-state", { state: "detached", timeout: 30000 }).catch(() => {});
    await page.waitForSelector(".settings-segmented-strip", { state: "visible", timeout: 30000 });
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

  console.log("Navigating to http://127.0.0.1:5173/#settings...");
  await page.goto("http://127.0.0.1:5173/#settings", { waitUntil: "domcontentloaded", timeout: 60000 });
  await page.waitForSelector(".boot-state", { state: "detached", timeout: 60000 });
  await page.waitForSelector(".settings-segmented-strip", { state: "visible", timeout: 30000 });
  console.log("Settings view loaded successfully!");

  // Ensure Owner role is selected to view Clinic settings
  await page.click('[data-testid="btn-settings-role-owner"]');
  await page.waitForTimeout(600);

  // Click on "Клиника" subtab in owner section if available
  const clinicTabBtn = await page.$('.settings-subnav-btn:has-text("Клиника")');
  if (clinicTabBtn) {
    await clinicTabBtn.click();
    await page.waitForTimeout(600);
  }

  // 1. 42_settings_clinic_desktop_light.png
  await applyTheme("light");
  await takeProof("42_settings_clinic_desktop_light.png", "Settings Clinic", "Desktop Light");

  // 2. 43_settings_clinic_desktop_dark.png
  await applyTheme("dark");
  await takeProof("43_settings_clinic_desktop_dark.png", "Settings Clinic", "Desktop Dark");

  // 3. 44_settings_role_doctor_light.png
  await applyTheme("light");
  await page.click('[data-testid="btn-settings-role-doctor"]');
  await page.waitForTimeout(600);
  await takeProof("44_settings_role_doctor_light.png", "Settings Doctor", "Desktop Light");

  // 4. 45_settings_role_admin_light.png
  await page.click('[data-testid="btn-settings-role-admin"]');
  await page.waitForTimeout(600);
  await takeProof("45_settings_role_admin_light.png", "Settings Admin", "Desktop Light");

  // 5. 46_settings_role_all_tabs_light.png
  await page.click('[data-testid="btn-settings-role-all"]');
  await page.waitForTimeout(600);
  await takeProof("46_settings_role_all_tabs_light.png", "Settings All Tabs", "Desktop Light");

  await browser.close();

  console.log("\n==================================================");
  console.log("SETTINGS SCREENSHOT CAPTURE AUDIT REPORT");
  console.log("==================================================");
  console.table(capturedRegistry);

  const hashes = new Set(capturedRegistry.map((r) => r.md5));
  const uniqueHashes = hashes.size === capturedRegistry.length;
  const allAbove40k = capturedRegistry.every((r) => r.sizeBytes >= 40960);

  console.log(`Total captured: ${capturedRegistry.length}`);
  console.log(`Unique MD5 hashes: ${uniqueHashes ? "YES (100% distinct screens)" : "FAIL"}`);
  console.log(`All files >= 40 KB: ${allAbove40k ? "PASS" : "FAIL"}`);

  if (!uniqueHashes || !allAbove40k) {
    throw new Error("Settings screenshot capture verification failed!");
  }
}

runSettingsCapture().catch((err) => {
  console.error("Settings screenshot capture failed:", err);
  process.exit(1);
});
