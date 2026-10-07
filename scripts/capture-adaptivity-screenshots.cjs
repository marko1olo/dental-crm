const { chromium } = require("playwright");
const path = require("node:path");
const fs = require("node:fs");
const crypto = require("node:crypto");

const wait = (ms) => new Promise((r) => setTimeout(r, ms));

const ARTIFACTS_DIR = "C:\\Users\\Admin\\.gemini\\antigravity\\brain\\4dcca339-e2dd-409b-9408-c7f7a8f8895c";
const DOCS_DIR = path.resolve(__dirname, "../docs/screenshots/inquisition_live");

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
        color: "#0d9488",
        active: true,
      },
      {
        id: "doc-2",
        organizationId: "00000000-0000-0000-0000-000000000001",
        fullName: "Д-р Смирнова Мария Игоревна",
        role: "doctor",
        color: "#2563eb",
        active: true,
      },
    ],
    chairs: [
      { id: "ch-1", name: "Кабинет 1 (Терапия)", active: true },
      { id: "ch-2", name: "Кабинет 2 (Хирургия/Имплантация)", active: true },
    ],
  },
  todayAppointments: [
    {
      id: "apt-1",
      patientId: "pat-1",
      doctorId: "doc-1",
      chairId: "ch-1",
      startAt: `${todayDate}T09:00:00.000Z`,
      endAt: `${todayDate}T10:00:00.000Z`,
      status: "in_progress",
      statusLabel: "На приеме",
      durationMinutes: 60,
      serviceTitle: "Первичная консультация + профгигиена",
      patientName: "Смирнова Елена Васильевна",
      doctorName: "Д-р Воронов А.В.",
    },
    {
      id: "apt-2",
      patientId: "pat-2",
      doctorId: "doc-1",
      chairId: "ch-2",
      startAt: `${todayDate}T11:00:00.000Z`,
      endAt: `${todayDate}T12:00:00.000Z`,
      status: "confirmed",
      statusLabel: "Подтвержден",
      durationMinutes: 60,
      serviceTitle: "Установка имплантата Straumann (3.6)",
      patientName: "Кузнецов Игорь Николаевич",
      doctorName: "Д-р Воронов А.В.",
    },
  ],
  appointmentReadiness: [],
  scheduleSuggestions: [],
  activeVisit: null,
  visitCloseChecklist: {
    visitId: "v-none",
    readyToSign: false,
    score: 0,
    nextAction: "none",
    blockingItems: 0,
    items: [],
  },
  documents: [],
  imagingStudies: [],
  protocolTemplates: [],
  serviceCatalog: [],
  treatmentPlanItems: [],
  treatmentPlanScenarios: [],
  clinicalRules: [],
  clinicalRuleEvaluations: [],
  clinicalRuleSummary: {
    activeRules: 0,
    evaluatedRules: 0,
    unresolved: 0,
    blockers: 0,
    warnings: 0,
    requiredServices: 0,
    coveredRules: 0,
  },
  payments: [],
};

async function setupPageRoutes(page) {
  await page.route("**/api/**", async (route) => {
    const url = route.request().url();
    if (url.includes("/src/")) return route.continue();

    if (url.includes("/api/dashboard")) {
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(mockDashboard),
      });
    }
    if (url.includes("/api/auth/user/me") || url.includes("/api/auth/session")) {
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
    if (url.includes("/api/auth/staff/unlock")) {
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          success: true,
          token: "live-inquisition-staff-token",
          user: {
            id: "doc-1",
            fullName: "Д-р Воронов Алексей Владимирович",
            role: "owner",
          },
        }),
      });
    }
    return route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(url.includes("list") || url.includes("status") ? [] : {}),
    });
  });
}

