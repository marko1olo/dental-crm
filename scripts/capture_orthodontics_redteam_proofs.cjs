/**
 * scripts/capture_orthodontics_redteam_proofs.cjs
 *
 * Autonomous Red Team Live Screenshot Suite for Orthodontics, Gnathology, Cephalometry, and Photoprotocol.
 * Viewport: 1440x900 (PC Light and PC Dark).
 * Invariants:
 * - Mandate 8c: Real browser visual proof (Edge 1440x900)
 * - Mandate 8p: Zero cartoon emojis, high contrast, clean toolbars (32-36px)
 * - Mandate 8z: Zero Soviet bureaucratic ciphers ("Форма 043/у", "804н") on visible UI controls
 * - Mandate 8b: Script strictly <= 800 lines
 */

const { chromium } = require("playwright");
const path = require("node:path");
const fs = require("node:fs");
const crypto = require("node:crypto");

const EDGE_PATH = "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe";
const TARGET_DIR_DOCS = path.resolve("C:/Clinic_MVP/dental-crm/docs/screenshots/orthodontics_redteam");
const TARGET_DIR_BRAIN = path.resolve("C:/Users/Admin/.gemini/antigravity/brain/3d324214-db93-4cc6-af7e-d8d542ce6611/screenshots");

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
        specialties: ["orthodontist", "orthopedist", "therapist"],
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
        name: "Кабинет 1 (Ортодонтия)",
        room: "1",
        defaultDoctorId: "doc-1",
        active: true,
      },
    ],
    integrationPresets: [],
    workspaceProfiles: [],
    roleAccessPolicies: [],
    modeHints: [],
    soloDoctorMode: false,
  },
  patients: [
    {
      id: "pat-ortho-1",
      organizationId: "00000000-0000-0000-0000-000000000001",
      fullName: "Ковалёв Роман Станиславович",
      status: "active",
      birthDate: "1994-05-18",
      phone: "+7 (999) 888-77-66",
      email: "kovalev.ortho@example.ru",
      notes: "Дистальный прикус, скученность фронтального отдела верхней челюсти. Элайнеротерапия.",
      administrativeProfile: "normal",
      createdAt: `${todayDate}T08:00:00.000Z`,
      updatedAt: `${todayDate}T08:00:00.000Z`,
    },
  ],
  appointments: [
    {
      id: "app-ortho-1",
      organizationId: "00000000-0000-0000-0000-000000000001",
      patientId: "pat-ortho-1",
      doctorUserId: "doc-1",
      doctorId: "doc-1",
      chairId: "chair-1",
      status: "in_treatment",
      state: "in_treatment",
      priority: "normal",
      intent: "treatment",
      startsAt: `${todayDate}T10:00:00.000Z`,
      endsAt: `${todayDate}T11:00:00.000Z`,
      startTime: `${todayDate}T10:00:00.000Z`,
      endTime: `${todayDate}T11:00:00.000Z`,
      durationMinutes: 60,
      serviceTitle: "Ортодонтия: Коррекция прикуса и контроль аппаратуры",
      serviceCategories: ["orthodontics"],
      createdByUserId: "doc-1",
      createdAt: `${todayDate}T08:00:00.000Z`,
      updatedAt: `${todayDate}T08:00:00.000Z`,
      patientName: "Ковалёв Роман Станиславович",
      doctorName: "Д-р Воронов Алексей Владимирович",
    },
  ],
  activeVisit: {
    id: "app-ortho-1",
    patientId: "pat-ortho-1",
    patientName: "Ковалёв Роман Станиславович",
    doctorId: "doc-1",
    doctorName: "Д-р Воронов Алексей Владимирович",
    serviceTitle: "Ортодонтия: Коррекция прикуса и контроль аппаратуры",
    startsAt: `${todayDate}T10:00:00.000Z`,
    endsAt: `${todayDate}T11:00:00.000Z`,
    status: "in_treatment",
  },
};

const mockOrthoProgress = {
  patientId: "pat-ortho-1",
  currentAligner: 5,
  totalAligners: 36,
  wearDaysPerAligner: 10,
  archwire: "NiTi .014",
  lastVisitDate: todayDate,
};

