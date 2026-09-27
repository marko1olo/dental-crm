const { chromium } = require("playwright");
const fs = require("fs");
const path = require("path");

const targetDirs = [
  path.resolve("docs/screenshots/inquisition_live"),
  path.resolve("C:/Users/Admin/.gemini/antigravity/brain/a84df016-a7cc-461c-ba80-899ae84de477/screenshots"),
];

for (const dir of targetDirs) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

const todayDate = new Date().toISOString().slice(0, 10);

const mockDashboard = {
  clinicSettings: {
    profile: {
      clinicName: "Стоматология ДЕНТЕ Премиум",
      timezone: "Europe/Moscow",
      mode: "clinic",
      activeSpecialties: ["therapy", "orthopedics", "surgery", "orthodontics", "pediatric", "periodontics"],
    },
    staff: [
      {
        id: "doc-1",
        fullName: "Д-р Воронов Алексей Владимирович",
        role: "owner",
        specialties: ["therapist", "orthopedist"],
        active: true,
        color: "#0d9488",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      {
        id: "doc-2",
        fullName: "Д-р Соколова Мария Игоревна",
        role: "doctor",
        specialties: ["surgeon"],
        active: true,
        color: "#6366f1",
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
        hasXraySensor: false,
        hasMicroscope: false,
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
      email: "kovalev@example.ru",
      notes: "Бронхиальная астма, аллергия на латекс",
      administrativeProfile: "normal",
      createdAt: `${todayDate}T08:00:00.000Z`,
      updatedAt: `${todayDate}T08:00:00.000Z`,
    },
  ],
  patientInsights: [],
  recommendedActions: [],
  appointments: [],
};

async function setTheme(page, theme) {
  await page.evaluate((t) => {
    document.documentElement.setAttribute("data-theme", t);
    if (t === "light") {
      document.documentElement.classList.add("light");
      document.documentElement.classList.remove("dark");
    } else {
      document.documentElement.classList.add("dark");
      document.documentElement.classList.remove("light");
    }
    localStorage.setItem("dente_theme_mode", t);
  }, theme);
  const isDark = ["dark", "night", "ocean", "emerald", "cyber_xray"].includes(theme);
  await page.waitForFunction(
    (dark) => document.documentElement.classList.contains("dark") === dark,
    isDark,
    { timeout: 5000 },
  ).catch(() => {});
  await page.waitForTimeout(500);
}

async function saveProof(page, fileName) {
  for (const dir of targetDirs) {
    const fullPath = path.join(dir, fileName);
    await page.screenshot({ path: fullPath, fullPage: false, animations: "disabled" });
    console.log(`Saved screenshot: ${fullPath} (${fs.statSync(fullPath).size} bytes)`);
  }
}

async function main() {
  const browser = await chromium.launch({
    executablePath: "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });

  try {
    const context = await browser.newContext({
      viewport: { width: 1440, height: 900 },
      deviceScaleFactor: 2,
    });

    await context.addInitScript(() => {
      localStorage.setItem("dente_clinic_token", "mock-clinic-token-12345");
      localStorage.setItem("dente_staff_token", "mock-staff-token-67890");
      localStorage.setItem("dente_active_user_id", "doc-1");
      localStorage.setItem("dente_active_role", "owner");
      localStorage.setItem("dente_active_mode", "clinic");
      sessionStorage.setItem("dente_unlocked", "true");
      localStorage.removeItem("dente_privacy_shield_locked");
      localStorage.removeItem("dente_onboarding_dismissed");
    });

    const page = await context.newPage();

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
          body: JSON.stringify({ success: true, token: "mock-staff-token", user: { id: "doc-1", fullName: "Д-р Воронов Алексей Владимирович", role: "owner" } }),
        });
      }
      if (url.includes("/api/schedule")) {
        return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify([]) });
      }
      return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify([]) });
    });

    // =========================================================================
    // 1. CAPTURE ONBOARDING WIZARD MODAL (40 Light, 41 Dark)
    // =========================================================================
    console.log("Navigating to http://127.0.0.1:5173/#schedule to trigger onboarding...");
    await page.goto("http://127.0.0.1:5173/#schedule", { waitUntil: "domcontentloaded", timeout: 30000 });
    await page.waitForSelector(".boot-state", { state: "detached", timeout: 30000 }).catch(() => {});
    await page.waitForTimeout(1000);

    const configureBtn = page.locator('.onboarding-compact-strip button:has-text("Настроить")');
    if (await configureBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
      console.log("Found onboarding compact strip, clicking 'Настроить'...");
      await configureBtn.click();
    }

    await page.waitForSelector(".onboarding-overlay", { state: "visible", timeout: 15000 });
    console.log("Onboarding overlay is visible!");
    await page.waitForTimeout(1500);

    // Capture Onboarding Light (40_onboarding_desktop_light.png)
    await setTheme(page, "light");
    await saveProof(page, "40_onboarding_desktop_light.png");

    // Capture Onboarding Dark (41_onboarding_desktop_dark.png)
    await setTheme(page, "dark");
    await saveProof(page, "41_onboarding_desktop_dark.png");

    // Close onboarding modal via doctor autonomy close button
    const closeWizardBtn = page.locator(".onboarding-head-close-btn");
    if (await closeWizardBtn.isVisible()) {
      console.log("Closing onboarding modal via doctor autonomy close button...");
      await closeWizardBtn.click();
      await page.waitForSelector(".onboarding-overlay", { state: "detached", timeout: 5000 }).catch(() => {});
    }
    await page.waitForTimeout(600);

    // =========================================================================
    // 2. CAPTURE DOCTOR PRIVACY SHIELD (49 Dark, 50 Light)
    // =========================================================================
    console.log("Opening macOS Control Center popover...");
    const controlPill = page.locator(".dnt-clinic-control-pill");
    await controlPill.click();
    await page.waitForSelector(".dnt-control-center-popover", { state: "visible", timeout: 5000 });

    console.log("Clicking 'Заблокировать сессию'...");
    const lockSessionBtn = page.locator('button:has-text("Заблокировать сессию")');
    await lockSessionBtn.click();

    await page.waitForSelector('[data-testid="doctor-privacy-shield"]', { state: "visible", timeout: 10000 });
    console.log("Doctor privacy shield is active!");
    await page.waitForTimeout(1500);

    // Capture Privacy Shield Dark (49_privacy_lock_desktop_dark.png)
    await setTheme(page, "dark");
    await saveProof(page, "49_privacy_lock_desktop_dark.png");

    // Capture Privacy Shield Light (50_privacy_lock_desktop_light.png)
    await setTheme(page, "light");
    await saveProof(page, "50_privacy_lock_desktop_light.png");

    // =========================================================================
    // 3. CAPTURE STAFF PIN PAD (47 Light, 48 Dark)
    // =========================================================================
    console.log("Switching to Staff PIN Pad via 'Сменить врача / Завершить смену'...");
    const switchStaffBtn = page.locator('button:has-text("Сменить врача / Завершить смену")');
    if (await switchStaffBtn.isVisible()) {
      await switchStaffBtn.click();
    } else {
      await page.evaluate(() => {
        localStorage.removeItem("dente_privacy_shield_locked");
        localStorage.removeItem("dente_staff_token");
      });
      await page.reload({ waitUntil: "domcontentloaded" });
    }

    await page.waitForSelector(".auth-modal, .staff-pinpad-container", { state: "visible", timeout: 15000 });
    console.log("Staff PIN pad is visible!");
    await page.waitForTimeout(1500);

    // Capture Staff PIN Pad Light (47_staff_pinpad_desktop_light.png)
    await setTheme(page, "light");
    await saveProof(page, "47_staff_pinpad_desktop_light.png");

    // Capture Staff PIN Pad Dark (48_staff_pinpad_desktop_dark.png)
    await setTheme(page, "dark");
    await saveProof(page, "48_staff_pinpad_desktop_dark.png");

    console.log("All art and ambient screenshots captured successfully!");
  } finally {
    await browser.close();
  }
}

main().catch((err) => {
  console.error("Capture script failed:", err);
  process.exit(1);
});
