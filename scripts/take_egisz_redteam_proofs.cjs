/**
 * scripts/take_egisz_redteam_proofs.cjs
 *
 * Canonical Red Team 4-State Proofs for EGISZ REMD Journal & Compliance Hub
 * Captured directly in the LIVE APP tree at http://127.0.0.1:5173/?egisz=1&demo=true
 *
 * Governed by:
 * - Mandate 8al (4-State Proof: PC Light/Dark 1440x900, Mobile Light/Dark 390x844)
 * - Anti-Blank Byte Guard >= 20KB
 * - Mandate 8e: Doctor Autonomy & Quiet Backoffice (8v)
 */

const { chromium } = require("playwright");
const fs = require("node:fs");
const path = require("node:path");

const BASE_URL = process.env.VITE_URL || "http://127.0.0.1:5173";

const TARGET_DIR = path.join(__dirname, "../docs/proofs/egisz");
if (!fs.existsSync(TARGET_DIR)) fs.mkdirSync(TARGET_DIR, { recursive: true });

function assertProofSize(filePath) {
  const size = fs.statSync(filePath).size;
  if (size < 20480) {
    throw new Error(`[BLANK PROOF DETECTED] ${filePath} is ${size} bytes (< 20KB)!`);
  }
  return size;
}

async function saveProof(page, filenames) {
  const buffer = await page.screenshot();
  const list = Array.isArray(filenames) ? filenames : [filenames];
  for (const filename of list) {
    const targetFile = path.join(TARGET_DIR, filename);
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
  localStorage.setItem("dente_user_id", "usr-doctor-01");
  localStorage.setItem("dente_user_name", "Д-р Смирнова Елена Викторовна");
  localStorage.setItem("dente_user_role", "doctor");
  localStorage.setItem("dente_role", "doctor");
  localStorage.setItem("dente_perspective", "doctor");
  localStorage.setItem("dente_demo_showcase", "true");
  localStorage.setItem("dente_demo_mode", "true");
  localStorage.setItem("dente_demo_banner_dismissed", "true");
  localStorage.setItem("dente_offline_mode", "true");
  localStorage.setItem("dente_offline_readiness_banner_dismissed_v1", "true");
  localStorage.setItem("dente_ui_preferences_v1", JSON.stringify({
    version: 1,
    uiLanguage: "ru",
    selectedWorkspaceRole: "doctor",
    onboardingDismissed: true,
  }));
  localStorage.setItem("dental-crm:onboarding:v1", JSON.stringify({ dismissed: true, step: "done" }));
  localStorage.setItem("dente_onboarding_completed", "true");
  localStorage.setItem("dente_tour_completed", "true");
  localStorage.setItem("dente_guide_tour_dismissed_v2", "true");
};

async function setLightTheme(page) {
  await page.evaluate(() => {
    document.documentElement.setAttribute("data-theme", "light");
    document.body.setAttribute("data-theme", "light");
    document.documentElement.classList.remove("dark");
    document.documentElement.classList.add("light");
    document.body.classList.remove("dark");
    document.body.classList.add("light");
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
    document.documentElement.style.colorScheme = "dark";
  });
  await page.waitForTimeout(400);
}

async function main() {
  console.log("=== Launching Live App Chromium for EGISZ REMD Journal 4-State Proofs ===");
  console.log(`Live App URL: ${BASE_URL}/?egisz=1&demo=true`);

  const browser = await chromium.launch({
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
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

    console.log("Loading live app at /?egisz=1&demo=true (PC Light)...");
    await pcPage.goto(`${BASE_URL}/?egisz=1&demo=true`, {
      waitUntil: "commit",
      timeout: 30000,
    });
    console.log("Waiting for React hydration (.boot-state detachment)...");
    await pcPage.waitForSelector(".boot-state", { state: "detached", timeout: 60000 }).catch(() => {});
    await pcPage.waitForSelector(".egisz-modal-container, .egisz-modal-backdrop, .egisz-remd-shell, [data-testid='egisz-hub-modal']", { timeout: 60000 });
    await pcPage.waitForTimeout(1000);

    // Переключаемся на вкладку «Журнал отправки»
    const journalTab = await pcPage.$('.egisz-tab-btn:has-text("Журнал"), button:has-text("Журнал отправки")');
    if (journalTab) {
      console.log("Clicking 'Журнал отправки' tab...");
      await journalTab.click();
      await pcPage.waitForTimeout(800);
    }

    // 1.1 PC Light
    await setLightTheme(pcPage);
    await saveProof(pcPage, ["01_egisz_journal_pc_light_1440x900.png", "egisz_remd_journal_pc_light_1440x900.png"]);

    // 1.2 PC Dark
    console.log("Switching to PC Dark...");
    await setDarkTheme(pcPage);
    await saveProof(pcPage, ["02_egisz_journal_pc_dark_1440x900.png", "egisz_remd_journal_pc_dark_1440x900.png"]);

    // ═══════════════════════════════════════════════════════════
    // 2. MOBILE (390 x 844, Apple HIG)
    // ═══════════════════════════════════════════════════════════
    console.log("\n--- 2. Mobile 390x844 Apple HIG Proofs (Smooth Viewport Transition) ---");
    await pcPage.setViewportSize({ width: 390, height: 844 });
    await pcPage.waitForTimeout(800);

    // 2.1 Mobile Dark (currently in dark theme)
    console.log("Saving Mobile Dark...");
    await saveProof(pcPage, ["04_egisz_journal_mobile_dark_390x844.png", "egisz_remd_journal_mobile_dark_390x844.png"]);

    // 2.2 Mobile Light
    console.log("Switching to Mobile Light...");
    await setLightTheme(pcPage);
    await saveProof(pcPage, ["03_egisz_journal_mobile_light_390x844.png", "egisz_remd_journal_mobile_light_390x844.png"]);

    await pcContext.close();

    console.log("\n=======================================================");
    console.log("✓ ALL EGISZ REMD JOURNAL 4-STATE PROOFS SAVED SUCCESSFULLY!");
    console.log("=======================================================");
  } finally {
    await browser.close();
  }
}

main().catch((err) => {
  console.error("[FATAL ERROR]:", err);
  process.exit(1);
});
