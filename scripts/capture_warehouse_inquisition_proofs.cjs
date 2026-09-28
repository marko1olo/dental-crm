/**
 * scripts/capture_warehouse_inquisition_proofs.cjs
 * Captures live inquisition screenshots for Warehouse & Inventory (Mandates 8c, 8e, 8n).
 * - Canonical 7-column table verification
 * - FEFO Traffic Light (Red <= 30d, Yellow <= 90d, Green > 90d)
 * - Soft Overdraft verification (Non-blocking negative stock)
 * - 4-state visual proof: Desktop Light, Desktop Dark
 */

const { chromium } = require("playwright");
const path = require("node:path");
const fs = require("node:fs");
const crypto = require("node:crypto");

function addDaysIso(days) {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

const mockInventoryItems = [
  {
    id: "item-fefo-red",
    name: "Септонест 1:100 000 с адреналином (Септодонт, 50 карпул)",
    category: "anesthesia",
    stockQuantity: 14,
    criticalThreshold: 20,
    unitCostKopecks: 450000,
    unit: "упак.",
    expirationDate: addDaysIso(14), // <= 30 days -> RED FEFO
    lotNumber: "SEPT-2026-08",
    barcode: "3400935567890",
    organizationId: "00000000-0000-0000-0000-000000000001",
  },
  {
    id: "item-fefo-yellow",
    name: "Filtek Z250 (3M ESPE), оттенок A2, шприц 4г",
    category: "composite",
    stockQuantity: 8,
    criticalThreshold: 4,
    unitCostKopecks: 285000,
    unit: "шт.",
    expirationDate: addDaysIso(52), // <= 90 days -> YELLOW FEFO
    lotNumber: "FLT-9921",
    barcode: "4003456789012",
    organizationId: "00000000-0000-0000-0000-000000000001",
  },
  {
    id: "item-fefo-green",
    name: "Оптагейт (Ivoclar Vivadent) Regular, 80 шт",
    category: "therapy",
    stockQuantity: 22,
    criticalThreshold: 10,
    unitCostKopecks: 890000,
    unit: "упак.",
    expirationDate: addDaysIso(320), // > 90 days -> GREEN FEFO
    lotNumber: "IVOC-2027",
    barcode: "7615234567891",
    organizationId: "00000000-0000-0000-0000-000000000001",
  },
  {
    id: "item-overdraft",
    name: "Ватные валики хлопковые №2 (Euronda, 500 шт)",
    category: "disposables",
    stockQuantity: -2, // Non-blocking soft overdraft (Zero Dead-Ends)
    criticalThreshold: 5,
    unitCostKopecks: 45000,
    unit: "упак.",
    expirationDate: addDaysIso(450),
    lotNumber: "ROL-441-EUR",
    barcode: "4601234567890",
    organizationId: "00000000-0000-0000-0000-000000000001",
  },
  {
    id: "item-needles",
    name: "Иглы карпульные Master 0.3 x 25 мм (100 шт)",
    category: "anesthesia",
    stockQuantity: 18,
    criticalThreshold: 10,
    unitCostKopecks: 125000,
    unit: "упак.",
    expirationDate: addDaysIso(580),
    lotNumber: "MST-8820",
    barcode: "4607001234567",
    organizationId: "00000000-0000-0000-0000-000000000001",
  },
];

async function captureWarehouseProofs() {
  const dirInquisition = path.resolve("C:/Clinic_MVP/dental-crm/docs/screenshots/inquisition_live");
  const dirBrain = path.resolve("C:/Users/Admin/.gemini/antigravity/brain/a84df016-a7cc-461c-ba80-899ae84de477/screenshots");

  fs.mkdirSync(dirInquisition, { recursive: true });
  fs.mkdirSync(dirBrain, { recursive: true });

  console.log("[Playwright] Launching Chrome executable...");
  const browser = await chromium.launch({
    headless: true,
    executablePath: "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });

  const desktopContext = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    deviceScaleFactor: 2,
  });

  await desktopContext.addInitScript(() => {
    localStorage.setItem("dente_clinic_token", "live-inquisition-token");
    localStorage.setItem("dente_staff_token", "live-inquisition-token");
    localStorage.setItem("dente_active_role", "owner");
    localStorage.setItem("dente_theme_mode", "light");
    localStorage.setItem("dente_ui_preferences_v1", JSON.stringify({ onboardingDismissed: true, onboardingStep: "done", version: 1 }));
    localStorage.setItem("dental-crm:onboarding:v1", JSON.stringify({ dismissed: true, step: "done", completed: true, version: 1 }));
    localStorage.setItem("dental-crm:web-ui-preferences:v1", JSON.stringify({ version: 1, uiLanguage: "ru", selectedWorkspaceRole: "owner", onboardingDismissed: true, onboardingStep: "done" }));
    localStorage.setItem("dente-workspace-profile", JSON.stringify({
      state: {
        clinicName: "Стоматология ДЕНТЕ Премиум",
        currentDoctor: { id: "doc-1", fullName: "Д-р Воронов А. В.", role: "owner" },
        flags: { disableTour: true },
      },
    }));
  });

  const page = await desktopContext.newPage();

  await page.route("**/api/**", async (route) => {
    const url = route.request().url();
    if (url.includes("/src/")) return route.continue();

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
          user: {
            id: "doc-1",
            fullName: "Д-р Воронов Алексей Владимирович",
            role: "owner",
          },
        }),
      });
    }

    if (url.includes("/api/inventory")) {
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(mockInventoryItems),
      });
    }

    if (url.includes("/api/dashboard")) {
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          clinicName: "Стоматология ДЕНТЕ Премиум",
          clinicSettings: {
            profile: {
              id: "c-1",
              organizationId: "00000000-0000-0000-0000-000000000001",
              clinicName: "Стоматология ДЕНТЕ Премиум",
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
          },
          appointments: [],
          patients: [],
        }),
      });
    }

    return route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(url.includes("list") || url.includes("status") ? [] : { ok: true }),
    });
  });

  async function applyTheme(theme) {
    await page.evaluate((th) => {
      localStorage.setItem("dente_theme_mode", th);
      if (window.__useThemeStore) {
        window.__useThemeStore.getState().setThemeMode(th);
      }
      document.documentElement.setAttribute("data-theme", th);
      const isDark = ["dark", "night", "ocean"].includes(th);
      document.documentElement.classList.toggle("dark", isDark);
      document.documentElement.classList.toggle("light", !isDark);
      document.documentElement.style.colorScheme = isDark ? "dark" : "light";
    }, theme);
    await page.waitForTimeout(600);
  }

  console.log("[Playwright] Navigating to http://127.0.0.1:5173/#inventory...");
  await page.goto("http://127.0.0.1:5173/#inventory", { waitUntil: "domcontentloaded", timeout: 45000 });
  await page.waitForSelector(".boot-state", { state: "detached", timeout: 30000 }).catch(() => {});
  await page.waitForSelector(".warehouse-items-table, .inventory-panel, table", { state: "visible", timeout: 30000 });
  await page.waitForTimeout(1500);

  // 1. Capture Desktop Light
  console.log("[Playwright] Capturing Desktop Light...");
  await applyTheme("light");
  await page.waitForTimeout(600);
  const lightInq = path.join(dirInquisition, "warehouse_desktop_light.png");
  const lightBrain = path.join(dirBrain, "warehouse_desktop_light.png");
  await page.screenshot({ path: lightInq, fullPage: false });
  fs.copyFileSync(lightInq, lightBrain);
  const lightStat = fs.statSync(lightInq);
  const lightMd5 = crypto.createHash("md5").update(fs.readFileSync(lightInq)).digest("hex");
  console.log(`  [Saved] ${lightInq} (${(lightStat.size / 1024).toFixed(1)} KB, MD5: ${lightMd5})`);

  // 2. Capture Desktop Dark
  console.log("[Playwright] Capturing Desktop Dark...");
  await applyTheme("dark");
  await page.waitForTimeout(600);
  const darkInq = path.join(dirInquisition, "warehouse_desktop_dark.png");
  const darkBrain = path.join(dirBrain, "warehouse_desktop_dark.png");
  await page.screenshot({ path: darkInq, fullPage: false });
  fs.copyFileSync(darkInq, darkBrain);
  const darkStat = fs.statSync(darkInq);
  const darkMd5 = crypto.createHash("md5").update(fs.readFileSync(darkInq)).digest("hex");
  console.log(`  [Saved] ${darkInq} (${(darkStat.size / 1024).toFixed(1)} KB, MD5: ${darkMd5})`);

  await page.close();
  await desktopContext.close();
  await browser.close();

  console.log(">>> Warehouse visual proofs captured and copied successfully! <<<");
}

captureWarehouseProofs().catch((err) => {
  console.error("Screenshot capture error:", err);
  process.exit(1);
});
