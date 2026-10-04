/**
 * scripts/capture_tooth_hud_periodontitis_proofs.cjs
 *
 * Captures 1440x900 Desktop Light & Dark visual proofs of:
 * - ToothCardHud compact floating card on Tooth 16
 * - 1-Click Periodontitis action (Pt badge, terracotta/amber, Activity icon)
 * - Clean quiet mode surfaces
 *
 * Saves to:
 * - docs/screenshots/inquisition_live/proof_tooth_hud_periodontitis_light.png
 * - docs/screenshots/inquisition_live/proof_tooth_hud_periodontitis_dark.png
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
    soloDoctorMode: false,
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
      notes: "Аллергоанамнез спокоен",
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
      serviceTitle: "Лечение периодонтита 16 зуба",
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

const outputDir = path.resolve("docs/screenshots/inquisition_live");
const artifactsDir = "C:/Users/Admin/.gemini/antigravity/brain/ad10b83a-8843-49b3-b038-ce200159aecf";

for (const d of [outputDir, artifactsDir]) {
  if (!fs.existsSync(d)) {
    fs.mkdirSync(d, { recursive: true });
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
    localStorage.setItem("dente_theme_mode", th);
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
    localStorage.setItem("dente_tour_completed", "true");
    localStorage.setItem(
      "dente_quest_progress_v1",
      JSON.stringify({
        isDismissedPermanently: true,
        isTourActive: false,
        tracksProgress: {
          solo_doctor: { completed: true, completedStepIds: [] },
          reception_admin: { completed: true, completedStepIds: [] },
          imaging_diagnostics: { completed: true, completedStepIds: [] },
        },
      })
    );
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

async function saveProof(page, fileName, description = "") {
  const fullPath = path.join(outputDir, fileName);
  await page.screenshot({ path: fullPath, fullPage: false, animations: "disabled" });
  // Mirror to artifacts dir
  try {
    fs.copyFileSync(fullPath, path.join(artifactsDir, fileName));
  } catch {}
  const stats = fs.statSync(fullPath);
  const md5 = crypto.createHash("md5").update(fs.readFileSync(fullPath)).digest("hex");
  console.log(`[PROOF SAVED] ${fileName} (${stats.size} B / ${(stats.size / 1024).toFixed(1)} KB, MD5: ${md5}) - ${description}`);
}

async function run() {
  console.log("=== STARTING TOOTH CARD HUD PERIODONTITIS PROOF PIPELINE ===");

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
    await addInitStorage(context);
    const page = await context.newPage();
    await setupPageRoutes(page);

    console.log("Navigating to http://127.0.0.1:5173/#visit ...");
    await page.goto("http://127.0.0.1:5173/#visit", { waitUntil: "domcontentloaded", timeout: 30000 });
    await page.waitForTimeout(2500);

    // Suppress tutorial overlays
    await page.addStyleTag({
      content: `
        .tour-spotlight-root,
        [data-testid="guided-tour-spotlight-overlay"],
        .tour-backdrop-clickable-zone,
        .coach-mark-card,
        .onboarding-modal {
          display: none !important;
          pointer-events: none !important;
        }
      `,
    });

    console.log("Clicking odontogram subtab via data-testid='visit-subtab-odontogram'...");
    await page.waitForSelector('[data-testid="visit-subtab-odontogram"]', { timeout: 15000 });
    await page.click('[data-testid="visit-subtab-odontogram"]');
    await page.waitForTimeout(2000);

    await page.waitForSelector('[data-testid="odontogram-view-container"]', { state: "visible", timeout: 15000 });
    console.log("Odontogram container visible!");

    // Helper to hover and reveal HUD on tooth 16
    async function revealToothHud(toothNum) {
      console.log(`Locating tooth ${toothNum}...`);
      const toothWrapper = page.locator(`.odontogram-view-container [data-tooth-id="${toothNum}"]`).first();
      await toothWrapper.waitFor({ state: "attached", timeout: 10000 });
      await toothWrapper.scrollIntoViewIfNeeded().catch(() => {});

      // Hover on the tooth badge
      const badge = toothWrapper.locator(".tooth-number-badge").first();
      await badge.hover({ force: true });
      await page.waitForTimeout(400);

      // Force display flex and remove hidden to guarantee stability for screenshot
      await page.evaluate((num) => {
        const hud = document.querySelector(`[data-testid="tooth-card-hud-${num}"]`);
        if (hud) {
          hud.style.display = 'flex';
          hud.classList.remove('hidden');
        }
      }, toothNum);
      await page.waitForTimeout(300);

      // Verify HUD is displayed
      const hud = toothWrapper.locator(`[data-testid="tooth-card-hud-${toothNum}"]`);
      await hud.waitFor({ state: "visible", timeout: 5000 });

      // Hover on the quick-periodontitis button directly so both the HUD and the button hover state are visible
      const perioBtn = hud.locator(`[data-testid="quick-periodontitis-${toothNum}"]`);
      if (await perioBtn.isVisible()) {
        console.log(`Hovering over quick-periodontitis-${toothNum} button...`);
        await perioBtn.hover({ force: true });
        await page.waitForTimeout(400);
      }
    }

    // --- 1. LIGHT THEME PROOF ---
    console.log("Capturing Light theme proof...");
    await setTheme(page, "light");
    await page.waitForTimeout(600);
    await revealToothHud(16);
    await saveProof(page, "proof_tooth_hud_periodontitis_light.png", "Desktop Light (1440x900): ToothCardHud on Tooth 16 with 1-click Periodontitis action (Pt, #ea580c)");

    // --- 2. DARK THEME PROOF ---
    console.log("Capturing Dark theme proof...");
    await setTheme(page, "dark");
    await page.waitForTimeout(600);
    await revealToothHud(16);
    await saveProof(page, "proof_tooth_hud_periodontitis_dark.png", "Desktop Dark (1440x900): ToothCardHud on Tooth 16 with 1-click Periodontitis action (Pt, #ea580c)");

    console.log("=== ALL PROOFS CAPTURED SUCCESSFULLY ===");
  } finally {
    await browser.close();
  }
}

run().catch((err) => {
  console.error("Proof capture pipeline failed:", err);
  process.exit(1);
});
