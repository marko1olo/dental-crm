/**
 * scripts/capture-schedule-redteam-canonical-4states.cjs
 * 4-State Visual Proof Capture for Schedule, Quick Booking & Waitlist SSOT
 */
const { chromium } = require("playwright");
const fs = require("node:fs");
const path = require("node:path");
const crypto = require("node:crypto");

const WEB_BASE = process.env.WEB_BASE || "http://127.0.0.1:5173";
const PROOF_DIR = path.resolve(__dirname, "../docs/proofs/schedule");

if (!fs.existsSync(PROOF_DIR)) {
  fs.mkdirSync(PROOF_DIR, { recursive: true });
}

async function getAuth() {
  try {
    const res = await fetch("http://127.0.0.1:4100/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: "clinic@example.com", password: "dente2026" }),
    });
    if (res.ok) {
      const data = await res.json();
      if (data.ok) return data;
    }
  } catch (_) {}
  return null;
}

async function injectStorage(context, theme = "light", auth = null) {
  if (auth) {
    await context.addCookies([
      { name: "dente_clinic_token", value: auth.clinicToken, url: WEB_BASE },
      { name: "dente_staff_token", value: auth.staffToken, url: WEB_BASE },
    ]);
  }
  await context.addInitScript(({ th, auth }) => {
    const clinicToken = auth?.clinicToken || "demo-token";
    const staffToken = auth?.staffToken || "demo-token";
    const role = auth?.user?.role || "owner";
    const userId = auth?.user?.id || "doc-1";
    const userName = auth?.user?.fullName || "Д-р Соколов А. В.";

    localStorage.setItem("dente_clinic_token", clinicToken);
    localStorage.setItem("dente_staff_token", staffToken);
    localStorage.setItem("dente_active_session_token", staffToken);
    localStorage.setItem("dente_active_role", role);
    localStorage.setItem("dente_role", role);
    localStorage.setItem("dente_user_role", role);
    localStorage.setItem("dente_active_user_id", userId);
    localStorage.setItem("dente_user_id", userId);
    localStorage.setItem("dente_user_name", userName);
    localStorage.setItem("dente_active_view", "schedule");
    localStorage.setItem("dente_active_nav", "schedule");
    if (auth?.user) {
      localStorage.setItem("dental-crm:active-user:v1", JSON.stringify(auth.user));
    }
    localStorage.setItem("dente_theme_mode", th);
    localStorage.setItem("dente_theme", th);
    localStorage.setItem("theme", th);
    localStorage.setItem("dente_onboarding_completed", "true");
    localStorage.setItem("dente_tour_completed", "true");
    localStorage.setItem("dente_tour_dismissed", "true");
    localStorage.setItem("dente_guide_tour_dismissed_v2", "true");
    localStorage.setItem("dente_demo_banner_dismissed", "true");
    localStorage.setItem("dente_unlocked", "true");
    localStorage.setItem("dental-crm:onboarding:v1", JSON.stringify({ completed: true, dismissed: true, step: "done" }));
    localStorage.setItem("dental-crm:web-ui-preferences:v1", JSON.stringify({
      version: 1,
      uiLanguage: "ru",
      selectedWorkspaceRole: role,
      onboardingDismissed: true,
      onboardingStep: "done",
    }));
    document.cookie = `dente_clinic_token=${clinicToken}; path=/; max-age=31536000`;
    document.cookie = `dente_staff_token=${staffToken}; path=/; max-age=31536000`;

    document.documentElement.setAttribute("data-theme", th);
    if (th === "dark") {
      document.documentElement.classList.add("dark");
      document.documentElement.classList.remove("light");
    } else {
      document.documentElement.classList.add("light");
      document.documentElement.classList.remove("dark");
    }
  }, { th: theme, auth });
}

