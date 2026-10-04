const { chromium } = require("playwright");
const path = require("node:path");
const fs = require("node:fs");

const ARTIFACT_DIR = "C:\\Users\\Admin\\.gemini\\antigravity\\brain\\6d815c86-c779-4f38-bbd1-0f0abe81c076";
const SUBAGENT_ARTIFACT_DIR = "C:\\Users\\Admin\\.gemini\\antigravity\\brain\\fb1c0ccb-c887-45ab-b43d-1a2b76c2c46f";
const DOCS_DIR = path.resolve("docs/screenshots/inquisition_live");

if (!fs.existsSync(DOCS_DIR)) {
  fs.mkdirSync(DOCS_DIR, { recursive: true });
}
if (!fs.existsSync(ARTIFACT_DIR)) {
  fs.mkdirSync(ARTIFACT_DIR, { recursive: true });
}
if (!fs.existsSync(SUBAGENT_ARTIFACT_DIR)) {
  fs.mkdirSync(SUBAGENT_ARTIFACT_DIR, { recursive: true });
}

async function saveProof(page, basename) {
  const docsPath = path.join(DOCS_DIR, basename);
  const artifactPath = path.join(ARTIFACT_DIR, basename);
  const subagentPath = path.join(SUBAGENT_ARTIFACT_DIR, basename);
  await page.screenshot({ path: docsPath });
  fs.copyFileSync(docsPath, artifactPath);
  fs.copyFileSync(docsPath, subagentPath);
  console.log(`Saved screenshot: ${basename}`);
}

async function openDemoVisit(page) {
  const port = process.env.VITE_PORT || "5173";
  console.log(`Navigating to http://127.0.0.1:${port}/ ...`);
  await page.goto(`http://127.0.0.1:${port}/`);
  await page.waitForTimeout(2000);

  // Demo Login
  const demoBtn = page.locator("text=Быстрый вход в Демо-тур").first();
  if (await demoBtn.isVisible()) {
    await demoBtn.click();
    await page.waitForTimeout(1000);
  }

  const launchBtn = page.locator(".auth-submit-btn--glow").first();
  if (await launchBtn.isVisible()) {
    await launchBtn.click();
    await page.waitForTimeout(2500);
  }

  const skipTour = page.locator('button:has-text("Больше не показывать"), button:has-text("Пропустить")').first();
  if (await skipTour.isVisible()) {
    await skipTour.click();
    await page.waitForTimeout(800);
  }

  await page.evaluate(() => {
    localStorage.setItem("dental-crm:onboarding:v1", JSON.stringify({ completed: true, dismissed: true }));
    localStorage.setItem("dente_tour_completed", "true");
    document.querySelectorAll('.tour-spotlight-root, [data-testid="guided-tour-spotlight-overlay"], .tour-backdrop-clickable-zone, [data-testid="demo-mode-banner"]').forEach((el) => el.remove());
  });

  // Direct navigation to active visit view
  const navVisit = page.locator('button:has-text("Прием"), a[href*="#visit"], [data-testid="nav-visit"]').first();
  if (await navVisit.isVisible()) {
    await navVisit.click();
    await page.waitForTimeout(1200);
  } else {
    await page.evaluate(() => {
      window.location.hash = "#visit";
      window.dispatchEvent(new HashChangeEvent("hashchange"));
    });
    await page.waitForTimeout(1200);
  }

  const dismissVisitTour = page.locator('button:has-text("Больше не показывать"), button:has-text("Пропустить")').first();
  if (await dismissVisitTour.isVisible()) {
    await dismissVisitTour.click();
    await page.waitForTimeout(500);
  }

  await page.evaluate(() => {
    document.querySelectorAll('.tour-spotlight-root, [data-testid="guided-tour-spotlight-overlay"], .tour-backdrop-clickable-zone, [data-testid="demo-mode-banner"]').forEach((el) => el.remove());
    Array.from(document.querySelectorAll('div, section, aside')).forEach((el) => {
      if (el.textContent && (el.textContent.includes('ШАГ 1 ИЗ 4') || el.textContent.includes('Запись в расписании за 1 клик'))) {
        el.remove();
      }
    });
  });

  // Ensure EMK / Diary tab is selected if subtabs exist
  const emkSubtab = page.locator('[data-testid="visit-subtab-emk"], button:has-text("Дневник приёма")').first();
  if (await emkSubtab.isVisible()) {
    await emkSubtab.click();
    await page.waitForTimeout(800);
  }

  // If still not visible, try clicking active appointment or start visit button
  const hasToolbar = await page.locator('[data-testid="emk-tier1-quick-soap-bar"]').isVisible();
  if (!hasToolbar) {
    const startVisitBtn = page.locator('button:has-text("Начать прием"), button:has-text("Открыть прием"), button:has-text("Прием")').first();
    if (await startVisitBtn.isVisible()) {
      await startVisitBtn.click();
      await page.waitForTimeout(1000);
    }
  }

  // Wait for toolbar
  await page.waitForSelector('[data-testid="emk-tier1-quick-soap-bar"]', { timeout: 15000 });
  console.log("EMK Toolbar successfully mounted!");
}

