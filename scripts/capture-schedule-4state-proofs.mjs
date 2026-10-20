import { mkdirSync } from "node:fs";
import { chromium } from "playwright";

const OUT_DOCS = "C:/Clinic_MVP/dental-crm/docs/proofs/schedule";
const WEB_URL = "http://127.0.0.1:5173";

mkdirSync(OUT_DOCS, { recursive: true });

async function initContextStorage(context, theme) {
  await context.addInitScript(
    ({ themeMode }) => {
      const dummyUser = {
        id: "demo-doctor-chief",
        fullName: "Д-р Воронов Алексей Владимирович",
        role: "doctor",
      };
      localStorage.setItem("dente_clinic_token", "demo-clinic-token-12345");
      localStorage.setItem("dente_staff_token", "demo-staff-token-12345");
      localStorage.setItem("dente_active_role", "doctor");
      localStorage.setItem("dente_cached_active_staff_user", JSON.stringify(dummyUser));
      localStorage.setItem("dental-crm:active-user:v1", JSON.stringify(dummyUser));
      localStorage.setItem("dente_demo_showcase", "true");
      localStorage.setItem("dente_offline_autonomy_mode", "true");
      localStorage.setItem("dente_onboarding_completed", "true");
      localStorage.setItem("dente_tour_completed", "true");
      localStorage.setItem("dente_tour_dismissed", "true");
      localStorage.setItem("dente_guide_tour_dismissed_v2", "true");
      localStorage.setItem("dente_doctor_training_completed", "true");
      localStorage.setItem("dente_training_dismissed", "true");
      localStorage.setItem("dente_sidebar_collapsed", "false");
      localStorage.setItem(
        "dental-crm:web-ui-preferences:v1",
        JSON.stringify({
          version: 1,
          uiLanguage: "ru",
          selectedWorkspaceRole: "owner",
          onboardingDismissed: true,
          onboardingStep: "done",
        })
      );
      localStorage.setItem("dente_theme_mode", themeMode);
      localStorage.setItem("dente_theme", themeMode);
      localStorage.setItem("theme", themeMode);
      localStorage.setItem("dente_active_nav", "schedule");

      if (themeMode === "dark") {
        document.documentElement.classList.add("dark");
        document.documentElement.setAttribute("data-theme", "dark");
      } else {
        document.documentElement.classList.remove("dark");
        document.documentElement.setAttribute("data-theme", "light");
      }
    },
    { themeMode: theme }
  );
}

async function run() {
  const browser = await chromium.launch({ headless: true });

  try {
    // 1. PC Light (1440x900)
    console.log("[1/6] Capturing PC Light (1440x900)...");
    const ctxPcLight = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    await initContextStorage(ctxPcLight, "light");
    const pagePcLight = await ctxPcLight.newPage();
    await pagePcLight.goto(`${WEB_URL}/#schedule`, { waitUntil: "domcontentloaded" });
    await pagePcLight.waitForTimeout(3000);

    // Ensure schedule is open
    const navSchedule = pagePcLight.locator('button:has-text("Расписание"), nav a[href*="schedule"]').first();
    if (await navSchedule.isVisible().catch(() => false)) {
      await navSchedule.click().catch(() => {});
      await pagePcLight.waitForTimeout(1000);
    }
    await pagePcLight.screenshot({ path: `${OUT_DOCS}/schedule_pc_light_1440x900.png` });

    // Open Quick Booking Drawer on PC Light
    console.log("[2/6] Capturing Quick Booking Drawer PC Light...");
    const quickBookingBtn = pagePcLight.locator('[data-testid="quick-booking-primary-btn"], button:has-text("+ Запись"), button:has-text("Запись")').first();
    if (await quickBookingBtn.isVisible().catch(() => false)) {
      await quickBookingBtn.click().catch(() => {});
      await pagePcLight.waitForTimeout(1000);
    }
    await pagePcLight.screenshot({ path: `${OUT_DOCS}/quick_booking_pc_light_1440x900.png` });
    await ctxPcLight.close();

    // 2. PC Dark (1440x900)
    console.log("[3/6] Capturing PC Dark (1440x900)...");
    const ctxPcDark = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    await initContextStorage(ctxPcDark, "dark");
    const pagePcDark = await ctxPcDark.newPage();
    await pagePcDark.goto(`${WEB_URL}/#schedule`, { waitUntil: "domcontentloaded" });
    await pagePcDark.waitForTimeout(3000);
    await pagePcDark.screenshot({ path: `${OUT_DOCS}/schedule_pc_dark_1440x900.png` });
    await ctxPcDark.close();

    // 3. Mobile Light (390x844 - iPhone 14 / Apple HIG)
    console.log("[4/6] Capturing Mobile Light (390x844)...");
    const ctxMobLight = await browser.newContext({
      viewport: { width: 390, height: 844 },
      userAgent: "Mozilla/5.0 (iPhone; CPU iPhone OS 16_6 like Mac OS X) AppleWebKit/605.1.15",
      isMobile: true,
      hasTouch: true,
    });
    await initContextStorage(ctxMobLight, "light");
    const pageMobLight = await ctxMobLight.newPage();
    await pageMobLight.goto(`${WEB_URL}/#schedule`, { waitUntil: "domcontentloaded" });
    await pageMobLight.waitForTimeout(3000);
    await pageMobLight.screenshot({ path: `${OUT_DOCS}/schedule_mobile_light_390x844.png` });

    // Open Quick Booking Drawer on Mobile Light
    console.log("[5/6] Capturing Quick Booking Mobile Light...");
    const mobQuickBtn = pageMobLight.locator('[data-testid="quick-booking-primary-btn"], button:has-text("+ Запись"), button:has-text("Запись")').first();
    if (await mobQuickBtn.isVisible().catch(() => false)) {
      await mobQuickBtn.click().catch(() => {});
      await pageMobLight.waitForTimeout(1000);
    }
    await pageMobLight.screenshot({ path: `${OUT_DOCS}/quick_booking_mobile_light_390x844.png` });
    await ctxMobLight.close();

    // 4. Mobile Dark (390x844)
    console.log("[6/6] Capturing Mobile Dark (390x844)...");
    const ctxMobDark = await browser.newContext({
      viewport: { width: 390, height: 844 },
      userAgent: "Mozilla/5.0 (iPhone; CPU iPhone OS 16_6 like Mac OS X) AppleWebKit/605.1.15",
      isMobile: true,
      hasTouch: true,
    });
    await initContextStorage(ctxMobDark, "dark");
    const pageMobDark = await ctxMobDark.newPage();
    await pageMobDark.goto(`${WEB_URL}/#schedule`, { waitUntil: "domcontentloaded" });
    await pageMobDark.waitForTimeout(3000);
    await pageMobDark.screenshot({ path: `${OUT_DOCS}/schedule_mobile_dark_390x844.png` });
    await ctxMobDark.close();

    console.log("[Success] All 6 schedule proof screenshots successfully generated!");
  } finally {
    await browser.close();
  }
}

run().catch((err) => {
  console.error("Capture failed:", err);
  process.exit(1);
});
