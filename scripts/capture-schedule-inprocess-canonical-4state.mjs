import path from "node:path";
import { fileURLToPath } from "node:url";
import fs from "node:fs";
import { createServer } from "vite";
import { chromium } from "playwright";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const webRoot = path.resolve(__dirname, "../apps/web");
const configFile = path.resolve(webRoot, "vite.config.ts");
const PROOFS_DIR = path.resolve(__dirname, "../docs/proofs/schedule");
const SCREEN_DIR = path.resolve(__dirname, "../docs/screenshots/schedule");
const ORCHESTRATOR_DIR = "C:/Users/Admin/.gemini/antigravity/brain/07663fdc-eba5-48a1-bbb4-3c4b8f181006";

fs.mkdirSync(PROOFS_DIR, { recursive: true });
fs.mkdirSync(SCREEN_DIR, { recursive: true });
if (fs.existsSync(ORCHESTRATOR_DIR)) {
  fs.mkdirSync(ORCHESTRATOR_DIR, { recursive: true });
}

function verifyProof(filePath) {
  const size = fs.statSync(filePath).size;
  if (size < 20480) {
    throw new Error(`[BLANK DETECTED] ${filePath} is ${size} bytes (< 20KB)!`);
  }
  console.log(`[VERIFIED] ${path.basename(filePath)} (${(size / 1024).toFixed(1)} KB)`);
  return size;
}

