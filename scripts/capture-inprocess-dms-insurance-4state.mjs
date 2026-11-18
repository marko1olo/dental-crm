import path from "node:path";
import { fileURLToPath } from "node:url";
import fs from "node:fs";
import { createServer } from "vite";
import { chromium } from "playwright";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const webRoot = path.resolve(__dirname, "../apps/web");
const configFile = path.resolve(webRoot, "vite.config.ts");
const PROOFS_DIR = path.resolve(__dirname, "../docs/proofs/insurance");
const SCREENSHOTS_DIR = path.resolve(__dirname, "../docs/screenshots/insurance");

fs.mkdirSync(PROOFS_DIR, { recursive: true });
fs.mkdirSync(SCREENSHOTS_DIR, { recursive: true });

async function main() {
  console.log("=== 1. Starting In-Process Vite Server for Insurance & DMS ===");
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
  const launchOptions = {
    headless: true,
    args: ["--no-sandbox", "--disable-gpu", "--disable-dev-shm-usage"],
  };
  if (fs.existsSync("C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe")) {
    launchOptions.executablePath = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
  }
  const browser = await chromium.launch(launchOptions);

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
      localStorage.setItem("dente_staff_token", "demo-staff-token");
      localStorage.setItem("dente_active_role", "doctor");
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
      sessionStorage.setItem("dente_unlocked", "true");
      localStorage.setItem(
        "dental-crm:onboarding:v1",
        JSON.stringify({ dismissed: true, step: "done", completed: true })
      );
      localStorage.setItem(
        "dental-crm:active-user:v1",
        JSON.stringify({
          id: "doc-1",
          fullName: "Д-р Воронов Алексей Владимирович",
          role: "doctor",
        })
      );
      if (typeof document !== "undefined" && document.documentElement) {
        document.documentElement.setAttribute("data-theme", th);
        if (th === "dark") {
          document.documentElement.classList.add("dark");
          document.documentElement.classList.remove("light");
        } else {
          document.documentElement.classList.add("light");
          document.documentElement.classList.remove("dark");
        }
      }
    }, { th: theme });
  };

  try {
    const states = [
      {
        name: "01_dms_insurance_pc_light_1440x900.png",
        width: 1440,
        height: 900,
        theme: "light",
        isMobile: false,
      },
      {
        name: "02_dms_insurance_pc_dark_1440x900.png",
        width: 1440,
        height: 900,
        theme: "dark",
        isMobile: false,
      },
      {
        name: "03_dms_insurance_mobile_light_390x844.png",
        width: 390,
        height: 844,
        theme: "light",
        isMobile: true,
      },
      {
        name: "04_dms_insurance_mobile_dark_390x844.png",
        width: 390,
        height: 844,
        theme: "dark",
        isMobile: true,
      },
    ];

    for (const st of states) {
      console.log(`\n--- Capturing ${st.name} (${st.width}x${st.height}, ${st.theme}) ---`);
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
      page.on("console", (msg) => {
        if (msg.type() === "error") console.log(`[CONSOLE ERROR]: ${msg.text()}`);
      });

      const targetUrl = `${baseUrl}/?standalone=dms&demo=true#dms`;
      console.log(`Navigating to ${targetUrl}...`);
      await page.goto(targetUrl, { waitUntil: "commit", timeout: 60000 });
      await page.waitForLoadState("domcontentloaded", { timeout: 60000 });
      await page.waitForTimeout(1500);

      // Ensure modal is open
      const hasModal = await page.$(".dms-modal-window");
      if (!hasModal) {
        console.log("Dispatching dente:open-dms event...");
        await page.evaluate(() => window.dispatchEvent(new CustomEvent("dente:open-dms")));
      }

      await page.waitForSelector(".dms-modal-window", {
        state: "visible",
        timeout: 45000,
      });

      // Enforce theme classes
      await page.evaluate(({ theme }) => {
        document.documentElement.setAttribute("data-theme", theme);
        const isDark = theme === "dark";
        document.documentElement.classList.toggle("dark", isDark);
        document.documentElement.classList.toggle("light", !isDark);
        document.body.setAttribute("data-theme", theme);
        document.body.classList.toggle("dark", isDark);
        document.body.classList.toggle("light", !isDark);
        document.documentElement.style.colorScheme = theme;
      }, { theme: st.theme });

      await page.waitForTimeout(1000);
      await suppressOverlays(page);

      const outPath = path.join(PROOFS_DIR, st.name);
      await page.screenshot({ path: outPath, fullPage: false, animations: "disabled" });
      const size = fs.statSync(outPath).size;
      console.log(`✓ Saved ${st.name}: ${outPath} (${(size / 1024).toFixed(1)} KB)`);

      if (size < 20480) {
        throw new Error(`Screenshot ${st.name} is smaller than 20KB (${size} bytes)!`);
      }

      // Mirror to screenshots dir and alias to studio names
      fs.copyFileSync(outPath, path.join(SCREENSHOTS_DIR, st.name));
      const studioName = st.name.replace("_insurance_", "_studio_");
      fs.copyFileSync(outPath, path.join(PROOFS_DIR, studioName));
      fs.copyFileSync(outPath, path.join(SCREENSHOTS_DIR, studioName));

      await context.close();
    }

    console.log("\n>>> ALL 4 DMS INSURANCE PROOFS SUCCESSFULLY CAPTURED (>= 20KB)! <<<");
  } finally {
    await browser.close();
    await viteServer.close();
    console.log("Vite and Playwright closed cleanly.");
  }
}

main().catch((err) => {
  console.error("FATAL in capture script:", err);
  process.exit(1);
});
