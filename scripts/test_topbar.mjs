import { chromium } from "playwright";

const API_URL = "http://127.0.0.1:4100";

async function main() {
  const initRes = await fetch(`${API_URL}/api/auth/setup/init`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      clinicName: "Стоматология Дент-Мастер",
      email: `telephony-${Date.now()}@dente.local`,
      password: "Password123!",
      ownerName: "Воронов Д. И.",
      ownerPin: "1234",
    }),
  });
  const initData = await initRes.json();

  const unlockRes = await fetch(`${API_URL}/api/auth/staff/unlock`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-dente-clinic-token": initData.clinicToken,
    },
    body: JSON.stringify({ userId: initData.ownerUserId, pinCode: "1234" }),
  });
  const unlockData = await unlockRes.json();

  const browser = await chromium.launch({
    headless: true,
    executablePath: "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });

  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });

  await page.addInitScript(
    ({ clinicToken, staffToken, user }) => {
      localStorage.setItem("dente_clinic_token", clinicToken);
      localStorage.setItem("dente_staff_token", staffToken);
      localStorage.setItem("dente_active_staff_user", JSON.stringify(user));
      localStorage.setItem("dente_active_role", "administrator");
      localStorage.setItem("dente_selected_role", "administrator");
      localStorage.setItem("dente_tour_completed", "true");
      localStorage.setItem("dente_express_tour_dismissed", "true");
      localStorage.setItem("dente_guide_tour_dismissed_v2", "true");
      sessionStorage.setItem("dente_unlocked", "true");
      localStorage.setItem(
        "dental-crm:web-ui-preferences:v1",
        JSON.stringify({
          version: 1,
          uiLanguage: "ru",
          selectedWorkspaceRole: "administrator",
          onboardingDismissed: true,
          onboardingStep: "done",
        }),
      );
    },
    { clinicToken: initData.clinicToken, staffToken: unlockData.staffToken, user: unlockData.user },
  );

  console.log("Navigating to http://127.0.0.1:5173/#schedule");
  await page.goto("http://127.0.0.1:5173/#schedule", { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(3000);

  const topbar = await page.locator("header.topbar").isVisible();
  console.log("header.topbar visible:", topbar);

  // Trigger Incoming Call
  console.log("Triggering call for Воронов Дмитрий Игоревич...");
  await page.evaluate(() => {
    window.__denteTelephonyStore.getState().triggerIncomingCall({
      callId: "call-voronov-live-01",
      phone: "+7 925 876-54-32",
      patientId: "01a00000-0000-0000-0000-000000000002",
      patientName: "Воронов Дмитрий Игоревич",
      status: "answered",
      durationSeconds: 3,
      recordingUrl: "https://example.com/audio/call-sample.mp3",
      provider: "sip",
    });
  });
  await page.waitForTimeout(1000);

  const popupVis = await page.locator('[data-testid="incoming-call-popup-dialog"]').isVisible();
  console.log("Popup visible:", popupVis);

  // Open drawer
  console.log("Opening call drawer...");
  await page.evaluate(() => {
    window.__denteTelephonyStore.getState().openCallDrawer();
  });
  await page.waitForTimeout(1000);

  const drawerVis = await page.locator('[data-testid="telephony-patient-side-drawer"]').isVisible();
  const capsuleVis = await page.locator('[data-testid="incoming-call-capsule"]').isVisible();
  console.log("Drawer visible:", drawerVis);
  console.log("Capsule visible:", capsuleVis);

  await browser.close();
}

main().catch(console.error);
