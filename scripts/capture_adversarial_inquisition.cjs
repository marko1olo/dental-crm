/**
 * scripts/capture_adversarial_inquisition.cjs
 * Adversarial Victory Auditor & Visual Inquisitor Capture Suite
 * Captures the 5 mandatory target domains in PC Light & PC Dark (1440x900, scale 2):
 * 1. Treatment Plans (3-tier comparison: Эконом, Оптимум, Премиум)
 * 2. Radiology & DICOM Viewer (>70% canvas, single-row toolbar, ruler, CLAHE)
 * 3. Dental Lab 32px registry & chairside panel
 * 4. Leads Kanban 4 columns (Новые, Квалифицированные, Консультация, Дошли)
 * 5. Telephony incoming call Quiet UI badge
 */

const { chromium } = require("playwright");
const path = require("node:path");
const fs = require("node:fs");
const crypto = require("node:crypto");

const BRAIN_DIR = "C:/Users/Admin/.gemini/antigravity/brain/8d311a84-53a7-4f02-b99a-14ab30dccf20/screenshots";
const DOCS_DIR = "C:/Clinic_MVP/dental-crm/docs/screenshots/adversarial_audit";

for (const d of [BRAIN_DIR, DOCS_DIR]) {
  if (!fs.existsSync(d)) {
    fs.mkdirSync(d, { recursive: true });
  }
}

const browserPath = [
  "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
  "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
  "C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe",
].find((p) => fs.existsSync(p));

if (!browserPath) {
  console.error("Browser executable not found!");
  process.exit(1);
}

const todayDate = new Date().toISOString().slice(0, 10);

const mockDashboard = {
  clinicSettings: {
    profile: {
      organizationId: "00000000-0000-0000-0000-000000000001",
      clinicName: "Стоматология ДЕНТЕ Премиум",
      timezone: "Europe/Moscow",
      phone: "+7 (495) 123-45-67",
      address: "Москва, Столярный переулок, 14",
      inn: "7701234567",
      mode: "small_clinic",
      defaultVisitMinutes: 45,
      scheduleDefaults: {
        workingDays: [1, 2, 3, 4, 5, 6],
        workdayStart: "08:00",
        workdayEnd: "21:00",
        appointmentBufferMinutes: 10,
      },
      updatedAt: new Date().toISOString(),
    },
    chairs: [
      {
        id: "chair-1",
        organizationId: "00000000-0000-0000-0000-000000000001",
        name: "Кабинет 1 (Терапия)",
        active: true,
        notes: null,
        room: "1",
        hasXraySensor: true,
        hasMicroscope: true,
        hasSurgeryKit: false,
      },
    ],
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
    integrationPresets: [],
    workspaceProfiles: [],
    roleAccessPolicies: [],
    modeHints: [],
    soloDoctorMode: false,
  },
  shiftIntelligence: {
    modeFit: { mode: "small_clinic", title: "Оптимальный режим", fitScore: 100 },
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
      notes: "Лечение пульпита 36 зуба, аллергия на латекс",
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
      chairId: "chair-1",
      status: "confirmed",
      startsAt: `${todayDate}T10:00:00.000Z`,
      endsAt: `${todayDate}T11:00:00.000Z`,
      reason: "Лечение зуба 36",
    },
  ],
  todayIso: todayDate,
};

