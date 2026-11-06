/**
 * scripts/capture-security-rbac-4state.cjs
 *
 * 4-State Visual Proof Capture for Security RBAC, BOLA/IDOR & Staff Audit:
 * 1. 01_staff_security_rbac_pc_light_1440x900.png
 * 2. 02_staff_security_rbac_pc_dark_1440x900.png
 * 3. 03_staff_security_rbac_mobile_light_390x844.png
 * 4. 04_staff_security_rbac_mobile_dark_390x844.png
 */

const { chromium } = require("playwright");
const path = require("node:path");
const fs = require("node:fs");

const BRAIN_DIR = path.resolve("C:/Users/Admin/.gemini/antigravity/brain/b30d1e6d-31ce-4491-98cb-73cc4d1f20dd");
const DOCS_DIR = path.resolve(__dirname, "../docs/proofs/security");

fs.mkdirSync(BRAIN_DIR, { recursive: true });
fs.mkdirSync(DOCS_DIR, { recursive: true });

async function provisionTestClinic() {
  const ts = Date.now();
  console.log(">>> [AUTH] Initializing security verification clinic...");
  const initRes = await fetch("http://127.0.0.1:4100/api/auth/setup/init", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      clinicName: "Стоматология ДЕНТЕ Безопасность",
      email: `redteam-security-${ts}@dente-live.local`,
      password: "Password123!",
      ownerName: "Д-р Воронов Алексей Владимирович",
      ownerPin: "123456"
    })
  });

  if (!initRes.ok) {
    throw new Error(`Init clinic failed: ${initRes.status} ${await initRes.text()}`);
  }

  const initData = await initRes.json();
  const unlockRes = await fetch("http://127.0.0.1:4100/api/auth/staff/unlock", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-dente-clinic-token": initData.clinicToken
    },
    body: JSON.stringify({ userId: initData.ownerUserId, pinCode: "123456" })
  });

  if (!unlockRes.ok) {
    throw new Error(`Unlock staff failed: ${unlockRes.status} ${await unlockRes.text()}`);
  }

  const unlockData = await unlockRes.json();
  const staffToken = unlockData.staffToken;

  const headers = {
    "Content-Type": "application/json",
    "x-dente-clinic-token": initData.clinicToken,
    "x-dente-staff-token": staffToken,
    "Authorization": `Bearer ${staffToken}`
  };

  // Seed doctors and assistants for complete RBAC visibility
  console.log(">>> [SEED] Seeding staff members with various roles...");
  try {
    await fetch("http://127.0.0.1:4100/api/staff", {
      method: "POST",
      headers,
      body: JSON.stringify({
        fullName: "Д-р Соколова Анна Игоревна",
        email: `sokolova-${ts}@dente-live.local`,
        role: "doctor",
        specialty: "therapist",
        canSignMedicalRecords: true,
        canManageMoney: false,
        baseSalaryKopecks: 8500000,
        commissionPercent: 25
      })
    });

    await fetch("http://127.0.0.1:4100/api/staff", {
      method: "POST",
      headers,
      body: JSON.stringify({
        fullName: "Миронова Ольга Петровна",
        email: `mironova-${ts}@dente-live.local`,
        role: "receptionist",
        canSignMedicalRecords: false,
        canManageMoney: true,
        baseSalaryKopecks: 6000000
      })
    });
  } catch (err) {
    console.warn("Staff seed warning:", err.message);
  }

  return {
    clinicToken: initData.clinicToken,
    staffToken,
    ownerUserId: initData.ownerUserId
  };
}

async function saveScreenshot(page, filename) {
  const docsPath = path.join(DOCS_DIR, filename);
  const brainPath = path.join(BRAIN_DIR, filename);

  await page.screenshot({ path: docsPath, fullPage: false });
  fs.copyFileSync(docsPath, brainPath);

  const stats = fs.statSync(docsPath);
  console.log(`[SAVED] ${filename} -> size: ${(stats.size / 1024).toFixed(1)} KB`);
  if (stats.size < 20 * 1024) {
    console.warn(`[WARN] File ${filename} is smaller than 20 KB!`);
  }
}

async function setTheme(page, theme) {
  await page.evaluate((t) => {
    const root = document.documentElement;
    root.setAttribute("data-theme", t);
    if (t === "dark") {
      root.classList.add("dark");
      root.classList.remove("light");
    } else {
      root.classList.remove("dark");
      root.classList.add("light");
    }
    localStorage.setItem("dente_theme_mode", t);
    if (window.__useThemeStore && typeof window.__useThemeStore.getState === "function") {
      window.__useThemeStore.getState().setThemeMode(t);
    }
  }, theme);
  await page.waitForTimeout(400);
}

