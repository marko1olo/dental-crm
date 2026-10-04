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
  patients: [
    {
      id: "pat-1",
      organizationId: "00000000-0000-0000-0000-000000000001",
      fullName: "Ковалёв Роман Станиславович",
      status: "active",
      birthDate: "1988-04-12",
      phone: "+7 (999) 888-77-66",
      notes: "Первичный осмотр. Санация полости рта.",
      allergies: ["Лидокаин (анамнестически)"],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
  ],
  appointments: [
    {
      id: "app-1",
      patientId: "pat-1",
      doctorId: "doc-1",
      chairId: "chair-1",
      date: todayDate,
      startTime: "10:00",
      endTime: "11:00",
      status: "in_progress",
    },
  ],
  documents: [
    {
      id: "doc-record-1",
      organizationId: "00000000-0000-0000-0000-000000000001",
      patientId: "pat-1",
      kind: "paid_medical_services_contract",
      title: "Договор на оказание платных медицинских услуг №Д-2026/04-01",
      status: "issued",
      documentNumber: "Д-2026/04-01",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      issuedAt: new Date().toISOString(),
      signatureType: "eds",
      metadata: { totalAmountRub: 14500 },
    },
    {
      id: "doc-record-2",
      organizationId: "00000000-0000-0000-0000-000000000001",
      patientId: "pat-1",
      kind: "informed_consent",
      title: "Информированное добровольное согласие на терапевтическое лечение",
      status: "issued",
      documentNumber: "ИДС-2026/04-02",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      issuedAt: new Date().toISOString(),
      signatureType: "paper",
      metadata: {},
    },
    {
      id: "doc-record-3",
      organizationId: "00000000-0000-0000-0000-000000000001",
      patientId: "pat-1",
      kind: "completed_works_act",
      title: "Акт выполненных работ (по приказу МЗ РФ 804н)",
      status: "draft",
      documentNumber: "АКТ-2026/04-03",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      metadata: { totalAmountRub: 8200 },
    },
    {
      id: "doc-record-4",
      organizationId: "00000000-0000-0000-0000-000000000001",
      patientId: "pat-1",
      kind: "tax_deduction_certificate",
      title: "Справка об оплате медицинских услуг для налогового вычета (ФНС)",
      status: "draft",
      documentNumber: "ФНС-2026/04-04",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      metadata: { paidAmountRub: 14500 },
    },
  ],
};

const mockInventoryItems = [
  {
    id: "inv-1",
    name: "Артикаин с адреналином 1:100 000 (уп. 50 карпул)",
    sku: "ART-100",
    barcode: "4601234567890",
    category: "Анестезия",
    unit: "карпула",
    stockQuantity: 42,
    criticalThreshold: 10,
    unitCostRub: "120.00",
    lotNumber: "LOT-2026A",
    expirationDate: "2027-12-31",
  },
  {
    id: "inv-2",
    name: "Filtek Z250 Universal (шприц 4г, оттенок A2)",
    sku: "FLT-Z250-A2",
    barcode: "4601234567891",
    category: "Композиты",
    unit: "шприц",
    stockQuantity: 15,
    criticalThreshold: 5,
    unitCostRub: "3200.00",
    lotNumber: "LOT-2026B",
    expirationDate: "2028-06-30",
  },
  {
    id: "inv-3",
    name: "Перчатки нитриловые неопудренные (размер M, уп. 100 шт)",
    sku: "GLV-NIT-M",
    barcode: "4601234567892",
    category: "Расходные материалы",
    unit: "уп.",
    stockQuantity: 8,
    criticalThreshold: 10,
    unitCostRub: "650.00",
    lotNumber: "LOT-2026C",
    expirationDate: "2029-01-01",
  },
  {
    id: "inv-4",
    name: "Коллагеновая мембрана Bio-Gide 25x25мм",
    sku: "BIO-GIDE-25",
    barcode: "4601234567893",
    category: "Хирургия",
    unit: "шт.",
    stockQuantity: 3,
    criticalThreshold: 2,
    unitCostRub: "14800.00",
    lotNumber: "LOT-2026D",
    expirationDate: "2027-09-15",
  },
  {
    id: "inv-5",
    name: "Гуттаперчевые штифты конусность 02/25 (уп. 120 шт)",
    sku: "GUT-02-25",
    barcode: "4601234567894",
    category: "Эндодонтия",
    unit: "уп.",
    stockQuantity: 20,
    criticalThreshold: 5,
    unitCostRub: "850.00",
    lotNumber: "LOT-2026E",
    expirationDate: "2028-11-20",
  },
  {
    id: "inv-6",
    name: "Набор полировочных дисков Sof-Lex (240 шт)",
    sku: "SOF-LEX-240",
    barcode: "4601234567895",
    category: "Терапия",
    unit: "набор",
    stockQuantity: 5,
    criticalThreshold: 3,
    unitCostRub: "4900.00",
    lotNumber: "LOT-2026F",
    expirationDate: "2028-03-31",
  },
];

