import fs from "node:fs";
import path from "node:path";
import { chromium } from "playwright";

const OUT_DIR = "C:/Users/Admin/.gemini/antigravity/brain/57d9b940-96b6-4d85-b628-6c2a9385978c";
const DOCS_DIR = "C:/Clinic_MVP/dental-crm/docs/screenshots";

for (const d of [OUT_DIR, DOCS_DIR]) {
  if (!fs.existsSync(d)) {
    fs.mkdirSync(d, { recursive: true });
  }
}

const edgePath = [
  "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
  "C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe",
  "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
].find((p) => fs.existsSync(p));

if (!edgePath) {
  console.error("Browser executable not found!");
  process.exit(1);
}

console.log(`[CAPTURE] Launching browser at: ${edgePath}`);
const browser = await chromium.launch({
  executablePath: edgePath,
  headless: true,
  args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-gpu"],
});

const todayDate = new Date().toISOString().slice(0, 10);

const mockDashboard = {
  clinicSettings: {
    profile: {
      organizationId: "c-1",
      clinicName: "DENTE Стоматология",
      timezone: "Europe/Moscow",
      phone: "+7 (495) 123-45-67",
      address: "Москва, ул. Тверская 1",
      inn: "7701234567",
      mode: "small_clinic",
      updatedAt: new Date().toISOString(),
    },
    workspaceProfiles: [
      {
        id: "wp-1",
        mode: "small_clinic",
        scope: "standard",
        title: "Клинический кабинет",
        description: "Полный профиль работы врача и администратора",
        defaultSection: "schedule",
        primaryRoles: ["owner", "doctor", "administrator"],
        visibleSections: ["schedule", "patients", "emr", "reports", "settings"],
        automations: ["Синхронизация с ЕГИСЗ", "152-ФЗ маскирование"],
        compactNavigation: false,
      },
    ],
    roleAccessPolicies: [
      {
        role: "doctor",
        scope: "standard",
        title: "Врач-клиницист",
        defaultSection: "schedule",
        canWrite: ["emr", "schedule"],
        restricted: ["financial_reports", "all_payrolls"],
        requiresApprovalFor: ["Списание дорогостоящих материалов"],
        auditEvents: ["Запись в ЭМК", "Подпись протокола"],
      },
    ],
    staff: [
      {
        id: "staff-1",
        organizationId: "c-1",
        fullName: "Д-р Ковалев Сергей Петрович",
        role: "doctor",
        active: true,
        canSignMedicalRecords: true,
        canManageMoney: false,
        canManageImports: false,
      },
      {
        id: "staff-2",
        organizationId: "c-1",
        fullName: "Смирнова Екатерина Васильевна",
        role: "head_doctor",
        active: true,
        canSignMedicalRecords: true,
        canManageMoney: true,
        canManageImports: true,
      },
      {
        id: "staff-3",
        organizationId: "c-1",
        fullName: "Волкова Анна Михайловна",
        role: "assistant",
        active: true,
        canSignMedicalRecords: false,
        canManageMoney: false,
        canManageImports: false,
      },
    ],
  },
  todayIso: todayDate,
};

const mockCommissions = {
  commissions: [
    {
      userId: "staff-1",
      commissionPct: "25.00",
      materialCostDeductionPct: "0.00",
      effectiveFrom: "2026-01-01T00:00:00.000Z",
    },
    {
      userId: "staff-2",
      commissionPct: "30.00",
      materialCostDeductionPct: "0.00",
      effectiveFrom: "2026-01-01T00:00:00.000Z",
    },
  ],
};

const configs = [
  {
    key: "pc_light",
    label: "PC Light",
    viewport: { width: 1440, height: 900 },
    theme: "light",
    isMobile: false,
    deviceScaleFactor: 1.5,
  },
  {
    key: "pc_dark",
    label: "PC Dark",
    viewport: { width: 1440, height: 900 },
    theme: "dark",
    isMobile: false,
    deviceScaleFactor: 1.5,
  },
  {
    key: "mobile_light",
    label: "Mobile Light",
    viewport: { width: 390, height: 844 },
    theme: "light",
    isMobile: true,
    deviceScaleFactor: 2.5,
  },
  {
    key: "mobile_dark",
    label: "Mobile Dark",
    viewport: { width: 390, height: 844 },
    theme: "dark",
    isMobile: true,
    deviceScaleFactor: 2.5,
  },
];