async function run() {
  const creds = await provisionTestClinic();

  const browser = await chromium.launch({
    channel: "chrome",
    headless: true
  });

  try {
    // ─── 1. Desktop 1440x900 Context ──────────────────────────────
    console.log("\n>>> [PC] Launching Desktop Context (1440x900)...");
    const pcContext = await browser.newContext({
      viewport: { width: 1440, height: 900 },
      deviceScaleFactor: 1
    });

    await pcContext.addInitScript(({ ct, st, uid }) => {
      localStorage.setItem("dente_clinic_token", ct);
      localStorage.setItem("dente_staff_token", st);
      localStorage.setItem("dente_active_session_token", st);
      localStorage.setItem("dente_active_user_id", uid);
      localStorage.setItem("dente_active_role", "owner");
      localStorage.setItem("dente_user_role", "owner");
      localStorage.setItem("dente_user_name", "Д-р Воронов Алексей Владимирович");
      localStorage.setItem("dente_onboarding_completed", "true");
      localStorage.setItem("dente_tour_completed", "true");
      sessionStorage.setItem("dente_unlocked", "true");
      localStorage.setItem("dente_theme_mode", "light");
      localStorage.setItem("dental-crm:onboarding:v1", JSON.stringify({ dismissed: true, step: "done", completed: true }));
      localStorage.setItem("dental-crm:web-ui-preferences:v1", JSON.stringify({
        version: 1,
        uiLanguage: "ru",
        selectedWorkspaceRole: "owner",
        selectedSpecialty: "therapist",
        onboardingDismissed: true
      }));
      localStorage.setItem("dente_staff_session", JSON.stringify({
        userId: uid,
        name: "Д-р Воронов А. В.",
        fullName: "Д-р Воронов Алексей Владимирович",
        role: "owner",
        permissions: ["all"]
      }));
    }, { ct: creds.clinicToken, st: creds.staffToken, uid: creds.ownerUserId });

    const page = await pcContext.newPage();
    await page.goto("http://127.0.0.1:5173/#settings", { waitUntil: "domcontentloaded", timeout: 30000 });
    await page.waitForTimeout(1500);

    // Switch to All Sections if needed
    const roleAllBtn = page.locator('[data-testid="btn-settings-role-all"]');
    if (await roleAllBtn.isVisible().catch(() => false)) {
      await roleAllBtn.click();
      await page.waitForTimeout(500);
    }

    // Click Staff tab specifically
    console.log(">>> [PC] Switching to 'Врачи и персонал' tab...");
    const staffTab = page.locator('button:has-text("Врачи и персонал"), [data-testid="tab-staff"]').first();
    if (await staffTab.isVisible({ timeout: 5000 }).catch(() => false)) {
      await staffTab.click();
      await page.waitForTimeout(1000);
    }

    console.log(">>> [PC] Capturing PC Light (1440x900)...");
    await setTheme(page, "light");
    await saveScreenshot(page, "01_staff_security_rbac_pc_light_1440x900.png");

    console.log(">>> [PC] Capturing PC Dark (1440x900)...");
    await setTheme(page, "dark");
    await saveScreenshot(page, "02_staff_security_rbac_pc_dark_1440x900.png");

    await pcContext.close();

    // ─── 2. Mobile 390x844 Context ──────────────────────────────
    console.log("\n>>> [MOBILE] Launching Mobile Context (390x844)...");
    const mobileContext = await browser.newContext({
      viewport: { width: 390, height: 844 },
      deviceScaleFactor: 2,
      isMobile: true,
      hasTouch: true
    });

    await mobileContext.addInitScript(({ ct, st, uid }) => {
      localStorage.setItem("dente_clinic_token", ct);
      localStorage.setItem("dente_staff_token", st);
      localStorage.setItem("dente_active_session_token", st);
      localStorage.setItem("dente_active_user_id", uid);
      localStorage.setItem("dente_active_role", "owner");
      localStorage.setItem("dente_user_role", "owner");
      localStorage.setItem("dente_user_name", "Д-р Воронов Алексей Владимирович");
      localStorage.setItem("dente_onboarding_completed", "true");
      localStorage.setItem("dente_tour_completed", "true");
      sessionStorage.setItem("dente_unlocked", "true");
      localStorage.setItem("dente_theme_mode", "light");
      localStorage.setItem("dental-crm:onboarding:v1", JSON.stringify({ dismissed: true, step: "done", completed: true }));
      localStorage.setItem("dental-crm:web-ui-preferences:v1", JSON.stringify({
        version: 1,
        uiLanguage: "ru",
        selectedWorkspaceRole: "owner",
        selectedSpecialty: "therapist",
        onboardingDismissed: true
      }));
      localStorage.setItem("dente_staff_session", JSON.stringify({
        userId: uid,
        name: "Д-р Воронов А. В.",
        fullName: "Д-р Воронов Алексей Владимирович",
        role: "owner",
        permissions: ["all"]
      }));
    }, { ct: creds.clinicToken, st: creds.staffToken, uid: creds.ownerUserId });

    const mobilePage = await mobileContext.newPage();
    await mobilePage.goto("http://127.0.0.1:5173/#settings", { waitUntil: "domcontentloaded", timeout: 30000 });
    await mobilePage.waitForTimeout(1500);

    console.log(">>> [MOBILE] Switching to 'Врачи и персонал' tab...");
    const mStaffTab = mobilePage.locator('button:has-text("Врачи и персонал"), [data-testid="tab-staff"]').first();
    if (await mStaffTab.isVisible({ timeout: 5000 }).catch(() => false)) {
      await mStaffTab.click();
      await mobilePage.waitForTimeout(1000);
    }

    console.log(">>> [MOBILE] Capturing Mobile Light (390x844)...");
    await setTheme(mobilePage, "light");
    await saveScreenshot(mobilePage, "03_staff_security_rbac_mobile_light_390x844.png");

    console.log(">>> [MOBILE] Capturing Mobile Dark (390x844)...");
    await setTheme(mobilePage, "dark");
    await saveScreenshot(mobilePage, "04_staff_security_rbac_mobile_dark_390x844.png");

    await mobileContext.close();

    console.log("\n>>> [SUCCESS] All 4-state visual proofs captured successfully!");
  } finally {
    await browser.close();
  }
}

run().catch((err) => {
  console.error("FATAL ERROR:", err);
  process.exit(1);
});
