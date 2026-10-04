const { chromium } = require("playwright");
const path = require("node:path");
const fs = require("node:fs");

// Watchdog timer strictly mandated by Supreme Creator Orders
const killTimer = setTimeout(() => {
  console.error("FATAL: SCRIPT TIMEOUT WATCHDOG TRIGGERED (35s)!");
  process.exit(1);
}, 35000);

const targetDirs = [
  path.resolve("C:/Clinic_MVP/dental-crm/docs/screenshots/inquisition_live"),
  path.resolve("C:/Users/Admin/.gemini/antigravity/brain/5cbdd8b0-1a44-41e4-8bbf-039b9627b5ad"),
];

for (const d of targetDirs) {
  if (!fs.existsSync(d)) fs.mkdirSync(d, { recursive: true });
}

const todayDate = new Date().toLocaleDateString("en-CA");

const studiesArray = [
  {
    id: "02b00000-0000-0000-0000-000000000001",
    patientId: "pat-1",
    organizationId: "00000000-0000-0000-0000-000000000001",
    patientFullName: "Ковалёв Роман Станиславович",
    dicomPatientName: "Kovalev Roman",
    kind: "cbct",
    modality: "CT",
    title: "3D КЛКТ верхней и нижней челюсти 8x8 (KaVo OP 3D Pro)",
    seriesDescription: "KaVo OP 3D Pro / 80x80mm Standard Res",
    studyDate: todayDate,
    capturedAt: `${todayDate}T10:30:00.000Z`,
    sliceCount: 420,
    dimensions: "512x512x420",
    voxelSpacing: "0.2mm",
    fileSizeBytes: 185400000,
    bindingStatus: "auto_bound",
    bindingConfidence: 98,
    sourceKind: "folder_watch",
    sourceName: "KaVo eXam Vision PACS",
    status: "available",
    toothCode: "16",
    previewUrl: "/radiology/sample_rvg_tooth16.jpg",
  },
];

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
  imagingStudies: studiesArray,
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

    if (url.includes("/api/imaging/studies")) {
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(studiesArray),
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
      body: JSON.stringify(mockDashboard),
    });
  });
}

const addAuthInitScript = (ctx) =>
  ctx.addInitScript(() => {
    try {
      const OrigWebSocket = window.WebSocket;
      window.WebSocket = function (url, protocols) {
        if (typeof url === "string" && (url.includes("5173") || url.includes("vite"))) {
          return { send() {}, close() {}, addEventListener() {}, removeEventListener() {}, readyState: 1 };
        }
        return new OrigWebSocket(url, protocols);
      };
    } catch {}

    localStorage.setItem("dente_clinic_token", "live-inquisition-clinic-token");
    localStorage.setItem("dente_staff_token", "live-inquisition-staff-token");
    localStorage.setItem("dente_active_role", "owner");
    localStorage.setItem("dente_theme_mode", "light");
    localStorage.setItem("dente_active_patient_id", "pat-1");
    localStorage.setItem("dente_tour_completed", "true");
    localStorage.setItem("dente_onboarding_completed", "true");
    localStorage.setItem("dente_demo_showcase", "true");
    localStorage.setItem("dente_ui_preferences_v1", JSON.stringify({ onboardingDismissed: true, onboardingStep: "done", version: 1 }));
    localStorage.setItem("dental-crm:onboarding:v1", JSON.stringify({ dismissed: true, step: "done", completed: true, onboardingDismissed: true, onboardingStep: "done", version: 1 }));
    localStorage.setItem("dente_quest_progress_v2", JSON.stringify({
      activeTrackId: "solo_doctor",
      currentStepIndex: 0,
      completedStepIds: [],
      isTourActive: false,
      isDismissedPermanently: true,
      tracksProgress: {
        solo_doctor: { completed: true, completedStepIds: [] },
        reception_admin: { completed: true, completedStepIds: [] },
        imaging_diagnostics: { completed: true, completedStepIds: [] },
      },
    }));
    localStorage.setItem("dente_doctor_cbct_defaults_v1", JSON.stringify({ windowWidth: 4025, windowLevel: 525, gamma: 1.50, airCutoffHU: -500, mprThicknessMm: 1.0, panoThicknessMm: 1.0 }));

    // Instant zero-latency synthetic volume for CBCT Studio
    const width = 32, height = 32, depth = 32, spX = 0.25, spY = 0.25, spZ = 0.5;
    const data = new Int16Array(width * height * depth);
    for (let z = 0; z < depth; z++) {
      for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
          const idx = z * (width * height) + y * width + x;
          if (x >= 8 && x <= 24 && y >= 8 && y <= 24 && z >= 8 && z <= 24) {
            data[idx] = 1200; // cortical bone
          } else if (x >= 4 && x <= 28 && y >= 4 && y <= 28 && z >= 4 && z <= 28) {
            data[idx] = 40; // soft tissue
          } else {
            data[idx] = -1000; // air
          }
        }
      }
    }
    window.__cbctDemoVolume = {
      id: "cbct-vol-synthetic-001",
      dimensions: { width, height, depth },
      spacingMm: { x: spX, y: spY, z: spZ },
      originMm: { x: -(width * spX) / 2, y: -(height * spY) / 2, z: -(depth * spZ) / 2 },
      physicalSizeMm: { x: width * spX, y: height * spY, z: depth * spZ },
      data,
      minHU: -1000,
      maxHU: 2000,
      rescaleSlope: 1.0,
      rescaleIntercept: -1000,
      defaultWindowWidth: 4025,
      defaultWindowLevel: 525,
      isDisposed: false,
    };
  });

