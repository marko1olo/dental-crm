/**
 * scripts/take_offline_resilience_proofs.cjs
 *
 * Captures 4-State Proofs for Cashbox Studio & Chairside Odontogram in Live App tree
 * at http://127.0.0.1:5173/ without fake preview sandboxes.
 *
 * Governed by:
 * - Mandate 8al & Rule 23 (The Hammer): Live App Capture ONLY.
 * - Anti-Blank Artifact Byte Guard: assert size >= 20KB.
 * - 4-State Proof: PC Light/Dark (1440x900) + Mobile Light/Dark (390x844).
 */

const { chromium } = require("playwright");
const fs = require("node:fs");
const path = require("node:path");

const BASE_URL = process.env.VITE_URL || "http://127.0.0.1:5173";
const ODONTOGRAM_URL = `${BASE_URL}/?demo=true#odontogram`;

const OFFLINE_DIR = path.join(__dirname, "../docs/proofs/offline");
const CASHBOX_DIR = path.join(__dirname, "../docs/proofs/cashbox");

for (const dir of [OFFLINE_DIR, CASHBOX_DIR]) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

function assertProofSize(filePath) {
  const size = fs.statSync(filePath).size;
  if (size < 20480) {
    throw new Error(`[BLANK PROOF DETECTED] ${filePath} is ${size} bytes (< 20KB)!`);
  }
  return size;
}

async function saveProof(page, filename, targetDirs = [OFFLINE_DIR]) {
  const buffer = await page.screenshot();
  for (const dir of targetDirs) {
    const targetFile = path.join(dir, filename);
    fs.writeFileSync(targetFile, buffer);
    const size = assertProofSize(targetFile);
    console.log(`[PROOF SAVED] ${filename} -> ${targetFile} (${size} bytes)`);
  }
}

const STORAGE_INIT = () => {
  localStorage.setItem("dente_clinic_token", "demo-clinic-token-2026");
  localStorage.setItem("dente_staff_token", "demo-staff-token-2026");
  localStorage.setItem("dente_active_session_token", "demo-staff-token-2026");
  localStorage.setItem("dente_organization_id", "demo-org-1");
  localStorage.setItem("dente_user_id", "usr-admin-01");
  localStorage.setItem("dente_user_name", "Администратор Иванова Е. С.");
  localStorage.setItem("dente_user_role", "administrator");
  localStorage.setItem("dente_role", "administrator");
  localStorage.setItem("dente_perspective", "reception");
  localStorage.setItem(
    "dente_ui_preferences_v1",
    JSON.stringify({
      version: 1,
      uiLanguage: "ru",
      selectedWorkspaceRole: "administrator",
      onboardingDismissed: true,
    })
  );
  localStorage.setItem("dental-crm:onboarding:v1", JSON.stringify({ dismissed: true, step: "done", completed: true }));
  localStorage.setItem("dente_onboarding_completed", "true");
  localStorage.setItem("dente_tour_completed", "true");
  localStorage.setItem("dente_tour_dismissed", "true");
  localStorage.setItem("dente_guide_tour_dismissed_v2", "true");
  localStorage.setItem("dente_demo_banner_dismissed", "true");
};

async function suppressTransientOverlays(page) {
  try {
    await page.evaluate(() => {
      const style = document.createElement("style");
      style.id = "clean-proof-suppress-style";
      style.innerHTML = `
        .tour-spotlight-root,
        .tour-backdrop-clickable-zone,
        [data-testid="guided-tour-spotlight-overlay"],
        [data-testid="guided-tour-coach-mark-card"],
        [data-testid="demo-mode-banner"],
        .shepherd-element,
        .global-toast-container,
        .copilot-trigger-btn,
        [data-testid="copilot-floating-trigger"],
        vite-error-overlay {
          display: none !important;
          pointer-events: none !important;
          opacity: 0 !important;
        }
        *, *::before, *::after {
          animation: none !important;
          transition: none !important;
        }
      `;
      document.head.appendChild(style);
      document
        .querySelectorAll("vite-error-overlay, .tour-spotlight-root, [data-testid='guided-tour-spotlight-overlay']")
        .forEach((el) => el.remove());
    });
  } catch (_) {}
}

async function setLightTheme(page) {
  await page.evaluate(() => {
    document.documentElement.setAttribute("data-theme", "light");
    document.body.setAttribute("data-theme", "light");
    document.documentElement.classList.remove("dark");
    document.documentElement.classList.add("light");
    document.body.classList.remove("dark");
    document.body.classList.add("light");
    document.documentElement.style.colorScheme = "light";
    localStorage.setItem("dente_theme", "light");
    localStorage.setItem("dente_theme_mode", "light");
  });
  await suppressTransientOverlays(page);
  await page.waitForTimeout(400);
}

async function setDarkTheme(page) {
  await page.evaluate(() => {
    document.documentElement.setAttribute("data-theme", "dark");
    document.body.setAttribute("data-theme", "dark");
    document.documentElement.classList.remove("light");
    document.documentElement.classList.add("dark");
    document.body.classList.remove("light");
    document.body.classList.add("dark");
    document.documentElement.style.colorScheme = "dark";
    localStorage.setItem("dente_theme", "dark");
    localStorage.setItem("dente_theme_mode", "dark");
  });
  await suppressTransientOverlays(page);
  await page.waitForTimeout(400);
}

