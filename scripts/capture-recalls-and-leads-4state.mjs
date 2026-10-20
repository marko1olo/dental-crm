import { mkdirSync } from "node:fs";
import { chromium } from "playwright";

const OUT_RECALLS = "C:/Clinic_MVP/dental-crm/docs/proofs/recalls";
const OUT_LEADS = "C:/Clinic_MVP/dental-crm/docs/proofs/leads";
const WEB_URL = "http://127.0.0.1:5173";

mkdirSync(OUT_RECALLS, { recursive: true });
mkdirSync(OUT_LEADS, { recursive: true });

async function initContextStorage(context, theme, nav = "recalls") {
  await context.addInitScript(
    ({ themeMode, initialNav }) => {
      window.location.reload = () => {
        console.warn("Prevented reload during capture");
      };

      const dummyUser = {
        id: "demo-owner-id",
        fullName: "Д-р Воронов М. С.",
        role: "owner",
        email: "owner@dente-demo.ru",
        organizationId: "01a00000-0000-0000-0000-000000000000",
        specialization: "Главврач / Владелец",
      };

      localStorage.setItem("dente_clinic_token", "demo-showcase-token-owner");
      localStorage.setItem("dente_staff_token", "demo-showcase-staff-token-owner");
      localStorage.setItem("dente_cached_active_staff_user", JSON.stringify(dummyUser));
      localStorage.setItem("dental-crm:active-user:v1", JSON.stringify(dummyUser));
      localStorage.setItem("dente_active_role", "owner");
      localStorage.setItem("dente_active_mode", "clinic");
      localStorage.setItem("dente_demo_showcase", "true");
      localStorage.setItem("dente_offline_autonomy_mode", "true");
      localStorage.setItem("dente_onboarding_completed", "true");
      localStorage.setItem("dente_tour_completed", "true");
      localStorage.setItem("dente_tour_dismissed", "true");
      localStorage.setItem("dente_guide_tour_dismissed_v2", "true");
      localStorage.setItem("dente_doctor_training_completed", "true");
      localStorage.setItem("dente_training_dismissed", "true");
      localStorage.setItem("dente_sidebar_collapsed", "false");
      localStorage.setItem("dente_theme_mode", themeMode);
      localStorage.setItem("dente_theme", themeMode);
      localStorage.setItem("theme", themeMode);
      localStorage.setItem("dente_last_view", initialNav);
      localStorage.setItem("dente_active_nav", initialNav);

      if (themeMode === "dark") {
        document.documentElement.classList.add("dark");
        document.documentElement.setAttribute("data-theme", "dark");
      } else {
        document.documentElement.classList.remove("dark");
        document.documentElement.setAttribute("data-theme", "light");
      }
    },
    { themeMode: theme, initialNav: nav }
  );
}

async function suppressOverlays(page) {
  await page.evaluate(() => {
    const style = document.createElement("style");
    style.id = "suppress-all-tour-overlays";
    style.innerHTML = `
      .tour-spotlight-root,
      .tour-backdrop-clickable-zone,
      [data-testid="guided-tour-spotlight-overlay"],
      [data-testid="guided-tour-coach-mark-card"],
      .shepherd-element {
        display: none !important;
        pointer-events: none !important;
        opacity: 0 !important;
      }
    `;
    document.head.appendChild(style);
  });
}

