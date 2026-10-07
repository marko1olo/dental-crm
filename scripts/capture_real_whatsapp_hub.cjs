/**
 * scripts/capture_real_whatsapp_hub.cjs
 * RED TEAM VISUAL PROOF: Live end-to-end screenshot capture of WhatsappIntegrationHub.
 * Full stack: Fastify (4100), PostgreSQL (5432), Vite Frontend (5173).
 * Captures 4 states:
 * 1. PC Light (1440x900)
 * 2. PC Dark (1440x900)
 * 3. Mobile Light (390x844)
 * 4. Mobile Dark (390x844)
 */

const { chromium } = require("playwright");
const path = require("node:path");
const fs = require("node:fs");

const BRAIN_DIR = "C:/Users/Admin/.gemini/antigravity/brain/cf3249a2-8f15-45eb-a1a3-e97cd85fd126";
const LOCAL_DIR = path.resolve(__dirname, "../apps/web/public/screenshots/whatsapp_hub");
const API_BASE = "http://127.0.0.1:4100";
const WEB_BASE = "http://127.0.0.1:5173";

async function provisionLiveSession() {
  const uniqueId = Date.now();
  console.log(">>> [Provisioning] Setting up authenticated session on live API (Fastify 4100)...");

  const initRes = await fetch(`${API_BASE}/api/auth/setup/init`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      clinicName: "Стоматология ДЕНТЕ Премиум",
      email: `chief-wa-${uniqueId}@dente-clinic.ru`,
      password: "Password123!",
      ownerName: "Д-р Воронов Алексей Владимирович",
      ownerPin: "1234",
    }),
  });

  if (!initRes.ok) {
    throw new Error(`Clinic setup failed: ${await initRes.text()}`);
  }
  const initData = await initRes.json();

  const unlockRes = await fetch(`${API_BASE}/api/auth/staff/unlock`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-dente-clinic-token": initData.clinicToken,
    },
    body: JSON.stringify({ userId: initData.ownerUserId, pinCode: "1234" }),
  });

  if (!unlockRes.ok) {
    throw new Error(`Staff unlock failed: ${await unlockRes.text()}`);
  }
  const unlockData = await unlockRes.json();

  return {
    clinicToken: initData.clinicToken,
    staffToken: unlockData.staffToken,
    ownerUserId: initData.ownerUserId,
  };
}