async function captureScenario(browser, name, initProps) {
  const targetPath = path.join(ARTIFACTS_DIR, name);
  const docsPath = path.join(DOCS_DIR, name);

  console.log(`Setting up scenario for ${name}...`);

  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    deviceScaleFactor: 2,
  });

  await context.addInitScript((props) => {
    localStorage.setItem("dente_clinic_token", "live-clinic-token");
    localStorage.setItem("dente_staff_token", "live-staff-token");
    localStorage.setItem("dente_active_role", "owner");
    localStorage.setItem("dente_theme_mode", props.theme);
    localStorage.setItem("dente_tour_completed", "true");
    localStorage.setItem("dente_guide_tour_dismissed_v2", "true");
    localStorage.setItem("dente_guide_tour_seen_roles_v2", JSON.stringify(["admin", "doctor", "director"]));
    localStorage.setItem("dente_quest_progress_v2", JSON.stringify({
      activeTrackId: "solo_doctor",
      currentStepIndex: 0,
      completedStepIds: ["schedule_1click", "odontogram_formula", "visit_diary_043", "cashier_receipt"],
      isTourActive: false,
      isDismissedPermanently: true,
      tracksProgress: {
        solo_doctor: { completed: true, completedStepIds: ["schedule_1click", "odontogram_formula", "visit_diary_043", "cashier_receipt"] },
        reception_admin: { completed: true, completedStepIds: [] },
        imaging_diagnostics: { completed: true, completedStepIds: [] }
      }
    }));
    localStorage.setItem("dente_ui_preferences_v1", JSON.stringify({ onboardingDismissed: true, onboardingStep: "done", version: 1 }));
    localStorage.setItem("dental-crm:onboarding:v1", JSON.stringify({ dismissed: true, step: "done", completed: true, onboardingDismissed: true, onboardingStep: "done", version: 1 }));
    localStorage.setItem("dente-workspace-profile", JSON.stringify({
      state: {
        clinicName: "Стоматология ДЕНТЕ Премиум",
        currentDoctor: { id: "doc-1", fullName: "Д-р Воронов А. В.", role: "owner" },
        flags: { disableTour: true },
      },
    }));

    // Only set localStorage in addInitScript (document.documentElement is null here)
  }, initProps);

  const page = await context.newPage();
  await setupPageRoutes(page);

  await page.goto("http://127.0.0.1:5173/#schedule", { waitUntil: "domcontentloaded", timeout: 60000 });
  await page.waitForSelector(".boot-state", { state: "detached", timeout: 60000 });
  await page.waitForSelector(".app-shell", { state: "visible", timeout: 30000 });
  await page.waitForSelector(".schedule-filter-strip", { state: "visible", timeout: 30000 });
  await wait(2000);

  // Apply DOM attributes safely inside page.evaluate when DOM is guaranteed to exist
  await page.evaluate((props) => {
    const doc = document.documentElement;
    doc.setAttribute("data-theme", props.theme);
    if (props.theme === "dark") {
      doc.classList.add("dark");
      doc.classList.remove("light");
    } else {
      doc.classList.add("light");
      doc.classList.remove("dark");
    }
    doc.style.colorScheme = props.theme;
    doc.setAttribute("data-hardware-tier", props.tier);
    doc.setAttribute("data-perf-tier", props.tier);
    doc.setAttribute("data-perf-state", props.perfState);
    doc.setAttribute("data-ct-active", props.ctActive ? "true" : "false");
    if (props.tier === "potato" || props.tier === "low") {
      doc.setAttribute("data-low-spec", "true");
      doc.setAttribute("data-perf", "low");
      doc.classList.add("low-spec-mode", "low-spec-perf");
    } else {
      doc.removeAttribute("data-low-spec");
      doc.setAttribute("data-perf", props.tier);
      doc.classList.remove("low-spec-mode", "low-spec-perf");
    }
    if (props.blurDisabled) {
      doc.setAttribute("data-blur-disabled", "true");
    }
  }, initProps);

  await wait(2000);
  await page.waitForSelector(".schedule-filter-strip", { state: "visible", timeout: 15000 });

  if (fs.existsSync(targetPath)) {
    try { fs.unlinkSync(targetPath); } catch (_e) {}
  }

  await page.screenshot({ path: targetPath, fullPage: false, timeout: 20000 });

  if (fs.existsSync(DOCS_DIR)) {
    try { fs.copyFileSync(targetPath, docsPath); } catch (_e) {}
  }

  const content = fs.readFileSync(targetPath);
  const hash = crypto.createHash("md5").update(content).digest("hex");
  const sizeKb = (content.length / 1024).toFixed(1);
  console.log(`[CAPTURED] ${name} | Size: ${content.length} bytes (${sizeKb} KB) | MD5: ${hash}`);

  await context.close();
  return { name, path: targetPath, size: content.length, hash, sizeKb };
}

async function main() {
  console.log("Starting Red Team Adaptivity Screenshot Suite against http://127.0.0.1:5173...");

  if (!fs.existsSync(ARTIFACTS_DIR)) {
    fs.mkdirSync(ARTIFACTS_DIR, { recursive: true });
  }
  if (!fs.existsSync(DOCS_DIR)) {
    fs.mkdirSync(DOCS_DIR, { recursive: true });
  }

  const browser = await chromium.launch({
    channel: "msedge",
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });

  try {
    const results = [];

    // 2. Potato Tier (PC Dark)
    results.push(await captureScenario(browser, "proof_potato_dark_1440x900.png", {
      theme: "dark",
      tier: "potato",
      perfState: "degraded",
      ctActive: false,
    }));

    console.log("\n=========================================");
    console.log("CAPTURE RUN COMPLETE. SUMMARY:");
    console.log("=========================================");
    for (const r of results) {
      console.log(`- ${r.name}: ${r.size} bytes (${r.sizeKb} KB) | MD5: ${r.hash}`);
    }
    console.log("=========================================");
  } finally {
    await browser.close();
  }
}

main().catch((err) => {
  console.error("Capture failure:", err);
  process.exit(1);
});
