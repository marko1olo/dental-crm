import { chromium } from "playwright";

async function main() {
  const browser = await chromium.launch({
    headless: true,
    executablePath: "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });

  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });

  await page.addInitScript(() => {
    localStorage.setItem("dente_clinic_token", "demo-clinic-token");
    localStorage.setItem("dente_staff_token", "demo-staff-token");
    localStorage.setItem("dente_active_role", "administrator");
    localStorage.setItem("dente_theme_mode", "light");
    localStorage.setItem("dente_tour_completed", "true");
    localStorage.setItem("dente_guide_tour_dismissed_v2", "true");
    localStorage.setItem("dente_guide_tour_seen_roles_v2", JSON.stringify(["admin", "doctor", "director", "administrator"]));
    localStorage.setItem("dental-crm:onboarding:v1", JSON.stringify({ dismissed: true, step: "done" }));
    localStorage.setItem("dental-crm:web-ui-preferences:v1", JSON.stringify({
      version: 1,
      uiLanguage: "ru",
      selectedWorkspaceRole: "administrator",
      selectedSpecialty: "therapist",
    }));
  });

  console.log("Navigating to http://127.0.0.1:5173/");
  await page.goto("http://127.0.0.1:5173/", { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(2000);

  // Quick demo login if needed
  const demoEntry = page.locator("text=Быстрый вход в Демо-тур").first();
  if (await demoEntry.isVisible({ timeout: 2000 }).catch(() => false)) {
    console.log("Clicking quick demo entry...");
    await demoEntry.click();
    await page.waitForTimeout(1000);
    const enterRoleBtn = page.getByRole("button", { name: /Войти в демо-тур/i });
    if ((await enterRoleBtn.count()) > 0) {
      await enterRoleBtn.click();
      await page.waitForTimeout(3000);
    }
  }

  // Dismiss any tours
  await page.evaluate(() => {
    document.querySelectorAll(
      '.tour-spotlight-root, [data-testid="guided-tour-spotlight-overlay"], .tour-backdrop-clickable-zone, .doctor-clinical-training-tour, [data-tour-step]'
    ).forEach((el) => el.remove());
  });

  // Switch role and view via store
  await page.evaluate(() => {
    window.__useAppStore?.getState()?.setSelectedWorkspaceRole?.("administrator");
    window.__useAppStore?.getState()?.setCurrentView?.("schedule");
    window.__useUiSurfaceStore?.getState()?.closeAllSurfaces?.();
  });
  await page.waitForTimeout(1000);

  // Trigger call
  console.log("Triggering incoming call...");
  await page.evaluate(() => {
    window.__denteTelephonyStore.getState().triggerIncomingCall({
      callId: "call-voronov-demo-01",
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

  // Check popup and capsule
  const popupBefore = await page.locator('[data-testid="incoming-call-popup-dialog"]').isVisible();
  console.log("Popup visible before openCallDrawer:", popupBefore);

  // Open call drawer
  console.log("Opening call drawer...");
  await page.evaluate(() => {
    window.__denteTelephonyStore.getState().openCallDrawer();
  });
  await page.waitForTimeout(1000);

  const res = await page.evaluate(() => {
    const drawerEl = document.querySelector('[data-testid="telephony-patient-side-drawer"]');
    const capsuleEl = document.querySelector('[data-testid="incoming-call-capsule"]');
    const popupEl = document.querySelector('[data-testid="incoming-call-popup-dialog"]');
    return {
      hasDrawer: Boolean(drawerEl),
      drawerVisible: drawerEl ? window.getComputedStyle(drawerEl).display !== "none" : false,
      hasCapsule: Boolean(capsuleEl),
      capsuleText: capsuleEl ? capsuleEl.innerText : null,
      hasPopup: Boolean(popupEl),
      storeRole: window.__useAppStore?.getState()?.selectedWorkspaceRole,
      storeView: window.__useAppStore?.getState()?.currentView,
      activeDrawer: window.__useUiSurfaceStore?.getState()?.activeDrawer,
      isCallDrawerOpen: window.__denteTelephonyStore?.getState()?.isCallDrawerOpen,
    };
  });
  console.log("Result:", JSON.stringify(res, null, 2));

  await browser.close();
}

main().catch(console.error);