async function addInitStorage(context) {
  await context.addInitScript(() => {
    localStorage.setItem("dente_clinic_token", "demo-clinic-token");
    localStorage.setItem("dente_staff_token", "demo-showcase-staff-token-chief");
    localStorage.setItem("dente_active_role", "owner");
    localStorage.setItem("dente_theme_mode", "light");
    localStorage.setItem("dente_tour_completed", "true");
    localStorage.setItem("dente_demo_showcase_mode_v1", "true");
    localStorage.setItem("dente_workspace_perspective", "orthodontic");
    localStorage.setItem(
      "dente_active_staff_user",
      JSON.stringify({
        id: "doc-1",
        fullName: "Д-р Воронов Алексей Владимирович",
        role: "owner",
      })
    );
    localStorage.setItem(
      "dente_quest_tour_progress_v1",
      JSON.stringify({
        isDismissedPermanently: true,
        isTourActive: false,
        activeTrackId: "solo_doctor",
        currentStepIndex: 999,
        completedStepIds: ["step-1", "step-2", "step-3"],
        tracksProgress: {
          solo_doctor: { completed: true, completedStepIds: ["step-1", "step-2", "step-3"] },
          reception_admin: { completed: true, completedStepIds: [] },
          imaging_diagnostics: { completed: true, completedStepIds: [] },
        },
      })
    );
    localStorage.setItem(
      "dental-crm:onboarding:v1",
      JSON.stringify({ dismissed: true, step: "done", completed: true })
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
}

async function setupPageRoutes(page) {
  // Mock all API endpoints so that absence of backend on 4100 does not throw 500 errors
  await page.route("**/api/dashboard**", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(mockDashboard),
    });
  });

  await page.route("**/api/auth/me**", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        authenticated: true,
        user: { id: "doc-1", fullName: "Д-р Воронов Алексей Владимирович", role: "owner" },
      }),
    });
  });

  await page.route("**/api/auth/user/me**", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        authenticated: true,
        user: { id: "doc-1", fullName: "Д-р Воронов Алексей Владимирович", role: "owner" },
      }),
    });
  });

  await page.route("**/api/auth/staff/unlock**", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        success: true,
        staffToken: "demo-showcase-staff-token-chief",
        user: { id: "doc-1", fullName: "Д-р Воронов Алексей Владимирович", role: "owner" },
      }),
    });
  });

  await page.route("**/api/auth/verify-clinic**", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        success: true,
        clinicId: "c-1",
        clinicName: "Стоматология ДЕНТЕ Премиум",
      }),
    });
  });

  await page.route("**/api/appointments**", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(mockDashboard.appointments),
    });
  });

  await page.route("**/api/patients**", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(mockDashboard.patients),
    });
  });

  await page.route("**/api/visits/**", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ success: true, savedAt: new Date().toISOString() }),
    });
  });

  await page.route("**/api/speech/**", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ success: true, status: "idle", providers: [] }),
    });
  });

  await page.route("**/api/clinical/**", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ success: true }),
    });
  });

  await page.route("**/api/orthodontics/**", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(mockOrthoProgress),
    });
  });
}

async function suppressOverlays(page) {
  await page.evaluate(() => {
    const style = document.createElement("style");
    style.id = "suppress-all-tour-overlays";
    style.innerHTML = `
      .tour-spotlight-root,
      .tour-backdrop-clickable-zone,
      [data-testid="guided-tour-spotlight-overlay"],
      [data-testid="guided-tour-coach-mark-card"],
      .shepherd-element {
        display: none !important;
        pointer-events: none !important;
        opacity: 0 !important;
      }
    `;
    document.head.appendChild(style);

    document.querySelectorAll(".tour-spotlight-root, .tour-backdrop-clickable-zone, [data-testid='guided-tour-spotlight-overlay']").forEach((el) => {
      el.remove();
    });
  });
}

async function setTheme(page, mode = "light") {
  await page.evaluate((themeMode) => {
    if (window.__useThemeStore) {
      window.__useThemeStore.getState().setThemeMode(themeMode);
    }
    document.documentElement.classList.remove("light", "dark");
    document.documentElement.classList.add(themeMode);
    document.documentElement.setAttribute("data-theme", themeMode);
    localStorage.setItem("dente_theme_mode", themeMode);
  }, mode);
  await page.waitForTimeout(500);
}

async function unlockPinPadIfVisible(page) {
  try {
    const pinPad = await page.$('.auth-pin-grid, .auth-modal-content, .auth-staff-card');
    if (pinPad) {
      console.log(">>> Detected StaffPinPad on screen, unlocking...");
      const staffCard = await page.$('.auth-staff-card');
      if (staffCard) {
        await staffCard.click({ force: true }).catch(() => {});
        await page.waitForTimeout(200);
      }
      const zeroBtn = await page.$('button.auth-pin-btn:has-text("0")');
      if (zeroBtn) {
        for (let i = 0; i < 4; i++) {
          await zeroBtn.click({ force: true }).catch(() => {});
          await page.waitForTimeout(100);
        }
      }
      await page.waitForTimeout(1000);
    }
  } catch (e) {
    console.warn(">>> unlockPinPadIfVisible warning:", e);
  }
}

