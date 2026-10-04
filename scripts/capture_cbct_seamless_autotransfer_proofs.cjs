/**
 * scripts/capture_cbct_seamless_autotransfer_proofs.cjs
 * Red Team Inquisitor #2 Proof Capture Script:
 * 5-Button Seamless Auto-transfer from 3D CBCT Studio:
 * 1. Toolbar with all 5 export buttons (Light & Dark)
 * 2. "+ Смета" (Adds CBCT + Implant A16.07.054.001 + Bone graft to visit finance & treatment plan)
 * 3. "В план лечения" (Creates surgical stage with cross-sectional slice attachment)
 * 4. "В ЗТЛ" (Opens prefilled DentalLabOrderModal for surgical guide directly in studio)
 * 5. "В ЭМК" (Generates Form 043/u diary entry with HU bone density + attached 300 DPI slice)
 */

const { chromium } = require("playwright");
const path = require("node:path");
const fs = require("node:fs");

// ЖЕЛЕЗНЫЙ СТОРОЖЕВОЙ ТАЙМЕР СОЗДАТЕЛЯ (60 секунд максимум)
const killTimer = setTimeout(() => {
  console.error("[FATAL] SCRIPT TIMEOUT WATCHDOG (60s EXCEEDED) — FORCING TERMINATION!");
  process.exit(1);
}, 60000);

const targetDirs = [
  path.resolve("C:/Clinic_MVP/dental-crm/docs/screenshots/inquisition_live"),
  path.resolve("C:/Users/Admin/.gemini/antigravity/brain/36acf65a-637a-4e5c-80ec-e175b1511014"),
];

for (const d of targetDirs) {
  if (!fs.existsSync(d)) fs.mkdirSync(d, { recursive: true });
}

const mockDashboard = {
  clinicName: "Стоматология ДЕНТЕ Премиум",
  todayIso: "2026-10-04",
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
      updatedAt: new Date().toISOString(),
    },
    staff: [
      {
        id: "doc-1",
        organizationId: "00000000-0000-0000-0000-000000000001",
        fullName: "Д-р Воронов Алексей Владимирович",
        role: "owner",
        specialties: ["therapist", "surgeon", "implantologist"],
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
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
  ],
  patientInsights: [],
  recommendedActions: [],
  appointments: [],
  imagingStudies: [
    {
      id: "study-zakharov-cbct",
      patientId: "pat-1",
      patientName: "Ковалёв Роман Станиславович",
      modality: "CT",
      seriesDescription: "3D КЛКТ Ковалёв (312 срезов)",
      status: "completed",
      createdAt: new Date().toISOString(),
    },
  ],
  serviceCatalog: [],
  payments: [],
};

const wait = (ms) => new Promise((r) => setTimeout(r, ms));

async function applyTheme(page, theme) {
  console.log(`[THEME] Applying ${theme}...`);
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
  await wait(300);
}

async function take(page, name) {
  const p = path.join(targetDirs[0], name);
  if (fs.existsSync(p)) {
    try { fs.unlinkSync(p); } catch {}
  }
  await page.screenshot({ path: p, animations: "disabled", timeout: 8000 });
  for (let i = 1; i < targetDirs.length; i++) {
    fs.copyFileSync(p, path.join(targetDirs[i], name));
  }
  const sz = (fs.statSync(p).size / 1024).toFixed(1);
  console.log(`[SAVED] ${name} (${sz} KB)`);
}

