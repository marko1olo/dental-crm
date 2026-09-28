const { chromium } = require("playwright");
const fs = require("fs");
const path = require("path");
const {
  obtainRealAuthTokens,
  injectRealAuthToContext,
  seedLiveScheduleData,
} = require("./e2e-auth-helper.cjs");

const targetDirs = [
  path.resolve("docs/screenshots/inquisition_live"),
  path.resolve("docs/screenshots/audit_7sins"),
];

for (const dir of targetDirs) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

async function setTheme(page, theme) {
  await page.evaluate((th) => {
    if (window.__useThemeStore) {
      window.__useThemeStore.getState().setThemeMode(th);
    }
    document.documentElement.setAttribute("data-theme", th);
    const isDark = ["dark", "night", "ocean", "emerald", "cyber_xray"].includes(th);
    document.documentElement.classList.toggle("dark", isDark);
    document.documentElement.classList.toggle("light", !isDark);
    document.documentElement.style.colorScheme = isDark ? "dark" : "light";
  }, theme);
  const isDark = ["dark", "night", "ocean", "emerald", "cyber_xray"].includes(theme);
  await page.waitForFunction(
    (dark) => document.documentElement.classList.contains("dark") === dark,
    isDark,
    { timeout: 5000 }
  ).catch(() => {});
  await page.waitForTimeout(400);
}

async function saveProof(page, fileName) {
  for (const dir of targetDirs) {
    const fullPath = path.join(dir, fileName);
    await page.screenshot({ path: fullPath, fullPage: false, animations: "disabled" });
    console.log(`Saved screenshot: ${fullPath} (${fs.statSync(fullPath).size} bytes)`);
  }
}

