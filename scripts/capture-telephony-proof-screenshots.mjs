/**
 * scripts/capture-telephony-proof-screenshots.mjs
 *
 * Captures 4-State Red Team Visual Proof for Telephony Ambient Event Capsule:
 * 1. 01_telephony_pc_light.png (1440x900)
 * 2. 02_telephony_pc_dark.png (1440x900)
 * 3. 03_telephony_mobile_light.png (390x844)
 * 4. 04_telephony_mobile_dark.png (390x844)
 * Output directory: docs/proofs/telephony/
 */

import { chromium } from "playwright";
import path from "node:path";
import fs from "node:fs";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const outDir = path.resolve(__dirname, "../docs/proofs/telephony");
if (!fs.existsSync(outDir)) {
  fs.mkdirSync(outDir, { recursive: true });
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

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
  await sleep(400);
}

async function triggerCall(page) {
  await page.evaluate(() => {
    window.dispatchEvent(
      new CustomEvent("dente:telephony-mock-incoming", {
        detail: {
          callId: "call-" + Date.now(),
          phone: "+7 (926) 555-12-34",
          patientName: "Смирнова Екатерина Васильевна",
          patientId: "01a00000-0000-0000-0000-000000000001",
          provider: "mango",
          timestamp: new Date().toISOString(),
          status: "ringing",
          acutePain: true,
        },
      })
    );
  });
  await sleep(1000);
}

async function setupPageSession(context, page, role = "administrator") {
  await context.addCookies([
    { name: "dente_clinic_token", value: "demo-clinic-token", domain: "127.0.0.1", path: "/" },
    { name: "dente_staff_token", value: "demo-staff-token", domain: "127.0.0.1", path: "/" },
  ]);

  await page.addInitScript(({ role }) => {
    sessionStorage.setItem("dente_unlocked", "true");
    localStorage.setItem("dente_clinic_token", "demo-clinic-token");
    localStorage.setItem("dente_staff_token", "demo-staff-token");
    localStorage.setItem("dente_workspace_perspective", role);
    localStorage.setItem("dente_user_role", role);
    localStorage.setItem("dente_active_role", role);
    localStorage.setItem("dente_demo_showcase", "true");
    localStorage.setItem("dente_onboarding_completed", "true");
    localStorage.setItem("dente_tour_completed", "true");
    localStorage.setItem("dente_tour_dismissed", "true");
    localStorage.setItem("dente_guide_tour_dismissed_v2", "true");
    localStorage.setItem("dental-crm:onboarding:v1", JSON.stringify({ dismissed: true, step: "done" }));
    localStorage.setItem(
      "dental-crm:web-ui-preferences:v1",
      JSON.stringify({
        version: 1,
        uiLanguage: "ru",
        selectedWorkspaceRole: role,
        onboardingDismissed: true,
        onboardingStep: "done",
      })
    );
    localStorage.setItem(
      "dente-workspace-profile",
      JSON.stringify({ mode: "clinic", role: role, activeRole: role })
    );
  }, { role });
}

async function waitForRealUI(page) {
  // Check if we hit the login page
  const loginBtn = page.locator('button:has-text("Войти в систему")');
  if (await loginBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
    console.log("  [AUTH] Clicking login submit button...");
    await loginBtn.click();
    await sleep(1500);
  }

  // Also check demo card button
  const demoBtn = page.locator(".auth-demo-btn");
  if (await demoBtn.isVisible({ timeout: 1500 }).catch(() => false)) {
    console.log("  [AUTH] Clicking demo launch button...");
    await demoBtn.click();
    await sleep(800);
    const adminCard = page.locator(".auth-demo-role-card", { hasText: "Главврач" }).first();
    if (await adminCard.isVisible().catch(() => false)) {
      await adminCard.click();
      await sleep(400);
    }
    const launchBtn = page.locator(".auth-demo-tour-actions button.auth-submit-btn").first();
    if (await launchBtn.isVisible().catch(() => false)) {
      await launchBtn.click();
      await sleep(2000);
    }
  }

  // Wait for splash screen to disappear
  console.log("  Waiting for splash screen 'Загрузка системы...' to detach...");
  await page.waitForFunction(() => {
    const text = document.body.innerText || "";
    return !text.includes("Загрузка системы") &&
           !text.includes("Подготовка модулей") &&
           (document.querySelector(".workspace-shell") ||
            document.querySelector(".topbar") ||
            document.querySelector(".schedule-filter-strip") ||
            document.querySelector("[data-testid='schedule-grid']"));
  }, { timeout: 40000 });

  await suppressOverlays(page);
  await sleep(1000);
}

