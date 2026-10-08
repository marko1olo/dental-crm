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
    console.log(`Navigating to ${targetUrl} (${theme})...`);
    await page.goto(targetUrl, { waitUntil: "domcontentloaded", timeout: 25000 });

    for (let i = 0; i < 10; i++) {
      await page.waitForTimeout(600);
      const text = await page.evaluate(() => document.body.innerText);
      if (!text.includes("Загрузка системы") && text.length > 300) break;
    }

    try {
      const dismissBtn = page.locator('button:has-text("Больше не показывать"), button:has-text("Пропустить"), [aria-label="Закрыть тур"]').first();
      if (await dismissBtn.count() > 0 && await dismissBtn.isVisible()) {
        await dismissBtn.click({ force: true });
      }
    } catch (e) {}

    return { context, page };
  }

  const themes = ["light", "dark"];

  for (const theme of themes) {
    console.log(`\n=== Processing SanPin screenshots for theme: ${theme.toUpperCase()} ===`);
    const { context, page } = await createPage(theme, "sanpin");

    await page.waitForTimeout(1000);

    // 1. SanPin Kraft Packets Tab
    console.log(`Checking kraft packets tab...`);
    try {
      const kraftTab = page.locator('button:has-text("Крафт-пакеты"), [role="tab"]:has-text("Крафт"), button:has-text("Учет крафт-пакетов")').first();
      if (await kraftTab.count() > 0 && await kraftTab.isVisible()) {
        await kraftTab.click({ force: true });
        await page.waitForTimeout(800);
      }
    } catch (e) {
      console.warn("Could not switch to kraft tab", e);
    }

    const kraftShotPath = path.join(outDir, `sanpin_kraft_packets_registry_${theme}.png`);
    await page.screenshot({ path: kraftShotPath, fullPage: false });
    console.log(`Saved: ${kraftShotPath}`);

    // 2. Open Autoclave 257 Modal
    console.log(`Opening Autoclave 257 modal...`);
    try {
      const autoclaveBtn = page.locator('button:has-text("Автоклав"), button:has-text("Журнал автоклавирования"), [data-testid="open-autoclave-log-btn"], button:has-text("257/у")').first();
      if (await autoclaveBtn.count() > 0 && await autoclaveBtn.isVisible()) {
        await autoclaveBtn.click({ force: true });
        await page.waitForTimeout(800);

        // Screenshot Cycles Ledger
        const cyclesShotPath = path.join(outDir, `sanpin_autoclave_cycles_${theme}.png`);
        await page.screenshot({ path: cyclesShotPath, fullPage: false });
        console.log(`Saved: ${cyclesShotPath}`);

        // Switch to New Cycle tab
        const newCycleTab = page.locator('button:has-text("Новый цикл"), button:has-text("Зарегистрировать цикл")').first();
        if (await newCycleTab.count() > 0 && await newCycleTab.isVisible()) {
          await newCycleTab.click({ force: true });
          await page.waitForTimeout(800);

          const presetsShotPath = path.join(outDir, `sanpin_autoclave_new_cycle_presets_${theme}.png`);
          await page.screenshot({ path: presetsShotPath, fullPage: false });
          console.log(`Saved: ${presetsShotPath}`);
        }

        // Close Autoclave modal
        const closeBtn = page.locator('[aria-label="Закрыть журнал автоклавирования"], button:has-text("Закрыть")').first();
        if (await closeBtn.count() > 0 && await closeBtn.isVisible()) {
          await closeBtn.click({ force: true });
          await page.waitForTimeout(500);
        }
      }
    } catch (e) {
      console.warn("Could not capture autoclave modal", e);
    }

    // 3. Open Medical Waste Modal
    console.log(`Opening Medical Waste modal...`);
    try {
      const wasteTab = page.locator('button:has-text("Медотходы"), button:has-text("Отходы"), [role="tab"]:has-text("Отходы")').first();
      if (await wasteTab.count() > 0 && await wasteTab.isVisible()) {
        await wasteTab.click({ force: true });
        await page.waitForTimeout(800);
      }

      const wasteBtn = page.locator('button:has-text("Журнал отходов"), button:has-text("Учет и передача отходов"), [data-testid="open-medical-waste-journal-btn"]').first();
      if (await wasteBtn.count() > 0 && await wasteBtn.isVisible()) {
        await wasteBtn.click({ force: true });
        await page.waitForTimeout(800);

        const wasteShotPath = path.join(outDir, `sanpin_medical_waste_accumulate_${theme}.png`);
        await page.screenshot({ path: wasteShotPath, fullPage: false });
        console.log(`Saved: ${wasteShotPath}`);

        // Close modal
        const closeWasteBtn = page.locator('[aria-label="Закрыть окно учета медицинских отходов"], button:has-text("Закрыть")').first();
        if (await closeWasteBtn.count() > 0 && await closeWasteBtn.isVisible()) {
          await closeWasteBtn.click({ force: true });
          await page.waitForTimeout(500);
        }
      }
    } catch (e) {
      console.warn("Could not capture waste modal", e);
    }

    await context.close();

    // 4. Sterilization Scanner (visit or standalone view)
    console.log(`Navigating to scanner / chairside view...`);
    const { context: scannerContext, page: scannerPage } = await createPage(theme, "scanner");
    await scannerPage.waitForTimeout(1000);
    const scannerShotPath = path.join(outDir, `sanpin_scanner_chairside_${theme}.png`);
    await scannerPage.screenshot({ path: scannerShotPath, fullPage: false });
    console.log(`Saved: ${scannerShotPath}`);
    await scannerContext.close();
  }

  await browser.close();
  console.log("\nALL SANPIN INQUISITION SCREENSHOTS CAPTURED SUCCESSFULLY!");
}

run().catch((err) => {
  console.error("Screenshot capture failed:", err);
  process.exit(1);
});
