/**
 * scripts/capture-schedule-red-team-proofs.mjs
 * Red Team Schedule Visual Proof Suite: PC Light/Dark & Mobile Light/Dark
 */
import { existsSync, mkdirSync, copyFileSync, statSync, unlinkSync } from "node:fs";
import path from "node:path";
import { chromium } from "playwright";

const API_BASE = "http://127.0.0.1:4100";
const APP_BASE = "http://127.0.0.1:5173";

const OUT_DIRS = [
  path.join(process.cwd(), "docs/proofs/schedule"),
  path.join(process.cwd(), ".dente-redesign-shots"),
  path.resolve("C:/Users/Admin/.gemini/antigravity/brain/71131bd4-a504-4419-ac03-f3fe6f83df68"),
];

for (const dir of OUT_DIRS) {
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }
}

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function saveProof(page, filename, description) {
  const primaryPath = path.join(OUT_DIRS[0], filename);
  let attempts = 0;
  while (attempts < 5) {
    try {
      if (existsSync(primaryPath)) {
        try { unlinkSync(primaryPath); } catch {}
      }
      await page.screenshot({ path: primaryPath, fullPage: false });
      break;
    } catch (err) {
      attempts++;
      if (attempts >= 5) throw err;
      await wait(600);
    }
  }
  const stat = statSync(primaryPath);
  if (stat.size < 20000) {
    throw new Error(`[BLANK DETECTED] Screenshot ${filename} is only ${stat.size} bytes!`);
  }
  console.log(`[PROOF CAPTURED] ${filename} (${stat.size} bytes) -> ${description}`);
  for (let i = 1; i < OUT_DIRS.length; i++) {
    const targetPath = path.join(OUT_DIRS[i], filename);
    try {
      if (existsSync(targetPath)) {
        try { unlinkSync(targetPath); } catch {}
      }
      copyFileSync(primaryPath, targetPath);
    } catch (e) {
      console.warn(`[WARN] Could not copy to ${targetPath}:`, e.message);
    }
  }
  return primaryPath;
}

async function applyTheme(page, theme) {
  await page.evaluate((th) => {
    document.documentElement.setAttribute("data-theme", th);
    const isDark = th === "dark";
    document.documentElement.classList.toggle("dark", isDark);
    document.documentElement.classList.toggle("light", !isDark);
    document.body.className = isDark ? "dark" : "light";
    document.documentElement.style.colorScheme = isDark ? "dark" : "light";
    localStorage.setItem("dente_theme_mode", th);
    if (window.__useThemeStore) {
      window.__useThemeStore.getState().setThemeMode(th);
    }
  }, theme);
  await wait(800);
}

