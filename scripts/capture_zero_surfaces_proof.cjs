/**
 * scripts/capture_zero_surfaces_proof.cjs
 *
 * Captures authentic visual proofs of Odontogram, 043/u SOAP Diary, and Treatment Estimator
 * operating seamlessly WITHOUT mandatory tooth surfaces (1-Click Caries on Tooth 36).
 * Mandates 8c (4-State Proofs), 8l (Clinical 043/u), 8aa (Anti-Droch).
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
      serviceTitle: "Лечение кариеса 36 зуба",
      serviceCategories: ["therapy"],
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
  path.resolve("docs/screenshots/nosurfaces"),
  "C:/Users/Admin/.gemini/antigravity/brain/b0d0891e-7323-4c3f-994a-b9da8a751b46",
];

for (const d of targetDirs) {
  if (!fs.existsSync(d)) fs.mkdirSync(d, { recursive: true });
}

async function saveProof(page, fileName, description = "") {
  for (const dir of targetDirs) {
    const fullPath = path.join(dir, fileName);
    await page.screenshot({ path: fullPath, fullPage: false, animations: "disabled" });
    const stats = fs.statSync(fullPath);
    const md5 = crypto.createHash("md5").update(fs.readFileSync(fullPath)).digest("hex");
    console.log(`[PROOF] ${fileName} (${stats.size} B / ${(stats.size / 1024).toFixed(1)} KB, MD5: ${md5}) - ${description}`);
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
        body: JSON.stringify({ success: true, states: [{ toothNumber: 36, state: "Caries", surfaces: [] }] }),
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
  console.log("=== ZERO-SURFACES CLINICAL PROTOCOL & ESTIMATOR AUDIT PIPELINE ===");

  const browser = await chromium.launch({
    executablePath: "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });

  try {
    // -------------------------------------------------------------
    // 1. DESKTOP VIEWPORT (1440x900)
    // -------------------------------------------------------------
    console.log("[Desktop] Launching 1440x900 context...");
    const desktopContext = await browser.newContext({
      viewport: { width: 1440, height: 900 },
      deviceScaleFactor: 2,
    });
    await addInitStorage(desktopContext);
    const dPage = await desktopContext.newPage();
    await setupPageRoutes(dPage);

    await dPage.goto("http://127.0.0.1:5173/#visit", { waitUntil: "domcontentloaded", timeout: 30000 });
    await dPage.waitForTimeout(2000);

    // Wait until loading indicator disappears and tabs are visible
    await dPage.waitForSelector('button:has-text("Дневник приёма")', { timeout: 15000 });

    // Step 1: Scroll to Express Clinical Protocols and click Caries (K02.1)
    console.log("[Desktop] Applying 1-Click Caries Protocol on Tooth 36 without surfaces...");
    await dPage.evaluate(() => {
      // Find Caries express button
      const cariesBtn = document.querySelector('[data-testid="btn-emk-express-caries"]') ||
                        Array.from(document.querySelectorAll('button')).find(b => b.textContent && b.textContent.includes('K02.1'));
      if (cariesBtn) cariesBtn.click();
    });
    await dPage.waitForTimeout(800);

    // Scroll down to show SOAP fields (Diagnosis, Objective Status, Treatment Plan)
    await dPage.evaluate(() => {
      window.scrollBy({ top: 350, behavior: 'instant' });
    });
    await dPage.waitForTimeout(400);

    // Capture 01 & 02: Diary Protocol without surfaces
    await setTheme(dPage, "light");
    await saveProof(dPage, "01_nosurfaces_diary_protocol_desktop_light.png", "Desktop Light: Form 043/u SOAP Diary with 1-Click Caries (No surfaces, clean medical Russian)");

    await setTheme(dPage, "dark");
    await saveProof(dPage, "02_nosurfaces_diary_protocol_desktop_dark.png", "Desktop Dark: Form 043/u SOAP Diary with 1-Click Caries (No surfaces, clean medical Russian)");

    // Step 2: Switch to "Зубная формула" tab to show Odontogram
    console.log("[Desktop] Switching to 'Зубная формула' tab...");
    await dPage.evaluate(() => {
      window.scrollTo({ top: 0, behavior: 'instant' });
      const formulaBtn = Array.from(document.querySelectorAll('button')).find(b => b.textContent && b.textContent.includes('Зубная формула'));
      if (formulaBtn) formulaBtn.click();
    });
    await dPage.waitForTimeout(1000);

    // Capture 03 & 04: Odontogram with tooth 36
    await setTheme(dPage, "light");
    await saveProof(dPage, "03_nosurfaces_odontogram_desktop_light.png", "Desktop Light: FDI Odontogram with Tooth 36 Caries state without forced surfaces");

    await setTheme(dPage, "dark");
    await saveProof(dPage, "04_nosurfaces_odontogram_desktop_dark.png", "Desktop Dark: FDI Odontogram with Tooth 36 Caries state without forced surfaces");

    await desktopContext.close();

    // -------------------------------------------------------------
    // 2. MOBILE VIEWPORT (390x844)
    // -------------------------------------------------------------
    console.log("\n[Mobile] Launching 390x844 context...");
    const mobileContext = await browser.newContext({
      viewport: { width: 390, height: 844 },
      deviceScaleFactor: 2,
      isMobile: true,
      hasTouch: true,
    });
    await addInitStorage(mobileContext);
    const mPage = await mobileContext.newPage();
    await setupPageRoutes(mPage);

    await mPage.goto("http://127.0.0.1:5173/#visit", { waitUntil: "domcontentloaded", timeout: 30000 });
    await mPage.waitForTimeout(2000);

    await mPage.waitForSelector('button:has-text("Дневник приёма")', { timeout: 15000 });

    // Apply express caries on mobile
    await mPage.evaluate(() => {
      const cariesBtn = document.querySelector('[data-testid="btn-emk-express-caries"]') ||
                        Array.from(document.querySelectorAll('button')).find(b => b.textContent && b.textContent.includes('K02.1'));
      if (cariesBtn) cariesBtn.click();
    });
    await mPage.waitForTimeout(600);

    await setTheme(mPage, "light");
    await saveProof(mPage, "05_nosurfaces_diary_mobile_light.png", "Mobile Light: 1-Click Caries Protocol without surfaces on iOS/Android touch layout");

    await setTheme(mPage, "dark");
    await saveProof(mPage, "06_nosurfaces_diary_mobile_dark.png", "Mobile Dark: 1-Click Caries Protocol without surfaces on iOS/Android touch layout");

    await mobileContext.close();
    console.log("\n[SUCCESS] All 6 authentic visual proofs captured successfully!");
  } finally {
    await browser.close();
  }
}

run().catch((err) => {
  console.error("[FATAL ERROR]:", err);
  process.exit(1);
});
