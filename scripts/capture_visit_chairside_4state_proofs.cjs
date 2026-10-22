const { chromium } = require("playwright");
const fs = require("node:fs");
const path = require("node:path");

const PROOFS_DIR = path.resolve(__dirname, "../docs/proofs/visit");
if (!fs.existsSync(PROOFS_DIR)) {
  fs.mkdirSync(PROOFS_DIR, { recursive: true });
}

async function capture() {
  const browser = await chromium.launch({
    headless: true,
    executablePath: "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
    args: ["--no-sandbox", "--disable-gpu", "--disable-dev-shm-usage"],
  });

  const targets = [
    {
      name: "chairside_visit_live_pc_light.png",
      legacyName: "visit_chairside_pc_light_1440x900.png",
      width: 1440,
      height: 900,
      isMobile: false,
      theme: "light",
    },
    {
      name: "chairside_visit_live_pc_dark.png",
      legacyName: "visit_chairside_pc_dark_1440x900.png",
      width: 1440,
      height: 900,
      isMobile: false,
      theme: "dark",
    },
    {
      name: "chairside_visit_live_mobile_light.png",
      legacyName: "visit_chairside_mobile_light_390x844.png",
      width: 390,
      height: 844,
      isMobile: true,
      theme: "light",
    },
    {
      name: "chairside_visit_live_mobile_dark.png",
      legacyName: "visit_chairside_mobile_dark_390x844.png",
      width: 390,
      height: 844,
      isMobile: true,
      theme: "dark",
    },
  ];

  for (const t of targets) {
    console.log(`\n--- Capturing ${t.name} (${t.width}x${t.height}, ${t.theme}) ---`);
    const context = await browser.newContext({
      viewport: { width: t.width, height: t.height },
      isMobile: t.isMobile,
      hasTouch: t.isMobile,
      deviceScaleFactor: 1,
    });

    await context.addInitScript(({ theme }) => {
      localStorage.setItem("dente_theme", theme);
      localStorage.setItem("dente_theme_mode", theme);
      localStorage.setItem("dente_tour_completed", "true");
      localStorage.setItem("dente_tour_dismissed", "true");
      localStorage.setItem("dente_demo_banner_dismissed", "true");
      localStorage.setItem("dente_onboarding_completed", "true");
    }, { theme: t.theme });

    const page = await context.newPage();
    let navigated = false;
    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        await page.goto("http://127.0.0.1:5173/?demo=true#visit", {
          waitUntil: "commit",
          timeout: 35000,
        });
        await page.waitForSelector('.workspace-shell, .app-shell, .app-mobile-shell, nav', { state: 'visible', timeout: 30000 });
        await page.waitForFunction(
          () => !document.querySelector('.boot-state') && !document.body.innerText.includes('Загрузка CRM') && document.body.innerText.length > 200,
          { timeout: 30000 }
        );
        navigated = true;
        break;
      } catch (err) {
        console.warn(`Attempt ${attempt} for ${t.name} failed: ${err.message}. Retrying in 2s...`);
        if (attempt === 3) throw err;
        await page.waitForTimeout(2000);
      }
    }
    await page.waitForTimeout(1000);

    // Ensure theme attributes are properly stamped with retry if navigation settles
    for (let attempt = 0; attempt < 5; attempt++) {
      try {
        await page.evaluate((theme) => {
          localStorage.setItem("dente_theme_mode", theme);
          localStorage.setItem("dente-theme", theme);
          localStorage.setItem("theme", theme);
          if (window.__useThemeStore) {
            window.__useThemeStore.getState().setThemeMode(theme);
          }
          document.documentElement.setAttribute("data-theme", theme);
          document.body.setAttribute("data-theme", theme);
          const isDark = theme === "dark";
          document.documentElement.classList.toggle("dark", isDark);
          document.documentElement.classList.toggle("light", !isDark);
          document.body.classList.toggle("dark", isDark);
          document.body.classList.toggle("light", !isDark);
          document.documentElement.style.colorScheme = isDark ? "dark" : "light";
        }, t.theme);
        break;
      } catch (_) {
        await page.waitForTimeout(1000);
      }
    }
    await page.waitForTimeout(500);

    // If intake cockpit is showing, select next or first patient
    const startNextBtn = page.locator('#btn-intake-start-next');
    const patientItem = page.locator('.intake-queue-item, [data-testid^="queue-item-"]').first();
    try {
      await page.waitForSelector('#btn-intake-start-next, .intake-queue-item, [data-testid^="queue-item-"], .odontogram-container, .mobile-chairside-container', { timeout: 10000 });
    } catch (_) {}

    if (await startNextBtn.isVisible()) {
      console.log("Clicking #btn-intake-start-next...");
      await startNextBtn.click();
      await page.waitForTimeout(2000);
    } else if (await patientItem.isVisible()) {
      console.log("Clicking first queue patient...");
      await patientItem.click();
      await page.waitForTimeout(2000);
    }

    // Ensure we are on visit view
    for (let attempt = 0; attempt < 5; attempt++) {
      try {
        await page.evaluate(() => {
          if (window.__useAppStore) {
            window.__useAppStore.getState().setCurrentView("visit");
          }
          // Clean up any transient toast notifications
          document.querySelectorAll('.global-toast, .toast, .sa-toast, [data-testid="global-toast"], [role="alert"]').forEach(el => el.remove());
        });
        break;
      } catch (_) {
        await page.waitForTimeout(1000);
      }
    }
    await page.waitForTimeout(1000);

    // Ensure clinical interface is actually rendered and visible before taking the screenshot
    try {
      await page.waitForSelector('.odontogram-container, .mobile-chairside-container, [data-testid="mobile-chairside-layout"], .visit-view, .app-mobile-tab-bar, [data-testid="btn-complete-visit-header"]', { state: "visible", timeout: 15000 });
    } catch (_) {}
    await page.waitForTimeout(1500);

    const outPath = path.join(PROOFS_DIR, t.name);
    await page.screenshot({ path: outPath, fullPage: false });
    const stat = fs.statSync(outPath);
    console.log(`Saved ${t.name}: ${stat.size} bytes`);

    if (t.legacyName) {
      const legacyPath = path.join(PROOFS_DIR, t.legacyName);
      fs.copyFileSync(outPath, legacyPath);
      console.log(`Copied ${t.name} -> ${t.legacyName}`);
    }

    if (stat.size < 30000) {
      throw new Error(`CRITICAL DEFECT: ${t.name} is under 30KB (${stat.size} bytes)!`);
    }

    await context.close();
  }

  await browser.close();
  console.log("\nAll 4 state screenshots captured successfully!");
}

capture().catch((err) => {
  console.error("Capture failed:", err);
  process.exit(1);
});
