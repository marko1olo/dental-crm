const { chromium } = require("playwright");
const path = require("node:path");

async function testInitScript() {
  const browser = await chromium.launch({
    headless: true,
    executablePath: "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
    args: ["--no-sandbox", "--disable-gpu"],
  });

  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
  });

  await context.addInitScript(() => {
    localStorage.setItem("dente_clinic_token", "demo-showcase-token-therapist");
    localStorage.setItem("dente_staff_token", "demo-showcase-staff-token-therapist");
    localStorage.setItem("dente_active_role", "doctor");
    localStorage.setItem("dente_theme_mode", "light");
    localStorage.setItem("dental-crm:onboarding:v1", JSON.stringify({ completed: true, dismissed: true }));
    localStorage.setItem("dente_tour_completed", "true");
    localStorage.setItem("dente_quest_progress_v2", JSON.stringify({ isDismissedPermanently: true, activeTrack: null, tracksProgress: {} }));
    localStorage.setItem("dental-crm:web-ui-preferences:v1", JSON.stringify({
      version: 1,
      uiLanguage: "ru",
      selectedWorkspaceRole: "doctor",
      selectedPatientId: "01a00000-0000-0000-0000-000000000001",
      onboardingDismissed: true,
      onboardingStep: "done",
    }));
  });

  const page = await context.newPage();
  console.log("[Init] Navigating...");
  await page.goto("http://127.0.0.1:5173/", { waitUntil: "domcontentloaded", timeout: 20000 });
  await page.waitForTimeout(3000);

  // Check what's visible
  const shot = path.resolve(__dirname, "..", "docs", "screenshots", "dental_chart_inquisition", "probe_init_storage.png");
  await page.screenshot({ path: shot });
  console.log("[Init] Saved screenshot:", shot);

  await context.close();
  await browser.close();
}

testInitScript().catch(console.error);