const mockLeads = [
  {
    id: "lead-1",
    name: "Григорьева Анна Михайловна",
    patientName: "Григорьева Анна Михайловна",
    phone: "+7 (926) 111-22-33",
    source: "Яндекс Карты",
    status: "new",
    notes: "Острая боль 2.6, требуется прицельный снимок",
    expectedRevenue: "25000",
    createdAt: `${todayDate}T09:00:00.000Z`,
  },
  {
    id: "lead-2",
    name: "Морозов Дмитрий Павлович",
    patientName: "Морозов Дмитрий Павлович",
    phone: "+7 (916) 222-33-44",
    source: "Сайт клиники",
    status: "contacted",
    notes: "Квалифицирован: протезирование All-on-4, консультация ортопеда",
    expectedRevenue: "180000",
    createdAt: `${todayDate}T08:30:00.000Z`,
  },
  {
    id: "lead-3",
    name: "Васильева Ольга Николаевна",
    patientName: "Васильева Ольга Николаевна",
    phone: "+7 (985) 333-44-55",
    source: "Рекомендация",
    status: "consult_booked",
    notes: "Записана на консультацию к д-ру Воронову на 14:00",
    expectedRevenue: "45000",
    createdAt: `${todayDate}T08:00:00.000Z`,
  },
  {
    id: "lead-4",
    name: "Фёдоров Сергей Владимирович",
    patientName: "Фёдоров Сергей Владимирович",
    phone: "+7 (903) 444-55-66",
    source: "2ГИС",
    status: "showed_up",
    notes: "Дошёл до клиники, составлен предварительный план лечения",
    expectedRevenue: "95000",
    createdAt: `${todayDate}T07:45:00.000Z`,
  },
];

const mockLabOrders = [
  {
    id: "ztl-001",
    orderNumber: "ЗТЛ-2026-081",
    patientId: "pat-1",
    patientName: "Ковалёв Роман Станиславович",
    patientPhone: "+7 (999) 888-77-66",
    doctorName: "Д-р Воронов Алексей Владимирович",
    doctorId: "doc-1",
    toothFdi: "36",
    material: "Диоксид циркония Multi-layer",
    colorVita: "A2",
    constructionType: "Коронка анатомическая",
    status: "in_progress",
    dueDate: "2026-10-05",
    priceRub: 14500,
    doctorDeductionRub: 7250,
    clinicalNotes: "Индивидуальный уступ, фрезеровка с винтовой фиксацией",
    createdAt: `${todayDate}T08:00:00.000Z`,
    updatedAt: `${todayDate}T08:00:00.000Z`,
  },
  {
    id: "ztl-002",
    orderNumber: "ЗТЛ-2026-082",
    patientId: "pat-1",
    patientName: "Иванов Алексей Сергеевич",
    patientPhone: "+7 (916) 123-45-67",
    doctorName: "Д-р Воронов Алексей Владимирович",
    doctorId: "doc-1",
    toothFdi: "16, 15, 14",
    material: "Керамика IPS e.max Press",
    colorVita: "A1",
    constructionType: "Мостовидный протез",
    status: "fitting",
    dueDate: "2026-10-02",
    priceRub: 32000,
    doctorDeductionRub: 16000,
    clinicalNotes: "Примерка каркаса, проверка окклюзионных контактов",
    createdAt: `${todayDate}T08:00:00.000Z`,
    updatedAt: `${todayDate}T08:00:00.000Z`,
  },
  {
    id: "ztl-003",
    orderNumber: "ЗТЛ-2026-083",
    patientId: "pat-1",
    patientName: "Смирнова Елена Васильевна",
    patientPhone: "+7 (925) 555-44-33",
    doctorName: "Д-р Воронов Алексей Владимирович",
    doctorId: "doc-1",
    toothFdi: "11, 21",
    material: "Полевошпатная керамика",
    colorVita: "B1",
    constructionType: "Керамический винир E.max",
    status: "delivered",
    dueDate: "2026-09-29",
    priceRub: 28000,
    doctorDeductionRub: 14000,
    clinicalNotes: "Готово к фиксации, доставлено курьером из лаборатории",
    createdAt: `${todayDate}T08:00:00.000Z`,
    updatedAt: `${todayDate}T08:00:00.000Z`,
  },
  {
    id: "ztl-004",
    orderNumber: "ЗТЛ-2026-084",
    patientId: "pat-1",
    patientName: "Павлов Виктор Андреевич",
    patientPhone: "+7 (903) 777-88-99",
    doctorName: "Д-р Воронов Алексей Владимирович",
    doctorId: "doc-1",
    toothFdi: "46",
    material: "Титан Grade 5 + Оксид циркония",
    colorVita: "A3",
    constructionType: "Абатмент Ti-Base + коронка",
    status: "completed",
    dueDate: "2026-09-25",
    priceRub: 19500,
    doctorDeductionRub: 9750,
    clinicalNotes: "Работа зафиксирована, гарантийный паспорт выдан",
    createdAt: `${todayDate}T08:00:00.000Z`,
    updatedAt: `${todayDate}T08:00:00.000Z`,
  },
];

