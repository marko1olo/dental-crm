const { chromium } = require("playwright");
const fs = require("node:fs");
const path = require("node:path");

const OUTPUT_DIR = path.join(__dirname, "..", "docs", "screenshots", "omnichannel_inquisition");
if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

async function getLiveAuthTokens() {
  const loginRes = await fetch("http://127.0.0.1:4100/api/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: "doctor@clinic.com", password: "любой" }),
  });
  if (!loginRes.ok) {
    throw new Error(`Failed to login at API: ${loginRes.status}`);
  }
  return await loginRes.json();
}

async function capture() {
  console.log("Запуск Playwright для честного снятия скриншотов Omnichannel Desk...");

  const authData = await getLiveAuthTokens();
  // Выставим роль владельца (owner) для полного доступа к настройкам мессенджеров
  if (authData.user) {
    authData.user.role = "owner";
  }

  const browser = await chromium.launch({
    headless: true,
    executablePath: "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });

  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    deviceScaleFactor: 2,
  });

  // Внедряем токены и отключаем все спотлайты/квесты
  await context.addInitScript((auth) => {
    localStorage.setItem("dente_clinic_token", auth.clinicToken);
    localStorage.setItem("dente_staff_token", auth.staffToken);
    localStorage.setItem("dente_active_staff_user", JSON.stringify(auth.user));
    localStorage.setItem("dente_unlocked", "true");
    localStorage.setItem("dente_admin_secret", "dente-super-secret-2025");
    localStorage.setItem("dente_privacy_shield_locked", "false");
    localStorage.setItem("dente_workspace_role", "owner");

    localStorage.setItem("dente_tour_completed", "true");
    localStorage.setItem("dente_guide_tour_dismissed_v2", "true");
    localStorage.setItem("dente_guide_tour_seen_roles_v2", JSON.stringify(["admin", "doctor", "director", "owner"]));
    localStorage.setItem("dente_onboarding_dismissed", "true");
    localStorage.setItem("dente_quest_progress_v1", JSON.stringify({
      activeTrackId: "solo_doctor",
      currentStepIndex: 0,
      completedStepIds: ["admin_schedule_grid", "admin_patient_search", "admin_cashier_checkout"],
      isTourActive: false,
      isDismissedPermanently: true,
      tracksProgress: {
        solo_doctor: { completed: true, completedStepIds: [] },
        reception_admin: { completed: true, completedStepIds: [] },
        imaging_diagnostics: { completed: true, completedStepIds: [] },
      },
    }));
  }, authData);

  const page = await context.newPage();

  console.log("1. Открытие рабочего стола http://127.0.0.1:5173/#bots ...");
  await page.goto("http://127.0.0.1:5173/#bots", { waitUntil: "domcontentloaded" });

  try {
    await page.waitForSelector('text="Загрузка CRM"', { state: "detached", timeout: 15000 });
  } catch {}
  await page.waitForTimeout(2000);

  await page.waitForSelector(".workspace-sidebar, aside.sidebar, #workspace-content, nav", { timeout: 30000 });
  console.log("✓ Рабочий стол DENTE успешно смонтирован!");

  // Ждем монтирования самого пульта ботов
  await page.waitForSelector('[data-testid="omnichannel-operator-desk"], [data-testid="communications-tab-bot-inbox"]', { timeout: 15000 });
  const botInboxTab = page.locator('[data-testid="communications-tab-bot-inbox"]').first();
  if (await botInboxTab.isVisible()) {
    await botInboxTab.click({ force: true });
  }
  await page.waitForTimeout(2500);

  // Скриншот 1: Пульт оператора Light mode
  console.log("2. Захват desk_light...");
  await page.evaluate(() => {
    document.documentElement.setAttribute("data-theme", "light");
    document.documentElement.classList.remove("dark");
  });
  await page.waitForTimeout(800);

  const deskLightPath = path.join(OUTPUT_DIR, "omnichannel_desk_light.png");
  await page.screenshot({ path: deskLightPath });
  console.log("✓ Скриншот desk_light сохранен:", deskLightPath, "размер:", fs.statSync(deskLightPath).size);

  // Скриншот 2: Открытие модалки создания карты пациента в 1 клик (Мандат 8e)
  console.log("3. Выбор диалога Анны Волковой (MAX) для создания карты пациента (Мандат 8e)...");
  const maxConvItem = page.locator('[data-testid="conv-item-max:max_user_449"]').first();
  if (await maxConvItem.isVisible()) {
    await maxConvItem.click({ force: true });
    await page.waitForTimeout(600);
  }

  const linkPatientBtn = page.locator('[data-testid="link-patient-chat-btn"]').first();
  if (await linkPatientBtn.isVisible()) {
    await linkPatientBtn.click({ force: true });
    await page.waitForSelector('[data-testid="link-patient-modal"]', { state: "visible", timeout: 5000 });
    await page.waitForTimeout(600);
    const linkModalPath = path.join(OUTPUT_DIR, "omnichannel_desk_link_patient_modal.png");
    await page.screenshot({ path: linkModalPath });
    console.log("✓ Скриншот link_patient_modal сохранен:", linkModalPath, "размер:", fs.statSync(linkModalPath).size);

    // Закрываем модалку через кнопку Отмена внутри модалки
    const cancelLinkBtn = page.locator('[data-testid="link-patient-modal"] button:has-text("Отмена")').first();
    await cancelLinkBtn.click({ force: true });
    await page.waitForSelector('[data-testid="link-patient-modal"]', { state: "detached", timeout: 5000 });
    await page.waitForTimeout(600);
  } else {
    console.warn("Предупреждение: linkPatientBtn не найден!");
  }

  // Скриншот 3: Выбор диалога Смирнова Алексея (Telegram) и открытие модалки быстрой записи на приём (Мандат 8e)
  console.log("4. Выбор диалога Telegram (Смирнов Алексей) и открытие быстрой записи...");
  const tgConvItem = page.locator('[data-testid="conv-item-telegram:79161112233"]').first();
  if (await tgConvItem.isVisible()) {
    await tgConvItem.click({ force: true });
    await page.waitForTimeout(600);
  }

  const quickBookBtn = page.locator('[data-testid="quick-book-chat-btn"]').first();
  if (await quickBookBtn.isVisible()) {
    console.log("Клик по 'Записать на приём'...");
    await quickBookBtn.click({ force: true });
    await page.waitForSelector('[data-testid="quick-booking-modal"]', { state: "visible", timeout: 5000 });
    await page.waitForTimeout(600);
    const bookingModalPath = path.join(OUTPUT_DIR, "omnichannel_desk_quick_booking_light.png");
    await page.screenshot({ path: bookingModalPath });
    console.log("✓ Скриншот quick_booking сохранен:", bookingModalPath, "размер:", fs.statSync(bookingModalPath).size);

    // Закрываем модалку через кнопку Отмена внутри модалки
    const cancelBookBtn = page.locator('[data-testid="quick-booking-modal"] button:has-text("Отмена")').first();
    await cancelBookBtn.click({ force: true });
    await page.waitForSelector('[data-testid="quick-booking-modal"]', { state: "detached", timeout: 5000 });
    await page.waitForTimeout(600);
  } else {
    console.warn("Предупреждение: quickBookBtn не найден!");
  }

  // Скриншот 4: Пульт оператора Dark mode
  console.log("5. Переключение в полноценный Dark mode (data-theme=dark)...");
  await page.evaluate(() => {
    if (window.__useThemeStore) {
      window.__useThemeStore.getState().setThemeMode("dark");
    }
    document.documentElement.setAttribute("data-theme", "dark");
    document.documentElement.classList.add("dark");
  });
  await page.waitForTimeout(1200);

  const deskDarkPath = path.join(OUTPUT_DIR, "omnichannel_desk_dark.png");
  await page.screenshot({ path: deskDarkPath });
  console.log("✓ Скриншот desk_dark сохранен:", deskDarkPath, "размер:", fs.statSync(deskDarkPath).size);

  // Скриншот 5 & 6: Настройки мессенджеров (Dark & Light)
  console.log("6. Переход в Настройки -> Мессенджеры (#settings/telegram)...");
  await page.goto("http://127.0.0.1:5173/#settings/telegram", { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(2500);

  const settingsDarkPath = path.join(OUTPUT_DIR, "settings_messengers_dark.png");
  await page.screenshot({ path: settingsDarkPath });
  console.log("✓ Скриншот settings_dark сохранен:", settingsDarkPath, "размер:", fs.statSync(settingsDarkPath).size);

  await page.evaluate(() => {
    if (window.__useThemeStore) {
      window.__useThemeStore.getState().setThemeMode("light");
    }
    document.documentElement.setAttribute("data-theme", "light");
    document.documentElement.classList.remove("dark");
  });
  await page.waitForTimeout(1200);

  const settingsLightPath = path.join(OUTPUT_DIR, "settings_messengers_light.png");
  await page.screenshot({ path: settingsLightPath });
  console.log("✓ Скриншот settings_light сохранен:", settingsLightPath, "размер:", fs.statSync(settingsLightPath).size);

  // Скриншоты 7 и 8: Mobile Light & Dark (390x844) по Apple HIG
  console.log("7. Переход на мобильный вьюпорт (390x844)...");
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("http://127.0.0.1:5173/#bots", { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(2000);

  const mobileLightPath = path.join(OUTPUT_DIR, "omnichannel_desk_mobile_light.png");
  await page.screenshot({ path: mobileLightPath });
  console.log("✓ Скриншот mobile_light сохранен:", mobileLightPath, "размер:", fs.statSync(mobileLightPath).size);

  await page.evaluate(() => {
    if (window.__useThemeStore) {
      window.__useThemeStore.getState().setThemeMode("dark");
    }
    document.documentElement.setAttribute("data-theme", "dark");
    document.documentElement.classList.add("dark");
  });
  await page.waitForTimeout(1200);

  const mobileDarkPath = path.join(OUTPUT_DIR, "omnichannel_desk_mobile_dark.png");
  await page.screenshot({ path: mobileDarkPath });
  console.log("✓ Скриншот mobile_dark сохранен:", mobileDarkPath, "размер:", fs.statSync(mobileDarkPath).size);

  await browser.close();
  console.log("=== Снятие ВСЕХ скриншотов успешно завершено ===");
}

capture().catch((err) => {
  console.error("Ошибка при снятии скриншотов:", err);
  process.exit(1);
});
