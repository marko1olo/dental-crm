import puppeteer from "puppeteer";
import path from "path";
import fs from "fs";

const APP_BASE = "http://127.0.0.1:5173";
const CHROME_PATH = "C:/Program Files/Google/Chrome/Application/chrome.exe";
const OUT_DIR = path.resolve("docs/screenshots/inquisition_live");

if (!fs.existsSync(OUT_DIR)) {
  fs.mkdirSync(OUT_DIR, { recursive: true });
}

async function main() {
  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: "new",
    args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-web-security"],
  });

  const page = await browser.newPage();
  await page.setViewport({
    width: 390,
    height: 844,
    deviceScaleFactor: 2,
    isMobile: true,
    hasTouch: true,
  });

  await page.goto(`${APP_BASE}/`, { waitUntil: "domcontentloaded", timeout: 15000 });
  await new Promise((r) => setTimeout(r, 1000));

  // 1. Click "Быстрый вход в Демо-тур (Без пароля)" or "Войти в систему"
  const demoTourBtn = await page.$('::-p-text("Быстрый вход в Демо-тур")');
  if (demoTourBtn) {
    console.log("Clicking Demo Tour button...");
    await demoTourBtn.click();
    await new Promise((r) => setTimeout(r, 1000));
  } else {
    const loginBtn = await page.$('::-p-text("Войти в систему")');
    if (loginBtn) {
      console.log("Clicking Login button...");
      await loginBtn.click();
      await new Promise((r) => setTimeout(r, 1000));
    }
  }

  // 2. If PIN pad appears, enter 1111
  await new Promise((r) => setTimeout(r, 1000));
  const pin1 = await page.$('::-p-text("Доктор Демо")');
  const buttons = await page.$$("button");
  for (const b of buttons) {
    const text = await page.evaluate((el) => el.textContent.trim(), b);
    if (text === "1") {
      console.log("Entering PIN: 1111");
      for (let i = 0; i < 4; i++) {
        await b.click();
        await new Promise((r) => setTimeout(r, 120));
      }
      break;
    }
  }

  await new Promise((r) => setTimeout(r, 2000));

  // 3. Clear overlays & set tour complete
  await page.evaluate(() => {
    localStorage.setItem("dental-crm:onboarding:v1", JSON.stringify({ completed: true, dismissed: true }));
    localStorage.setItem("dente_tour_completed", "true");
    document.querySelectorAll('.tour-spotlight-root, [data-testid="guided-tour-spotlight-overlay"], .tour-backdrop-clickable-zone, [data-testid="demo-mode-banner"]').forEach((el) => el.remove());
  });

  // 4. Click Patients tab in MobileTabBar
  console.log("Waiting for MobileTabBar...");
  await page.waitForSelector(".mobile-tab-bar", { timeout: 10000 });
  const tabs = await page.$$(".mobile-tab-item");
  for (const t of tabs) {
    const text = await page.evaluate((el) => el.textContent.trim(), t);
    if (text.includes("Пациенты")) {
      console.log("Clicking Patients tab...");
      await t.click();
      break;
    }
  }

  await new Promise((r) => setTimeout(r, 2000));
  await page.waitForSelector("#patients, .patients-panel", { timeout: 10000 });
  console.log("Patients view loaded!");

  // Light screenshot
  await page.evaluate(() => {
    document.documentElement.setAttribute("data-theme", "light");
    document.documentElement.classList.remove("dark");
    document.documentElement.classList.add("light");
    localStorage.setItem("dente_theme_mode", "light");
  });
  await new Promise((r) => setTimeout(r, 600));

  const baselineLightPath = path.join(OUT_DIR, "baseline_mobile_patients_light.png");
  await page.screenshot({ path: baselineLightPath });
  console.log(`Saved baseline light: ${baselineLightPath}`);

  // Dark screenshot
  await page.evaluate(() => {
    document.documentElement.setAttribute("data-theme", "dark");
    document.documentElement.classList.remove("light");
    document.documentElement.classList.add("dark");
    localStorage.setItem("dente_theme_mode", "dark");
  });
  await new Promise((r) => setTimeout(r, 600));

  const baselineDarkPath = path.join(OUT_DIR, "baseline_mobile_patients_dark.png");
  await page.screenshot({ path: baselineDarkPath });
  console.log(`Saved baseline dark: ${baselineDarkPath}`);

  await browser.close();
  console.log("Done!");
}

main().catch((err) => {
  console.error("Error in test_capture:", err);
  process.exit(1);
});
