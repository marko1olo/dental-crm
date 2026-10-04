/**
 * scripts/capture_all_5_departments_clean.cjs
 *
 * Dedicated Capture for all 5 CBCT Studio Picasso departments:
 * 1. MPR Quad (01_mpr_quad_{theme}.png)
 * 2. Panoramic ОПТГ 50/50 (02_panoramic_optg_50_50_{theme}.png)
 * 3. Implant Studio (03_implant_studio_{theme}.png)
 * 4. Endo Studio (04_endo_studio_{theme}.png)
 * 5. 3D Volume Viewport (05_volume3d_viewport_{theme}.png)
 *
 * Themes: Desktop 1440x900 Light & Dark (10 screenshots total)
 */

const { chromium } = require("playwright");
const path = require("node:path");
const fs = require("node:fs");

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
  await page.waitForTimeout(800);
}

async function main() {
  const targetDirs = [
    path.resolve("C:/Clinic_MVP/dental-crm/docs/screenshots/cbct_departments"),
    path.resolve("C:/Clinic_MVP/dental-crm/apps/web/public/screenshots"),
    path.resolve("C:/Users/Admin/.gemini/antigravity/brain/77830cc1-dac0-4da3-8789-c3f2b3c54e79"),
  ];
  for (const d of targetDirs) {
    if (!fs.existsSync(d)) fs.mkdirSync(d, { recursive: true });
  }

  const browser = await chromium.launch({
    headless: true,
    executablePath: "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });

  try {
    const ctx = await browser.newContext({
      viewport: { width: 1440, height: 900 },
      deviceScaleFactor: 2,
    });
    await addAuthInitScript(ctx);
    const page = await ctx.newPage();

    page.on("pageerror", (err) => console.error("[BROWSER ERROR]:", err.message));
    page.on("console", (msg) => {
      if (msg.type() === "error") console.error("[BROWSER CONSOLE ERROR]:", msg.text());
    });

    await setupPageRoutes(page);

    console.log("Navigating to http://127.0.0.1:5173/?cbct=demo...");
    await page.goto("http://127.0.0.1:5173/?cbct=demo", { waitUntil: "domcontentloaded", timeout: 45000 });

    console.log("Waiting for CBCT Studio modal...");
    await page.waitForSelector('[data-testid="cbct-studio-modal"]', { timeout: 40000 });
    console.log("CBCT Studio modal is visible!");

    // Wait for demo volume slices to be decoded and dropzone detached
    console.log("Waiting for demo volume decoding...");
    await page.waitForSelector('[data-testid="cbct-empty-volume-dropzone"]', { state: "detached", timeout: 45000 }).catch(() => {
      console.log("Dropzone detached or already loaded.");
    });
    await page.waitForTimeout(4000);

    async function takeScreen(fileName, description) {
      const p1 = path.join(targetDirs[0], fileName);
      if (fs.existsSync(p1)) {
        try { fs.unlinkSync(p1); } catch {}
      }
      await page.screenshot({ path: p1, fullPage: false, animations: "disabled", timeout: 30000 });
      for (let i = 1; i < targetDirs.length; i++) {
        fs.copyFileSync(p1, path.join(targetDirs[i], fileName));
      }
      const stat = fs.statSync(p1);
      console.log(`[CAPTURED] ${fileName} (${description}) — ${(stat.size / 1024).toFixed(1)} KB`);
    }

    const themes = ["light", "dark"];

    for (const theme of themes) {
      console.log(`\n==================================================`);
      console.log(`>>> PROCESSING THEME: ${theme.toUpperCase()} <<<`);
      console.log(`==================================================`);

      await applyTheme(page, theme);

      // 1. Отдел 1: MPR Quad
      console.log(`[1/5] Department 1: MPR Quad (${theme})...`);
      const mprTab = await page.waitForSelector(
        '[data-testid="cbct-nav-tab-mpr-3d"], [data-mode-testid="cbct-mode-diagnostic-btn"], button:has-text("MPR 3D")',
        { timeout: 15000 }
      );
      await mprTab.click();
      await page.waitForTimeout(2000);
      await takeScreen(`01_mpr_quad_${theme}.png`, `Отдел 1: MPR Quad 4 квадранта — ${theme}`);

      // 2. Отдел 2: Панорама ОПТГ 50/50
      console.log(`[2/5] Department 2: Panoramic ОПТГ 50/50 (${theme})...`);
      const panoTab = await page.waitForSelector(
        '[data-testid="cbct-nav-tab-panorama"], [data-mode-testid="cbct-mode-panoramic-btn"], button:has-text("Панорама")',
        { timeout: 15000 }
      );
      await panoTab.click();
      await page.waitForTimeout(2500);
      await takeScreen(`02_panoramic_optg_50_50_${theme}.png`, `Отдел 2: Панорама ОПТГ 50/50 — ${theme}`);

      // 3. Отдел 3: Имплантологическая студия
      console.log(`[3/5] Department 3: Implant Studio (${theme})...`);
      const implantTab = await page.waitForSelector(
        '[data-testid="cbct-nav-tab-implant"], [data-mode-testid="cbct-mode-implant-btn"], button:has-text("Имплантация")',
        { timeout: 15000 }
      );
      await implantTab.click();
      await page.waitForTimeout(2500);
      await takeScreen(`03_implant_studio_${theme}.png`, `Отдел 3: Имплантологическая студия — ${theme}`);

      // 4. Отдел 4: Эндодонтическая студия
      console.log(`[4/5] Department 4: Endo Studio (${theme})...`);
      const endoTab = await page.waitForSelector(
        '[data-testid="cbct-nav-tab-endo"], [data-mode-testid="cbct-mode-endo-btn"], button:has-text("Эндодонтия")',
        { timeout: 15000 }
      );
      await endoTab.click();
      await page.waitForTimeout(2500);
      await takeScreen(`04_endo_studio_${theme}.png`, `Отдел 4: Эндодонтическая студия — ${theme}`);

      // 5. Отдел 5: 3D Volume Viewport
      console.log(`[5/5] Department 5: 3D Volume Viewport (${theme})...`);
      const mprTabReturn = await page.waitForSelector(
        '[data-testid="cbct-nav-tab-mpr-3d"], [data-mode-testid="cbct-mode-diagnostic-btn"], button:has-text("MPR 3D")',
        { timeout: 15000 }
      );
      await mprTabReturn.click();
      await page.waitForTimeout(1000);

      const vol3dModeBtn = await page.$('[data-testid="cbct-btn-mode-volume3d"]');
      if (vol3dModeBtn) {
        await vol3dModeBtn.click();
        await page.waitForTimeout(1000);
      }

      const expandBtn = await page.$(
        '[data-testid="btn-viewport-expand-panoramic"], [data-testid="btn-viewport-expand-volume3d"], [data-expand-testid="btn-viewport-expand-volume3d"]'
      );
      if (expandBtn) {
        await expandBtn.click();
        await page.waitForTimeout(2000);
      }

      await takeScreen(`05_volume3d_viewport_${theme}.png`, `Отдел 5: 3D Volume Viewport — ${theme}`);

      const collapseBtn = await page.$(
        '[data-testid="btn-viewport-collapse-panoramic"], [data-testid="btn-viewport-collapse-volume3d"], [data-collapse-testid="btn-viewport-collapse-volume3d"]'
      );
      if (collapseBtn) {
        await collapseBtn.click();
        await page.waitForTimeout(800);
      }
    }

    console.log("\n>>> SUCCESS: ALL 10 SCREENSHOTS OF ALL 5 CBCT DEPARTMENTS CAPTURED! <<<");

  } finally {
    await browser.close();
  }
}

main().catch((err) => {
  console.error("FATAL SUITE ERROR:", err);
  process.exit(1);
});
