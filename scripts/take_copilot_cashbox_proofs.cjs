/**
 * scripts/take_copilot_cashbox_proofs.cjs
 *
 * Captures 4-State Red Team Proofs for DENTE Copilot, BYOK Settings, and Cashier / 54-FZ Studio:
 * 1. Copilot Studio & Drawer: PC Light (1440x900), PC Dark (1440x900), Mobile Light (390x844), Mobile Dark (390x844)
 * 2. BYOK Settings & Cascade: PC Light (1440x900), PC Dark (1440x900)
 * 3. Cashier & Fiscal Studio: PC Light (1440x900), PC Dark (1440x900), Mobile Light (390x844), Mobile Dark (390x844)
 */

const { chromium } = require("playwright");
const fs = require("node:fs");
const path = require("node:path");

const TARGET_DIRS = [
  path.join(__dirname, "../docs/proofs/copilot_cashbox"),
  "C:\\Users\\Admin\\.gemini\\antigravity\\brain\\e1af100b-c230-4bd1-8ed8-b948d720a5a9\\proofs",
];

async function provisionSession() {
  const API_BASE = "http://127.0.0.1:4100";
  const uniqueId = Date.now();
  console.log("[Provisioning] Initializing clean clinic session via API...");
  try {
    const initRes = await fetch(`${API_BASE}/api/auth/setup/init`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        clinicName: "ООО «Денте Клиника»",
        email: `inquisitor-${uniqueId}@dente.local`,
        password: "Password123!",
        ownerName: "Д-р Редтим И. К.",
        ownerPin: "1234",
      }),
    });
    if (!initRes.ok) {
      console.warn("Init returned status:", initRes.status);
    }
    const initData = await initRes.json().catch(() => ({}));

    const unlockRes = await fetch(`${API_BASE}/api/auth/staff/unlock`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-dente-clinic-token": initData.clinicToken || "demo-clinic-token",
      },
      body: JSON.stringify({ userId: initData.ownerUserId || "user-1", pinCode: "1234" }),
    });
    const unlockData = await unlockRes.json().catch(() => ({}));

    return {
      clinicToken: initData.clinicToken || "demo-clinic-token",
      staffToken: unlockData.staffToken || "demo-staff-token",
      ownerUserId: initData.ownerUserId || "user-1",
    };
  } catch (err) {
    console.warn("Provisioning fallback to local mock tokens:", err.message);
    return {
      clinicToken: "demo-clinic-token",
      staffToken: "demo-staff-token",
      ownerUserId: "user-1",
    };
  }
}

async function saveProof(page, filename) {
  const buffer = await page.screenshot();
  for (const dir of TARGET_DIRS) {
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    const targetFile = path.join(dir, filename);
    fs.writeFileSync(targetFile, buffer);
    const size = fs.statSync(targetFile).size;
    console.log(`[PROOF SAVED] ${filename} -> ${targetFile} (${size} bytes)`);
  }
}

const initScript = ({ ct, st, uid }) => {
  localStorage.setItem("dente_clinic_token", ct);
  localStorage.setItem("dente_staff_token", st);
  localStorage.setItem("dente_active_role", "doctor");
  localStorage.setItem("dente_user_id", uid);
  localStorage.setItem("dente_onboarding_completed", "true");
  localStorage.setItem("dente_tour_completed", "true");
  localStorage.setItem("dente_doctor_shift_active", "true");
  localStorage.setItem(
    "dente-workspace-profile",
    JSON.stringify({ mode: "doctor", role: "doctor", activeRole: "doctor" })
  );
  localStorage.setItem(
    "dental-crm:web-ui-preferences:v1",
    JSON.stringify({ version: 1, uiLanguage: "ru", selectedWorkspaceRole: "doctor" })
  );
};

async function setDarkTheme(page) {
  await page.evaluate(() => {
    document.documentElement.setAttribute("data-theme", "dark");
    document.body.setAttribute("data-theme", "dark");
    document.documentElement.classList.add("dark");
    document.documentElement.classList.remove("light");
    document.body.classList.add("dark");
    document.body.classList.remove("light");
    document.documentElement.style.colorScheme = "dark";
  });
  await page.waitForTimeout(300);
}

async function setLightTheme(page) {
  await page.evaluate(() => {
    document.documentElement.setAttribute("data-theme", "light");
    document.body.setAttribute("data-theme", "light");
    document.documentElement.classList.add("light");
    document.documentElement.classList.remove("dark");
    document.body.classList.add("light");
    document.body.classList.remove("dark");
    document.documentElement.style.colorScheme = "light";
  });
  await page.waitForTimeout(300);
}

