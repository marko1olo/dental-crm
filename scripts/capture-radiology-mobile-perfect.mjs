import { chromium } from "playwright";
import fs from "node:fs";
import path from "node:path";

const WEB_BASE = "http://127.0.0.1:5176";
const PROOFS_DIR = path.resolve("C:/Clinic_MVP/dental-crm/docs/proofs/radiology");

const initDoctorSession = () => {
  try {
    localStorage.setItem("dente_clinic_token", "demo-clinic-token");
    localStorage.setItem("dente_staff_token", "demo-staff-token");
    localStorage.setItem("dente_active_session_token", "demo-staff-token");
    localStorage.setItem("dente_active_user_id", "user-rad-1");
    localStorage.setItem("dente_active_role", "doctor");
    localStorage.setItem("dente_active_mode", "doctor");
    localStorage.setItem("dente_user_id", "user-rad-1");
    localStorage.setItem("dente_onboarding_completed", "true");
    localStorage.setItem("dente_tour_completed", "true");
    localStorage.setItem("dente_doctor_shift_active", "true");
    localStorage.setItem("dente_offline_autonomy_mode", "true");
    localStorage.setItem("dente_demo_showcase", "true");
    localStorage.setItem("dente_demo_showcase_mode", "true");
    localStorage.setItem("dente_active_tooth", "36");
    sessionStorage.setItem("dente_unlocked", "true");

    const doctorUser = {
      id: "user-rad-1",
      userId: "user-rad-1",
      name: "Д-р Захаров А. В.",
      fullName: "Д-р Захаров Андрей Васильевич",
      role: "doctor",
      specialties: ["Стоматолог-терапевт", "Хирург-имплантолог"],
    };

    localStorage.setItem("dente_staff_session", JSON.stringify(doctorUser));
    localStorage.setItem("dente_cached_active_staff_user", JSON.stringify(doctorUser));
    localStorage.setItem("dente_cached_staff_list", JSON.stringify([doctorUser]));
    localStorage.setItem(
      "dente-workspace-profile",
      JSON.stringify({ mode: "doctor", role: "doctor", activeRole: "doctor" })
    );
  } catch (e) {}
};

async function setDarkTheme(page) {
  await page.evaluate(() => {
    document.documentElement.setAttribute("data-theme", "dark");
    document.body.setAttribute("data-theme", "dark");
    document.documentElement.classList.add("dark");
    document.documentElement.classList.remove("light");
    document.body.classList.add("dark");
    document.body.classList.remove("light");
    document.documentElement.style.colorScheme = "dark";
    localStorage.setItem("dente_theme_mode", "dark");
    localStorage.setItem("dente_theme", "dark");
    localStorage.setItem("theme", "dark");
  });
  await page.waitForTimeout(300);
}

async function setLightTheme(page) {
  await page.evaluate(() => {
    document.documentElement.setAttribute("data-theme", "light");
    document.body.setAttribute("data-theme", "light");
    document.documentElement.classList.add("light");
    document.documentElement.classList.remove("dark");
    document.body.classList.add("light");
    document.body.classList.remove("dark");
    document.documentElement.style.colorScheme = "light";
    localStorage.setItem("dente_theme_mode", "light");
    localStorage.setItem("dente_theme", "light");
    localStorage.setItem("theme", "light");
  });
  await page.waitForTimeout(300);
}

async function main() {
  const browser = await chromium.launch({
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-dev-shm-usage"],
  });

  try {
    const mobileContext = await browser.newContext({
      viewport: { width: 390, height: 844 },
      isMobile: true,
      hasTouch: true,
      deviceScaleFactor: 2,
    });
    await mobileContext.addInitScript(initDoctorSession);
    const page = await mobileContext.newPage();

    await page.goto(`${WEB_BASE}/?demo=true#radiology-standalone`, { waitUntil: "domcontentloaded", timeout: 30000 });
    await page.waitForTimeout(1500);

    // Диспетчим открытие визиографа
    await page.evaluate(() => {
      window.dispatchEvent(new CustomEvent("dente:open-radiology"));
    });
    await page.waitForTimeout(1000);

    // Проверяем наличие визиографа
    await page.waitForSelector('[data-testid="visiograph-study-viewer"], [data-testid="direct-radiology-launcher-root"]', { timeout: 10000 });

    // Снимаем 03_imaging_visiograph_mobile_light_390x844.png
    await setLightTheme(page);
    await page.waitForTimeout(500);
    const lightPath = path.join(PROOFS_DIR, "03_imaging_visiograph_mobile_light_390x844.png");
    await page.screenshot({ path: lightPath, fullPage: false });
    const statLight = fs.statSync(lightPath);
    console.log(`[CAPTURED] 03_imaging_visiograph_mobile_light_390x844.png (${(statLight.size / 1024).toFixed(1)} KB)`);

    // Снимаем 04_imaging_visiograph_mobile_dark_390x844.png
    await setDarkTheme(page);
    await page.waitForTimeout(500);
    const darkPath = path.join(PROOFS_DIR, "04_imaging_visiograph_mobile_dark_390x844.png");
    await page.screenshot({ path: darkPath, fullPage: false });
    const statDark = fs.statSync(darkPath);
    console.log(`[CAPTURED] 04_imaging_visiograph_mobile_dark_390x844.png (${(statDark.size / 1024).toFixed(1)} KB)`);

    await mobileContext.close();
  } finally {
    await browser.close();
  }
}

main().catch(console.error);
