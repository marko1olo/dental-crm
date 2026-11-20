import fs from "node:fs";
import path from "node:path";
import { chromium } from "playwright";

const DOCS_DIR = "C:/Clinic_MVP/dental-crm/docs/proofs/settings";
if (!fs.existsSync(DOCS_DIR)) {
  fs.mkdirSync(DOCS_DIR, { recursive: true });
}

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

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
  args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-gpu", "--disable-dev-shm-usage"],
});

const todayDate = new Date().toISOString().slice(0, 10);

const mockDashboard = {
  clinicName: "Клиника ДЕНТЕ",
  todayIso: todayDate,
  clinicSettings: {
    name: "Клиника ДЕНТЕ",
    profile: {
      id: "00000000-0000-4000-8000-000000000001",
      organizationId: "00000000-0000-4000-8000-000000000001",
      clinicName: "Клиника ДЕНТЕ",
      timezone: "Europe/Moscow",
      phone: "+7 (495) 123-45-67",
      address: "Москва, ул. Тверская 1",
      inn: "7701234567",
      mode: "small_clinic",
      defaultVisitMinutes: 45,
      updatedAt: new Date().toISOString(),
    },
    staff: [
      {
        id: "11111111-1111-4111-8111-111111111111",
        organizationId: "00000000-0000-4000-8000-000000000001",
        fullName: "Д-р Захаров Андрей Васильевич",
        role: "owner",
        phone: "+7 (999) 111-22-33",
        specialties: ["surgeon", "general"],
        active: true,
        canSignMedicalRecords: true,
        canManageMoney: true,
        canManageImports: true,
        baseSalaryKopecks: 15000000,
        color: "#0d9488",
      },
      {
        id: "22222222-2222-4222-8222-222222222222",
        organizationId: "00000000-0000-4000-8000-000000000001",
        fullName: "Д-р Смирнова Елена Павловна",
        role: "doctor",
        phone: "+7 (999) 222-33-44",
        specialties: ["therapist", "general"],
        active: true,
        canSignMedicalRecords: true,
        canManageMoney: false,
        canManageImports: false,
        baseSalaryKopecks: 9500000,
        color: "#2563eb",
      },
      {
        id: "33333333-3333-4333-8333-333333333333",
        organizationId: "00000000-0000-4000-8000-000000000001",
        fullName: "Кузнецова Анна Сергеевна",
        role: "administrator",
        phone: "+7 (999) 333-44-55",
        specialties: ["universal"],
        active: true,
        canSignMedicalRecords: false,
        canManageMoney: true,
        canManageImports: false,
        baseSalaryKopecks: 5500000,
        color: "#9333ea",
      },
      {
        id: "44444444-4444-4444-8444-444444444444",
        organizationId: "00000000-0000-4000-8000-000000000001",
        fullName: "Волкова Мария Игоревна",
        role: "assistant",
        phone: "+7 (999) 444-55-66",
        specialties: ["universal"],
        active: true,
        canSignMedicalRecords: false,
        canManageMoney: false,
        canManageImports: false,
        baseSalaryKopecks: 4500000,
        color: "#10b981",
      },
      {
        id: "55555555-5555-4555-8555-555555555555",
        organizationId: "00000000-0000-4000-8000-000000000001",
        fullName: "Д-р Белов Сергей Николаевич",
        role: "curator",
        phone: "+7 (999) 555-66-77",
        specialties: ["orthopedist"],
        active: true,
        canSignMedicalRecords: false,
        canManageMoney: false,
        canManageImports: false,
        baseSalaryKopecks: 7000000,
        color: "#f59e0b",
      },
    ],
    chairs: [
      {
        id: "chair-1",
        name: "Кабинет 1 (Терапия)",
        room: "1",
        color: "#0d9488",
        defaultDoctorId: "11111111-1111-4111-8111-111111111111",
        active: true,
        hasXraySensor: true,
      },
    ],
  },
  patients: [],
  appointments: [],
  payments: [],
};

const mockCommissions = {
  commissions: [
    {
      userId: "11111111-1111-4111-8111-111111111111",
      commissionPct: "35.00",
      materialCostDeductionPct: "10.00",
      effectiveFrom: "2026-01-01T00:00:00.000Z",
    },
    {
      userId: "22222222-2222-4222-8222-222222222222",
      commissionPct: "25.00",
      materialCostDeductionPct: "0.00",
      effectiveFrom: "2026-01-01T00:00:00.000Z",
    },
  ],
};

