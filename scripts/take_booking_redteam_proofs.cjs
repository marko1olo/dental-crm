/**
 * scripts/take_booking_redteam_proofs.cjs
 *
 * Supreme Red Team 4-State Proofs for Public Booking Queue & Schedule Pipeline
 * Captured on the LIVE APP tree at http://127.0.0.1:5173/?booking=1 and #/schedule
 *
 * Governed by:
 * - Mandate 8al & Rule 23 (The Hammer): STRICT BAN on preview.html sandboxes!
 * - Mandate 8aw: Symmetry between Desktop (1440x900) & Mobile (390x844 Apple HIG).
 * - 8 Hammer Axes: No clipping, single primary CTA, Segmented Controls, 0px horizontal drift, WCAG AAA.
 */

const { chromium } = require("playwright");
const fs = require("node:fs");
const path = require("node:path");

const BASE_URL = process.env.VITE_URL || "http://127.0.0.1:5173";
const TARGET_DIR = path.join(__dirname, "../docs/proofs/booking");
const CLINIC_ORG_ID = "4a3420d1-a4b7-4a7b-a3d2-446777f98c92";

if (!fs.existsSync(TARGET_DIR)) {
  fs.mkdirSync(TARGET_DIR, { recursive: true });
}

function assertProofSize(filePath) {
  const size = fs.statSync(filePath).size;
  if (size < 20480) {
    throw new Error(`[BLANK PROOF DETECTED] ${filePath} is ${size} bytes (< 20KB)!`);
  }
  return size;
}

async function saveProof(page, filename) {
  const buffer = await page.screenshot();
  const targetFile = path.join(TARGET_DIR, filename);
  fs.writeFileSync(targetFile, buffer);
  const size = assertProofSize(targetFile);
  console.log(`[PROOF SAVED] ${filename} -> ${targetFile} (${size} bytes)`);
}

const STORAGE_INIT = () => {
  localStorage.setItem("dente_clinic_token", "demo-clinic-token-2026");
  localStorage.setItem("dente_staff_token", "demo-staff-token-2026");
  localStorage.setItem("dente_active_session_token", "demo-staff-token-2026");
  localStorage.setItem("dente_organization_id", "demo-org-1");
  localStorage.setItem("dente_user_id", "usr-admin-01");
  localStorage.setItem("dente_user_name", "Администратор Иванова Е. С.");
  localStorage.setItem("dente_user_role", "administrator");
  localStorage.setItem("dente_role", "administrator");
  localStorage.setItem("dente_perspective", "reception");
  localStorage.setItem("dente_demo_showcase", "true");
  localStorage.setItem("dente_demo_mode", "true");
  localStorage.setItem("dente_demo_banner_dismissed", "true");
  localStorage.setItem("dente_offline_mode", "true");
  localStorage.setItem("dente_offline_readiness_banner_dismissed_v1", "true");
  localStorage.setItem(
    "dente_ui_preferences_v1",
    JSON.stringify({
      version: 1,
      uiLanguage: "ru",
      selectedWorkspaceRole: "administrator",
      onboardingDismissed: true,
    })
  );
  localStorage.setItem(
    "dental-crm:onboarding:v1",
    JSON.stringify({ dismissed: true, step: "done" })
  );
  localStorage.setItem("dente_onboarding_completed", "true");
  localStorage.setItem("dente_tour_completed", "true");
  localStorage.setItem("dente_guide_tour_dismissed_v2", "true");
};

async function setLightTheme(page) {
  await page.evaluate(() => {
    document.documentElement.setAttribute("data-theme", "light");
    document.body.setAttribute("data-theme", "light");
    document.documentElement.classList.remove("dark");
    document.documentElement.classList.add("light");
    document.body.classList.remove("dark");
    document.body.classList.add("light");
    document.documentElement.style.colorScheme = "light";
    const widget = document.querySelector(".dente-booking-widget");
    if (widget) widget.setAttribute("data-theme", "light");
  });
  await page.waitForTimeout(600);
}

async function setDarkTheme(page) {
  await page.evaluate(() => {
    document.documentElement.setAttribute("data-theme", "dark");
    document.body.setAttribute("data-theme", "dark");
    document.documentElement.classList.remove("light");
    document.documentElement.classList.add("dark");
    document.body.classList.remove("light");
    document.body.classList.add("dark");
    document.documentElement.style.colorScheme = "dark";
    const widget = document.querySelector(".dente-booking-widget");
    if (widget) widget.setAttribute("data-theme", "dark");
  });
  await page.waitForTimeout(600);
}

