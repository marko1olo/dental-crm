import { chromium } from "playwright";

async function main() {
  const browser = await chromium.launch({
    headless: true,
    executablePath: "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });

  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });

  console.log("Navigating to http://127.0.0.1:5173/");
  await page.goto("http://127.0.0.1:5173/", { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(2500);

  // Clear any stale tokens
  await page.evaluate(() => {
    localStorage.clear();
    sessionStorage.clear();
  });
  await page.reload({ waitUntil: "domcontentloaded" });
  await page.waitForTimeout(2000);

  // Check what's visible
  const hasDemoBtn = await page.locator('button:has-text("Быстрый вход в Демо-тур")').first().isVisible({ timeout: 3000 }).catch(() => false);
  console.log("Has quick demo button:", hasDemoBtn);

  if (hasDemoBtn) {
    console.log("Clicking quick demo entry...");
    await page.locator('button:has-text("Быстрый вход в Демо-тур")').first().click();
    await page.waitForTimeout(1000);

    const adminCard = page.locator('.auth-demo-role-card:has-text("Старший администратор")').first();
    console.log("Admin card visible:", await adminCard.isVisible({ timeout: 2000 }).catch(() => false));
    if (await adminCard.isVisible()) {
      await adminCard.click();
      await page.waitForTimeout(500);
    }

    const launchBtn = page.locator(".auth-submit-btn--glow").first();
    console.log("Launch button visible:", await launchBtn.isVisible({ timeout: 2000 }).catch(() => false));
    if (await launchBtn.isVisible()) {
      await launchBtn.click();
    }
  }

  console.log("Waiting for workspace topbar...");
  await page.waitForSelector('[data-testid="workspace-topbar"]', { timeout: 20000 });
  console.log("SUCCESS! Workspace topbar is mounted!");
  await page.waitForTimeout(3000);

  // Check state
  const state = await page.evaluate(() => {
    return {
      role: window.__useAppStore?.getState()?.selectedWorkspaceRole,
      view: window.__useAppStore?.getState()?.currentView,
      hasTelephony: Boolean(window.__denteTelephonyStore),
    };
  });
  console.log("Loaded workspace state:", state);

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