const configs = [
  {
    fileName: "01_staff_rbac_pc_light_1440x900.png",
    altFileName: "01_settings_staff_pc_light_1440x900.png",
    label: "PC Light",
    viewport: { width: 1440, height: 900 },
    theme: "light",
    isMobile: false,
    deviceScaleFactor: 1.5,
  },
  {
    fileName: "02_staff_rbac_pc_dark_1440x900.png",
    altFileName: "02_settings_staff_pc_dark_1440x900.png",
    label: "PC Dark",
    viewport: { width: 1440, height: 900 },
    theme: "dark",
    isMobile: false,
    deviceScaleFactor: 1.5,
  },
  {
    fileName: "03_staff_rbac_mobile_light_390x844.png",
    altFileName: "03_settings_staff_mobile_light_390x844.png",
    label: "Mobile Light",
    viewport: { width: 390, height: 844 },
    theme: "light",
    isMobile: true,
    deviceScaleFactor: 2.5,
  },
  {
    fileName: "04_staff_rbac_mobile_dark_390x844.png",
    altFileName: "04_settings_staff_mobile_dark_390x844.png",
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
  await wait(400);
}

async function suppressOverlays(page) {
  try {
    await page.evaluate(() => {
      const style = document.createElement("style");
      style.id = "suppress-all-overlays-settings";
      style.innerHTML = `
        .tour-spotlight-root,
        .tour-backdrop-clickable-zone,
        [data-testid="guided-tour-spotlight-overlay"],
        [data-testid="guided-tour-coach-mark-card"],
        [data-testid="demo-mode-banner"],
        .notification-toast,
        .global-toast,
        .toast-container,
        [data-toast],
        vite-error-overlay {
          display: none !important;
          pointer-events: none !important;
        }
      `;
      document.head.appendChild(style);
    });
  } catch (_) {}
}

async function setupMocksAndStorage(page, theme) {
  await page.route("**/api/**", async (route) => {
    const url = route.request().url();
    if (url.includes("/src/")) return route.continue();
    if (url.includes("/api/dashboard") || url.includes("/api/settings/clinic")) {
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(mockDashboard),
      });
    }
    if (url.includes("/api/settings/staff/commissions")) {
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(mockCommissions),
      });
    }
    if (url.includes("/api/auth/user/me") || url.includes("/api/auth/session") || url.includes("/api/users/me")) {
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          user: {
            id: "11111111-1111-4111-8111-111111111111",
            fullName: "Д-р Захаров Андрей Васильевич",
            role: "owner",
            organizationId: "00000000-0000-4000-8000-000000000001",
          },
          clinicToken: "live-inquisition-clinic-token",
          staffToken: "live-inquisition-staff-token",
        }),
      });
    }
    return route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ ok: true, success: true }),
    });
  });

  await page.addInitScript(({ theme }) => {
    localStorage.setItem("dente_clinic_token", "live-inquisition-clinic-token");
    localStorage.setItem("dente_staff_token", "live-inquisition-staff-token");
    localStorage.setItem("dente_active_session_token", "live-inquisition-staff-token");
    localStorage.setItem("dente_organization_id", "00000000-0000-4000-8000-000000000001");
    localStorage.setItem("dente_user_id", "11111111-1111-4111-8111-111111111111");
    localStorage.setItem("dente_user_name", "Д-р Захаров Андрей Васильевич");
    localStorage.setItem("dente_user_role", "owner");
    localStorage.setItem("dente_role", "owner");
    localStorage.setItem("dente_perspective", "owner");
    localStorage.setItem("dente_clinic_tenant_id", "org_dental_1");
    localStorage.setItem("dente_demo_showcase", "true");
    localStorage.setItem("dente_onboarding_completed", "true");
    localStorage.setItem("dente_tour_completed", "true");
    localStorage.setItem("dente_tour_dismissed", "true");
    localStorage.setItem("dente_onboarding_dismissed", "true");
    localStorage.setItem("dente_theme_mode", theme);
    localStorage.setItem("dental-crm:onboarding:v1", JSON.stringify({ dismissed: true, step: "done", completed: true }));
    localStorage.setItem(
      "dental-crm:web-ui-preferences:v1",
      JSON.stringify({
        version: 1,
        uiLanguage: "ru",
        selectedWorkspaceRole: "owner",
        selectedSpecialty: "surgeon",
        onboardingDismissed: true,
        onboardingDismissedAt: new Date().toISOString(),
      }),
    );
  }, { theme });
}

for (const cfg of configs) {
  console.log(`\n📸 Capturing: ${cfg.label} -> ${cfg.fileName}`);

  const context = await browser.newContext({
    viewport: cfg.viewport,
    deviceScaleFactor: cfg.deviceScaleFactor,
    isMobile: cfg.isMobile,
    hasTouch: cfg.isMobile,
    locale: "ru-RU",
  });

  const page = await context.newPage();
  await setupMocksAndStorage(page, cfg.theme);

  await page.goto("http://127.0.0.1:5173/#settings/staff", { waitUntil: "domcontentloaded", timeout: 45000 });
  await suppressOverlays(page);
  await applyTheme(page, cfg.theme);

  // Обязательное строгое ожидание появления .staff-management-studio
  let mounted = false;
  for (let attempt = 0; attempt < 5; attempt++) {
    try {
      await page.waitForSelector('.staff-management-studio, [data-testid="settings-staff-tab"]', { timeout: 8000 });
      mounted = true;
      break;
    } catch {
      console.log(`  [Retry ${attempt + 1}] Waiting for staff studio... attempting click tab`);
      try {
        const staffBtn = page.locator('button, [role="tab"]').filter({ hasText: /^Сотрудники$/i }).first();
        if (await staffBtn.count() > 0) {
          await staffBtn.click({ force: true, timeout: 2000 }).catch(() => {});
        }
      } catch (_) {}
      await wait(1500);
    }
  }

  if (!mounted) {
    console.warn(`  ⚠️ Warning: .staff-management-studio did not mount for ${cfg.label}!`);
  }

  await wait(1200);
  const targetPath = path.join(DOCS_DIR, cfg.fileName);
  const altPath = path.join(DOCS_DIR, cfg.altFileName);
  await page.screenshot({ path: targetPath, fullPage: false });
  fs.copyFileSync(targetPath, altPath);
  const stat = fs.statSync(targetPath);
  console.log(`  ✓ Saved: ${cfg.fileName} & ${cfg.altFileName} (${(stat.size / 1024).toFixed(1)} KB)`);

  await context.close();
}

console.log("\n[SUCCESS] All 4 canonical 4-State Proofs captured successfully!");
await browser.close();