(async () => {
  const browser = await chromium.launch({
    headless: true,
    executablePath: "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });

  // 1. DESKTOP LIGHT & DARK (1440x900)
  const desktopPage = await browser.newPage({
    viewport: { width: 1440, height: 900 },
    deviceScaleFactor: 2,
  });

  await openDemoVisit(desktopPage);

  // Set Light theme
  await desktopPage.evaluate(() => {
    document.documentElement.classList.remove("dark");
    document.documentElement.setAttribute("data-theme", "light");
  });
  await desktopPage.waitForTimeout(500);

  // PROOF 1: Desktop Light Visit
  await saveProof(desktopPage, "proof_01_visit_desktop_light.png");

  // Open 1 142 Protocols Catalog Modal
  const catalogBtn = desktopPage.locator('[data-testid="btn-open-protocols-catalog-1142"]').first();
  await catalogBtn.click();
  await desktopPage.waitForSelector('[data-testid="clinical-protocols-catalog-modal"]', { timeout: 5000 });
  await desktopPage.waitForTimeout(500);

  // PROOF 2: Desktop Light Protocols Catalog (1 142)
  await saveProof(desktopPage, "proof_02_visit_dropdown_light.png");

  // Close Catalog Modal via evaluate click
  await desktopPage.evaluate(() => {
    const btn = document.querySelector('[data-testid="btn-close-protocols-catalog-modal"]');
    if (btn) btn.click();
  });
  await desktopPage.waitForTimeout(600);

  // Set Dark theme
  await desktopPage.evaluate(() => {
    document.documentElement.classList.add("dark");
    document.documentElement.setAttribute("data-theme", "dark");
  });
  await desktopPage.waitForTimeout(500);

  // PROOF 3: Desktop Dark Visit
  await saveProof(desktopPage, "proof_03_visit_desktop_dark.png");

  // Open 1 142 Protocols Catalog Modal in Dark theme
  await catalogBtn.click();
  await desktopPage.waitForSelector('[data-testid="clinical-protocols-catalog-modal"]', { timeout: 5000 });
  await desktopPage.waitForTimeout(500);

  // PROOF 4: Desktop Dark Protocols Catalog (1 142)
  await saveProof(desktopPage, "proof_04_visit_dropdown_dark.png");

  // Close Catalog Modal via evaluate click
  await desktopPage.evaluate(() => {
    const btn = document.querySelector('[data-testid="btn-close-protocols-catalog-modal"]');
    if (btn) btn.click();
  });
  await desktopPage.waitForTimeout(600);

  await desktopPage.close();

  // 2. MOBILE LIGHT & DARK (390x844)
  const mobilePage = await browser.newPage({
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 2,
    isMobile: true,
  });

  await openDemoVisit(mobilePage);

  // Set Light theme
  await mobilePage.evaluate(() => {
    document.documentElement.classList.remove("dark");
    document.documentElement.setAttribute("data-theme", "light");
  });
  await mobilePage.waitForTimeout(500);

  // PROOF 5: Mobile Light Visit
  await saveProof(mobilePage, "proof_05_visit_mobile_light.png");

  // Set Dark theme
  await mobilePage.evaluate(() => {
    document.documentElement.classList.add("dark");
    document.documentElement.setAttribute("data-theme", "dark");
  });
  await mobilePage.waitForTimeout(500);

  // PROOF 6: Mobile Dark Visit
  await saveProof(mobilePage, "proof_06_visit_mobile_dark.png");

  await mobilePage.close();
  await browser.close();

  console.log("All 6 visual proofs captured cleanly!");
})();
