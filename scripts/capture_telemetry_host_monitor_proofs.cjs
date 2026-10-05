/**
 * scripts/capture_telemetry_host_monitor_proofs.cjs
 * Captures real visual proof of dynamic host telemetry, burst sampling, and adaptive CT rendering.
 */

const { chromium } = require("playwright");
const path = require("node:path");
const fs = require("node:fs");

const OUT_DIR_LOCAL = path.resolve(__dirname, "../apps/web/public/screenshots/telemetry_host_monitor");
const OUT_DIR_DOCS = path.resolve(__dirname, "../docs/screenshots/telemetry_host_monitor");
const OUT_DIR_PARENT = "C:/Users/Admin/.gemini/antigravity/brain/3dd8abc3-cf84-46a0-8273-8471441ce17d";
const OUT_DIR_SELF = "C:/Users/Admin/.gemini/antigravity/brain/a7bf1f24-0605-4a0a-aa0d-c99380b39fc3";

const DIRS = [OUT_DIR_LOCAL, OUT_DIR_DOCS, OUT_DIR_PARENT, OUT_DIR_SELF];

DIRS.forEach((d) => {
  if (!fs.existsSync(d)) {
    try {
      fs.mkdirSync(d, { recursive: true });
    } catch {
      // ignore
    }
  }
});

function saveScreenshotCopies(buffer, fileName) {
  for (const dir of DIRS) {
    try {
      if (fs.existsSync(dir)) {
        const fullPath = path.join(dir, fileName);
        fs.writeFileSync(fullPath, buffer);
      }
    } catch {
      // ignore
    }
  }
  console.log(`Saved screenshot: ${fileName} (${buffer.length} bytes)`);
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function main() {
  console.log(">>> Launching Chromium for telemetry visual proof...");
  const browser = await chromium.launch({
    channel: "chrome",
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });

  // 1. Desktop Light (1440x900)
  {
    const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
    await page.goto("http://127.0.0.1:5173/telemetry_host_monitor_preview.html?theme=light", { waitUntil: "domcontentloaded" });
    await page.waitForSelector("[data-testid='header-perf-state-badge']");
    await sleep(600); // allow telemetry bursts to populate FPS
    const buffer = await page.screenshot({ fullPage: false });
    saveScreenshotCopies(buffer, "01_telemetry_host_monitor_desktop_light.png");
    await page.close();
  }

  // 2. Desktop Dark (1440x900)
  {
    const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
    await page.goto("http://127.0.0.1:5173/telemetry_host_monitor_preview.html?theme=dark", { waitUntil: "domcontentloaded" });
    await page.waitForSelector("[data-testid='header-perf-state-badge']");
    await sleep(600);
    const buffer = await page.screenshot({ fullPage: false });
    saveScreenshotCopies(buffer, "02_telemetry_host_monitor_desktop_dark.png");
    await page.close();
  }

  // 3. Mobile Light (390x844)
  {
    const page = await browser.newPage({
      viewport: { width: 390, height: 844 },
      isMobile: true,
      hasTouch: true,
    });
    await page.goto("http://127.0.0.1:5173/telemetry_host_monitor_preview.html?theme=light", { waitUntil: "domcontentloaded" });
    await page.waitForSelector("[data-testid='header-perf-state-badge']");
    await sleep(600);
    const buffer = await page.screenshot({ fullPage: true });
    saveScreenshotCopies(buffer, "03_telemetry_host_monitor_mobile_light.png");
    await page.close();
  }

  // 4. Mobile Dark (390x844)
  {
    const page = await browser.newPage({
      viewport: { width: 390, height: 844 },
      isMobile: true,
      hasTouch: true,
    });
    await page.goto("http://127.0.0.1:5173/telemetry_host_monitor_preview.html?theme=dark", { waitUntil: "domcontentloaded" });
    await page.waitForSelector("[data-testid='header-perf-state-badge']");
    await sleep(600);
    const buffer = await page.screenshot({ fullPage: true });
    saveScreenshotCopies(buffer, "04_telemetry_host_monitor_mobile_dark.png");
    await page.close();
  }

  // 5. Desktop Under Simulated Load (DEGRADED state with CT downscaling)
  {
    const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
    await page.goto("http://127.0.0.1:5173/telemetry_host_monitor_preview.html?theme=dark", { waitUntil: "domcontentloaded" });
    await page.waitForSelector("[data-testid='simulate-degraded-btn']");
    await page.click("[data-testid='simulate-degraded-btn']");
    await sleep(300);
    const buffer = await page.screenshot({ fullPage: false });
    saveScreenshotCopies(buffer, "05_telemetry_host_monitor_degraded_state.png");
    await page.close();
  }

  await browser.close();
  console.log(">>> All 5 telemetry screenshots captured successfully!");
}

main().catch((err) => {
  console.error("Capture failed:", err);
  process.exit(1);
});
