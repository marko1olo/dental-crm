/**
 * scripts/capture_treatment_plans.cjs
 * Visual Proof Capture Suite for Treatment Plans & 3-Tier Case Presenter.
 * 
 * Required Outputs:
 * 1. docs/proofs/treatment_plans/pc_light_treatment_plan_stages.png (1440x900)
 * 2. docs/proofs/treatment_plans/pc_light_3tier_presenter.png (1440x900)
 * 3. docs/proofs/treatment_plans/pc_dark_3tier_presenter.png (1440x900)
 * 4. docs/proofs/treatment_plans/mobile_light_treatment_plan.png (390x844)
 */

const { chromium } = require("playwright");
const fs = require("node:fs");
const path = require("node:path");
const crypto = require("node:crypto");

const API_BASE = "http://127.0.0.1:4100";
const WEB_BASE = "http://127.0.0.1:5173";
const OUT_DIR = path.resolve("C:/Clinic_MVP/dental-crm/docs/proofs/treatment_plans");

async function provisionSession() {
  const uniqueId = Date.now();
  console.log(`[Provisioning] Initializing test session tp-${uniqueId}@dente-clinic.ru...`);

  const initRes = await fetch(`${API_BASE}/api/auth/setup/init`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      clinicName: "Стоматология ДЕНТЕ Премиум",
      email: `tp-proof-${uniqueId}@dente-clinic.ru`,
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

  const headers = {
    "Content-Type": "application/json",
    "x-dente-clinic-token": initData.clinicToken,
    "x-dente-staff-token": unlockData.staffToken,
  };

  let patientId = null;
  const pRes = await fetch(`${API_BASE}/api/patients`, {
    method: "POST",
    headers,
    body: JSON.stringify({
      fullName: "Ковалёв Роман Станиславович",
      birthDate: "1988-04-12",
      gender: "male",
      phone: "+7 (999) 888-77-66",
      allergies: "Бронхиальная астма, аллергия на лидокаин",
      chronicDiseases: "Хронический гастрит",
    }),
  });
  if (pRes.ok) {
    const pData = await pRes.json();
    patientId = pData.patient?.id || pData.id || null;
    console.log(`[Provisioning] Seeded patient: ${patientId}`);
  }

  return {
    clinicToken: initData.clinicToken,
    staffToken: unlockData.staffToken,
    ownerUserId: initData.ownerUserId,
    patientId,
  };
}

async function applyTheme(page, isDark) {
  await page.evaluate((dark) => {
    const theme = dark ? "dark" : "light";
    localStorage.setItem("dente_theme_mode", theme);
    document.documentElement.setAttribute("data-theme", theme);
    document.documentElement.dataset.theme = theme;
    if (dark) {
      document.documentElement.classList.add("dark");
      document.documentElement.classList.remove("light");
      document.documentElement.style.colorScheme = "dark";
    } else {
      document.documentElement.classList.remove("dark");
      document.documentElement.classList.add("light");
      document.documentElement.style.colorScheme = "light";
    }
    if (window.__useThemeStore) {
      window.__useThemeStore.getState().setThemeMode(theme);
    }
  }, isDark);
  await page.waitForTimeout(600);
}

function verifyAndLog(filePath) {
  const stats = fs.statSync(filePath);
  const sizeKb = (stats.size / 1024).toFixed(1);
  const passed = stats.size >= 20480;
  console.log(`[Captured] ${path.basename(filePath)} | ${sizeKb} KB | >= 20KB: ${passed ? "PASS" : "FAIL"}`);
  if (!passed) {
    throw new Error(`File ${filePath} is under 20KB (${stats.size} bytes)!`);
  }
}

async function main() {
  fs.mkdirSync(OUT_DIR, { recursive: true });

  const auth = await provisionSession();
  const browser = await chromium.launch({
    headless: true,
    executablePath: "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
    args: ["--no-sandbox", "--disable-gpu", "--font-render-hinting=none"],
  });

  const addStorageScript = (context, isMobile = false, themeMode = "light") => {
    return context.addInitScript(({ ct, st, uid, pid, mobile, theme }) => {
      localStorage.setItem("dente_clinic_token", ct);
      localStorage.setItem("dente_staff_token", st);
      localStorage.setItem("dente_active_session_token", st);
      localStorage.setItem("dente_workspace_perspective", "presentation");
      localStorage.setItem("dente_active_user_id", uid);
      localStorage.setItem("dente_active_role", "owner");
      localStorage.setItem("dente_active_mode", "clinic");
      localStorage.setItem("dente_theme_mode", theme);
      sessionStorage.setItem("dente_unlocked", "true");
      localStorage.setItem(
        "dente_staff_session",
        JSON.stringify({
          userId: uid,
          name: "Д-р Воронов Алексей Владимирович",
          fullName: "Д-р Воронов Алексей Владимирович",
          role: "owner",
          specialties: ["Стоматолог-терапевт", "Ортопед"],
        })
      );
      localStorage.setItem(
        "dental-crm:web-ui-preferences:v1",
        JSON.stringify({
          version: 1,
          uiLanguage: "ru",
          selectedWorkspaceRole: "owner",
          selectedPatientId: pid,
          onboardingDismissed: true,
          onboardingStep: "done",
        })
      );
      document.cookie = `dente_clinic_token=${encodeURIComponent(ct)}; path=/; max-age=31536000`;
      document.cookie = `dente_staff_token=${encodeURIComponent(st)}; path=/; max-age=31536000`;
    }, {
      ct: auth.clinicToken,
      st: auth.staffToken,
      uid: auth.ownerUserId,
      pid: auth.patientId,
      mobile: isMobile,
      theme: themeMode,
    });
  };

  try {
    // ═════════════════════════════════════════════════════════════════════
    // 1 & 2: DESKTOP PC LIGHT (1440x900)
    // ═════════════════════════════════════════════════════════════════════
    console.log("\n>>> Launching PC Desktop Light Context (1440x900) <<<\n");
    const pcContext = await browser.newContext({
      viewport: { width: 1440, height: 900 },
      deviceScaleFactor: 1,
      isMobile: false,
    });
    await addStorageScript(pcContext, false, "light");

    const pcPage = await pcContext.newPage();
    pcPage.on("pageerror", (e) => console.log("[PAGE_ERR]:", e.message));

    console.log("Navigating to http://127.0.0.1:5173/#visit...");
    await pcPage.goto(`${WEB_BASE}/#visit`, { waitUntil: "domcontentloaded", timeout: 45000 });
    await pcPage.waitForSelector(".boot-state", { state: "detached", timeout: 45000 }).catch(() => {});
    await pcPage.evaluate(() => {
      if (window.__usePerspectiveStore) {
        window.__usePerspectiveStore.getState().setPerspective("presentation");
      }
    });
    await pcPage.waitForSelector('[data-testid="treatment-plan-module"]', { timeout: 30000 });
    await pcPage.waitForTimeout(1500);

    await applyTheme(pcPage, false);

    // ─────────────────────────────────────────────────────────────────
    // Screen 1: pc_light_treatment_plan_stages.png
    // ─────────────────────────────────────────────────────────────────
    console.log("\n[1/5] Capturing pc_light_treatment_plan_stages.png...");
    const stagesTabBtn = await pcPage.waitForSelector('[data-testid="tp-tab-stages"]', { timeout: 10000 });
    await stagesTabBtn.click();
    await pcPage.waitForTimeout(1000);

    const stagesPath = path.join(OUT_DIR, "pc_light_treatment_plan_stages.png");
    await pcPage.screenshot({ path: stagesPath, fullPage: false, animations: "disabled" });
    verifyAndLog(stagesPath);

    // ─────────────────────────────────────────────────────────────────
    // Screen 2: pc_light_3tier_presenter.png
    // ─────────────────────────────────────────────────────────────────
    console.log("\n[2/5] Capturing pc_light_3tier_presenter.png...");
    const optionsBtn = await pcPage.waitForSelector('[data-testid="treatment-plan-options-menu-btn"]', { timeout: 10000 });
    await optionsBtn.click();
    await pcPage.waitForTimeout(400);

    const presenterBtn = await pcPage.waitForSelector('[data-testid="options-menu-presenter-btn"]', { timeout: 10000 });
    await presenterBtn.click();
    await pcPage.waitForTimeout(1200);

    await pcPage.waitForSelector('[data-testid="treatment-plan-presenter-modal"]', { timeout: 10000 });
    await pcPage.waitForTimeout(500);

    const presenterLightPath = path.join(OUT_DIR, "pc_light_3tier_presenter.png");
    await pcPage.screenshot({ path: presenterLightPath, fullPage: false, animations: "disabled" });
    verifyAndLog(presenterLightPath);

    await pcContext.close();

    // ═════════════════════════════════════════════════════════════════════
    // 3: DESKTOP PC DARK (1440x900)
    // ═════════════════════════════════════════════════════════════════════
    console.log("\n>>> Launching PC Desktop Dark Context (1440x900) <<<\n");
    const pcDarkContext = await browser.newContext({
      viewport: { width: 1440, height: 900 },
      deviceScaleFactor: 1,
      isMobile: false,
    });
    await addStorageScript(pcDarkContext, false, "dark");

    const pcDarkPage = await pcDarkContext.newPage();
    await pcDarkPage.goto(`${WEB_BASE}/#visit`, { waitUntil: "domcontentloaded", timeout: 45000 });
    await pcDarkPage.waitForSelector(".boot-state", { state: "detached", timeout: 45000 }).catch(() => {});
    await pcDarkPage.evaluate(() => {
      if (window.__usePerspectiveStore) {
        window.__usePerspectiveStore.getState().setPerspective("presentation");
      }
    });
    await pcDarkPage.waitForSelector('[data-testid="treatment-plan-module"]', { timeout: 30000 });
    await pcDarkPage.waitForTimeout(1000);

    await applyTheme(pcDarkPage, true);
    await pcDarkPage.waitForTimeout(500);

    console.log("\n[3/5] Capturing pc_dark_3tier_presenter.png...");
    const darkOptionsBtn = await pcDarkPage.waitForSelector('[data-testid="treatment-plan-options-menu-btn"]', { timeout: 10000 });
    await darkOptionsBtn.click();
    await pcDarkPage.waitForTimeout(400);

    const darkPresenterBtn = await pcDarkPage.waitForSelector('[data-testid="options-menu-presenter-btn"]', { timeout: 10000 });
    await darkPresenterBtn.click();
    await pcDarkPage.waitForTimeout(1200);

    await pcDarkPage.waitForSelector('[data-testid="treatment-plan-presenter-modal"]', { timeout: 10000 });
    await pcDarkPage.waitForTimeout(500);

    const presenterDarkPath = path.join(OUT_DIR, "pc_dark_3tier_presenter.png");
    await pcDarkPage.screenshot({ path: presenterDarkPath, fullPage: false, animations: "disabled" });
    verifyAndLog(presenterDarkPath);

    await pcDarkContext.close();

    // ═════════════════════════════════════════════════════════════════════
    // 4: MOBILE LIGHT (390x844)
    // ═════════════════════════════════════════════════════════════════════
    console.log("\n>>> Launching Mobile Light Context (390x844) <<<\n");
    const mobileContext = await browser.newContext({
      viewport: { width: 390, height: 844 },
      deviceScaleFactor: 2,
      isMobile: true,
      hasTouch: true,
    });
    await addStorageScript(mobileContext, true, "light");

    const mobilePage = await mobileContext.newPage();
    mobilePage.on("pageerror", (e) => console.log("[MOBILE_PAGE_ERR]:", e.message));

    console.log("Navigating mobile to http://127.0.0.1:5173/#visit...");
    await mobilePage.goto(`${WEB_BASE}/#visit`, { waitUntil: "domcontentloaded", timeout: 45000 });
    await mobilePage.waitForSelector(".boot-state", { state: "detached", timeout: 45000 }).catch(() => {});
    await mobilePage.evaluate(() => {
      if (window.__usePerspectiveStore) {
        window.__usePerspectiveStore.getState().setPerspective("presentation");
      }
    });
    await mobilePage.waitForSelector('[data-testid="treatment-plan-module"]', { timeout: 30000 });
    await mobilePage.waitForTimeout(1500);

    await applyTheme(mobilePage, false);

    console.log("\n[4/5] Capturing mobile_light_treatment_plan.png...");
    const mOptionsBtn = await mobilePage.waitForSelector('[data-testid="treatment-plan-options-menu-btn"]', { timeout: 10000 });
    await mOptionsBtn.click();
    await mobilePage.waitForTimeout(400);

    const mPresenterBtn = await mobilePage.waitForSelector('[data-testid="options-menu-presenter-btn"]', { timeout: 10000 });
    await mPresenterBtn.click();
    await mobilePage.waitForTimeout(1200);

    await mobilePage.waitForSelector('[data-testid="treatment-plan-presenter-modal"]', { timeout: 10000 });
    await mobilePage.waitForTimeout(500);

    const mobilePath = path.join(OUT_DIR, "mobile_light_treatment_plan.png");
    await mobilePage.screenshot({ path: mobilePath, fullPage: false, animations: "disabled" });
    verifyAndLog(mobilePath);

    await mobileContext.close();

    // ═════════════════════════════════════════════════════════════════════
    // 5: MOBILE DARK (390x844)
    // ═════════════════════════════════════════════════════════════════════
    console.log("\n>>> Launching Mobile Dark Context (390x844) <<<\n");
    const mobileDarkContext = await browser.newContext({
      viewport: { width: 390, height: 844 },
      deviceScaleFactor: 2,
      isMobile: true,
      hasTouch: true,
    });
    await addStorageScript(mobileDarkContext, true, "dark");

    const mobileDarkPage = await mobileDarkContext.newPage();
    await mobileDarkPage.goto(`${WEB_BASE}/#visit`, { waitUntil: "domcontentloaded", timeout: 45000 });
    await mobileDarkPage.waitForSelector(".boot-state", { state: "detached", timeout: 45000 }).catch(() => {});
    await mobileDarkPage.evaluate(() => {
      if (window.__usePerspectiveStore) {
        window.__usePerspectiveStore.getState().setPerspective("presentation");
      }
    });
    await mobileDarkPage.waitForSelector('[data-testid="treatment-plan-module"]', { timeout: 30000 });
    await mobileDarkPage.waitForTimeout(1000);

    await applyTheme(mobileDarkPage, true);
    await mobileDarkPage.waitForTimeout(500);

    console.log("\n[5/5] Capturing mobile_dark_treatment_plan.png...");
    const mDarkOptionsBtn = await mobileDarkPage.waitForSelector('[data-testid="treatment-plan-options-menu-btn"]', { timeout: 10000 });
    await mDarkOptionsBtn.click();
    await mobileDarkPage.waitForTimeout(400);

    const mDarkPresenterBtn = await mobileDarkPage.waitForSelector('[data-testid="options-menu-presenter-btn"]', { timeout: 10000 });
    await mDarkPresenterBtn.click();
    await mobileDarkPage.waitForTimeout(1200);

    await mobileDarkPage.waitForSelector('[data-testid="treatment-plan-presenter-modal"]', { timeout: 10000 });
    await mobileDarkPage.waitForTimeout(500);

    const mobileDarkPath = path.join(OUT_DIR, "mobile_dark_treatment_plan.png");
    await mobileDarkPage.screenshot({ path: mobileDarkPath, fullPage: false, animations: "disabled" });
    verifyAndLog(mobileDarkPath);

    await mobileDarkContext.close();

    console.log("\n=======================================================");
    console.log("ALL 5 SCREENSHOT PROOFS SUCCESSFULLY CAPTURED & AUDITED!");
    console.log("=======================================================\n");

  } finally {
    await browser.close();
  }
}

main().catch((err) => {
  console.error("FATAL ERROR IN CAPTURE SCRIPT:", err);
  process.exit(1);
});
