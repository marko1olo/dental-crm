import puppeteer from "puppeteer";
import path from "path";

const APP_BASE = "http://127.0.0.1:5173";
const CHROME_PATH = "C:/Program Files/Google/Chrome/Application/chrome.exe";
const OUT_DIR = "C:\\Users\\Admin\\.gemini\\antigravity\\brain\\37b8f253-5512-4e6a-af2e-6b6677f4c08f";

async function main() {
  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: "new",
    args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-dev-shm-usage"],
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900 });

  await page.evaluateOnNewDocument(() => {
    localStorage.setItem("dente_clinic_token", "test-clinic-token");
    localStorage.setItem("dente_staff_token", "test-staff-token");
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
  });

  await page.goto(APP_BASE, { waitUntil: "networkidle2" });
  await new Promise((r) => setTimeout(r, 1500));

  // Trigger incoming call via window custom event
  await page.evaluate(() => {
    window.dispatchEvent(
      new CustomEvent("dente:incoming-call", {
        detail: {
          callerPhone: "+7 (999) 777-66-55",
          callerName: "Кузнецова Елена Павловна",
          provider: "Mango Telecom",
          patientId: "test-patient-1",
        },
      })
    );
  });
  await new Promise((r) => setTimeout(r, 800));

  await page.screenshot({
    path: path.join(OUT_DIR, "feature_incoming_call_popup.png"),
    fullPage: false,
  });
  console.log("Captured feature_incoming_call_popup.png");

  // Open Telephony Simulator modal
  await page.evaluate(() => {
    const telBtn = Array.from(document.querySelectorAll('button')).find(b => b.title?.includes('Телефония') || b.textContent?.includes('📞'));
    if (telBtn) (telBtn).click();
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