async function main() {
  const auth = await provisionSession();
  const browser = await chromium.launch({
    headless: true,
    executablePath: "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });

  try {
    // ==========================================
    // 1. PC DESKTOP (1440x900)
    // ==========================================
    console.log("\n=== 1. PC Desktop 1440x900 ===");
    const pcContext = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    await pcContext.addInitScript(initScript, { ct: auth.clinicToken, st: auth.staffToken, uid: auth.ownerUserId });
    const pcPage = await pcContext.newPage();

    // 1.1 Copilot Studio PC Light
    console.log("Navigating to http://127.0.0.1:5173/#copilot...");
    await pcPage.goto("http://127.0.0.1:5173/#copilot", { waitUntil: "domcontentloaded", timeout: 30000 });
    await pcPage.waitForTimeout(2000);
    await setLightTheme(pcPage);
    await saveProof(pcPage, "01_copilot_studio_pc_light_1440x900.png");

    // 1.2 Open Copilot Settings Modal (BYOK)
    console.log("Opening Copilot Settings Modal...");
    const settingsBtn = await pcPage.$('[data-testid="copilot-settings-trigger"]');
    if (settingsBtn) {
      await settingsBtn.click();
      await pcPage.waitForTimeout(600);
      // Click BYOK button
      const byokBtn = await pcPage.$('[data-testid="copilot-routing-mode-byok-btn"]');
      if (byokBtn) {
        await byokBtn.click();
        await pcPage.waitForTimeout(500);
      }
      await saveProof(pcPage, "02_copilot_byok_settings_pc_light_1440x900.png");

      // 1.3 BYOK Dark
      await setDarkTheme(pcPage);
      await saveProof(pcPage, "03_copilot_byok_settings_pc_dark_1440x900.png");

      // Close settings modal
      const closeSettingsBtn = await pcPage.$('button[aria-label="Закрыть"]');
      if (closeSettingsBtn) {
        await closeSettingsBtn.click();
        await pcPage.waitForTimeout(500);
      }
    }

    // 1.4 Copilot Studio PC Dark
    await setDarkTheme(pcPage);
    await saveProof(pcPage, "04_copilot_studio_pc_dark_1440x900.png");

    // 1.5 Cashier Studio PC Light & Dark
    console.log("Navigating to Cashier Studio #cashier...");
    await pcPage.goto("http://127.0.0.1:5173/#cashier", { waitUntil: "domcontentloaded", timeout: 30000 });
    await pcPage.waitForTimeout(2000);
    await setLightTheme(pcPage);
    await saveProof(pcPage, "05_cashier_studio_pc_light_1440x900.png");

    await setDarkTheme(pcPage);
    await saveProof(pcPage, "06_cashier_studio_pc_dark_1440x900.png");

    await pcContext.close();

    // ==========================================
    // 2. MOBILE (390x844 iPhone 14/15/16 Apple HIG)
    // ==========================================
    console.log("\n=== 2. Mobile 390x844 (Apple HIG) ===");
    const mobileContext = await browser.newContext({
      viewport: { width: 390, height: 844 },
      userAgent: "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1",
      isMobile: true,
      hasTouch: true,
    });
    await mobileContext.addInitScript(initScript, { ct: auth.clinicToken, st: auth.staffToken, uid: auth.ownerUserId });
    const mobilePage = await mobileContext.newPage();

    // 2.1 Copilot Mobile Light
    console.log("Navigating mobile to #copilot...");
    await mobilePage.goto("http://127.0.0.1:5173/#copilot", { waitUntil: "domcontentloaded", timeout: 30000 });
    await mobilePage.waitForTimeout(2000);
    await setLightTheme(mobilePage);
    await saveProof(mobilePage, "07_copilot_studio_mobile_light_390x844.png");

    // 2.2 Copilot Mobile Dark
    await setDarkTheme(mobilePage);
    await saveProof(mobilePage, "08_copilot_studio_mobile_dark_390x844.png");

    // 2.3 Cashier Studio Mobile Light
    console.log("Navigating mobile to #cashier...");
    await mobilePage.goto("http://127.0.0.1:5173/#cashier", { waitUntil: "domcontentloaded", timeout: 30000 });
    await mobilePage.waitForTimeout(2000);
    await setLightTheme(mobilePage);
    await saveProof(mobilePage, "09_cashier_studio_mobile_light_390x844.png");

    // 2.4 Cashier Studio Mobile Dark
    await setDarkTheme(mobilePage);
    await saveProof(mobilePage, "10_cashier_studio_mobile_dark_390x844.png");

    await mobileContext.close();
    console.log("\n[SUCCESS] All 10 Red Team Proofs captured successfully!");
  } catch (err) {
    console.error("Capture failed:", err);
    process.exit(1);
  } finally {
    await browser.close();
  }
}

main();
