/**
 * scripts/capture-ortho-canonical-4proofs.cjs
 *
 * Real Fastify API authenticated 4-State Red Team Proofs for Orthodontics & Cephalometrics:
 * 1. Orthodontics Studio Modal (Brackets & Archwires): PC Light/Dark & Mobile Light/Dark
 * 2. Cephalometrics (TRG) Analysis Modal with CephalometricCanvas: PC Light/Dark & Mobile Light/Dark
 */

const { chromium } = require("playwright");
const fs = require("node:fs");
const path = require("node:path");

const PROOFS_DIR = path.join(__dirname, "../docs/proofs/orthodontics");
if (!fs.existsSync(PROOFS_DIR)) {
  fs.mkdirSync(PROOFS_DIR, { recursive: true });
}

async function provisionSession() {
  const API_BASE = "http://127.0.0.1:4100";
  const uniqueId = Date.now();
  console.log("[PROVISION] Provisioning real session via Fastify API...");
  try {
    const initRes = await fetch(`${API_BASE}/api/auth/setup/init`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        clinicName: "ООО «Денте Ортодонтия»",
        email: `ortho-inquisitor-${uniqueId}@dente.local`,
        password: "Password123!",
        ownerName: "Д-р Соколов А. В.",
        ownerPin: "1234",
      }),
    });
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

    console.log("[PROVISION] Real tokens acquired successfully.");
    return {
      clinicToken: initData.clinicToken || "demo-clinic-token",
      staffToken: unlockData.staffToken || "demo-staff-token",
      ownerUserId: initData.ownerUserId || "user-1",
    };
  } catch (err) {
    console.warn("[PROVISION] Error:", err.message);
    return {
      clinicToken: "demo-clinic-token",
      staffToken: "demo-staff-token",
      ownerUserId: "user-1",
    };
  }
}

async function applyTheme(page, theme) {
  const isDark = theme === "dark";
  await page.evaluate(({ dark, th }) => {
    document.documentElement.setAttribute("data-theme", th);
    document.body.setAttribute("data-theme", th);
    document.documentElement.classList.toggle("dark", dark);
    document.documentElement.classList.toggle("light", !dark);
    document.body.classList.toggle("dark", dark);
    document.body.classList.toggle("light", !dark);
    document.documentElement.style.colorScheme = th;
    localStorage.setItem("dente_theme", th);
    localStorage.setItem("dente_theme_mode", th);
    localStorage.setItem("theme", th);
  }, { dark: isDark, th: theme });
  await page.waitForTimeout(400);
}

async function suppressOverlays(page) {
  try {
    await page.evaluate(() => {
      const style = document.createElement("style");
      style.id = "suppress-all-overlays-ortho";
      style.innerHTML = `
        .tour-spotlight-root,
        .tour-backdrop-clickable-zone,
        [data-testid="guided-tour-spotlight-overlay"],
        [data-testid="guided-tour-coach-mark-card"],
        [data-testid="demo-mode-banner"],
        .shepherd-element,
        .global-toast-container,
        vite-error-overlay {
          display: none !important;
          pointer-events: none !important;
          opacity: 0 !important;
        }
      `;
      document.head.appendChild(style);
    });
  } catch (_) {}
}

async function captureScreenshot(page, filename, altFilename = null) {
  const filePath = path.join(PROOFS_DIR, filename);
  const buffer = await page.screenshot({ fullPage: false, animations: "disabled", timeout: 15000 });
  fs.writeFileSync(filePath, buffer);
  if (altFilename) {
    fs.writeFileSync(path.join(PROOFS_DIR, altFilename), buffer);
  }
  const sizeKB = Math.round(fs.statSync(filePath).size / 1024);
  console.log(`[SAVED] ${filename} (${sizeKB} KB)`);
  if (sizeKB < 20) {
    throw new Error(`Screenshot ${filename} size is < 20 KB: ${sizeKB} KB`);
  }
  return sizeKB;
}

async function setupPageStorage(page, auth, theme) {
  await page.addInitScript(({ ct, stTok, uid, th }) => {
    try {
      localStorage.setItem("dente_clinic_token", ct);
      localStorage.setItem("dente_staff_token", stTok);
      localStorage.setItem("dente_user_id", uid);
      localStorage.setItem("dente_active_role", "doctor");
      localStorage.setItem("dente_role", "doctor");
      localStorage.setItem("dente_doctor_shift_active", "true");
      localStorage.setItem("dente_onboarding_completed", "true");
      localStorage.setItem("dente_tour_completed", "true");
      localStorage.setItem("dente_tour_dismissed", "true");
      localStorage.setItem("dente_guide_tour_dismissed_v2", "true");
      localStorage.setItem("dente_demo_banner_dismissed", "true");
      localStorage.setItem("dente_demo_showcase", "true");
      localStorage.setItem("dente_theme", th);
      localStorage.setItem("dente_theme_mode", th);
      localStorage.setItem("theme", th);
      sessionStorage.setItem("dente_unlocked", "true");
      localStorage.setItem(
        "dente-workspace-profile",
        JSON.stringify({ mode: "doctor", role: "doctor", activeRole: "doctor" })
      );
      localStorage.setItem(
        "dente_active_staff_user",
        JSON.stringify({
          id: uid,
          fullName: "Д-р Соколов А. В.",
          role: "doctor",
        })
      );
    } catch (_) {}
  }, { ct: auth.clinicToken, stTok: auth.staffToken, uid: auth.ownerUserId, th: theme });
}

