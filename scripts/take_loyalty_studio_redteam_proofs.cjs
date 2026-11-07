/**
 * scripts/take_loyalty_studio_redteam_proofs.cjs
 *
 * Canonical Red Team 4-State Proofs for Loyalty Studio & Family Balance SSOT
 * Captured directly in the LIVE APP tree at http://127.0.0.1:5173/?demo=true#loyalty
 *
 * Governed by:
 * - Mandate 8d, 8ze, 8am: 4-State Proof (PC Light/Dark 1440x900, Mobile Light/Dark 390x844)
 * - Mandate 8k: Honest Empty State for family balance
 * - Apple HIG: 390x844 Touch target, 0px horizontal scroll, single primary CTA #0d9488
 */

const { chromium } = require("playwright");
const fs = require("node:fs");
const path = require("node:path");

const BASE_URL = process.env.VITE_URL || "http://127.0.0.1:5173";
const TARGET_DIR = path.join(__dirname, "../docs/proofs/loyalty");

if (!fs.existsSync(TARGET_DIR)) {
  fs.mkdirSync(TARGET_DIR, { recursive: true });
}

function assertProofSize(filePath) {
  const size = fs.statSync(filePath).size;
  if (size < 20480) {
    throw new Error(`[BLANK PROOF DETECTED] ${filePath} is ${size} bytes (< 20KB)!`);
  }
  return size;
}

async function saveProof(page, filename) {
  const targetFile = path.join(TARGET_DIR, filename);
  await page.screenshot({ path: targetFile });
  const size = assertProofSize(targetFile);
  console.log(`[PROOF SAVED] ${filename} -> ${targetFile} (${size} bytes)`);
}

const STORAGE_INIT = () => {
  localStorage.setItem("dente_clinic_token", "demo-clinic-token-2026");
  localStorage.setItem("dente_staff_token", "demo-staff-token-2026");
  localStorage.setItem("dente_active_session_token", "demo-staff-token-2026");
  localStorage.setItem("dente_active_user_id", "usr-admin-01");
  localStorage.setItem("dente_active_role", "administrator");
  localStorage.setItem("dente_selected_workspace_role", "administrator");
  localStorage.setItem("dente_organization_id", "demo-org-1");
  localStorage.setItem("dente_user_id", "usr-admin-01");
  localStorage.setItem("dente_user_name", "Администратор Иванова Е. С.");
  localStorage.setItem("dente_user_role", "administrator");
  localStorage.setItem("dente_role", "administrator");
  localStorage.setItem("dente_perspective", "reception");
  localStorage.setItem("dente_demo_showcase", "true");
  localStorage.setItem("dente_demo_mode", "true");
  localStorage.setItem("dente_active_mode", "clinic");
  localStorage.setItem("dente_demo_banner_dismissed", "true");
  localStorage.setItem("dente_offline_mode", "true");
  localStorage.setItem("dente_offline_readiness_banner_dismissed_v1", "true");
  localStorage.setItem("dental-crm:onboarding:v1", JSON.stringify({ dismissed: true, step: "done" }));
  localStorage.setItem("dente_onboarding_completed", "true");
  localStorage.setItem("dente_tour_completed", "true");
  localStorage.setItem("dente_tour_dismissed", "true");
  localStorage.setItem("dente_guide_tour_dismissed_v2", "true");
  sessionStorage.setItem("dente_unlocked", "true");
  sessionStorage.setItem("dente:sw-controller-reload", "1");
};

async function setLightTheme(page) {
  await page.evaluate(() => {
    document.documentElement.setAttribute("data-theme", "light");
    document.body.setAttribute("data-theme", "light");
    document.documentElement.classList.remove("dark");
    document.documentElement.classList.add("light");
    document.body.classList.remove("dark");
    document.body.classList.add("light");
    localStorage.setItem("dente_theme", "light");
    document.documentElement.style.colorScheme = "light";
  });
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
    localStorage.setItem("dente_theme", "dark");
    document.documentElement.style.colorScheme = "dark";
  });
  await page.waitForTimeout(400);
}

