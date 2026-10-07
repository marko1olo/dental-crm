const { chromium } = require("playwright");
const fs = require("fs");
const path = require("path");
const {
  obtainRealAuthTokens,
  injectRealAuthToContext,
  seedLiveScheduleData,
} = require("./e2e-auth-helper.cjs");

const outDir = path.resolve("docs/screenshots/audit_schedule");
if (!fs.existsSync(outDir)) {
  fs.mkdirSync(outDir, { recursive: true });
}

async function setTheme(page, theme) {
  await page.evaluate((th) => {
    if (window.__useThemeStore) {
      window.__useThemeStore.getState().setThemeMode(th);
    }
    document.documentElement.setAttribute("data-theme", th);
    const isDark = ["dark", "night", "ocean", "emerald", "cyber_xray"].includes(th);
    document.documentElement.classList.toggle("dark", isDark);
    document.documentElement.classList.toggle("light", !isDark);
    document.documentElement.style.colorScheme = isDark ? "dark" : "light";
  }, theme);
  const isDark = ["dark", "night", "ocean", "emerald", "cyber_xray"].includes(theme);
  await page.waitForFunction(
    (dark) => document.documentElement.classList.contains("dark") === dark,
    isDark,
    { timeout: 5000 }
  ).catch(() => {});
  await page.waitForTimeout(400);
}

async function captureProof(page, fileName) {
  const fullPath = path.join(outDir, fileName);
  await page.screenshot({ path: fullPath, fullPage: false, animations: "disabled" });
  console.log(`[PROOF] Saved: ${fullPath} (${fs.statSync(fullPath).size} bytes)`);
}

const { launchSafeBrowser } = require("./safe_playwright.cjs");

