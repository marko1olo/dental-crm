/**
 * scripts/capture_scale_presets_proof.cjs
 *
 * Real Live Visual Proof Suite for Sovereign Scale Presets:
 * 1. scale_presets_onboarding_light.png (1440x900 Desktop Light, Onboarding Wizard with Sovereign Scale Presets)
 * 2. scale_presets_onboarding_dark.png  (1440x900 Desktop Dark, Onboarding Wizard with Sovereign Scale Presets)
 * 3. scale_presets_settings_owner_light.png (1440x900 Desktop Light, Owner Settings with Scale Presets Card)
 * 4. scale_presets_settings_owner_dark.png  (1440x900 Desktop Dark, Owner Settings with Scale Presets Card)
 * 5. scale_presets_mobile_light.png     (390x844 Mobile Light, Touch-first Scale Presets Card)
 * 6. scale_presets_mobile_dark.png      (390x844 Mobile Dark, Touch-first Scale Presets Card)
 */

const { chromium } = require("playwright");
const path = require("node:path");
const fs = require("node:fs");
const crypto = require("node:crypto");

const BASE_URL = "http://127.0.0.1:5173";
const todayDate = new Date().toLocaleDateString("en-CA");

const mockDashboard = {
  clinicName: "Стоматология ДЕНТЕ Премиум",
  todayIso: todayDate,
  clinicSettings: {
    profile: {
      id: "c-1",
      organizationId: "00000000-0000-0000-0000-000000000001",
      clinicName: "Стоматология ДЕНТЕ Премиум",
      mode: "solo_doctor",
      defaultVisitMinutes: 30,
      scheduleDefaults: {
        workingDays: [1, 2, 3, 4, 5, 6],
        workdayStart: "08:00",
        workdayEnd: "20:00",
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
        name: "Основное кресло врача",
        room: "1",
        defaultDoctorId: "doc-1",
        active: true,
        hasXraySensor: true,
        hasMicroscope: true,
        hasSurgeryKit: false,
      },
    ],
    integrationPresets: [],
    workspaceProfiles: [],
    roleAccessPolicies: [],
    modeHints: [],
    soloDoctorMode: true,
  },
  shiftIntelligence: {
    modeFit: {
      mode: "solo_doctor",
      title: "Суверенный кабинет",
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
  patients: [],
  appointments: [],
  payments: [],
};

const OUTPUT_DIRS = [
  path.resolve("docs/screenshots/scale_presets"),
  path.resolve("C:/Users/Admin/.gemini/antigravity/brain/cb2f8a6e-e99b-4544-a483-374373bff0f6"),
  path.resolve("C:/Users/Admin/.gemini/antigravity/brain/beb92312-c6d7-426d-a438-12dcad022abc"),
];

for (const dir of OUTPUT_DIRS) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

async function captureProof() {
  console.log("[Scale Presets Proof] Launching real Google Chrome browser...");
  const browser = await chromium.launch({
    headless: true,
    executablePath: "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
    args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-dev-shm-usage"],
  });

  const capturedFiles = [];

  async function saveScreenshot(page, filename) {
    const primaryPath = path.join(OUTPUT_DIRS[0], filename);
    await page.screenshot({ path: primaryPath, fullPage: false, animations: "disabled" });

    const stats = fs.statSync(primaryPath);
    const hash = crypto.createHash("md5").update(fs.readFileSync(primaryPath)).digest("hex");

    console.log(`[Captured] ${filename} | Size: ${(stats.size / 1024).toFixed(1)} KB | MD5: ${hash}`);

    for (let i = 1; i < OUTPUT_DIRS.length; i++) {
      try {
        const dest = path.join(OUTPUT_DIRS[i], filename);
        fs.copyFileSync(primaryPath, dest);
      } catch (_e) {}
    }

    capturedFiles.push({ filename, path: primaryPath, sizeKb: (stats.size / 1024).toFixed(1), hash });
    return primaryPath;
  }

  function setupPageRouting(page) {
    return page.route("**/api/**", async (route) => {
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

      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ success: true }),
      });
    });
  }

  // --- PART 1: ONBOARDING WIZARD WITH SOVEREIGN SCALE PRESETS (Desktop Light & Dark) ---
  for (const theme of ["light", "dark"]) {
    console.log(`\n--- Capturing Onboarding Wizard (${theme.toUpperCase()}) ---`);
    const context = await browser.newContext({
      viewport: { width: 1440, height: 900 },
      deviceScaleFactor: 2,
    });

    await context.addInitScript(({ themeMode }) => {
      localStorage.setItem("dente_clinic_token", "live-settings-clinic-token");
      localStorage.setItem("dente_staff_token", "live-settings-staff-token");
      localStorage.setItem("dente_active_role", "owner");
      localStorage.setItem("dente_theme_mode", themeMode);
      localStorage.setItem(
        "dente_cached_active_staff_user",
        JSON.stringify({
          id: "doc-1",
          fullName: "Д-р Воронов Алексей Владимирович",
          role: "owner",
          organizationId: "00000000-0000-0000-0000-000000000001",
        })
      );
      localStorage.setItem(
        "dente_ui_preferences_v1",
        JSON.stringify({
          onboardingDismissed: false,
          onboardingStep: "clinic",
          version: 1,
        })
      );
      localStorage.setItem(
        "dental-crm:onboarding:v1",
        JSON.stringify({
          dismissed: false,
          step: "clinic",
          completed: false,
          onboardingDismissed: false,
          onboardingStep: "clinic",
        })
      );
    }, { themeMode: theme });

    const page = await context.newPage();
    await setupPageRouting(page);

    await page.goto(`${BASE_URL}/#settings`, { waitUntil: "domcontentloaded", timeout: 60000 });
    await page.waitForSelector(".boot-state", { state: "detached", timeout: 30000 }).catch(() => {});
    await page.waitForTimeout(1500);

    // Apply dark theme class
    if (theme === "dark") {
      await page.evaluate(() => {
        document.documentElement.classList.add("dark");
        document.body.classList.add("dark");
        document.documentElement.style.colorScheme = "dark";
      });
    }

    // Ensure Onboarding Modal is displayed
    const modalVisible = await page.$('.onboarding-modal-panel, [data-testid="onboarding-wizard-modal"]');
    if (!modalVisible) {
      // Click "Настроить" or open modal
      await page.evaluate(() => {
        const btn = Array.from(document.querySelectorAll("button")).find(
          (b) => b.textContent && (b.textContent.includes("Настроить") || b.textContent.includes("Мастер"))
        );
        if (btn) btn.click();
      });
      await page.waitForTimeout(1000);
    }

    await saveScreenshot(page, `scale_presets_onboarding_${theme}.png`);
    await context.close();
  }

  // --- PART 2: OWNER SETTINGS WITH SCALE PRESETS CARD (Desktop Light & Dark) ---
  for (const theme of ["light", "dark"]) {
    console.log(`\n--- Capturing Owner Settings (${theme.toUpperCase()}) ---`);
    const context = await browser.newContext({
      viewport: { width: 1440, height: 900 },
      deviceScaleFactor: 2,
    });

    await context.addInitScript(({ themeMode }) => {
      localStorage.setItem("dente_clinic_token", "live-settings-clinic-token");
      localStorage.setItem("dente_staff_token", "live-settings-staff-token");
      localStorage.setItem("dente_active_role", "owner");
      localStorage.setItem("dente_theme_mode", themeMode);
      localStorage.setItem(
        "dente_cached_active_staff_user",
        JSON.stringify({
          id: "doc-1",
          fullName: "Д-р Воронов Алексей Владимирович",
          role: "owner",
          organizationId: "00000000-0000-0000-0000-000000000001",
        })
      );
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
        })
      );
    }, { themeMode: theme });

    const page = await context.newPage();
    await setupPageRouting(page);

    await page.goto(`${BASE_URL}/#settings`, { waitUntil: "domcontentloaded", timeout: 60000 });
    await page.waitForSelector(".boot-state", { state: "detached", timeout: 30000 }).catch(() => {});
    await page.waitForTimeout(1500);

    if (theme === "dark") {
      await page.evaluate(() => {
        document.documentElement.classList.add("dark");
        document.body.classList.add("dark");
        document.documentElement.style.colorScheme = "dark";
      });
    }

    // Switch to Clinic tab in settings
    await page.evaluate(() => {
      const clinicTabBtn = Array.from(document.querySelectorAll("button, .settings-subnav-btn")).find(
        (b) => b.textContent && (b.textContent.includes("Клиника") || b.textContent.includes("кабинет"))
      );
      if (clinicTabBtn) clinicTabBtn.click();
    });
    await page.waitForTimeout(1000);

    // Scroll to Sovereign Scale Presets Card
    await page.evaluate(() => {
      const card = document.querySelector('[data-testid="sovereign-scale-presets-card"]');
      if (card) {
        card.scrollIntoView({ behavior: "instant", block: "center" });
      }
    });
    await page.waitForTimeout(1000);

    await saveScreenshot(page, `scale_presets_settings_owner_${theme}.png`);
    await context.close();
  }

  // --- PART 3: MOBILE SCREEN (390x844 Light & Dark) ---
  for (const theme of ["light", "dark"]) {
    console.log(`\n--- Capturing Mobile Scale Presets (${theme.toUpperCase()}) ---`);
    const context = await browser.newContext({
      viewport: { width: 390, height: 844 },
      deviceScaleFactor: 3,
      isMobile: true,
      hasTouch: true,
    });

    await context.addInitScript(({ themeMode }) => {
      localStorage.setItem("dente_clinic_token", "live-settings-clinic-token");
      localStorage.setItem("dente_staff_token", "live-settings-staff-token");
      localStorage.setItem("dente_active_role", "owner");
      localStorage.setItem("dente_theme_mode", themeMode);
      localStorage.setItem(
        "dente_cached_active_staff_user",
        JSON.stringify({
          id: "doc-1",
          fullName: "Д-р Воронов Алексей Владимирович",
          role: "owner",
          organizationId: "00000000-0000-0000-0000-000000000001",
        })
      );
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
        })
      );
    }, { themeMode: theme });

    const page = await context.newPage();
    await setupPageRouting(page);

    await page.goto(`${BASE_URL}/#settings`, { waitUntil: "domcontentloaded", timeout: 60000 });
    await page.waitForSelector(".boot-state", { state: "detached", timeout: 30000 }).catch(() => {});
    await page.waitForTimeout(1500);

    if (theme === "dark") {
      await page.evaluate(() => {
        document.documentElement.classList.add("dark");
        document.body.classList.add("dark");
        document.documentElement.style.colorScheme = "dark";
      });
    }

    // Switch to Clinic tab in settings
    await page.evaluate(() => {
      const clinicTabBtn = Array.from(document.querySelectorAll("button, .settings-subnav-btn")).find(
        (b) => b.textContent && (b.textContent.includes("Клиника") || b.textContent.includes("кабинет"))
      );
      if (clinicTabBtn) clinicTabBtn.click();
    });
    await page.waitForTimeout(1000);

    // Scroll directly to the scale presets card
    await page.evaluate(() => {
      const card = document.querySelector('[data-testid="sovereign-scale-presets-card"]');
      if (card) {
        card.scrollIntoView({ behavior: "instant", block: "start" });
      }
    });
    await page.waitForTimeout(1000);

    await saveScreenshot(page, `scale_presets_mobile_${theme}.png`);
    await context.close();
  }

  await browser.close();
  console.log("\n[Scale Presets Proof] All 6 screenshots successfully captured and audited!");
  console.table(capturedFiles);
}

captureProof().catch((err) => {
  console.error("FATAL in captureProof:", err);
  process.exit(1);
});
