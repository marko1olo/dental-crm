import { existsSync, mkdirSync, writeFileSync, copyFileSync, statSync } from "node:fs";
import path from "node:path";
import { chromium, devices } from "playwright";

const PROOF_DIR = "C:/Clinic_MVP/dental-crm/docs/proofs/pediatric";
const BRAIN_DIR = "C:/Users/Admin/.gemini/antigravity/brain/d846e5e4-38b4-456a-b68e-8b7b2d6f14a3";

for (const d of [PROOF_DIR, BRAIN_DIR]) {
  if (!existsSync(d)) {
    mkdirSync(d, { recursive: true });
  }
}

function verifyAndSave(buf, filename, desc) {
  if (buf.length < 20480) {
    throw new Error(`[BYTE-GUARD FAILED] Screenshot ${filename} is too small: ${buf.length} bytes (<20KB)`);
  }
  const p1 = path.join(PROOF_DIR, filename);
  writeFileSync(p1, buf);
  try {
    copyFileSync(p1, path.join(BRAIN_DIR, filename));
  } catch (_) {}
  const size = statSync(p1).size;
  console.log(`[CAPTURED] ${filename}: ${size} bytes (>= 20KB OK) -> ${desc}`);
}

async function injectStorage(context, theme = "light") {
  await context.addInitScript(({ th }) => {
    localStorage.setItem("dente_clinic_token", "demo-clinic-token");
    localStorage.setItem("dente_staff_token", "demo-staff-token");
    localStorage.setItem("dente_active_session_token", "demo-staff-token");
    localStorage.setItem("dente_active_role", "doctor");
    localStorage.setItem("dente_active_user_id", "doc-1");
    localStorage.setItem("dental-crm:active-user:v1", JSON.stringify({ id: "doc-1", role: "doctor", fullName: "Д-р Соколов А. В." }));
    localStorage.setItem("dente_theme_mode", th);
    localStorage.setItem("dente_theme", th);
    localStorage.setItem("theme", th);
    localStorage.setItem("dente_onboarding_completed", "true");
    localStorage.setItem("dente_tour_completed", "true");
    localStorage.setItem("dente_tour_dismissed", "true");
    localStorage.setItem("dente_guide_tour_dismissed_v2", "true");
    localStorage.setItem("dente_demo_banner_dismissed", "true");
    localStorage.setItem("dental-crm:onboarding:v1", JSON.stringify({ completed: true, dismissed: true }));
    localStorage.setItem("dental-crm:web-ui-preferences:v1", JSON.stringify({
      version: 1,
      uiLanguage: "ru",
      selectedWorkspaceRole: "doctor",
      onboardingDismissed: true,
      onboardingStep: "done",
    }));
  }, { th: theme });
}

