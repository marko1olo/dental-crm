/**
 * scripts/capture_leads_funnel_proof_screenshots.cjs
 * RED TEAM INQUISITION: 4-State Visual Proof for Leads & Funnel Kanban
 * PC Light (1440x900), PC Dark (1440x900), Mobile Light (390x844), Mobile Dark (390x844).
 */
const { chromium } = require("playwright");
const path = require("node:path");
const fs = require("node:fs");

const outDirs = [
  path.resolve(__dirname, "../docs/screenshots"),
  path.resolve(__dirname, "../screenshots"),
];

for (const dir of outDirs) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

const mockLeads = [
  {
    id: "lead-001",
    name: "Белова Марина Сергеевна",
    phone: "+7 (916) 440-18-92",
    source: "Яндекс.Директ",
    status: "new",
    expectedRevenue: "145000",
    notes: "Консультация по имплантации в области 36, 37 зубов, есть КЛКТ",
    clinicalTags: ["Имплантация", "КЛКТ"],
    createdAt: new Date(Date.now() - 10 * 60 * 1000).toISOString(),
  },
  {
    id: "lead-002",
    name: "Ковалёв Денис Игоревич",
    phone: "+7 (925) 712-30-45",
    source: "2ГИС",
    status: "new",
    expectedRevenue: "18500",
    notes: "Чувствительность на холодное, зуб 25, просит окно на вечер",
    clinicalTags: ["Терапия"],
    createdAt: new Date(Date.now() - 45 * 60 * 1000).toISOString(),
  },
  {
    id: "lead-003",
    name: "Романова Алина Викторовна",
    phone: "+7 (903) 558-91-14",
    source: "ПроДокторов",
    status: "contacted",
    expectedRevenue: "220000",
    notes: "Эстетическая реабилитация (виниры E.max в зоне улыбки), согласует дату",
    clinicalTags: ["Ортопедия E.max"],
    createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
    existingPatient: {
      id: "pat-rom",
      fullName: "Романова Алина Викторовна",
    },
  },
  {
    id: "lead-004",
    name: "Ларионова Ольга Николаевна",
    phone: "+7 (915) 882-09-33",
    source: "Рекомендации",
    status: "consult_booked",
    expectedRevenue: "180000",
    notes: "Записана к д-ру Воронову А. В. на комплексную консультацию и фотопротокол",
    clinicalTags: ["Тотальное протезирование"],
    createdAt: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: "lead-005",
    name: "Сафонов Тимур Русланович",
    phone: "+7 (926) 619-42-80",
    source: "Яндекс.Директ",
    status: "consult_booked",
    expectedRevenue: "95000",
    notes: "Консультация ортодонта (элайнеры), направлен на ОПТГ",
    clinicalTags: ["Ортодонтия"],
    createdAt: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: "lead-006",
    name: "Крылова Екатерина Дмитриевна",
    phone: "+7 (905) 231-64-19",
    source: "ПроДокторов",
    status: "showed_up",
    expectedRevenue: "310000",
    notes: "План лечения согласован (2 имплантата Straumann + коронки ZrO2), внесён аванс",
    clinicalTags: ["Имплантация", "План согласован"],
    createdAt: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: "lead-007",
    name: "Мельников Артём Олегович",
    phone: "+7 (916) 904-11-58",
    source: "2ГИС",
    status: "showed_up",
    expectedRevenue: "28500",
    notes: "Проведена профгигиена AirFlow и лечение кариеса 16 зуба",
    clinicalTags: ["Санация"],
    createdAt: new Date(Date.now() - 30 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: "lead-008",
    name: "Григорьев Сергей Михайлович",
    phone: "+7 (903) 777-88-99",
    source: "2ГИС",
    status: "trash",
    expectedRevenue: "25000",
    notes: "Отказ: искал поликлинику с бесплатным удалением по ОМС",
    dropReason: "Нецелевой / ОМС",
    clinicalTags: ["Консультация"],
    createdAt: new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString(),
  },
];

const mockDashboard = {
  clinicName: "Стоматология ДЕНТЕ Премиум",
  todayIso: new Date().toLocaleDateString("en-CA"),
  clinicSettings: {
    profile: {
      id: "c-1",
      organizationId: "00000000-0000-0000-0000-000000000001",
      clinicName: "Стоматология ДЕНТЕ Премиум",
      mode: "small_clinic",
      inn: "7701234567",
      address: "Москва, Столярный переулок, 14",
      phone: "+7 (495) 123-45-67",
    },
    staff: [
      {
        id: "doc-1",
        fullName: "Д-р Воронов Алексей Владимирович",
        role: "owner",
        active: true,
      },
    ],
    chairs: [
      { id: "chair-1", name: "Кабинет 1 (Терапия/Хирургия)" },
    ],
  },
  patients: [],
  leads: mockLeads,
};

const setupPageMocksAndStorage = async (page) => {
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
    if (url.includes("/api/leads")) {
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(mockLeads),
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
          token: "live-token",
          user: { id: "doc-1", fullName: "Д-р Воронов Алексей Владимирович", role: "owner" },
        }),
      });
    }
    return route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({}),
    });
  });

  await page.addInitScript(() => {
    localStorage.setItem("dente_clinic_token", "live-token");
    localStorage.setItem("dente_staff_token", "live-token");
    localStorage.setItem("dente_user_id", "doc-1");
    localStorage.setItem("dente_demo_showcase", "true");
    localStorage.setItem("dente_onboarding_completed", "true");
    localStorage.setItem("dente_tour_completed", "true");
    localStorage.setItem("dente_tour_dismissed", "true");
    localStorage.setItem("dente_sidebar_collapsed", "false");
    localStorage.setItem(
      "dental-crm:web-ui-preferences:v1",
      JSON.stringify({
        version: 1,
        uiLanguage: "ru",
        selectedWorkspaceRole: "owner",
        onboardingDismissed: true,
        onboardingStep: "done",
      })
    );
    localStorage.setItem(
      "dental-crm:onboarding:v1",
      JSON.stringify({
        onboardingDismissed: true,
        onboardingStep: "done",
      })
    );
  });
};