async function captureRecalls() {
  const browser = await chromium.launch({
    headless: true,
    executablePath: "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
    args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-gpu", "--disable-dev-shm-usage"],
  });
  console.log("=== CAPTURING RECALLS 4-STATE PROOFS ===");

  // 1. PC Light (1440x900)
  console.log("[Recalls 1/4] PC Light (1440x900)...");
  const ctxPcLight = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  await initContextStorage(ctxPcLight, "light", "recalls");
  const pagePcLight = await ctxPcLight.newPage();
  await pagePcLight.goto(`${WEB_URL}/?demo=true#recalls`, { waitUntil: "domcontentloaded", timeout: 25000 }).catch(() => {});
  await pagePcLight.waitForTimeout(6000);
  await suppressOverlays(pagePcLight);

  // If there's a button to open Recalls modal
  const openRecallsBtn = pagePcLight.locator('button:has-text("Профосмотры"), a[href*="recalls"], [data-testid="nav-recalls"]').first();
  if (await openRecallsBtn.isVisible().catch(() => false)) {
    await openRecallsBtn.click().catch(() => {});
    await pagePcLight.waitForTimeout(1500);
  }
  await pagePcLight.screenshot({ path: `${OUT_RECALLS}/recalls_registry_pc_light_1440x900.png` });

  // Open Cohorts tab
  const cohortsBtn = pagePcLight.locator('button:has-text("Когорты"), button:has-text("Ретеншн"), [data-testid="tab-cohorts"]').first();
  if (await cohortsBtn.isVisible().catch(() => false)) {
    await cohortsBtn.click().catch(() => {});
    await pagePcLight.waitForTimeout(1500);
    await pagePcLight.screenshot({ path: `${OUT_RECALLS}/recalls_cohorts_pc_light_1440x900.png` });
  }
  await ctxPcLight.close();

  // 2. PC Dark (1440x900)
  console.log("[Recalls 2/4] PC Dark (1440x900)...");
  const ctxPcDark = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  await initContextStorage(ctxPcDark, "dark", "recalls");
  const pagePcDark = await ctxPcDark.newPage();
  await pagePcDark.goto(`${WEB_URL}/?demo=true#recalls`, { waitUntil: "domcontentloaded", timeout: 25000 }).catch(() => {});
  await pagePcDark.waitForTimeout(6000);
  await suppressOverlays(pagePcDark);

  if (await openRecallsBtn.isVisible().catch(() => false)) {
    await openRecallsBtn.click().catch(() => {});
    await pagePcDark.waitForTimeout(1500);
  }
  await pagePcDark.screenshot({ path: `${OUT_RECALLS}/recalls_registry_pc_dark_1440x900.png` });

  const cohortsDarkBtn = pagePcDark.locator('button:has-text("Когорты"), button:has-text("Ретеншн"), [data-testid="tab-cohorts"]').first();
  if (await cohortsDarkBtn.isVisible().catch(() => false)) {
    await cohortsDarkBtn.click().catch(() => {});
    await pagePcDark.waitForTimeout(1500);
    await pagePcDark.screenshot({ path: `${OUT_RECALLS}/recalls_cohorts_pc_dark_1440x900.png` });
  }
  await ctxPcDark.close();

  // 3. Mobile Light (390x844)
  console.log("[Recalls 3/4] Mobile Light (390x844)...");
  const ctxMobLight = await browser.newContext({
    viewport: { width: 390, height: 844 },
    isMobile: true,
    hasTouch: true,
  });
  await initContextStorage(ctxMobLight, "light", "recalls");
  const pageMobLight = await ctxMobLight.newPage();
  await pageMobLight.goto(`${WEB_URL}/?demo=true#recalls`, { waitUntil: "domcontentloaded", timeout: 25000 }).catch(() => {});
  await pageMobLight.waitForTimeout(6000);
  await suppressOverlays(pageMobLight);
  await pageMobLight.screenshot({ path: `${OUT_RECALLS}/recalls_registry_mobile_light_390x844.png` });
  await ctxMobLight.close();

  // 4. Mobile Dark (390x844)
  console.log("[Recalls 4/4] Mobile Dark (390x844)...");
  const ctxMobDark = await browser.newContext({
    viewport: { width: 390, height: 844 },
    isMobile: true,
    hasTouch: true,
  });
  await initContextStorage(ctxMobDark, "dark", "recalls");
  const pageMobDark = await ctxMobDark.newPage();
  await pageMobDark.goto(`${WEB_URL}/?demo=true#recalls`, { waitUntil: "domcontentloaded", timeout: 25000 }).catch(() => {});
  await pageMobDark.waitForTimeout(6000);
  await suppressOverlays(pageMobDark);
  await pageMobDark.screenshot({ path: `${OUT_RECALLS}/recalls_registry_mobile_dark_390x844.png` });
  await ctxMobDark.close();

  await browser.close();
}