async function run() {
  const outDir = path.resolve("docs/screenshots/inquisition_live");
  if (!fs.existsSync(outDir)) {
    fs.mkdirSync(outDir, { recursive: true });
  }

  console.log("[Playwright] Launching browser (channel: msedge)...");
  const browser = await chromium.launch({
    channel: "msedge",
    headless: true,
  });

  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    deviceScaleFactor: 1,
  });

  context.addInitScript(() => {
    localStorage.setItem("dente_clinic_token", "live-inquisition-clinic-token");
    localStorage.setItem("dente_staff_token", "live-inquisition-staff-token");
    localStorage.setItem("dente_active_role", "owner");
    localStorage.setItem("dente_theme_mode", "light");
    localStorage.setItem("dente_onboarding_completed", "true");
    localStorage.setItem("dente_tour_completed", "true");
    localStorage.setItem("dente_tour_dismissed", "true");
    localStorage.setItem(
      "dente_ui_preferences_v1",
      JSON.stringify({
        fontSize: "standard",
        accentColor: "teal",
        highContrast: false,
        theme: "light",
      })
    );
  });

  const page = await context.newPage();

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
        body: JSON.stringify({ success: true, token: "live-staff-token", user: { id: "doc-1", fullName: "Д-р Воронов Алексей Владимирович", role: "owner" } }),
      });
    }
    if (url.includes("/api/documents")) {
      return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(mockDashboard.documents) });
    }
    if (url.includes("/api/inventory")) {
      return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(mockInventoryItems) });
    }
    if (url.includes("/api/schedule")) {
      return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(mockDashboard.appointments || []) });
    }
    if (url.includes("/api/patients")) {
      return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(mockDashboard.patients || []) });
    }
    return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(url.includes("list") || url.includes("status") ? [] : {}) });
  });

  async function applyTheme(p, theme) {
    await p.evaluate((th) => {
      localStorage.setItem("dente_theme_mode", th);
      if (window.__useThemeStore) {
        window.__useThemeStore.getState().setThemeMode(th);
      }
      document.documentElement.setAttribute("data-theme", th);
      const isDark = ["dark", "night", "ocean", "emerald", "cyber_xray"].includes(th);
      document.documentElement.classList.toggle("dark", isDark);
      document.documentElement.classList.toggle("light", !isDark);
      document.documentElement.style.colorScheme = isDark ? "dark" : "light";
    }, theme);
    await p.waitForTimeout(800);
  }

  // Navigate to root first and ensure app boots completely
  console.log("\n[Boot] Navigating to root app...");
  await page.goto("http://127.0.0.1:5173/", { waitUntil: "domcontentloaded", timeout: 60000 });
  await page.waitForSelector(".boot-state", { state: "detached", timeout: 60000 });
  await page.waitForSelector(".app-shell", { state: "visible", timeout: 30000 });
  await page.waitForTimeout(1000);

  // 1. CAPTURE DOCUMENTS MODULE
  console.log("\n[1/2] Switching to Documents module...");
  const docNavBtn = page.locator("button:has-text('Документы'), a:has-text('Документы')").first();
  await docNavBtn.click();
  await page.waitForSelector(".document-registry-filter-bar, [data-testid='filter-kind-all'], .document-nav-tabs", { state: "visible", timeout: 20000 });
  await page.waitForTimeout(1000);

  const filterBar = page.locator(".document-registry-filter-bar, [data-testid='filter-kind-all']").first();
  await filterBar.scrollIntoViewIfNeeded();
  await page.waitForTimeout(600);

  // Light Documents
  console.log("Capturing Documents Light (proof_documents_buttons_tactile_light.png)...");
  await applyTheme(page, "light");
  await filterBar.scrollIntoViewIfNeeded();
  await page.waitForTimeout(800);
  const docLightPath = path.join(outDir, "proof_documents_buttons_tactile_light.png");
  await page.screenshot({ path: docLightPath, fullPage: false });
  console.log(`[Captured] ${docLightPath} (${fs.statSync(docLightPath).size} bytes)`);

  // Dark Documents
  console.log("Capturing Documents Dark (proof_documents_buttons_tactile_dark.png)...");
  await applyTheme(page, "dark");
  await filterBar.scrollIntoViewIfNeeded();
  await page.waitForTimeout(800);
  const docDarkPath = path.join(outDir, "proof_documents_buttons_tactile_dark.png");
  await page.screenshot({ path: docDarkPath, fullPage: false });
  console.log(`[Captured] ${docDarkPath} (${fs.statSync(docDarkPath).size} bytes)`);

  // 2. CAPTURE INVENTORY MODULE
  console.log("\n[2/2] Switching to Inventory module...");
  const invNavBtn = page.locator("button:has-text('Склад'), a:has-text('Склад')").first();
  await invNavBtn.click();
  await page.waitForSelector("[data-testid='tab-inventory-items'], [data-testid='inventory-category-filters-row']", { state: "visible", timeout: 20000 });
  await page.waitForTimeout(1000);

  // Dark Inventory
  console.log("Capturing Inventory Dark (proof_inventory_buttons_tactile_dark.png)...");
  await applyTheme(page, "dark");
  await page.waitForTimeout(800);
  const invDarkPath = path.join(outDir, "proof_inventory_buttons_tactile_dark.png");
  await page.screenshot({ path: invDarkPath, fullPage: false });
  console.log(`[Captured] ${invDarkPath} (${fs.statSync(invDarkPath).size} bytes)`);

  // Light Inventory
  console.log("Capturing Inventory Light (proof_inventory_buttons_tactile_light.png)...");
  await applyTheme(page, "light");
  await page.waitForTimeout(800);
  const invLightPath = path.join(outDir, "proof_inventory_buttons_tactile_light.png");
  await page.screenshot({ path: invLightPath, fullPage: false });
  console.log(`[Captured] ${invLightPath} (${fs.statSync(invLightPath).size} bytes)`);

  await browser.close();
  console.log("\n[Success] All tactile button proofs captured successfully!");
}

run().catch((err) => {
  console.error("Capture failed:", err);
  process.exit(1);
});
