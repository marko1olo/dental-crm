import { existsSync, mkdirSync, statSync } from "node:fs";
import path from "node:path";
import { chromium } from "playwright";

const PROOFS_DIR = "C:/Clinic_MVP/dental-crm/docs/proofs/orthopedics_warranty";
mkdirSync(PROOFS_DIR, { recursive: true });

const browserCandidates = [
  "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
  "C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe",
  "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
  "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe",
];
const executablePath = browserCandidates.find((p) => existsSync(p));
if (!executablePath) {
  throw new Error("No browser executable found in candidates");
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

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
      document.querySelectorAll("vite-error-overlay, .tour-spotlight-root, [data-testid='guided-tour-spotlight-overlay'], .toast, .connection-toast").forEach((el) => el.remove());
    });
  } catch (_) {}
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
  await sleep(400);
}

async function openPassportModal(page) {
  await page.evaluate(() => {
    const btn = document.querySelector('[data-testid="open-orthopedic-passport-btn"]');
    if (btn) {
      btn.scrollIntoView({ behavior: "instant", block: "center" });
      btn.click();
    }
  });
  await sleep(700);
  await page.waitForSelector('[data-testid="orthopedic-passport-modal"]', { timeout: 10000 });
  await suppressOverlays(page);
  await sleep(400);
}

async function closePassportModal(page) {
  await page.evaluate(() => {
    const closeBtn = document.querySelector('[data-testid="passport-close-btn"]') ||
      document.querySelector('[data-testid="orthopedic-passport-modal"] button[aria-label="Закрыть"]') ||
      Array.from(document.querySelectorAll('[data-testid="orthopedic-passport-modal"] button')).find((b) => b.textContent?.includes("Закрыть"));
    if (closeBtn) closeBtn.click();
  });
  await sleep(600);
}

async function capture() {
  console.log("🚀 Launching browser for Orthopedics & Warranty 4-State Proofs...");
  const browser = await chromium.launch({
    headless: true,
    executablePath,
    args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-gpu", "--disable-dev-shm-usage"],
  });

  try {
    const context = await browser.newContext({
      viewport: { width: 1440, height: 900 },
      deviceScaleFactor: 1,
      locale: "ru-RU",
    });

    await context.addInitScript(() => {
      try {
        localStorage.setItem("dente_demo_showcase", "true");
        localStorage.setItem("dente_clinic_token", "demo-clinic-token");
        localStorage.setItem("dente_staff_token", "demo-staff-token");
        localStorage.setItem("dente_active_session_token", "demo-staff-token");
        localStorage.setItem("dente_onboarding_completed", "true");
        localStorage.setItem("dente_tour_completed", "true");
        localStorage.setItem("dente_tour_dismissed", "true");
        localStorage.setItem("dente_guide_tour_dismissed_v2", "true");
        localStorage.setItem("dente_role", "doctor");
        localStorage.setItem("dente_active_role", "doctor");
        sessionStorage.setItem("dente_unlocked", "true");
      } catch (_) {}
    });

    const page = await context.newPage();
    console.log("Navigating to http://127.0.0.1:5173/?standalone=orthopedics#orthopedics...");
    await page.goto("http://127.0.0.1:5173/?standalone=orthopedics#orthopedics", { waitUntil: "domcontentloaded", timeout: 25000 });
    await sleep(1500);
    await suppressOverlays(page);

    // Ensure orthopedics panel is open
    await page.evaluate(() => {
      window.dispatchEvent(new CustomEvent("dente:open-orthopedics", { detail: { toothFdi: "16" } }));
    });
    await sleep(800);
    await page.waitForSelector('[data-testid="orthopedics-chairside-panel"]', { timeout: 15000 });

    // 1. PC Light (1440x900) — Orthopedics Chairside Panel
    {
      console.log("\n📸 [1/4] Capturing 01_orthopedics_pc_light_1440x900.png...");
      await page.setViewportSize({ width: 1440, height: 900 });
      await applyTheme(page, "light");
      await suppressOverlays(page);
      await sleep(400);

      const filePath = path.join(PROOFS_DIR, "01_orthopedics_pc_light_1440x900.png");
      await page.screenshot({ path: filePath });
      const size = statSync(filePath).size;
      console.log(`✅ Saved: ${filePath} (${(size / 1024).toFixed(1)} KB)`);
      if (size < 20000) throw new Error(`File too small: ${size} bytes`);
    }

    // 2. PC Dark (1440x900) — Warranty Passport A4 Modal with QR code
    {
      console.log("\n📸 [2/4] Capturing 02_orthopedics_pc_dark_1440x900.png...");
      await page.setViewportSize({ width: 1440, height: 900 });
      await applyTheme(page, "dark");
      await suppressOverlays(page);
      await openPassportModal(page);

      const filePath = path.join(PROOFS_DIR, "02_orthopedics_pc_dark_1440x900.png");
      await page.screenshot({ path: filePath });
      const size = statSync(filePath).size;
      console.log(`✅ Saved: ${filePath} (${(size / 1024).toFixed(1)} KB)`);
      if (size < 20000) throw new Error(`File too small: ${size} bytes`);
      await closePassportModal(page);
    }

    // 3. Mobile Light (390x844) — Orthopedics Chairside Apple HIG
    {
      console.log("\n📸 [3/4] Capturing 03_orthopedics_mobile_light_390x844.png...");
      await page.setViewportSize({ width: 390, height: 844 });
      await applyTheme(page, "light");
      await suppressOverlays(page);
      await sleep(400);

      const filePath = path.join(PROOFS_DIR, "03_orthopedics_mobile_light_390x844.png");
      await page.screenshot({ path: filePath });
      const size = statSync(filePath).size;
      console.log(`✅ Saved: ${filePath} (${(size / 1024).toFixed(1)} KB)`);
      if (size < 20000) throw new Error(`File too small: ${size} bytes`);
    }

    // 4. Mobile Dark (390x844) — Warranty Passport A4 Mobile Dark
    {
      console.log("\n📸 [4/4] Capturing 04_orthopedics_mobile_dark_390x844.png...");
      await page.setViewportSize({ width: 390, height: 844 });
      await applyTheme(page, "dark");
      await suppressOverlays(page);
      await openPassportModal(page);

      const filePath = path.join(PROOFS_DIR, "04_orthopedics_mobile_dark_390x844.png");
      await page.screenshot({ path: filePath });
      const size = statSync(filePath).size;
      console.log(`✅ Saved: ${filePath} (${(size / 1024).toFixed(1)} KB)`);
      if (size < 20000) throw new Error(`File too small: ${size} bytes`);
      await closePassportModal(page);
    }

    console.log("\n🎉 All 4-State Proofs captured successfully!");
  } finally {
    await browser.close();
  }
}

capture().catch((err) => {
  console.error("❌ Capture failed:", err);
  process.exit(1);
});