async function applyTheme(page, theme) {
  await page.evaluate((th) => {
    document.documentElement.setAttribute("data-theme", th);
    const isDark = th === "dark" || th === "night" || th === "ocean" || th === "cyber_xray";
    document.documentElement.classList.toggle("dark", isDark);
    document.documentElement.classList.toggle("light", !isDark);
    document.body.className = isDark ? "dark" : "light";
    document.documentElement.style.colorScheme = isDark ? "dark" : "light";
    localStorage.setItem("dente_theme_mode", th);
  }, theme);
  await page.waitForTimeout(300);
}

for (const cfg of configs) {
  console.log(`\n==================================================`);
  console.log(`📸 Processing 4-State Settings RBAC Capture: ${cfg.label}`);
  console.log(`==================================================`);

  const context = await browser.newContext({
    viewport: cfg.viewport,
    deviceScaleFactor: cfg.deviceScaleFactor,
    isMobile: cfg.isMobile,
    hasTouch: cfg.isMobile,
  });

  const page = await context.newPage();

  await page.route("**/api/dashboard**", (route) => {
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(mockDashboard),
    });
  });

  await page.route("**/api/settings/staff/commissions**", (route) => {
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(mockCommissions),
    });
  });

  await page.addInitScript(({ theme }) => {
    window.localStorage.setItem("dente_active_session_token", "mock-session-token");
    window.localStorage.setItem("dente_user_role", "owner");
    window.localStorage.setItem("dente_offline_mode", "false");
    window.localStorage.setItem("dente_clinic_token", "dev_token_sample_clinic");
    window.localStorage.setItem("dente_staff_token", "dev_token_sample_staff");
    window.localStorage.setItem("dente_theme_mode", theme);
    window.localStorage.setItem("dente_workspace_perspective", "standard");
    window.localStorage.setItem("dental-crm:onboarding:v1", JSON.stringify({ dismissed: true, step: "done" }));
    window.localStorage.setItem(
      "dental-crm:web-ui-preferences:v1",
      JSON.stringify({
        version: 1,
        uiLanguage: "ru",
        selectedWorkspaceRole: "owner",
        selectedSpecialty: "therapist",
        onboardingDismissed: true,
      }),
    );
  }, { theme: cfg.theme });

  await page.goto("http://127.0.0.1:5173/#settings", { waitUntil: "domcontentloaded", timeout: 15000 });
  await applyTheme(page, cfg.theme);
  await page.waitForTimeout(600);

  // 1. Click specifically on the "Доступы" sub-tab in settings
  const accessTab = page.locator('button').filter({ hasText: /^Доступы$/i }).first();
  if (await accessTab.count() > 0) {
    await accessTab.click();
  } else {
    await page.locator('text="Доступы"').first().click();
  }
  await page.waitForTimeout(600);

  const accessName = `settings_rbac_matrix_${cfg.key}.png`;
  const accessPath = path.join(OUT_DIR, accessName);
  await page.screenshot({ path: accessPath, fullPage: false });
  fs.copyFileSync(accessPath, path.join(DOCS_DIR, accessName));
  console.log(`  ✓ Saved: ${accessName}`);

  // 2. Click on "Сотрудники" sub-tab in settings
  const staffTab = page.locator('button').filter({ hasText: /^Сотрудники$/i }).first();
  if (await staffTab.count() > 0) {
    await staffTab.click();
  } else {
    await page.locator('text="Сотрудники"').first().click();
  }
  await page.waitForTimeout(600);

  // Open the Piece-rate simulator
  const simBtn = page.locator('[data-testid="toggle-piece-rate-simulator"]').first();
  if (await simBtn.count() > 0) {
    await simBtn.click();
    await page.waitForTimeout(400);
  }

  // Also open the first employee's authority editor
  const firstStaffToggle = page.locator('[data-testid^="staff-authority-toggle-"]').first();
  if (await firstStaffToggle.count() > 0) {
    await firstStaffToggle.click();
    await page.waitForTimeout(400);
  }

  const staffName = `settings_staff_commissions_${cfg.key}.png`;
  const staffPath = path.join(OUT_DIR, staffName);
  await page.screenshot({ path: staffPath, fullPage: false });
  fs.copyFileSync(staffPath, path.join(DOCS_DIR, staffName));
  console.log(`  ✓ Saved: ${staffName}`);

  await context.close();
}

console.log("\n[SUCCESS] All 4-State Visual Proofs for Settings RBAC Captured!");
await browser.close();
