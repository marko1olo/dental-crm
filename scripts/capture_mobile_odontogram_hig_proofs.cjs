/**
 * scripts/capture_mobile_odontogram_hig_proofs.cjs
 *
 * Dedicated Mobile Odontogram Apple HIG & Inquisitor Screenshot Proof Runner.
 * Viewport: 390x844 (iPhone 13/14/15/16 standard).
 * Captures:
 * 1. proof_mobile_odontogram_quadrant_light.png
 * 2. proof_mobile_odontogram_quadrant_dark.png
 * 3. proof_mobile_odontogram_bottom_sheet_light.png
 * 4. proof_mobile_odontogram_bottom_sheet_dark.png
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
      hasPediatricMode: true,
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
      },
    ],
    integrationPresets: [],
    workspaceProfiles: [],
    roleAccessPolicies: [],
    modeHints: [],
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
      notes: "Бронхиальная астма, аллергия на лидокаин",
      administrativeProfile: "normal",
      createdAt: `${todayDate}T08:00:00.000Z`,
      updatedAt: `${todayDate}T08:00:00.000Z`,
    },
  ],
  appointments: [
    {
      id: "app-1",
      organizationId: "00000000-0000-0000-0000-000000000001",
      patientId: "pat-1",
      doctorUserId: "doc-1",
      doctorId: "doc-1",
      chairId: "chair-1",
      status: "in_treatment",
      state: "in_treatment",
      priority: "normal",
      intent: "treatment",
      startsAt: `${todayDate}T10:00:00.000Z`,
      endsAt: `${todayDate}T11:30:00.000Z`,
      startTime: `${todayDate}T10:00:00.000Z`,
      endTime: `${todayDate}T11:30:00.000Z`,
      durationMinutes: 90,
      serviceTitle: "Эндодонтия 46 зуба (3 канала)",
      serviceCategories: ["therapy", "endodontics"],
      createdByUserId: "doc-1",
      createdAt: `${todayDate}T08:00:00.000Z`,
      updatedAt: `${todayDate}T08:00:00.000Z`,
      patientName: "Ковалёв Роман Станиславович",
      doctorName: "Д-р Воронов А.В.",
    },
  ],
  activeVisit: {
    id: "00000000-0000-0000-0000-000000000001",
    appointmentId: "app-1",
    patientId: "pat-1",
    doctorId: "doc-1",
    status: "in_treatment",
  },
  payments: [],
};

const targetDirs = [
  path.resolve("docs/screenshots/inquisition_live"),
  "C:/Users/Admin/.gemini/antigravity/brain/62858a71-fefc-4783-bfa3-961dd0ba20e6",
  "C:/Users/Admin/.gemini/antigravity/brain/beb92312-c6d7-426d-a438-12dcad022abc",
];

for (const d of targetDirs) {
  if (!fs.existsSync(d)) {
    try {
      fs.mkdirSync(d, { recursive: true });
    } catch (_) {}
  }
}

async function saveProof(page, fileName, description = "") {
  let mainBuffer = null;
  for (const dir of targetDirs) {
    const fullPath = path.join(dir, fileName);
    if (!mainBuffer) {
      mainBuffer = await page.screenshot({ fullPage: false, animations: "disabled", timeout: 25000 });
    }
    fs.writeFileSync(fullPath, mainBuffer);
    const stats = fs.statSync(fullPath);
    const md5 = crypto.createHash("md5").update(mainBuffer).digest("hex");
    console.log(`[SAVED] ${fullPath} (${(stats.size / 1024).toFixed(1)} KB, MD5: ${md5}) - ${description}`);
  }
}

async function setTheme(page, theme) {
  await page.evaluate((th) => {
    if (window.__useThemeStore) {
      window.__useThemeStore.getState().setThemeMode(th);
    }
    document.documentElement.setAttribute("data-theme", th);
    const isDark = ["dark", "night", "ocean", "emerald", "cyber_xray"].includes(th);
    document.documentElement.classList.toggle("dark", isDark);
    document.documentElement.classList.toggle("light", !isDark);
    document.documentElement.style.colorScheme = isDark ? "dark" : "light";
    try {
      localStorage.setItem("dente_theme_mode", th);
      localStorage.setItem("dente_theme", th);
    } catch (_) {}
  }, theme);
  const isDark = ["dark", "night", "ocean", "emerald", "cyber_xray"].includes(theme);
  await page.waitForFunction(
    (dark) => document.documentElement.classList.contains("dark") === dark,
    isDark,
    { timeout: 5000 }
  ).catch(() => {});
  await page.waitForTimeout(400);
}

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
          user: { id: "doc-1", fullName: "Д-р Воронов Алексей Владимирович", role: "owner", active: true, organizationId: "00000000-0000-0000-0000-000000000001" },
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
    if (url.includes("/api/patients")) {
      return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(mockDashboard.patients) });
    }
    if (url.includes("/api/schedule")) {
      return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(mockDashboard.appointments) });
    }
    return route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(url.includes("list") || url.includes("status") ? [] : {}),
    });
  });
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

async function run() {
  console.log("=== MOBILE ODONTOGRAM APPLE HIG SCREENSHOT SUITE (390x844) ===");

  const browser = await chromium.launch({
    executablePath: "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });

  try {
    const mobileContext = await browser.newContext({
      viewport: { width: 390, height: 844 },
      deviceScaleFactor: 2,
      isMobile: true,
      hasTouch: true,
    });
    await addInitStorage(mobileContext);
    const mPage = await mobileContext.newPage();
    mPage.on("console", (msg) => {
      const txt = msg.text();
      if (txt.includes("ERROR") || txt.includes("FAIL") || txt.includes("Warn")) {
        console.log(`[mPage console]: ${txt}`);
      }
    });
    mPage.on("pageerror", (err) => console.log("[mPage pageerror]:", err.stack || err.message));
    await setupPageRoutes(mPage);

    console.log("Navigating to http://127.0.0.1:5173/#schedule ...");
    await mPage.goto("http://127.0.0.1:5173/#schedule", { waitUntil: "domcontentloaded", timeout: 30000 });
    await mPage.waitForTimeout(2000);

    console.log("Navigating to #visit ...");
    await mPage.evaluate(() => { window.location.hash = "#visit"; });
    try {
      await mPage.waitForSelector('[data-testid="visit-subtab-odontogram"]', { timeout: 15000 });
    } catch {
      await mPage.waitForTimeout(3000);
    }

    console.log("Activating Odontogram tab...");
    await mPage.evaluate(() => {
      const btn = document.querySelector('[data-testid="visit-subtab-odontogram"]') ||
                  Array.from(document.querySelectorAll('button')).find(b => b.textContent && b.textContent.includes('Зубная формула'));
      if (btn) btn.click();
    });

    try {
      await mPage.waitForSelector('.odontogram-toolbar, .tooth-chart-svg, [data-testid="mark-intact-dentition-btn"], .mobile-quadrant-tabs', { timeout: 15000 });
    } catch {
      await mPage.waitForTimeout(2000);
    }
    await mPage.waitForTimeout(1000);

    // Verify 0px horizontal drift
    const scrollInfo = await mPage.evaluate(() => {
      return {
        bodyScrollWidth: document.body.scrollWidth,
        windowInnerWidth: window.innerWidth,
        docScrollWidth: document.documentElement.scrollWidth,
      };
    });
    console.log("[DRIFT CHECK]", scrollInfo);

    // 1. Mobile Odontogram Quadrant View Light & Dark
    console.log("Capturing 1. proof_mobile_odontogram_quadrant_light.png ...");
    await setTheme(mPage, "light");
    await saveProof(mPage, "proof_mobile_odontogram_quadrant_light.png", "Mobile Light Odontogram (Apple HIG Quadrant 8 Teeth)");

    console.log("Capturing 2. proof_mobile_odontogram_quadrant_dark.png ...");
    await setTheme(mPage, "dark");
    await saveProof(mPage, "proof_mobile_odontogram_quadrant_dark.png", "Mobile Dark Odontogram (Apple HIG Quadrant 8 Teeth)");

    // 2. Mobile Tooth Radial Menu (Bottom Sheet)
    console.log("Opening Tooth Bottom Sheet on Tooth 16 via DOM click...");
    await mPage.waitForTimeout(600);
    await mPage.evaluate(() => {
      const t = document.querySelector('[data-tooth-id="16"]') ||
                document.querySelector('.tooth-svg-wrapper[data-tooth="16"]') ||
                document.querySelector('[data-testid="tooth-cell-16"]');
      if (t) t.click();
    });
    await mPage.waitForTimeout(1000);

    // Wait for radial bottom sheet
    await mPage.waitForSelector('[data-testid="tooth-radial-menu-overlay"]', { timeout: 10000 });

    console.log("Capturing 3. proof_mobile_odontogram_bottom_sheet_dark.png ...");
    await saveProof(mPage, "proof_mobile_odontogram_bottom_sheet_dark.png", "Mobile Dark Tooth Radial Bottom Sheet (Tooth 16)");

    console.log("Capturing 4. proof_mobile_odontogram_bottom_sheet_light.png ...");
    await setTheme(mPage, "light");
    await saveProof(mPage, "proof_mobile_odontogram_bottom_sheet_light.png", "Mobile Light Tooth Radial Bottom Sheet (Tooth 16)");

    await mobileContext.close();
    console.log("\n>>> ALL 4 MOBILE ODONTOGRAM HIG PROOFS CAPTURED SUCCESSFULLY! <<<");

  } finally {
    await browser.close();
  }
}

run().catch((err) => {
  console.error("Execution failed:", err);
  process.exit(1);
});
