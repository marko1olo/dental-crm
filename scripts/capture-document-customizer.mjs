import puppeteer from "puppeteer";
import path from "path";

const API_BASE = "http://127.0.0.1:4100";
const APP_BASE = "http://127.0.0.1:5173";
const CHROME_PATH = "C:/Program Files/Google/Chrome/Application/chrome.exe";
const OUT_DIR = "C:\\Users\\Admin\\.gemini\\antigravity\\brain\\0284cf50-cf45-4b19-be4c-f6f53b03120f\\real_crm_shots";

async function provisionTestClinic() {
  const uniqueId = Date.now();
  const loginEmail = `doc-custom-${uniqueId}@dente-test.local`;
  const password = "Dente2026!";
  const ownerPin = "123456";

  const initRes = await fetch(`${API_BASE}/api/auth/setup/init`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      clinicName: `Стоматологический Центр ДЕНТЕ ${uniqueId}`,
      email: loginEmail,
      password,
      ownerName: "Д-р Воронов Алексей Петрович",
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

  const patientRes = await fetch(`${API_BASE}/api/patients`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-dente-clinic-token": initData.clinicToken,
      "x-dente-staff-token": unlockData.staffToken,
    },
    body: JSON.stringify({
      fullName: "Мельникова Анна Валерьевна",
      birthDate: "1994-03-22",
      phone: "+7 (925) 334-55-66",
      gender: "female",
    }),
  });

  const patient = await patientRes.json();

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

  try {
    // 1. PC Dark Mode (1440x900) - Doctor's Chairsider View
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
      }));
    }, clinicToken, staffToken, patientId);

    await page.goto(APP_BASE, { waitUntil: "domcontentloaded" });
    await new Promise((r) => setTimeout(r, 2500));

    await page.screenshot({
      path: path.join(OUT_DIR, "01_real_crm_chairsider_dark_pc.png"),
      fullPage: false,
    });
    console.log("Captured 01_real_crm_chairsider_dark_pc.png");

    // 2. PC Light Mode (1440x900)
    await page.evaluate(() => {
      document.documentElement.setAttribute("data-theme", "light");
      document.documentElement.classList.remove("dark");
      document.documentElement.classList.add("light");
      document.body.className = "light";
    });
    await new Promise((r) => setTimeout(r, 600));

    await page.screenshot({
      path: path.join(OUT_DIR, "02_real_crm_chairsider_light_pc.png"),
      fullPage: false,
    });
    console.log("Captured 02_real_crm_chairsider_light_pc.png");

    // 3. Mobile Dark (390x844)
    const mobilePage = await browser.newPage();
    await mobilePage.setViewport({ width: 390, height: 844, isMobile: true, hasTouch: true });
    await mobilePage.evaluateOnNewDocument((ct, st, pid) => {
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
      }));
    }, clinicToken, staffToken, patientId);

    await mobilePage.goto(APP_BASE, { waitUntil: "domcontentloaded" });
    await new Promise((r) => setTimeout(r, 2000));

    await mobilePage.screenshot({
      path: path.join(OUT_DIR, "04_real_crm_chairsider_dark_mobile.png"),
      fullPage: false,
    });
    console.log("Captured 04_real_crm_chairsider_dark_mobile.png");

    // 4. Mobile Light (390x844)
    await mobilePage.evaluate(() => {
      document.documentElement.setAttribute("data-theme", "light");
      document.documentElement.classList.remove("dark");
      document.documentElement.classList.add("light");
      document.body.className = "light";
    });
    await new Promise((r) => setTimeout(r, 600));

    await mobilePage.screenshot({
      path: path.join(OUT_DIR, "05_real_crm_chairsider_light_mobile.png"),
      fullPage: false,
    });
    console.log("Captured 05_real_crm_chairsider_light_mobile.png");

  } finally {
    await browser.close();
  }
}

main().catch(err => {
  console.error("Capture failed:", err);
  process.exit(1);
});