async function main() {
  console.log("=== STARTING CAPTURE OF 5-BUTTON SEAMLESS CBCT TRANSFERS ===");
  let browser = null;

  try {
    browser = await chromium.launch({
      headless: true,
      executablePath: "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
      args: ["--no-sandbox", "--disable-setuid-sandbox"],
    });

    const ctx = await browser.newContext({
      viewport: { width: 1440, height: 900 },
      deviceScaleFactor: 1,
      serviceWorkers: "block",
    });

    await ctx.addInitScript(() => {
      localStorage.setItem("dente_clinic_token", "live-inquisition-clinic-token");
      localStorage.setItem("dente_staff_token", "live-inquisition-staff-token");
      localStorage.setItem("dente_active_role", "owner");
      localStorage.setItem("dente_theme_mode", "light");
      localStorage.setItem("dente_active_patient_id", "pat-1");
      localStorage.setItem("dente_tour_completed", "true");
      localStorage.setItem("dente_onboarding_completed", "true");
      localStorage.setItem("dente_coach_dismissed", "true");
      localStorage.setItem("dental-crm:onboarding:v1", JSON.stringify({ dismissed: true, step: "done", completed: true }));
    });

    const page = await ctx.newPage();

    page.on("pageerror", (err) => console.error("[BROWSER ERROR]:", err.message));
    page.on("console", (msg) => {
      if (msg.type() === "error") console.error("[BROWSER CONSOLE ERROR]:", msg.text());
    });

    await page.route("**/api/**", async (route) => {
      const url = route.request().url();
      let pathname = "";
      try { pathname = new URL(url).pathname; } catch {}
      if (
        pathname.startsWith("/src/") ||
        pathname.startsWith("/@") ||
        pathname.includes("node_modules") ||
        url.endsWith(".ts") ||
        url.endsWith(".tsx") ||
        url.endsWith(".js") ||
        url.endsWith(".mjs")
      ) {
        return route.continue();
      }
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
      if (url.includes("/api/patients")) return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(mockDashboard.patients) });
      if (url.includes("/api/imaging/studies")) {
        return route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify(mockDashboard.imagingStudies),
        });
      }
      return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ ok: true }) });
    });

    console.log("Navigating to http://127.0.0.1:5173/#imaging...");
    await page.goto("http://127.0.0.1:5173/#imaging", { waitUntil: "domcontentloaded", timeout: 10000 });
    await wait(1500);

    console.log("Locating 'КЛКТ Студия 3D' button...");
    const openMprBtn = page.locator("[data-testid='imaging-open-3d-mpr']");
    await openMprBtn.waitFor({ state: "visible", timeout: 10000 });
    await openMprBtn.click({ force: true });

    const modal = page.locator("[data-testid='cbct-studio-modal']");
    await modal.waitFor({ state: "visible", timeout: 10000 });
    console.log("CBCT Studio modal opened!");

    // Switch to Implant tab
    console.log("Switching to Implant Studio tab...");
    const implantTab = page.locator("[data-testid='cbct-nav-tab-implant']");
    await implantTab.click({ force: true });
    await wait(800);

    // Verify all 5 export buttons are present
    console.log("Verifying all 5 export buttons in toolbar...");
    await page.locator('[data-testid="cbct-btn-export-emr"]').waitFor({ state: "visible", timeout: 5000 });
    await page.locator('[data-testid="cbct-btn-copy-clipboard"]').waitFor({ state: "visible", timeout: 5000 });
    await page.locator('[data-testid="cbct-header-add-finance-btn"]').waitFor({ state: "visible", timeout: 5000 });
    await page.locator('[data-testid="cbct-btn-export-plan"]').waitFor({ state: "visible", timeout: 5000 });
    await page.locator('[data-testid="cbct-btn-export-lab"]').waitFor({ state: "visible", timeout: 5000 });
    console.log("Verified: All 5 export buttons are visible in header toolbar!");

    // 1. Proof: Header toolbar with all 5 buttons (Light theme)
    await applyTheme(page, "light");
    await take(page, "proof_cbct_01_toolbar_5buttons_light.png");

    // 2. Proof: Header toolbar with all 5 buttons (Dark theme)
    await applyTheme(page, "dark");
    await take(page, "proof_cbct_01_toolbar_5buttons_dark.png");

    // 3. Proof: Click "+ Смета" (adds implant + sinus-lift + CBCT to visit finance)
    console.log("Clicking '+ Смета' button...");
    const addFinanceBtn = page.locator('[data-testid="cbct-header-add-finance-btn"]');
    await addFinanceBtn.click({ force: true });
    await wait(600);
    await take(page, "proof_cbct_02_visit_finance_toast_dark.png");

    // 4. Proof: Click "В план лечения" (creates surgical stage with attached slice)
    console.log("Clicking 'В план лечения' button...");
    const exportPlanBtn = page.locator('[data-testid="cbct-btn-export-plan"]');
    await exportPlanBtn.click({ force: true });
    await wait(600);
    await take(page, "proof_cbct_03_treatment_plan_transfer_dark.png");

    // 5. Proof: Click "В ЗТЛ" (opens prefilled DentalLabOrderModal for surgical guide)
    console.log("Clicking 'В ЗТЛ' button...");
    const exportLabBtn = page.locator('[data-testid="cbct-btn-export-lab"]');
    await exportLabBtn.click({ force: true });
    await wait(1000);

    const labModal = page.locator('[role="dialog"][aria-labelledby="dental-lab-modal-title"], [data-testid="lab-order-apply-defaults-btn"], [data-testid="dental-lab-order-modal"]').first();
    await labModal.waitFor({ state: "visible", timeout: 8000 });
    console.log("DentalLabOrderModal opened with surgical guide draft!");
    await take(page, "proof_cbct_04_ztl_surgical_guide_modal_dark.png");

    await applyTheme(page, "light");
    await take(page, "proof_cbct_04_ztl_surgical_guide_modal_light.png");

    // Close lab order modal via Cancel button
    console.log("Closing lab order modal via Cancel button...");
    const cancelBtn = page.locator("button:has-text('Отмена')").first();
    await cancelBtn.click({ force: true });
    await page.locator('[role="dialog"][aria-labelledby="dental-lab-modal-title"]').waitFor({ state: "detached", timeout: 5000 });
    await wait(500);

    // 6. Proof: Click "В ЭМК" (saves Form 043/u diary + 300 DPI slice)
    console.log("Clicking 'В ЭМК' button...");
    const exportEmrBtn = page.locator('[data-testid="cbct-btn-export-emr"]');
    await exportEmrBtn.click({ force: true });
    await wait(800);
    await take(page, "proof_cbct_05_emr_saved_light.png");

    console.log("\nALL 5-BUTTON SEAMLESS AUTOTRANSFER PROOFS CAPTURED SUCCESSFULLY!");
    clearTimeout(killTimer);
  } finally {
    if (browser) {
      await browser.close().catch(() => {});
    }
  }
}

main().catch((err) => {
  console.error("FATAL ERROR in capture:", err);
  process.exit(1);
});