async function applyTheme(page, theme) {
  await page.evaluate((th) => {
    localStorage.setItem("dente_theme_mode", th);
    if (window.__useThemeStore) {
      window.__useThemeStore.getState().setThemeMode(th);
    }
    document.documentElement.setAttribute("data-theme", th);
    document.body.setAttribute("data-theme", th);
    const isDark = ["dark", "night", "ocean", "emerald", "cyber_xray"].includes(th);
    document.documentElement.classList.toggle("dark", isDark);
    document.documentElement.classList.toggle("light", !isDark);
    document.body.classList.toggle("dark", isDark);
    document.body.classList.toggle("light", !isDark);
    document.documentElement.style.colorScheme = isDark ? "dark" : "light";
  }, theme);
  await page.waitForTimeout(500);
}

async function takeScreen(page, fileName, description) {
  await page.waitForTimeout(400);
  const p1 = path.join(targetDirs[0], fileName);
  if (fs.existsSync(p1)) {
    try { fs.unlinkSync(p1); } catch {}
  }
  await page.screenshot({ path: p1, fullPage: false, animations: "allow", timeout: 8000 });
  for (let i = 1; i < targetDirs.length; i++) {
    fs.copyFileSync(p1, path.join(targetDirs[i], fileName));
  }
  const stat = fs.statSync(p1);
  console.log(`[CAPTURED] ${fileName} (${description}) — ${(stat.size / 1024).toFixed(1)} KB`);
}

