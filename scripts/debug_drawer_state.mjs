import { chromium } from "playwright";

async function main() {
  const browser = await chromium.launch({
    headless: true,
    executablePath: "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });

  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });

  page.on("console", (msg) => console.log("PAGE LOG:", msg.type(), msg.text()));
  page.on("pageerror", (err) => console.log("PAGE ERROR:", err));

  console.log("Navigating to http://127.0.0.1:5173/");
  await page.goto("http://127.0.0.1:5173/", { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(2000);

  // Quick demo login
  const demoEntry = page.locator("text=Быстрый вход в Демо-тур").first();
  if (await demoEntry.isVisible({ timeout: 2000 }).catch(() => false)) {
    console.log("Clicking quick demo entry...");
    await demoEntry.click();
    await page.waitForTimeout(1000);
  }
  const launchBtn = page.locator(".auth-submit-btn--glow").first();
  if (await launchBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
    console.log("Clicking launch button...");
    await launchBtn.click();
    await page.waitForTimeout(3000);
  }

  // Select Reception role
  const receptionRoleBtn = page.locator('button:has-text("Ресепшен")').first();
  if (await receptionRoleBtn.isVisible({ timeout: 1500 }).catch(() => false)) {
    console.log("Switching to Reception role...");
    await receptionRoleBtn.click();
    await page.waitForTimeout(1000);
  }

  // Navigate to Schedule ("Записи")
  const scheduleNav = page.locator('button:has-text("Записи")').first();
  if (await scheduleNav.isVisible({ timeout: 1500 }).catch(() => false)) {
    console.log("Opening Schedule...");
    await scheduleNav.click();
    await page.waitForTimeout(1500);
  }

  const state1 = await page.evaluate(() => {
    return {
      hasTelephony: Boolean(window.__denteTelephonyStore),
      hasUiSurface: Boolean(window.__useUiSurfaceStore),
      tel: window.__denteTelephonyStore?.getState?.(),
      surface: window.__useUiSurfaceStore?.getState?.(),
    };
  });
  console.log("Initial state:", JSON.stringify(state1, null, 2));

  // Trigger call
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

  // Open drawer
  await page.evaluate(() => {
    window.__denteTelephonyStore.getState().openCallDrawer();
  });
  await page.waitForTimeout(1000);

  const state2 = await page.evaluate(() => {
    const drawerEl = document.querySelector('[data-testid="telephony-patient-side-drawer"]');
    const allDrawers = Array.from(document.querySelectorAll('[data-testid*="drawer"]')).map(el => el.getAttribute('data-testid'));
    const capsuleEl = document.querySelector('[data-testid="incoming-call-capsule"]');
    const popupEl = document.querySelector('[data-testid="incoming-call-popup-dialog"]');
    return {
      tel: {
        activeCall: window.__denteTelephonyStore?.getState()?.activeCall?.patientName,
        isCallDrawerOpen: window.__denteTelephonyStore?.getState()?.isCallDrawerOpen,
      },
      surface: {
        activeDrawer: window.__useUiSurfaceStore?.getState()?.activeDrawer,
        hasPrimaryModal: window.__useUiSurfaceStore?.getState()?.hasPrimaryModal,
        isFullScreenStudioActive: window.__useUiSurfaceStore?.getState()?.isFullScreenStudioActive,
      },
      hasDrawerEl: Boolean(drawerEl),
      drawerHtml: drawerEl ? drawerEl.outerHTML.slice(0, 300) : null,
      allDrawers,
      hasCapsule: Boolean(capsuleEl),
      hasPopup: Boolean(popupEl),
    };
  });
  console.log("After openCallDrawer state:", JSON.stringify(state2, null, 2));

  await browser.close();
}

main().catch(console.error);
