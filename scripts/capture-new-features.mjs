import puppeteer from "puppeteer";
import path from "path";

const API_BASE = "http://127.0.0.1:4100";
const APP_BASE = "http://127.0.0.1:5173";
const CHROME_PATH = "C:/Program Files/Google/Chrome/Application/chrome.exe";
const OUT_DIR = "C:\\Users\\Admin\\.gemini\\antigravity\\brain\\0284cf50-cf45-4b19-be4c-f6f53b03120f\\real_crm_shots";

async function provisionTestClinic() {
  const uniqueId = Date.now();
  const loginEmail = `audit-real-${uniqueId}@dente-visual-test.local`;
  const password = "Dente2026!";
  const ownerPin = "123456";

  const initRes = await fetch(`${API_BASE}/api/auth/setup/init`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      clinicName: `Стоматология Дент-Премиум ${uniqueId}`,
      email: loginEmail,
      password,
      ownerName: "Д-р Смирнов Алексей Петрович",
      ownerPin,
    }),
  });

  if (!initRes.ok) throw new Error(`setup/init failed ${initRes.status}`);
  const initData = await initRes.json();

  const unlockRes = await fetch(`${API_BASE}/api/auth/staff/unlock`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-dente-clinic-token": initData.clinicToken,
    },
    body: JSON.stringify({ userId: initData.ownerUserId, pinCode: ownerPin }),
  });

  if (!unlockRes.ok) throw new Error(`staff/unlock failed ${unlockRes.status}`);
  const unlockData = await unlockRes.json();

  // Create patient with teeth pathologies
  const patientRes = await fetch(`${API_BASE}/api/patients`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-dente-clinic-token": initData.clinicToken,
      "x-dente-staff-token": unlockData.staffToken,
    },
    body: JSON.stringify({
      fullName: "Воронова Екатерина Сергеевна",
      birthDate: "1992-07-14",
      phone: "+7 (999) 888-11-22",
      gender: "female",
    }),
  });

  const patient = await patientRes.json();

  // Seed findings on teeth 16, 24, 36, 46
  await fetch(`${API_BASE}/api/patients/${patient.id}/tooth-states/batch`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-dente-clinic-token": initData.clinicToken,
      "x-dente-staff-token": unlockData.staffToken,
    },
    body: JSON.stringify({
      toothNumbers: [16],
      state: "Pulpitis",
    }),
  });

  return {
    clinicToken: initData.clinicToken,
    staffToken: unlockData.staffToken,
    patientId: patient.id,
  };
}

