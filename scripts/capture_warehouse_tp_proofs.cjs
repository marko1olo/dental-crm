/**
 * scripts/capture_warehouse_tp_proofs.cjs
 * Visual proof capture for Warehouse & Treatment Plan 3-Tier Comparison
 * Mandate 8c, 8e: 4-State Visual Proof (PC Light, PC Dark, Mobile Light, Mobile Dark)
 */

const { chromium } = require("playwright");
const path = require("node:path");
const fs = require("node:fs");

const mockInventoryItems = [
  {
    id: "item-1",
    name: "Артифрин м.д. 1:100 000 (Артикаин) 50 карпул",
    category: "anesthesia",
    stockQuantity: 48,
    criticalThreshold: 10,
    unitCostKopecks: 385000,
    unit: "упак.",
    expirationDate: "2027-06-15",
    lotNumber: "ART-2026-X",
    barcode: "4607001234567",
    organizationId: "00000000-0000-0000-0000-000000000001",
  },
  {
    id: "item-2",
    name: "Композит Filtek Z250 шприц 4г (A2)",
    category: "therapy",
    stockQuantity: 12,
    criticalThreshold: 5,
    unitCostKopecks: 245000,
    unit: "шт.",
    expirationDate: "2026-11-20",
    lotNumber: "FLT-9921",
    barcode: "4003456789012",
    organizationId: "00000000-0000-0000-0000-000000000001",
  },
  {
    id: "item-3",
    name: "Перчатки нитриловые смотровые неопудренные (M)",
    category: "disposables",
    stockQuantity: 3,
    criticalThreshold: 8,
    unitCostKopecks: 65000,
    unit: "упак.",
    expirationDate: "2028-01-10",
    lotNumber: "GLV-2026-B",
    barcode: "4680011223344",
    organizationId: "00000000-0000-0000-0000-000000000001",
  },
  {
    id: "item-4",
    name: "Анестетик Скандонест 3% (Мепивакаин без адреналина)",
    category: "anesthesia",
    stockQuantity: 25,
    criticalThreshold: 5,
    unitCostKopecks: 420000,
    unit: "упак.",
    expirationDate: "2026-10-05",
    lotNumber: "SCN-2026-11",
    barcode: "3400935567890",
    organizationId: "00000000-0000-0000-0000-000000000001",
  },
];

async function captureProofs() {
  const outDir = path.resolve("C:/Clinic_MVP/dental-crm/docs/screenshots/subagent6");
  if (!fs.existsSync(outDir)) {
    fs.mkdirSync(outDir, { recursive: true });
  }

  console.log("[Playwright] Launching Chrome executable...");
  const browser = await chromium.launch({
    headless: true,
    executablePath: "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });

  async function setupRoutes(page) {
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
  }

  async function injectAuth(context) {
    await context.addInitScript(() => {
      localStorage.setItem("dente_clinic_token", "live-token");
      localStorage.setItem("dente_staff_token", "live-token");
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
  }

  async function applyTheme(page, theme) {
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

  // 1. Desktop Suite (1440x900)
  console.log("\n>>> Capturing Desktop Proofs (1440x900) <<<");
  const desktopContext = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    deviceScaleFactor: 2,
  });
  await injectAuth(desktopContext);
  const dPage = await desktopContext.newPage();
  await setupRoutes(dPage);

  await dPage.goto("http://127.0.0.1:5173/#inventory", { waitUntil: "domcontentloaded", timeout: 45000 });
  await dPage.waitForSelector(".boot-state", { state: "detached", timeout: 30000 }).catch(() => {});
  await dPage.waitForTimeout(2000);

  // 1A. Warehouse Desktop Light
  await applyTheme(dPage, "light");
  await dPage.screenshot({ path: path.join(outDir, "warehouse_desktop_light.png"), fullPage: false });
  console.log("  [Saved] warehouse_desktop_light.png");

  // 1B. Warehouse Desktop Dark
  await applyTheme(dPage, "dark");
  await dPage.screenshot({ path: path.join(outDir, "warehouse_desktop_dark.png"), fullPage: false });
  console.log("  [Saved] warehouse_desktop_dark.png");

  await dPage.close();
  await desktopContext.close();

  // 2. Mobile Suite (390x844)
  console.log("\n>>> Capturing Mobile Proofs (390x844) <<<");
  const mobileContext = await browser.newContext({
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 2,
    isMobile: true,
    hasTouch: true,
  });
  await injectAuth(mobileContext);
  const mPage = await mobileContext.newPage();
  await setupRoutes(mPage);

  await mPage.goto("http://127.0.0.1:5173/#inventory", { waitUntil: "domcontentloaded", timeout: 45000 });
  await mPage.waitForSelector(".boot-state", { state: "detached", timeout: 30000 }).catch(() => {});
  await mPage.waitForTimeout(2000);

  // 2A. Warehouse Mobile Light
  await applyTheme(mPage, "light");
  await mPage.screenshot({ path: path.join(outDir, "warehouse_mobile_light.png"), fullPage: false });
  console.log("  [Saved] warehouse_mobile_light.png");

  // 2B. Warehouse Mobile Dark
  await applyTheme(mPage, "dark");
  await mPage.screenshot({ path: path.join(outDir, "warehouse_mobile_dark.png"), fullPage: false });
  console.log("  [Saved] warehouse_mobile_dark.png");

  await mPage.close();
  await mobileContext.close();

  await browser.close();
  console.log("\n>>> Visual Proofs Captured Successfully! <<<");
}

captureProofs().catch((err) => {
  console.error("Screenshot error:", err);
  process.exit(1);
});