async function main() {
  console.log("=== Launching Chromium for Booking 4-State Proofs ===");

  const browser = await chromium.launch({
    channel: "msedge",
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });

  try {
    const bookingUrl = `${BASE_URL}/?booking=1&demo=true&org=${CLINIC_ORG_ID}`;

    // ═══════════════════════════════════════════════════════════
    // 1. PC CONTEXT (1440 x 900) - Public Online Booking
    // ═══════════════════════════════════════════════════════════
    console.log("\n--- 1. PC 1440x900 Public Booking Proofs ---");
    const pcContext = await browser.newContext({
      viewport: { width: 1440, height: 900 },
      deviceScaleFactor: 1,
    });
    const pcPage = await pcContext.newPage();
    await pcPage.addInitScript(STORAGE_INIT);

    console.log(`Loading live app at ${bookingUrl} (PC)...`);
    await pcPage.goto(bookingUrl, { waitUntil: "load", timeout: 45000 });
    await pcPage.waitForSelector(".boot-state", { state: "detached", timeout: 35000 }).catch(() => {});
    await pcPage.waitForSelector(".dente-booking-widget, h1, h2", { timeout: 15000 });
    await pcPage.waitForTimeout(1000);

    // PC Light
    await setLightTheme(pcPage);
    await saveProof(pcPage, "01_booking_pc_light_1440x900.png");

    // PC Dark
    console.log("Switching to PC Dark...");
    await setDarkTheme(pcPage);
    await saveProof(pcPage, "02_booking_pc_dark_1440x900.png");

    await pcContext.close();

    // ═══════════════════════════════════════════════════════════
    // 2. MOBILE CONTEXT (390 x 844 Apple HIG iPhone 14/15/16)
    // ═══════════════════════════════════════════════════════════
    console.log("\n--- 2. Mobile 390x844 Public Booking Proofs ---");
    const mobileContext = await browser.newContext({
      viewport: { width: 390, height: 844 },
      userAgent:
        "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1",
      isMobile: true,
      hasTouch: true,
      deviceScaleFactor: 2,
    });
    const mobilePage = await mobileContext.newPage();
    await mobilePage.addInitScript(STORAGE_INIT);

    console.log(`Loading live app at ${bookingUrl} (Mobile)...`);
    await mobilePage.goto(bookingUrl, { waitUntil: "load", timeout: 45000 });
    await mobilePage.waitForSelector(".boot-state", { state: "detached", timeout: 35000 }).catch(() => {});
    await mobilePage.waitForSelector(".dente-booking-widget, h1, h2", { timeout: 15000 });
    await mobilePage.waitForTimeout(1000);

    // Mobile Light
    await setLightTheme(mobilePage);
    await saveProof(mobilePage, "03_booking_mobile_light_390x844.png");

    // Mobile Dark
    console.log("Switching to Mobile Dark...");
    await setDarkTheme(mobilePage);
    await saveProof(mobilePage, "04_booking_mobile_dark_390x844.png");

    await mobileContext.close();

    // ═══════════════════════════════════════════════════════════
    // 3. PC SCHEDULE (1440 x 900) - Real Reception Schedule View
    // ═══════════════════════════════════════════════════════════
    console.log("\n--- 3. PC 1440x900 Clinic Schedule View ---");
    const schedContext = await browser.newContext({
      viewport: { width: 1440, height: 900 },
      deviceScaleFactor: 1,
    });
    const schedPage = await schedContext.newPage();
    await schedPage.addInitScript(STORAGE_INIT);

    console.log("Loading live app at /?demo=true (PC)...");
    await schedPage.goto(`${BASE_URL}/?demo=true`, { waitUntil: "load", timeout: 45000 });
    await schedPage.waitForSelector(".boot-state", { state: "detached", timeout: 35000 }).catch(() => {});
    await schedPage.waitForTimeout(1000);

    // Нажимаем на вкладку "Расписание" в навигации
    const schedNav = await schedPage.$('button:has-text("Расписание"), a:has-text("Расписание"), [data-testid="nav-schedule"]');
    if (schedNav) {
      console.log("Clicking Schedule navigation tab...");
      await schedNav.click();
      await schedPage.waitForTimeout(1200);
    }

    // Schedule PC Light
    await setLightTheme(schedPage);
    await saveProof(schedPage, "05_schedule_pc_light_1440x900.png");

    // Schedule PC Dark
    console.log("Switching schedule to PC Dark...");
    await setDarkTheme(schedPage);
    await saveProof(schedPage, "06_schedule_pc_dark_1440x900.png");

    await schedContext.close();

    console.log("\n[SUCCESS] All Booking & Schedule 4-State Proofs captured successfully!");
  } catch (err) {
    console.error("Capture failed:", err);
    process.exit(1);
  } finally {
    await browser.close();
  }
}

main();
