/**
 * scripts/capture-patient-studio-4state.cjs
 *
 * Сквозной скрипт снятия 4-State Red Team Visual Proofs в живом приложении (http://127.0.0.1:5173/):
 * 1. ☀️ PC Light (1440x900)
 * 2. 🌙 PC Dark (1440x900)
 * 3. 📱 Mobile Light (390x844)
 * 4. 📱 Mobile Dark (390x844)
 * 5. ☀️ PC Express Registration (10 sec, Mandate 8e)
 */

const { chromium } = require("playwright");
const fs = require("node:fs");
const path = require("node:path");

const TARGET_DIR = path.join(__dirname, "../docs/proofs/patient_studio");
if (!fs.existsSync(TARGET_DIR)) {
  fs.mkdirSync(TARGET_DIR, { recursive: true });
}

async function setLightTheme(page) {
  await page.evaluate(() => {
    document.documentElement.setAttribute("data-theme", "light");
    document.body.setAttribute("data-theme", "light");
    document.documentElement.classList.remove("dark");
    document.documentElement.classList.add("light");
    document.body.classList.remove("dark");
    document.body.classList.add("light");
    localStorage.setItem("dente_theme", "light");
    localStorage.setItem("theme", "light");
  });
  await page.waitForTimeout(400);
}

async function setDarkTheme(page) {
  await page.evaluate(() => {
    document.documentElement.dataset.theme = "dark";
    document.documentElement.setAttribute("data-theme", "dark");
    document.documentElement.classList.remove("light");
    document.documentElement.classList.add("dark");
    document.documentElement.style.colorScheme = "dark";

    document.body.dataset.theme = "dark";
    document.body.setAttribute("data-theme", "dark");
    document.body.classList.remove("light");
    document.body.classList.add("dark");
    document.body.style.colorScheme = "dark";

    localStorage.setItem("dente_theme", "dark");
    localStorage.setItem("theme", "dark");
  });
  await page.waitForTimeout(600);
}

const BASE_URL = process.env.VITE_URL || "http://127.0.0.1:5173";

async function main() {
  console.log("=== Запуск Chromium для 4-State Visual Proofs Patient Studio ===");
  console.log(`Base URL: ${BASE_URL}`);

  const browser = await chromium.launch({
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });

  try {
    // ════════════════════════════════════════════════════════════════
    // 1. ДЕСКТОПНЫЙ РЕЖИМ (1440 x 900)
    // ════════════════════════════════════════════════════════════════
    console.log("\n--- 1. PC 1440x900 Proofs ---");
    const pcContext = await browser.newContext({
      viewport: { width: 1440, height: 900 },
      deviceScaleFactor: 1,
    });
    const pcPage = await pcContext.newPage();

    console.log("Загрузка http://127.0.0.1:5173/#patient-studio (PC Light)...");
    await pcPage.goto(`${BASE_URL}/#patient-studio`, {
      waitUntil: "domcontentloaded",
      timeout: 30000,
    });
    await pcPage.waitForTimeout(2000);

    // Убедимся, что открыта студия
    await pcPage.evaluate(() => {
      window.dispatchEvent(new CustomEvent("dente:open-patient-studio"));
    });
    await pcPage.waitForTimeout(1000);

    // 1.1 PC Light
    await setLightTheme(pcPage);
    const p1 = path.join(TARGET_DIR, "01_patient_studio_pc_light_1440x900.png");
    await pcPage.screenshot({ path: p1 });
    console.log(`[PROOF 1 SAVED] ${p1} (${fs.statSync(p1).size} bytes)`);

    // 1.2 PC Dark
    console.log("Переключение в PC Dark...");
    await setDarkTheme(pcPage);
    const p2 = path.join(TARGET_DIR, "02_patient_studio_pc_dark_1440x900.png");
    await pcPage.screenshot({ path: p2 });
    console.log(`[PROOF 2 SAVED] ${p2} (${fs.statSync(p2).size} bytes)`);

    // 1.3 PC Express Registration (10 sec)
    console.log("Открытие экспресс-регистрации за 10 сек...");
    const newBtn = await pcPage.$('[data-testid="patient-studio-new-btn"]');
    if (newBtn) {
      await newBtn.click();
      await pcPage.waitForTimeout(600);
      await setLightTheme(pcPage);
      const p5 = path.join(TARGET_DIR, "05_patient_studio_express_create_pc_light.png");
      await pcPage.screenshot({ path: p5 });
      console.log(`[PROOF 5 SAVED] ${p5} (${fs.statSync(p5).size} bytes)`);
    }

    await pcContext.close();

    // ════════════════════════════════════════════════════════════════
    // 2. МОБИЛЬНЫЙ РЕЖИМ (390 x 844, Apple iPhone 14 / HIG Bottom Sheet)
    // ════════════════════════════════════════════════════════════════
    console.log("\n--- 2. Mobile 390x844 Proofs ---");
    const mobileContext = await browser.newContext({
      viewport: { width: 390, height: 844 },
      deviceScaleFactor: 2,
      isMobile: true,
      hasTouch: true,
    });
    const mobilePage = await mobileContext.newPage();

    console.log("Загрузка http://127.0.0.1:5173/#patient-studio (Mobile Light)...");
    await mobilePage.goto(`${BASE_URL}/#patient-studio`, {
      waitUntil: "domcontentloaded",
      timeout: 30000,
    });
    await mobilePage.waitForTimeout(2000);

    await mobilePage.evaluate(() => {
      window.dispatchEvent(new CustomEvent("dente:open-patient-studio"));
    });
    await mobilePage.waitForTimeout(1000);

    // 2.1 Mobile Light
    await setLightTheme(mobilePage);
    const p3 = path.join(TARGET_DIR, "03_patient_studio_mobile_light_390x844.png");
    await mobilePage.screenshot({ path: p3 });
    console.log(`[PROOF 3 SAVED] ${p3} (${fs.statSync(p3).size} bytes)`);

    // 2.2 Mobile Dark
    console.log("Переключение в Mobile Dark...");
    await setDarkTheme(mobilePage);
    const p4 = path.join(TARGET_DIR, "04_patient_studio_mobile_dark_390x844.png");
    await mobilePage.screenshot({ path: p4 });
    console.log(`[PROOF 4 SAVED] ${p4} (${fs.statSync(p4).size} bytes)`);

    await mobileContext.close();

    console.log("\n=== Все 4-State скриншоты успешно сняты в docs/proofs/patient_studio/ ===");
  } catch (err) {
    console.error("Ошибка снятия скриншотов:", err);
    process.exitCode = 1;
  } finally {
    await browser.close();
  }
}

main();
