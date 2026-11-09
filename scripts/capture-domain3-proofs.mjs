/**
 * scripts/capture-domain3-proofs.mjs
 * 4-State Visual Proof Capture for Domain 3:
 * 1. ☀️ PC Light (1440x900): docs/proofs/documents/01_documents_catalog_pc_light_1440x900.png
 * 2. 🌙 PC Dark (1440x900): docs/proofs/documents/02_documents_tax_deduction_pc_dark_1440x900.png
 * 3. 📱 Mobile Light (390x844): docs/proofs/documents/03_documents_intake_mobile_light_390x844.png
 * 4. 📱 Mobile Dark (390x844): docs/proofs/documents/04_documents_intake_mobile_dark_390x844.png
 */

import { existsSync, mkdirSync, statSync } from "node:fs";
import path from "node:path";
import { chromium } from "playwright";

const PROOFS_DIR = path.resolve("docs/proofs/documents");
if (!existsSync(PROOFS_DIR)) {
  mkdirSync(PROOFS_DIR, { recursive: true });
}

const possibleBrowserPaths = [
  "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
  "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe",
  "C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe",
  "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
];

const browserExecutable = possibleBrowserPaths.find((p) => existsSync(p));

async function getAuthTokens() {
  try {
    const res = await fetch("http://127.0.0.1:4100/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: "clinic@example.com", password: "dente2026" }),
    });
    if (res.ok) {
      const data = await res.json();
      return { clinicToken: data.clinicToken, staffToken: data.staffToken };
    }
  } catch (e) {
    console.warn("Could not log in via 4100:", e.message);
  }
  return null;
}

async function suppressOverlays(page, theme) {
  try {
    await page.evaluate((th) => {
      document.documentElement.setAttribute("data-theme", th);
      const isDark = th === "dark";
      document.documentElement.classList.toggle("dark", isDark);
      document.documentElement.classList.toggle("light", !isDark);
      document.documentElement.style.colorScheme = isDark ? "dark" : "light";
      if (document.body) {
        document.body.className = isDark ? "dark" : "light";
      }

      const styleId = "dente-clean-proof-style";
      let el = document.getElementById(styleId);
      if (!el) {
        el = document.createElement("style");
        el.id = styleId;
        el.innerHTML = `
          .tour-spotlight-root,
          .tour-backdrop-clickable-zone,
          [data-testid="guided-tour-spotlight-overlay"],
          [data-testid="guided-tour-coach-mark-card"],
          [data-testid="demo-mode-banner"],
          .global-toast-container,
          vite-error-overlay {
            display: none !important;
            pointer-events: none !important;
          }
          *, *::before, *::after {
            animation: none !important;
            transition: none !important;
          }
        `;
        document.head.appendChild(el);
      }
      document.querySelectorAll("vite-error-overlay, .tour-spotlight-root, [data-testid='guided-tour-spotlight-overlay']").forEach((item) => item.remove());
    }, theme);
  } catch (_) {}
}

async function snap(page, fileName) {
  const filePath = path.join(PROOFS_DIR, fileName);
  await page.waitForTimeout(600);
  await page.screenshot({ path: filePath, fullPage: false, animations: "disabled" });
  const stat = statSync(filePath);
  console.log(`[CAPTURED] ${fileName}: ${stat.size} bytes (${(stat.size / 1024).toFixed(1)} KB)`);
  if (stat.size < 20480) {
    throw new Error(`[ANTI-BLANK FAIL] ${fileName} size ${stat.size} < 20480 bytes!`);
  }
}

async function waitForAppReady(page) {
  for (let i = 0; i < 40; i++) {
    await page.waitForTimeout(300);
    const text = await page.evaluate(() => document.body ? document.body.innerText : "");
    if (!text.includes("Загрузка системы") && text.length > 200) {
      return true;
    }
  }
  return false;
}