async function main() {
  console.log("=== Launching Live App for Loyalty Studio 4-State Proofs ===");
  console.log(`Live App URL: ${BASE_URL}/?demo=true#loyalty`);

  const browser = await chromium.launch({
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-gpu"],
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

    console.log("Navigating to live app at http://127.0.0.1:5173/?demo=true#loyalty ...");
    await pcPage.goto(`${BASE_URL}/?demo=true#loyalty`, {
      waitUntil: "commit",
      timeout: 30000,
    });

    console.log("Waiting for React hydration...");
    let mounted = false;
    for (let i = 0; i < 60; i++) {
      await pcPage.waitForTimeout(500);
      const txt = await pcPage.evaluate(() => (document.body ? document.body.innerText : ""));
      if (txt && !txt.includes("Загрузка системы") && txt.length > 50) {
        mounted = true;
        break;
      }
    }
    if (!mounted) throw new Error("Application failed to hydrate within 30 seconds!");

    console.log("Triggering open loyalty event...");
    await pcPage.evaluate(() => {
      const modal = document.querySelector(".loyalty-modal-container");
      if (!modal) {
        window.dispatchEvent(new CustomEvent("dente-open-loyalty"));
        window.dispatchEvent(new CustomEvent("dente:open-loyalty"));
        window.location.hash = "loyalty";
        window.dispatchEvent(new HashChangeEvent("hashchange"));
      }
    });

    await pcPage.waitForSelector(".loyalty-modal-container", { state: "visible", timeout: 15000 });
    console.log("-> Loyalty modal visible and active!");

    // Убираем оверлеи туров и тостов
    await pcPage.evaluate(() => {
      const s = document.createElement("style");
      s.innerHTML = ".tour-spotlight-root, [data-testid='guided-tour-spotlight-overlay'], .global-toast-container { display: none !important; }";
      document.head.appendChild(s);
    });

    // 1.1 PC Light (1440x900)
    console.log("Capturing 01_loyalty_studio_pc_light_1440x900.png...");
    await setLightTheme(pcPage);
    await saveProof(pcPage, "01_loyalty_studio_pc_light_1440x900.png");

    // 1.2 PC Dark (1440x900)
    console.log("Capturing 02_loyalty_studio_pc_dark_1440x900.png...");
    await setDarkTheme(pcPage);
    await saveProof(pcPage, "02_loyalty_studio_pc_dark_1440x900.png");

    // ═══════════════════════════════════════════════════════════
    // 2. MOBILE CONTEXT (390 x 844) Apple HIG
    // ═══════════════════════════════════════════════════════════
    console.log("\n--- 2. Mobile 390x844 Live App Proofs ---");
    const mobileContext = await browser.newContext({
      viewport: { width: 390, height: 844 },
      deviceScaleFactor: 2,
      isMobile: true,
      hasTouch: true,
    });
    const mobilePage = await mobileContext.newPage();
    await mobilePage.addInitScript(STORAGE_INIT);

    await mobilePage.goto(`${BASE_URL}/?demo=true#loyalty`, {
      waitUntil: "commit",
      timeout: 30000,
    });

    for (let i = 0; i < 60; i++) {
      await mobilePage.waitForTimeout(500);
      const txt = await mobilePage.evaluate(() => (document.body ? document.body.innerText : ""));
      if (txt && !txt.includes("Загрузка системы") && txt.length > 50) break;
    }

    await mobilePage.evaluate(() => {
      window.dispatchEvent(new CustomEvent("dente-open-loyalty"));
      window.dispatchEvent(new CustomEvent("dente:open-loyalty"));
    });
    await mobilePage.waitForSelector(".loyalty-modal-container", { state: "visible", timeout: 15000 });

    await mobilePage.evaluate(() => {
      const s = document.createElement("style");
      s.innerHTML = ".tour-spotlight-root, [data-testid='guided-tour-spotlight-overlay'], .global-toast-container { display: none !important; }";
      document.head.appendChild(s);
    });

    // 2.1 Mobile Light (390x844)
    console.log("Capturing 03_loyalty_studio_mobile_light_390x844.png...");
    await setLightTheme(mobilePage);
    await saveProof(mobilePage, "03_loyalty_studio_mobile_light_390x844.png");

    // 2.2 Mobile Dark (390x844)
    console.log("Capturing 04_loyalty_studio_mobile_dark_390x844.png...");
    await setDarkTheme(mobilePage);
    await saveProof(mobilePage, "04_loyalty_studio_mobile_dark_390x844.png");

    console.log("\n✅ All 4-State Proofs captured successfully!");
  } finally {
    await browser.close();
  }
}

main().catch((err) => {
  console.error("FATAL ERROR in runner:", err);
  process.exit(1);
});