const mockImagingStudies = [
  {
    id: "study-1",
    patientId: "pat-1",
    kind: "periapical",
    title: "Прицельный снимок зуба 36 (периапикальный)",
    toothCode: "36",
    region: "36 нижний левый моляр",
    sourceKind: "manual_upload",
    sourceName: "Carestream RVG 5200",
    createdAt: `${todayDate}T09:00:00.000Z`,
    files: [
      {
        id: "file-1",
        contentType: "image/png",
        url: "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='600' height='800' viewBox='0 0 600 800'><rect width='600' height='800' fill='%23111827'/><rect x='40' y='40' width='520' height='720' fill='%23030712' stroke='%23374151' stroke-width='2'/><path d='M250,150 Q300,100 350,150 L370,400 Q380,550 340,650 Q300,500 300,420 Q300,500 260,650 Q220,550 230,400 Z' fill='%239ca3af' stroke='%23e5e7eb' stroke-width='3'/><circle cx='300' cy='350' r='18' fill='%231f2937' stroke='%23ef4444' stroke-width='2'/><text x='300' y='740' text-anchor='middle' fill='%239ca3af' font-family='sans-serif' font-size='18'>CARESTREAM RVG 5200 - ЗУБ 36</text></svg>",
      },
    ],
  },
  {
    id: "study-2",
    patientId: "pat-1",
    kind: "opg",
    title: "Ортопантомограмма (ОПТГ) зубных рядов",
    region: "Верхняя и нижняя челюсти",
    sourceKind: "manual_upload",
    sourceName: "Planmeca ProMax 2D",
    createdAt: `${todayDate}T08:30:00.000Z`,
    files: [
      {
        id: "file-2",
        contentType: "image/png",
        url: "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='1000' height='500' viewBox='0 0 1000 500'><rect width='1000' height='500' fill='%230f172a'/><path d='M100,350 Q500,450 900,350 Q500,200 100,350 Z' fill='%2364748b' opacity='0.7'/><text x='500' y='470' text-anchor='middle' fill='%2394a3b8' font-family='sans-serif' font-size='16'>PLANMECA PROMAX 2D - ПАНОРАМНЫЙ СНИМОК</text></svg>",
      },
    ],
  },
  {
    id: "study-3",
    patientId: "pat-1",
    kind: "cbct",
    title: "КЛКТ 3D Волюметрия 8x8 см",
    region: "Зона имплантации 3.6 - 3.7",
    sourceKind: "manual_upload",
    sourceName: "Vatech Pax-i3D",
    createdAt: `${todayDate}T08:00:00.000Z`,
    files: [],
  },
];

async function setupRoutes(page) {
  await page.route("**/api/**", async (route) => {
    const url = route.request().url();
    if (url.includes("/src/")) return route.continue();

    if (url.includes("/api/dashboard")) {
      return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(mockDashboard) });
    }
    if (url.includes("/api/leads")) {
      return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(mockLeads) });
    }
    if (url.includes("/api/clinical/lab-orders")) {
      return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(mockLabOrders) });
    }
    if (url.includes("/api/imaging/studies")) {
      return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(mockImagingStudies) });
    }
    if (url.includes("/api/patients")) {
      return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(mockDashboard.patients) });
    }
    if (url.includes("/api/schedule")) {
      return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(mockDashboard.appointments) });
    }
    if (url.includes("/api/auth/user/me") || url.includes("/api/auth/session")) {
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ user: mockDashboard.clinicSettings.staff[0] }),
      });
    }
    return route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(url.includes("list") || url.includes("status") ? [] : { ok: true }),
    });
  });
}