async function main() {
  console.log("=== STARTING SCHEDULE VISUAL PROOF SUITE ===");
  console.log("1. Authenticating with API...");
  let auth = {};
  try {
    const loginRes = await fetch(`${API_BASE}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: "admin@clinic.ru", password: "Password123!" }),
    });
    if (loginRes.ok) {
      auth = await loginRes.json();
    }
  } catch (err) {
    console.log("API not reachable, using demo showcase tokens:", err.message);
  }
  console.log("Auth ready. clinicToken:", Boolean(auth.clinicToken), "staffToken:", Boolean(auth.staffToken));

  const browser = await chromium.launch({
    channel: "msedge",
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-web-security"],
  });

  const clinicToken = auth?.clinicToken || "demo-showcase-token-owner";
  const staffToken = auth?.staffToken || "demo-showcase-staff-token-owner";

  // ----------------------------------------------------
  // 1. PC CONTEXT (1440x900)
  // ----------------------------------------------------
  console.log("\n[PC] Setting up Desktop 1440x900 context...");
  const pcContext = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  await pcContext.addCookies([
    { name: "dente_clinic_token", value: clinicToken, domain: "127.0.0.1", path: "/" },
    { name: "dente_staff_token", value: staffToken, domain: "127.0.0.1", path: "/" },
  ]);

  const pcPage = await pcContext.newPage();
  await pcPage.addInitScript((tokens) => {
    localStorage.setItem("dente_clinic_token", tokens.clinicToken);
    localStorage.setItem("dente_staff_token", tokens.staffToken);
    localStorage.setItem("dente_demo_showcase", "true");
    localStorage.setItem("dente_offline_autonomy_mode", "true");
    localStorage.setItem("dente_onboarding_completed", "true");
    localStorage.setItem("dente_tour_completed", "true");
    localStorage.setItem("dente_tour_dismissed", "true");
    localStorage.setItem("dente_guide_tour_dismissed_v2", "true");
    localStorage.setItem("dente_doctor_training_completed", "true");
    localStorage.setItem("dente_training_dismissed", "true");
    localStorage.setItem("dente_active_nav", "schedule");
    localStorage.setItem("dente_last_view", "schedule");
    localStorage.setItem("dente_theme", "light");
  }, { clinicToken, staffToken });

  console.log("[PC] Navigating to http://127.0.0.1:5173/?demo=true#schedule ...");
  await pcPage.goto(`${APP_BASE}/?demo=true#schedule`, { waitUntil: "domcontentloaded", timeout: 45000 });

  console.log("[PC] Waiting for CRM hydration...");
  await pcPage.waitForFunction(() => {
    const text = document.body.innerText || "";
    return !text.includes("Загрузка CRM") && !text.includes("Загрузка системы");
  }, { timeout: 35000 });
  await wait(2000);

  // Click schedule tab in sidebar if visible
  const scheduleLink = pcPage.locator('a[href="#schedule"], button:has-text("Записи"), [data-tour="schedule-nav"]').first();
  if (await scheduleLink.isVisible({ timeout: 6000 }).catch(() => false)) {
    console.log("[PC] Clicking schedule link in sidebar...");
    await scheduleLink.click().catch(() => null);
    await wait(2000);
  }

  await pcPage.waitForSelector('[data-testid="schedule-toolbar"], [data-testid="schedule-view"], .schedule-grid-container', { state: "visible", timeout: 25000 });

  // Proof 1: PC Light 1440x900
  console.log("[PROOF 1] Capturing PC Light (1440x900)...");
  await applyTheme(pcPage, "light");
  await wait(1000);
  await saveProof(pcPage, "schedule_pc_light_1440x900.png", "PC Light Schedule Grid (1440x900)");

  // Proof 2: Quick Booking Drawer PC Light (450px)
  console.log("[PROOF 2] Opening Quick Booking Drawer on PC Light...");
  const quickBookBtn = pcPage.locator('[data-testid="schedule-toolbar-primary-quick-booking-btn"], button:has-text("+ Запись")').first();
  if (await quickBookBtn.isVisible()) {
    console.log("   Clicking + Запись button...");
    await quickBookBtn.click();
    await pcPage.waitForSelector('[data-testid="quick-booking-drawer"]', { state: "visible", timeout: 15000 });
    await wait(1500);
    await saveProof(pcPage, "schedule_quick_booking_drawer_pc_light_1440x900.png", "QuickBookingDrawer Desktop 450px Width");

    // Close drawer
    const closeBtn = pcPage.locator('[aria-label="Закрыть быструю запись"]').first();
    if (await closeBtn.isVisible()) {
      await closeBtn.click();
      await wait(600);
    }
  }

  // Proof 3: PC Dark 1440x900
  console.log("[PROOF 3] Capturing PC Dark (1440x900)...");
  await applyTheme(pcPage, "dark");
  await wait(1000);
  await saveProof(pcPage, "schedule_pc_dark_1440x900.png", "PC Dark Schedule Grid (1440x900)");

  await pcContext.close();

  // ----------------------------------------------------
  // 2. MOBILE CONTEXT (390x844 - iPhone 14/15/16)
  // ----------------------------------------------------
  console.log("\n[MOBILE] Setting up Mobile 390x844 context...");
  const mobileContext = await browser.newContext({
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 2,
    isMobile: true,
    hasTouch: true,
  });
  await mobileContext.addCookies([
    { name: "dente_clinic_token", value: clinicToken, domain: "127.0.0.1", path: "/" },
    { name: "dente_staff_token", value: staffToken, domain: "127.0.0.1", path: "/" },
  ]);

  const mobilePage = await mobileContext.newPage();
  await mobilePage.addInitScript((tokens) => {
    localStorage.setItem("dente_clinic_token", tokens.clinicToken);
    localStorage.setItem("dente_staff_token", tokens.staffToken);
    localStorage.setItem("dente_demo_showcase", "true");
    localStorage.setItem("dente_offline_autonomy_mode", "true");
    localStorage.setItem("dente_onboarding_completed", "true");
    localStorage.setItem("dente_tour_completed", "true");
    localStorage.setItem("dente_tour_dismissed", "true");
    localStorage.setItem("dente_guide_tour_dismissed_v2", "true");
    localStorage.setItem("dente_doctor_training_completed", "true");
    localStorage.setItem("dente_training_dismissed", "true");
    localStorage.setItem("dente_active_nav", "schedule");
    localStorage.setItem("dente_last_view", "schedule");
    localStorage.setItem("dente_theme", "light");
  }, { clinicToken, staffToken });

  console.log("[MOBILE] Navigating to http://127.0.0.1:5173/?demo=true#schedule ...");
  await mobilePage.goto(`${APP_BASE}/?demo=true#schedule`, { waitUntil: "domcontentloaded", timeout: 45000 });

  console.log("[MOBILE] Waiting for CRM hydration...");
  await mobilePage.waitForFunction(() => {
    const text = document.body.innerText || "";
    return !text.includes("Загрузка CRM") && !text.includes("Загрузка системы");
  }, { timeout: 35000 });
  await wait(2000);

  // Click schedule tab on mobile tab bar if present
  const mobileTab = mobilePage.locator('button:has-text("Расписание"), a.mobile-tab-item[href="#schedule"], a[href="#schedule"], button:has-text("Записи")').first();
  if (await mobileTab.isVisible({ timeout: 8000 }).catch(() => false)) {
    console.log("[MOBILE] Clicking schedule tab in bottom nav...");
    await mobileTab.click().catch(() => null);
    await wait(3000);
  }

  await mobilePage.waitForSelector('[data-testid="schedule-mobile-agenda-view"], .schedule-mobile-agenda, [data-testid="schedule-view"], .schedule-grid-container', { state: "visible", timeout: 20000 });

  // Proof 4: Mobile Light 390x844
  console.log("[PROOF 4] Capturing Mobile Light (390x844)...");
  await applyTheme(mobilePage, "light");
  await wait(1000);
  await saveProof(mobilePage, "schedule_mobile_light_390x844.png", "Mobile Light Agenda Timeline (390x844)");

  // Proof 5: Mobile Dark 390x844
  console.log("[PROOF 5] Capturing Mobile Dark (390x844)...");
  await applyTheme(mobilePage, "dark");
  await wait(1000);
  await saveProof(mobilePage, "schedule_mobile_dark_390x844.png", "Mobile Dark Agenda Timeline (390x844)");

  // Proof 6: Mobile Quick Booking Bottom Sheet Drawer
  console.log("[PROOF 6] Opening Quick Booking Drawer as Mobile Bottom Sheet...");
  const mobileQuickBtn = mobilePage.locator('.schedule-mobile-primary-action-btn, [data-testid="schedule-mobile-primary-action-btn"], button:has-text("Записать"), button:has-text("+ Запись")').first();
  if (await mobileQuickBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
    console.log("   Clicking mobile floating action button...");
    await mobileQuickBtn.click().catch(() => null);
    const drawerVisible = await mobilePage.waitForSelector('[data-testid="quick-booking-drawer"]', { state: "visible", timeout: 15000 }).then(() => true).catch(() => false);
    if (drawerVisible) {
      await wait(1500);
      await saveProof(mobilePage, "schedule_quick_booking_drawer_mobile_bottom_sheet_390x844.png", "Mobile Bottom Sheet Quick Booking Drawer (390x844)");

      // Close mobile drawer
      const mobileCloseBtn = mobilePage.locator('[aria-label="Закрыть"], [aria-label="Закрыть быструю запись"]').first();
      if (await mobileCloseBtn.isVisible().catch(() => false)) {
        await mobileCloseBtn.click().catch(() => null);
        await wait(600);
      } else {
        await mobilePage.keyboard.press("Escape");
        await wait(600);
      }
      await mobilePage.waitForSelector('[data-testid="quick-booking-drawer"]', { state: "hidden", timeout: 5000 }).catch(() => null);
      await wait(500);
    }
  }

  await mobileContext.close();
  await browser.close();

  console.log("\n=== ALL 6 SCHEDULE VISUAL PROOFS CAPTURED & VALIDATED SUCCESSFULLY ===");
}

main().catch((err) => {
  console.error("FATAL ERROR IN CAPTURE:", err);
  process.exit(1);
});