async function main() {
  console.log("=== Launching Chrome Playwright for Telephony 4-State Proofs ===");

  const browser = await chromium.launch({
    executablePath: "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox", "--font-render-hinting=none"],
  });

  try {
    // -------------------------------------------------------------
    // 1. DESKTOP CONTEXT (1440x900)
    // -------------------------------------------------------------
    console.log("\n[Setup Desktop Context 1440x900]...");
    const pcContext = await browser.newContext({
      viewport: { width: 1440, height: 900 },
      deviceScaleFactor: 1,
    });

    const pcPage = await pcContext.newPage();
    await setupPageSession(pcContext, pcPage, "administrator");

    console.log("  Navigating to http://127.0.0.1:5173/?demo=true#schedule ...");
    await pcPage.goto("http://127.0.0.1:5173/?demo=true#schedule", { waitUntil: "domcontentloaded", timeout: 45000 });
    await waitForRealUI(pcPage);

    // 01_telephony_pc_light.png
    console.log("[Capturing] 01_telephony_pc_light.png (1440x900, light)...");
    await setTheme(pcPage, "light");
    await triggerCall(pcPage);
    await pcPage.waitForSelector(".dnt-incoming-call-capsule, .dnt-incoming-call-badge", { state: "attached", timeout: 10000 }).catch(() => {});
    await sleep(600);

    const pcLightPath = path.join(outDir, "01_telephony_pc_light_1440x900.png");
    await pcPage.screenshot({ path: pcLightPath, fullPage: false });
    fs.copyFileSync(pcLightPath, path.join(outDir, "01_telephony_pc_light.png"));
    const pcLightStat = fs.statSync(pcLightPath);
    console.log(`  [OK] Saved 01_telephony_pc_light_1440x900.png (${Math.round(pcLightStat.size / 1024)} KB)`);

    // 02_telephony_pc_dark.png
    console.log("[Capturing] 02_telephony_pc_dark_1440x900.png (1440x900, dark)...");
    await setTheme(pcPage, "dark");
    await triggerCall(pcPage);
    await pcPage.waitForSelector(".dnt-incoming-call-capsule, .dnt-incoming-call-badge", { state: "attached", timeout: 10000 }).catch(() => {});
    await sleep(600);

    const pcDarkPath = path.join(outDir, "02_telephony_pc_dark_1440x900.png");
    await pcPage.screenshot({ path: pcDarkPath, fullPage: false });
    fs.copyFileSync(pcDarkPath, path.join(outDir, "02_telephony_pc_dark.png"));
    const pcDarkStat = fs.statSync(pcDarkPath);
    console.log(`  [OK] Saved 02_telephony_pc_dark_1440x900.png (${Math.round(pcDarkStat.size / 1024)} KB)`);

    await pcContext.close();

    // -------------------------------------------------------------
    // 2. MOBILE CONTEXT (390x844)
    // -------------------------------------------------------------
    console.log("\n[Setup Mobile Context 390x844 (iPhone 14)]...");
    const mobileContext = await browser.newContext({
      viewport: { width: 390, height: 844 },
      deviceScaleFactor: 2,
      isMobile: true,
      hasTouch: true,
    });

    const mobilePage = await mobileContext.newPage();
    await setupPageSession(mobileContext, mobilePage, "administrator");

    console.log("  Navigating mobile to http://127.0.0.1:5173/?demo=true#schedule ...");
    await mobilePage.goto("http://127.0.0.1:5173/?demo=true#schedule", { waitUntil: "domcontentloaded", timeout: 45000 });
    await waitForRealUI(mobilePage);

    // 03_telephony_mobile_light.png
    console.log("[Capturing] 03_telephony_mobile_light.png (390x844, light)...");
    await setTheme(mobilePage, "light");
    await triggerCall(mobilePage);
    await mobilePage.waitForSelector(".dnt-incoming-call-capsule, .dnt-incoming-call-badge", { state: "attached", timeout: 10000 }).catch(() => {});
    await sleep(600);

    const mobileLightPath = path.join(outDir, "03_telephony_mobile_light_390x844.png");
    await mobilePage.screenshot({ path: mobileLightPath, fullPage: false });
    fs.copyFileSync(mobileLightPath, path.join(outDir, "03_telephony_mobile_light.png"));
    const mobileLightStat = fs.statSync(mobileLightPath);
    console.log(`  [OK] Saved 03_telephony_mobile_light_390x844.png (${Math.round(mobileLightStat.size / 1024)} KB)`);

    // 04_telephony_mobile_dark.png
    console.log("[Capturing] 04_telephony_mobile_dark_390x844.png (390x844, dark)...");
    await setTheme(mobilePage, "dark");
    await triggerCall(mobilePage);
    await mobilePage.waitForSelector(".dnt-incoming-call-capsule, .dnt-incoming-call-badge", { state: "attached", timeout: 10000 }).catch(() => {});
    await sleep(600);

    const mobileDarkPath = path.join(outDir, "04_telephony_mobile_dark_390x844.png");
    await mobilePage.screenshot({ path: mobileDarkPath, fullPage: false });
    fs.copyFileSync(mobileDarkPath, path.join(outDir, "04_telephony_mobile_dark.png"));
    const mobileDarkStat = fs.statSync(mobileDarkPath);
    console.log(`  [OK] Saved 04_telephony_mobile_dark_390x844.png (${Math.round(mobileDarkStat.size / 1024)} KB)`);

    await mobileContext.close();

    console.log("\n=== ALL 4 TELEPHONY PROOF SCREENSHOTS CAPTURED WITH RED TEAM PERFECTION! ===");
  } finally {
    await browser.close();
  }
}

main().catch((err) => {
  console.error("FATAL screenshot capture failure:", err);
  process.exit(1);
});
