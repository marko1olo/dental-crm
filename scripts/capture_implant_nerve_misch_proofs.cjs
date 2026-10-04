const { chromium } = require("playwright");
const path = require("node:path");
const fs = require("node:fs");

const targetDirs = [
  path.resolve("C:/Clinic_MVP/dental-crm/docs/screenshots/inquisition_live"),
  path.resolve("C:/Users/Admin/.gemini/antigravity/brain/5cbdd8b0-1a44-41e4-8bbf-039b9627b5ad"),
];

for (const d of targetDirs) {
  if (!fs.existsSync(d)) fs.mkdirSync(d, { recursive: true });
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
        specialties: ["therapist", "orthopedist", "surgeon"],
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
        active: true,
        sortOrder: 1,
      },
    ],
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
      balanceRub: 0,
      createdAt: `${todayDate}T08:00:00.000Z`,
      updatedAt: `${todayDate}T08:00:00.000Z`,
    },
  ],
  patientInsights: [],
  recommendedActions: [],
  appointments: [],
  imagingStudies: [],
  serviceCatalog: [],
  payments: [],
};

async function setupPageRoutes(page) {
  await page.route("**/api/**", async (route) => {
    const url = route.request().url();
    if (url.includes("/src/")) return route.continue();
    if (url.includes("/api/auth/session") || url.includes("/api/auth/user/me")) {
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
    return route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(mockDashboard),
    });
  });
}

const addAuthInitScript = (ctx) =>
  ctx.addInitScript(() => {
    localStorage.setItem("dente_clinic_token", "live-inquisition-clinic-token");
    localStorage.setItem("dente_staff_token", "live-inquisition-staff-token");
    localStorage.setItem("dente_active_role", "owner");
    localStorage.setItem("dente_theme_mode", "light");
    localStorage.setItem("dente_active_patient_id", "pat-1");
    localStorage.setItem("dente_tour_completed", "true");
    localStorage.setItem("dente_onboarding_completed", "true");
    localStorage.setItem("dente_coach_dismissed", "true");
  });

async function applyTheme(page, theme) {
  await page.evaluate((th) => {
    localStorage.setItem("dente_theme_mode", th);
    document.documentElement.setAttribute("data-theme", th);
    document.body.setAttribute("data-theme", th);
    const isDark = ["dark", "night", "ocean", "emerald", "cyber_xray"].includes(th);
    document.documentElement.classList.toggle("dark", isDark);
    document.documentElement.classList.toggle("light", !isDark);
    document.body.classList.toggle("dark", isDark);
    document.body.classList.toggle("light", !isDark);
    document.documentElement.style.colorScheme = isDark ? "dark" : "light";
  }, theme);
  await page.waitForTimeout(600);
}

async function take(page, name) {
  const p = path.join(targetDirs[0], name);
  await page.screenshot({ path: p, timeout: 30000 });
  for (let i = 1; i < targetDirs.length; i++) {
    fs.copyFileSync(p, path.join(targetDirs[i], name));
  }
  const sz = (fs.statSync(p).size / 1024).toFixed(1);
  console.log(`[SAVED] ${name} (${sz} KB)`);
}

async function main() {
  const browser = await chromium.launch({
    headless: true,
    executablePath: "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
    args: [
      "--no-sandbox",
      "--disable-setuid-sandbox",
      "--disable-dev-shm-usage",
      "--js-flags=--max-old-space-size=1024",
      "--disable-gpu",
    ],
  });

  try {
    const ctx = await browser.newContext({
      viewport: { width: 1440, height: 900 },
      deviceScaleFactor: 1,
    });
    await addAuthInitScript(ctx);
    const page = await ctx.newPage();
    await setupPageRoutes(page);

    console.log("Navigating to http://127.0.0.1:5173/?cbct=demo...");
    await page.goto("http://127.0.0.1:5173/?cbct=demo", { waitUntil: "domcontentloaded", timeout: 45000 });

    console.log("Waiting for modal...");
    await page.waitForSelector('[data-testid="cbct-studio-modal"]', { timeout: 40000 });
    console.log("CBCT Studio modal opened!");

    const demoBtn = await page.waitForSelector('[data-testid="cbct-btn-load-demo-empty"]', { timeout: 8000 }).catch(() => null);
    if (demoBtn) {
      console.log("Clicking load demo volume button...");
      await demoBtn.click();
    }

    await page.waitForSelector('[data-testid="cbct-empty-volume-dropzone"]', { state: "detached", timeout: 45000 }).catch(() => {});
    await page.waitForSelector("text=Загрузка центрального среза", { state: "detached", timeout: 45000 }).catch(() => {});
    await page.waitForTimeout(3000);

    // Switch to Implant Studio tab
    console.log("Navigating to Implant Studio tab...");
    const implantTab = await page.waitForSelector(
      '[data-testid="cbct-nav-tab-implant"], [data-mode-testid="cbct-mode-implant-btn"], button:has-text("Имплантация")',
      { timeout: 15000 }
    );
    await implantTab.click();
    await page.waitForTimeout(2500);

    const themes = ["light", "dark"];

    for (const theme of themes) {
      console.log(`\n=== PROCESSING THEME: ${theme.toUpperCase()} ===`);
      await applyTheme(page, theme);

      // 1. Clean, Uncluttered Station (Assistant Closed by Default)
      console.log(`Capturing Clean Station (${theme})...`);
      await take(page, `proof_implant_workspace_${theme}_clean.png`);

      // 2. Expand Clinical AI Assistant Accordion
      console.log(`Expanding Clinical AI Assistant (${theme})...`);
      const accordionSummary = await page.waitForSelector(
        '[data-testid="cbct-implant-ai-assistant-accordion"] summary',
        { timeout: 8000 }
      );
      await accordionSummary.click();
      await page.waitForTimeout(1000);

      // Verify Misch HUD and IAN clearance are visible in expanded state
      await page.waitForSelector('[data-testid="cbct-implant-live-telemetry-hud"]', { timeout: 8000 });
      await page.waitForSelector('[data-testid="cbct-implant-nerve-safety-badge"]', { timeout: 8000 });

      console.log(`Capturing Expanded Telemetry (${theme})...`);
      await take(page, `proof_implant_workspace_${theme}_expanded.png`);

      // Close accordion back to maintain clean state
      await accordionSummary.click();
      await page.waitForTimeout(500);
    }

    console.log("\nALL PROOF SCREENSHOTS CAPTURED SUCCESSFULLY!");
  } finally {
    await browser.close();
  }
}

main().catch((err) => {
  console.error("FATAL ERROR:", err);
  process.exit(1);
});
