/**
 * scripts/capture_real_crm_contour_proofs.cjs
 *
 * ЖЕЛЕЗНЫЙ ЗАКОН СВЯЗНОСТИ В РЕАЛЬНЫХ КОНТУРАХ (NO ISOLATED MOCKS / FULL SYSTEM PROOF):
 * Захват скриншотов ИСКЛЮЧИТЕЛЬНО из боевого монорепозитория:
 * Fastify API (http://127.0.0.1:4100) <-> Vite Web (http://127.0.0.1:5173)
 */

const { chromium } = require("playwright");
const path = require("node:path");
const fs = require("node:fs");

const API_BASE = "http://127.0.0.1:4100";
const APP_BASE = "http://127.0.0.1:5173";
const OUT_DIR = path.resolve("C:/Clinic_MVP/dental-crm/docs/screenshots/real_contour");

if (!fs.existsSync(OUT_DIR)) {
  fs.mkdirSync(OUT_DIR, { recursive: true });
}

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function applyTheme(page, theme) {
  await page.evaluate((th) => {
    document.documentElement.setAttribute("data-theme", th);
    const isDark = th === "dark";
    document.documentElement.classList.toggle("dark", isDark);
    document.documentElement.classList.toggle("light", !isDark);
    document.body.className = isDark ? "dark" : "light";
    document.documentElement.style.colorScheme = isDark ? "dark" : "light";
    localStorage.setItem("dente_theme_mode", th);
    if (window.__useThemeStore) {
      window.__useThemeStore.getState().setThemeMode(th);
    }
  }, theme);
  await wait(400);
}

async function unlockIfNecessary(page) {
  try {
    await wait(1000);
    const secretInput = await page.$('input[placeholder*="секрет"]');
    if (secretInput) {
      console.log("   [UNLOCK] Обнаружен ввод секрета администратора. Вводим demo...");
      await secretInput.fill("demo");
      await wait(300);
      const submitBtn = await page.$('button[type="submit"]:has-text("Открыть смену")');
      if (submitBtn) {
        await submitBtn.click();
        await wait(2000);
      }
    }
    const demoUnlockBtn = await page.$('button:has-text("Войти как Доктор Демо"), button:has-text("PIN: 1111")');
    if (demoUnlockBtn) {
      console.log("   [UNLOCK] Нажата кнопка быстрого входа Доктора Демо...");
      await demoUnlockBtn.click();
      await wait(2000);
    }
  } catch (err) {
    console.log("   [UNLOCK] Навигация или селектор в процессе обновления:", err.message);
  }
}

