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
        fullName: "Д-р Соколов А. В.",
        role: "doctor",
        organizationId: "demo-showcase-org",
        specialization: "Терапевт",
      })
    );
    localStorage.setItem("dental-crm:active-user:v1", JSON.stringify({
      id: "demo-therapist-user",
      fullName: "Д-р Соколов А. В.",
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
          user: { id: "doc-1", fullName: "Д-р Воронов Алексей Владимирович", role: "owner", active: true, organizationId: "00000000-0000-0000-0000-000000000001" },
        }),
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
  console.log("Navigating to http://127.0.0.1:5173/#visit ...");
  try {
    await page.goto("http://127.0.0.1:5173/#visit", { waitUntil: "domcontentloaded", timeout: 45000 });
  } catch (e) {
    console.log("Goto domcontentloaded fallback:", e.message);
  }
  await page.waitForTimeout(4000);

  // If redirect happened, force #visit hash
  await page.evaluate(() => {
    if (window.location.hash !== "#visit") {
      window.location.hash = "#visit";
    }
  });
  await page.waitForTimeout(3000);

  // Remove tour overlays
  await page.evaluate(() => {
    document.querySelectorAll(".tour-spotlight-root, [data-testid=\"guided-tour-spotlight-overlay\"], .tour-backdrop-clickable-zone, .global-toast-container").forEach((el) => el.remove());
  });

  const targetDirs = [
    path.resolve(__dirname, "../docs/screenshots/inquisition_live"),
    "C:/Users/Admin/.gemini/antigravity/brain/92ff6153-acf5-48c5-b366-1cd56ef20b0a",
    path.resolve(__dirname, "../docs/screenshots/visit_tabs"),
  ];
  for (const d of targetDirs) {
    if (!fs.existsSync(d)) fs.mkdirSync(d, { recursive: true });
  }

  async function applyTheme(mode) {
    console.log(`Setting theme: ${mode}`);
    await page.evaluate((th) => {
      localStorage.setItem("dente_theme_mode", th);
      localStorage.setItem("dente_theme", th);
      document.documentElement.setAttribute("data-theme", th);
      const isDark = th === "dark";
      document.documentElement.classList.toggle("dark", isDark);
      document.documentElement.classList.toggle("light", !isDark);
      document.body.classList.toggle("dark", isDark);
      document.body.classList.toggle("light", !isDark);
      document.documentElement.style.colorScheme = isDark ? "dark" : "light";
      if (window.__denteThemeStore) window.__denteThemeStore.getState().setTheme(th);
    }, mode);
    await page.waitForTimeout(1000);
  }

  async function saveScreenshot(fileName) {
    const primary = path.join(targetDirs[0], fileName);
    if (fs.existsSync(primary)) {
      try { fs.unlinkSync(primary); } catch {}
    }
    await page.screenshot({ path: primary, fullPage: false, animations: "disabled" });
    for (let i = 1; i < targetDirs.length; i++) {
      fs.copyFileSync(primary, path.join(targetDirs[i], fileName));
    }
    const stat = fs.statSync(primary);
    const hash = crypto.createHash("md5").update(fs.readFileSync(primary)).digest("hex");
    console.log(`[CAPTURED] ${fileName} — ${(stat.size / 1024).toFixed(1)} KB, MD5: ${hash}`);
  }

  async function saveElementScreenshot(locator, fileName) {
    const primary = path.join(targetDirs[0], fileName);
    if (fs.existsSync(primary)) {
      try { fs.unlinkSync(primary); } catch {}
    }
    await locator.screenshot({ path: primary, animations: "disabled" });
    for (let i = 1; i < targetDirs.length; i++) {
      fs.copyFileSync(primary, path.join(targetDirs[i], fileName));
    }
    const stat = fs.statSync(primary);
    const hash = crypto.createHash("md5").update(fs.readFileSync(primary)).digest("hex");
    console.log(`[CAPTURED ELEMENT] ${fileName} — ${(stat.size / 1024).toFixed(1)} KB, MD5: ${hash}`);
  }

  // ==========================================
  // PART 1: "Зубная формула" Tab (OdontogramModule / ToothChart)
  // ==========================================
  console.log("Locating 'Зубная формула' subtab...");
  const odontogramBtn = page.locator("[data-testid='visit-subtab-odontogram'], .visit-subtab-btn:has-text('Зубная формула'), button:has-text('Зубная формула')").first();
  await odontogramBtn.waitFor({ state: "visible", timeout: 25000 });
  await odontogramBtn.click();
  await page.waitForTimeout(2000);

  await page.evaluate(() => window.scrollTo(0, 0));
  await page.waitForTimeout(500);

  // 1. Capture ToothChart Light (16 teeth in row, 32 teeth total)
  await applyTheme("light");
  await saveScreenshot("proof_live_odontogram_all16_teeth_light.png");
  await saveScreenshot("odontogram_pc_light.png");

  // 2. Capture ToothChart Dark
  await applyTheme("dark");
  await saveScreenshot("proof_live_odontogram_all16_teeth_dark.png");
  await saveScreenshot("odontogram_pc_dark.png");

  // 1b. Switch to FDI 6-гр (ToothChart with express actions)
  console.log("Switching to FDI 6-гр mode...");
  const fdiBtn = page.locator("button:has-text('FDI 6-гр')").first();
  if (await fdiBtn.count() > 0) {
    await fdiBtn.click();
    await page.waitForTimeout(800);
    await applyTheme("light");
    await saveScreenshot("odontogram_fdi6_pc_light.png");
    await applyTheme("dark");
    await saveScreenshot("odontogram_fdi6_pc_dark.png");
    // Switch back to 3D
    const mode3dBtn = page.locator("button:has-text('3D')").first();
    if (await mode3dBtn.count() > 0) await mode3dBtn.click();
    await page.waitForTimeout(500);
  }

  // ==========================================
  // PART 2: "Дневник приёма" Tab (Embedded Odontogram)
  // ==========================================
  console.log("Navigating back to 'Дневник приёма' subtab...");
  const emkBtn = page.locator("[data-testid='visit-subtab-emk'], .visit-subtab-btn:has-text('Дневник приёма')").first();
  await emkBtn.click();
  await page.waitForTimeout(2000);

  // Unfold embedded odontogram
  const unfoldBtn = page.locator("button:has-text('Развернуть')").first();
  if (await unfoldBtn.count() > 0) {
    console.log("Unfolding embedded odontogram...");
    await unfoldBtn.click();
    await page.waitForTimeout(800);
  }

  await page.evaluate(() => window.scrollTo(0, 0));
  await page.waitForTimeout(500);

  // 3. Capture Embedded Odontogram Light (1440x900 viewport)
  await applyTheme("light");
  await saveScreenshot("proof_live_visit_embedded_odontogram_light.png");

  // 4. Capture Embedded Odontogram Dark (1440x900 viewport)
  await applyTheme("dark");
  await saveScreenshot("proof_live_visit_embedded_odontogram_dark.png");

  console.log("=== All screenshots captured successfully! ===");
  await browser.close();
})().catch((err) => {
  console.error("FATAL ERROR capturing screenshots:", err);
  process.exit(1);
});
