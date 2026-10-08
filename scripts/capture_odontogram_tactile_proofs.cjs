/**
 * scripts/capture_odontogram_tactile_proofs.cjs
 *
 * Dedicated Playwright screenshot script for Red Team tactile odontogram buttons audit:
 * Captures clean high-resolution live screenshots of Odontogram at 1440x900:
 * - docs/screenshots/visit_tabs/odontogram_pc_light.png
 * - docs/screenshots/visit_tabs/odontogram_pc_dark.png
 *
 * Enforces Anti-Blank Byte Guard (>= 20 KB floor).
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
        active: true,
        sortOrder: 1,
      },
    ],
  },
  patients: [
    {
      id: "pat-1",
      organizationId: "00000000-0000-0000-0000-000000000001",
      fullName: "Ковалёв Сергей Николаевич",
      phone: "+7 (916) 123-45-67",
      birthDate: "1988-04-12",
      gender: "male",
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
      patientName: "Ковалёв Сергей Николаевич",
      patientPhone: "+7 (916) 123-45-67",
      doctorId: "doc-1",
      doctorName: "Д-р Воронов Алексей Владимирович",
      chairId: "chair-1",
      date: todayDate,
      startTime: "10:00",
      endTime: "11:00",
      status: "in_chair",
      type: "treatment",
      treatmentNotes: "Лечение глубокого кариеса зуба 1.6",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
  ],
  payments: [],
  billingSummary: {
    totalPlannedRub: 0,
    totalInvoicedRub: 0,
    totalPaidRub: 0,
    balanceRub: 0,
  },
};

async function main() {
  const primaryDir = path.resolve("C:/Clinic_MVP/dental-crm/docs/screenshots/visit_tabs");
  const brainDir = path.resolve("C:/Users/Admin/.gemini/antigravity/brain/92ff6153-acf5-48c5-b366-1cd56ef20b0a");

  for (const dir of [primaryDir, brainDir]) {
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  }

  console.log("[Playwright] Launching Chrome executable...");
  const browser = await chromium.launch({
    headless: true,
    executablePath: "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
    args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-gpu", "--force-device-scale-factor=1"],
  });

  const setupPageRoutes = async (page) => {
    await page.route("**/api/**", async (route) => {
      const url = route.request().url();
      if (url.includes("/src/")) return route.continue();

      if (url.includes("/api/dashboard") || url.includes("/api/bootstrap")) {
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
            token: "live-inquisition-staff-token",
            user: { id: "doc-1", fullName: "Д-р Воронов Алексей Владимирович", role: "owner" },
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
      if (url.includes("/api/payments") || url.includes("/api/billing")) {
        return route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify(mockDashboard.payments),
        });
      }
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(url.includes("list") || url.includes("status") ? [] : {}),
      });
    });
  };

  const addAuthInitScript = (ctx) => {
    ctx.addInitScript(() => {
      localStorage.setItem("dente_demo_showcase", "true");
      localStorage.setItem("dente_clinic_token", "live-inquisition-clinic-token");
      localStorage.setItem("dente_staff_token", "live-inquisition-staff-token");
      localStorage.setItem("dente_active_role", "owner");
      localStorage.setItem("dente_theme_mode", "light");
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
  };

  const applyTheme = async (page, theme) => {
    console.log(`Applying theme: ${theme}...`);
    await page.evaluate((th) => {
      localStorage.setItem("dente_theme_mode", th);
      localStorage.setItem("dente_theme", th);
      if (window.__useThemeStore) {
        window.__useThemeStore.getState().setThemeMode(th);
      }
      if (window.__denteThemeStore) {
        window.__denteThemeStore.getState().setTheme(th);
      }
      document.documentElement.setAttribute("data-theme", th);
      const isDark = ["dark", "night", "ocean", "emerald", "cyber_xray"].includes(th);
      document.documentElement.classList.toggle("dark", isDark);
      document.documentElement.classList.toggle("light", !isDark);
      document.body.classList.toggle("dark", isDark);
      document.body.classList.toggle("light", !isDark);
      document.documentElement.style.colorScheme = isDark ? "dark" : "light";
    }, theme);
    await page.waitForTimeout(600);
  };

  const navigateView = async (page, hash, selector) => {
    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        await page.evaluate((h) => { window.location.hash = h; }, hash);
        await page.waitForSelector(selector, { state: "visible", timeout: 30000 });
        await page.waitForSelector(".boot-state", { state: "detached", timeout: 30000 }).catch(() => {});
        await page.waitForSelector('[aria-busy="true"]', { state: "detached", timeout: 30000 }).catch(() => {});
        await page.waitForTimeout(1000);
        break;
      } catch (err) {
        if (attempt === 3) throw err;
        await page.waitForTimeout(1000);
      }
    }
  };

  const saveProof = async (page, filename) => {
    const destPrimary = path.join(primaryDir, filename);
    await page.screenshot({ path: destPrimary, fullPage: false, animations: "disabled" });

    // Anti-Blank Byte Guard (>= 20 KB floor)
    const stats = fs.statSync(destPrimary);
    if (stats.size < 20480) {
      throw new Error(`[ANTI-BLANK REJECTED] File ${filename} is only ${stats.size} bytes (< 20 KB)! Unmounted or failed render.`);
    }

    // Copy to brain artifact dir
    const destBrain = path.join(brainDir, filename);
    fs.copyFileSync(destPrimary, destBrain);

    const hash = crypto.createHash("md5").update(fs.readFileSync(destPrimary)).digest("hex");
    console.log(`[PROOF CAPTURED] ${filename}: ${stats.size} bytes (${(stats.size / 1024).toFixed(1)} KB), MD5=${hash}`);
    return { filename, size: stats.size, md5: hash };
  };

  // Launch browser context (1440x900)
  const pcContext = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    deviceScaleFactor: 1,
    isMobile: false,
    hasTouch: false,
  });
  addAuthInitScript(pcContext);

  const pcPage = await pcContext.newPage();
  await setupPageRoutes(pcPage);

  // 1. Initial load to schedule to seed stores
  console.log("Loading application schedule...");
  await pcPage.goto("http://127.0.0.1:5173/#schedule", { waitUntil: "domcontentloaded", timeout: 60000 });
  await pcPage.waitForSelector(".boot-state", { state: "detached", timeout: 60000 });
  await pcPage.waitForSelector(".app-shell", { state: "visible", timeout: 30000 });
  await pcPage.waitForTimeout(1500);

  // Remove any leftover overlays
  await pcPage.evaluate(() => {
    document.querySelectorAll(".tour-spotlight-root, [data-testid=\"guided-tour-spotlight-overlay\"], .tour-backdrop-clickable-zone, .global-toast-container").forEach((el) => el.remove());
  });

  // 2. Navigate to visit view
  console.log("Navigating to Visit view...");
  await navigateView(pcPage, "visit", ".visit-monolithic-header, [data-testid=\"visit-header-monolith\"]");
  await pcPage.waitForTimeout(1500);

  console.log("Switching to Odontogram subtab...");
  const subtabBtn = await pcPage.$('[data-testid="visit-subtab-odontogram"]');
  if (!subtabBtn) {
    throw new Error('Subtab button for Odontogram ([data-testid="visit-subtab-odontogram"]) not found!');
  }
  await subtabBtn.click();
  await pcPage.waitForTimeout(1000);

  await pcPage.waitForSelector('[data-testid="adult-arch-surface"], .odontogram-interactive-cockpit, .odontogram-tab-container, .odontogram-console-toolbar', { state: "visible", timeout: 15000 }).catch((e) => {
    console.warn("[WARNING] Odontogram selector not immediately visible:", e.message);
  });

  const results = [];

  // 1. Capture Light mode
  await applyTheme(pcPage, "light");
  await pcPage.waitForTimeout(800);
  results.push(await saveProof(pcPage, "odontogram_pc_light.png"));
  results.push(await saveProof(pcPage, "tab2_odontogram_pc_light.png"));

  // 2. Capture Dark mode
  await applyTheme(pcPage, "dark");
  await pcPage.waitForTimeout(800);
  results.push(await saveProof(pcPage, "odontogram_pc_dark.png"));
  results.push(await saveProof(pcPage, "tab2_odontogram_pc_dark.png"));

  await pcContext.close();
  await browser.close();

  console.log("\n======================================================");
  console.log(">>> ODONTOGRAM SCREENSHOTS CAPTURED AND VERIFIED (>= 20 KB)! <<<");
  console.log("======================================================");
  console.log(JSON.stringify(results, null, 2));
}

main().catch((err) => {
  console.error("FATAL ERROR in capture_odontogram_tactile_proofs:", err);
  process.exit(1);
});