async function runAudit() {
  console.log("=== STARTING LIVE SCHEDULE AUDIT (NO MOCKS) ===");

  // 1. Authenticate with real API
  const authData = await obtainRealAuthTokens();
  console.log(`[AUTH] Clinic: ${authData.clinicName}, User: ${authData.user.fullName}`);

  // 2. Seed live schedule data in Postgres
  const schedData = await seedLiveScheduleData(authData);
  console.log(`[SEED] Appointments: ${schedData.appointments.length}, Chairs: ${schedData.chairs.length}`);

  const browser = await launchSafeBrowser({
    headless: true,
  });

  try {
    // =========================================================================
    // PART 1: PC DESKTOP (1440x900)
    // =========================================================================
    console.log("\n--- Capturing PC Desktop (1440x900) ---");
    const desktopContext = await browser.newContext({
      viewport: { width: 1440, height: 900 },
      deviceScaleFactor: 2,
    });

    await desktopContext.addInitScript(() => {
      localStorage.setItem("dente_tour_completed", "true");
      localStorage.setItem("dente_guide_tour_dismissed_v2", "true");
      localStorage.setItem("dente_guide_tour_dismissed", "true");
      localStorage.setItem("dente_guide_tour_seen_roles_v2", JSON.stringify(["doctor", "admin", "director"]));
      localStorage.setItem("dente_quest_progress_v2", JSON.stringify({
        currentTrackId: "solo_doctor",
        currentStepIndex: 999,
        isPaused: true,
        isDismissedPermanently: true,
        tracksProgress: {
          solo_doctor: { completed: true, currentStepIndex: 999 },
          reception_admin: { completed: true, currentStepIndex: 999 },
          imaging_diagnostics: { completed: true, currentStepIndex: 999 },
        },
        completedQuestsCount: 3,
        lastUpdated: new Date().toISOString(),
      }));
    });

    await injectRealAuthToContext(desktopContext, authData, {
      selectedPatientId: schedData.activePatientId,
    });

    const pageDesktop = await desktopContext.newPage();
    await pageDesktop.route("**/*fonts.googleapis.com/**", (route) => route.abort());
    await pageDesktop.route("**/*fonts.gstatic.com/**", (route) => route.abort());

    await pageDesktop.goto("http://127.0.0.1:5173/#schedule", { waitUntil: "domcontentloaded", timeout: 30000 });
    await pageDesktop.waitForSelector(".boot-state", { state: "detached", timeout: 30000 }).catch(() => {});
    await pageDesktop.waitForSelector(".schedule-filter-strip, .schedule-filter-chips", { state: "visible", timeout: 30000 });
    await pageDesktop.waitForTimeout(1000);

    // Dismiss any coach mark or spotlight overlays
    await pageDesktop.evaluate(() => {
      document.querySelectorAll('[data-testid="doctor-training-coach-mark-card"], .tour-spotlight-root, [data-testid="guided-tour-spotlight-overlay"], .interactive-guide-tour-banner, [data-testid="guide-tour-invite-banner"]').forEach((el) => el.remove());
    });

    // Dismiss onboarding and notifications if present
    const dismissBtn = pageDesktop.locator('button:has-text("Скрыть")');
    if (await dismissBtn.isVisible()) {
      await dismissBtn.click().catch(() => {});
      await pageDesktop.waitForTimeout(300);
    }
    const noticeDismiss = pageDesktop.locator('.app-notice button:has-text("Понятно"), [data-testid="btn-dismiss-notice"]');
    if (await noticeDismiss.isVisible()) {
      await noticeDismiss.click().catch(() => {});
      await pageDesktop.waitForTimeout(300);
    }

    // Switch to chairs panoramic mode
    const chairsModeBtn = pageDesktop.locator('[data-testid="schedule-view-mode-chairs"]');
    if (await chairsModeBtn.isVisible()) {
      await chairsModeBtn.click({ force: true }).catch(() => {});
      await pageDesktop.waitForTimeout(600);
    }

    // Capture PC Light: Schedule Panoramic Matrix
    await setTheme(pageDesktop, "light");
    await captureProof(pageDesktop, "01_schedule_pc_light_1440x900.png");

    // Capture PC Dark: Schedule Panoramic Matrix
    await setTheme(pageDesktop, "dark");
    await captureProof(pageDesktop, "02_schedule_pc_dark_1440x900.png");

    // Open Appointment Modal
    console.log("Opening appointment modal on desktop...");
    const apptCard = pageDesktop.locator('[data-testid^="appointment-card-clickable-"]').first();
    if (await apptCard.isVisible()) {
      await apptCard.click();
      await pageDesktop.waitForSelector('[data-testid="appointment-modal"]', { state: "visible", timeout: 5000 });
      await pageDesktop.waitForTimeout(600);

      // Capture PC Light Modal
      await setTheme(pageDesktop, "light");
      await captureProof(pageDesktop, "03_appointment_modal_pc_light_1440x900.png");

      // Capture PC Dark Modal
      await setTheme(pageDesktop, "dark");
      await captureProof(pageDesktop, "04_appointment_modal_pc_dark_1440x900.png");

      // Close modal
      const closeBtn = pageDesktop.locator('[data-testid="btn-close-appointment-modal"], button:has-text("Отмена")').first();
      if (await closeBtn.isVisible()) {
        await closeBtn.click().catch(() => {});
        await pageDesktop.waitForTimeout(400);
      }
    }

    await desktopContext.close();

    // =========================================================================
    // PART 2: MOBILE (390x844) iPhone 14 style
    // =========================================================================
    console.log("\n--- Capturing Mobile (390x844) ---");
    const mobileContext = await browser.newContext({
      viewport: { width: 390, height: 844 },
      deviceScaleFactor: 2,
      isMobile: true,
      hasTouch: true,
    });

    await mobileContext.addInitScript(() => {
      localStorage.setItem("dente_tour_completed", "true");
      localStorage.setItem("dente_guide_tour_dismissed_v2", "true");
      localStorage.setItem("dente_guide_tour_dismissed", "true");
      localStorage.setItem("dente_guide_tour_seen_roles_v2", JSON.stringify(["doctor", "admin", "director"]));
      localStorage.setItem("dente_quest_progress_v2", JSON.stringify({
        currentTrackId: "solo_doctor",
        currentStepIndex: 999,
        isPaused: true,
        isDismissedPermanently: true,
        tracksProgress: {
          solo_doctor: { completed: true, currentStepIndex: 999 },
          reception_admin: { completed: true, currentStepIndex: 999 },
          imaging_diagnostics: { completed: true, currentStepIndex: 999 },
        },
        completedQuestsCount: 3,
        lastUpdated: new Date().toISOString(),
      }));
    });

    await injectRealAuthToContext(mobileContext, authData, {
      selectedPatientId: schedData.activePatientId,
    });

    const pageMobile = await mobileContext.newPage();
    await pageMobile.route("**/*fonts.googleapis.com/**", (route) => route.abort());
    await pageMobile.route("**/*fonts.gstatic.com/**", (route) => route.abort());

    await pageMobile.goto("http://127.0.0.1:5173/#schedule", { waitUntil: "domcontentloaded", timeout: 30000 });
    await pageMobile.waitForSelector(".boot-state", { state: "detached", timeout: 30000 }).catch(() => {});
    await pageMobile.waitForTimeout(1500);

    // Dismiss any coach mark or spotlight overlays
    await pageMobile.evaluate(() => {
      document.querySelectorAll('[data-testid="doctor-training-coach-mark-card"], .tour-spotlight-root, [data-testid="guided-tour-spotlight-overlay"], .interactive-guide-tour-banner, [data-testid="guide-tour-invite-banner"]').forEach((el) => el.remove());
    });

    // Dismiss notifications
    const mDismiss = pageMobile.locator('button:has-text("Скрыть"), [data-testid="btn-dismiss-notice"]');
    if (await mDismiss.first().isVisible()) {
      await mDismiss.first().click().catch(() => {});
      await pageMobile.waitForTimeout(300);
    }

    // Capture Mobile Light Agenda
    await setTheme(pageMobile, "light");
    await captureProof(pageMobile, "05_schedule_mobile_light_390x844.png");

    // Capture Mobile Dark Agenda
    await setTheme(pageMobile, "dark");
    await captureProof(pageMobile, "06_schedule_mobile_dark_390x844.png");

    // Tap on mobile appointment or quick booking button to test mobile sheet/modal
    console.log("Testing mobile appointment bottom sheet...");
    const mobileApptCard = pageMobile.locator('[data-testid^="mobile-agenda-card-"], [data-testid^="appointment-card-clickable-"], .appointment-card').first();
    if (await mobileApptCard.isVisible()) {
      await mobileApptCard.click();
      await pageMobile.waitForTimeout(800);

      // Check if modal or bottom sheet is opened
      const sheetVisible = await pageMobile.locator('[data-testid="appointment-modal"], [data-testid="schedule-mobile-bottom-sheet"], [data-testid="quick-booking-drawer"]').first().isVisible();
      if (sheetVisible) {
        // Capture Mobile Light Sheet
        await setTheme(pageMobile, "light");
        await captureProof(pageMobile, "07_schedule_mobile_sheet_light_390x844.png");

        // Capture Mobile Dark Sheet
        await setTheme(pageMobile, "dark");
        await captureProof(pageMobile, "08_schedule_mobile_sheet_dark_390x844.png");
      }
    }

    await mobileContext.close();
    console.log("\n=== AUDIT CAPTURE COMPLETE ===");
  } finally {
    await browser.close();
  }
}

runAudit().catch((err) => {
  console.error("Audit failed:", err);
  process.exit(1);
});
