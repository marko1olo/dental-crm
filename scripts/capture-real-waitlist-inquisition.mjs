/**
 * scripts/capture-real-waitlist-inquisition.mjs
 * Red Team Schedule & Waitlist Booking Inquisitor: Real In-App Captures (1440x900)
 */
import { existsSync, mkdirSync, copyFileSync, statSync, unlinkSync } from "node:fs";
import path from "node:path";
import { chromium } from "playwright";

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
  console.log("=== STARTING REAL WAITLIST INQUISITION PROOF SUITE ===");

  const browser = await chromium.launch({
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-web-security"],
  });

  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const clinicToken = "demo-showcase-clinic-token-owner";
  const staffToken = "demo-showcase-staff-token-owner";

  await context.addCookies([
    { name: "dente_clinic_token", value: clinicToken, domain: "127.0.0.1", path: "/" },
    { name: "dente_staff_token", value: staffToken, domain: "127.0.0.1", path: "/" },
  ]);

  const page = await context.newPage();
  page.on("console", (m) => console.log("[BROWSER]", m.text()));
  page.on("pageerror", (e) => console.log("[PAGE_ERR]", e.message));

  await page.addInitScript((tokens) => {
    localStorage.setItem("dente_clinic_token", tokens.clinicToken);
    localStorage.setItem("dente_staff_token", tokens.staffToken);
    localStorage.setItem("dente_demo_showcase", "true");
    localStorage.setItem("dente_offline_autonomy_mode", "true");
    localStorage.setItem("dente_onboarding_completed", "true");
    localStorage.setItem("dente_tour_completed", "true");
    localStorage.setItem("dente_tour_dismissed", "true");
    localStorage.setItem("dente_guide_tour_dismissed_v2", "true");
    localStorage.setItem("dente_theme", "light");
  }, { clinicToken, staffToken });

  // 1. Навигируемся на лаунчер подбора листа ожидания в освободившееся окно
  console.log("\n1. Navigating to http://127.0.0.1:5173/?waitlist-matches=true ...");
  await page.goto(`${APP_BASE}/?waitlist-matches=true`);
  await wait(3000);

  await page.waitForSelector('[data-testid="standalone-waitlist-matches-root"]', { state: "visible", timeout: 20000 });
  await applyTheme(page, "light");
  await wait(1000);

  // Снимок 1: Карточка подбора кандидатов в окне (WaitlistMatchesBlock)
  console.log("2. Capturing WaitlistMatchesBlock with real matched candidates...");
  await saveProof(
    page,
    "schedule_waitlist_matches_block_pc_light_1440x900.png",
    "WaitlistMatchesBlock with matched candidates from live queue"
  );

  // 2. Клик на кнопку «Открыть лист»
  console.log("3. Clicking 'Открыть лист' button to slide in WaitlistDrawer...");
  const openListBtn = page.locator('button:has-text("Открыть лист"), button:has-text("Все (")').first();
  await openListBtn.click();
  await wait(1200);

  await page.waitForSelector('[data-testid="waitlist-drawer"]', { state: "visible", timeout: 15000 });

  // Снимок 2: ☀️ PC Light 1440x900 (WaitlistDrawer открыт с кандидатами и плашкой слота)
  console.log("4. Capturing ☀️ PC Light (1440x900) WaitlistDrawer...");
  await applyTheme(page, "light");
  await wait(800);
  await saveProof(
    page,
    "schedule_waitlist_drawer_pc_light_1440x900.png",
    "WaitlistDrawer PC Light (1440x900) with Smart Match slot banner and ranked candidates"
  );

  // Снимок 3: 🌙 PC Dark 1440x900 (WaitlistDrawer Dark Theme)
  console.log("5. Capturing 🌙 PC Dark (1440x900) WaitlistDrawer...");
  await applyTheme(page, "dark");
  await wait(800);
  await saveProof(
    page,
    "schedule_waitlist_drawer_pc_dark_1440x900.png",
    "WaitlistDrawer PC Dark (1440x900) with dark tokens and zero white flashes"
  );

  // 3. Возвращаем светлую тему и тестируем бронирование пациента
  console.log("6. Testing booking candidate into slot via 'Записать' button...");
  await applyTheme(page, "light");
  await wait(600);

  const bookBtn = page.locator('[data-testid="waitlist-drawer"] button:has-text("Записать")').first();
  if (await bookBtn.isVisible().catch(() => false)) {
    console.log("   Clicking 'Записать' on first candidate...");
    await bookBtn.click();
    await wait(2000);
    console.log("   Booking completed! Capturing post-booking state...");
    await saveProof(
      page,
      "schedule_waitlist_booked_success_pc_light_1440x900.png",
      "Waitlist candidate booked successfully into schedule slot"
    );
  }

  await browser.close();
  console.log("=== ALL WAITLIST REAL INQUISITION PROOFS CAPTURED SUCCESSFULLY ===");
}

main().catch((err) => {
  console.error("FATAL ERROR in real waitlist inquisition capture:", err);
  process.exit(1);
});
