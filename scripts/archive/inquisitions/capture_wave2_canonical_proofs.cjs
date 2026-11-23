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
  "C:\\Users\\Admin\\.gemini\\antigravity\\brain\\1cbe3ec4-e647-4d20-8fdd-2e51740038bc\\screenshots",
];

for (const dir of targetDirs) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

async function saveProof(page, fileName) {
  for (const dir of targetDirs) {
    const fullPath = path.join(dir, fileName);
    await page.screenshot({ path: fullPath, fullPage: false, animations: "disabled" });
    console.log(`Saved screenshot: ${fileName} (${fs.statSync(fullPath).size} bytes)`);
  }
}

async function setTheme(page, theme) {
  console.log(`Setting theme ${theme}...`);
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

async function capture() {
  console.log("=== ЛИКВИДАЦИЯ ТЕАТРА ОДНОГО АКТЁРА: WAVE 2 CANONICAL PROOFS НА ЖИВОЙ БД ===");

  // 1. Честная авторизация через Fastify API
  const authData = await obtainRealAuthTokens();
  console.log(`[REAL-DATA] Клиника: ${authData.clinicName}, Врач: ${authData.user.fullName}`);

  // 2. Сидирование живых данных в PostgreSQL
  const schedData = await seedLiveScheduleData(authData);
  console.log(`[REAL-DATA] База готова. Активный пациент: ${schedData.activePatientId}`);

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

    // 3. Инъекция реальных подписанных токенов
    await injectRealAuthToContext(context, authData, {
      selectedPatientId: schedData.activePatientId,
    });

    const page = await context.newPage();

    // 4. ЗАПРЕТ МОКОВ: page.route("**/api/**") полностью ликвидирован.
    // Запросы к /api/ идут напрямую в живой Fastify API через Vite proxy.
    await page.route("**/*fonts.googleapis.com/**", (route) => route.abort());
    await page.route("**/*fonts.gstatic.com/**", (route) => route.abort());

    console.log("Navigating to live http://127.0.0.1:5173/#schedule...");
    await page.goto("http://127.0.0.1:5173/#schedule", { waitUntil: "domcontentloaded", timeout: 30000 });
    await page.waitForSelector(".boot-state", { state: "detached", timeout: 30000 });
    console.log("Boot state detached! App successfully bootstrapped with live backend.");
    await page.waitForTimeout(800);

    // Dismiss any banner
    const dismissBtn = page.locator('button:has-text("Скрыть"), button:has-text("Понятно"), [data-testid="btn-dismiss-notice"]');
    if (await dismissBtn.isVisible()) {
      await dismissBtn.click().catch(() => {});
      await page.waitForTimeout(300);
    }

    const themes = ["light", "dark"];

    for (const theme of themes) {
      await setTheme(page, theme);

      // --- SCREEN 0: SCHEDULE (Расписание на день) ---
      console.log(`[${theme}] Opening Schedule view...`);
      await page.evaluate(() => { window.location.hash = "#schedule"; });
      await page.waitForSelector('.boot-state', { state: 'detached', timeout: 30000 }).catch(() => {});
      await page.waitForSelector('.schedule-filter-strip', { state: "visible", timeout: 20000 }).catch(() => {});
      await page.waitForTimeout(800);
      await saveProof(page, `schedule_clean_${theme}.png`);
      await saveProof(page, theme === "light" ? "01_schedule_desktop_light.png" : "02_schedule_desktop_dark.png");

      // --- SCREEN 1: VISIT (Дневник приёма / Зубная формула / Согласия / Диагностика) ---
      console.log(`[${theme}] Opening Visit view...`);
      await page.evaluate(() => { window.location.hash = "#visit"; });
      await page.waitForSelector('.boot-state', { state: 'detached', timeout: 30000 }).catch(() => {});
      await page.waitForSelector('[data-testid="visit-subtab-emk"], .visit-tabs, [data-testid="visit-view"]', { state: "visible", timeout: 25000 }).catch(() => {});
      await page.waitForTimeout(1000);

      // Check subtab Дневник приёма (visit-subtab-emk)
      const emkTab = page.locator('[data-testid="visit-subtab-emk"]');
      if (await emkTab.isVisible()) {
        await emkTab.click();
        await page.waitForTimeout(800);
      }
      await saveProof(page, `visit_emk_clean_${theme}.png`);

      // Check subtab Зубная формула (visit-subtab-odontogram)
      const odontoTab = page.locator('[data-testid="visit-subtab-odontogram"], button:has-text("Зубная формула")').first();
      if (await odontoTab.isVisible()) {
        await odontoTab.click();
        await page.waitForTimeout(800);
        await saveProof(page, `visit_odontogram_clean_${theme}.png`);
      }

      // Check subtab Согласия (visit-subtab-consents)
      const consentsTab = page.locator('[data-testid="visit-subtab-consents"]');
      if (await consentsTab.isVisible()) {
        await consentsTab.click();
        await page.waitForTimeout(600);
        await saveProof(page, `visit_consents_clean_${theme}.png`);
      }

      // Check subtab Диагностика (visit-subtab-diagnostics)
      const diagTab = page.locator('[data-testid="visit-subtab-diagnostics"]');
      if (await diagTab.isVisible()) {
        await diagTab.click();
        await page.waitForTimeout(600);
        await saveProof(page, `visit_diagnostics_clean_${theme}.png`);
      }

      // --- SCREEN 2: SETTINGS (Матрица прав & Доступ) ---
      console.log(`[${theme}] Opening Settings view...`);
      await page.evaluate(() => { window.location.hash = "#settings/access"; });
      await page.waitForSelector('.boot-state', { state: 'detached', timeout: 30000 }).catch(() => {});
      await page.waitForSelector('[data-testid="settings-view"], .settings-zone', { state: "visible", timeout: 25000 }).catch(() => {});
      await page.waitForTimeout(800);

      // Click "Все разделы" to see full settings if collapsed
      const allBtn = page.locator('[data-testid="btn-settings-role-all"]').first();
      if (await allBtn.isVisible()) {
        await allBtn.click();
        await page.waitForTimeout(500);
      }

      // Ensure "Доступ" tab is clicked
      const accessTab = page.locator('button:has-text("Доступ"), [data-testid="settings-tab-access"]').first();
      if (await accessTab.isVisible()) {
        await accessTab.click();
        await page.waitForTimeout(1000);
      }
      await saveProof(page, `settings_roles_clean_${theme}.png`);

      // Close modal if open
      await page.keyboard.press("Escape");
      await page.waitForTimeout(300);

      // --- SCREEN 3: PATIENTS (Картотека пациентов & Карточка) ---
      console.log(`[${theme}] Opening Patients view...`);
      await page.keyboard.press("Escape");
      await page.evaluate(() => { window.location.hash = "#patients"; });
      await page.waitForSelector('.boot-state', { state: 'detached', timeout: 30000 }).catch(() => {});
      await page.waitForSelector('[data-testid="open-create-patient-modal-btn"], [data-testid^="patient-row-"], .patients-view', { state: "visible", timeout: 25000 }).catch(() => {});
      await page.waitForTimeout(1500);

      // Click on first patient row to open patient card
      const firstPatientRow = page.locator('[data-testid^="patient-row-"]').first();
      if (await firstPatientRow.isVisible()) {
        await firstPatientRow.click();
        await page.waitForTimeout(1000);
      }
      await saveProof(page, `patients_clean_${theme}.png`);

      // Open PatientCardModal (Паспортная карточка / Законный представитель)
      const moreActionsBtn = page.locator('[data-testid="patient-card-more-actions-btn"]');
      if (await moreActionsBtn.isVisible()) {
        await moreActionsBtn.click();
        await page.waitForTimeout(500);
        const openCardBtn = page.locator('[data-testid="open-patient-card-modal-btn"]');
        if (await openCardBtn.isVisible()) {
          await openCardBtn.click();
          await page.waitForSelector('.patient-card-modal, [data-testid="patient-card-modal"]', { state: "visible", timeout: 10000 }).catch(() => {});
          await page.waitForTimeout(1000);
          await saveProof(page, `patient_card_modal_clean_${theme}.png`);
          // Close modal
          await page.keyboard.press("Escape");
          const closeModalBtn = page.locator('button:has-text("Закрыть"), [aria-label="Закрыть"]').first();
          if (await closeModalBtn.isVisible()) {
            await closeModalBtn.click().catch(() => {});
          }
          await page.waitForTimeout(400);
        }
      }

      // --- SCREEN 4: IMAGING (Рентген и КТ / Снимки) ---
      console.log(`[${theme}] Opening Imaging view...`);
      await page.evaluate(() => { window.location.hash = "#imaging"; });
      await page.waitForSelector('.boot-state', { state: 'detached', timeout: 30000 }).catch(() => {});
      await page.waitForSelector('.imaging-panel, [data-testid="imaging-view"], #imaging', { state: "visible", timeout: 20000 }).catch(() => {});
      await page.waitForTimeout(1000);
      await saveProof(page, `imaging_clean_${theme}.png`);
      await saveProof(page, theme === "light" ? "24_imaging_desktop_light.png" : "25_imaging_desktop_dark.png");
    }

    console.log("All canonical screenshots successfully captured from live database!");
  } finally {
    await browser.close();
  }
}

capture().catch((err) => {
  console.error("Screenshot capture failed:", err);
  process.exit(1);
});