async function applyTheme(page, theme) {
  await page.evaluate((t) => {
    document.documentElement.setAttribute("data-theme", t);
    const isDark = t === "dark";
    document.documentElement.classList.toggle("dark", isDark);
    document.documentElement.classList.toggle("light", !isDark);
    document.documentElement.style.colorScheme = isDark ? "dark" : "light";
    window.scrollTo(0, 0);
    document.querySelectorAll(".leads-kanban-column, .leads-kanban-board, .leads-kanban-column-cards").forEach((el) => {
      el.scrollTop = 0;
    });
  }, theme);
  await page.waitForTimeout(600);
}

async function saveShot(page, filename) {
  const primaryPath = path.join(outDirs[0], filename);
  await page.screenshot({ path: primaryPath, fullPage: false, animations: "disabled" });
  for (let i = 1; i < outDirs.length; i++) {
    fs.copyFileSync(primaryPath, path.join(outDirs[i], filename));
  }
  console.log(`[PROOF SAVED]: ${filename}`);
}

async function main() {
  console.log(">>> Launching Chromium for Leads 4-State Proof...");

  const browser = await chromium.launch({
    headless: true,
    executablePath: "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });

  // ================= 1. PC CONTEXT (1440x900) =================
  console.log(">>> 1. Creating PC Context (1440x900)...");
  const pcContext = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    deviceScaleFactor: 1,
  });
  const pcPage = await pcContext.newPage();
  await setupPageMocksAndStorage(pcPage);

  console.log("Navigating PC to http://127.0.0.1:5173/?demo=true#leads...");
  await pcPage.goto("http://127.0.0.1:5173/?demo=true#leads", {
    waitUntil: "domcontentloaded",
    timeout: 30000,
  });

  await pcPage.waitForSelector("#boot-splash, .boot-state, .boot-container", {
    state: "detached",
    timeout: 25000,
  }).catch(() => {});

  await pcPage.waitForSelector(".leads-kanban-board, .leads-view, [data-testid='leads-kanban']", {
    state: "visible",
    timeout: 25000,
  });

  try {
    const dismissBtn = pcPage
      .locator(
        'button:has-text("Больше не показывать"), button:has-text("Пропустить"), [aria-label="Закрыть тур"], button:has-text("Понятно")'
      )
      .first();
    if ((await dismissBtn.count()) > 0 && (await dismissBtn.isVisible())) {
      await dismissBtn.click({ force: true });
      await pcPage.waitForTimeout(500);
    }
  } catch (_) {}

  await pcPage.waitForTimeout(1000);

  // 1. PC Light
  await applyTheme(pcPage, "light");
  await saveShot(pcPage, "leads_funnel_pc_light_1440x900.png");

  // 2. PC Dark
  await applyTheme(pcPage, "dark");
  await saveShot(pcPage, "leads_funnel_pc_dark_1440x900.png");

  await pcContext.close();

  // ================= 2. MOBILE CONTEXT (390x844) =================
  console.log("\n>>> 2. Creating Mobile Context (390x844)...");
  const mobileContext = await browser.newContext({
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 2,
    isMobile: true,
    hasTouch: true,
  });
  const mobilePage = await mobileContext.newPage();
  await setupPageMocksAndStorage(mobilePage);

  console.log("Navigating Mobile to http://127.0.0.1:5173/?demo=true#leads...");
  await mobilePage.goto("http://127.0.0.1:5173/?demo=true#leads", {
    waitUntil: "domcontentloaded",
    timeout: 30000,
  });

  await mobilePage.waitForSelector("#boot-splash, .boot-state, .boot-container", {
    state: "detached",
    timeout: 25000,
  }).catch(() => {});

  await mobilePage.waitForSelector(".leads-mobile-feed, .leads-view, .leads-kanban-board", {
    state: "visible",
    timeout: 25000,
  });

  try {
    const dismissBtn = mobilePage
      .locator(
        'button:has-text("Больше не показывать"), button:has-text("Пропустить"), [aria-label="Закрыть тур"], button:has-text("Понятно")'
      )
      .first();
    if ((await dismissBtn.count()) > 0 && (await dismissBtn.isVisible())) {
      await dismissBtn.click({ force: true });
      await mobilePage.waitForTimeout(500);
    }
  } catch (_) {}

  await mobilePage.waitForTimeout(1000);

  // 3. Mobile Light
  await applyTheme(mobilePage, "light");
  await saveShot(mobilePage, "leads_funnel_mobile_light_390x844.png");

  // 4. Mobile Dark
  await applyTheme(mobilePage, "dark");
  await saveShot(mobilePage, "leads_funnel_mobile_dark_390x844.png");

  await mobileContext.close();
  await browser.close();
  console.log("\n>>> All 4 Red Team proofs captured successfully!");
}

main().catch((err) => {
  console.error("FATAL ERROR in visual proof:", err);
  process.exit(1);
});