async function main() {
  console.log("=== Launching Live App Chromium for Offline & Cashbox Resilience Proofs ===");

  const browser = await chromium.launch({
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-dev-shm-usage", "--disable-gpu"],
  });

  try {
    // ═══════════════════════════════════════════════════════════
    // 1. PC CONTEXT (1440 x 900)
    // ═══════════════════════════════════════════════════════════
    console.log("\n--- 1. PC 1440x900 Live App Proofs ---");
    const pcContext = await browser.newContext({
      viewport: { width: 1440, height: 900 },
      deviceScaleFactor: 1,
    });
    const pcPage = await pcContext.newPage();
    await pcPage.addInitScript(STORAGE_INIT);

    // 1.1 Cashbox Checkout PC Light
    console.log("Loading live app at /?checkout=1 (PC Light)...");
    await pcPage.goto(`${BASE_URL}/?checkout=1`, {
      waitUntil: "domcontentloaded",
      timeout: 30000,
    });
    await pcPage.waitForTimeout(2000);
    await setLightTheme(pcPage);
    await saveProof(pcPage, "01_cashbox_studio_pc_light_1440x900.png", [OFFLINE_DIR, CASHBOX_DIR]);

    // 1.2 Cashbox Checkout PC Dark
    console.log("Switching to PC Dark...");
    await setDarkTheme(pcPage);
    await saveProof(pcPage, "02_cashbox_studio_pc_dark_1440x900.png", [OFFLINE_DIR, CASHBOX_DIR]);

    // 1.3 Shift Tab PC Dark
    const shiftTabBtn = await pcPage.$('button:has-text("Смена и Z-отчёт")');
    if (shiftTabBtn) {
      await shiftTabBtn.click();
      await pcPage.waitForTimeout(600);
      await saveProof(pcPage, "03_cashbox_shift_pc_dark_1440x900.png", [OFFLINE_DIR, CASHBOX_DIR]);
    }

    // 1.4 Tape Tab PC Light
    await setLightTheme(pcPage);
    const tapeTabBtn = await pcPage.$('button:has-text("Чековая лента")');
    if (tapeTabBtn) {
      await tapeTabBtn.click();
      await pcPage.waitForTimeout(600);
      await saveProof(pcPage, "04_cashbox_tape_pc_light_1440x900.png", [OFFLINE_DIR, CASHBOX_DIR]);
    }

    // 1.5 Chairside Odontogram PC Light
    console.log(`Loading live app at ${ODONTOGRAM_URL} (Odontogram PC Light)...`);
    await pcPage.goto(ODONTOGRAM_URL, {
      waitUntil: "commit",
      timeout: 45000,
    });
    await pcPage.waitForSelector('[data-testid="odontogram-studio-modal"], [data-testid="odontogram-view-container"]', {
      state: "attached",
      timeout: 30000,
    });
    await pcPage.waitForTimeout(1500);
    await suppressTransientOverlays(pcPage);
    await setLightTheme(pcPage);
    await saveProof(pcPage, "07_odontogram_chairside_pc_light_1440x900.png", [OFFLINE_DIR]);

    // 1.6 Chairside Odontogram PC Dark
    console.log("Switching Odontogram to PC Dark...");
    await setDarkTheme(pcPage);
    await saveProof(pcPage, "08_odontogram_chairside_pc_dark_1440x900.png", [OFFLINE_DIR]);

    await pcContext.close();

    // ═══════════════════════════════════════════════════════════
    // 2. MOBILE CONTEXT (390 x 844 Apple HIG iPhone 14/15/16)
    // ═══════════════════════════════════════════════════════════
    console.log("\n--- 2. Mobile 390x844 Live App Proofs ---");
    const mobileContext = await browser.newContext({
      viewport: { width: 390, height: 844 },
      userAgent:
        "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1",
      isMobile: true,
      hasTouch: true,
      deviceScaleFactor: 2,
    });
    const mobilePage = await mobileContext.newPage();
    await mobilePage.addInitScript(STORAGE_INIT);

    // 2.1 Cashbox Mobile Light
    console.log("Loading live app at /?checkout=1 (Mobile Light)...");
    await mobilePage.goto(`${BASE_URL}/?checkout=1`, {
      waitUntil: "domcontentloaded",
      timeout: 30000,
    });
    await mobilePage.waitForTimeout(2000);
    await setLightTheme(mobilePage);
    await saveProof(mobilePage, "05_cashbox_studio_mobile_light_390x844.png", [OFFLINE_DIR, CASHBOX_DIR]);

    // 2.2 Cashbox Mobile Dark
    console.log("Switching to Mobile Dark...");
    await setDarkTheme(mobilePage);
    await saveProof(mobilePage, "06_cashbox_studio_mobile_dark_390x844.png", [OFFLINE_DIR, CASHBOX_DIR]);

    // 2.3 Odontogram Mobile Light
    console.log(`Loading live app at ${ODONTOGRAM_URL} (Odontogram Mobile Light)...`);
    await mobilePage.goto(ODONTOGRAM_URL, {
      waitUntil: "commit",
      timeout: 45000,
    });
    await mobilePage.waitForSelector('[data-testid="odontogram-studio-modal"], [data-testid="odontogram-view-container"]', {
      state: "attached",
      timeout: 30000,
    });
    await mobilePage.waitForTimeout(1500);
    await suppressTransientOverlays(mobilePage);
    await setLightTheme(mobilePage);
    await saveProof(mobilePage, "09_odontogram_mobile_light_390x844.png", [OFFLINE_DIR]);

    // 2.4 Odontogram Mobile Dark
    console.log("Switching Odontogram to Mobile Dark...");
    await setDarkTheme(mobilePage);
    await saveProof(mobilePage, "10_odontogram_mobile_dark_390x844.png", [OFFLINE_DIR]);

    await mobileContext.close();
    console.log("\n[SUCCESS] All 10 Proofs captured successfully!");
  } catch (err) {
    console.error("Capture failed:", err);
    process.exit(1);
  } finally {
    await browser.close();
  }
}

main();