async function main() {
  fs.mkdirSync(LOCAL_DIR, { recursive: true });
  fs.mkdirSync(BRAIN_DIR, { recursive: true });

  const auth = await provisionLiveSession();

  console.log(">>> Launching Playwright Chromium...");
  const browser = await chromium.launch({
    channel: "chrome",
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });

  try {
    // ═══════════════════════════════════════════════════════════
    // 1. DESKTOP VIEWPORT (1440x900)
    // ═══════════════════════════════════════════════════════════
    console.log(">>> Creating PC Context (1440x900)...");
    const pcContext = await browser.newContext({
      viewport: { width: 1440, height: 900 },
      isMobile: false,
      hasTouch: false,
    });

    await pcContext.addInitScript(({ clinicToken, staffToken, ownerUserId }) => {
      localStorage.setItem("dente_clinic_token", clinicToken);
      localStorage.setItem("dente_staff_token", staffToken);
      localStorage.setItem("dente_active_role", "owner");
      localStorage.setItem("dente_user_id", ownerUserId);
      localStorage.setItem("dente_onboarding_completed", "true");
      localStorage.setItem("dente_tour_completed", "true");
      localStorage.setItem("dente_guide_tour_dismissed_v2", "true");
      localStorage.setItem("dente_guide_tour_seen_roles_v2", JSON.stringify(["admin", "doctor", "director"]));
      localStorage.setItem("dente_quest_progress_v2", JSON.stringify({
        isDismissedPermanently: true,
        isTourActive: false,
        tracksProgress: {
          solo_doctor: { completed: true, completedStepIds: ["schedule_overview", "odontogram_status", "visit_diary_043", "fast_cashier_54fz"] },
          reception_admin: { completed: true, completedStepIds: [] },
          imaging_diagnostics: { completed: true, completedStepIds: [] }
        }
      }));
      localStorage.setItem("dental-crm:onboarding:v1", JSON.stringify({ dismissed: true, step: "done", completed: true }));
      localStorage.setItem("dente_theme_mode", "light");
    }, auth);

    const pcPage = await pcContext.newPage();
    pcPage.on("pageerror", (err) => console.error("[PC PageError]:", err.message));

    console.log(">>> Navigating to #settings/telegram...");
    await pcPage.goto(`${WEB_BASE}/#settings/telegram`, { waitUntil: "domcontentloaded", timeout: 60000 });
    await pcPage.waitForSelector(".boot-state", { state: "detached", timeout: 60000 }).catch(() => {});
    await pcPage.waitForSelector(".app-shell", { state: "visible", timeout: 30000 });
    await pcPage.waitForTimeout(1000);

    const closeBtnPc = await pcPage.$('.onboarding-head-close-btn');
    if (closeBtnPc) {
      console.log(">>> Dismissing onboarding overlay on PC...");
      await closeBtnPc.click();
      await pcPage.waitForSelector('.onboarding-overlay', { state: 'detached', timeout: 5000 }).catch(() => {});
      await pcPage.waitForTimeout(500);
    }

    await pcPage.waitForSelector(".messengers-settings", { state: "visible", timeout: 30000 });

    console.log(">>> Clicking WhatsApp tab (#messenger-tab-whatsapp)...");
    const waTab = await pcPage.waitForSelector("#messenger-tab-whatsapp", { state: "visible", timeout: 15000 });
    await waTab.click();

    console.log(">>> Waiting for WhatsApp integration hub / settings panel...");
    await pcPage.waitForSelector("#messenger-panel-whatsapp", { state: "visible", timeout: 15000 });
    await pcPage.waitForSelector(".whatsapp-panel", { state: "visible", timeout: 15000 });

    console.log(">>> Selecting QR Gateway mode ([data-testid=\"wa-mode-qr-btn\"])...");
    const qrModeBtn = await pcPage.waitForSelector('[data-testid="wa-mode-qr-btn"]', { state: "visible", timeout: 10000 });
    await qrModeBtn.click();
    await pcPage.waitForSelector('[data-testid="qr-gateway-card"]', { state: "visible", timeout: 10000 });
    await pcPage.waitForTimeout(1500);

    // ─── 1. CAPTURE PC LIGHT ───
    console.log(">>> Capturing whatsapp_hub_pc_light.png...");
    await pcPage.evaluate(() => {
      document.documentElement.setAttribute("data-theme", "light");
      document.documentElement.classList.remove("dark");
      document.documentElement.classList.add("light");
    });
    await pcPage.waitForTimeout(600);
    await pcPage.mouse.move(0, 0);

    const pcLightPath = path.join(LOCAL_DIR, "whatsapp_hub_pc_light.png");
    const pcLightBrain = path.join(BRAIN_DIR, "whatsapp_hub_pc_light.png");
    await pcPage.screenshot({ path: pcLightPath, fullPage: false });
    fs.copyFileSync(pcLightPath, pcLightBrain);
    console.log(`>>> Captured PC Light: ${pcLightPath} (${fs.statSync(pcLightPath).size} bytes)`);

    // ─── 2. CAPTURE PC DARK ───
    console.log(">>> Capturing whatsapp_hub_pc_dark.png...");
    await pcPage.evaluate(() => {
      document.documentElement.setAttribute("data-theme", "dark");
      document.documentElement.classList.remove("light");
      document.documentElement.classList.add("dark");
    });
    await pcPage.waitForTimeout(600);
    await pcPage.mouse.move(0, 0);

    const pcDarkPath = path.join(LOCAL_DIR, "whatsapp_hub_pc_dark.png");
    const pcDarkBrain = path.join(BRAIN_DIR, "whatsapp_hub_pc_dark.png");
    await pcPage.screenshot({ path: pcDarkPath, fullPage: false });
    fs.copyFileSync(pcDarkPath, pcDarkBrain);
    console.log(`>>> Captured PC Dark: ${pcDarkPath} (${fs.statSync(pcDarkPath).size} bytes)`);

    await pcContext.close();

    // ═══════════════════════════════════════════════════════════
    // 2. MOBILE VIEWPORT (390x844 - iPhone 12/13/14)
    // ═══════════════════════════════════════════════════════════
    console.log(">>> Creating Mobile Context (390x844)...");
    const mobileContext = await browser.newContext({
      viewport: { width: 390, height: 844 },
      isMobile: true,
      hasTouch: true,
    });

    await mobileContext.addInitScript(({ clinicToken, staffToken, ownerUserId }) => {
      localStorage.setItem("dente_clinic_token", clinicToken);
      localStorage.setItem("dente_staff_token", staffToken);
      localStorage.setItem("dente_active_role", "owner");
      localStorage.setItem("dente_user_id", ownerUserId);
      localStorage.setItem("dente_onboarding_completed", "true");
      localStorage.setItem("dente_tour_completed", "true");
      localStorage.setItem("dente_guide_tour_dismissed_v2", "true");
      localStorage.setItem("dente_guide_tour_seen_roles_v2", JSON.stringify(["admin", "doctor", "director"]));
      localStorage.setItem("dente_quest_progress_v2", JSON.stringify({
        isDismissedPermanently: true,
        isTourActive: false,
        tracksProgress: {
          solo_doctor: { completed: true, completedStepIds: ["schedule_overview", "odontogram_status", "visit_diary_043", "fast_cashier_54fz"] },
          reception_admin: { completed: true, completedStepIds: [] },
          imaging_diagnostics: { completed: true, completedStepIds: [] }
        }
      }));
      localStorage.setItem("dental-crm:onboarding:v1", JSON.stringify({ dismissed: true, step: "done", completed: true }));
      localStorage.setItem("dente_theme_mode", "light");
    }, auth);

    const mobilePage = await mobileContext.newPage();
    mobilePage.on("pageerror", (err) => console.error("[Mobile PageError]:", err.message));

    console.log(">>> Navigating to #settings on Mobile...");
    await mobilePage.goto(`${WEB_BASE}/#settings`, { waitUntil: "domcontentloaded", timeout: 60000 });
    await mobilePage.waitForSelector(".boot-state", { state: "detached", timeout: 60000 }).catch(() => {});
    await mobilePage.waitForSelector(".app-shell", { state: "visible", timeout: 30000 });
    await mobilePage.waitForTimeout(1000);

    const closeBtnMobile = await mobilePage.$('.onboarding-head-close-btn');
    if (closeBtnMobile) {
      console.log(">>> Dismissing onboarding overlay on Mobile...");
      await closeBtnMobile.click();
      await mobilePage.waitForSelector('.onboarding-overlay', { state: 'detached', timeout: 5000 }).catch(() => {});
      await mobilePage.waitForTimeout(500);
    }

    await mobilePage.evaluate(() => {
      document.querySelectorAll('.onboarding-overlay').forEach(el => el.remove());
    });
    await mobilePage.waitForTimeout(300);

    console.log(">>> Clicking Mobile Settings Messengers Row ([data-testid=\"mobile-settings-row-messengers\"])...");
    const messengersRow = await mobilePage.waitForSelector('[data-testid="mobile-settings-row-messengers"]', { state: "visible", timeout: 20000 });
    await messengersRow.click();

    console.log(">>> Waiting for .messengers-settings on Mobile...");
    await mobilePage.waitForSelector(".messengers-settings", { state: "visible", timeout: 30000 });

    console.log(">>> Clicking WhatsApp tab on Mobile (#messenger-tab-whatsapp)...");
    const mobileWaTab = await mobilePage.waitForSelector("#messenger-tab-whatsapp", { state: "visible", timeout: 15000 });
    await mobileWaTab.click();

    console.log(">>> Waiting for WhatsApp integration hub on Mobile...");
    await mobilePage.waitForSelector("#messenger-panel-whatsapp", { state: "visible", timeout: 15000 });
    await mobilePage.waitForSelector(".whatsapp-panel", { state: "visible", timeout: 15000 });

    console.log(">>> Selecting QR Gateway mode on Mobile ([data-testid=\"wa-mode-qr-btn\"])...");
    const mobileQrModeBtn = await mobilePage.waitForSelector('[data-testid="wa-mode-qr-btn"]', { state: "visible", timeout: 10000 });
    await mobileQrModeBtn.click();
    await mobilePage.waitForSelector('[data-testid="qr-gateway-card"]', { state: "visible", timeout: 10000 });
    await mobilePage.waitForTimeout(1500);

    // ─── 3. CAPTURE MOBILE LIGHT ───
    console.log(">>> Capturing whatsapp_hub_mobile_light.png...");
    await mobilePage.evaluate(() => {
      document.documentElement.setAttribute("data-theme", "light");
      document.documentElement.classList.remove("dark");
      document.documentElement.classList.add("light");
      document.querySelectorAll('.onboarding-overlay, .driver-overlay, .tour-overlay, .toast-container, .global-toast, [data-testid="interactive-tour-invite-banner"], aside[aria-label="Приглашение в обучающий тур"], [class*="tour-banner"], [class*="toast-"]').forEach(el => el.remove());
      const card = document.querySelector('[data-testid="qr-gateway-card"]');
      if (card) card.scrollIntoView({ block: "center", inline: "nearest" });
    });
    await mobilePage.waitForTimeout(600);

    const mobileLightPath = path.join(LOCAL_DIR, "whatsapp_hub_mobile_light.png");
    const mobileLightBrain = path.join(BRAIN_DIR, "whatsapp_hub_mobile_light.png");
    await mobilePage.screenshot({ path: mobileLightPath, fullPage: false });
    fs.copyFileSync(mobileLightPath, mobileLightBrain);
    console.log(`>>> Captured Mobile Light: ${mobileLightPath} (${fs.statSync(mobileLightPath).size} bytes)`);

    // ─── 4. CAPTURE MOBILE DARK ───
    console.log(">>> Capturing whatsapp_hub_mobile_dark.png...");
    await mobilePage.evaluate(() => {
      document.documentElement.setAttribute("data-theme", "dark");
      document.documentElement.classList.remove("light");
      document.documentElement.classList.add("dark");
      document.querySelectorAll('.onboarding-overlay, .driver-overlay, .tour-overlay, .toast-container, .global-toast, [data-testid="interactive-tour-invite-banner"], aside[aria-label="Приглашение в обучающий тур"], [class*="tour-banner"], [class*="toast-"]').forEach(el => el.remove());
      const card = document.querySelector('[data-testid="qr-gateway-card"]');
      if (card) card.scrollIntoView({ block: "center", inline: "nearest" });
    });
    await mobilePage.waitForTimeout(600);

    const mobileDarkPath = path.join(LOCAL_DIR, "whatsapp_hub_mobile_dark.png");
    const mobileDarkBrain = path.join(BRAIN_DIR, "whatsapp_hub_mobile_dark.png");
    await mobilePage.screenshot({ path: mobileDarkPath, fullPage: false });
    fs.copyFileSync(mobileDarkPath, mobileDarkBrain);
    console.log(`>>> Captured Mobile Dark: ${mobileDarkPath} (${fs.statSync(mobileDarkPath).size} bytes)`);

    await mobileContext.close();
    console.log(">>> ALL 4 SCREENSHOTS CAPTURED AND TRANSFERRED TO BRAIN!");
  } finally {
    await browser.close();
  }
}

main().catch((err) => {
  console.error(">>> CAPTURE ERROR:", err);
  process.exit(1);
});
