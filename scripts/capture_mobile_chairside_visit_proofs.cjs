/**
 * scripts/capture_mobile_chairside_visit_proofs.cjs
 * Red Team Inquisitor Screenshot Capture for Mobile Chairside Visit & EHR 043/y
 * Viewport: iPhone 14/15/16 (390x844, scale factor 2, touch enabled)
 */

const { chromium } = require("playwright");
const { spawn } = require("node:child_process");
const http = require("node:http");
const path = require("node:path");
const fs = require("node:fs");

const outputDirs = [
  path.resolve(__dirname, "../apps/web/public/screenshots/mobile_chairside_visit"),
  path.resolve(__dirname, "../docs/screenshots/inquisition_live"),
];

for (const dir of outputDirs) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

function checkPort(port, host = "127.0.0.1") {
  return new Promise((resolve) => {
    const req = http.get(`http://${host}:${port}/`, () => {
      resolve(true);
    });
    req.on("error", () => resolve(false));
    req.setTimeout(1000, () => {
      req.destroy();
      resolve(false);
    });
  });
}

async function waitForServer(url, timeoutMs = 25000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      const ok = await new Promise((res) => {
        const req = http.get(url, (response) => {
          res(response.statusCode >= 200 && response.statusCode < 400);
        });
        req.on("error", () => res(false));
        req.setTimeout(1000, () => {
          req.destroy();
          res(false);
        });
      });
      if (ok) return true;
    } catch {
      // retry
    }
    await new Promise((r) => setTimeout(r, 600));
  }
  throw new Error(`Server at ${url} did not become ready within ${timeoutMs}ms`);
}

async function captureScreenshot(page, filename) {
  try {
    await page.evaluate(() => {
      const sw = document.querySelector(".mobile-dev-switcher");
      if (sw) sw.style.display = "none";
    });
  } catch {
    // ignore
  }
  const primaryPath = path.join(outputDirs[0], filename);
  await page.screenshot({ path: primaryPath, fullPage: false });
  for (let i = 1; i < outputDirs.length; i++) {
    fs.copyFileSync(primaryPath, path.join(outputDirs[i], filename));
  }
  const sizeKb = (fs.statSync(primaryPath).size / 1024).toFixed(1);
  console.log(`[CAPTURED] ${filename} (${sizeKb} KB) -> ${primaryPath}`);
  return primaryPath;
}

async function main() {
  console.log("=== STARTING MOBILE CHAIRSIDE VISIT 390x844 SCREENSHOT PIPELINE ===");

  let viteProcess = null;
  const isViteLive = await checkPort(5173);

  if (!isViteLive) {
    console.log(">>> Vite server is not running on 5173. Spawning Vite dev server...");
    const viteBin = path.resolve(__dirname, "../node_modules/vite/bin/vite.js");
    const webDir = path.resolve(__dirname, "../apps/web");

    viteProcess = spawn("node", [viteBin, "--host", "127.0.0.1", "--port", "5173"], {
      cwd: webDir,
      stdio: "inherit",
      shell: true,
    });

    await waitForServer("http://127.0.0.1:5173/mobile_hig_preview.html");
    console.log(">>> Vite dev server ready on http://127.0.0.1:5173/");
  } else {
    console.log(">>> Detected existing Vite server on port 5173.");
  }

  const chromePath = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
  const browser = await chromium.launch({
    headless: true,
    executablePath: fs.existsSync(chromePath) ? chromePath : undefined,
    args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-gpu"],
  });

  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 2,
    isMobile: true,
    hasTouch: true,
    userAgent:
      "Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Mobile/15E148 Safari/604.1",
  });

  const page = await context.newPage();

  try {
    // 1. Mobile Light: Шаг 1 (Жалобы, Top HUD, 52px кнопка нормы, SmartMic)
    console.log(">>> Capturing Mobile Light (Chairside Step 1)...");
    await page.goto("http://127.0.0.1:5173/mobile_hig_preview.html?screen=chairside&theme=light", {
      waitUntil: "networkidle",
      timeout: 20000,
    });
    await page.waitForTimeout(1000);
    await captureScreenshot(page, "proof_mobile_chairside_visit_light.png");

    // 2. Mobile Dark: Шаг 1 в тёмной теме
    console.log(">>> Capturing Mobile Dark (Chairside Step 1)...");
    await page.goto("http://127.0.0.1:5173/mobile_hig_preview.html?screen=chairside&theme=dark", {
      waitUntil: "networkidle",
      timeout: 20000,
    });
    await page.waitForTimeout(1000);
    await captureScreenshot(page, "proof_mobile_chairside_visit_dark.png");

    // 3. Mobile Light: Шаг 2 (Осмотр и зубная формула по квадрантам)
    console.log(">>> Capturing Mobile Light (Chairside Step 2 — Quadrant FDI)...");
    await page.goto("http://127.0.0.1:5173/mobile_hig_preview.html?screen=chairside&theme=light", {
      waitUntil: "networkidle",
      timeout: 20000,
    });
    await page.waitForTimeout(600);
    // Клик на таб 2. Осмотр
    const step2Btn = page.locator('[data-testid="mobile-chairside-workspace-step-exam"]');
    if (await step2Btn.count()) {
      await step2Btn.click();
      await page.waitForTimeout(600);
    }
    await captureScreenshot(page, "proof_mobile_chairside_exam_quadrants_light.png");

    // 4. Mobile Light: Шаг 5 (Итог и Чек 54-ФЗ)
    console.log(">>> Capturing Mobile Light (Chairside Step 5 — Billing & 54-FZ)...");
    const step5Btn = page.locator('[data-testid="mobile-chairside-workspace-step-checkout"]');
    if (await step5Btn.count()) {
      await step5Btn.click();
      await page.waitForTimeout(600);
    }
    await captureScreenshot(page, "proof_mobile_chairside_checkout_billing_light.png");

    // 5. Mobile Dark: Шаг 5 (Итог и Чек в тёмной теме)
    console.log(">>> Capturing Mobile Dark (Chairside Step 5 — Billing & 54-FZ)...");
    await page.goto("http://127.0.0.1:5173/mobile_hig_preview.html?screen=chairside&theme=dark", {
      waitUntil: "networkidle",
      timeout: 20000,
    });
    await page.waitForTimeout(600);
    const step5DarkBtn = page.locator('[data-testid="mobile-chairside-workspace-step-checkout"]');
    if (await step5DarkBtn.count()) {
      await step5DarkBtn.click();
      await page.waitForTimeout(600);
    }
    await captureScreenshot(page, "proof_mobile_chairside_checkout_billing_dark.png");

    console.log("=== ALL 5 CHAIRSIDE PROOF SCREENSHOTS CAPTURED SUCCESSFULLY ===");
  } finally {
    await browser.close();
    if (viteProcess) {
      console.log(">>> Terminating spawned Vite process...");
      viteProcess.kill();
    }
  }
}

main().catch((err) => {
  console.error("FATAL ERROR in capture pipeline:", err);
  process.exit(1);
});
