const { chromium } = require("playwright");
const fs = require("node:fs");
const path = require("node:path");
const {
  obtainRealAuthTokens,
  injectRealAuthToContext,
  seedLiveScheduleData,
  APP_BASE,
} = require("./e2e-auth-helper.cjs");

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const outDir = path.resolve("docs/screenshots/inquisition_proofs");
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
    document.body.className = isDark ? "dark" : "light";
    document.documentElement.style.colorScheme = isDark ? "dark" : "light";
    localStorage.setItem("dente_theme_mode", th);
    localStorage.setItem("dente_theme", th);
  }, theme);
  const isDark = ["dark", "night", "ocean", "emerald", "cyber_xray"].includes(theme);
  await page.waitForFunction(
    (dark) => document.documentElement.classList.contains("dark") === dark,
    isDark,
    { timeout: 5000 }
  ).catch(() => {});
  await wait(600);
}

async function cleanOverlays(page) {
  await page.evaluate(() => {
    document.querySelectorAll(
      'vite-error-overlay, .tour-spotlight-root, [data-testid="guided-tour-spotlight-overlay"], .tour-backdrop-clickable-zone, .global-toast-container, [data-testid="demo-mode-banner"]'
    ).forEach((el) => el.remove());
  });
  await wait(300);
}

async function capture(page, filename, clip = null) {
  const targetPath = path.join(outDir, filename);
  const opts = { path: targetPath, animations: "disabled" };
  if (clip) opts.clip = clip;
  await page.screenshot(opts);
  const stat = fs.statSync(targetPath);
  console.log(`📸 Saved [${filename}]: ${stat.size} bytes (${stat.size >= 20480 ? "PASSED >= 20KB" : "FAILED < 20KB"})`);
  if (stat.size < 20480 && !clip) {
    throw new Error(`Screenshot ${filename} is smaller than 20KB (${stat.size} bytes)`);
  }
}

async function main() {
  console.log("🔑 Authenticating with live Fastify API...");
  const auth = await obtainRealAuthTokens();
  console.log(`✅ Authenticated! Clinic Org: ${auth.organizationId}`);

  console.log("🌱 Seeding schedule and chairs in PostgreSQL...");
  const seeded = await seedLiveScheduleData(auth);
  console.log(`✅ Seeded chairs: ${seeded.chairs?.length}, appointments: ${seeded.appointments?.length}`);

  const browser = await chromium.launch({
    headless: true,
    executablePath: "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
    args: ["--no-sandbox", "--disable-gpu", "--disable-dev-shm-usage"],
  });

  try {
    const context = await browser.newContext({
      viewport: { width: 1440, height: 900 },
      deviceScaleFactor: 1,
    });

    await injectRealAuthToContext(context, auth, {
      selectedPatientId: seeded.activePatientId,
    });

    const page = await context.newPage();

    // ─────────────────────────────────────────────
    // 1. SCHEDULE INQUISITION (PC 1440x900)
    // ─────────────────────────────────────────────
    console.log("Navigating to Schedule (#schedule)...");
    await page.goto(`${APP_BASE}/#schedule`, { waitUntil: "networkidle", timeout: 45000 }).catch(() => {
      return page.goto(`${APP_BASE}/#schedule`, { waitUntil: "domcontentloaded", timeout: 45000 });
    });
    
    await wait(3000);
    await cleanOverlays(page);

    // Schedule PC Light
    await setTheme(page, "light");
    await cleanOverlays(page);
    await wait(800);
    await capture(page, "schedule_inquisition_pc_light.png");

    // Schedule Cards Closeup Light (top area with chair headers)
    await capture(page, "schedule_cards_closeup_light.png", { x: 50, y: 40, width: 950, height: 360 });

    // Schedule PC Dark
    await setTheme(page, "dark");
    await cleanOverlays(page);
    await wait(800);
    await capture(page, "schedule_inquisition_pc_dark.png");

    // Schedule Cards Closeup Dark
    await capture(page, "schedule_cards_closeup_dark.png", { x: 50, y: 40, width: 950, height: 360 });

    // ─────────────────────────────────────────────
    // 1b. DEDICATED CHAIR VIEW MODE (#schedule chairs mode)
    // ─────────────────────────────────────────────
    console.log("Switching to 'По креслам' mode...");
    const chairModeBtn = await page.$('[data-testid="schedule-view-mode-chairs"]');
    if (chairModeBtn) {
      await chairModeBtn.click();
      await wait(1200);
      await cleanOverlays(page);
      await setTheme(page, "light");
      await wait(600);
      await capture(page, "schedule_chair_view_pc_light.png");
      await setTheme(page, "dark");
      await wait(600);
      await capture(page, "schedule_chair_view_pc_dark.png");
    }

    // ─────────────────────────────────────────────
    // 2. CLINICAL VISIT INQUISITION (PC 1440x900)
    // ─────────────────────────────────────────────
    console.log("Navigating to Clinical Visit (#visit)...");
    await page.goto(`${APP_BASE}/#visit`, { waitUntil: "networkidle", timeout: 45000 }).catch(() => {
      return page.goto(`${APP_BASE}/#visit`, { waitUntil: "domcontentloaded", timeout: 45000 });
    });
    await wait(3000);
    await cleanOverlays(page);

    // Visit PC Light
    await setTheme(page, "light");
    await cleanOverlays(page);
    await wait(800);
    await capture(page, "visit_inquisition_pc_light.png");

    // Visit PC Dark
    await setTheme(page, "dark");
    await cleanOverlays(page);
    await wait(800);
    await capture(page, "visit_inquisition_pc_dark.png");

    // ─────────────────────────────────────────────
    // 3. MOBILE ADAPTIVE (390x844)
    // ─────────────────────────────────────────────
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(`${APP_BASE}/#schedule`, { waitUntil: "domcontentloaded", timeout: 45000 });
    await wait(2500);
    await cleanOverlays(page);

    await setTheme(page, "light");
    await cleanOverlays(page);
    await wait(600);
    await capture(page, "schedule_inquisition_mobile_light.png");

    await setTheme(page, "dark");
    await cleanOverlays(page);
    await wait(600);
    await capture(page, "schedule_inquisition_mobile_dark.png");

    console.log("🎉 All inquisition screenshots successfully captured!");
  } finally {
    await browser.close();
  }
}

main().catch((err) => {
  console.error("FATAL screenshot error:", err);
  process.exit(1);
});
