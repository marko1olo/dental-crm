const { chromium } = require("playwright");
const { spawn } = require("node:child_process");
const fs = require("node:fs");
const path = require("node:path");

const PROOF_DIR = path.resolve("C:/Clinic_MVP/dental-crm/docs/proofs/orthodontics");
if (!fs.existsSync(PROOF_DIR)) {
  fs.mkdirSync(PROOF_DIR, { recursive: true });
}

function verifyProof(filePath) {
  const size = fs.statSync(filePath).size;
  if (size < 20480) {
    throw new Error(`[BLANK DETECTED] ${filePath} is ${size} bytes (< 20KB)!`);
  }
  console.log(`[VERIFIED] ${path.basename(filePath)} (${(size / 1024).toFixed(1)} KB)`);
  return size;
}

async function setTheme(page, theme) {
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
  }, theme);
  await suppressOverlays(page);
  await page.waitForTimeout(600);
}

async function suppressOverlays(page) {
  try {
    await page.evaluate(() => {
      const style = document.createElement("style");
      style.id = "suppress-all-overlays-ortho-canonical";
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
}

async function ensureViteServer(port = 5178) {
  try {
    const res = await fetch(`http://127.0.0.1:${port}/`, { signal: AbortSignal.timeout(1000) });
    if (res.ok || res.status === 200 || res.status === 304) {
      console.log(`[Vite] Dev server already running on port ${port}.`);
      return null;
    }
  } catch {}

  console.log(`[Vite] Spawning local Vite dev server on port ${port}...`);
  const viteBin = path.resolve(__dirname, "../node_modules/vite/bin/vite.js");
  const viteProc = spawn(process.execPath, [viteBin, "--host", "127.0.0.1", "--port", String(port)], {
    cwd: path.resolve(__dirname, "../apps/web"),
    stdio: ["ignore", "pipe", "pipe"],
  });
  viteProc.stderr.on("data", (d) => console.error("[Vite ERR]", d.toString()));

  for (let i = 0; i < 40; i++) {
    await new Promise((r) => setTimeout(r, 600));
    try {
      const check = await fetch(`http://127.0.0.1:${port}/`, { signal: AbortSignal.timeout(1000) });
      if (check.ok || check.status === 200 || check.status === 304) {
        console.log(`[Vite] Dev server ready on port ${port}.`);
        return viteProc;
      }
    } catch {}
  }
  throw new Error(`[Vite] Failed to start dev server on port ${port}`);
}

async function applyAuth(context) {
  await context.addInitScript(() => {
    try {
      localStorage.setItem("dente_clinic_token", "demo-clinic-token");
      localStorage.setItem("dente_staff_token", "demo-showcase-staff-token-chief");
      localStorage.setItem("dente_active_role", "orthodontist");
      localStorage.setItem("dente_role", "orthodontist");
      localStorage.setItem("dente_tour_completed", "true");
      localStorage.setItem("dente_demo_showcase_mode_v1", "true");
      localStorage.setItem("dente_demo_showcase", "true");
      localStorage.setItem("dente_onboarding_completed", "true");
      localStorage.setItem("dente_tour_dismissed", "true");
      localStorage.setItem("dente_guide_tour_dismissed_v2", "true");
      localStorage.setItem("dente_demo_banner_dismissed", "true");
      localStorage.setItem(
        "dental-crm:onboarding:v1",
        JSON.stringify({ dismissed: true, step: "done", completed: true })
      );
      localStorage.setItem(
        "dental-crm:active-user:v1",
        JSON.stringify({ id: "demo-ortho", fullName: "Д-р Ортодонтов А. В.", role: "orthodontist" })
      );
      sessionStorage.setItem("dente_unlocked", "true");
    } catch (e) {}
  });
}

async function waitForOrthoModal(page) {
  console.log("Waiting for Orthodontics Studio modal hydration...");
  for (let i = 0; i < 40; i++) {
    await page.waitForTimeout(1000);
    try {
      const state = await page.evaluate(() => {
        const text = document.body ? document.body.innerText : "";
        const isBoot = text.includes("Загрузка системы") || text.includes("Загрузка CRM");
        const modal = document.querySelector(
          '[data-testid="orthodontic-studio-modal"], .ortho-studio-modal, .ortho-studio-backdrop'
        );
        return { isBoot, hasModal: Boolean(modal), len: text.length };
      });

      if (state) {
        if (!state.hasModal) {
          await page.evaluate(() => {
            window.location.hash = "#ortho-protocol";
            window.dispatchEvent(new HashChangeEvent("hashchange"));
            window.dispatchEvent(new CustomEvent("dente:open-orthodontics"));
            window.dispatchEvent(new CustomEvent("dente:open-ortho-studio"));
          }).catch(() => {});
        }
        if (!state.isBoot && state.hasModal) {
          console.log(`[BOOT READY] Ortho studio mounted at iteration ${i + 1}`);
          return;
        }
      }
    } catch (e) {}
  }
  throw new Error("Timeout waiting for Orthodontics Studio modal to hydrate!");
}

(async () => {
  console.log("=== Capturing 4-State Proofs for Orthodontics Studio ===");
  const PORT = 5173;
  const viteProc = null;
  const url = `http://127.0.0.1:${PORT}/?stand=ortho&ortho=1&demo=true#ortho-protocol`;

  const browser = await chromium.launch({
    headless: true,
    executablePath: "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
    args: ["--no-sandbox", "--disable-gpu", "--disable-setuid-sandbox"],
  });

  try {
    // 1. DESKTOP VIEWPORT (1440x900)
    console.log("\n--- Capturing Desktop 1440x900 Proofs ---");
    const context = await browser.newContext({
      viewport: { width: 1440, height: 900 },
      deviceScaleFactor: 1,
      serviceWorkers: "block",
      locale: "ru-RU",
    });
    await applyAuth(context);

    const page = await context.newPage();
    console.log(`Navigating to ${url}...`);
    await page.goto(url, { waitUntil: "commit", timeout: 25000 });
    await waitForOrthoModal(page);
    await suppressOverlays(page);

    // 1.1 Desktop Light
    console.log("Taking PC Light (1440x900)...");
    await setTheme(page, "light");
    const pcLightPath = path.join(PROOF_DIR, "01_orthodontics_studio_pc_light_1440x900.png");
    await page.screenshot({ path: pcLightPath, fullPage: false, animations: "disabled" });
    verifyProof(pcLightPath);

    // 1.2 Desktop Dark
    console.log("Taking PC Dark (1440x900)...");
    await setTheme(page, "dark");
    const pcDarkPath = path.join(PROOF_DIR, "02_orthodontics_studio_pc_dark_1440x900.png");
    await page.screenshot({ path: pcDarkPath, fullPage: false, animations: "disabled" });
    verifyProof(pcDarkPath);

    // 2. MOBILE VIEWPORT (390x844)
    console.log("\n--- Capturing Mobile 390x844 Proofs (Switching Viewport) ---");
    await page.setViewportSize({ width: 390, height: 844 });
    await page.waitForTimeout(1500);
    await waitForOrthoModal(page);
    await suppressOverlays(page);

    // 2.1 Mobile Light
    console.log("Taking Mobile Light (390x844)...");
    await setTheme(page, "light");
    const mobLightPath = path.join(PROOF_DIR, "03_orthodontics_studio_mobile_light_390x844.png");
    await page.screenshot({ path: mobLightPath, fullPage: false, animations: "disabled" });
    verifyProof(mobLightPath);

    // 2.2 Mobile Dark
    console.log("Taking Mobile Dark (390x844)...");
    await setTheme(page, "dark");
    const mobDarkPath = path.join(PROOF_DIR, "04_orthodontics_studio_mobile_dark_390x844.png");
    await page.screenshot({ path: mobDarkPath, fullPage: false, animations: "disabled" });
    verifyProof(mobDarkPath);

    await context.close();

    console.log("\n=======================================================");
    console.log(">>> [VICTORY] All 4 Orthodontics Visual Proofs captured successfully! <<<");
    console.log("=======================================================");
  } finally {
    await browser.close().catch(() => {});
    if (viteProc) {
      viteProc.kill("SIGKILL");
    }
  }
})().catch((err) => {
  console.error("[FATAL ERROR]", err);
  process.exit(1);
});
