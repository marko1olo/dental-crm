const { chromium } = require("playwright");
const path = require("node:path");
const fs = require("node:fs");

async function main() {
  console.log("[Proof] 1. Authenticating against Fastify API on http://127.0.0.1:4100 ...");
  let auth = null;
  for (let attempt = 1; attempt <= 10; attempt++) {
    try {
      const res = await fetch("http://127.0.0.1:4100/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: "doctor@clinic.com", password: "dente2026" }),
      });
      auth = await res.json();
      if (auth.ok && auth.clinicToken) break;
    } catch (e) {
      console.log(`[Proof] API attempt ${attempt}/10 waiting 1s... (${e.message})`);
      await new Promise((r) => setTimeout(r, 1000));
    }
  }
  if (!auth || !auth.ok || !auth.clinicToken) {
    throw new Error(`Auth failed after 10 retries: ${JSON.stringify(auth)}`);
  }
  console.log(`[Proof] Auth OK: user=${auth.user?.fullName}, org=${auth.user?.organizationId}`);

  const outputDir = path.resolve(__dirname, "..", "docs", "screenshots", "catalog_sanpin");
  const brainDir = "C:\\Users\\Admin\\.gemini\\antigravity\\brain\\8e839e93-8988-44d8-8be8-3b5644d94d1f\\proofs";
  fs.mkdirSync(outputDir, { recursive: true });
  fs.mkdirSync(brainDir, { recursive: true });

  const edgePath = "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe";
  console.log(`[Proof] 2. Launching Microsoft Edge: ${edgePath}`);
  const browser = await chromium.launch({
    headless: true,
    executablePath: edgePath,
    args: ["--no-sandbox", "--disable-gpu", "--disable-dev-shm-usage"],
  });

  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    deviceScaleFactor: 1,
  });

  await context.addInitScript(
    ({ clinicToken, staffToken, user }) => {
      localStorage.setItem("dente_clinic_token", clinicToken);
      localStorage.setItem("dente_staff_token", staffToken);
      localStorage.setItem("dente_active_role", "owner");
      localStorage.setItem("dental-crm:active-user:v1", JSON.stringify({ ...user, role: "owner" }));
      localStorage.setItem("dente_cached_active_staff_user", JSON.stringify({ ...user, role: "owner" }));
      localStorage.setItem("dente_theme_mode", "light");
      localStorage.setItem("dental-crm:onboarding:v1", JSON.stringify({ completed: true, dismissed: true }));
      localStorage.setItem("dente_tour_completed", "true");
      localStorage.setItem("dente_quest_progress_v2", JSON.stringify({ isDismissedPermanently: true, activeTrack: null, tracksProgress: {} }));
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
    },
    { clinicToken: auth.clinicToken, staffToken: auth.staffToken, user: auth.user }
  );

  const page = await context.newPage();

  const applyTheme = async (theme) => {
    const isDark = theme === "dark";
    await page.evaluate(({ currentTheme, isDark }) => {
      document.documentElement.setAttribute("data-theme", currentTheme);
      document.documentElement.classList.toggle("dark", isDark);
      document.documentElement.classList.toggle("light", !isDark);
      document.body.className = isDark ? "dark" : "light";
      document.documentElement.style.colorScheme = isDark ? "dark" : "light";
      if (window.__useThemeStore) {
        window.__useThemeStore.getState().setThemeMode(currentTheme);
      }
    }, { currentTheme: theme, isDark });
    await page.waitForTimeout(300);
  };

  const cleanOverlays = async () => {
    await page.evaluate(() => {
      document
        .querySelectorAll(
          '.tour-spotlight-root, [data-testid="guided-tour-spotlight-overlay"], .tour-backdrop-clickable-zone, [data-testid="demo-mode-banner"], .global-toast-container, [role="alert"]'
        )
        .forEach((el) => el.remove());
    });
  };

  const saveProof = async (filename) => {
    const dest = path.join(outputDir, filename);
    const brainDest = path.join(brainDir, filename);
    await page.screenshot({ path: dest, fullPage: false });
    fs.copyFileSync(dest, brainDest);
    const stats = fs.statSync(dest);
    console.log(`[Captured] ${filename} (${stats.size} bytes) -> ${dest}`);
  };

  // -------------------------------------------------------------
  // SCREENSHOT 1 & 2: ServicePricelistManagerModal (Light & Dark)
  // -------------------------------------------------------------
  console.log("[Proof] Navigating to #settings/prices to open ServicePricelistManagerModal...");
  await page.goto("http://127.0.0.1:5173/#settings/prices", { waitUntil: "domcontentloaded", timeout: 25000 });
  await page.waitForTimeout(2000);
  // Wait for settings to finish loading
  console.log("[Proof] Waiting for settings to finish loading...");
  await page.waitForFunction(() => {
    const text = document.body.innerText || '';
    return !text.includes('загрузка') && (
      document.querySelector('.settings-role-strip-container') ||
      document.querySelector('.settings-subnav-strip') ||
      document.querySelector('[data-testid="settings-view"]')
    );
  }, { timeout: 20000 });
  await page.waitForTimeout(1000);
  await cleanOverlays();

  // If owner subnav is present, ensure "Прейскурант услуг" is selected
  const ownerPricesBtn = page.locator('.settings-subnav-btn:has-text("Прейскурант"), button:has-text("Прейскурант услуг")');
  if (await ownerPricesBtn.count() > 0) {
    console.log("[Proof] Clicking owner subnav 'Прейскурант услуг'...");
    await ownerPricesBtn.first().click();
    await page.waitForTimeout(1000);
  }

  // Find and click the button to open ServicePricelistManagerModal
  const openPricelistBtn = page.locator('[data-testid="open-service-pricelist-modal-btn"]');
  console.log("[Proof] Waiting for [data-testid='open-service-pricelist-modal-btn']...");
  await openPricelistBtn.waitFor({ state: "visible", timeout: 15000 });
  await openPricelistBtn.click();

  // Wait for modal to render
  await page.waitForSelector('.service-pricelist-modal, .pricelist-modal-container', { timeout: 10000 });
  await page.waitForTimeout(1000);
  await cleanOverlays();

  console.log("[Proof] Capturing Catalog Pricelist PC Light (1440x900)...");
  await applyTheme("light");
  await cleanOverlays();
  await saveProof("catalog_pricelist_pc_light.png");

  console.log("[Proof] Capturing Catalog Pricelist PC Dark (1440x900)...");
  await applyTheme("dark");
  await cleanOverlays();
  await saveProof("catalog_pricelist_pc_dark.png");

  // Close modal
  const closeModalBtn = page.locator('.pricelist-btn-icon, button[aria-label="Закрыть"]');
  if (await closeModalBtn.count() > 0) {
    await closeModalBtn.first().click();
    await page.waitForTimeout(500);
  }

  // -------------------------------------------------------------
  // SCREENSHOT 3 & 4: SanPiN Registers & Journals Studio (Light & Dark)
  // -------------------------------------------------------------
  console.log("[Proof] Navigating to SanPiN Registers via sidebar or hash...");
  const sanpinNavBtn = page.locator('button:has-text("Стерилизация"), a:has-text("Стерилизация"), .sidebar-item:has-text("Стерилизация")');
  if (await sanpinNavBtn.count() > 0) {
    console.log("[Proof] Clicking sidebar 'Стерилизация' button...");
    await sanpinNavBtn.first().click();
  } else {
    await page.goto("http://127.0.0.1:5173/#sanpin", { waitUntil: "domcontentloaded", timeout: 25000 });
  }
  await page.waitForTimeout(2000);
  await cleanOverlays();

  await page.waitForSelector('.sanpin-registers-root, .sanpin-tabs-nav, .sanpin-header-actions', { timeout: 15000 });
  await page.waitForTimeout(1000);

  console.log("[Proof] Capturing SanPiN Registers PC Light (1440x900)...");
  await applyTheme("light");
  await cleanOverlays();
  await saveProof("sanpin_registers_pc_light.png");

  console.log("[Proof] Capturing SanPiN Registers PC Dark (1440x900)...");
  await applyTheme("dark");
  await cleanOverlays();
  await saveProof("sanpin_registers_pc_dark.png");

  await browser.close();
  console.log("[Proof] All 4 Edge Playwright proofs captured successfully!");
}

main().catch((err) => {
  console.error("[Proof Error]:", err);
  process.exit(1);
});
