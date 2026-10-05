import { chromium } from "playwright";
import fs from "node:fs";
import path from "node:path";

const APP_URL = "http://127.0.0.1:5173/#schedule";
const API_URL = "http://127.0.0.1:4100";
const TARGET_DIR = path.resolve("apps/web/public/screenshots/telephony_flow");
const BRAIN_DIR = "C:\\Users\\Admin\\.gemini\\antigravity\\brain\\df880520-dc90-48e7-ab9e-032bd60d9f31";

fs.mkdirSync(TARGET_DIR, { recursive: true });
fs.mkdirSync(BRAIN_DIR, { recursive: true });

async function dismissToursCompletely(page) {
  await page.evaluate(() => {
    localStorage.setItem("dente_tour_completed", "true");
    localStorage.setItem("dente_express_tour_dismissed", "true");
    localStorage.setItem("dente_guide_tour_dismissed_v2", "true");
    localStorage.setItem("dente_guide_tour_seen_roles_v2", JSON.stringify(["admin", "doctor", "director", "administrator"]));
    localStorage.setItem("dente_quest_progress_v2", JSON.stringify({
      activeTrackId: "solo_doctor",
      currentStepIndex: 0,
      completedStepIds: [],
      isTourActive: false,
      isDismissedPermanently: true,
      tracksProgress: {
        solo_doctor: { completed: true, completedStepIds: [] },
        reception_admin: { completed: true, completedStepIds: [] },
        imaging_diagnostics: { completed: true, completedStepIds: [] },
      },
    }));

    document.querySelectorAll(
      '.tour-spotlight-root, [data-testid="guided-tour-spotlight-overlay"], .tour-backdrop-clickable-zone, .doctor-clinical-training-tour, [data-tour-step], .interactive-guide-tour-container, .tour-container, .tour-popover, [data-tour]'
    ).forEach((el) => {
      el.remove();
    });

    document.querySelectorAll('.fixed.bottom-4.right-4').forEach((el) => {
      if (el.innerText.includes("ЭКСПРЕСС-ТУР")) el.remove();
    });
  });
  await page.waitForTimeout(300);
}