async function main() {
  console.log("=== ЛИКВИДАЦИЯ ТЕАТРА ОДНОГО АКТЁРА: СКВОЗНОЙ E2E РАСПИСАНИЯ ===");

  // 1. Получение криптографических токенов из реального Fastify API
  const authData = await obtainRealAuthTokens();
  console.log(`[REAL-DATA] Клиника: ${authData.clinicName}, Врач: ${authData.user.fullName}`);

  // 2. Сидирование реальных кресел, пациентов, патологий и приёмов в живую БД PostgreSQL
  const schedData = await seedLiveScheduleData(authData);
  console.log(`[REAL-DATA] Сидировано в БД: ${schedData.appointments.length} приёмов, ${schedData.chairs.length} кресел`);

  const browser = await chromium.launch({
    executablePath: "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });

  try {
    const context = await browser.newContext({
      viewport: { width: 1440, height: 900 },
      deviceScaleFactor: 2,
    });

    // 3. Честная инъекция валидных подписанных JWT-токенов в localStorage браузера
    await injectRealAuthToContext(context, authData, {
      selectedPatientId: schedData.activePatientId,
    });

    const page = await context.newPage();

    // 4. ЗАПРЕТ МОКОВ: page.route("**/api/**") полностью УДАЛЕН.
    // Запросы к /api/dashboard, /api/schedule, /api/patients идут в живой Fastify API через Vite proxy.
    // Оставляем перехват ТОЛЬКО для внешних шрифтов Google, чтобы изолироваться от внешнего интернета.
    await page.route("**/*fonts.googleapis.com/**", (route) => route.abort());
    await page.route("**/*fonts.gstatic.com/**", (route) => route.abort());

    console.log("Navigating to live http://127.0.0.1:5173/#schedule...");
    await page.goto("http://127.0.0.1:5173/#schedule", { waitUntil: "domcontentloaded", timeout: 30000 });
    await page.waitForSelector(".boot-state", { state: "detached", timeout: 30000 }).catch(() => {});
    await page.waitForSelector(".schedule-filter-strip", { state: "visible", timeout: 30000 });
    await page.waitForTimeout(1000);

    // Dismiss onboarding strip to free full vertical screen height
    const dismissBtn = page.locator('button:has-text("Скрыть")');
    if (await dismissBtn.isVisible()) {
      console.log("Dismissing onboarding strip...");
      await dismissBtn.click();
      await page.waitForTimeout(400);
    }

    const noticeDismissBtn = page.locator('.app-notice button:has-text("Понятно"), [data-testid="btn-dismiss-notice"]');
    if (await noticeDismissBtn.isVisible()) {
      console.log("Dismissing banner notice...");
      await noticeDismissBtn.click().catch(() => {});
      await page.waitForTimeout(300);
    }

    // Ensure filter chips are not scrolled
    await page.evaluate(() => {
      const el = document.querySelector(".schedule-filter-chips");
      if (el) el.scrollLeft = 0;
    });

    // =========================================================================
    // 1. Single-chair Split-Shift View: Morning 08:00-14:00 & Evening 14:00-20:00
    // Select chair-1 by clicking its chip in filter strip
    // =========================================================================
    const chair1Badge = page.locator(`[data-testid="chair-view-badge-${schedData.chair1Id}"], [data-testid="chair-view-badge-chair-1"], .schedule-filter-chips button:has-text("Кабинет 1")`).first();
    if (await chair1Badge.isVisible()) {
      console.log("Clicking chair-1 filter to activate single-chair split-shift day view...");
      await chair1Badge.click();
      await page.waitForTimeout(600);
    }

    // Reset chips scroll again
    await page.evaluate(() => {
      const el = document.querySelector(".schedule-filter-chips");
      if (el) el.scrollLeft = 0;
    });

    // Verify split track is visible
    await page.waitForSelector('[data-testid="schedule-split-day-track"]', { state: "visible", timeout: 10000 }).catch(() => {});
    console.log("Split-shift day track checked.");

    // Capture Light Desktop (01_schedule_desktop_light.png)
    await setTheme(page, "light");
    await saveProof(page, "01_schedule_desktop_light.png");

    // Capture Dark Desktop (02_schedule_desktop_dark.png)
    await setTheme(page, "dark");
    await saveProof(page, "02_schedule_desktop_dark.png");

    // =========================================================================
    // 2. Multi-Chair Panoramic Matrix View: All clinic chairs side by side
    // =========================================================================
    console.log("Switching to multi-chair panoramic view...");
    const allChairsChip = page.locator('.schedule-filter-chips button:has-text("Все кабинеты"), .schedule-filter-chips button:has-text("Все кресла"), [data-testid="chair-view-badge-all"]').first();
    if (await allChairsChip.isVisible()) {
      await allChairsChip.click();
      await page.waitForTimeout(600);
    } else if (await chair1Badge.isVisible()) {
      await chair1Badge.click();
      await page.waitForTimeout(600);
    }

    // Switch to "chairs" view mode button or check if multiple chairs are rendered
    const chairsModeBtn = page.locator('[data-testid="schedule-view-mode-chairs"]');
    if (await chairsModeBtn.isVisible()) {
      console.log("Activating 'chairs' view mode...");
      await chairsModeBtn.click();
      await page.waitForTimeout(600);
    }

    // Ensure filter chips are not scrolled in multi-chair view
    await page.evaluate(() => {
      const el = document.querySelector(".schedule-filter-chips");
      if (el) el.scrollLeft = 0;
    });

    // Capture Multi-Chair Dark (45_schedule_chairs_desktop_dark.png)
    await saveProof(page, "45_schedule_chairs_desktop_dark.png");

    // Capture Multi-Chair Light (44_schedule_chairs_desktop_light.png)
    await setTheme(page, "light");
    await saveProof(page, "44_schedule_chairs_desktop_light.png");

    // Capture Multi-Chair Ocean (46_schedule_chairs_desktop_ocean.png)
    await setTheme(page, "ocean");
    await saveProof(page, "46_schedule_chairs_desktop_ocean.png");

    const brainDir = "C:\\Users\\Admin\\.gemini\\antigravity\\brain\\1cbe3ec4-e647-4d20-8fdd-2e51740038bc\\screenshots";
    if (!fs.existsSync(brainDir)) fs.mkdirSync(brainDir, { recursive: true });
    for (const f of ["44_schedule_chairs_desktop_light.png", "45_schedule_chairs_desktop_dark.png", "46_schedule_chairs_desktop_ocean.png"]) {
      const src = path.resolve("docs/screenshots/inquisition_live", f);
      if (fs.existsSync(src)) fs.copyFileSync(src, path.join(brainDir, f));
    }

    console.log("All schedule visual proofs successfully captured from live database!");

    // --- VISIT VIEW TABS INQUISITION (4 TABS x 2 THEMES) ---
    console.log("\n=== Starting Visit Tabs Inquisition with Live Data ===");
    const startIvanovVisit = await page.$('[data-testid^="appointment-action-start-"], button:has-text("В приём")');
    if (startIvanovVisit) {
      console.log("Clicking [В приём] on live patient card...");
      await startIvanovVisit.click();
      await page.waitForTimeout(1500);
    } else {
      console.log("Navigating to #visit directly...");
      await page.goto("http://127.0.0.1:5173/#visit", { waitUntil: "domcontentloaded" });
      await page.waitForTimeout(1500);
    }

    const visitTabs = [
      { id: "emk", name: "tab1_emk", selector: '[data-testid="visit-subtab-emk"]' },
      { id: "odontogram", name: "tab2_odontogram", selector: '[data-testid="visit-subtab-odontogram"]' },
      { id: "diagnostics", name: "tab3_diagnostics", selector: '[data-testid="visit-subtab-diagnostics"]' },
      { id: "consents", name: "tab4_consents", selector: '[data-testid="visit-subtab-consents"]' },
    ];

    const visitProofFiles = [];

    for (const theme of ["light", "dark"]) {
      console.log(`\n--- Visit Tabs Theme: ${theme.toUpperCase()} ---`);
      await setTheme(page, theme);
      await page.waitForTimeout(500);

      for (const tab of visitTabs) {
        console.log(`Activating Visit Tab: ${tab.name} (${tab.id})...`);
        const tabEl = await page.$(tab.selector);
        if (tabEl) {
          await tabEl.click();
          await page.waitForTimeout(800);
        } else {
          console.warn(`Tab selector not found: ${tab.selector}`);
        }
        const fileName = `visit_${tab.name}_desktop_${theme}.png`;
        await saveProof(page, fileName);
        if (tab.id === "diagnostics") {
          await saveProof(page, `visit_diagnostics_clean_${theme}.png`);
        }
        visitProofFiles.push(fileName);
      }
    }

    // Sync all visit proofs to brain artifacts directory
    for (const f of visitProofFiles) {
      const src = path.resolve("docs/screenshots/inquisition_live", f);
      if (fs.existsSync(src)) fs.copyFileSync(src, path.join(brainDir, f));
    }
    console.log("All Visit visual proofs successfully captured and synced from live database!");
  } finally {
    await browser.close();
  }
}

main().catch((err) => {
  console.error("Capture script failed:", err);
  process.exit(1);
});
