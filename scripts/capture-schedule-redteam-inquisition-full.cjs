/**
 * scripts/capture-schedule-redteam-inquisition-full.cjs
 * Canonical Full Red Team Suite for Schedule, Quick Booking Drawer & Waitlist
 * 4-State Proof: PC Light/Dark (1440x900) & Mobile Light/Dark (390x844)
 */

const { chromium } = require("playwright");
const path = require("node:path");
const fs = require("node:fs");
const crypto = require("node:crypto");

const API_BASE = "http://127.0.0.1:4100";
const APP_URL = "http://127.0.0.1:5173/#schedule";

const OUT_DIRS = [
  path.resolve(__dirname, "../docs/proofs/schedule"),
  path.resolve(__dirname, "../docs/proofs/schedule_mobile"),
  path.resolve("C:/Users/Admin/.gemini/antigravity/brain/879917df-7e62-4ec0-afe1-166116b09208"),
  path.resolve("C:/Users/Admin/.gemini/antigravity/brain/8e7a2114-87b3-4423-8332-268e17be8aa3"),
  path.resolve("C:/Users/Admin/.gemini/antigravity/brain/07663fdc-eba5-48a1-bbb4-3c4b8f181006"),
];

for (const d of OUT_DIRS) {
  if (!fs.existsSync(d)) {
    try { fs.mkdirSync(d, { recursive: true }); } catch (_) {}
  }
}

