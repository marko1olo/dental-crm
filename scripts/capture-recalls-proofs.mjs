/**
 * scripts/capture-recalls-proofs.mjs
 * Red Team Visual Proof Suite for Patient Recalls Hub (#recalls)
 * Captures 4 High-Resolution Screenshots:
 * - 01_recalls_pc_light_1440x900.png
 * - 02_recalls_pc_dark_1440x900.png
 * - 03_recalls_mobile_light_390x844.png
 * - 04_recalls_mobile_dark_390x844.png
 */

import { existsSync, mkdirSync, copyFileSync, statSync } from "node:fs";
import path from "node:path";
import { chromium } from "playwright";

const API_BASE = "http://127.0.0.1:4100";
const APP_BASE = "http://127.0.0.1:5173";

const OUT_DIRS = [
  path.join(process.cwd(), "docs/proofs/recalls"),
  path.resolve("C:/Users/Admin/.gemini/antigravity/brain/d9c4b7bd-d11e-41fe-8a40-1186f02e25bc"),
];

for (const dir of OUT_DIRS) {
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }
}

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function applyTheme(page, theme) {
  await page.evaluate((th) => {
    document.documentElement.setAttribute("data-theme", th);
    const isDark = th === "dark";
    document.documentElement.classList.toggle("dark", isDark);
    document.documentElement.classList.toggle("light", !isDark);
    document.body.className = isDark ? "dark" : "light";
    document.documentElement.style.colorScheme = isDark ? "dark" : "light";
    localStorage.setItem("dente_theme_mode", th);
    if (window.__useThemeStore) {
      window.__useThemeStore.getState().setThemeMode(th);
    }
  }, theme);
  await wait(800);
}

async function saveProof(page, filename, description) {
  const primaryPath = path.join(OUT_DIRS[0], filename);
  await page.screenshot({ path: primaryPath, fullPage: false });
  const stat = statSync(primaryPath);
  if (stat.size < 20480) {
    throw new Error(`[BLANK DETECTED] Screenshot ${filename} is only ${stat.size} bytes (required >= 20480)!`);
  }
  console.log(`[PROOF CAPTURED] ${filename} (${stat.size} bytes) -> ${description}`);
  for (let i = 1; i < OUT_DIRS.length; i++) {
    const targetPath = path.join(OUT_DIRS[i], filename);
    copyFileSync(primaryPath, targetPath);
  }
  return primaryPath;
}

