/**
 * scripts/capture_mobile_hig_audit_proofs.cjs
 * Red Team Mobile HIG Screenshot Pipeline for Sovereign Mobile Layer
 * Resolution: iPhone 14 / iPhone 15 viewport (390x844, scale factor 2)
 */

const { chromium } = require("playwright");
const { spawn } = require("node:child_process");
const http = require("node:http");
const path = require("node:path");
const fs = require("node:fs");

const outputDirs = [
  path.resolve(__dirname, "../apps/web/public/screenshots/mobile_hig_audit"),
  path.resolve(__dirname, "../docs/screenshots/mobile_hig_audit"),
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
  console.log("=== STARTING SOVEREIGN MOBILE HIG 390x844 SCREENSHOT CAPTURE ===");

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
  const edgePath = "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe";
  const executablePath = fs.existsSync(chromePath) ? chromePath : fs.existsSync(edgePath) ? edgePath : undefined;

  const browser = await chromium.launch({
    headless: true,
    executablePath,
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

  // Helper to hide dev switcher for clean production app screenshots
  async function hideDevSwitcher() {
    await page.evaluate(() => {
      const sw = document.querySelector(".mobile-dev-switcher");
      if (sw) sw.style.display = "none";
    });
  }

  // Helper to switch theme
  async function applyTheme(theme) {
    await page.evaluate((th) => {
      document.documentElement.setAttribute("data-theme", th);
      if (th === "dark") {
        document.documentElement.classList.add("dark");
      } else {
        document.documentElement.classList.remove("dark");
      }
    }, theme);
    await page.waitForTimeout(400);
  }

  // ─── 1. SCHEDULE AGENDA (LIGHT & DARK) ───
  console.log("\n[1/4] Capturing Mobile Schedule Agenda (390x844)...");
  await page.goto("http://127.0.0.1:5173/mobile_hig_preview.html?screen=schedule&theme=light", {
    waitUntil: "networkidle",
  });
  await page.waitForSelector('[data-testid="schedule-mobile-agenda-view"]', { timeout: 10000 });
  await page.waitForTimeout(500);
  await captureScreenshot(page, "mobile_schedule_agenda_light.png");

  await applyTheme("dark");
  await captureScreenshot(page, "mobile_schedule_agenda_dark.png");

  // ─── 2. SCHEDULE BOTTOM SHEET (LIGHT & DARK) ───
  console.log("\n[2/4] Opening Mobile Schedule Bottom Sheet Drawer...");
  const apptCard = page.locator('[data-testid="schedule-mobile-appt-card"]').first();
  await apptCard.waitFor({ timeout: 5000 });
  await apptCard.click();
  await page.waitForSelector('[data-testid="schedule-grid-mobile-bottom-sheet"]', { timeout: 10000 });
  await page.waitForTimeout(500);
  await captureScreenshot(page, "mobile_schedule_sheet_dark.png");

  await applyTheme("light");
  await captureScreenshot(page, "mobile_schedule_sheet_light.png");

  // Close sheet
  const closeBtn = page.locator('[data-testid="schedule-grid-mobile-bottom-sheet"] button[aria-label="Закрыть"]').first();
  await closeBtn.click();
  await page.waitForTimeout(300);

  // ─── 3. PATIENTS GROUPED INSET LIST (LIGHT & DARK) ───
  console.log("\n[3/4] Capturing Mobile Patients Grouped List (390x844)...");
  await page.goto("http://127.0.0.1:5173/mobile_hig_preview.html?screen=patients&theme=light", {
    waitUntil: "networkidle",
  });
  await page.waitForSelector('[data-testid="mobile-patients-container"]', { timeout: 10000 });
  await page.waitForTimeout(500);
  await captureScreenshot(page, "mobile_patients_list_light.png");

  await applyTheme("dark");
  await captureScreenshot(page, "mobile_patients_list_dark.png");

  // ─── 4. CHAIRSIDE EHR PROTOCOL (LIGHT & DARK) ───
  console.log("\n[4/4] Capturing Mobile Chairside EHR Protocol (390x844)...");
  await page.goto("http://127.0.0.1:5173/mobile_hig_preview.html?screen=chairside&theme=light", {
    waitUntil: "networkidle",
  });
  await page.waitForSelector('[data-testid="mobile-chairside-ehr"]', { timeout: 10000 });
  await page.waitForTimeout(500);
  await captureScreenshot(page, "mobile_chairside_ehr_light.png");

  await applyTheme("dark");
  await captureScreenshot(page, "mobile_chairside_ehr_dark.png");

  await browser.close();

  if (viteProcess) {
    try {
      viteProcess.kill();
    } catch {
      // ignore
    }
  }

  console.log("\n=== ALL MOBILE HIG 390x844 SCREENSHOTS CAPTURED SUCCESSFULLY ===");
}

main().catch((err) => {
  console.error("FATAL ERROR in capture_mobile_hig_audit_proofs:", err);
  process.exit(1);
});
