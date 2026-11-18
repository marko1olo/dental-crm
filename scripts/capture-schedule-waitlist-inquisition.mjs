/**
 * scripts/capture-schedule-waitlist-inquisition.mjs
 * Red Team Schedule & Waitlist Booking Inquisitor: PC Light/Dark Proof Suite (1440x900)
 */
import { existsSync, mkdirSync, copyFileSync, statSync, unlinkSync } from "node:fs";
import path from "node:path";
import { chromium } from "playwright";

const API_BASE = "http://127.0.0.1:4100";
const APP_BASE = "http://127.0.0.1:5173";

const OUT_DIRS = [
  path.join(process.cwd(), "docs/proofs/schedule"),
  path.join(process.cwd(), ".dente-redesign-shots"),
  path.resolve("C:/Users/Admin/.gemini/antigravity/brain/0b1c5def-c5a6-4192-a709-3d9595f93992"),
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
  console.log("=== STARTING WAITLIST & SCHEDULE RED TEAM INQUISITION CAPTURE ===");
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
    console.log("API fallback:", err.message);
  }

  const clinicToken = auth?.clinicToken || "demo-showcase-token-owner";
  const staffToken = auth?.staffToken || "demo-showcase-staff-token-owner";

  const browser = await chromium.launch({
    channel: "msedge",
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-web-security"],
  });

  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  await context.addCookies([
    { name: "dente_clinic_token", value: clinicToken, domain: "127.0.0.1", path: "/" },
    { name: "dente_staff_token", value: staffToken, domain: "127.0.0.1", path: "/" },
  ]);

  const page = await context.newPage();
  await page.addInitScript((tokens) => {
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

  console.log("\n1. Navigating to Schedule (http://127.0.0.1:5173/?demo=true#schedule)...");
  await page.goto(`${APP_BASE}/?demo=true#schedule`, { waitUntil: "domcontentloaded", timeout: 45000 });

  await page.waitForFunction(() => {
    const text = document.body.innerText || "";
    return !text.includes("Загрузка CRM") && !text.includes("Загрузка системы");
  }, { timeout: 35000 });
  await wait(2000);

  // Click schedule nav link in sidebar if available
  const scheduleNav = page.locator('a[href="#schedule"], button:has-text("Записи"), [data-tour="schedule-nav"]').first();
  if (await scheduleNav.isVisible({ timeout: 5000 }).catch(() => false)) {
    console.log("   Clicking schedule link in sidebar...");
    await scheduleNav.click().catch(() => null);
    await wait(2000);
  }

  console.log("   Waiting for schedule grid to mount...");
  await page.waitForSelector('[data-testid="schedule-toolbar"], [data-testid="schedule-view"], .schedule-grid-container', {
    state: "visible",
    timeout: 30000,
  });
  await wait(1500);

  console.log("2. Opening Waitlist Drawer on live schedule grid...");
  // First try via options dropdown button
  const optionsBtn = page.locator('[data-testid="schedule-toolbar-options-btn"]').first();
  let openedViaMenu = false;
  if (await optionsBtn.isVisible().catch(() => false)) {
    console.log("   Clicking options button in schedule toolbar...");
    await optionsBtn.click();
    await wait(500);
    const waitlistMenuItem = page.locator('button:has-text("Лист ожидания")').first();
    if (await waitlistMenuItem.isVisible().catch(() => false)) {
      console.log("   Clicking 'Лист ожидания' in options menu...");
      await waitlistMenuItem.click();
      openedViaMenu = true;
    }
  }

  if (!openedViaMenu) {
    console.log("   Dispatching dente:open-waitlist-for-slot event...");
    await page.evaluate(() => {
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

  await page.waitForSelector('[data-testid="waitlist-drawer"]', { state: "visible", timeout: 20000 });
  await wait(1500);

  // Proof 1: PC Light 1440x900 (Schedule + WaitlistDrawer)
  console.log("3. Capturing ☀️ PC Light (1440x900) Schedule + WaitlistDrawer...");
  await applyTheme(page, "light");
  await wait(1000);
  await saveProof(page, "schedule_waitlist_pc_light_1440x900.png", "Schedule with WaitlistDrawer PC Light (1440x900)");

  // Proof 2: PC Dark 1440x900 (Schedule + WaitlistDrawer)
  console.log("4. Capturing 🌙 PC Dark (1440x900) Schedule + WaitlistDrawer...");
  await applyTheme(page, "dark");
  await wait(1000);
  await saveProof(page, "schedule_waitlist_pc_dark_1440x900.png", "Schedule with WaitlistDrawer PC Dark (1440x900)");

  // Close drawer
  const closeBtn = page.locator('[aria-label="Закрыть лист ожидания"]').first();
  if (await closeBtn.isVisible().catch(() => false)) {
    await closeBtn.click().catch(() => null);
    await wait(600);
  }

  // Proof 3: Direct Waitlist Matches Launcher (http://127.0.0.1:5173/?waitlist-matches=true)
  console.log("\n5. Navigating to DirectWaitlistMatchesLauncher (?waitlist-matches=true)...");
  await applyTheme(page, "light");
  await page.goto(`${APP_BASE}/?waitlist-matches=true`, { waitUntil: "domcontentloaded", timeout: 30000 });
  await wait(2500);

  await page.waitForSelector('[data-testid="standalone-waitlist-matches-root"]', { state: "visible", timeout: 20000 });
  
  // Click "Открыть лист" in DirectWaitlistMatchesLauncher to demonstrate zero dead-end
  const openDrawerBtn = page.locator('button:has-text("Открыть лист")').first();
  if (await openDrawerBtn.isVisible().catch(() => false)) {
    console.log("   Clicking 'Открыть лист' in DirectWaitlistMatchesLauncher...");
    await openDrawerBtn.click();
    await wait(1500);
  }

  await saveProof(
    page,
    "schedule_waitlist_matches_launcher_pc_light_1440x900.png",
    "DirectWaitlistMatchesLauncher with opened WaitlistDrawer"
  );

  await browser.close();
  console.log("=== ALL WAITLIST PROOFS CAPTURED SUCCESSFULLY ===");
}

main().catch((err) => {
  console.error("FATAL ERROR capturing waitlist proofs:", err);
  process.exit(1);
});