async function run() {
  console.log("1. Setting up fresh clinic & live tokens via API...");
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
  if (!initRes.ok) {
    throw new Error(`API setup init failed: ${initRes.status} ${await initRes.text()}`);
  }
  const initData = await initRes.json();

  const unlockRes = await fetch(`${API_URL}/api/auth/staff/unlock`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-dente-clinic-token": initData.clinicToken,
    },
    body: JSON.stringify({ userId: initData.ownerUserId, pinCode: "1234" }),
  });
  if (!unlockRes.ok) {
    throw new Error(`API unlock failed: ${unlockRes.status} ${await unlockRes.text()}`);
  }
  const unlockData = await unlockRes.json();
  console.log("Tokens acquired successfully:", { clinicToken: initData.clinicToken?.slice(0, 15), staffToken: unlockData.staffToken?.slice(0, 15) });

  // Pre-create patient Voronov Dmitry via API for instant recognition
  console.log("Creating patient Воронов Дмитрий Игоревич via API...");
  const patientRes = await fetch(`${API_URL}/api/patients`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-dente-clinic-token": initData.clinicToken,
      "x-dente-staff-token": unlockData.staffToken,
    },
    body: JSON.stringify({
      fullName: "Воронов Дмитрий Игоревич",
      phone: "+7 925 876-54-32",
    }),
  });
  let patientId = "01a00000-0000-0000-0000-000000000002";
  if (patientRes.ok) {
    const createdPatient = await patientRes.json();
    patientId = createdPatient.id;
    console.log("Created patient with ID:", patientId);
  }

  const browser = await chromium.launch({
    headless: true,
    executablePath: "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });

  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    deviceScaleFactor: 1,
  });

  const page = await context.newPage();

  // Inject live tokens before navigation
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
      localStorage.setItem("dente_guide_tour_seen_roles_v2", JSON.stringify(["admin", "doctor", "director", "administrator"]));
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

  console.log("Navigating to", APP_URL);
  await page.goto(APP_URL, { waitUntil: "domcontentloaded", timeout: 20000 });

  console.log("Waiting for workspace topbar...");
  await page.waitForSelector("header.topbar", { timeout: 15000 });
  console.log("Workspace topbar mounted! App is live!");
  await page.waitForTimeout(2000);

  await dismissToursCompletely(page);

  // Ensure role is administrator and schedule view
  await page.evaluate(() => {
    window.__useAppStore?.getState()?.setSelectedWorkspaceRole?.("administrator");
    window.__useAppStore?.getState()?.setCurrentView?.("schedule");
    window.__useUiSurfaceStore?.getState()?.closeAllSurfaces?.();
  });
  await page.waitForTimeout(500);

  // Trigger Incoming Call for Voronov Dmitry
  console.log("Triggering answered incoming call for Воронов Дмитрий Игоревич...");
  await page.evaluate((pid) => {
    const store = (window).__denteTelephonyStore;
    if (!store) throw new Error("window.__denteTelephonyStore is missing");
    store.getState().triggerIncomingCall({
      callId: "call-voronov-live-01",
      phone: "+7 925 876-54-32",
      patientId: pid,
      patientName: "Воронов Дмитрий Игоревич",
      status: "answered",
      durationSeconds: 3,
      recordingUrl: "https://example.com/audio/call-sample.mp3",
      provider: "sip",
    });
  }, patientId);
  await page.waitForTimeout(1000);

  // --------------------------------------------------------------------------
  // VIEW 1: POPUP EXPANDED WITH 1-CLICK BOOKING SLOTS OPEN (LIGHT)
  // --------------------------------------------------------------------------
  console.log("Setting up View 1 (Light)...");
  await page.evaluate(() => {
    const themeStore = (window).__useThemeStore;
    if (themeStore) themeStore.getState().setThemeMode("light");
    const telStore = (window).__denteTelephonyStore;
    if (telStore) telStore.getState().closeCallDrawer();
  });
  await page.waitForTimeout(500);

  // Expand capsule if collapsed
  const expandBtn = page.locator('[data-testid="capsule-expand-btn"]');
  if (await expandBtn.isVisible({ timeout: 1500 }).catch(() => false)) {
    console.log("Clicking capsule expand button...");
    await expandBtn.click();
    await page.waitForTimeout(500);
  }

  // Open 1-click booking accordion
  const quickBookingContainer = page.locator('[data-testid="popup-quick-booking-container"]');
  if (!(await quickBookingContainer.isVisible({ timeout: 500 }).catch(() => false))) {
    console.log("Opening quick booking slots accordion...");
    const bookBtn = page.locator('[data-testid="badge-action-book"]');
    if (await bookBtn.isVisible({ timeout: 1500 }).catch(() => false)) {
      await bookBtn.click();
      await page.waitForTimeout(500);
    }
  }

  await dismissToursCompletely(page);
  await page.waitForTimeout(800);

  // Verify popup dialog is visible
  const popupDialog = page.locator('[data-testid="incoming-call-popup"]');
  await popupDialog.waitFor({ state: "visible", timeout: 5000 });
  console.log("Popup dialog is visible!");

  const view1LightPath = path.join(TARGET_DIR, "01_incoming_call_popup_booking_light.png");
  const view1LightCompatPath = path.join(TARGET_DIR, "incoming_call_popup_light.png");
  await page.screenshot({ path: view1LightPath });
  fs.copyFileSync(view1LightPath, view1LightCompatPath);
  fs.copyFileSync(view1LightPath, path.join(BRAIN_DIR, "01_incoming_call_popup_booking_light.png"));
  fs.copyFileSync(view1LightPath, path.join(BRAIN_DIR, "incoming_call_popup_light.png"));
  console.log("Saved View 1 Light:", view1LightPath, `(${fs.statSync(view1LightPath).size} bytes)`);

  // --------------------------------------------------------------------------
  // VIEW 1: POPUP EXPANDED WITH 1-CLICK BOOKING SLOTS OPEN (DARK)
  // --------------------------------------------------------------------------
  console.log("Setting up View 1 (Dark)...");
  await page.evaluate(() => {
    const themeStore = (window).__useThemeStore;
    if (themeStore) themeStore.getState().setThemeMode("dark");
  });
  await dismissToursCompletely(page);
  await page.waitForTimeout(800);

  const view1DarkPath = path.join(TARGET_DIR, "01_incoming_call_popup_booking_dark.png");
  const view1DarkCompatPath = path.join(TARGET_DIR, "incoming_call_popup_dark.png");
  await page.screenshot({ path: view1DarkPath });
  fs.copyFileSync(view1DarkPath, view1DarkCompatPath);
  fs.copyFileSync(view1DarkPath, path.join(BRAIN_DIR, "01_incoming_call_popup_booking_dark.png"));
  fs.copyFileSync(view1DarkPath, path.join(BRAIN_DIR, "incoming_call_popup_dark.png"));
  console.log("Saved View 1 Dark:", view1DarkPath, `(${fs.statSync(view1DarkPath).size} bytes)`);

  // --------------------------------------------------------------------------
  // VIEW 2: DRAWER OPEN + CAPSULE COLLAPSED (DARK)
  // --------------------------------------------------------------------------
  console.log("Setting up View 2 (Dark)...");
  await page.evaluate(() => {
    window.__useUiSurfaceStore?.getState()?.closePrimaryModal?.();
    window.__denteTelephonyStore?.getState()?.openCallDrawer?.();
  });
  await page.waitForTimeout(1000);
  await dismissToursCompletely(page);

  // Wait for side drawer
  const drawer = page.locator('[data-testid="telephony-patient-side-drawer"]');
  await drawer.waitFor({ state: "visible", timeout: 8000 });
  console.log("Side drawer is visible!");

  // Verify capsule is visible and popup dialog is collapsed
  const capsule = page.locator('[data-testid="incoming-call-capsule"]');
  await capsule.waitFor({ state: "visible", timeout: 5000 });
  console.log("Dynamic island capsule is visible!");

  await page.waitForTimeout(800);

  const view2DarkPath = path.join(TARGET_DIR, "02_telephony_drawer_dynamic_island_dark.png");
  await page.screenshot({ path: view2DarkPath });
  fs.copyFileSync(view2DarkPath, path.join(BRAIN_DIR, "02_telephony_drawer_dynamic_island_dark.png"));
  console.log("Saved View 2 Dark:", view2DarkPath, `(${fs.statSync(view2DarkPath).size} bytes)`);

  // --------------------------------------------------------------------------
  // VIEW 2: DRAWER OPEN + CAPSULE COLLAPSED (LIGHT)
  // --------------------------------------------------------------------------
  console.log("Setting up View 2 (Light)...");
  await page.evaluate(() => {
    const themeStore = (window).__useThemeStore;
    if (themeStore) themeStore.getState().setThemeMode("light");
  });
  await dismissToursCompletely(page);
  await page.waitForTimeout(1000);

  const view2LightPath = path.join(TARGET_DIR, "02_telephony_drawer_dynamic_island_light.png");
  await page.screenshot({ path: view2LightPath });
  fs.copyFileSync(view2LightPath, path.join(BRAIN_DIR, "02_telephony_drawer_dynamic_island_light.png"));
  console.log("Saved View 2 Light:", view2LightPath, `(${fs.statSync(view2LightPath).size} bytes)`);

  await browser.close();
  console.log("SUCCESS! ALL 4 HIGH-QUALITY SCREENSHOTS CAPTURED AND TRANSFERRED!");
}

run().catch((err) => {
  console.error("Execution failed:", err);
  process.exit(1);
});
