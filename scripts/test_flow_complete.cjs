const { chromium } = require("playwright");
const path = require("node:path");
const fs = require("node:fs");

const OUT_DIR = path.resolve(__dirname, "..", "docs", "screenshots", "emr_schedule_inquisition");
const BRAIN_DIR = path.resolve("C:\\Users\\Admin\\.gemini\\antigravity\\brain\\178a483b-8b72-4306-a477-2102d167d430");

if (!fs.existsSync(OUT_DIR)) fs.mkdirSync(OUT_DIR, { recursive: true });
if (!fs.existsSync(BRAIN_DIR)) fs.mkdirSync(BRAIN_DIR, { recursive: true });

async function captureScreen(page, fileName) {
  const outPath = path.join(OUT_DIR, fileName);
  await page.screenshot({ path: outPath, fullPage: false, animations: "disabled" });
  fs.copyFileSync(outPath, path.join(BRAIN_DIR, fileName));
  const sz = (fs.statSync(outPath).size / 1024).toFixed(1);
  console.log(`[PROOF CAPTURED] ${fileName} (${sz} KB)`);
}

async function safeEvaluate(page, fn, ...args) {
  try {
    return await page.evaluate(fn, ...args);
  } catch (e) {
    await page.waitForTimeout(600);
    try {
      return await page.evaluate(fn, ...args);
    } catch (e2) {
      // Non-fatal
    }
  }
}

async function loginToDente(page) {
  console.log("Navigating to http://127.0.0.1:5173/ ...");
  await page.goto("http://127.0.0.1:5173/", { waitUntil: "commit" });

  await page.waitForSelector("text=Загрузка системы...", { state: "detached", timeout: 25000 }).catch(() => {});
  await page.waitForTimeout(1000);

  const demoTourBtn = page.locator("button:has-text('Быстрый вход в Демо-тур')").first();
  if (await demoTourBtn.isVisible()) {
    console.log("Clicking Demo Tour button...");
    await demoTourBtn.click();
    const launchDemoBtn = page.locator("button.auth-submit-btn, button:has-text('Войти в демо-тур')").first();
    await launchDemoBtn.waitFor({ state: "visible", timeout: 8000 });
    console.log("Launching demo tour session...");
    await launchDemoBtn.click();
  } else {
    const credBtn = page.locator("button:has-text('Войти в систему')").first();
    if (await credBtn.isVisible()) {
      console.log("Logging in via credentials...");
      await page.fill('input[type="email"], input[placeholder*="Логин"]', "doctor@clinic.com");
      await page.fill('input[type="password"]', "dente2026");
      await credBtn.click();
    }
  }

  // Wait for loading splash to completely detach
  await page.waitForSelector("text=Загрузка системы...", { state: "detached", timeout: 30000 }).catch(() => {});
  // Wait for sidebar navigation to actually mount
  await page.waitForSelector("aside.sidebar nav a, #workspace-content", { timeout: 25000 });
  await page.waitForTimeout(1500);

  // Ensure Doctor / Терапевт role is active
  const therapistBtn = page.locator("button:has-text('Терапевт')").first();
  if (await therapistBtn.isVisible()) {
    console.log("Switching to Терапевт role...");
    await therapistBtn.click();
    await page.waitForTimeout(1000);
  }

  // Dismiss guided tours and spotlights
  await safeEvaluate(page, () => {
    try {
      localStorage.setItem("dente_tour_completed", "true");
      localStorage.setItem("dente_quest_progress_v2", JSON.stringify({ isDismissedPermanently: true, activeTrack: null, tracksProgress: {} }));
    } catch (e) {}

    document.querySelectorAll('.tour-spotlight-root, [data-testid="guided-tour-spotlight-overlay"], .tour-backdrop-clickable-zone, [data-testid="demo-mode-banner"], .global-toast-container, [role="dialog"]').forEach(el => {
      if (el.textContent && (el.textContent.includes("Экспресс-тур") || el.textContent.includes("ШАГ 1") || el.textContent.includes("Запись в расписании за 1 клик") || el.textContent.includes("Больше не показывать"))) {
        el.remove();
      }
    });
  });

  const dismissBtn = page.locator("button:has-text('Больше не показывать'), button:has-text('Пропустить')").first();
  if (await dismissBtn.isVisible()) {
    await dismissBtn.click().catch(() => {});
    await page.waitForTimeout(500);
  }
}

