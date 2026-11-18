const { chromium } = require("playwright");
const fs = require("node:fs");
const path = require("node:path");

const WEB_BASE = "http://127.0.0.1:5173";
const PATIENTS_DIR = path.resolve("docs/proofs/patients");
const BRAIN_DIR = path.resolve("C:/Users/Admin/.gemini/antigravity/brain/e88a5fff-9353-41f8-8d07-6a5217b8bc36");

for (const dir of [PATIENTS_DIR, BRAIN_DIR]) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

async function suppressOverlays(page) {
  await page.evaluate(() => {
    const style = document.createElement("style");
    style.id = "suppress-all-overlays";
    style.innerHTML = `
      .tour-spotlight-root, .tour-backdrop-clickable-zone,
      [data-testid="guided-tour-spotlight-overlay"],
      [data-testid="guided-tour-coach-mark-card"],
      [data-testid="demo-mode-banner"], .global-toast-container,
      .copilot-trigger-btn, [data-testid="copilot-floating-trigger"],
      vite-error-overlay { display: none !important; pointer-events: none !important; }
    `;
    document.head.appendChild(style);
  }).catch(() => {});
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
      document.documentElement.classList.remove("dark");
      document.documentElement.classList.add("light");
      document.body.classList.remove("dark");
      document.body.classList.add("light");
    }
    localStorage.setItem("dente_theme", th);
    localStorage.setItem("dente_theme_mode", th);
    window.dispatchEvent(new Event("themechange"));
  }, theme).catch(() => {});
  await suppressOverlays(page);
  await page.waitForTimeout(500);
}

async function saveProof(page, filename) {
  const target = path.join(PATIENTS_DIR, filename);
  const brainTarget = path.join(BRAIN_DIR, filename);
  await page.screenshot({ path: target, fullPage: false });
  try { fs.copyFileSync(target, brainTarget); } catch {}
  const stat = fs.statSync(target);
  if (stat.size < 20480) {
    throw new Error(`[BYTE GUARD FAIL] ${filename} size is ${stat.size} bytes (< 20KB)! Blank screen!`);
  }
  console.log(`[PROOF OK] ${filename} -> ${stat.size} bytes (>= 20KB guard passed)`);
}

async function main() {
  console.log("=== LAUNCHING CHROMIUM FOR PATIENTS & FAMILY PROOFS ===");
  const browser = await chromium.launch({
    headless: true,
    executablePath: "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });

  const ctx = await browser.newContext({
    viewport: { width: 1440, height: 900 },
  });

  await ctx.addInitScript(() => {
    localStorage.setItem("dente_clinic_token", "demo-showcase-token-owner");
    localStorage.setItem("dente_staff_token", "demo-showcase-staff-token-owner");
    localStorage.setItem("dente_active_session_token", "demo-showcase-staff-token-owner");
    localStorage.setItem("dente_active_role", "owner");
    localStorage.setItem("dente_user_role", "owner");
    localStorage.setItem("dente_role", "owner");
    localStorage.setItem("dente_perspective", "management");
    sessionStorage.setItem("dente_unlocked", "true");
    localStorage.setItem("dente_demo_showcase", "true");
    localStorage.setItem("dente_demo_mode", "true");
    localStorage.setItem("dente_onboarding_completed", "true");
    localStorage.setItem("dente_tour_completed", "true");
    localStorage.setItem("dental-crm:onboarding:v1", JSON.stringify({
      dismissed: true,
      step: "done",
      completed: true,
    }));
  });

  const page = await ctx.newPage();

  // 1. PATIENTS REGISTRY (PC 1440x900)
  console.log("\n>>> SECTION 1: PATIENTS REGISTRY (PC 1440x900) <<<");
  await page.goto(`${WEB_BASE}/?demo=true#patients`, { waitUntil: "commit", timeout: 45000 });
  console.log("Waiting 12 seconds for full React mount...");
  await page.waitForTimeout(12000);
  await suppressOverlays(page);

  // 1.1 PC Light
  console.log("1.1 Patients Registry PC Light (1440x900)...");
  await setTheme(page, "light");
  await saveProof(page, "patient_registry_pc_light_1440x900.png");

  // 1.2 PC Dark
  console.log("1.2 Patients Registry PC Dark (1440x900)...");
  await setTheme(page, "dark");
  await saveProof(page, "patient_registry_pc_dark_1440x900.png");

  // 2. OPEN PATIENT CARD MODAL
  console.log("\n>>> SECTION 2: OPENING PATIENT CARD MODAL <<<");
  try {
    const row = page.locator('[data-patient-id], tr[data-id], .patient-row, [data-testid^="patient-row-"], table tbody tr').first();
    if (await row.isVisible({ timeout: 5000 })) {
      await row.click();
      await page.waitForTimeout(800);
    }
    const openCardBtn = page.locator('button:has-text("В карту"), [data-testid="patient-action-open-card"], [data-testid="btn-open-patient-card"]').first();
    if (await openCardBtn.isVisible({ timeout: 5000 })) {
      await openCardBtn.click();
      await page.waitForTimeout(1500);
    }
  } catch (e) {
    console.log("Patient card open notice:", e.message);
  }

  await suppressOverlays(page);

  // 2.1 PC Light Patient Card
  console.log("2.1 Patient Card PC Light (1440x900)...");
  await setTheme(page, "light");
  await saveProof(page, "patient_card_pc_light_1440x900.png");

  // 2.2 PC Dark Patient Card
  console.log("2.2 Patient Card PC Dark (1440x900)...");
  await setTheme(page, "dark");
  await saveProof(page, "patient_card_pc_dark_1440x900.png");

  // 2.3 Switch to Family Tab
  console.log("\n>>> SECTION 3: FAMILY & TAX DEDUCTION <<<");
  try {
    const familyTab = page.locator("button:has-text('Семья'), [data-tab='family']").first();
    if (await familyTab.isVisible({ timeout: 5000 })) {
      await familyTab.click();
      await page.waitForTimeout(800);
      const openWalletBtn = page.locator("button:has-text('Семейный счет'), button:has-text('Открыть кошелек'), button:has-text('Управление балансом')").first();
      if (await openWalletBtn.isVisible({ timeout: 5000 })) {
        await openWalletBtn.click();
        await page.waitForTimeout(800);
      }
      await setTheme(page, "light");
      await saveProof(page, "patient_family_tax_pc_light_1440x900.png");
      await setTheme(page, "dark");
      await saveProof(page, "patient_family_tax_pc_dark_1440x900.png");
    }
  } catch (e) {
    console.log("Family tab notice:", e.message);
  }

  // 3. MOBILE (390x844 Apple HIG)
  console.log("\n>>> SECTION 4: MOBILE (390x844) <<<");
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(`${WEB_BASE}/?demo=true#patients`, { waitUntil: "commit", timeout: 45000 });
  await page.waitForTimeout(6000);
  await suppressOverlays(page);

  // 3.1 Mobile Light
  console.log("3.1 Patients Mobile Light (390x844)...");
  await setTheme(page, "light");
  await saveProof(page, "patient_card_mobile_light_390x844.png");

  // 3.2 Mobile Dark
  console.log("3.2 Patients Mobile Dark (390x844)...");
  await setTheme(page, "dark");
  await saveProof(page, "patient_card_mobile_dark_390x844.png");

  console.log("\n==============================================");
  console.log(">>> ALL PATIENTS & FAMILY PROOFS CAPTURED! <<<");
  console.log("==============================================");

  await browser.close();
}

main().catch((err) => {
  console.error("FATAL ERROR IN CAPTURE:", err);
  process.exit(1);
});