async function main() {
  const { clinicToken, staffToken, patientId } = await provisionTestClinic();

  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: "new",
    args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-dev-shm-usage"],
  });

  // 1. Desktop Dark Mode (1440x900)
  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900 });

  await page.evaluateOnNewDocument((ct, st, pid) => {
    localStorage.setItem("dente_clinic_token", ct);
    localStorage.setItem("dente_staff_token", st);
    localStorage.setItem("dente_theme_mode", "dark");
    localStorage.setItem("dente_workspace_perspective", "chairsider");
    localStorage.setItem("dental-crm:onboarding:v1", JSON.stringify({ dismissed: true, step: "done" }));
    localStorage.setItem("dental-crm:web-ui-preferences:v1", JSON.stringify({
      version: 1,
      uiLanguage: "ru",
      selectedWorkspaceRole: "owner",
      selectedSpecialty: "therapist",
      selectedPatientId: pid || null,
      onboardingDismissed: true,
      soundNotificationsMuted: false,
    }));
  }, clinicToken, staffToken, patientId);

  await page.goto(APP_BASE, { waitUntil: "domcontentloaded" });
  await new Promise((r) => setTimeout(r, 3000));

  // Click tooth 16 to trigger the floating popup
  await page.evaluate(() => {
    const tooth16 = document.querySelector('[data-tooth="16"]') || 
                    document.querySelector('[data-tooth-number="16"]') || 
                    Array.from(document.querySelectorAll('button')).find(b => b.textContent?.trim() === '16');
    if (tooth16) {
      tooth16.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
    }
  });
  await new Promise((r) => setTimeout(r, 1000));

  await page.screenshot({
    path: path.join(OUT_DIR, "01_real_crm_chairsider_dark_pc.png"),
    fullPage: false,
  });
  console.log("Captured 01_real_crm_chairsider_dark_pc.png");

  // 2. Desktop Light Mode (1440x900)
  await page.evaluate(() => {
    document.documentElement.setAttribute("data-theme", "light");
    document.documentElement.classList.remove("dark");
    document.documentElement.classList.add("light");
    document.body.className = "light";
  });
  await new Promise((r) => setTimeout(r, 600));

  // Click tooth 26 in light mode
  await page.evaluate(() => {
    const tooth26 = document.querySelector('[data-tooth="26"]') || 
                    document.querySelector('[data-tooth-number="26"]') || 
                    Array.from(document.querySelectorAll('button')).find(b => b.textContent?.trim() === '26');
    if (tooth26) {
      tooth26.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
    }
  });
  await new Promise((r) => setTimeout(r, 800));

  await page.screenshot({
    path: path.join(OUT_DIR, "02_real_crm_chairsider_light_pc.png"),
    fullPage: false,
  });
  console.log("Captured 02_real_crm_chairsider_light_pc.png");

  // 3. Open Endo Modal in PC Dark
  await page.evaluate(() => {
    document.documentElement.setAttribute("data-theme", "dark");
    document.documentElement.classList.remove("light");
    document.documentElement.classList.add("dark");
    document.body.className = "dark";
  });
  await new Promise((r) => setTimeout(r, 300));

  // Click tooth 16
  await page.evaluate(() => {
    const tooth16 = document.querySelector('[data-tooth="16"]') || 
                    document.querySelector('[data-tooth-number="16"]') || 
                    Array.from(document.querySelectorAll('button')).find(b => b.textContent?.trim() === '16');
    if (tooth16) (tooth16).click();
  });
  await new Promise((r) => setTimeout(r, 600));

  // Click Endo Log
  await page.evaluate(() => {
    const endoBtn = document.querySelector('[data-testid="chairsider-endo-canal-log-btn"]') || 
                    Array.from(document.querySelectorAll('button')).find(b => b.textContent?.includes('Журнал корневых каналов') || b.textContent?.includes('Эндо 043/у'));
    if (endoBtn) (endoBtn).click();
  });
  await new Promise((r) => setTimeout(r, 800));

  await page.screenshot({
    path: path.join(OUT_DIR, "03_real_crm_endo_modal_dark_pc.png"),
    fullPage: false,
  });
  console.log("Captured 03_real_crm_endo_modal_dark_pc.png");

  // 4. Mobile Dark Mode (390x844)
  await page.setViewport({ width: 390, height: 844, isMobile: true, hasTouch: true });
  await page.goto(APP_BASE, { waitUntil: "domcontentloaded" });
  await new Promise((r) => setTimeout(r, 3000));

  await page.screenshot({
    path: path.join(OUT_DIR, "04_real_crm_chairsider_dark_mobile.png"),
    fullPage: false,
  });
  console.log("Captured 04_real_crm_chairsider_dark_mobile.png");

  // 5. Mobile Light Mode (390x844)
  await page.evaluate(() => {
    document.documentElement.setAttribute("data-theme", "light");
    document.documentElement.classList.remove("dark");
    document.documentElement.classList.add("light");
    document.body.className = "light";
  });
  await new Promise((r) => setTimeout(r, 800));

  await page.screenshot({
    path: path.join(OUT_DIR, "05_real_crm_chairsider_light_mobile.png"),
    fullPage: false,
  });
  console.log("Captured 05_real_crm_chairsider_light_mobile.png");

  await browser.close();
  console.log("All real CRM screenshots successfully captured!");
}

main().catch((err) => {
  console.error("Screenshot error:", err);
  process.exit(1);
});
