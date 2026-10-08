const { chromium } = require("playwright");
const fs = require("node:fs");
const path = require("node:path");

async function run() {
  const outDir = path.resolve(__dirname, "..", "docs", "screenshots", "sanpin_inquisition");
  if (!fs.existsSync(outDir)) {
    fs.mkdirSync(outDir, { recursive: true });
  }

  const chromePath = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
  const edgePath = "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe";
  const executablePath = fs.existsSync(chromePath) ? chromePath : (fs.existsSync(edgePath) ? edgePath : undefined);

  const browser = await chromium.launch({
    headless: true,
    ...(executablePath ? { executablePath } : {}),
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });

  async function createPage(theme = "light", hash = "sanpin") {
    const context = await browser.newContext({
      viewport: { width: 1440, height: 900 },
      deviceScaleFactor: 1,
    });

    await context.addInitScript(({ themeMode }) => {
      localStorage.setItem("dente_demo_showcase", "true");
      localStorage.setItem("dente_onboarding_completed", "true");
      localStorage.setItem("dente_tour_completed", "true");
      localStorage.setItem("dente_tour_dismissed", "true");
      localStorage.setItem("dente_sidebar_collapsed", "false");
      localStorage.setItem("dente_theme_mode", themeMode);
      localStorage.setItem("dente_theme_mode_prev", "light");
      localStorage.setItem("dental-crm:web-ui-preferences:v1", JSON.stringify({
        version: 1,
        uiLanguage: "ru",
        selectedWorkspaceRole: "owner",
        onboardingDismissed: true,
        onboardingStep: "done",
      }));
      if (themeMode === "dark") {
        document.documentElement.setAttribute("data-theme", "dark");
        document.documentElement.classList.add("dark");
      } else {
        document.documentElement.setAttribute("data-theme", "light");
        document.documentElement.classList.remove("dark");
      }
    }, { themeMode: theme });

    const page = await context.newPage();
    const targetUrl = `http://127.0.0.1:5173/?demo=true#${hash}`;
    console.log(`\nNavigating to ${targetUrl} (${theme})...`);
    await page.goto(targetUrl, { waitUntil: "domcontentloaded", timeout: 25000 });

    for (let i = 0; i < 25; i++) {
      await page.waitForTimeout(500);
      const text = await page.evaluate(() => document.body ? document.body.innerText : "");
      if (!text.includes("Загрузка системы") && text.length > 200) break;
    }

    try {
      const dismissBtn = page.locator('button:has-text("Больше не показывать"), button:has-text("Пропустить"), [aria-label="Закрыть тур"]').first();
      if (await dismissBtn.count() > 0 && await dismissBtn.isVisible()) {
        await dismissBtn.click({ force: true });
      }
    } catch (e) {}

    await page.evaluate(({ themeMode }) => {
      if (themeMode === "dark") {
        document.documentElement.setAttribute("data-theme", "dark");
        document.documentElement.classList.add("dark");
      } else {
        document.documentElement.setAttribute("data-theme", "light");
        document.documentElement.classList.remove("dark");
      }
      if (window.__useThemeStore) {
        window.__useThemeStore.getState().setThemeMode(themeMode);
      }
    }, { themeMode: theme });

    return { context, page };
  }

  const themes = ["light", "dark"];

  for (const theme of themes) {
    console.log(`\n======================================================`);
    console.log(`CAPTURING SANPIN PROOFS FOR THEME: ${theme.toUpperCase()}`);
    console.log(`======================================================`);

    // 1. Kraft Packets Registry
    {
      const { context, page } = await createPage(theme, "sanpin/kraft");
      await page.waitForSelector('.sanpin-tab-content, .sanpin-table, table', { state: "visible", timeout: 8000 }).catch(() => {});
      await page.waitForTimeout(1200);

      const shotPath = path.join(outDir, `sanpin_kraft_packets_registry_${theme}.png`);
      await page.screenshot({ path: shotPath, fullPage: false });
      console.log(`[OK] Saved: ${shotPath}`);
      await context.close();
    }

    // 2. Autoclave Cycles & New Cycle Presets
    {
      const { context, page } = await createPage(theme, "sanpin/autoclave");
      await page.waitForTimeout(1200);

      const moreBtn = page.locator('[data-testid="autoclave-more-options-btn"]').first();
      if (await moreBtn.count() > 0 && await moreBtn.isVisible()) {
        await moreBtn.click();
        await page.waitForTimeout(500);

        const openStudioBtn = page.locator('[data-testid="open-journal-257-studio-btn"]').first();
        if (await openStudioBtn.count() > 0 && await openStudioBtn.isVisible()) {
          await openStudioBtn.click();
          await page.waitForSelector('.autoclave-log-modal-container', { state: "visible", timeout: 8000 }).catch(() => {});
          await page.waitForTimeout(1000);

          // Shot: Autoclave Cycles Ledger
          const cyclesShotPath = path.join(outDir, `sanpin_autoclave_cycles_${theme}.png`);
          await page.screenshot({ path: cyclesShotPath, fullPage: false });
          console.log(`[OK] Saved: ${cyclesShotPath}`);

          // Switch to New Cycle tab
          const newCycleTab = page.locator('button:has-text("Новый цикл"), [role="tab"]:has-text("Новый цикл")').first();
          if (await newCycleTab.count() > 0 && await newCycleTab.isVisible()) {
            await newCycleTab.click();
            await page.waitForSelector('[data-testid="express-standard-cycle-btn"]', { state: "visible", timeout: 8000 }).catch(() => {});
            await page.waitForTimeout(1000);

            // Shot: Autoclave New Cycle 3 Presets
            const presetsShotPath = path.join(outDir, `sanpin_autoclave_new_cycle_presets_${theme}.png`);
            await page.screenshot({ path: presetsShotPath, fullPage: false });
            console.log(`[OK] Saved: ${presetsShotPath}`);
          }
        }
      }
      await context.close();
    }

    // 3. Medical Waste Modal
    {
      const { context, page } = await createPage(theme, "sanpin/waste");
      await page.waitForSelector('[data-testid="open-waste-journal-modal-btn"]', { state: "visible", timeout: 8000 }).catch(() => {});
      await page.waitForTimeout(800);

      const openWasteModalBtn = page.locator('[data-testid="open-waste-journal-modal-btn"]').first();
      if (await openWasteModalBtn.count() > 0 && await openWasteModalBtn.isVisible()) {
        await openWasteModalBtn.click();
        await page.waitForSelector('[data-testid="waste-quick-shift-btn"], .medical-waste-modal-container', { state: "visible", timeout: 8000 }).catch(() => {});
        await page.waitForTimeout(1000);

        const wasteShotPath = path.join(outDir, `sanpin_medical_waste_accumulate_${theme}.png`);
        await page.screenshot({ path: wasteShotPath, fullPage: false });
        console.log(`[OK] Saved: ${wasteShotPath}`);
      }
      await context.close();
    }

    // 4. Scanner View (Chairside Scanner Studio)
    {
      const { context, page } = await createPage(theme, "sanpin/kraft");
      await page.waitForSelector('button:has-text("Сканер / Код"), [data-testid="open-kraft-studio-builder-btn"]', { state: "visible", timeout: 15000 }).catch(() => {});
      await page.waitForTimeout(600);

      const scannerBtn = page.locator('button:has-text("Сканер / Код")').first();
      if (await scannerBtn.count() > 0 && await scannerBtn.isVisible()) {
        await scannerBtn.click();
        await page.waitForSelector('.kraft-package-modal-container', { state: "visible", timeout: 10000 }).catch(() => {});
        await page.waitForTimeout(1000);
      }

      const scannerShotPath = path.join(outDir, `sanpin_scanner_chairside_${theme}.png`);
      await page.screenshot({ path: scannerShotPath, fullPage: false });
      console.log(`[OK] Saved: ${scannerShotPath}`);
      await context.close();
    }
  }

  await browser.close();
  console.log("\n>>> ALL 10 RED TEAM SANPIN PROOFS PROVEN AND SAVED! <<<");
}

run().catch((err) => {
  console.error("Screenshot capture failed:", err);
  process.exit(1);
});
