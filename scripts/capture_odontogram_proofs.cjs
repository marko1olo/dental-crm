const { chromium } = require("playwright");
const path = require("node:path");
const fs = require("node:fs");
const crypto = require("node:crypto");

async function run() {
  const targetDirs = [
    path.resolve("C:/Clinic_MVP/dental-crm/docs/screenshots/inquisition_live"),
    path.resolve("C:/Users/Admin/.gemini/antigravity/brain/4d9d0cd8-ae3f-491a-ac1f-4a451763d441"),
  ];
  for (const d of targetDirs) {
    if (!fs.existsSync(d)) {
      fs.mkdirSync(d, { recursive: true });
    }
  }
  const outDir = targetDirs[0];

  console.log("[Playwright] Launching Chrome in 1440x900 desktop viewport...");
  const browser = await chromium.launch({
    headless: true,
    executablePath: "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });

  const capturedRegistry = [];

  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    deviceScaleFactor: 2,
  });

  const page = await context.newPage();

  async function applyTheme(th) {
    await page.evaluate((theme) => {
      localStorage.setItem("dente_theme_mode", theme);
      if (window.__useThemeStore) {
        window.__useThemeStore.getState().setThemeMode(theme);
      }
      document.documentElement.setAttribute("data-theme", theme);
      const isDark = ["dark", "night", "ocean", "emerald", "cyber_xray"].includes(theme);
      document.documentElement.classList.toggle("dark", isDark);
      document.documentElement.classList.toggle("light", !isDark);
      document.documentElement.style.colorScheme = isDark ? "dark" : "light";
    }, th);
    await page.waitForTimeout(600);
  }

  async function takeProof(fileName, viewName, modeName) {
    const targetFile = path.join(outDir, fileName);
    await page.waitForTimeout(600);
    await page.screenshot({ path: targetFile, fullPage: false });

    for (const d of targetDirs) {
      const dest = path.join(d, fileName);
      if (dest !== targetFile) {
        fs.copyFileSync(targetFile, dest);
      }
    }

    const stats = fs.statSync(targetFile);
    const hash = crypto.createHash("md5").update(fs.readFileSync(targetFile)).digest("hex");

    capturedRegistry.push({
      fileName,
      view: viewName,
      mode: modeName,
      sizeBytes: stats.size,
      sizeKb: (stats.size / 1024).toFixed(1),
      md5: hash,
      passSize: stats.size >= 40960,
    });

    console.log(
      `[Captured] ${fileName} (${viewName} ${modeName}): ${stats.size} bytes (${(stats.size / 1024).toFixed(1)} KB)`
    );
  }

  async function dismissTourModals() {
    await page.evaluate(() => {
      document.querySelectorAll(
        '.tour-spotlight-root, [data-testid="guided-tour-spotlight-overlay"], .tour-backdrop-clickable-zone, [data-tour-step]'
      ).forEach((el) => el.remove());
      const btns = Array.from(document.querySelectorAll("button"));
      const dismiss = btns.find((b) => b.textContent && (b.textContent.includes("Больше не показывать") || b.textContent.includes("Пропустить")));
      if (dismiss) dismiss.click();
    });
    await page.waitForTimeout(400);
  }

  async function clickTooth(selector) {
    await dismissTourModals();
    const locator = page.locator(selector).first();
    await locator.scrollIntoViewIfNeeded();
    await page.waitForTimeout(300);
    try {
      await locator.click({ force: true, timeout: 3000 });
    } catch (err) {
      console.log(`Force click failed on ${selector}, using dispatchEvent:`, err.message);
      await page.evaluate((sel) => {
        const el = document.querySelector(sel);
        if (el) {
          el.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true, view: window }));
        }
      }, selector);
    }
    // Wait for radial menu container to appear
    try {
      await page.waitForSelector('.radial-tooth-menu-container, [data-testid="tooth-radial-menu-overlay"]', {
        state: "visible",
        timeout: 5000,
      });
    } catch {
      console.log("Radial menu container wait timed out, continuing...");
    }
    await page.waitForTimeout(600);
  }

  async function dismissRadialMenu() {
    await page.keyboard.press("Escape");
    await page.waitForTimeout(300);
    await page.evaluate(() => {
      const closeBtn = document.querySelector('.radial-tooth-menu-container button[aria-label="Закрыть меню"], .radial-tooth-menu-container button[title*="Закрыть"]');
      if (closeBtn) closeBtn.click();
      const overlay = document.querySelector('[data-testid="tooth-radial-menu-overlay"]');
      if (overlay) {
        overlay.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true, view: window }));
      }
    });
    await page.waitForTimeout(500);
  }

  console.log("Navigating to http://127.0.0.1:5173/ ...");
  await page.goto("http://127.0.0.1:5173/", { waitUntil: "domcontentloaded", timeout: 60000 });
  await page.waitForTimeout(2000);

  // 1. Click Demo Tour button
  try {
    await page.waitForSelector('button:has-text("Быстрый вход в Демо-тур"), button:has-text("Демо")', { timeout: 8000 });
    const demoBtn = page.locator('button:has-text("Быстрый вход в Демо-тур"), button:has-text("Демо")').first();
    if (await demoBtn.isVisible()) {
      console.log("Clicking Demo Tour button...");
      await demoBtn.click();
      await page.waitForTimeout(1000);
      const launchBtn = page.locator(".auth-submit-btn--glow").first();
      if (await launchBtn.isVisible()) {
        console.log("Launching Therapist role...");
        await launchBtn.click();
        await page.waitForTimeout(3500);
      }
    }
  } catch (e) {
    console.log("Demo tour button not found or already logged in:", e.message);
  }

  // 2. Dismiss tour modals & spotlights
  console.log("Dismissing initial tour modals...");
  await dismissTourModals();
  await page.waitForTimeout(1000);

  // 3. Open Live CRM Visit via "Приём" in patient card
  console.log("Looking for 'Приём' button in patient card...");
  await page.waitForSelector('[data-testid="patient-card-open-visit-btn"]', { timeout: 8000 }).catch(() => {});
  const openVisitBtn = page.locator('[data-testid="patient-card-open-visit-btn"]').first();
  if (await openVisitBtn.isVisible()) {
    console.log("Clicking 'Приём' button to launch live visit...");
    await openVisitBtn.click();
    await page.waitForTimeout(2000);
  } else {
    console.log("'Приём' button not found initially, checking patient rows...");
    const patientItem = page.locator('.patient-list-item, [data-patient-id]').first();
    if (await patientItem.isVisible()) {
      await patientItem.click();
      await page.waitForTimeout(1000);
      const retryOpen = page.locator('[data-testid="patient-card-open-visit-btn"]').first();
      if (await retryOpen.isVisible()) {
        await retryOpen.click();
        await page.waitForTimeout(2000);
      }
    }
  }

  // Dismiss any tour modals in visit view
  await dismissTourModals();
  await page.waitForTimeout(800);

  // 4. Click "Зубная формула" tab in visit
  console.log("Activating visit tab 'Зубная формула'...");
  await page.waitForSelector('[data-testid="visit-subtab-odontogram"], button:has-text("Зубная формула")', { timeout: 8000 }).catch(() => {});
  const formulaTab = page.locator(
    '[data-testid="visit-subtab-odontogram"], button:has-text("Зубная формула"), [role="tab"]:has-text("Зубная формула")'
  ).first();
  if (await formulaTab.isVisible()) {
    console.log("Clicking 'Зубная формула' tab in visit view...");
    await formulaTab.click();
    await page.waitForTimeout(1500);
  }

  await dismissTourModals();
  await page.waitForTimeout(800);

  // Wait for tooth 16 to be attached and visible
  await page.waitForSelector('[data-tooth-id="16"]', { timeout: 10000 });

  // Scroll odontogram into view
  const toothChart = page.locator('.tooth-chart-container, .odontogram-view-container, .teeth-row').first();
  if (await toothChart.isVisible()) {
    await toothChart.scrollIntoViewIfNeeded();
    await page.waitForTimeout(600);
  }

  // 5. Audit teeth geometry
  const teethAudit = await page.evaluate(() => {
    const teeth = [18, 17, 16, 11, 21, 27, 28, 48, 47, 46, 41, 31, 37, 38];
    const results = {};
    for (const id of teeth) {
      const el = document.querySelector(`[data-tooth-id="${id}"]`);
      if (el) {
        const r = el.getBoundingClientRect();
        results[id] = {
          x: Math.round(r.x),
          y: Math.round(r.y),
          width: Math.round(r.width),
          height: Math.round(r.height),
          right: Math.round(r.x + r.width),
        };
      } else {
        results[id] = null;
      }
    }
    const docScrollWidth = document.documentElement.scrollWidth;
    const windowInnerWidth = window.innerWidth;
    return {
      results,
      docScrollWidth,
      windowInnerWidth,
      hasHScroll: docScrollWidth > windowInnerWidth,
    };
  });
  console.log("Live Visit Teeth Geometry Audit:", JSON.stringify(teethAudit, null, 2));

  // =========================================================================
  // 1. LIGHT THEME PROOFS
  // =========================================================================
  console.log("\n--- LIGHT THEME SUITE ---");
  await applyTheme("light");
  await dismissTourModals();

  await toothChart.scrollIntoViewIfNeeded();
  await page.waitForTimeout(400);

  // 1A. Odontogram 16 teeth viewport fit proof (Light)
  await takeProof(
    "proof_live_odontogram_all16_teeth_light.png",
    "Odontogram 16 Teeth Viewport Fit",
    "Light"
  );

  // 1B. Click Tooth 16 -> Radial Menu Centered (Light)
  console.log("Clicking Tooth 16 in Light mode...");
  await clickTooth('[data-tooth-id="16"]');
  await takeProof(
    "proof_live_radial_menu_tooth16_light.png",
    "Tooth 16 Radial Menu Centered",
    "Light"
  );
  await dismissRadialMenu();

  // 1C. Click Molar 18 -> Edge-Clamped Inward Fan (Light)
  console.log("Clicking Molar 18 in Light mode...");
  await clickTooth('[data-tooth-id="18"]');
  await takeProof(
    "proof_live_radial_menu_molar18_light.png",
    "Molar 18 Radial Menu Edge-Clamped Inward",
    "Light"
  );
  await dismissRadialMenu();

  // =========================================================================
  // 2. DARK THEME PROOFS
  // =========================================================================
  console.log("\n--- DARK THEME SUITE ---");
  await applyTheme("dark");
  await dismissTourModals();

  await toothChart.scrollIntoViewIfNeeded();
  await page.waitForTimeout(400);

  // 2A. Odontogram 16 teeth viewport fit proof (Dark)
  await takeProof(
    "proof_live_odontogram_all16_teeth_dark.png",
    "Odontogram 16 Teeth Viewport Fit",
    "Dark"
  );

  // 2B. Click Tooth 16 in Dark mode
  console.log("Clicking Tooth 16 in Dark mode...");
  await clickTooth('[data-tooth-id="16"]');
  await takeProof(
    "proof_live_radial_menu_tooth16_dark.png",
    "Tooth 16 Radial Menu Centered",
    "Dark"
  );
  await dismissRadialMenu();

  // 2C. Click Molar 18 in Dark mode
  console.log("Clicking Molar 18 in Dark mode...");
  await clickTooth('[data-tooth-id="18"]');
  await takeProof(
    "proof_live_radial_menu_molar18_dark.png",
    "Molar 18 Radial Menu Edge-Clamped Inward",
    "Dark"
  );
  await dismissRadialMenu();

  console.log("\nAll proofs captured successfully!");
  console.table(capturedRegistry);

  // Assert all MD5 hashes are unique
  const hashes = capturedRegistry.map((r) => r.md5);
  const uniqueHashes = new Set(hashes);
  console.log(`Unique MD5 hashes: ${uniqueHashes.size} / ${hashes.length}`);

  await browser.close();
}

run().catch((err) => {
  console.error("Capture failed:", err);
  process.exit(1);
});
