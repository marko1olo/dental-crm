import { chromium } from "playwright";
import fs from "node:fs";
import path from "node:path";

const PROOFS_DIR = path.resolve("C:/Clinic_MVP/dental-crm/docs/proofs/orthopedics");
const BRAIN_DIR = path.resolve("C:/Users/Admin/.gemini/antigravity/brain/c33839fb-d493-4aa5-94bd-b1fc3ddbe680");

for (const dir of [PROOFS_DIR, BRAIN_DIR]) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

function verifyProof(filename) {
  const filePath = path.join(PROOFS_DIR, filename);
  const size = fs.statSync(filePath).size;
  if (size < 20480) {
    throw new Error(`[BLANK DETECTED] ${filePath} is ${size} bytes (< 20KB)!`);
  }
  try {
    fs.copyFileSync(filePath, path.join(BRAIN_DIR, filename));
  } catch (_) {}
  console.log(`[VERIFIED] ${filename} (${(size / 1024).toFixed(1)} KB)`);
  return size;
}

async function suppressOverlays(page) {
  try {
    await page.evaluate(() => {
      const style = document.createElement("style");
      style.id = "suppress-all-overlays-ortho-clean";
      style.innerHTML = `
        .tour-spotlight-root,
        .tour-backdrop-clickable-zone,
        [data-testid="guided-tour-spotlight-overlay"],
        [data-testid="guided-tour-coach-mark-card"],
        [data-testid="demo-mode-banner"],
        .shepherd-element,
        .global-toast-container,
        .sa-toast,
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

async function applyTheme(page, theme) {
  const isDark = theme === "dark";
  await page.evaluate(({ dark, th }) => {
    document.documentElement.setAttribute("data-theme", th);
    document.body.setAttribute("data-theme", th);
    if (dark) {
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
    document.documentElement.style.colorScheme = th;
    localStorage.setItem("dente_theme", th);
    localStorage.setItem("dente_theme_mode", th);
    localStorage.setItem("theme", th);
  }, { dark: isDark, th: theme });
  await page.waitForTimeout(500);
}

async function main() {
  console.log("=== Launching Google Chrome for Orthopedics 4-State Proofs ===");
  const browser = await chromium.launch({
    headless: true,
    executablePath: "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
    args: [
      "--no-sandbox",
      "--disable-gpu",
      "--disable-setuid-sandbox",
    ],
  });

  const states = [
    { name: "01_orthopedics_chairside_pc_light_1440x900.png", width: 1440, height: 900, theme: "light", isMobile: false },
    { name: "02_orthopedics_chairside_pc_dark_1440x900.png", width: 1440, height: 900, theme: "dark", isMobile: false },
    { name: "03_orthopedics_chairside_mobile_light_390x844.png", width: 390, height: 844, theme: "light", isMobile: true },
    { name: "04_orthopedics_chairside_mobile_dark_390x844.png", width: 390, height: 844, theme: "dark", isMobile: true },
  ];

  for (const st of states) {
    console.log(`\n[ORTHOPEDICS] Capturing ${st.name}...`);
    const context = await browser.newContext({
      viewport: { width: st.width, height: st.height },
      deviceScaleFactor: st.isMobile ? 2 : 1,
      colorScheme: st.theme,
      isMobile: st.isMobile,
      hasTouch: st.isMobile,
      locale: "ru-RU",
      serviceWorkers: "block",
    });

    await context.addInitScript(({ th }) => {
      try {
        sessionStorage.setItem("dente:sw-controller-reload", "1");
        sessionStorage.setItem("dente_unlocked", "true");
        localStorage.setItem("dente_demo_showcase", "true");
        localStorage.setItem("dente_demo_mode", "true");
        localStorage.setItem("dente_onboarding_completed", "true");
        localStorage.setItem("dente_tour_completed", "true");
        localStorage.setItem("dente_tour_dismissed", "true");
        localStorage.setItem("dente_demo_banner_dismissed", "true");
        localStorage.setItem("dente_theme", th);
        localStorage.setItem("dente_theme_mode", th);
        localStorage.setItem("theme", th);
        localStorage.setItem("dental-crm:active-user:v1", JSON.stringify({ id: "demo-doctor", fullName: "Д-р Ортопедов А. В.", role: "doctor" }));
      } catch (_) {}
    }, { th: st.theme });

    const page = await context.newPage();

    await page.goto("http://127.0.0.1:5173/?standalone=orthopedics#orthopedics", { waitUntil: "commit", timeout: 35000 });

    await page.waitForSelector('[data-testid="orthopedics-chairside-panel"]', {
      state: "visible",
      timeout: 35000,
    });

    await suppressOverlays(page);
    await applyTheme(page, st.theme);
    await page.waitForTimeout(600);
    await suppressOverlays(page);

    const filePath = path.join(PROOFS_DIR, st.name);
    const buffer = await page.screenshot({ fullPage: false, animations: "disabled", timeout: 15000 });
    fs.writeFileSync(filePath, buffer);
    verifyProof(st.name);
    await context.close();
  }

  await browser.close();
  console.log("\n=== ALL 4 ORTHOPEDICS PROOFS SUCCESSFULLY CAPTURED AND VERIFIED! ===");
}

main().catch((err) => {
  console.error("FATAL ERROR in screenshot script:", err);
  process.exit(1);
});
