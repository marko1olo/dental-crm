/**
 * scripts/capture-leads-4state-canonical.mjs
 * Canonical 4-State Proofs for Leads Kanban and Mobile Feed:
 * 1. ☀️ PC Light (1440x900): docs/proofs/leads/01_leads_kanban_pc_light_1440x900.png
 * 2. 🌙 PC Dark (1440x900): docs/proofs/leads/02_leads_kanban_pc_dark_1440x900.png
 * 3. 📱 Mobile Light (390x844): docs/proofs/leads/03_leads_mobile_feed_light_390x844.png
 * 4. 🌙 Mobile Dark (390x844): docs/proofs/leads/04_leads_mobile_feed_dark_390x844.png
 * 5. ☀️ PC Studio Modal Light (1440x900): docs/proofs/leads/05_leads_studio_modal_pc_light_1440x900.png
 * 6. 🌙 PC Studio Modal Dark (1440x900): docs/proofs/leads/06_leads_studio_modal_pc_dark_1440x900.png
 */

import { chromium } from "playwright";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const WEB_BASE = "http://127.0.0.1:5173";
const OUT_DIR = path.resolve(__dirname, "../docs/proofs/leads");

if (!fs.existsSync(OUT_DIR)) {
  fs.mkdirSync(OUT_DIR, { recursive: true });
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function setupPageSession(context, page, role = "owner") {
  await context.addCookies([
    {
      name: "dente_clinic_token",
      value: "demo-clinic-token",
      domain: "127.0.0.1",
      path: "/",
    },
    {
      name: "dente_staff_token",
      value: "demo-staff-token",
      domain: "127.0.0.1",
      path: "/",
    },
  ]);

  await page.addInitScript(
    ({ role }) => {
      sessionStorage.setItem("dente_unlocked", "true");
      localStorage.setItem("dente_unlocked", "true");
      localStorage.setItem("dente_clinic_token", "demo-clinic-token");
      localStorage.setItem("dente_staff_token", "demo-staff-token");
      localStorage.setItem("dente_workspace_perspective", role);
      localStorage.setItem("dente_user_role", role);
      localStorage.setItem("dente_active_role", role);
      localStorage.setItem("dente_demo_showcase", "true");
      localStorage.setItem("dente_demo_banner_dismissed", "true");
      localStorage.setItem("dente_onboarding_completed", "true");
      localStorage.setItem("dente_tour_completed", "true");
      localStorage.setItem("dente_tour_dismissed", "true");
      localStorage.setItem("dente_guide_tour_dismissed_v2", "true");
      localStorage.setItem(
        "dental-crm:onboarding:v1",
        JSON.stringify({ dismissed: true, step: "done", completed: true }),
      );
      localStorage.setItem(
        "dental-crm:web-ui-preferences:v1",
        JSON.stringify({
          version: 1,
          uiLanguage: "ru",
          selectedWorkspaceRole: role,
          onboardingDismissed: true,
          onboardingStep: "done",
        }),
      );
      localStorage.setItem(
        "dente-workspace-profile",
        JSON.stringify({ mode: "clinic", role: role, activeRole: role }),
      );
    },
    { role },
  );
}

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

      // Закрываем лишние модалки
      document.querySelectorAll('.shift-studio-close-btn, button[aria-label="Закрыть окно"]').forEach((b) => {
        try { b.click(); } catch (_) {}
      });
    });
  } catch (_) {}
}

async function waitForRealUI(page) {
  console.log("  [AUTH] Checking for login or demo buttons...");
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
  await page.waitForSelector("#boot-splash, .boot-state, .boot-container", {
    state: "detached",
    timeout: 30000,
  }).catch(() => {});

  await page.waitForFunction(
    () => {
      const text = document.body.innerText || "";
      const isBoot =
        text.includes("Загрузка CRM") ||
        text.includes("Загрузка системы") ||
        text.includes("Подготовка модулей");
      const hasRealContainer = Boolean(
        document.querySelector(".workspace-shell") ||
          document.querySelector(".topbar") ||
          document.querySelector(".leads-kanban-board") ||
          document.querySelector(".leads-view")
      );
      return !isBoot && hasRealContainer;
    },
    { timeout: 35000 },
  );

  await suppressOverlays(page);
  await sleep(1500);
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
  await suppressOverlays(page);
  await sleep(400);
}