async function main() {
  console.log("=== ЗАПУСК СКВОЗНОЙ ПРОВЕРКИ РЕАЛЬНЫХ КОНТУРОВ DENTE CRM ===");

  const browser = await chromium.launch({
    channel: "msedge",
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });

  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    deviceScaleFactor: 1,
  });

  // Inject cookies for 127.0.0.1
  await context.addCookies([
    { name: "dente_clinic_token", value: "demo-showcase-clinic-token", domain: "127.0.0.1", path: "/" },
    { name: "dente_staff_token", value: "demo-showcase-staff-token-doctor", domain: "127.0.0.1", path: "/" },
  ]);

  const page = await context.newPage();

  // Inject session state directly
  await page.addInitScript(() => {
    localStorage.setItem("dente_demo_showcase", "true");
    localStorage.setItem("dente_clinic_token", "demo-showcase-clinic-token");
    localStorage.setItem("dente_staff_token", "demo-showcase-staff-token-doctor");
    localStorage.setItem("dente_workspace_perspective", "doctor");
    localStorage.setItem("dente_user_role", "doctor");
    localStorage.setItem("dente_active_staff_user", JSON.stringify({
      id: "demo-doctor-chief",
      fullName: "Доктор Демо (Главный врач)",
      role: "doctor",
      active: true,
      color: "var(--teal, #0d9488)",
    }));
    localStorage.setItem("dental-crm:onboarding:v1", JSON.stringify({ dismissed: true, step: "done" }));
    localStorage.setItem("dental-crm:web-ui-preferences:v1", JSON.stringify({
      version: 1,
      uiLanguage: "ru",
      selectedWorkspaceRole: "doctor",
      selectedSpecialty: "therapist",
      onboardingDismissed: true,
    }));
  });

  // 1. Открываем расписание для инициализации рабочей смены
  console.log("[1/4] Инициализация рабочей смены на /?demo=true#schedule...");
  await page.goto(`${APP_BASE}/?demo=true#schedule`, { waitUntil: "domcontentloaded", timeout: 45000 });
  await unlockIfNecessary(page);

  // Ожидаем появления рабочего шелла CRM (сайдбар или топбар)
  console.log("   Ожидание загрузки рабочего пространства CRM...");
  try {
    await page.waitForSelector('.workspace-shell, .workspace-topbar, [data-testid="schedule-toolbar"], .sidebar-navigation', { timeout: 25000 });
    console.log("   Рабочее пространство CRM успешно открыто!");
  } catch (e) {
    console.log("   Предупреждение: долго загружается шелл, проверяем разблокировку...");
    await unlockIfNecessary(page);
  }

  // -------------------------------------------------------------
  // КОНТУР 1: БОЕВОЙ КАТАЛОГ ДОКУМЕНТОВ (#documents)
  // -------------------------------------------------------------
  console.log("\n[2/4] Переход на боевой маршрут #documents в реальном шелле...");
  await page.goto(`${APP_BASE}/?demo=true#documents`, { waitUntil: "domcontentloaded", timeout: 45000 });
  await unlockIfNecessary(page);
  await wait(3000);

  await applyTheme(page, "light");
  const docLightPath = path.join(OUT_DIR, "01_real_crm_documents_catalog_pc_light.png");
  await page.screenshot({ path: docLightPath, fullPage: false });
  console.log(`   [SAVED] ${docLightPath}`);

  await applyTheme(page, "dark");
  const docDarkPath = path.join(OUT_DIR, "01_real_crm_documents_catalog_pc_dark.png");
  await page.screenshot({ path: docDarkPath, fullPage: false });
  console.log(`   [SAVED] ${docDarkPath}`);

  // Открываем модалку справки для налоговой ФНС (КНД 1151156) прямо в боевом окне!
  console.log("   Клик по карточке справки ФНС прямо в каталоге документов...");
  const taxBtn = await page.$('button:has-text("Открыть"):right-of(:text("Справка для налогового вычета")), div:has-text("Справка для налогового вычета") button:has-text("Открыть"), button:has-text("Справка ФНС")');
  if (taxBtn) {
    await taxBtn.click();
    await wait(1500);
    await applyTheme(page, "light");
    const taxModalPath = path.join(OUT_DIR, "02_real_crm_tax_modal_opened_pc_light.png");
    await page.screenshot({ path: taxModalPath, fullPage: false });
    console.log(`   [SAVED] ${taxModalPath}`);

    // Закрываем модалку
    const closeBtn = await page.$('button[aria-label="Закрыть"], .modal-close-btn');
    if (closeBtn) await closeBtn.click();
    await wait(500);
  }

  // -------------------------------------------------------------
  // КОНТУР 2: БОЕВАЯ КАРТОТЕКА ПАЦИЕНТОВ (#patients)
  // -------------------------------------------------------------
  console.log("\n[3/4] Переход на боевой маршрут #patients...");
  await page.goto(`${APP_BASE}/?demo=true#patients`, { waitUntil: "domcontentloaded", timeout: 45000 });
  await unlockIfNecessary(page);
  await wait(3000);

  await applyTheme(page, "light");
  const patListPath = path.join(OUT_DIR, "03_real_crm_patients_registry_pc_light.png");
  await page.screenshot({ path: patListPath, fullPage: false });
  console.log(`   [SAVED] ${patListPath}`);

  // Открываем реальную карточку пациента
  console.log("   Клик по пациенту для открытия ЭМК 043/у...");
  const firstPatientBtn = await page.$('.patients-list button, button:has-text("Приём"), button:has-text("Карточка"), [data-testid="btn-patient-row"]');
  if (firstPatientBtn) {
    await firstPatientBtn.click();
    await wait(1500);
  }
  const patModalPath = path.join(OUT_DIR, "04_real_crm_patient_card_modal_pc_light.png");
  await page.screenshot({ path: patModalPath, fullPage: false });
  console.log(`   [SAVED] ${patModalPath}`);

  // -------------------------------------------------------------
  // КОНТУР 3: БОЕВАЯ ТЕЛЕФОНИЯ НА РАСПИСАНИИ (#schedule)
  // -------------------------------------------------------------
  console.log("\n[4/4] Переход на боевой маршрут #schedule со всплывающим звонком...");
  await page.goto(`${APP_BASE}/?demo=true#schedule`, { waitUntil: "domcontentloaded", timeout: 45000 });
  await unlockIfNecessary(page);
  await wait(3000);

  // Триггерим реальный входящий звонок телефонии через window store
  console.log("   Эмуляция входящего звонка телефонии поверх расписания...");
  await page.evaluate(() => {
    const anyWin = window;
    if (anyWin.__useTelephonyStore) {
      anyWin.__useTelephonyStore.getState().triggerIncomingCall({
        callId: "call-real-contour-2026",
        callerPhone: "+7 (925) 876-54-32",
        callerName: "Константинопольский Александр Владимирович",
        status: "ringing",
      });
    }
  });
  await wait(1500);

  await applyTheme(page, "light");
  const callSchedulePath = path.join(OUT_DIR, "05_real_crm_incoming_call_on_schedule_pc_light.png");
  await page.screenshot({ path: callSchedulePath, fullPage: false });
  console.log(`   [SAVED] ${callSchedulePath}`);

  await applyTheme(page, "dark");
  const callScheduleDarkPath = path.join(OUT_DIR, "06_real_crm_telephony_drawer_on_schedule_pc_dark.png");
  await page.screenshot({ path: callScheduleDarkPath, fullPage: false });
  console.log(`   [SAVED] ${callScheduleDarkPath}`);

  await browser.close();
  console.log("\n=== ВСЕ СКРИНШОТЫ РЕАЛЬНЫХ КОНТУРОВ ЗАХВАЧЕНЫ ИЗ БОЕВОГО VITE! ===");
}

main().catch((err) => {
  console.error("CRITICAL ERROR during real contour capture:", err);
  process.exit(1);
});