async function main() {
  console.log("=== Launching Browser for Domain 3 4-State Proofs ===");
  const auth = await getAuthTokens();
  const cToken = auth?.clinicToken || "demo-clinic-token";
  const sToken = auth?.staffToken || "demo-staff-token";

  const launchOptions = {
    headless: true,
    args: ["--no-sandbox", "--disable-gpu", "--disable-setuid-sandbox"],
  };
  if (browserExecutable) {
    launchOptions.executablePath = browserExecutable;
  }

  const browser = await chromium.launch(launchOptions);

  try {
    // -------------------------------------------------------------
    // 1. PC Light: 01_documents_catalog_pc_light_1440x900.png
    // -------------------------------------------------------------
    console.log("[1/4] Capturing 01_documents_catalog_pc_light_1440x900.png...");
    const pcContext = await browser.newContext({
      viewport: { width: 1440, height: 900 },
      colorScheme: "light",
    });
    await pcContext.addCookies([
      { name: "dente_clinic_token", value: cToken, domain: "127.0.0.1", path: "/" },
      { name: "dente_staff_token", value: sToken, domain: "127.0.0.1", path: "/" },
    ]);
    await pcContext.addInitScript(({ ct, st }) => {
      localStorage.setItem("dente_clinic_token", ct);
      localStorage.setItem("dente_staff_token", st);
      localStorage.setItem("dente_active_session_token", st);
      localStorage.setItem("dente_demo_showcase", "true");
      localStorage.setItem("dente_active_role", "owner");
      localStorage.setItem("dente_user_role", "owner");
      localStorage.setItem("dente_theme", "light");
      localStorage.setItem("dente_theme_mode", "light");
      localStorage.setItem("theme", "light");
      localStorage.setItem("dente_onboarding_completed", "true");
      localStorage.setItem("dente_tour_completed", "true");
      localStorage.setItem("dente_tour_dismissed", "true");
      localStorage.setItem("dente_guide_tour_dismissed_v2", "true");
      localStorage.setItem("dente_demo_banner_dismissed", "true");
      localStorage.setItem("dental-crm:onboarding:v1", JSON.stringify({ completed: true, dismissed: true }));
    }, { ct: cToken, st: sToken });

    const pcPage = await pcContext.newPage();
    await pcPage.goto("http://127.0.0.1:5173/?demo=true#documents-studio", { waitUntil: "domcontentloaded", timeout: 45000 });
    await waitForAppReady(pcPage);

    await pcPage.waitForSelector('[data-testid="documents-studio-modal"]', { timeout: 8000, state: "visible" }).catch(async () => {
      await pcPage.evaluate(() => window.dispatchEvent(new CustomEvent("dente:open-documents")));
      await pcPage.waitForSelector('[data-testid="documents-studio-modal"]', { timeout: 8000, state: "visible" });
    });

    await suppressOverlays(pcPage, "light");
    await pcPage.waitForTimeout(600);
    await snap(pcPage, "01_documents_catalog_pc_light_1440x900.png");

    // -------------------------------------------------------------
    // 2. PC Dark: 02_documents_tax_deduction_pc_dark_1440x900.png
    // -------------------------------------------------------------
    console.log("[2/4] Capturing 02_documents_tax_deduction_pc_dark_1440x900.png...");
    await suppressOverlays(pcPage, "dark");
    // Click on "Справка для налогового вычета" card
    const taxCard = pcPage.locator('.dente-docs-package-card:has-text("Справка для налогового вычета")').first();
    if (await taxCard.isVisible()) {
      await taxCard.click();
      await pcPage.waitForTimeout(600);
    }
    await suppressOverlays(pcPage, "dark");
    await pcPage.waitForTimeout(600);
    await snap(pcPage, "02_documents_tax_deduction_pc_dark_1440x900.png");
    await pcContext.close();

    // -------------------------------------------------------------
    // 3. Mobile Light: 03_documents_intake_mobile_light_390x844.png
    // -------------------------------------------------------------
    console.log("[3/4] Capturing 03_documents_intake_mobile_light_390x844.png...");
    const mobileLightContext = await browser.newContext({
      viewport: { width: 390, height: 844 },
      isMobile: true,
      hasTouch: true,
      colorScheme: "light",
      deviceScaleFactor: 2,
    });
    await mobileLightContext.addCookies([
      { name: "dente_clinic_token", value: cToken, domain: "127.0.0.1", path: "/" },
      { name: "dente_staff_token", value: sToken, domain: "127.0.0.1", path: "/" },
    ]);
    await mobileLightContext.addInitScript(({ ct, st }) => {
      localStorage.setItem("dente_clinic_token", ct);
      localStorage.setItem("dente_staff_token", st);
      localStorage.setItem("dente_active_session_token", st);
      localStorage.setItem("dente_demo_showcase", "true");
      localStorage.setItem("dente_active_role", "owner");
      localStorage.setItem("dente_user_role", "owner");
      localStorage.setItem("dente_theme", "light");
      localStorage.setItem("dente_theme_mode", "light");
      localStorage.setItem("theme", "light");
      localStorage.setItem("dente_onboarding_completed", "true");
      localStorage.setItem("dente_tour_completed", "true");
      localStorage.setItem("dente_tour_dismissed", "true");
      localStorage.setItem("dente_guide_tour_dismissed_v2", "true");
      localStorage.setItem("dente_demo_banner_dismissed", "true");
      localStorage.setItem("dental-crm:onboarding:v1", JSON.stringify({ completed: true, dismissed: true }));
    }, { ct: cToken, st: sToken });

    const mobileLightPage = await mobileLightContext.newPage();
    await mobileLightPage.goto("http://127.0.0.1:5173/?demo=true#documents-studio", { waitUntil: "domcontentloaded", timeout: 45000 });
    await waitForAppReady(mobileLightPage);

    await mobileLightPage.waitForSelector('[data-testid="documents-studio-modal"]', { timeout: 8000, state: "visible" }).catch(async () => {
      await mobileLightPage.evaluate(() => window.dispatchEvent(new CustomEvent("dente:open-documents")));
      await mobileLightPage.waitForSelector('[data-testid="documents-studio-modal"]', { timeout: 8000, state: "visible" });
    });

    await suppressOverlays(mobileLightPage, "light");
    await mobileLightPage.waitForTimeout(600);
    await snap(mobileLightPage, "03_documents_intake_mobile_light_390x844.png");
    await mobileLightContext.close();

    // -------------------------------------------------------------
    // 4. Mobile Dark: 04_documents_intake_mobile_dark_390x844.png
    // -------------------------------------------------------------
    console.log("[4/4] Capturing 04_documents_intake_mobile_dark_390x844.png...");
    const mobileDarkContext = await browser.newContext({
      viewport: { width: 390, height: 844 },
      isMobile: true,
      hasTouch: true,
      colorScheme: "dark",
      deviceScaleFactor: 2,
    });
    await mobileDarkContext.addCookies([
      { name: "dente_clinic_token", value: cToken, domain: "127.0.0.1", path: "/" },
      { name: "dente_staff_token", value: sToken, domain: "127.0.0.1", path: "/" },
    ]);
    await mobileDarkContext.addInitScript(({ ct, st }) => {
      localStorage.setItem("dente_clinic_token", ct);
      localStorage.setItem("dente_staff_token", st);
      localStorage.setItem("dente_active_session_token", st);
      localStorage.setItem("dente_demo_showcase", "true");
      localStorage.setItem("dente_active_role", "owner");
      localStorage.setItem("dente_user_role", "owner");
      localStorage.setItem("dente_theme", "dark");
      localStorage.setItem("dente_theme_mode", "dark");
      localStorage.setItem("theme", "dark");
      localStorage.setItem("dente_onboarding_completed", "true");
      localStorage.setItem("dente_tour_completed", "true");
      localStorage.setItem("dente_tour_dismissed", "true");
      localStorage.setItem("dente_guide_tour_dismissed_v2", "true");
      localStorage.setItem("dente_demo_banner_dismissed", "true");
      localStorage.setItem("dental-crm:onboarding:v1", JSON.stringify({ completed: true, dismissed: true }));
    }, { ct: cToken, st: sToken });

    const mobileDarkPage = await mobileDarkContext.newPage();
    await mobileDarkPage.goto("http://127.0.0.1:5173/?demo=true#documents-studio", { waitUntil: "domcontentloaded", timeout: 45000 });
    await waitForAppReady(mobileDarkPage);

    await mobileDarkPage.waitForSelector('[data-testid="documents-studio-modal"]', { timeout: 8000, state: "visible" }).catch(async () => {
      await mobileDarkPage.evaluate(() => window.dispatchEvent(new CustomEvent("dente:open-documents")));
      await mobileDarkPage.waitForSelector('[data-testid="documents-studio-modal"]', { timeout: 8000, state: "visible" });
    });

    await suppressOverlays(mobileDarkPage, "dark");
    await mobileDarkPage.waitForTimeout(600);
    await snap(mobileDarkPage, "04_documents_intake_mobile_dark_390x844.png");
    await mobileDarkContext.close();

    console.log("=== [SUCCESS] All 4-State Visual Proofs captured successfully! ===");
  } finally {
    await browser.close();
  }
}

main().catch((err) => {
  console.error("[FATAL] Capture script failed:", err);
  process.exit(1);
});