async function injectAuth(context, theme = "light") {
  await context.addInitScript(({ th }) => {
    localStorage.setItem("dente_clinic_token", "live-token");
    localStorage.setItem("dente_staff_token", "live-token");
    localStorage.setItem("dente_active_role", "owner");
    localStorage.setItem("dente_theme_mode", th);
    localStorage.setItem("dente_ui_preferences_v1", JSON.stringify({ onboardingDismissed: true, onboardingStep: "done", version: 1 }));
    localStorage.setItem("dental-crm:onboarding:v1", JSON.stringify({ dismissed: true, step: "done", completed: true, version: 1 }));
    localStorage.setItem("dental-crm:web-ui-preferences:v1", JSON.stringify({
      version: 1,
      uiLanguage: "ru",
      selectedWorkspaceRole: "owner",
      selectedSpecialty: "therapist",
      selectedPatientId: "pat-1",
      onboardingDismissed: true,
      onboardingStep: "done",
    }));
    localStorage.setItem("dente-workspace-profile", JSON.stringify({
      state: {
        clinicName: "Стоматология ДЕНТЕ Премиум",
        currentDoctor: { id: "doc-1", fullName: "Д-р Воронов А. В.", role: "owner" },
        flags: { disableTour: true },
      },
    }));
  }, { th: theme });
}

async function applyTheme(page, theme) {
  await page.evaluate((th) => {
    document.documentElement.setAttribute("data-theme", th);
    const isDark = ["dark", "night", "ocean", "emerald", "cyber_xray"].includes(th);
    document.documentElement.classList.toggle("dark", isDark);
    document.documentElement.classList.toggle("light", !isDark);
    document.documentElement.style.colorScheme = isDark ? "dark" : "light";
    localStorage.setItem("dente_theme_mode", th);
    if (window.__useThemeStore) {
      window.__useThemeStore.getState().setThemeMode(th);
    }
  }, theme);
  await page.waitForTimeout(500);
}

async function saveProof(page, fileName) {
  const docsTarget = path.join(DOCS_DIR, fileName);
  const brainTarget = path.join(BRAIN_DIR, fileName);
  await page.screenshot({ path: docsTarget, fullPage: false, animations: "disabled" });
  fs.copyFileSync(docsTarget, brainTarget);
  const size = fs.statSync(docsTarget).size;
  console.log(`  ✓ Saved: ${fileName} (${(size / 1024).toFixed(1)} KB)`);
  return docsTarget;
}