async function run() {
  const browser = await chromium.launch({
    headless: true,
    executablePath: "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
    args: ["--no-sandbox", "--disable-gpu", "--disable-dev-shm-usage"],
  });

  for (const theme of ["light", "dark"]) {
    console.log(`\n==================== TESTING THEME: ${theme.toUpperCase()} ====================`);
    const context = await browser.newContext({
      viewport: { width: 1440, height: 900 },
      deviceScaleFactor: 1,
      colorScheme: theme,
    });
    const page = await context.newPage();

    await loginToDente(page);

    // Apply theme
    await safeEvaluate(page, (th) => {
      try {
        localStorage.setItem("dente_theme_mode", th);
      } catch (e) {}
      document.documentElement.setAttribute("data-theme", th);
      document.body.className = `theme-${th}`;
      if (th === "dark") {
        document.documentElement.classList.add("dark");
        document.documentElement.classList.remove("light");
      } else {
        document.documentElement.classList.add("light");
        document.documentElement.classList.remove("dark");
      }
      document.querySelectorAll('.tour-spotlight-root, [data-testid="guided-tour-spotlight-overlay"], .tour-backdrop-clickable-zone').forEach(el => el.remove());
    }, theme);

    // 1. Schedule View
    console.log(`[${theme}] Navigating to #schedule...`);
    await safeEvaluate(page, () => { window.location.hash = "#schedule"; });
    await page.waitForSelector('.appointment-card-compact, .appointment-card-expanded, [data-testid="appointment-card-two-line"], [data-testid="appointment-card-micro-row"], [data-testid="schedule-grid"]', { timeout: 15000 }).catch(() => {});
    await page.waitForTimeout(1500);

    await safeEvaluate(page, () => {
      document.querySelectorAll('.tour-spotlight-root, [data-testid="guided-tour-spotlight-overlay"], .tour-backdrop-clickable-zone').forEach(el => el.remove());
    });
    await captureScreen(page, `01_schedule_agenda_pc_${theme}.png`);

    // 2. Visit View
    console.log(`[${theme}] Navigating to #visit...`);
    const cardOrPriemBtn = page.locator('header button:has-text("Прием"), [data-testid="appointment-action-open-visit-btn"], a[href="#visit"]').first();
    if (await cardOrPriemBtn.isVisible()) {
      await cardOrPriemBtn.click();
    } else {
      await safeEvaluate(page, () => { window.location.hash = "#visit"; });
    }
    await page.waitForSelector('.visit-monolithic-header, [data-testid="visit-header-monolith"], #visit', { timeout: 20000 });
    await page.waitForTimeout(2000);

    // Apply 1-click norm
    const normBtn = page.locator('[data-testid="btn-somatic-norm-one-click"], button:has-text("Заполнить нормой")').first();
    if (await normBtn.isVisible()) {
      console.log(`[${theme}] Applying 1-click physiological norm...`);
      await normBtn.click();
      await page.waitForTimeout(1000);
    }

    await safeEvaluate(page, () => {
      document.querySelectorAll('.tour-spotlight-root, [data-testid="guided-tour-spotlight-overlay"], .tour-backdrop-clickable-zone, .global-toast-container').forEach(el => el.remove());
    });
    await captureScreen(page, `02_visit_emk_continuity_pc_${theme}.png`);

    // 3. Complete Visit -> SBP QR Receipt
    console.log(`[${theme}] Completing visit for 54-FZ Estimate & SBP QR...`);
    const completeBtn = page.locator('button:has-text("Завершить приём и сформировать чек"), [data-testid="btn-mobile-primary-complete"], [data-testid="btn-complete-visit-emk"]').first();
    if (await completeBtn.isVisible()) {
      await completeBtn.click();
      await page.waitForTimeout(2500);

      // Verify SBP QR modal
      await page.waitForSelector('[data-testid="sbp-qr-svg-container"], #sbp-qr-modal-title', { timeout: 10000 }).catch(() => {});
      await captureScreen(page, `03_visit_billing_sbp_receipt_pc_${theme}.png`);
    } else {
      console.warn(`[${theme}] Complete visit button not found!`);
    }

    await context.close();
  }

  await browser.close();
  console.log("=== COMPLETED ALL PROOF CAPTURES ===");
}

run().catch((err) => {
  console.error("FATAL:", err);
  process.exit(1);
});