async function suppressOverlays(page) {
  try {
    await page.evaluate(() => {
      const style = document.createElement("style");
      style.id = "suppress-all-overlays";
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
        *, *::before, *::after {
          animation: none !important;
          transition: none !important;
        }
      `;
      document.head.appendChild(style);
      document.querySelectorAll("vite-error-overlay, .tour-spotlight-root, [data-testid='guided-tour-spotlight-overlay']").forEach((el) => el.remove());
    });
  } catch (_) {}
}

async function setTheme(page, theme) {
  await page.evaluate((th) => {
    document.documentElement.setAttribute("data-theme", th);
    if (th === "dark") {
      document.documentElement.classList.add("dark");
      document.documentElement.classList.remove("light");
    } else {
      document.documentElement.classList.add("light");
      document.documentElement.classList.remove("dark");
    }
    try {
      localStorage.setItem("dente_theme", th);
      localStorage.setItem("dente_theme_mode", th);
      localStorage.setItem("theme", th);
      document.documentElement.style.colorScheme = th;
    } catch (_) {}
  }, theme);
  await suppressOverlays(page);
  await page.waitForTimeout(500);
}

async function main() {
  console.log("=== CAPTURING PEDIATRIC DENTITION 4-STATE PROOFS (FDI 51–85) ===");
  const browser = await chromium.launch({
    headless: true,
    args: [
      "--no-sandbox",
      "--disable-gpu",
      "--disable-dev-shm-usage",
      "--proxy-server=direct://",
      "--proxy-bypass-list=*",
    ],
  });

  try {
    // 1. PC CONTEXT (1440x900)
    console.log("1. Desktop PC Session (1440x900)...");
    const pcContext = await browser.newContext({
      viewport: { width: 1440, height: 900 },
      deviceScaleFactor: 1,
    });
    await injectStorage(pcContext, "light");
    const pcPage = await pcContext.newPage();
    console.log("Navigating PC to http://127.0.0.1:5173/?demo=true#pediatric...");
    await pcPage.goto("http://127.0.0.1:5173/?demo=true#pediatric", { waitUntil: "commit", timeout: 45000 });
    
    console.log("Waiting for .boot-state detachment on PC...");
    await pcPage.waitForSelector(".boot-state", { state: "detached", timeout: 40000 });
    await pcPage.waitForTimeout(1000);
    await suppressOverlays(pcPage);

    // Trigger open pediatric event if modal not yet in DOM
    await pcPage.evaluate(() => {
      window.dispatchEvent(new CustomEvent("dente-open-pediatric"));
      window.dispatchEvent(new CustomEvent("dente:open-pediatric"));
    });

    // Wait for pediatric modal
    console.log("Waiting for modal title on PC...");
    await pcPage.waitForSelector("#pediatric-modal-title", { state: "visible", timeout: 35000 });
    await pcPage.waitForTimeout(800);
    await suppressOverlays(pcPage);

    // 1.1 PC Light
    await setTheme(pcPage, "light");
    const pcLightBuf = await pcPage.screenshot({ fullPage: false });
    verifyAndSave(pcLightBuf, "01_pediatric_dentition_pc_light_1440x900.png", "Pediatric Dentition FDI 51–85 (PC Light 1440x900)");

    // 1.2 PC Dark
    await setTheme(pcPage, "dark");
    const pcDarkBuf = await pcPage.screenshot({ fullPage: false });
    verifyAndSave(pcDarkBuf, "02_pediatric_dentition_pc_dark_1440x900.png", "Pediatric Dentition FDI 51–85 (PC Dark 1440x900)");
    await pcContext.close();

    // 2. MOBILE CONTEXT (390x844 Apple HIG)
    console.log("2. Mobile Session 390x844 (Apple HIG)...");
    const mobContext = await browser.newContext({
      ...devices["iPhone 13"],
      viewport: { width: 390, height: 844 },
    });
    await injectStorage(mobContext, "light");
    const mobPage = await mobContext.newPage();
    console.log("Navigating Mobile to http://127.0.0.1:5173/?demo=true#pediatric...");
    await mobPage.goto("http://127.0.0.1:5173/?demo=true#pediatric", { waitUntil: "commit", timeout: 45000 });
    
    console.log("Waiting for .boot-state detachment on Mobile...");
    await mobPage.waitForSelector(".boot-state", { state: "detached", timeout: 40000 });
    await mobPage.waitForTimeout(1000);
    await suppressOverlays(mobPage);

    await mobPage.evaluate(() => {
      window.dispatchEvent(new CustomEvent("dente-open-pediatric"));
      window.dispatchEvent(new CustomEvent("dente:open-pediatric"));
    });

    console.log("Waiting for mobile modal title...");
    await mobPage.waitForSelector("#pediatric-modal-title", { state: "visible", timeout: 35000 });
    await mobPage.waitForTimeout(800);
    await suppressOverlays(mobPage);

    // 2.1 Mobile Light
    await setTheme(mobPage, "light");
    const mobLightBuf = await mobPage.screenshot({ fullPage: false });
    verifyAndSave(mobLightBuf, "03_pediatric_dentition_mobile_light_390x844.png", "Pediatric Dentition FDI 51–85 (Mobile Light 390x844)");

    // 2.2 Mobile Dark
    await setTheme(mobPage, "dark");
    const mobDarkBuf = await mobPage.screenshot({ fullPage: false });
    verifyAndSave(mobDarkBuf, "04_pediatric_dentition_mobile_dark_390x844.png", "Pediatric Dentition FDI 51–85 (Mobile Dark 390x844)");
    await mobContext.close();

    console.log("=== ALL 4-STATE PEDIATRIC PROOFS CAPTURED SUCCESSFULLY! ===");
  } finally {
    await browser.close();
  }
}

main().catch((err) => {
  console.error("FATAL ERROR in main:", err);
  process.exit(1);
});