async function saveProof(page, filename, description) {
  const targetDirs = [TARGET_DIR_DOCS, TARGET_DIR_BRAIN];
  for (const dir of targetDirs) {
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  }

  const primaryPath = path.join(TARGET_DIR_DOCS, filename);
  await page.screenshot({ path: primaryPath, fullPage: false });

  // Copy to brain artifacts
  const brainPath = path.join(TARGET_DIR_BRAIN, filename);
  fs.copyFileSync(primaryPath, brainPath);

  const buffer = fs.readFileSync(primaryPath);
  const hash = crypto.createHash("md5").update(buffer).digest("hex");
  const stats = fs.statSync(primaryPath);

  console.log(`[PROOF CAPTURED] ${filename}`);
  console.log(`  Description: ${description}`);
  console.log(`  Path: ${primaryPath}`);
  console.log(`  Brain Path: ${brainPath}`);
  console.log(`  Size: ${stats.size} bytes | MD5: ${hash}\n`);

  return { filename, primaryPath, brainPath, size: stats.size, hash, description };
}

async function run() {
  console.log("==================================================================");
  console.log("Starting Orthodontics, Gnathology & Cephalometry Red Team Suite...");
  console.log("==================================================================");

  const browser = await chromium.launch({
    executablePath: EDGE_PATH,
    headless: true,
    args: [
      "--no-sandbox",
      "--disable-setuid-sandbox",
      "--disable-dev-shm-usage",
      "--disable-accelerated-2d-canvas",
      "--no-first-run",
      "--no-zygote",
      "--disable-gpu",
    ],
  });

  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    deviceScaleFactor: 1,
  });

  await addInitStorage(context);
  const page = await context.newPage();

  page.on("console", (msg) => {
    const text = msg.text();
    if (msg.type() === "error" || (text.includes("error") && !text.includes("favicon") && !text.includes("ws"))) {
      console.log("[Page console]:", text);
    }
  });

  await setupPageRoutes(page);

  console.log("\n[Step 1] Navigating to http://127.0.0.1:5173/#visit in Orthodontic perspective...");
  await page.goto("http://127.0.0.1:5173/#visit", { waitUntil: "domcontentloaded", timeout: 30000 });
  await page.waitForTimeout(2000);

  await unlockPinPadIfVisible(page);
  await suppressOverlays(page);

  // Force orthodontic perspective in store
  await page.evaluate(() => {
    if (window.__usePerspectiveStore) {
      window.__usePerspectiveStore.getState().setPerspective("orthodontic");
    }
    localStorage.setItem("dente_workspace_perspective", "orthodontic");
  });
  await page.waitForTimeout(1000);

  // ------------------------------------------------------------------
  // 1. Orthodontic Visit Protocol Widget (Occlusion + Gnathology / TMJ)
  // ------------------------------------------------------------------
  console.log("\n[Step 1A] Opening Orthodontic Visit Protocol Widget...");
  await page.evaluate(() => {
    const btn = Array.from(document.querySelectorAll("button")).find(
      (b) => b.textContent && b.textContent.includes("Протокол визита")
    );
    if (btn) btn.click();
  });

  await page.waitForSelector('[data-testid="orthodontic-visit-protocol-widget"]', { timeout: 10000 });
  await page.waitForTimeout(600);

  // Interact with 1-click Occlusal Anomaly and TMJ Gnathology bars
  console.log("[Step 1B] Interacting with 1-click Occlusal Anomaly and TMJ Gnathology bars...");
  await page.evaluate(() => {
    // Select Overjet (>2mm)
    const overjetBtn = document.querySelector('[data-testid="sagittal-overjet-btn"]');
    if (overjetBtn) overjetBtn.click();

    // Select Deep bite
    const deepBtn = document.querySelector('[data-testid="vertical-deep-btn"]');
    if (deepBtn) deepBtn.click();

    // Select TMJ clicking
    const tmjBtn = document.querySelector('[data-testid="tmj-status-clicking-btn"]');
    if (tmjBtn) tmjBtn.click();

    // Scroll to the selector bars
    const occlBar = document.querySelector('[data-testid="ortho-occlusion-anomaly-selector"]');
    if (occlBar) {
      occlBar.scrollIntoView({ behavior: "instant", block: "center" });
    }
  });
  await page.waitForTimeout(600);

  // Capture 01: Orthodontic Visit Protocol Light
  await setTheme(page, "light");
  await saveProof(
    page,
    "01_orthodontic_visit_protocol_light.png",
    "Orthodontic Visit Protocol Widget (1440x900 PC Light) with 1-click Occlusion Anomaly & TMJ Gnathology bars"
  );

  // Capture 01: Orthodontic Visit Protocol Dark
  await setTheme(page, "dark");
  await saveProof(
    page,
    "01_orthodontic_visit_protocol_dark.png",
    "Orthodontic Visit Protocol Widget (1440x900 PC Dark) with 1-click Occlusion Anomaly & TMJ Gnathology bars"
  );

  // ------------------------------------------------------------------
  // 2. Lateral TRG Cephalometric Analysis Modal (Landmarks, Steiner Angles)
  // ------------------------------------------------------------------
  console.log("\n[Step 2] Opening Cephalometric Analysis Modal from widget...");
  // First scroll into view of the cephalometric button in the widget
  await page.evaluate(() => {
    const cephBtn = document.querySelector('[data-testid="ortho-open-ceph-analysis-btn"]');
    if (cephBtn) {
      cephBtn.scrollIntoView({ behavior: "instant", block: "center" });
      cephBtn.click();
    }
  });

  await page.waitForSelector('[data-testid="cephalometric-analysis-modal"]', { timeout: 12000 });
  await page.waitForTimeout(800);

  console.log("[Step 2B] Applying Class I Normal Landmarks Preset (16 landmarks + Steiner SNA/SNB/ANB)...");
  await page.evaluate(() => {
    const presetBtn = document.querySelector('[data-testid="header-preset-class-1"]') ||
                      Array.from(document.querySelectorAll("button")).find(b => b.textContent && b.textContent.includes("I Класс (Норма)"));
    if (presetBtn) presetBtn.click();
  });
  await page.waitForTimeout(1500);

  // Capture 02: Cephalometric Analysis Dark
  await setTheme(page, "dark");
  await saveProof(
    page,
    "02_cephalometric_analysis_trg_dark.png",
    "Cephalometric Lateral TRG Analysis (1440x900 PC Dark) with Steiner SNA/SNB/ANB angles, planes & polygon"
  );

  // Capture 02: Cephalometric Analysis Light
  await setTheme(page, "light");
  await saveProof(
    page,
    "02_cephalometric_analysis_trg_light.png",
    "Cephalometric Lateral TRG Analysis (1440x900 PC Light) with Steiner SNA/SNB/ANB angles, planes & polygon"
  );

  // Close Cephalometric Modal
  console.log("[Step 2C] Closing Cephalometric Analysis Modal...");
  await page.evaluate(() => {
    const closeBtn = document.querySelector('[data-testid="ceph-modal-close-btn"]');
    if (closeBtn) closeBtn.click();
  });
  await page.waitForTimeout(800);

  // ------------------------------------------------------------------
  // 3. Orthodontic Photo Protocol Modal (8/9-view AACD / ABO Grid)
  // ------------------------------------------------------------------
  console.log("\n[Step 3] Opening Orthodontic Photo Protocol Modal...");
  await page.evaluate(() => {
    // Can open via the button in the widget or close widget and open via perspective view
    const photoBtn = document.querySelector('[data-testid="ortho-open-photo-protocol-btn"]') ||
                     Array.from(document.querySelectorAll("button")).find(b => b.textContent && b.textContent.includes("Фотопротокол"));
    if (photoBtn) {
      photoBtn.scrollIntoView({ behavior: "instant", block: "center" });
      photoBtn.click();
    }
  });

  await page.waitForSelector('[data-testid="orthodontic-photo-protocol-modal"]', { timeout: 12000 });
  await page.waitForTimeout(1000);

  // Capture 03: Orthodontic Photo Protocol Light
  await setTheme(page, "light");
  await saveProof(
    page,
    "03_orthodontic_photoprotocol_grid_light.png",
    "Orthodontic Photo Protocol Modal (1440x900 PC Light) AACD/ABO 8-view grid & clean clinical terminology"
  );

  // Capture 03: Orthodontic Photo Protocol Dark
  await setTheme(page, "dark");
  await saveProof(
    page,
    "03_orthodontic_photoprotocol_grid_dark.png",
    "Orthodontic Photo Protocol Modal (1440x900 PC Dark) AACD/ABO 8-view grid & clean clinical terminology"
  );

  // Close Photo Protocol Modal
  await page.keyboard.press("Escape");
  await page.waitForTimeout(400);

  await context.close();
  await browser.close();

  console.log("==================================================================");
  console.log("All 6 Proof Screenshots successfully captured and saved!");
  console.log("==================================================================");
}

run().catch((err) => {
  console.error("FATAL ERROR in screenshot capture:", err);
  process.exit(1);
});
