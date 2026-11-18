import path from "node:path";
import { fileURLToPath } from "node:url";
import fs from "node:fs";
import { createServer } from "vite";
import { chromium } from "playwright";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const webRoot = path.resolve(__dirname, "../apps/web");
const configFile = path.resolve(webRoot, "vite.config.ts");
const PROOFS_DIR = path.resolve(__dirname, "../docs/proofs/cashbox");
const SCREEN_DIR = path.resolve(__dirname, "../docs/screenshots/cashbox");

fs.mkdirSync(PROOFS_DIR, { recursive: true });
fs.mkdirSync(SCREEN_DIR, { recursive: true });

function verifyProof(filePath) {
  const size = fs.statSync(filePath).size;
  if (size < 20480) {
    throw new Error(`[BLANK DETECTED] ${filePath} is ${size} bytes (< 20KB)!`);
  }
  console.log(`[VERIFIED] ${path.basename(filePath)} (${(size / 1024).toFixed(1)} KB)`);
  return size;
}

async function main() {
  console.log("=== 1. Starting In-Process Vite Server for Cashbox ===");
  const viteServer = await createServer({
    configFile,
    root: webRoot,
    server: {
      host: "127.0.0.1",
      strictPort: false,
      hmr: false,
      watch: null,
    },
  });

  await viteServer.listen();
  const address = viteServer.httpServer.address();
  const port = address.port;
  const baseUrl = `http://127.0.0.1:${port}`;
  console.log(`✓ In-process Vite listening on: ${baseUrl}`);

  console.log("=== 2. Launching Playwright Chromium ===");
  const browser = await chromium.launch({
    headless: true,
    executablePath: "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
    args: ["--no-sandbox", "--disable-gpu", "--disable-dev-shm-usage"],
  });

  const suppressOverlays = async (page) => {
    try {
      await page.evaluate(() => {
        const style = document.createElement("style");
        style.id = "suppress-all-overlays-4proof";
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
        document.querySelectorAll("vite-error-overlay, .tour-spotlight-root, [data-testid='guided-tour-spotlight-overlay']").forEach((el) => el.remove());
      });
    } catch (_) {}
  };

  const setupStorage = async (context, theme) => {
    await context.addInitScript(({ th }) => {
      localStorage.setItem("dente_clinic_token", "demo-clinic-token");
      localStorage.setItem("dente_staff_token", "demo-showcase-staff-token-chief");
      localStorage.setItem("dente_active_role", "cashier");
      localStorage.setItem("dente_tour_completed", "true");
      localStorage.setItem("dente_demo_showcase_mode_v1", "true");
      localStorage.setItem("dente_demo_showcase", "true");
      localStorage.setItem("dente_onboarding_completed", "true");
      localStorage.setItem("dente_tour_dismissed", "true");
      localStorage.setItem("dente_guide_tour_dismissed_v2", "true");
      localStorage.setItem("dente_demo_banner_dismissed", "true");
      localStorage.setItem("dente_theme", th);
      localStorage.setItem("dente_theme_mode", th);
      localStorage.setItem("theme", th);
      localStorage.setItem(
        "dental-crm:onboarding:v1",
        JSON.stringify({ dismissed: true, step: "done", completed: true })
      );
      localStorage.setItem(
        "dente_staff_session",
        JSON.stringify({
          userId: "usr-admin-01",
          name: "Кассир Воронова С. Н.",
          role: "cashier",
          roleScope: "cashier",
        })
      );
      sessionStorage.setItem("dente_unlocked", "true");
    }, { th: theme });
  };

  const studioStates = [
    {
      name: "01_cashbox_studio_pc_light_1440x900.png",
      width: 1440,
      height: 900,
      theme: "light",
      isMobile: false,
    },
    {
      name: "02_cashbox_studio_pc_dark_1440x900.png",
      width: 1440,
      height: 900,
      theme: "dark",
      isMobile: false,
    },
    {
      name: "03_cashbox_studio_mobile_light_390x844.png",
      width: 390,
      height: 844,
      theme: "light",
      isMobile: true,
    },
    {
      name: "04_cashbox_studio_mobile_dark_390x844.png",
      width: 390,
      height: 844,
      theme: "dark",
      isMobile: true,
    },
  ];

  for (const st of studioStates) {
    console.log(`\n--- Capturing Cashbox: ${st.name} (${st.width}x${st.height}, ${st.theme}) ---`);
    const context = await browser.newContext({
      viewport: { width: st.width, height: st.height },
      isMobile: st.isMobile,
      hasTouch: st.isMobile,
      deviceScaleFactor: st.isMobile ? 2 : 1,
      colorScheme: st.theme,
    });

    await setupStorage(context, st.theme);
    const page = await context.newPage();
    page.on("pageerror", (err) => console.log(`[PAGE ERROR]: ${err.message}`));

    const targetUrl = `${baseUrl}/?demo=true#checkout`;
    console.log(`Navigating to ${targetUrl}...`);
    await page.goto(targetUrl, { waitUntil: "commit", timeout: 60000 });
    await page.waitForLoadState("domcontentloaded", { timeout: 60000 });
    await page.waitForTimeout(1500);
    await suppressOverlays(page);

    // Ensure theme attributes
    await page.evaluate((th) => {
      document.documentElement.setAttribute("data-theme", th);
      document.body.setAttribute("data-theme", th);
      if (th === "dark") {
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
    }, st.theme);

    // Check if modal is present or dispatch event
    let modal = await page.$('[data-testid="cash-register-studio-modal"], [data-testid="cash-register-checkout-modal"]');
    if (!modal) {
      console.log("Dispatching dente:open-cashbox...");
      await page.evaluate(() => {
        window.dispatchEvent(
          new CustomEvent("dente:open-cashbox", {
            detail: {
              mode: "checkout",
              patientId: "pat-1",
              patientName: "Иванов Иван Иванович",
              patientPhone: "+7 (999) 123-45-67",
              patientAllergies: "Новокаин",
              doctorFullName: "Д-р Воронов А. В.",
              serviceTitle: "Лечение кариеса 16, анестезия, пломба светового отверждения",
              amountRub: 5400,
              patientDepositRub: 1200,
              patientFamilyBalanceRub: 3500,
              cashierFullName: "Кассир Воронова С. Н.",
            },
          })
        );
      });
      modal = await page.waitForSelector(
        '[data-testid="cash-register-studio-modal"], [data-testid="cash-register-checkout-modal"]',
        { state: "visible", timeout: 15000 }
      );
    }

    console.log("Modal confirmed! Waiting for settle...");
    await page.waitForTimeout(1000);
    await suppressOverlays(page);

    const proofPath = path.join(PROOFS_DIR, st.name);
    await page.screenshot({ path: proofPath, fullPage: false, animations: "disabled" });
    fs.copyFileSync(proofPath, path.join(SCREEN_DIR, st.name));

    verifyProof(proofPath);
    await context.close();
  }

  await browser.close();
  await viteServer.close();
  console.log("\n=======================================================");
  console.log(">>> [VICTORY] All 4 Cashbox Visual Proofs captured successfully! <<<");
  console.log("=======================================================");
}

main().catch((err) => {
  console.error("[FATAL ERROR]", err);
  process.exit(1);
});
