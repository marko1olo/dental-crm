const { chromium } = require("playwright");
const fs = require("node:fs");
const path = require("node:path");

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
  patients: [],
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
  await page.waitForTimeout(600);
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
            user: { id: "doc-1", fullName: "Д-р Воронов Алексей Владимирович", role: "owner", active: true },
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
      return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify([]) });
    });

    // =========================================================================
    // 1. CAPTURE LOGIN SCREEN (38 Light, 39 Dark)
    // Unauthenticated state: no clinic token, no staff token
    // =========================================================================
    console.log("Navigating to login screen (unauthenticated)...");
    await page.goto("http://127.0.0.1:5173/", { waitUntil: "domcontentloaded", timeout: 30000 });
    await page.evaluate(() => {
      localStorage.clear();
      sessionStorage.clear();
    });
    await page.reload({ waitUntil: "domcontentloaded" });
    await page.waitForSelector(".auth-overlay .auth-modal", { state: "visible", timeout: 15000 });
    // Wait for auth background image to load
    await page.waitForTimeout(2000);
    console.log("Login screen loaded!");

    // Capture 38_login_desktop_light.png
    console.log("Setting theme to light for login...");
    await setTheme(page, "light");
    await page.waitForTimeout(1000);
    await saveProof(page, "38_login_desktop_light.png");

    // Capture 39_login_desktop_dark.png
    console.log("Setting theme to dark for login...");
    await setTheme(page, "dark");
    await page.waitForTimeout(1000);
    await saveProof(page, "39_login_desktop_dark.png");

    // =========================================================================
    // 2. CAPTURE STAFF PIN PAD (47 Light, 48 Dark)
    // Clinic authenticated state: clinic token present, staff token absent
    // =========================================================================
    console.log("Navigating to Staff PIN Pad (clinic authed)...");
    await page.evaluate(() => {
      localStorage.setItem("dente_clinic_token", "mock-clinic-token-12345");
      localStorage.removeItem("dente_staff_token");
      localStorage.removeItem("dente_privacy_shield_locked");
      sessionStorage.removeItem("dente_unlocked");
    });
    await page.reload({ waitUntil: "domcontentloaded" });
    await page.waitForSelector(".auth-staff-grid, .auth-modal--wide", { state: "visible", timeout: 15000 });
    await page.waitForTimeout(2000);
    console.log("Staff PIN Pad loaded!");

    // Capture 47_staff_pinpad_desktop_light.png
    console.log("Setting theme to light for Staff PIN Pad...");
    await setTheme(page, "light");
    await page.waitForTimeout(1000);
    await saveProof(page, "47_staff_pinpad_desktop_light.png");

    // Capture 48_staff_pinpad_desktop_dark.png
    console.log("Setting theme to dark for Staff PIN Pad...");
    await setTheme(page, "dark");
    await page.waitForTimeout(1000);
    await saveProof(page, "48_staff_pinpad_desktop_dark.png");

    console.log("SUCCESS: All 4 targeted screenshots captured successfully!");
  } finally {
    await browser.close();
  }
}

main().catch((err) => {
  console.error("Execution failed:", err);
  process.exit(1);
});
