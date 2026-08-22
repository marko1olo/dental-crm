import puppeteer from "puppeteer";
import path from "path";

const API_BASE = "http://127.0.0.1:4100";
const APP_BASE = "http://127.0.0.1:5173";
const CHROME_PATH = "C:/Program Files/Google/Chrome/Application/chrome.exe";
const OUT_DIR = "C:\\Users\\Admin\\.gemini\\antigravity\\brain\\37b8f253-5512-4e6a-af2e-6b6677f4c08f";

async function provisionTestClinic() {
  const uniqueId = Date.now();
  const loginEmail = `tel-test-${uniqueId}@dente-visual-test.local`;
  const password = "Dente2026!";
  const ownerPin = "123456";

  const initRes = await fetch(`${API_BASE}/api/auth/setup/init`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      clinicName: `Стоматология Дент-Телефония ${uniqueId}`,
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

  return {
    clinicToken: initData.clinicToken,
    staffToken: unlockData.staffToken,
  };
}

async function main() {
  const { clinicToken, staffToken } = await provisionTestClinic();

  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: "new",
    args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-dev-shm-usage"],
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900 });

  await page.evaluateOnNewDocument((ct, st) => {
    localStorage.setItem("dente_clinic_token", ct);
    localStorage.setItem("dente_staff_token", st);
    localStorage.setItem("dente_theme_mode", "dark");
    localStorage.setItem("dente_workspace_perspective", "standard");
    localStorage.setItem("dental-crm:onboarding:v1", JSON.stringify({ dismissed: true, step: "done" }));
    localStorage.setItem("dental-crm:web-ui-preferences:v1", JSON.stringify({
      version: 1,
      uiLanguage: "ru",
      selectedWorkspaceRole: "owner",
      selectedSpecialty: "therapist",
      onboardingDismissed: true,
      soundNotificationsMuted: false,
    }));
  }, clinicToken, staffToken);

  await page.goto(APP_BASE, { waitUntil: "domcontentloaded", timeout: 15000 });
  await new Promise((r) => setTimeout(r, 2500));

  // Trigger Incoming Call via useTelephonyStore
  await page.evaluate(() => {
    const store = (window).useTelephonyStore;
    if (store) {
      store.getState().triggerIncomingCall({
        callId: "call-12345",
        phone: "+79997776655",
        patientId: "patient-demo-1",
        patientName: "Кузнецова Елена Павловна",
        provider: "mango",
        timestamp: new Date().toISOString(),
        status: "ringing",
      });
    }
  });
  await new Promise((r) => setTimeout(r, 800));

  await page.screenshot({
    path: path.join(OUT_DIR, "feature_incoming_call_popup.png"),
    fullPage: false,
  });
  console.log("Captured feature_incoming_call_popup.png");

  // Open Telephony Simulator Modal
  await page.evaluate(() => {
    const store = (window).useTelephonyStore;
    if (store) {
      store.getState().openSimulator();
    }
  });
  await new Promise((r) => setTimeout(r, 800));

  await page.screenshot({
    path: path.join(OUT_DIR, "feature_telephony_simulator_modal.png"),
    fullPage: false,
  });
  console.log("Captured feature_telephony_simulator_modal.png");

  await browser.close();
}

main().catch((err) => {
  console.error("Error:", err);
  process.exit(1);
});
