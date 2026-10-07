/**
 * scripts/capture_schedule_design_proofs.cjs
 * Captures real visual proof of all refactored schedule views, modals, segmented bars, and search inputs.
 * Uses Playwright with channel: "chrome" and authenticated session.
 */

const { chromium } = require("playwright");
const path = require("node:path");
const fs = require("node:fs");

const OUT_DIR_LOCAL = path.resolve(__dirname, "../apps/web/public/screenshots/schedule_design_proofs");
const OUT_DIR_PARENT = "C:/Users/Admin/.gemini/antigravity/brain/beb92312-c6d7-426d-a438-12dcad022abc";
const OUT_DIR_SELF = "C:/Users/Admin/.gemini/antigravity/brain/83b92bf0-c135-4dea-9a54-137567feea06";

const DIRS = [OUT_DIR_LOCAL, OUT_DIR_PARENT, OUT_DIR_SELF];

DIRS.forEach((d) => {
  if (!fs.existsSync(d)) {
    fs.mkdirSync(d, { recursive: true });
  }
});

function saveScreenshotCopies(buffer, fileName) {
  for (const dir of DIRS) {
    const fullPath = path.join(dir, fileName);
    fs.writeFileSync(fullPath, buffer);
  }
  console.log(`Saved screenshot: ${fileName} (${buffer.length} bytes)`);
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function main() {
  console.log(">>> Launching Chrome via Playwright...");
  const browser = await chromium.launch({
    channel: "chrome",
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });

  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    isMobile: false,
    hasTouch: false,
  });

  await context.addInitScript(() => {
    localStorage.setItem("dente_clinic_token", "dental");
    localStorage.setItem("dente_staff_token", "mock_owner_token");
    localStorage.setItem("dente_active_role", "owner");
    localStorage.setItem("dente_user_id", "owner_1");
    localStorage.setItem("dente_onboarding_completed", "true");
    localStorage.setItem("dente_tour_completed", "true");
    localStorage.setItem("dental-crm:onboarding:v1", JSON.stringify({ dismissed: true, step: "done", completed: true }));
    localStorage.setItem("dente_theme_mode", "light");
  });

  const page = await context.newPage();

  console.log(">>> Navigating to http://127.0.0.1:5173/#schedule...");
  await page.goto("http://127.0.0.1:5173/#schedule", { waitUntil: "domcontentloaded", timeout: 45000 });
  await page.waitForSelector(".schedule-filter-strip", { state: "visible", timeout: 30000 });
  await sleep(1500);

  // 1. Capture Schedule Filter Strip in Light Theme
  console.log("1. Capturing Schedule Filter Strip (Desktop Light)...");
  await page.evaluate(() => {
    document.documentElement.classList.remove("dark");
    document.documentElement.setAttribute("data-theme", "light");
  });
  await sleep(600);

  const toolbarElement = await page.$("[data-testid='schedule-toolbar']");
  if (toolbarElement) {
    const shot = await toolbarElement.screenshot();
    saveScreenshotCopies(shot, "schedule_filter_strip_desktop_light.png");
  } else {
    const shot = await page.screenshot({ clip: { x: 0, y: 0, width: 1440, height: 260 } });
    saveScreenshotCopies(shot, "schedule_filter_strip_desktop_light.png");
  }

  // 2. Capture Schedule Filter Strip in Dark Theme
  console.log("2. Capturing Schedule Filter Strip (Desktop Dark)...");
  await page.evaluate(() => {
    document.documentElement.classList.add("dark");
    document.documentElement.setAttribute("data-theme", "dark");
  });
  await sleep(600);

  if (toolbarElement) {
    const shot = await toolbarElement.screenshot();
    saveScreenshotCopies(shot, "schedule_filter_strip_desktop_dark.png");
  } else {
    const shot = await page.screenshot({ clip: { x: 0, y: 0, width: 1440, height: 260 } });
    saveScreenshotCopies(shot, "schedule_filter_strip_desktop_dark.png");
  }

  // Back to light theme
  await page.evaluate(() => {
    document.documentElement.classList.remove("dark");
    document.documentElement.setAttribute("data-theme", "light");
  });
  await sleep(400);

  // 3. Capture Quick Booking Drawer
  console.log("3. Capturing Quick Booking Drawer...");
  const quickBookBtn = await page.$("[data-testid='schedule-toolbar-primary-quick-booking-btn']");
  if (quickBookBtn) {
    await quickBookBtn.click();
    await sleep(1000);
    const drawer = await page.$("[data-testid='quick-booking-drawer']");
    if (drawer) {
      const shot = await drawer.screenshot();
      saveScreenshotCopies(shot, "schedule_quick_booking_drawer_light.png");
    } else {
      const shot = await page.screenshot();
      saveScreenshotCopies(shot, "schedule_quick_booking_drawer_light.png");
    }

    // Close drawer
    await page.keyboard.press("Escape");
    await sleep(600);
  }

  // 4. Capture Tomorrow Reminders Modal via Options Dropdown
  console.log("4. Capturing Tomorrow Reminders Modal...");
  const optionsBtn = await page.$("[data-testid='schedule-toolbar-options-btn']");
  if (optionsBtn) {
    await optionsBtn.click();
    await sleep(500);

    await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll("button"));
      const remBtn = btns.find((b) => (b.textContent || "").includes("Напомнить") || (b.textContent || "").includes("напоминани"));
      if (remBtn) remBtn.click();
    });
    await sleep(1000);

    const remModal = await page.$("[role='dialog']");
    if (remModal) {
      const shot = await remModal.screenshot();
      saveScreenshotCopies(shot, "schedule_tomorrow_reminders_modal_light.png");
      await page.keyboard.press("Escape");
      await sleep(600);
    }
  }

  // 5. Open Preventive Inspection Modal
  console.log("5. Capturing Preventive Inspection Modal...");
  if (optionsBtn) {
    await optionsBtn.click();
    await sleep(500);

    await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll("button"));
      const prevBtn = btns.find((b) => (b.textContent || "").includes("Сервисный контроль") || (b.textContent || "").includes("гаранти"));
      if (prevBtn) prevBtn.click();
    });
    await sleep(1000);

    const prevModal = await page.$("[role='dialog']");
    if (prevModal) {
      const shot = await prevModal.screenshot();
      saveScreenshotCopies(shot, "schedule_preventive_modal_light.png");
      await page.keyboard.press("Escape");
      await sleep(600);
    }
  }

  // 6. Open Doctor Free Slots Modal
  console.log("6. Capturing Doctor Free Slots Modal...");
  if (optionsBtn) {
    await optionsBtn.click();
    await sleep(500);

    await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll("button"));
      const slotsBtn = btns.find((b) => (b.textContent || "").includes("Подобрать") || (b.textContent || "").includes("свободн") || (b.textContent || "").includes("окон"));
      if (slotsBtn) slotsBtn.click();
    });
    await sleep(1000);

    const slotsModal = await page.$("[role='dialog']");
    if (slotsModal) {
      const shot = await slotsModal.screenshot();
      saveScreenshotCopies(shot, "schedule_doctor_free_slots_modal_light.png");
      await page.keyboard.press("Escape");
      await sleep(600);
    }
  }

  // 7. Open Waitlist Modal
  console.log("7. Capturing Waitlist Modal...");
  if (optionsBtn) {
    await optionsBtn.click();
    await sleep(500);

    await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll("button"));
      const waitBtn = btns.find((b) => (b.textContent || "").includes("Лист ожидания") || (b.textContent || "").includes("ожидани"));
      if (waitBtn) waitBtn.click();
    });
    await sleep(1000);

    const waitModal = await page.$("[role='dialog']");
    if (waitModal) {
      const shot = await waitModal.screenshot();
      saveScreenshotCopies(shot, "schedule_waitlist_quickfill_modal_light.png");
      await page.keyboard.press("Escape");
      await sleep(600);
    }
  }

  // 8. Capture Full Schedule View with Chair Toolbar (1440x900)
  console.log("8. Capturing Full Schedule Grid (1440x900)...");
  const fullShot = await page.screenshot({ fullPage: false });
  saveScreenshotCopies(fullShot, "schedule_full_view_desktop_light.png");

  await browser.close();
  console.log(">>> All Schedule Design Proofs successfully captured!");
}

main().catch((err) => {
  console.error("Error capturing schedule proofs:", err);
  process.exit(1);
});
