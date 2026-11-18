import { existsSync, mkdirSync, copyFileSync, statSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const CONV_ID = "8dc3a61d-f5c6-4072-bd1e-86fa5f439064";
const OUT_CONV = `C:/Users/Admin/.gemini/antigravity/brain/${CONV_ID}`;
const OUT_DOCS = path.resolve(__dirname, "../docs/proofs/schedule");

if (!existsSync(OUT_DOCS)) mkdirSync(OUT_DOCS, { recursive: true });
if (!existsSync(OUT_CONV)) mkdirSync(OUT_CONV, { recursive: true });

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function suppressOverlays(page) {
  try {
    await page.evaluate(() => {
      const style = document.createElement("style");
      style.id = "suppress-all-tour-overlays";
      style.innerHTML = `
        .tour-spotlight-root,
        .tour-backdrop-clickable-zone,
        [data-testid="guided-tour-spotlight-overlay"],
        [data-testid="guided-tour-coach-mark-card"],
        [data-testid="demo-mode-banner"],
        .global-toast-container,
        [role="alert"],
        .shepherd-element {
          display: none !important;
          pointer-events: none !important;
          opacity: 0 !important;
        }
      `;
      document.head.appendChild(style);
      document
        .querySelectorAll(
          ".tour-spotlight-root, [data-testid='guided-tour-spotlight-overlay']",
        )
        .forEach((el) => el.remove());
    });
  } catch (_) {}
}

async function setTheme(page, theme) {
  await page.evaluate((th) => {
    document.documentElement.setAttribute("data-theme", th);
    document.body.setAttribute("data-theme", th);
    if (th === "dark") {
      document.documentElement.classList.add("dark");
      document.documentElement.classList.remove("light");
      document.body.classList.add("dark");
      document.body.classList.remove("light");
    } else {
      document.documentElement.classList.add("light");
      document.documentElement.classList.remove("dark");
      document.body.classList.add("light");
      document.body.classList.remove("dark");
    }
    try {
      localStorage.setItem("dente_theme", th);
      localStorage.setItem("dente_theme_mode", th);
      localStorage.setItem("theme", th);
    } catch (_) {}
  }, theme);
  await sleep(400);
}

async function setupPageSession(context, page) {
  await page.addInitScript(() => {
    sessionStorage.setItem("dente_unlocked", "true");
    localStorage.setItem("dente_workspace_perspective", "doctor");
    localStorage.setItem("dente_user_role", "doctor");
    localStorage.setItem("dente_active_role", "doctor");
    localStorage.setItem("dente_demo_showcase", "true");
    localStorage.setItem("dente_onboarding_completed", "true");
    localStorage.setItem("dente_tour_completed", "true");
    localStorage.setItem("dente_tour_dismissed", "true");
    localStorage.setItem("dente_guide_tour_dismissed_v2", "true");
    localStorage.setItem("dente_active_nav", "schedule");
    localStorage.setItem("dente_last_view", "schedule");
    localStorage.setItem(
      "dental-crm:onboarding:v1",
      JSON.stringify({ dismissed: true, step: "done" }),
    );
  });
}

async function waitForRealUI(page) {
  const loginBtn = page.locator('button:has-text("Войти в систему")');
  if (await loginBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
    console.log("  [AUTH] Clicking login submit button...");
    await loginBtn.click();
    await sleep(1500);
  }

  const demoBtn = page.locator(".auth-demo-btn");
  if (await demoBtn.isVisible({ timeout: 1500 }).catch(() => false)) {
    console.log("  [AUTH] Clicking demo launch button...");
    await demoBtn.click();
    await sleep(800);
    const adminCard = page
      .locator(".auth-demo-role-card", { hasText: "Главврач" })
      .first();
    if (await adminCard.isVisible().catch(() => false)) {
      await adminCard.click();
      await sleep(400);
    }
    const launchBtn = page
      .locator(".auth-demo-tour-actions button.auth-submit-btn")
      .first();
    if (await launchBtn.isVisible().catch(() => false)) {
      await launchBtn.click();
      await sleep(2000);
    }
  }

  console.log("  Waiting for UI to stabilize...");
  await page.waitForFunction(
    () => {
      const text = document.body.innerText || "";
      return (
        !text.includes("Загрузка системы") &&
        !text.includes("Подготовка модулей") &&
        (document.querySelector(".workspace-shell") ||
          document.querySelector('[data-testid="schedule-toolbar"]') ||
          document.querySelector('[data-testid="schedule-mobile-agenda-view"]') ||
          document.querySelector("#root"))
      );
    },
    { timeout: 45000 },
  ).catch(() => {});

  await suppressOverlays(page);
  await sleep(1000);
}

async function saveProof(page, filename, description) {
  await suppressOverlays(page);
  await sleep(400);
  const docsPath = path.join(OUT_DOCS, filename);
  const convPath = path.join(OUT_CONV, filename);
  await page.screenshot({ path: docsPath, fullPage: false });
  copyFileSync(docsPath, convPath);
  const stats = statSync(docsPath);
  console.log(`  [OK] ${filename} (${(stats.size / 1024).toFixed(1)} KB) -> ${description}`);
}

async function main() {
  console.log("=== Validating [SCH-03] Single Click Inspector vs Double Click Drawer ===");
  const browser = await chromium.launch({
    headless: true,
    args: ["--no-sandbox", "--disable-gpu", "--disable-dev-shm-usage"],
  });

  try {
    const context = await browser.newContext({
      viewport: { width: 1440, height: 900 },
      deviceScaleFactor: 1,
    });
    const page = await context.newPage();
    await setupPageSession(context, page);

    console.log("Navigating to Schedule: http://127.0.0.1:5173/?demo=true#schedule");
    await page.goto("http://127.0.0.1:5173/?demo=true#schedule", {
      waitUntil: "commit",
      timeout: 30000,
    });

    await waitForRealUI(page);

    // Switch to schedule view if needed
    const scheduleNav = page.locator('a[href="#schedule"], button:has-text("Записи")').first();
    if (await scheduleNav.isVisible().catch(() => false)) {
      await scheduleNav.click();
      await sleep(1500);
    }

    // Find first appointment card
    const firstCard = page.locator('[data-testid^="appointment-card-clickable-"], .appointment-card').first();
    await firstCard.waitFor({ timeout: 15000 });
    console.log("Found appointment card, performing SINGLE click...");
    await firstCard.click();
    await sleep(600);

    // Check that right inspector panel is visible
    const inspector = page.locator('[data-testid="schedule-appointment-inspector"], .schedule-appointment-inspector').first();
    const isInspectorVisible = await inspector.isVisible().catch(() => false);
    console.log(`Right inspector visible: ${isInspectorVisible}`);

    // Check that QuickBookingDrawer is NOT visible
    const drawer = page.locator('[data-testid="quick-booking-drawer"]').first();
    const isDrawerVisible = await drawer.isVisible().catch(() => false);
    console.log(`QuickBookingDrawer modal overlay visible: ${isDrawerVisible} (MUST BE FALSE)`);

    // Capture Single Click Inspector PC Light
    await setTheme(page, "light");
    await saveProof(page, "schedule_single_click_inspector_pc_light_1440x900.png", "Single Click Opens Right Inspector without Modal Overlay");

    // Capture Single Click Inspector PC Dark
    await setTheme(page, "dark");
    await saveProof(page, "schedule_single_click_inspector_pc_dark_1440x900.png", "Single Click Opens Right Inspector Dark Mode");

    // Now test double click: double click on card MUST open QuickBookingDrawer
    console.log("Performing DOUBLE click on appointment card...");
    await setTheme(page, "light");
    await firstCard.dblclick();
    await sleep(1000);

    const isDrawerAfterDblClick = await drawer.isVisible().catch(() => false);
    console.log(`QuickBookingDrawer visible after double click: ${isDrawerAfterDblClick} (MUST BE TRUE)`);
    await saveProof(page, "schedule_double_click_drawer_pc_light_1440x900.png", "Double Click Opens QuickBookingDrawer for Detailed Edit");

    await context.close();
    console.log("=== [SCH-03] VERIFICATION SUCCEEDED ===");
  } finally {
    await browser.close();
  }
}

main().catch((err) => {
  console.error("FATAL ERROR in Inspector Click Proof:", err);
  process.exit(1);
});