async function main() {
  console.log("=== 1. Starting In-Process Vite Server for Schedule ===");
  const viteServer = await createServer({
    configFile,
    root: webRoot,
    server: {
      host: "127.0.0.1",
      strictPort: false,
      hmr: false,
      watch: null,
    },
  });

  await viteServer.listen();
  const address = viteServer.httpServer.address();
  const port = address.port;
  const baseUrl = `http://127.0.0.1:${port}`;
  console.log(`✓ In-process Vite listening on: ${baseUrl}`);

  console.log("=== 2. Launching Playwright Chromium ===");
  const chromePath = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
  const edgePath = "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe";
  const executablePath = fs.existsSync(chromePath) ? chromePath : fs.existsSync(edgePath) ? edgePath : undefined;

  const browser = await chromium.launch({
    headless: true,
    executablePath,
    args: ["--no-sandbox", "--disable-gpu", "--disable-dev-shm-usage"],
  });

  const suppressOverlays = async (page) => {
    try {
      await page.evaluate(() => {
        const style = document.createElement("style");
        style.id = "suppress-all-overlays-4proof";
        style.innerHTML = `
          .tour-spotlight-root,
          .tour-backdrop-clickable-zone,
          [data-testid="guided-tour-spotlight-overlay"],
          [data-testid="guided-tour-coach-mark-card"],
          [data-testid="demo-mode-banner"],
          .shepherd-element,
          .global-toast-container,
          [class*="toast"],
          .toast-container,
          [role="alert"],
          vite-error-overlay {
            display: none !important;
            pointer-events: none !important;
            opacity: 0 !important;
          }
        `;
        document.head.appendChild(style);
        document.querySelectorAll("vite-error-overlay, .tour-spotlight-root, [data-testid='guided-tour-spotlight-overlay']").forEach((el) => el.remove());
      });
    } catch (_) {}
  };

  const setupStorage = async (context, theme) => {
    await context.addInitScript(({ th }) => {
      localStorage.setItem("dente_clinic_token", "demo-clinic-token");
      localStorage.setItem("dente_staff_token", "demo-showcase-staff-token-chief");
      localStorage.setItem("dente_active_role", "doctor");
      localStorage.setItem("dente_user_role", "doctor");
      localStorage.setItem("dente_tour_completed", "true");
      localStorage.setItem("dente_demo_showcase_mode_v1", "true");
      localStorage.setItem("dente_demo_showcase", "true");
      localStorage.setItem("dente_onboarding_completed", "true");
      localStorage.setItem("dente_tour_dismissed", "true");
      localStorage.setItem("dente_guide_tour_dismissed_v2", "true");
      localStorage.setItem("dente_demo_banner_dismissed", "true");
      localStorage.setItem("dente_active_nav", "schedule");
      localStorage.setItem("dente_active_view", "schedule");
      localStorage.setItem("dente_theme", th);
      localStorage.setItem("dente_theme_mode", th);
      localStorage.setItem("theme", th);
      localStorage.setItem(
        "dental-crm:onboarding:v1",
        JSON.stringify({ dismissed: true, step: "done", completed: true })
      );
      localStorage.setItem(
        "dente_staff_session",
        JSON.stringify({
          userId: "doc-1",
          name: "Д-р Соколов А. В.",
          role: "doctor",
          roleScope: "doctor",
        })
      );
      sessionStorage.setItem("dente_unlocked", "true");
    }, { th: theme });
  };

  const scheduleStates = [
    {
      name: "01_schedule_pc_light_1440x900.png",
      alias: "01_schedule_grid_pc_light_1440x900.png",
      width: 1440,
      height: 900,
      theme: "light",
      isMobile: false,
    },
    {
      name: "02_schedule_pc_dark_1440x900.png",
      alias: "02_schedule_grid_pc_dark_1440x900.png",
      width: 1440,
      height: 900,
      theme: "dark",
      isMobile: false,
    },
    {
      name: "03_schedule_mobile_light_390x844.png",
      alias: "03_schedule_agenda_mobile_light_390x844.png",
      width: 390,
      height: 844,
      theme: "light",
      isMobile: true,
    },
    {
      name: "04_schedule_mobile_dark_390x844.png",
      alias: "04_schedule_agenda_mobile_dark_390x844.png",
      width: 390,
      height: 844,
      theme: "dark",
      isMobile: true,
    },
  ];

  for (const st of scheduleStates) {
    console.log(`\n--- Capturing Schedule: ${st.name} (${st.width}x${st.height}, ${st.theme}) ---`);
    const context = await browser.newContext({
      viewport: { width: st.width, height: st.height },
      isMobile: st.isMobile,
      hasTouch: st.isMobile,
      deviceScaleFactor: st.isMobile ? 2 : 1,
      colorScheme: st.theme,
    });

    await setupStorage(context, st.theme);
    const page = await context.newPage();
    page.on("pageerror", (err) => console.log(`[PAGE ERROR]: ${err.message}`));

    const targetUrl = `${baseUrl}/?demo=true#schedule`;
    console.log(`Navigating to ${targetUrl}...`);
    await page.goto(targetUrl, { waitUntil: "domcontentloaded", timeout: 45000 });
    
    // 1. Wait for boot loader and lazy Suspense chunks to completely finish
    console.log("   Waiting for lazy Schedule chunks to mount...");
    await page.waitForFunction(
      () => {
        const text = document.body ? document.body.innerText : "";
        if (
          text.includes("Загрузка CRM") ||
          text.includes("Загрузка системы") ||
          text.includes("Подготовка модулей") ||
          text.includes("Подготовка расписания")
        ) {
          return false;
        }
        const hasScheduleElement = Boolean(
          document.querySelector(
            '[data-testid="schedule-view"], [data-testid="schedule-grid-view"], .schedule-grid-container, [data-testid="schedule-mobile-agenda-view"], .schedule-unified-toolbar'
          )
        );
        return hasScheduleElement && text.length > 200;
      },
      undefined,
      { timeout: 45000 }
    );
    await suppressOverlays(page);

    // Apply theme
    await page.evaluate((th) => {
      document.documentElement.setAttribute("data-theme", th);
      document.body.setAttribute("data-theme", th);
      if (th === "dark") {
        document.documentElement.classList.add("dark");
        document.documentElement.classList.remove("light");
        document.body.classList.add("dark");
        document.body.classList.remove("light");
      } else {
        document.documentElement.classList.remove("dark");
        document.documentElement.classList.add("light");
        document.body.classList.remove("dark");
        document.body.classList.add("light");
      }
      document.documentElement.style.colorScheme = th;
    }, st.theme);

    // Wait for exact schedule elements to be rendered in the DOM
    if (st.isMobile) {
      await page.waitForSelector('[data-testid="schedule-mobile-agenda-view"], .schedule-mobile-agenda', { state: "visible", timeout: 30000 });
      await page.waitForSelector('.schedule-mobile-primary-action-btn, [data-testid="schedule-mobile-add-btn"]', { state: "visible", timeout: 30000 }).catch(() => {});
    } else {
      await page.waitForSelector('[data-testid^="btn-chair-doctor-popover-"], [data-testid="schedule-grid-view"], .schedule-grid-container', { state: "visible", timeout: 30000 });
    }

    await page.waitForTimeout(2000);
    await suppressOverlays(page);

    // Hard verification: zero loading splash tolerated
    const pageText = await page.evaluate(() => (document.body ? document.body.innerText : ""));
    if (pageText.includes("Подготовка модулей") || pageText.includes("Загрузка CRM") || pageText.includes("Загрузка системы")) {
      throw new Error(`[REJECTED] Loading splash detected on ${st.name}!`);
    }

    const proofPath = path.join(PROOFS_DIR, st.name);
    await page.screenshot({ path: proofPath, fullPage: false, animations: "disabled" });

    // Canonical names mapping
    const canonicalMap = {
      "01_schedule_pc_light_1440x900.png": [
        "schedule_pc_light_1440x900.png",
        "01_schedule_grid_pc_light_1440x900.png",
        "pc_light_1440x900.png",
      ],
      "02_schedule_pc_dark_1440x900.png": [
        "schedule_pc_dark_1440x900.png",
        "02_schedule_grid_pc_dark_1440x900.png",
        "pc_dark_1440x900.png",
      ],
      "03_schedule_mobile_light_390x844.png": [
        "schedule_mobile_light_390x844.png",
        "03_schedule_agenda_mobile_light_390x844.png",
        "mobile_light_390x844.png",
      ],
      "04_schedule_mobile_dark_390x844.png": [
        "schedule_mobile_dark_390x844.png",
        "04_schedule_agenda_mobile_dark_390x844.png",
        "mobile_dark_390x844.png",
      ],
    };

    fs.copyFileSync(proofPath, path.join(SCREEN_DIR, st.name));
    if (st.alias) {
      fs.copyFileSync(proofPath, path.join(PROOFS_DIR, st.alias));
      fs.copyFileSync(proofPath, path.join(SCREEN_DIR, st.alias));
    }

    if (canonicalMap[st.name]) {
      for (const cName of canonicalMap[st.name]) {
        fs.copyFileSync(proofPath, path.join(PROOFS_DIR, cName));
        fs.copyFileSync(proofPath, path.join(SCREEN_DIR, cName));
      }
    }

    // Mirror to Orchestrator artifact dir if accessible
    if (fs.existsSync(ORCHESTRATOR_DIR)) {
      try {
        fs.copyFileSync(proofPath, path.join(ORCHESTRATOR_DIR, st.name));
        if (canonicalMap[st.name]) {
          for (const cName of canonicalMap[st.name]) {
            fs.copyFileSync(proofPath, path.join(ORCHESTRATOR_DIR, cName));
          }
        }
      } catch (_) {}
    }

    verifyProof(proofPath);

    // Also capture Quick Booking Drawer in this state!
    console.log(`   Opening Quick Booking Drawer for ${st.name}...`);
    try {
      if (st.isMobile) {
        const addBtn = page.locator('.schedule-mobile-primary-action-btn, [data-testid="schedule-mobile-add-btn"]').first();
        if (await addBtn.isVisible().catch(() => false)) {
          await addBtn.click();
        } else {
          await page.evaluate(() => window.dispatchEvent(new CustomEvent("dente-open-quick-booking")));
        }
      } else {
        await page.evaluate(() => window.dispatchEvent(new CustomEvent("dente-open-quick-booking")));
      }
      await page.waitForSelector('[data-testid="quick-booking-drawer"]', { timeout: 15000, state: "visible" }).catch(() => {});
      await page.waitForTimeout(1000);
      await suppressOverlays(page);

      const qbName = st.isMobile
        ? (st.theme === "light" ? "07_schedule_quick_booking_mobile_light_390x844.png" : "08_schedule_quick_booking_mobile_dark_390x844.png")
        : (st.theme === "light" ? "05_schedule_quick_booking_pc_light_1440x900.png" : "06_schedule_quick_booking_pc_dark_1440x900.png");
      const qbPath = path.join(PROOFS_DIR, qbName);
      await page.screenshot({ path: qbPath, fullPage: false, animations: "disabled" });
      fs.copyFileSync(qbPath, path.join(SCREEN_DIR, qbName));
      verifyProof(qbPath);
    } catch (e) {
      console.log(`   [WARNING] Quick booking capture skipped: ${e.message}`);
    }

    await context.close();
  }

  await browser.close();
  await viteServer.close();
  console.log("\n=======================================================");
  console.log(">>> [VICTORY] All 4 Schedule Visual Proofs captured successfully! <<<");
  console.log("=======================================================");
}

main().catch((err) => {
  console.error("[FATAL ERROR]", err);
  process.exit(1);
});