async function runInquisition() {
  console.log(`[INQUISITION] Launching Chromium: ${browserPath}`);
  const browser = await chromium.launch({
    executablePath: browserPath,
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-gpu"],
  });

  const capturedFiles = [];

  try {
    const context = await browser.newContext({
      viewport: { width: 1440, height: 900 },
      deviceScaleFactor: 2,
    });
    await injectAuth(context, "light");
    const page = await context.newPage();
    await setupRoutes(page);

    // =========================================================================
    // 1. TREATMENT PLANS (3-Tier Comparison: Эконом, Оптимум, Премиум)
    // =========================================================================
    console.log("\n--- Domain 1: Treatment Plans 3-Tier Comparison ---");
    // Light
    await page.goto("http://127.0.0.1:5173/treatment_plan_preview.html?theme=light", { waitUntil: "networkidle", timeout: 20000 });
    await page.waitForTimeout(800);
    capturedFiles.push(await saveProof(page, "treatment_plans_pc_light.png"));

    // Dark
    await page.goto("http://127.0.0.1:5173/treatment_plan_preview.html?theme=dark", { waitUntil: "networkidle", timeout: 20000 });
    await page.waitForTimeout(800);
    capturedFiles.push(await saveProof(page, "treatment_plans_pc_dark.png"));

    // =========================================================================
    // 2. DENTAL LAB (32px Registry & Chairside Panel)
    // =========================================================================
    console.log("\n--- Domain 2: Dental Lab Registry & Chairside Panel ---");
    // Registry Light
    await page.goto("http://127.0.0.1:5173/lab_orders_preview.html?theme=light&tab=registry", { waitUntil: "networkidle", timeout: 20000 });
    await page.waitForTimeout(800);
    capturedFiles.push(await saveProof(page, "dental_lab_registry_pc_light.png"));

    // Registry Dark
    await page.goto("http://127.0.0.1:5173/lab_orders_preview.html?theme=dark&tab=registry", { waitUntil: "networkidle", timeout: 20000 });
    await page.waitForTimeout(800);
    capturedFiles.push(await saveProof(page, "dental_lab_registry_pc_dark.png"));

    // Chairside Panel Light
    await page.goto("http://127.0.0.1:5173/lab_orders_preview.html?theme=light&tab=chairside", { waitUntil: "networkidle", timeout: 20000 });
    await page.waitForTimeout(800);
    capturedFiles.push(await saveProof(page, "dental_lab_chairside_pc_light.png"));

    // Chairside Panel Dark
    await page.goto("http://127.0.0.1:5173/lab_orders_preview.html?theme=dark&tab=chairside", { waitUntil: "networkidle", timeout: 20000 });
    await page.waitForTimeout(800);
    capturedFiles.push(await saveProof(page, "dental_lab_chairside_pc_dark.png"));

    // =========================================================================
    // 3. LEADS KANBAN (4 Columns: Новые, Квалифицированные, Консультация, Дошли)
    // =========================================================================
    console.log("\n--- Domain 3: Leads Kanban 4 Columns ---");
    await page.goto("http://127.0.0.1:5173/#leads", { waitUntil: "domcontentloaded", timeout: 30000 });
    await page.waitForSelector(".boot-state", { state: "detached", timeout: 30000 }).catch(() => {});
    await page.waitForTimeout(1500);

    // Light
    await applyTheme(page, "light");
    await page.waitForTimeout(600);
    capturedFiles.push(await saveProof(page, "leads_kanban_pc_light.png"));

    // Dark
    await applyTheme(page, "dark");
    await page.waitForTimeout(600);
    capturedFiles.push(await saveProof(page, "leads_kanban_pc_dark.png"));

    // =========================================================================
    // 4. RADIOLOGY & DICOM VIEWER (>70% Canvas, Single-Row Toolbar, Ruler)
    // =========================================================================
    console.log("\n--- Domain 4: Radiology & DICOM Viewer ---");
    await page.goto("http://127.0.0.1:5173/#imaging", { waitUntil: "domcontentloaded", timeout: 30000 });
    await page.waitForSelector(".boot-state", { state: "detached", timeout: 30000 }).catch(() => {});
    await page.waitForTimeout(1500);

    // Light
    await applyTheme(page, "light");
    await page.waitForTimeout(800);
    capturedFiles.push(await saveProof(page, "radiology_dicom_pc_light.png"));

    // Dark
    await applyTheme(page, "dark");
    await page.waitForTimeout(800);
    capturedFiles.push(await saveProof(page, "radiology_dicom_pc_dark.png"));

    // =========================================================================
    // 5. TELEPHONY INCOMING CALL (Quiet UI Badge & Popover)
    // =========================================================================
    console.log("\n--- Domain 5: Telephony Incoming Call Quiet UI Badge ---");
    await page.goto("http://127.0.0.1:5173/#schedule", { waitUntil: "domcontentloaded", timeout: 30000 });
    await page.waitForSelector(".boot-state", { state: "detached", timeout: 30000 }).catch(() => {});
    await page.waitForTimeout(1000);

    // Trigger Incoming Call
    await page.evaluate(() => {
      const store = window.useTelephonyStore;
      if (store) {
        store.getState().setAgentState("online");
        store.getState().triggerIncomingCall({
          callId: "call-rec-9912",
          phone: "+7 (926) 555-12-34",
          patientName: "Смирнова Екатерина Васильевна",
          patientId: "pat-1",
          provider: "mango",
          status: "answered",
          timestamp: new Date().toISOString(),
          durationSeconds: 35,
          recordingUrl: "https://records.mango-office.ru/sample.mp3",
        });
      }
    });
    await page.waitForTimeout(800);

    // Light
    await applyTheme(page, "light");
    await page.waitForTimeout(600);
    capturedFiles.push(await saveProof(page, "telephony_incoming_call_pc_light.png"));

    // Dark
    await applyTheme(page, "dark");
    await page.waitForTimeout(600);
    capturedFiles.push(await saveProof(page, "telephony_incoming_call_pc_dark.png"));

    await context.close();
    console.log("\n[INQUISITION] All targeted domain captures finished successfully!");
  } finally {
    await browser.close();
  }
}

runInquisition().catch((err) => {
  console.error("Inquisition capture failure:", err);
  process.exit(1);
});
