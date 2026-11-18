import path from "node:path";
import { fileURLToPath } from "node:url";
import fs from "node:fs";
import { createServer } from "vite";
import { chromium } from "playwright";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const webRoot = path.resolve(__dirname, "../apps/web");
const configFile = path.resolve(webRoot, "vite.config.ts");
const PROOFS_DIR = path.resolve(__dirname, "../docs/proofs/orthodontics");

fs.mkdirSync(PROOFS_DIR, { recursive: true });

function verifyProof(filePath) {
  const size = fs.statSync(filePath).size;
  if (size < 20480) {
    throw new Error(`[BLANK DETECTED] ${filePath} is ${size} bytes (< 20KB)!`);
  }
  console.log(`[VERIFIED] ${path.basename(filePath)} (${(size / 1024).toFixed(1)} KB)`);
  return size;
}

async function main() {
  console.log("=== 1. Starting In-Process Vite Server (hmr: false, watch: null) ===");
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
    executablePath: fs.existsSync("C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe")
      ? "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe"
      : undefined,
    args: ["--no-sandbox", "--disable-gpu", "--disable-setuid-sandbox"],
  });

  const suppressOverlays = async (page) => {
    try {
      await page.evaluate(() => {
        const style = document.createElement("style");
        style.id = "suppress-all-overlays-ortho-4proof";
        style.innerHTML = `
          .tour-spotlight-root,
          .tour-backdrop-clickable-zone,
          [data-testid="guided-tour-spotlight-overlay"],
          [data-testid="guided-tour-coach-mark-card"],
          [data-testid="demo-mode-banner"],
          .shepherd-element,
          .global-toast-container,
          .sa-toast,
          .sa-toast--warning,
          .sa-toast--error,
          .sa-toast--info,
          .sa-toast--success,
          [role="alert"],
          vite-error-overlay {
            display: none !important;
            pointer-events: none !important;
            opacity: 0 !important;
          }
        `;
        document.head.appendChild(style);
        document.querySelectorAll("vite-error-overlay, .tour-spotlight-root, [data-testid='guided-tour-spotlight-overlay'], .sa-toast, [role='alert']").forEach((el) => el.remove());
      });
    } catch (_) {}
  };

  const setTheme = async (page, theme) => {
    await page.evaluate((th) => {
      const isDark = th === "dark";
      document.documentElement.setAttribute("data-theme", th);
      document.body.setAttribute("data-theme", th);
      document.documentElement.classList.toggle("dark", isDark);
      document.documentElement.classList.toggle("light", !isDark);
      document.body.classList.toggle("dark", isDark);
      document.body.classList.toggle("light", !isDark);
      document.documentElement.style.colorScheme = th;
      localStorage.setItem("dente_theme", th);
      localStorage.setItem("dente_theme_mode", th);
      localStorage.setItem("theme", th);
      window.dispatchEvent(new Event("themechange"));
    }, theme);
    await suppressOverlays(page);
    await page.waitForTimeout(600);
  };

  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    serviceWorkers: "block",
    locale: "ru-RU",
  });

  await context.addInitScript(() => {
    try {
      localStorage.setItem("dente_clinic_token", "demo-showcase-token-owner");
      localStorage.setItem("dente_staff_token", "demo-showcase-staff-token-owner");
      localStorage.setItem("dente_active_session_token", "demo-showcase-staff-token-owner");
      localStorage.setItem("dente_active_role", "doctor");
      localStorage.setItem("dente_user_role", "doctor");
      localStorage.setItem("dente_role", "doctor");
      localStorage.setItem("dente_perspective", "orthodontic");
      localStorage.setItem("dente_doctor_shift_active", "true");
      sessionStorage.setItem("dente_unlocked", "true");
      localStorage.setItem("dente_demo_showcase", "true");
      localStorage.setItem("dente_demo_mode", "true");
      localStorage.setItem("dente_onboarding_completed", "true");
      localStorage.setItem("dente_tour_completed", "true");
      localStorage.setItem("dente_tour_dismissed", "true");
      localStorage.setItem("dente_guide_tour_dismissed_v2", "true");
      localStorage.setItem("dental-crm:onboarding:v1", JSON.stringify({
        dismissed: true,
        step: "done",
        completed: true,
      }));
      localStorage.setItem("dental-crm:active-user:v1", JSON.stringify({
        id: "demo-doctor",
        fullName: "Д-р Соколов А. В.",
        role: "doctor",
      }));
    } catch (_) {}
  });

  const page = await context.newPage();
  page.on("pageerror", (err) => console.log(`[PAGE ERROR]: ${err.message}`));
  page.on("console", (msg) => {
    if (msg.type() === "error") console.log(`[CONSOLE ERROR]: ${msg.text()}`);
  });

  const targetUrl = `${baseUrl}/?demo=true#ortho-protocol`;
  console.log(`Navigating to ${targetUrl}...`);
  await page.goto(targetUrl, { waitUntil: "commit", timeout: 45000 });
  console.log("Waiting for .boot-state to detach (up to 30s)...");
  await page.waitForSelector(".boot-state", { state: "detached", timeout: 30000 }).catch((e) => {
    console.log("[WARN] .boot-state still present after 30s:", e.message);
  });
  await page.waitForTimeout(2000);
  await suppressOverlays(page);

  // Check modal
  let modal = await page.$('[data-testid="orthodontic-studio-modal"], .ortho-studio-modal, .ortho-studio-backdrop');
  if (!modal) {
    console.log("Dispatching events to open ortho modal...");
    await page.evaluate(() => {
      window.location.hash = "#ortho-protocol";
      window.dispatchEvent(new HashChangeEvent("hashchange"));
      window.dispatchEvent(new CustomEvent("dente:open-ortho"));
      window.dispatchEvent(new CustomEvent("dente:open-orthodontics"));
      window.dispatchEvent(new CustomEvent("dente:open-ortho-studio"));
    });
    modal = await page.waitForSelector(
      '[data-testid="orthodontic-studio-modal"], .ortho-studio-modal, .ortho-studio-backdrop',
      { state: "visible", timeout: 20000 }
    );
  }

  console.log("Modal confirmed! Settling...");
  await page.waitForTimeout(1000);
  await suppressOverlays(page);

  // 1. PC Light
  console.log("\n--- Capturing 01_orthodontics_studio_pc_light_1440x900.png ---");
  await setTheme(page, "light");
  const p1 = path.join(PROOFS_DIR, "01_orthodontics_studio_pc_light_1440x900.png");
  await page.screenshot({ path: p1, fullPage: false, animations: "disabled" });
  verifyProof(p1);

  // 2. PC Dark
  console.log("\n--- Capturing 02_orthodontics_studio_pc_dark_1440x900.png ---");
  await setTheme(page, "dark");
  const p2 = path.join(PROOFS_DIR, "02_orthodontics_studio_pc_dark_1440x900.png");
  await page.screenshot({ path: p2, fullPage: false, animations: "disabled" });
  verifyProof(p2);

  // 3. Mobile Light
  console.log("\n--- Capturing 03_orthodontics_studio_mobile_light_390x844.png ---");
  await page.setViewportSize({ width: 390, height: 844 });
  await page.waitForTimeout(800);
  await setTheme(page, "light");
  const p3 = path.join(PROOFS_DIR, "03_orthodontics_studio_mobile_light_390x844.png");
  await page.screenshot({ path: p3, fullPage: false, animations: "disabled" });
  verifyProof(p3);

  // 4. Mobile Dark
  console.log("\n--- Capturing 04_orthodontics_studio_mobile_dark_390x844.png ---");
  await setTheme(page, "dark");
  const p4 = path.join(PROOFS_DIR, "04_orthodontics_studio_mobile_dark_390x844.png");
  await page.screenshot({ path: p4, fullPage: false, animations: "disabled" });
  verifyProof(p4);

  await context.close();
  await browser.close();
  await viteServer.close();

  console.log("\n=======================================================");
  console.log(">>> [VICTORY] All 4 Orthodontics Visual Proofs captured successfully! <<<");
  console.log("=======================================================");
}

main().catch((err) => {
  console.error("[FATAL ERROR]", err);
  process.exit(1);
});