async function main() {
  console.log("=== STARTING RECALLS 4-STATE VISUAL PROOF SUITE ===");
  console.log("1. Authenticating with API...");
  let auth = { clinicToken: "", staffToken: "" };
  try {
    const loginRes = await fetch(`${API_BASE}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: "admin@clinic.ru", password: "Password123!" }),
    });
    if (loginRes.ok) {
      auth = await loginRes.json();
      console.log("API Auth success. clinicToken:", Boolean(auth.clinicToken), "staffToken:", Boolean(auth.staffToken));
    }
  } catch (err) {
    console.warn("API login bypass, proceeding to demo launcher:", err.message);
  }

  const browser = await chromium.launch({
    headless: true,
    executablePath: "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
    args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-web-security"],
  });

  try {
    // ----------------------------------------------------
    // 1. PC CONTEXT (1440x900)
    // ----------------------------------------------------
    console.log("\n[PC] Launching PC 1440x900 viewport...");
    const pcContext = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    await pcContext.addInitScript(({ ct, st, uid }) => {
      if (ct) localStorage.setItem("dente_clinic_token", ct);
      if (st) localStorage.setItem("dente_staff_token", st);
      localStorage.setItem("dente_active_role", "owner");
      localStorage.setItem("dente_user_id", uid || "owner_1");
      localStorage.setItem("dente_onboarding_completed", "true");
      localStorage.setItem("dente_tour_completed", "true");
      localStorage.setItem("dente_ui_preferences_v1", JSON.stringify({
        onboardingDismissed: true,
        onboardingStep: "done",
        version: 1,
      }));
    }, { ct: auth.clinicToken, st: auth.staffToken, uid: auth.ownerUserId });

    if (auth.clinicToken) {
      await pcContext.addCookies([
        { name: "dente_clinic_token", value: auth.clinicToken, domain: "127.0.0.1", path: "/" },
        { name: "dente_staff_token", value: auth.staffToken, domain: "127.0.0.1", path: "/" },
      ]);
    }

    const pcPage = await pcContext.newPage();
    console.log("[PC] Navigating to http://127.0.0.1:5173/?recalls=1#recalls ...");
    await pcPage.goto(`${APP_BASE}/?recalls=1#recalls`, { waitUntil: "commit", timeout: 90000 });
    console.log("[PC] Navigation committed. Waiting for modal element...");

    const pcModal = pcPage.locator('[data-testid="patient-recalls-hub-modal"]');
    await pcModal.waitFor({ state: "visible", timeout: 60000 });
    console.log("[PC] PatientRecallsHubModal is visible!");
    await wait(2000);

    // Capture Proof 1: PC Light (1440x900)
    console.log("[PROOF 1] Capturing PC Light (1440x900)...");
    await applyTheme(pcPage, "light");
    await wait(1000);
    await saveProof(pcPage, "01_recalls_pc_light_1440x900.png", "PC Light Patient Recalls Registry (1440x900)");

    // Capture Proof 2: PC Dark (1440x900)
    console.log("[PROOF 2] Capturing PC Dark (1440x900)...");
    await applyTheme(pcPage, "dark");
    await wait(1000);
    await saveProof(pcPage, "02_recalls_pc_dark_1440x900.png", "PC Dark Patient Recalls Registry (1440x900)");

    await pcContext.close();

    // ----------------------------------------------------
    // 2. MOBILE CONTEXT (390x844 - iPhone 14 / Apple HIG)
    // ----------------------------------------------------
    console.log("\n[MOBILE] Launching Mobile 390x844 viewport...");
    const mobileContext = await browser.newContext({
      viewport: { width: 390, height: 844 },
      isMobile: true,
      hasTouch: true,
      deviceScaleFactor: 2,
    });
    await mobileContext.addInitScript(({ ct, st, uid }) => {
      if (ct) localStorage.setItem("dente_clinic_token", ct);
      if (st) localStorage.setItem("dente_staff_token", st);
      localStorage.setItem("dente_active_role", "owner");
      localStorage.setItem("dente_user_id", uid || "owner_1");
      localStorage.setItem("dente_onboarding_completed", "true");
      localStorage.setItem("dente_tour_completed", "true");
      localStorage.setItem("dente_ui_preferences_v1", JSON.stringify({
        onboardingDismissed: true,
        onboardingStep: "done",
        version: 1,
      }));
    }, { ct: auth.clinicToken, st: auth.staffToken, uid: auth.ownerUserId });

    if (auth.clinicToken) {
      await mobileContext.addCookies([
        { name: "dente_clinic_token", value: auth.clinicToken, domain: "127.0.0.1", path: "/" },
        { name: "dente_staff_token", value: auth.staffToken, domain: "127.0.0.1", path: "/" },
      ]);
    }

    const mobilePage = await mobileContext.newPage();
    console.log("[MOBILE] Navigating to http://127.0.0.1:5173/?recalls=1#recalls ...");
    await mobilePage.goto(`${APP_BASE}/?recalls=1#recalls`, { waitUntil: "commit", timeout: 90000 });
    console.log("[MOBILE] Navigation committed. Waiting for modal element...");

    const mobileModal = mobilePage.locator('[data-testid="patient-recalls-hub-modal"]');
    await mobileModal.waitFor({ state: "visible", timeout: 60000 });
    console.log("[MOBILE] PatientRecallsHubModal is visible on mobile!");
    await wait(2000);

    // Capture Proof 3: Mobile Light (390x844)
    console.log("[PROOF 3] Capturing Mobile Light (390x844)...");
    await applyTheme(mobilePage, "light");
    await wait(1000);
    await saveProof(mobilePage, "03_recalls_mobile_light_390x844.png", "Mobile Light Patient Recalls (390x844)");

    // Capture Proof 4: Mobile Dark (390x844)
    console.log("[PROOF 4] Capturing Mobile Dark (390x844)...");
    await applyTheme(mobilePage, "dark");
    await wait(1000);
    await saveProof(mobilePage, "04_recalls_mobile_dark_390x844.png", "Mobile Dark Patient Recalls (390x844)");

    await mobileContext.close();

    console.log("\n=== ALL 4 RECALLS PROOFS SUCCESSFULLY CAPTURED ===");
  } finally {
    await browser.close();
  }
}

main().catch((err) => {
  console.error("FATAL ERROR in capture-recalls-proofs:", err);
  process.exit(1);
});