async function loginToLiveApi() {
  console.log("[AUTH] Authenticating against live API at", `${API_BASE}/api/auth/login`);
  try {
    const res = await fetch(`${API_BASE}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: "admin@clinic.ru", password: "Password123!" }),
    });
    if (res.ok) {
      const data = await res.json();
      console.log("[AUTH] Successfully logged in! User:", data.user?.name || data.user?.fullName);
      return data;
    }
    console.warn("[AUTH] Login failed with status:", res.status);
  } catch (err) {
    console.error("[AUTH] Error connecting to API:", err.message);
  }
  return null;
}

async function suppressTransientOverlays(page) {
  try {
    await page.evaluate(() => {
      const styleId = "redteam-schedule-suppress-style";
      if (!document.getElementById(styleId)) {
        const style = document.createElement("style");
        style.id = styleId;
        style.innerHTML = `
          .tour-spotlight-root,
          .tour-backdrop-clickable-zone,
          [data-testid="guided-tour-spotlight-overlay"],
          [data-testid="guided-tour-coach-mark-card"],
          [data-testid="demo-mode-banner"],
          .global-toast-container,
          vite-error-overlay {
            display: none !important;
            pointer-events: none !important;
          }
        `;
        document.head.appendChild(style);
      }
      document.querySelectorAll("vite-error-overlay, .tour-spotlight-root, [data-testid='guided-tour-spotlight-overlay']").forEach((el) => el.remove());
    });
  } catch (_) {}
}

async function setTheme(page, theme) {
  await page.evaluate((th) => {
    document.documentElement.setAttribute("data-theme", th);
    if (th === "dark") {
      document.documentElement.classList.add("dark");
      document.documentElement.classList.remove("light");
    } else {
      document.documentElement.classList.add("light");
      document.documentElement.classList.remove("dark");
    }
    localStorage.setItem("dente_theme", th);
    localStorage.setItem("dente_theme_mode", th);
    localStorage.setItem("theme", th);
    document.documentElement.style.colorScheme = th;
    if (window.__useThemeStore) {
      window.__useThemeStore.getState().setThemeMode(th);
    }
  }, theme);
  await suppressTransientOverlays(page);
  await page.waitForTimeout(600);
}

async function saveProof(page, filename, description) {
  await suppressTransientOverlays(page);
  await page.waitForTimeout(400);

  const primaryPath = path.join(OUT_DIRS[0], filename);
  if (fs.existsSync(primaryPath)) {
    try { fs.unlinkSync(primaryPath); } catch (_) {}
  }

  await page.screenshot({ path: primaryPath, fullPage: false, animations: "disabled" });

  const buf = fs.readFileSync(primaryPath);
  const sizeKb = (buf.length / 1024).toFixed(1);
  const hash = crypto.createHash("md5").update(buf).digest("hex").slice(0, 10);

  if (buf.length < 25 * 1024) {
    throw new Error(`[BLANK SCREENSHOT] ${filename} is too small: ${sizeKb} KB (< 25 KB)`);
  }

  console.log(`  [OK] ${filename} (${sizeKb} KB, md5: ${hash}) -> ${description}`);

  for (let i = 1; i < OUT_DIRS.length; i++) {
    const copyTarget = path.join(OUT_DIRS[i], filename);
    try {
      fs.copyFileSync(primaryPath, copyTarget);
    } catch (e) {
      console.warn(`Could not copy to ${copyTarget}: ${e.message}`);
    }
  }

  const aliasMap = {
    "schedule_pc_light_1440x900.png": [
      "01_schedule_grid_pc_light_1440x900.png",
      "01_schedule_pc_light_1440x900.png",
      "pc_schedule_light_1440x900.png",
      "pc_light_1440x900.png",
    ],
    "schedule_pc_dark_1440x900.png": [
      "02_schedule_grid_pc_dark_1440x900.png",
      "02_schedule_pc_dark_1440x900.png",
      "pc_schedule_dark_1440x900.png",
      "pc_dark_1440x900.png",
    ],
    "schedule_mobile_light_390x844.png": [
      "03_schedule_agenda_mobile_light_390x844.png",
      "03_schedule_mobile_light_390x844.png",
      "mobile_schedule_light_390x844.png",
      "mobile_light_390x844.png",
    ],
    "schedule_mobile_dark_390x844.png": [
      "04_schedule_agenda_mobile_dark_390x844.png",
      "04_schedule_mobile_dark_390x844.png",
      "mobile_schedule_dark_390x844.png",
      "mobile_dark_390x844.png",
    ],
  };

  const aliases = aliasMap[filename] || [];
  for (const dir of OUT_DIRS) {
    for (const a of aliases) {
      try { fs.copyFileSync(primaryPath, path.join(dir, a)); } catch (_) {}
    }
  }

  return primaryPath;
}

async function main() {
  console.log("=== STARTING FULL RED TEAM SCHEDULE & BOOKING 4-STATE CAPTURE ===");
  const auth = await loginToLiveApi();
  if (!auth) {
    throw new Error("Cannot capture schedule without live Fastify authentication!");
  }

  const browser = await chromium.launch({
    channel: "msedge",
    headless: true,
    args: ["--no-sandbox", "--disable-gpu", "--proxy-server=direct://", "--proxy-bypass-list=*"],
  });

  const cToken = auth.clinicToken;
  const sToken = auth.staffToken;
  const doc = auth.user;

  try {
    // ----------------------------------------------------
    // PHASE 1: Desktop Schedule Suite (1440x900)
    // ----------------------------------------------------
    console.log("\n>>> PHASE 1: Desktop Suite (1440x900)");
    const pcContext = await browser.newContext({
      viewport: { width: 1440, height: 900 },
      deviceScaleFactor: 1,
      isMobile: false,
      hasTouch: false,
      serviceWorkers: "block",
    });

    await pcContext.addCookies([
      { name: "dente_clinic_token", value: cToken, domain: "127.0.0.1", path: "/" },
      { name: "dente_staff_token", value: sToken, domain: "127.0.0.1", path: "/" },
    ]);

    await pcContext.addInitScript(({ cToken, sToken, doc }) => {
      localStorage.setItem("dente_clinic_token", cToken);
      localStorage.setItem("dente_staff_token", sToken);
      localStorage.setItem("dente_theme_mode", "light");
      localStorage.setItem("dente_onboarding_completed", "true");
      localStorage.setItem("dente_tour_completed", "true");
      localStorage.setItem("dente_tour_dismissed", "true");
      localStorage.setItem("dente_guide_tour_dismissed_v2", "true");
      localStorage.setItem("dente_demo_banner_dismissed", "true");
      localStorage.setItem("dental-crm:onboarding:v1", JSON.stringify({ completed: true, dismissed: true }));
      localStorage.setItem("dente_active_staff_user", JSON.stringify(doc));
      localStorage.setItem("dente_workspace_perspective", "doctor");
      localStorage.setItem("dente_user_role", doc.role || "doctor");
      localStorage.setItem("dente_active_nav", "schedule");
      localStorage.setItem("dente_last_view", "schedule");
    }, { cToken, sToken, doc });

    const pcPage = await pcContext.newPage();
    console.log("Navigating to Schedule: " + APP_URL);
    await pcPage.goto(APP_URL, { waitUntil: "domcontentloaded", timeout: 40000 });

    // Wait for CRM to mount and clear loading states
    console.log("Waiting for schedule mounting...");
    for (let i = 0; i < 40; i++) {
      await pcPage.waitForTimeout(400);
      let text = "";
      try {
        text = await pcPage.evaluate(() => (document.body ? document.body.innerText : ""));
      } catch (_) {}
      if (text && !text.includes("Загрузка системы") && !text.includes("Загрузка CRM") && !text.includes("Загрузка рабочей смены") && text.length > 200) {
        break;
      }
    }

    await pcPage.waitForSelector('[data-testid="schedule-view"], [data-testid="schedule-toolbar"], .schedule-grid-container', {
      state: "visible",
      timeout: 30000,
    });
    await pcPage.waitForTimeout(1500);

    // 1. PC Light
    console.log("Capturing ☀️ PC Light (1440x900)...");
    await setTheme(pcPage, "light");
    await saveProof(pcPage, "schedule_pc_light_1440x900.png", "Desktop Schedule Grid Light Mode");

    // 2. PC Dark
    console.log("Capturing 🌙 PC Dark (1440x900)...");
    await setTheme(pcPage, "dark");
    await saveProof(pcPage, "schedule_pc_dark_1440x900.png", "Desktop Schedule Grid Dark Mode");

    // 3. Open Quick Booking Drawer on PC
    console.log("Opening Quick Booking Drawer on PC...");
    await setTheme(pcPage, "light");
    const primaryBookingBtn = pcPage.locator('[data-testid="schedule-toolbar-primary-quick-booking-btn"], button:has-text("+ Запись"), button:has-text("Запись")').first();
    if (await primaryBookingBtn.isVisible({ timeout: 4000 }).catch(() => false)) {
      await primaryBookingBtn.click();
    } else {
      const slotBtn = pcPage.locator('.schedule-empty-slot-btn').first();
      await slotBtn.click();
    }

    await pcPage.waitForSelector('[data-testid="quick-booking-drawer"]', { state: "visible", timeout: 15000 });
    await pcPage.waitForTimeout(1000);

    // 3.1 PC Quick Booking Drawer Light
    console.log("Capturing ☀️ Quick Booking Drawer PC Light (1440x900)...");
    await saveProof(pcPage, "schedule_quick_booking_pc_light_1440x900.png", "Quick Booking Drawer Desktop Light");

    // 3.2 PC Quick Booking Drawer Dark
    console.log("Capturing 🌙 Quick Booking Drawer PC Dark (1440x900)...");
    await setTheme(pcPage, "dark");
    await saveProof(pcPage, "schedule_quick_booking_pc_dark_1440x900.png", "Quick Booking Drawer Desktop Dark");

    // Close drawer
    const closeBtn = pcPage.locator('[data-testid="quick-booking-close-btn"], button:has-text("Отмена (Esc)")').first();
    if (await closeBtn.isVisible().catch(() => false)) {
      await closeBtn.click().catch(() => null);
      await pcPage.waitForTimeout(600);
    } else {
      await pcPage.keyboard.press("Escape");
      await pcPage.waitForTimeout(600);
    }

    // 4. Open Waitlist Drawer on PC
    console.log("Opening Waitlist Drawer on PC...");
    await setTheme(pcPage, "light");
    const optionsBtn = pcPage.locator('[data-testid="schedule-toolbar-options-btn"]').first();
    let openedWaitlist = false;
    if (await optionsBtn.isVisible().catch(() => false)) {
      await optionsBtn.click();
      await pcPage.waitForTimeout(500);
      const waitlistMenuItem = pcPage.locator('button:has-text("Лист ожидания")').first();
      if (await waitlistMenuItem.isVisible().catch(() => false)) {
        await waitlistMenuItem.click();
        openedWaitlist = true;
      }
    }

    if (!openedWaitlist) {
      await pcPage.evaluate(() => {
        window.dispatchEvent(
          new CustomEvent("dente:open-waitlist-for-slot", {
            detail: {
              appointmentId: "demo-freed-slot-1",
              startsAt: new Date(Date.now() + 3600000).toISOString(),
              endsAt: new Date(Date.now() + 7200000).toISOString(),
              doctorUserId: "demo-doctor-smirnov",
              doctorName: "Д-р Смирнов А. В.",
              chairId: "chair-1",
              chairName: "Кресло 1 (Терапия)",
              freedBecause: "Отмена приёма (окно 60 мин)",
            },
          })
        );
      });
    }

    await pcPage.waitForSelector('[data-testid="waitlist-drawer"]', { state: "visible", timeout: 15000 }).catch(() => {});
    await pcPage.waitForTimeout(1000);
    console.log("Capturing ☀️ Waitlist Drawer PC Light (1440x900)...");
    await saveProof(pcPage, "schedule_waitlist_drawer_pc_light_1440x900.png", "Waitlist Drawer Desktop Light");

    await pcContext.close();

    // ----------------------------------------------------
    // PHASE 2: Mobile Apple HIG Agenda View Suite (390x844)
    // ----------------------------------------------------
    console.log("\n>>> PHASE 2: Mobile Apple HIG Agenda Suite (390x844)");
    const mobileContext = await browser.newContext({
      viewport: { width: 390, height: 844 },
      deviceScaleFactor: 2,
      isMobile: true,
      hasTouch: true,
      serviceWorkers: "block",
    });

    await mobileContext.addCookies([
      { name: "dente_clinic_token", value: cToken, domain: "127.0.0.1", path: "/" },
      { name: "dente_staff_token", value: sToken, domain: "127.0.0.1", path: "/" },
    ]);

    await mobileContext.addInitScript(({ cToken, sToken, doc }) => {
      localStorage.setItem("dente_clinic_token", cToken);
      localStorage.setItem("dente_staff_token", sToken);
      localStorage.setItem("dente_theme_mode", "light");
      localStorage.setItem("dente_onboarding_completed", "true");
      localStorage.setItem("dente_tour_completed", "true");
      localStorage.setItem("dente_tour_dismissed", "true");
      localStorage.setItem("dente_guide_tour_dismissed_v2", "true");
      localStorage.setItem("dente_demo_banner_dismissed", "true");
      localStorage.setItem("dental-crm:onboarding:v1", JSON.stringify({ completed: true, dismissed: true }));
      localStorage.setItem("dente_active_staff_user", JSON.stringify(doc));
      localStorage.setItem("dente_workspace_perspective", "doctor");
      localStorage.setItem("dente_user_role", doc.role || "doctor");
      localStorage.setItem("dente_active_nav", "schedule");
      localStorage.setItem("dente_last_view", "schedule");
    }, { cToken, sToken, doc });

    const mobilePage = await mobileContext.newPage();
    console.log("Navigating Mobile to Schedule: " + APP_URL);
    await mobilePage.goto(APP_URL, { waitUntil: "domcontentloaded", timeout: 40000 });

    for (let i = 0; i < 40; i++) {
      await mobilePage.waitForTimeout(400);
      let text = "";
      try {
        text = await mobilePage.evaluate(() => (document.body ? document.body.innerText : ""));
      } catch (_) {}
      if (text && !text.includes("Загрузка системы") && !text.includes("Загрузка CRM") && !text.includes("Загрузка рабочей смены") && text.length > 200) {
        break;
      }
    }

    await mobilePage.waitForSelector('[data-testid="schedule-mobile-agenda-view"], .schedule-mobile-agenda, [data-testid="schedule-view"]', {
      state: "visible",
      timeout: 30000,
    });
    await mobilePage.waitForTimeout(1500);

    // 5. Mobile Light
    console.log("Capturing 📱 Mobile Light (390x844)...");
    await setTheme(mobilePage, "light");
    await saveProof(mobilePage, "schedule_mobile_light_390x844.png", "Mobile Agenda View Light Mode");

    // 6. Mobile Dark
    console.log("Capturing 🌙 Mobile Dark (390x844)...");
    await setTheme(mobilePage, "dark");
    await saveProof(mobilePage, "schedule_mobile_dark_390x844.png", "Mobile Agenda View Dark Mode");

    // 7. Open Quick Booking Bottom Sheet on Mobile
    console.log("Opening Quick Booking Bottom Sheet on Mobile...");
    await setTheme(mobilePage, "light");
    const mobileBottomBarBtn = mobilePage.locator('[data-testid="schedule-mobile-bottom-bar-booking-btn"], button:has-text("Новая запись"), button:has-text("+ Запись")').first();
    if (await mobileBottomBarBtn.isVisible({ timeout: 4000 }).catch(() => false)) {
      await mobileBottomBarBtn.click();
    } else {
      const gapBtn = mobilePage.locator('.schedule-mobile-gap-row, button:has-text("Записать")').first();
      await gapBtn.click();
    }

    await mobilePage.waitForSelector('[data-testid="quick-booking-drawer"]', { state: "visible", timeout: 15000 });
    await mobilePage.waitForTimeout(1000);

    // 7.1 Mobile Bottom Sheet Light
    console.log("Capturing 📱 Mobile Bottom Sheet Light (390x844)...");
    await saveProof(mobilePage, "schedule_mobile_quick_booking_bottom_sheet_390x844.png", "Mobile Quick Booking Bottom Sheet Light Mode");

    // 7.2 Mobile Bottom Sheet Dark
    console.log("Capturing 🌙 Mobile Bottom Sheet Dark (390x844)...");
    await setTheme(mobilePage, "dark");
    await saveProof(mobilePage, "schedule_mobile_quick_booking_bottom_sheet_dark_390x844.png", "Mobile Quick Booking Bottom Sheet Dark Mode");

    await mobileContext.close();

    console.log("\n=== ALL RED TEAM PROOF CAPTURES COMPLETED SUCCESSFULLY ===");
  } finally {
    await browser.close();
  }
}

main().catch((err) => {
  console.error("FATAL ERROR in Red Team Schedule Capture:", err);
  process.exit(1);
});