async function captureLeads() {
  const browser = await chromium.launch({
    headless: true,
    executablePath: "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
    args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-gpu", "--disable-dev-shm-usage"],
  });
  console.log("=== CAPTURING LEADS 4-STATE PROOFS ===");

  // 1. PC Light (1440x900)
  console.log("[Leads 1/4] PC Light (1440x900)...");
  const ctxPcLight = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  await initContextStorage(ctxPcLight, "light", "leads");
  const pagePcLight = await ctxPcLight.newPage();
  await pagePcLight.goto(`${WEB_URL}/?demo=true#leads`, { waitUntil: "domcontentloaded", timeout: 25000 }).catch(() => {});
  await pagePcLight.waitForTimeout(6000);
  await suppressOverlays(pagePcLight);
  await pagePcLight.screenshot({ path: `${OUT_LEADS}/leads_kanban_pc_light_1440x900.png` });

  // Open Convert Modal
  const convertTrigger = pagePcLight.locator('[data-testid*="lead-schedule-btn"], button:has-text("Записать"), button:has-text("Конвертировать")').first();
  if (await convertTrigger.isVisible().catch(() => false)) {
    await convertTrigger.click().catch(() => {});
    await pagePcLight.waitForTimeout(1500);
    await pagePcLight.screenshot({ path: `${OUT_LEADS}/leads_convert_modal_pc_light_1440x900.png` });
  }
  await ctxPcLight.close();

  // 2. PC Dark (1440x900)
  console.log("[Leads 2/4] PC Dark (1440x900)...");
  const ctxPcDark = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  await initContextStorage(ctxPcDark, "dark", "leads");
  const pagePcDark = await ctxPcDark.newPage();
  await pagePcDark.goto(`${WEB_URL}/?demo=true#leads`, { waitUntil: "domcontentloaded", timeout: 25000 }).catch(() => {});
  await pagePcDark.waitForTimeout(6000);
  await suppressOverlays(pagePcDark);
  await pagePcDark.screenshot({ path: `${OUT_LEADS}/leads_kanban_pc_dark_1440x900.png` });
  await ctxPcDark.close();

  // 3. Mobile Light (390x844)
  console.log("[Leads 3/4] Mobile Light (390x844)...");
  const ctxMobLight = await browser.newContext({
    viewport: { width: 390, height: 844 },
    isMobile: true,
    hasTouch: true,
  });
  await initContextStorage(ctxMobLight, "light", "leads");
  const pageMobLight = await ctxMobLight.newPage();
  await pageMobLight.goto(`${WEB_URL}/?demo=true#leads`, { waitUntil: "domcontentloaded", timeout: 25000 }).catch(() => {});
  await pageMobLight.waitForTimeout(6000);
  await suppressOverlays(pageMobLight);
  await pageMobLight.screenshot({ path: `${OUT_LEADS}/leads_mobile_light_390x844.png` });
  await ctxMobLight.close();

  // 4. Mobile Dark (390x844)
  console.log("[Leads 4/4] Mobile Dark (390x844)...");
  const ctxMobDark = await browser.newContext({
    viewport: { width: 390, height: 844 },
    isMobile: true,
    hasTouch: true,
  });
  await initContextStorage(ctxMobDark, "dark", "leads");
  const pageMobDark = await ctxMobDark.newPage();
  await pageMobDark.goto(`${WEB_URL}/?demo=true#leads`, { waitUntil: "domcontentloaded", timeout: 25000 }).catch(() => {});
  await pageMobDark.waitForTimeout(6000);
  await suppressOverlays(pageMobDark);
  await pageMobDark.screenshot({ path: `${OUT_LEADS}/leads_mobile_dark_390x844.png` });
  await ctxMobDark.close();

  await browser.close();
}

async function main() {
  await captureRecalls();
  await captureLeads();
  console.log("=== ALL 4-STATE VISUAL PROOFS CAPTURED SUCCESSFULLY ===");
}

main().catch((err) => {
  console.error("Error capturing proofs:", err);
  process.exit(1);
});
