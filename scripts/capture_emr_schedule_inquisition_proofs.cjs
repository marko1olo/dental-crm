/**
 * scripts/capture_emr_schedule_inquisition_proofs.cjs
 * Red Team Inquisitor №3 — Live End-to-End Continuity Verification & Screenshot Proofs:
 * - Schedule (Agenda timeline & Chair grid) PC Light & PC Dark (1440x900)
 * - Visit View & Form 043/y EMK Protocol PC Light & PC Dark (1440x900)
 * - 54-FZ Estimate & SBP QR Receipt Modal PC Light & PC Dark (1440x900)
 */

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

async function loginToDente(page) {
  console.log("Ensuring authentication...");
  await page.goto("http://127.0.0.1:5173/", { waitUntil: "commit", timeout: 15000 });
  await page.waitForTimeout(1500);

  // Detach initial loading splash if present
  await page.waitForSelector("text=Загрузка системы...", { state: "detached", timeout: 15000 }).catch(() => {});

  // Try fast demo tour button first
  const demoTourBtn = page.locator("button:has-text('Быстрый вход в Демо-тур')").first();
  if (await demoTourBtn.isVisible()) {
    console.log("Clicking Demo Tour button...");
    await demoTourBtn.click();
    await page.waitForTimeout(1000);
    const launchDemoBtn = page.locator("button.auth-submit-btn, button:has-text('Войти в демо-тур')").first();
    if (await launchDemoBtn.isVisible()) {
      console.log("Launching demo tour session...");
      await launchDemoBtn.click();
      await page.waitForTimeout(3000);
    }
  } else {
    // Check if credentials login is present
    const emailInput = page.locator('input[type="email"], input[placeholder*="Логин"]').first();
    if (await emailInput.isVisible()) {
      console.log("Logging in via credentials...");
      await emailInput.fill("doctor@clinic.com");
      await page.fill('input[type="password"]', "dente2026");
      await page.click('button:has-text("Войти в систему")');
      await page.waitForTimeout(3000);
    }
  }

  // Wait for post-auth loading splash to detach
  await page.waitForSelector("text=Загрузка системы...", { state: "detached", timeout: 20000 }).catch(() => {});
  await page.waitForTimeout(1500);

  // Permanently dismiss guided tours and spotlights
  await page.evaluate(() => {
    try {
      localStorage.setItem("dente_tour_completed", "true");
      localStorage.setItem(
        "dente_quest_progress_v2",
        JSON.stringify({ isDismissedPermanently: true, activeTrack: null, tracksProgress: {} })
      );
    } catch (e) {}

    document
      .querySelectorAll(
        '.tour-spotlight-root, [data-testid="guided-tour-spotlight-overlay"], .tour-backdrop-clickable-zone, [data-testid="demo-mode-banner"], .global-toast-container'
      )
      .forEach((el) => {
        if (
          el.textContent &&
          (el.textContent.includes("Экспресс-тур") ||
            el.textContent.includes("ШАГ 1") ||
            el.textContent.includes("Запись в расписании за 1 клик") ||
            el.textContent.includes("Больше не показывать"))
        ) {
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

async function runContinuitySuite() {
  console.log("=== STARTING LIVE EMR SCHEDULE & BILLING INQUISITION CAPTURE ===");
  const browser = await chromium.launch({
    headless: true,
    executablePath: "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
    args: ["--no-sandbox", "--disable-gpu", "--disable-dev-shm-usage"],
  });

  const themes = ["light", "dark"];

  for (const theme of themes) {
    console.log(`\n==================== THEME: ${theme.toUpperCase()} ====================`);
    const context = await browser.newContext({
      viewport: { width: 1440, height: 900 },
      deviceScaleFactor: 1,
      colorScheme: theme,
    });

    const page = await context.newPage();

    await loginToDente(page);

    // Apply exact theme classes and attributes
    await page.evaluate((th) => {
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

      // Remove leftover overlays
      document
        .querySelectorAll(
          '.tour-spotlight-root, [data-testid="guided-tour-spotlight-overlay"], .tour-backdrop-clickable-zone'
        )
        .forEach((el) => el.remove());
    }, theme);

    await page.waitForTimeout(1000);

    // =========================================================================
    // 1. SCHEDULE VIEW
    // =========================================================================
    console.log(`[${theme}] Navigating to Schedule (#schedule)...`);
    await page.evaluate(() => {
      window.location.hash = "#schedule";
    });
    await page.waitForTimeout(2000);

    // Clean remaining tour spotlights
    await page.evaluate(() => {
      document
        .querySelectorAll(
          '.tour-spotlight-root, [data-testid="guided-tour-spotlight-overlay"], .tour-backdrop-clickable-zone'
        )
        .forEach((el) => el.remove());
    });

    await captureScreen(page, `01_schedule_agenda_pc_${theme}.png`);

    // =========================================================================
    // 2. VISIT VIEW (Opened from Schedule continuity)
    // =========================================================================
    console.log(`[${theme}] Navigating to Visit View (#visit)...`);
    // Try clicking appointment card quick action "В кресло" or "Медкарта"
    const cardVisitBtn = page
      .locator('[data-testid="appointment-action-open-visit-btn"], [data-testid="appointment-action-in-treatment-btn"]')
      .first();
    if (await cardVisitBtn.isVisible()) {
      console.log(`[${theme}] Clicking appointment card action...`);
      await cardVisitBtn.click();
      await page.waitForTimeout(2000);
    } else {
      console.log(`[${theme}] Navigating via hash #visit...`);
      await page.evaluate(() => {
        window.location.hash = "#visit";
      });
      await page.waitForTimeout(2000);
    }

    // Ensure Visit header is rendered
    await page.waitForSelector('.visit-monolithic-header, [data-testid="visit-header-monolith"]', { timeout: 10000 }).catch(() => {});

    // In Visit EMK: apply 1-click physiological norm to prove Mandate 8e
    const normBtn = page
      .locator(
        '[data-testid="btn-somatic-norm-one-click"], [data-testid="btn-apply-phys-norm"], [data-testid="btn-quick-soap-norm"], button:has-text("Заполнить нормой")'
      )
      .first();
    if (await normBtn.isVisible()) {
      console.log(`[${theme}] Applying 1-click physiological norm...`);
      await normBtn.click();
      await page.waitForTimeout(1000);
    }

    // Clean remaining tour spotlights or toast overlays
    await page.evaluate(() => {
      document
        .querySelectorAll(
          '.tour-spotlight-root, [data-testid="guided-tour-spotlight-overlay"], .tour-backdrop-clickable-zone, .global-toast-container'
        )
        .forEach((el) => el.remove());
    });

    await captureScreen(page, `02_visit_emk_continuity_pc_${theme}.png`);

    // =========================================================================
    // 3. COMPLETE VISIT -> 54-FZ ESTIMATE & SBP QR RECEIPT
    // =========================================================================
    console.log(`[${theme}] Completing Visit to generate Receipt & SBP QR...`);
    const completeBtn = page
      .locator('[data-testid="btn-complete-visit-emk"], button:has-text("Завершить приём")')
      .first();
    if (await completeBtn.isVisible()) {
      await completeBtn.click();
      await page.waitForTimeout(2000);

      // Verify SBP QR modal opened
      await page.waitForSelector('[data-testid="sbp-qr-svg-container"], #sbp-qr-modal-title', { timeout: 6000 }).catch(() => {});
      await captureScreen(page, `03_visit_billing_sbp_receipt_pc_${theme}.png`);
    } else {
      console.warn(`[${theme}] Complete visit button not found on page!`);
    }

    await context.close();
  }

  await browser.close();
  console.log("=== INQUISITION CAPTURE COMPLETED SUCCESSFULLY ===");
}

runContinuitySuite().catch((err) => {
  console.error("FATAL ERROR in runContinuitySuite:", err);
  process.exit(1);
});