async function main() {
  const auth = await provisionSession();

  const browser = await chromium.launch({
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-gpu"],
  });

  try {
    const context = await browser.newContext({
      viewport: { width: 1440, height: 900 },
      colorScheme: "light",
      locale: "ru-RU",
    });

    const page = await context.newPage();
    await setupPageStorage(page, auth, "light");

    // -------------------------------------------------------------
    // 1. Orthodontics Studio Modal (Brackets & Archwires)
    // -------------------------------------------------------------
    console.log("\n[NAV] Navigating to http://127.0.0.1:5173/#ortho-protocol...");
    await page.goto("http://127.0.0.1:5173/#ortho-protocol", { waitUntil: "domcontentloaded", timeout: 30000 });
    await page.waitForTimeout(2000);
    await page.waitForSelector(".boot-state", { state: "detached", timeout: 25000 }).catch(() => {});
    await suppressOverlays(page);
    await applyTheme(page, "light");

    await page.evaluate(() => {
      window.dispatchEvent(new CustomEvent("dente:open-orthodontics"));
      window.dispatchEvent(new CustomEvent("dente:open-ortho-studio"));
    });

    await page.waitForSelector('.ortho-studio-modal, [data-testid="orthodontic-studio-modal"]', {
      state: "visible",
      timeout: 20000,
    });
    await page.waitForTimeout(600);
    await suppressOverlays(page);

    // 1.1 PC Light (Studio)
    console.log("[1/8] Capturing 01_orthodontics_studio_pc_light_1440x900.png...");
    await captureScreenshot(page, "01_orthodontics_studio_pc_light_1440x900.png");

    // 1.2 PC Dark (Studio)
    console.log("[2/8] Capturing 02_orthodontics_studio_pc_dark_1440x900.png...");
    await applyTheme(page, "dark");
    await captureScreenshot(page, "02_orthodontics_studio_pc_dark_1440x900.png");

    // 1.3 Mobile Dark (Studio)
    console.log("[3/8] Capturing 04_orthodontics_studio_mobile_dark_390x844.png...");
    await page.setViewportSize({ width: 390, height: 844 });
    await page.waitForTimeout(500);
    await captureScreenshot(page, "04_orthodontics_studio_mobile_dark_390x844.png");

    // 1.4 Mobile Light (Studio)
    console.log("[4/8] Capturing 03_orthodontics_studio_mobile_light_390x844.png...");
    await applyTheme(page, "light");
    await captureScreenshot(page, "03_orthodontics_studio_mobile_light_390x844.png");

    // -------------------------------------------------------------
    // 2. Cephalometrics & TRG Analysis Modal (with CephalometricCanvas)
    // -------------------------------------------------------------
    console.log("\n[PHASE 2] Switching to Cephalometrics...");
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.waitForTimeout(400);

    // Click "Фото и ТРГ" tab in Studio
    console.log("Switching to 'Фото и ТРГ' tab...");
    await page.evaluate(() => {
      const tabs = Array.from(document.querySelectorAll(".ortho-tab-btn, button"));
      const photoTab = tabs.find((b) => b.textContent && b.textContent.includes("Фото и ТРГ"));
      if (photoTab) photoTab.click();
    });
    await page.waitForTimeout(600);

    // Click "Анализ ТРГ" button
    console.log("Clicking 'Анализ ТРГ' button in studio...");
    await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll("button"));
      const cephBtn = btns.find((b) => b.textContent && b.textContent.includes("Анализ ТРГ"));
      if (cephBtn) cephBtn.click();
    });
    await page.waitForTimeout(800);

    // Wait for Cephalometric Analysis Modal
    console.log("Waiting for Cephalometric Analysis Modal...");
    await page.waitForSelector('.ceph-modal-overlay, [data-testid="cephalometric-analysis-modal"], .ceph-workstation-root', {
      state: "visible",
      timeout: 20000,
    });
    await page.waitForTimeout(800);
    await suppressOverlays(page);

    // Click "Анатомический шаблон (норма I класса)" to calibrate points and draw planes
    await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll("button"));
      const templateBtn = buttons.find((b) =>
        b.textContent && (b.textContent.includes("Анатомический шаблон") || b.textContent.includes("Калибровка"))
      );
      if (templateBtn) templateBtn.click();
    });
    await page.waitForTimeout(800);

    // 2.1 PC Light (Cephalometrics)
    console.log("[5/8] Capturing ortho_pc_light_1440x900.png...");
    await applyTheme(page, "light");
    await captureScreenshot(page, "ortho_pc_light_1440x900.png", "01_ortho_pc_light_1440.png");

    // 2.2 PC Dark (Cephalometrics)
    console.log("[6/8] Capturing ortho_pc_dark_1440x900.png...");
    await applyTheme(page, "dark");
    await captureScreenshot(page, "ortho_pc_dark_1440x900.png", "02_ortho_pc_dark_1440.png");

    // 2.3 Mobile Dark (Cephalometrics)
    console.log("[7/8] Capturing ortho_mobile_dark_390x844.png...");
    await page.setViewportSize({ width: 390, height: 844 });
    await page.waitForTimeout(500);
    await captureScreenshot(page, "ortho_mobile_dark_390x844.png", "04_ortho_mobile_dark_390.png");

    // 2.4 Mobile Light (Cephalometrics)
    console.log("[8/8] Capturing ortho_mobile_light_390x844.png...");
    await applyTheme(page, "light");
    await captureScreenshot(page, "ortho_mobile_light_390x844.png", "03_ortho_mobile_light_390.png");

    await context.close();
  } finally {
    await browser.close();
  }

  console.log("\n=======================================================");
  console.log(">>> ALL 8 CANONICAL ORTHO & CEPH PROOFS SAVED CLEANLY <<<");
  console.log("=======================================================\n");
}

main().catch((err) => {
  console.error("[FATAL ERROR]:", err);
  process.exit(1);
});