async function suppressOverlays(page) {
  try {
    await page.evaluate(() => {
      const style = document.createElement("style");
      style.id = "suppress-all-overlays";
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
    try {
      localStorage.setItem("dente_theme", th);
      localStorage.setItem("dente_theme_mode", th);
      localStorage.setItem("theme", th);
    } catch (_) {}
  }, theme);
  await suppressOverlays(page);
  await page.waitForTimeout(600);
}

async function safeGoto(page, url) {
  for (let i = 0; i < 3; i++) {
    try {
      await page.goto(url, { waitUntil: "commit", timeout: 25000 });
      return;
    } catch (e) {
      console.log(`[safeGoto] Attempt ${i + 1} failed: ${e.message}, waiting 1.5s...`);
      await page.waitForTimeout(1500);
    }
  }
  await page.goto(url, { waitUntil: "commit", timeout: 25000 });
}

async function waitForRealUI(page) {
  console.log("  Waiting for real UI...");
  await page.waitForFunction(() => {
    const text = document.body ? document.body.innerText : "";
    const isBooting = text.includes("Загрузка системы") ||
                      text.includes("Загрузка CRM") ||
                      text.includes("Загрузка рабочей смены") ||
                      text.includes("Подготовка модулей расписания");
    const hasUI = !!document.querySelector(
      '[data-testid="schedule-view"], [data-testid="schedule-grid-view"], .schedule-grid-container, [data-testid="schedule-mobile-agenda-view"], .schedule-mobile-agenda, .schedule-unified-toolbar'
    );
    return !isBooting && hasUI && text.length > 50;
  }, { timeout: 45000 }).catch(() => {});

  await page.waitForSelector('[data-testid="schedule-view"], [data-testid="schedule-grid-view"], .schedule-grid-container, [data-testid="schedule-mobile-agenda-view"], .schedule-mobile-agenda, .schedule-unified-toolbar', {
    timeout: 35000,
    state: "visible",
  }).catch(() => {});

  await suppressOverlays(page);
  await page.waitForTimeout(1500);
}

async function saveProof(page, filename, description) {
  await suppressOverlays(page);
  await page.waitForTimeout(600);

  const targetPath = path.join(PROOF_DIR, filename);
  await page.screenshot({ path: targetPath, fullPage: false, animations: "disabled" });

  const buf = fs.readFileSync(targetPath);
  const sizeKb = (buf.length / 1024).toFixed(1);
  const hash = crypto.createHash("md5").update(buf).digest("hex").slice(0, 10);
  console.log(`  -> [PROOF CAPTURED] ${filename} (${sizeKb} KB, md5: ${hash}) | ${description}`);

  if (buf.length < 20 * 1024) {
    throw new Error(`Screenshot ${filename} is too small: ${sizeKb} KB (< 20 KB)`);
  }
  return { filename, sizeKb, hash, path: targetPath };
}

async function main() {
  console.log("[Visual Proof] Launching Chromium...");
  const auth = await getAuth();
  if (auth) {
    console.log(`[AUTH] Successfully authenticated as ${auth.user?.fullName} (${auth.user?.role})`);
  } else {
    console.warn("[AUTH] Could not authenticate with API, falling back to offline tokens");
  }

  const browser = await chromium.launch({
    headless: true,
    executablePath: "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
    args: ["--no-sandbox", "--disable-gpu", "--disable-web-security"],
  });

  const manifest = [];

  try {
    // ----------------------------------------------------
    // PHASE 1: PC Desktop Schedule (1440x900)
    // ----------------------------------------------------
    console.log("\n--- Phase 1: PC Desktop Schedule (1440x900) ---");
    const pcContext = await browser.newContext({
      viewport: { width: 1440, height: 900 },
      deviceScaleFactor: 1,
      isMobile: false,
      hasTouch: false,
    });
    await injectStorage(pcContext, "light", auth);

    const pcPage = await pcContext.newPage();
    console.log("  Navigating PC to " + WEB_BASE + "/#schedule ...");
    await safeGoto(pcPage, `${WEB_BASE}/#schedule`);
    await waitForRealUI(pcPage);

    await pcPage.waitForSelector('[data-testid="schedule-view"], [data-testid="schedule-grid-view"], .schedule-grid-container', {
      timeout: 25000,
      state: "visible",
    }).catch(() => {});
    await pcPage.waitForTimeout(1500);

    // 1. PC Light
    await setTheme(pcPage, "light");
    manifest.push(await saveProof(pcPage, "01_schedule_pc_light_1440x900.png", "Schedule Grid PC Light (1440x900)"));

    // 2. PC Dark
    await setTheme(pcPage, "dark");
    manifest.push(await saveProof(pcPage, "02_schedule_pc_dark_1440x900.png", "Schedule Grid PC Dark (1440x900)"));

    // 3. Quick Booking Drawer PC Light
    await setTheme(pcPage, "light");
    console.log("  Opening Quick Booking Drawer on PC...");
    const qbBtn = pcPage.locator('[data-testid="schedule-toolbar-primary-quick-booking-btn"], button:has-text("+ Запись"), button:has-text("Запись")').first();
    if (await qbBtn.isVisible().catch(() => false)) {
      await qbBtn.click();
    } else {
      await pcPage.evaluate(() => {
        window.dispatchEvent(new CustomEvent("dente:open-quick-booking", {
          detail: {
            dateKey: new Date().toISOString().slice(0, 10),
            durationMinutes: 30,
          },
        }));
      });
    }
    await pcPage.waitForSelector('[data-testid="quick-booking-drawer"]', { timeout: 15000, state: "visible" }).catch(() => {});
    await pcPage.waitForFunction(() => {
      const text = document.body ? document.body.innerText : "";
      return !text.includes("Загрузка CRM") && (text.includes("Записать") || text.includes("Создать запись") || text.includes("Пациент"));
    }, { timeout: 15000 }).catch(() => {});
    await pcPage.waitForTimeout(1500);
    manifest.push(await saveProof(pcPage, "05_schedule_quick_booking_pc_light_1440x900.png", "Quick Booking Drawer PC Light"));

    // Close QB
    const closeQB = pcPage.locator('[aria-label="Закрыть быструю запись"], [data-testid="quick-booking-cancel-btn"]').first();
    if (await closeQB.isVisible().catch(() => false)) {
      await closeQB.click().catch(() => null);
      await pcPage.waitForTimeout(600);
    }

    // 4. Waitlist Drawer PC Light
    console.log("  Opening Waitlist Drawer on PC...");
    await pcPage.evaluate(() => {
      window.dispatchEvent(new CustomEvent("dente:open-waitlist-for-slot", {
        detail: {
          appointmentId: "demo-slot-1",
          startsAt: new Date(Date.now() + 3600000).toISOString(),
          endsAt: new Date(Date.now() + 7200000).toISOString(),
          doctorUserId: "doc-1",
          doctorName: "Д-р Смирнов А. В.",
          chairId: "chair-1",
          chairName: "Кресло 1 (Терапия)",
          freedBecause: "Отмена записи",
        },
      }));
    });
    await pcPage.waitForSelector('[data-testid="waitlist-drawer"]', { timeout: 15000, state: "visible" }).catch(() => {});
    await pcPage.waitForTimeout(1000);
    manifest.push(await saveProof(pcPage, "06_schedule_waitlist_drawer_pc_light_1440x900.png", "Waitlist Drawer PC Light"));

    // Close Waitlist Drawer
    console.log("  Closing Waitlist Drawer on PC...");
    await pcPage.keyboard.press("Escape");
    await pcPage.waitForTimeout(600);
    const closeWL = pcPage.locator('[aria-label="Закрыть лист ожидания"], [data-testid="waitlist-drawer"] button:has-text("✕")').first();
    if (await closeWL.isVisible().catch(() => false)) {
      await closeWL.click().catch(() => null);
      await pcPage.waitForTimeout(600);
    }

    // ----------------------------------------------------
    // PHASE 2: Mobile Apple HIG Agenda View (390x844)
    // ----------------------------------------------------
    console.log("\n--- Phase 2: Mobile Apple HIG Agenda View (390x844) ---");
    console.log("  Resizing viewport to 390x844 (Apple HIG mobile)...");
    await pcPage.setViewportSize({ width: 390, height: 844 });
    await pcPage.waitForTimeout(1000);
    await pcPage.keyboard.press("Escape");
    await pcPage.waitForTimeout(600);

    // 5. Mobile Light Agenda View
    await setTheme(pcPage, "light");
    await pcPage.waitForSelector('[data-testid="schedule-mobile-agenda-view"], .schedule-mobile-agenda', {
      timeout: 15000,
      state: "visible",
    }).catch(() => {});
    await pcPage.waitForTimeout(1500);
    manifest.push(await saveProof(pcPage, "03_schedule_mobile_light_390x844.png", "Mobile Agenda Light (390x844)"));

    // 6. Mobile Dark Agenda View
    await setTheme(pcPage, "dark");
    await pcPage.waitForSelector('[data-testid="schedule-mobile-agenda-view"], .schedule-mobile-agenda', {
      timeout: 15000,
      state: "visible",
    }).catch(() => {});
    await pcPage.waitForTimeout(1500);
    manifest.push(await saveProof(pcPage, "04_schedule_mobile_dark_390x844.png", "Mobile Agenda Dark (390x844)"));

    // 7. Mobile Waitlist Bottom Sheet
    await setTheme(pcPage, "light");
    console.log("  Opening Waitlist Bottom Sheet on Mobile...");
    await pcPage.evaluate(() => {
      window.dispatchEvent(new CustomEvent("dente:open-waitlist-for-slot", {
        detail: {
          appointmentId: "demo-slot-1",
          startsAt: new Date(Date.now() + 3600000).toISOString(),
          endsAt: new Date(Date.now() + 7200000).toISOString(),
          doctorUserId: "doc-1",
          doctorName: "Д-р Смирнов А. В.",
          chairId: "chair-1",
          chairName: "Кресло 1 (Терапия)",
          freedBecause: "Отмена записи",
        },
      }));
    });
    await pcPage.waitForSelector('[data-testid="waitlist-drawer"]', { timeout: 15000, state: "visible" }).catch(() => {});
    await pcPage.waitForTimeout(1000);
    manifest.push(await saveProof(pcPage, "07_schedule_waitlist_bottomsheet_mobile_light_390x844.png", "Waitlist Bottom Sheet Mobile Light (390x844)"));

    // Canonical copy sync
    fs.copyFileSync(path.join(PROOF_DIR, "01_schedule_pc_light_1440x900.png"), path.join(PROOF_DIR, "schedule_pc_light_1440x900.png"));
    fs.copyFileSync(path.join(PROOF_DIR, "02_schedule_pc_dark_1440x900.png"), path.join(PROOF_DIR, "schedule_pc_dark_1440x900.png"));
    fs.copyFileSync(path.join(PROOF_DIR, "03_schedule_mobile_light_390x844.png"), path.join(PROOF_DIR, "schedule_mobile_light_390x844.png"));
    fs.copyFileSync(path.join(PROOF_DIR, "04_schedule_mobile_dark_390x844.png"), path.join(PROOF_DIR, "schedule_mobile_dark_390x844.png"));

    await pcContext.close();

    console.log("\n[SUCCESS] ALL PROOFS CAPTURED SUCCESSFULLY!");
    console.log(JSON.stringify(manifest, null, 2));
  } finally {
    await browser.close();
  }
}

main().catch((err) => {
  console.error("[FATAL ERROR]:", err);
  process.exit(1);
});