async function main() {
  console.log("=== STARTING AUTONOMOUS CAPTURE OF IMPLANT WORKSPACE (MANDATE 8e) ===");
  let browser = null;

  try {
    browser = await chromium.launch({
      headless: true,
      executablePath: "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
      args: ["--no-sandbox", "--disable-setuid-sandbox"],
    });

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

    console.log("Navigating directly to #imaging and opening RadiologyModule...");
    await page.goto("http://127.0.0.1:5173/#imaging", { waitUntil: "domcontentloaded", timeout: 10000 });
    await page.waitForTimeout(1000);

    const openBtn = await page.waitForSelector('[data-testid="imaging-open-radiology-module"]', { timeout: 8000 });
    await openBtn.click();
    await page.waitForSelector('[data-testid="radiology-module-container"]', { state: "visible", timeout: 8000 });
    console.log("RadiologyModule open!");

    console.log("Opening 3D CBCT Studio via btn-open-3d-cbct-studio...");
    const studioBtn = await page.waitForSelector('[data-testid="btn-open-3d-cbct-studio"]', { timeout: 8000 });
    await studioBtn.click();

    await page.waitForSelector('[data-testid="cbct-studio-modal"]', { state: "visible", timeout: 8000 });
    console.log("CBCT Studio modal opened!");
    await page.waitForTimeout(500);

    const testIds = await page.$$eval("[data-testid]", els => els.map(e => e.getAttribute("data-testid")));
    console.log("Current page data-testids:", testIds.filter(id => id.includes("cbct") || id.includes("implant")));
    await takeScreen(page, "debug_modal_open.png", "Modal open state");

    // If volume wasn't automatically picked up, dispatch event
    await page.evaluate(() => {
      if (window.__cbctDemoVolume) {
        window.dispatchEvent(new CustomEvent("dente-load-cbct-volume", { detail: window.__cbctDemoVolume }));
      }
    });
    await page.waitForTimeout(500);

    console.log("Inspecting Implant Studio tab element...");
    const tabInfo = await page.evaluate(() => {
      const el = document.querySelector('[data-testid="cbct-nav-tab-implant"]');
      if (!el) return { found: false };
      const r = el.getBoundingClientRect();
      const topEl = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
      const style = window.getComputedStyle(el);
      return {
        found: true,
        rect: { x: r.x, y: r.y, width: r.width, height: r.height },
        display: style.display,
        visibility: style.visibility,
        opacity: style.opacity,
        topElementTag: topEl ? topEl.tagName : null,
        topElementClass: topEl ? topEl.className : null,
        topElementTestId: topEl ? topEl.getAttribute("data-testid") : null,
      };
    });
    console.log("Tab diagnostic info:", JSON.stringify(tabInfo, null, 2));

    console.log("Clicking Implant Studio tab...");
    await page.evaluate(() => {
      const el = document.querySelector('[data-testid="cbct-nav-tab-implant"]');
      if (el) el.click();
    });
    await page.waitForTimeout(1000);

    // Verify Surgeon Station Panel
    await page.waitForSelector('[data-testid="cbct-implant-surgeon-station-panel"]', { timeout: 8000 });
    console.log("Surgeon station panel mounted!");

    const themes = ["light", "dark"];

    for (const theme of themes) {
      console.log(`\n>>> PROCESSING THEME: ${theme.toUpperCase()} <<<`);
      await applyTheme(page, theme);

      // 1. Clean Uncluttered Doctor View (Optional Assistant is Closed)
      console.log(`Capturing Clean View (${theme})...`);
      await page.$eval('[data-testid="cbct-implant-surgeon-station-panel"]', (el) => {
        el.scrollTop = 0;
      });
      await page.waitForTimeout(300);
      await takeScreen(
        page,
        `proof_implant_workspace_${theme}_clean.png`,
        `Станция имплантации: чистый лаконичный вид хирурга (Мандат 8e) — ${theme}`
      );

      // 2. Expand Clinical AI Assistant Accordion
      console.log(`Expanding Clinical AI Assistant Accordion (${theme})...`);
      const accordionSummary = await page.waitForSelector(
        '[data-testid="cbct-implant-ai-assistant-accordion"] summary',
        { timeout: 8000 }
      );
      await accordionSummary.click();
      await page.waitForTimeout(400);

      // Scroll down so the full Misch HUD & Nerve safety panel are fully visible in frame
      const telemetryHud = page.locator('[data-testid="cbct-implant-live-telemetry-hud"]');
      await telemetryHud.waitFor({ state: "visible", timeout: 8000 });
      await telemetryHud.scrollIntoViewIfNeeded();
      await page.waitForTimeout(400);

      // Verify that Misch HUD and Nerve badge are visible in expanded state
      await page.waitForSelector('[data-testid="cbct-implant-live-telemetry-hud"]', { timeout: 8000 });
      await page.waitForSelector('[data-testid="cbct-implant-nerve-safety-badge"]', { timeout: 8000 });

      console.log(`Capturing Expanded View (${theme})...`);
      await takeScreen(
        page,
        `proof_implant_workspace_${theme}_expanded.png`,
        `Станция имплантации: опциональный ИИ-ассистент (Миш D1-D5, HU, торк, протокол сверления, IAN нерв) — ${theme}`
      );

      // Also capture dedicated high-res close-up of surgeon station panel
      const surgeonPanel = page.locator('[data-testid="cbct-implant-surgeon-station-panel"]');
      const panelShotPath = path.join(targetDirs[0], `proof_implant_station_panel_${theme}.png`);
      await surgeonPanel.screenshot({ path: panelShotPath, animations: "allow", timeout: 8000 });
      for (let i = 1; i < targetDirs.length; i++) {
        fs.copyFileSync(panelShotPath, path.join(targetDirs[i], `proof_implant_station_panel_${theme}.png`));
      }
      console.log(`[CAPTURED] proof_implant_station_panel_${theme}.png — ${(fs.statSync(panelShotPath).size / 1024).toFixed(1)} KB`);

      // Close accordion back and reset scroll
      await accordionSummary.click();
      await page.$eval('[data-testid="cbct-implant-surgeon-station-panel"]', (el) => {
        el.scrollTop = 0;
      });
      await page.waitForTimeout(300);
    }

    console.log("\n>>> ALL 4 TARGET IMPLANT SCREENSHOTS CAPTURED SUCCESSFULLY! <<<");
  } finally {
    clearTimeout(killTimer);
    if (browser) await browser.close().catch(() => {});
  }
}

main().catch((err) => {
  clearTimeout(killTimer);
  console.error("FATAL ERROR:", err);
  process.exit(1);
});