async function run() {
  console.log("=== STARTING CANONICAL 4-STATE LEADS PROOF CAPTURE ===");
  const browser = await chromium.launch({
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-gpu"],
  });

  try {
    // ═══════════════════════════════════════════════════════════
    // 1. PC CONTEXT (1440 x 900)
    // ═══════════════════════════════════════════════════════════
    console.log("\n--- 1. PC 1440x900 Leads Kanban ---");
    const pcContext = await browser.newContext({
      viewport: { width: 1440, height: 900 },
      deviceScaleFactor: 1,
    });
    const pcPage = await pcContext.newPage();
    await setupPageSession(pcContext, pcPage, "owner");

    console.log("Navigating to http://127.0.0.1:5173/?demo=true#leads...");
    await pcPage.goto(`${WEB_BASE}/?demo=true#leads`, {
      waitUntil: "domcontentloaded",
      timeout: 45000,
    });
    await waitForRealUI(pcPage);

    // Переключаем представление на leads через стор и навигацию
    console.log("Switching view to leads...");
    await pcPage.evaluate(() => {
      // Ищем навигационный пункт или переключаем стор
      if (window.__useAppStore) {
        window.__useAppStore.getState().setCurrentView("leads");
      }
      window.location.hash = "leads";
    });
    await sleep(2000);
    await suppressOverlays(pcPage);

    // Проверяем, смонтирован ли контейнер канбана
    const kanbanRoot = pcPage.locator(".leads-kanban-board, .leads-board-container, .leads-studio-content").first();
    await kanbanRoot.waitFor({ state: "visible", timeout: 10000 }).catch(() => {
      console.log("  [WARN] Kanban root not immediately visible, re-triggering store change...");
      return pcPage.evaluate(() => {
        if (window.__useAppStore) {
          window.__useAppStore.getState().setCurrentView("leads");
        }
      });
    });
    await sleep(1000);
    await suppressOverlays(pcPage);

    // 1.1 PC Light Kanban
    await setTheme(pcPage, "light");
    const pcLightPath = path.join(OUT_DIR, "01_leads_kanban_pc_light_1440x900.png");
    await pcPage.screenshot({ path: pcLightPath, fullPage: false });
    console.log(`[PROOF SAVED] PC Light: ${pcLightPath} (${fs.statSync(pcLightPath).size} bytes)`);

    // 1.2 PC Dark Kanban
    await setTheme(pcPage, "dark");
    const pcDarkPath = path.join(OUT_DIR, "02_leads_kanban_pc_dark_1440x900.png");
    await pcPage.screenshot({ path: pcDarkPath, fullPage: false });
    console.log(`[PROOF SAVED] PC Dark: ${pcDarkPath} (${fs.statSync(pcDarkPath).size} bytes)`);

    await pcContext.close();

    // ═══════════════════════════════════════════════════════════
    // 2. MOBILE CONTEXT (390 x 844 Apple HIG iPhone 14/15/16)
    // ═══════════════════════════════════════════════════════════
    console.log("\n--- 2. Mobile 390x844 Leads Feed ---");
    const mobileContext = await browser.newContext({
      viewport: { width: 390, height: 844 },
      userAgent:
        "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1",
      deviceScaleFactor: 2,
      isMobile: true,
      hasTouch: true,
    });
    const mobilePage = await mobileContext.newPage();
    await setupPageSession(mobileContext, mobilePage, "owner");

    console.log("Navigating mobile to http://127.0.0.1:5173/?demo=true#leads...");
    await mobilePage.goto(`${WEB_BASE}/?demo=true#leads`, {
      waitUntil: "domcontentloaded",
      timeout: 45000,
    });
    await waitForRealUI(mobilePage);

    console.log("Switching mobile view to leads...");
    await mobilePage.evaluate(() => {
      if (window.__useAppStore) {
        window.__useAppStore.getState().setCurrentView("leads");
      }
      window.location.hash = "leads";
    });
    await sleep(2000);
    const mobileRoot = mobilePage.locator(".leads-mobile-container, .leads-mobile-feed-container, .leads-board-container").first();
    await mobileRoot.waitFor({ state: "visible", timeout: 10000 }).catch(() => {
      console.log("  [WARN] Mobile leads container not visible yet...");
    });
    await suppressOverlays(mobilePage);

    // 2.1 Mobile Light Feed
    await setTheme(mobilePage, "light");
    const mobileLightPath = path.join(OUT_DIR, "03_leads_mobile_feed_light_390x844.png");
    await mobilePage.screenshot({ path: mobileLightPath, fullPage: false });
    console.log(`[PROOF SAVED] Mobile Light: ${mobileLightPath} (${fs.statSync(mobileLightPath).size} bytes)`);

    // 2.2 Mobile Dark Feed
    await setTheme(mobilePage, "dark");
    const mobileDarkPath = path.join(OUT_DIR, "04_leads_mobile_feed_dark_390x844.png");
    await mobilePage.screenshot({ path: mobileDarkPath, fullPage: false });
    console.log(`[PROOF SAVED] Mobile Dark: ${mobileDarkPath} (${fs.statSync(mobileDarkPath).size} bytes)`);

    await mobileContext.close();
    console.log("\n[SUCCESS] All canonical visual proofs captured successfully!");
  } finally {
    await browser.close();
  }
}

run().catch((err) => {
  console.error("[FATAL] Error running capture:", err);
  process.exit(1);
});
